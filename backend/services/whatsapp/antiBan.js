/**
 * Anti-ban engine for WhatsApp automation.
 *
 * WhatsApp aggressively bans numbers that behave like bots: identical messages
 * blasted at machine speed, sending to invalid numbers, no typing/presence, and
 * huge volumes with no breaks. This module implements a layered defense:
 *
 *   1. Spintax + token personalization  -> every message body is unique
 *   2. Randomized human-like delays       -> no fixed cadence
 *   3. Warmup ramp                        -> start slow, speed up gradually
 *   4. Batching with long cooldowns       -> mimic human "sessions"
 *   5. Daily caps                         -> stay under volume thresholds
 *   6. Active-hours window                -> no 3 AM blasts
 *   7. Number validation                  -> never message non-WhatsApp numbers
 *   8. Typing simulation                  -> presence + typing before send
 *   9. Circuit breaker                    -> auto-pause on consecutive failures
 */

const DEFAULT_COUNTRY_CODE = process.env.WA_COUNTRY_CODE || '91';

/** Sleep helper. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Inclusive random integer in [min, max]. */
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Gaussian-ish random within [min, max] (sum of two uniforms -> triangular).
 * Produces more "natural" clustering around the middle than a flat uniform.
 */
export const humanRand = (min, max) => {
  const a = Math.random();
  const b = Math.random();
  const t = (a + b) / 2; // triangular distribution centered at 0.5
  return Math.round(min + t * (max - min));
};

/**
 * Parse & pick from spintax: "{Hi|Hello|Hey}" -> one option chosen at random.
 * Supports nesting. Also replaces {{name}} and {{phone}} tokens.
 */
export const spin = (text = '') => {
  let out = String(text);
  // Resolve innermost {a|b|c} groups repeatedly until none remain.
  const groupRe = /\{([^{}]*\|[^{}]*)\}/;
  let guard = 0;
  while (groupRe.test(out) && guard < 100) {
    out = out.replace(groupRe, (_, body) => {
      const opts = body.split('|');
      return opts[Math.floor(Math.random() * opts.length)];
    });
    guard++;
  }
  return out;
};

/** Fill personalization tokens after spintax resolution. */
export const personalize = (text = '', { name = '', phone = '' } = {}) => {
  const nm = (name && name.trim()) ? name.trim() : '';
  let out = String(text)
    .replace(/\{\{\s*name\s*\}\}/gi, nm)
    .replace(/\{\{\s*phone\s*\}\}/gi, phone || '');
  // With no name, clean up artifacts an empty {{name}} leaves behind
  // e.g. "Welcome to Picoso, ." -> "Welcome to Picoso."
  if (!nm) {
    out = out
      .replace(/\s*,\s*([.!?])/g, '$1')   // ", ." -> "."
      .replace(/[ \t]{2,}/g, ' ')          // collapse double spaces
      .trim();
  }
  return out;
};

/** Build final unique message body for one recipient. */
export const buildMessage = (template, recipient) =>
  personalize(spin(template), recipient);

/**
 * Normalize an arbitrary phone string into a WhatsApp chatId ("<digits>@c.us").
 * Handles +, spaces, dashes, leading zeros, and 10-digit local numbers.
 * Returns null if it cannot form a plausible number.
 */
export const toChatId = (raw, countryCode = DEFAULT_COUNTRY_CODE) => {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (!d) return null;

  // Strip a single leading 0 (national trunk prefix) before adding country code.
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);

  // Bare 10-digit local number -> prepend country code.
  if (d.length === 10) d = countryCode + d;

  // Too short / too long to be valid.
  if (d.length < 11 || d.length > 15) return null;

  return `${d}@c.us`;
};

/** De-duplicate + normalize a raw list of phone strings into recipient objects. */
export const parseRecipients = (list = [], countryCode) => {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    // item can be a string "9876543210" or "9876543210,Name" or {phone,name}
    let phone = '';
    let name = '';
    if (typeof item === 'string') {
      const parts = item.split(/[,;\t]/);
      phone = parts[0]?.trim() || '';
      name = parts[1]?.trim() || '';
    } else if (item && typeof item === 'object') {
      phone = String(item.phone || '').trim();
      name = String(item.name || '').trim();
    }
    const chatId = toChatId(phone, countryCode);
    const dedupeKey = chatId || phone;
    if (!dedupeKey || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({ phone, name, chatId: chatId || '', status: chatId ? 'queued' : 'invalid' });
  }
  return out;
};

/** Fisher-Yates shuffle (sending in a non-sequential order looks more organic). */
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Compute the delay (ms) to wait BEFORE sending message number `index`
 * (0-based) within the current run, given the campaign config.
 *
 * Layers:
 *  - base human delay between min/max
 *  - warmup multiplier for the first ~10 messages (slower start)
 *  - occasional "long think" pause (~1 in 8) to break the rhythm
 */
export const computeSendDelay = (index, cfg) => {
  const minMs = (cfg.minDelaySec ?? 18) * 1000;
  const maxMs = (cfg.maxDelaySec ?? 55) * 1000;
  let delay = humanRand(minMs, maxMs);

  // Warmup: first messages are noticeably slower, easing toward normal speed.
  if (cfg.warmup) {
    if (index < 3) delay *= 2.2;
    else if (index < 6) delay *= 1.7;
    else if (index < 10) delay *= 1.3;
  }

  // Random extra "distraction" pause to avoid a metronome cadence.
  if (Math.random() < 0.12) delay += randInt(20000, 60000);

  return Math.round(delay);
};

/**
 * Batch cooldown: after every `batchSize` sends, take a long human break.
 * Returns ms to wait (0 if not at a batch boundary).
 */
export const computeBatchCooldown = (sentInRun, cfg) => {
  const size = cfg.batchSize ?? 20;
  if (size <= 0) return 0;
  if (sentInRun > 0 && sentInRun % size === 0) {
    const baseMin = (cfg.batchCooldownMin ?? 12) * 60 * 1000;
    // ± up to 5 extra minutes of jitter.
    return baseMin + randInt(0, 5 * 60 * 1000);
  }
  return 0;
};

/** Typing simulation duration proportional to message length, capped. */
export const typingDurationMs = (message = '') => {
  const len = String(message).length;
  // ~40ms per char, clamped to a believable 1.5s–7s window.
  return Math.min(7000, Math.max(1500, len * 40 + randInt(0, 1200)));
};

/** Is the current local hour within the allowed active window? */
export const isWithinActiveHours = (cfg, now = new Date()) => {
  const start = cfg.activeHourStart ?? 0;
  const end = cfg.activeHourEnd ?? 24;
  if (start === 0 && end === 24) return true;
  const h = now.getHours();
  if (start <= end) return h >= start && h < end;
  // Window wraps past midnight (e.g. 20 -> 6).
  return h >= start || h < end;
};

/** ms until the active window opens again (used to sleep through quiet hours). */
export const msUntilActiveWindow = (cfg, now = new Date()) => {
  const start = cfg.activeHourStart ?? 0;
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(start);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};

/** Today's date marker (YYYY-MM-DD) for daily-cap accounting. */
export const todayKey = (now = new Date()) => now.toISOString().slice(0, 10);
