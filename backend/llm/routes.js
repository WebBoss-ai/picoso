import express from 'express';
import { requireLlmPin } from './middleware/llmAuth.js';
import {
  runAgent,
  runDeterministicFallback,
  greetingAnswer,
  isUsefulAnswer,
} from './agent/runtime.js';
import { TOOL_DEFINITIONS } from './tools/registry.js';
import { isGreeting } from './templates.js';
import {
  getOrCreateConversation,
  appendTurn,
} from './agent/memory.js';

const router = express.Router();

const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const max = 40;
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

async function emitResult(emit, text, conversationId, answer, mode) {
  try {
    const conv = await getOrCreateConversation(conversationId);
    await appendTurn(conv, text, answer.headline || '', answer);
    emit('result', answer);
    emit('complete', {
      conversationId: String(conv._id),
      mode,
    });
  } catch {
    emit('result', answer);
    emit('complete', {
      conversationId: conversationId || null,
      mode,
    });
  }
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
 * Pipeline:
 *  1. Greetings
 *  2. AI brain (Cohere) when key present — plans + tools; code always finishes metrics
 *  3. Deterministic full analytics path (always has numbers for known patterns)
 *  4. Soft failure message
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

    if (isGreeting(text)) {
      await emitResult(emit, text, conversationId, greetingAnswer(), 'greeting');
      return;
    }

    // ── AI first (brain) ──────────────────────────────────────────────────
    if (process.env.COHERE_API_KEY && mode !== 'deterministic') {
      try {
        emit('status', { stage: 'planning', mode: 'ai' });
        // runAgent emits result+complete itself when successful
        const out = await runAgent({
          message: text,
          conversationId: conversationId || undefined,
          emit,
        });
        // If agent returned useless answer, fall through to tools engine
        if (out?.result && isUsefulAnswer(out.result)) {
          return;
        }
        emit('status', {
          stage: 'tools_engine',
          reason: 'ai_incomplete',
        });
      } catch (err) {
        emit('status', {
          stage: 'fallback',
          reason: err.message || 'AI error',
        });
      }
    }

    // ── Tools engine (deterministic analytics) ────────────────────────────
    emit('status', { stage: 'deterministic_mode' });
    const result = await runDeterministicFallback(text, emit);
    await emitResult(
      emit,
      text,
      conversationId,
      result,
      process.env.COHERE_API_KEY ? 'tools_after_ai' : 'deterministic'
    );
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
