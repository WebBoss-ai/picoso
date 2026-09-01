/**
 * CampaignBot webhook HMAC-SHA256 verification.
 * Header: X-Webhook-Signature: sha256=<hex>
 * Signed data: raw JSON request body (exact bytes).
 */

import crypto from 'crypto';

export function buildWebhookSignature(rawBody, secret) {
  const raw = typeof rawBody === 'string' ? rawBody : String(rawBody || '');
  const hex = crypto.createHmac('sha256', String(secret || '')).update(raw).digest('hex');
  return `sha256=${hex}`;
}

export function verifyWebhookSignature(rawBody, signatureHeader, secrets = []) {
  if (!signatureHeader) return { ok: false, reason: 'missing' };
  const raw = typeof rawBody === 'string' ? rawBody : String(rawBody || '');
  const unique = [...new Set(secrets.filter(Boolean).map(String))];
  for (const secret of unique) {
    const expected = buildWebhookSignature(raw, secret);
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(String(signatureHeader));
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return { ok: true, secretUsed: secret.slice(0, 4) + '…' };
      }
    } catch { /* next */ }
  }
  return { ok: false, reason: 'mismatch' };
}

export function getWebhookSecretCandidates(body = {}) {
  const secrets = new Set();
  const placeholder = 'Your client webhook secret key';
  if (body?.secret && String(body.secret).trim() && body.secret !== placeholder) {
    secrets.add(String(body.secret).trim());
  }
  for (const key of [
    process.env.CAMPAIGNBOT_WEBHOOK_SECRET,
    process.env.CAMPAIGNBOT_API_KEY,
  ]) {
    if (key) secrets.add(key);
  }
  return [...secrets];
}

export function isOverviewPing(body = {}) {
  const event = String(body?.event || '').trim();
  return !event && body?.algorithm && body?.secret;
}
