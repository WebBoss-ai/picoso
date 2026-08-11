import express from 'express';
import { requireLlmPin } from './middleware/llmAuth.js';
import {
  runAgent,
  runDeterministicFallback,
  isUsefulAnswer,
} from './agent/runtime.js';
import { TOOL_DEFINITIONS } from './tools/registry.js';
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
    await appendTurn(conv, text, answer.headline || answer.narrative || '', answer);
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
    mode: 'ai_first',
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
 * AI-first pipeline:
 * 1) Cohere agent plans any intent (greet / chat / analytics) + tools for live numbers
 * 2) Soft code fallback only if AI incomplete and key missing/error
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

    if (process.env.COHERE_API_KEY && mode !== 'deterministic') {
      try {
        emit('status', { stage: 'planning', mode: 'ai' });
        const out = await runAgent({
          message: text,
          conversationId: conversationId || undefined,
          emit,
        });
        if (out?.result && isUsefulAnswer(out.result) && !out.incomplete) {
          return;
        }
        emit('status', {
          stage: 'tools_engine',
          reason: out?.incomplete ? 'ai_incomplete' : 'ai_weak',
        });
      } catch (err) {
        emit('status', {
          stage: 'fallback',
          reason: err.message || 'AI error',
        });
      }
    } else if (!process.env.COHERE_API_KEY) {
      emit('status', {
        stage: 'tools_engine',
        reason: 'no_cohere_key',
      });
    }

    // Safety net only — flexible tools, not keyword templates as primary brain
    emit('status', { stage: 'recovery_tools' });
    const result = await runDeterministicFallback(text, emit);
    await emitResult(
      emit,
      text,
      conversationId,
      result,
      process.env.COHERE_API_KEY ? 'tools_after_ai' : 'tools_only'
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
