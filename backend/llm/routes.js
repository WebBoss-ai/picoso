import express from 'express';
import { requireLlmPin } from './middleware/llmAuth.js';
import { runAgent, runDeterministicFallback } from './agent/runtime.js';
import { TOOL_DEFINITIONS } from './tools/registry.js';

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

  try {
    emit('status', { stage: 'received' });

    const useFallback =
      mode === 'deterministic' ||
      (!process.env.COHERE_API_KEY && mode !== 'force-ai');

    if (useFallback) {
      emit('status', { stage: 'deterministic_mode' });
      const result = await runDeterministicFallback(message.trim(), emit);
      emit('result', result);
      emit('complete', {
        conversationId: conversationId || null,
        mode: 'deterministic',
      });
    } else {
      try {
        await runAgent({
          message: message.trim(),
          conversationId: conversationId || undefined,
          emit,
        });
      } catch (err) {
        // AI failed mid-flight — try deterministic fallback for resilience
        emit('status', {
          stage: 'fallback',
          reason: err.message || 'AI error',
        });
        const result = await runDeterministicFallback(message.trim(), emit);
        emit('result', result);
        emit('complete', {
          conversationId: conversationId || null,
          mode: 'deterministic_fallback',
        });
      }
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
