import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey() {
  const secret = process.env.LLM_SECRET || process.env.JWT_SECRET || 'picoso-llm-dev-only';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/** Encrypt Mongo URI for storage. Never log plaintext. */
export function encryptSecret(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(blob) {
  if (!blob) return null;
  const [ivB64, tagB64, dataB64] = String(blob).split(':');
  if (!ivB64 || !tagB64 || !dataB64) return null;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}

export function hostFromUri(uri) {
  try {
    const cleaned = String(uri).replace(/^mongodb(\+srv)?:\/\//, 'http://');
    const u = new URL(cleaned);
    return u.hostname || '';
  } catch {
    return '';
  }
}
