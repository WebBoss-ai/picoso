/**
 * Welcome-message automation.
 *
 * Fired (fire-and-forget) when a brand-new user registers. Sends a personalized
 * WhatsApp welcome with an optional image attachment from the business number.
 * Never throws — registration must never fail because of marketing.
 */

import { WelcomeConfig, WaMessageLog } from '../../models/Model.js';
import { isReady, simulateTyping, sendMessage } from './waClient.js';
import { buildMessage, toChatId, typingDurationMs, sleep } from './antiBan.js';

export const getWelcomeConfig = async () => {
  let cfg = await WelcomeConfig.findOne({ key: 'default' });
  if (!cfg) cfg = await WelcomeConfig.create({ key: 'default' });
  return cfg;
};

const buildMedia = (cfg) => {
  if (cfg.imageUrl) return { url: cfg.imageUrl };
  if (cfg.imageBase64) return { base64: cfg.imageBase64, mimetype: cfg.imageMime || 'image/png', filename: 'welcome' };
  return null;
};

/**
 * Send a welcome message to a user object ({ phone, name }).
 * Returns a short status string; logs the outcome.
 */
export const sendWelcome = async (user) => {
  try {
    const cfg = await getWelcomeConfig();
    if (!cfg.enabled) return 'disabled';

    const chatId = toChatId(user.phone);
    if (!chatId) {
      await WaMessageLog.create({ type: 'welcome', phone: user.phone, status: 'invalid', error: 'Unparseable number' });
      return 'invalid-number';
    }

    if (!isReady()) {
      await WaMessageLog.create({ type: 'welcome', phone: user.phone, chatId, status: 'skipped', error: 'WhatsApp not connected' });
      return 'not-connected';
    }

    // Small human-like delay so it doesn't fire the same millisecond as signup.
    const delayMs = Math.max(0, (cfg.delaySec || 0) * 1000);
    if (delayMs) await sleep(delayMs);

    const body = buildMessage(cfg.message, { name: user.name, phone: user.phone });
    const media = buildMedia(cfg);

    await simulateTyping(chatId, typingDurationMs(body));
    await sendMessage(chatId, body, media);

    await WaMessageLog.create({ type: 'welcome', phone: user.phone, chatId, status: 'sent', hasMedia: !!media });
    return 'sent';
  } catch (e) {
    try {
      await WaMessageLog.create({ type: 'welcome', phone: user?.phone || '', status: 'failed', error: e?.message || String(e) });
    } catch { /* ignore */ }
    console.error('[WA] welcome send error', e?.message || e);
    return 'error';
  }
};

/** Fire-and-forget wrapper safe to call from request handlers. */
export const queueWelcome = (user) => {
  sendWelcome(user).catch(() => {});
};
