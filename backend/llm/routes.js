import express from 'express';
import { requireLlmPin } from './middleware/llmAuth.js';
import {
  runAgent,
  runDeterministicFallback,
  greetingAnswer,
} from './agent/runtime.js';
import { TOOL_DEFINITIONS } from './tools/registry.js';
import { isGreeting, matchTemplate, isAnalyticsIntent } from './templates.js';
import {
  getOrCreateConversation,
  appendTurn,
} from './agent/memory.js';

const router = express.Router();

// Simple in-memory rate limit: 30 requests / min per IP
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const max = 30;
  let bucket = hits.get(ip);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
  }
  bucket.count += 1;
  hits.set(ip, bucket);
  if (bucket.count > max) {
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  }
  next();
}

function isUsefulAnswer(answer) {
  if (!answer) return false;
  if (answer.kind === 'greeting') return true;
  if (answer.clarification?.candidates?.length) return true;
  if (answer.metrics?.length > 0) return true;
  if (answer.products?.length > 0) return true;
  if (answer.primaryMetric) return true;
  if (answer.error === 'fallback_no_match') return false;
  const h = (answer.headline || '').toLowerCase();
  if (h.includes('analysis complete') || h.includes('could not interpret')) return false;
  if (h.includes('no metrics returned')) return false;
  // free-form AI reply without numbers can still be useful for chatty questions
  return Boolean(answer.headline && answer.headline.length > 8);
}

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'picoso-intelligence',
    cohereConfigured: Boolean(process.env.COHERE_API_KEY),
    model: process.env.COHERE_MODEL || 'command-a-03-2025',
  });
});

router.post('/auth', requireLlmPin, (_req, res) => {
  res.json({ success: true, message: 'PIN accepted' });
});

router.get('/tools', requireLlmPin, (_req, res) => {
  res.json({
    tools: TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
    })),
  });
});

/**
 * SSE chat endpoint.
 * Body: { message, conversationId? }
 * Headers: x-llm-pin
 *
 * Pipeline:
 *  1. Greetings → fixed help reply
 *  2. Known analytics templates → deterministic tools (source of truth for numbers)
 *  3. Else Cohere agent (if key set), with auto-complete tools if AI only resolves product
 *  4. Fallback to deterministic / friendly error
 */
router.post('/chat', rateLimit, requireLlmPin, async (req, res) => {
  const { message, conversationId, mode } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const emit = (event, data) => {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      /* client gone */
    }
  };

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      /* ignore */
    }
  }, 15000);

  const text = message.trim();

  try {
    emit('status', { stage: 'received' });

    // ── 1. Greetings ──────────────────────────────────────────────────────
    if (isGreeting(text)) {
      const answer = greetingAnswer();
      try {
        const conv = await getOrCreateConversation(conversationId);
        await appendTurn(conv, text, answer.headline, answer);
        emit('result', answer);
        emit('complete', {
          conversationId: String(conv._id),
          mode: 'greeting',
        });
      } catch {
        emit('result', answer);
        emit('complete', { conversationId: conversationId || null, mode: 'greeting' });
      }
      return;
    }

    // ── 2. Deterministic first for known analytics (reliable numbers) ─────
    const tmpl = matchTemplate(text);
    const preferTools =
      mode === 'deterministic' ||
      (tmpl && mode !== 'force-ai') ||
      (!process.env.COHERE_API_KEY && isAnalyticsIntent(text));

    if (preferTools && mode !== 'force-ai') {
      emit('status', { stage: 'deterministic_mode' });
      const result = await runDeterministicFallback(text, emit);
      if (isUsefulAnswer(result)) {
        try {
          const conv = await getOrCreateConversation(conversationId);
          await appendTurn(conv, text, result.headline, result);
          emit('result', result);
          emit('complete', {
            conversationId: String(conv._id),
            mode: 'deterministic',
          });
        } catch {
          emit('result', result);
          emit('complete', {
            conversationId: conversationId || null,
            mode: 'deterministic',
          });
        }
        return;
      }
      // fall through to AI if tools couldn’t interpret
    }

    // ── 3. Cohere agent ───────────────────────────────────────────────────
    if (process.env.COHERE_API_KEY && mode !== 'deterministic') {
      try {
        await runAgent({
          message: text,
          conversationId: conversationId || undefined,
          emit,
        });
        return;
      } catch (err) {
        emit('status', {
          stage: 'fallback',
          reason: err.message || 'AI error',
        });
      }
    }

    // ── 4. Last-resort deterministic ──────────────────────────────────────
    emit('status', { stage: 'deterministic_mode' });
    const result = await runDeterministicFallback(text, emit);
    try {
      const conv = await getOrCreateConversation(conversationId);
      await appendTurn(conv, text, result.headline, result);
      emit('result', result);
      emit('complete', {
        conversationId: String(conv._id),
        mode: 'deterministic_fallback',
      });
    } catch {
      emit('result', result);
      emit('complete', {
        conversationId: conversationId || null,
        mode: 'deterministic_fallback',
      });
    }
  } catch (err) {
    emit('error', { message: err.message || 'Chat failed' });
    emit('complete', { failed: true });
  } finally {
    clearInterval(heartbeat);
    try {
      res.end();
    } catch {
      /* ignore */
    }
  }
});

export default router;
