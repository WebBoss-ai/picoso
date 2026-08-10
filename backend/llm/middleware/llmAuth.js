/**
 * LLM console PIN gate. Send as header `x-llm-pin`.
 * Override with env LLM_PIN (default 8821 — not shared with admin2).
 */
const LLM_PIN = process.env.LLM_PIN || '8821';

export const requireLlmPin = (req, res, next) => {
  const pin = req.headers['x-llm-pin'] || req.body?.pin || req.query?.pin;
  if (!pin || String(pin) !== String(LLM_PIN)) {
    return res.status(401).json({ error: 'Invalid access code' });
  }
  next();
};

export { LLM_PIN };
