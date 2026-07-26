/**
 * WhatsApp Web client singleton (powered by whatsapp-web.js + Puppeteer).
 *
 * This drives a REAL WhatsApp Web session for the business number (8167080111).
 * Pair once by scanning the QR from /marketing; the session is persisted on disk
 * via LocalAuth so it survives restarts. All sends go through this single client.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode';
import pkg from 'whatsapp-web.js';

const { Client, LocalAuth, MessageMedia } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = path.resolve(__dirname, '../../.wwebjs_auth');

// In-memory connection state (source of truth for the /marketing UI).
const state = {
  status: 'disconnected', // disconnected | initializing | qr | authenticated | ready | auth_failure
  qrDataUrl: null,
  qrString: null,
  me: null,               // { pushname, number }
  lastError: null,
  startedAt: null,
  readyAt: null,
};

let client = null;
let initializing = false;

const setStatus = (s) => {
  state.status = s;
  console.log(`📲 [WA] status -> ${s}`);
};

/** Create and wire up the whatsapp-web.js client. */
const createClient = () => {
  const c = new Client({
    authStrategy: new LocalAuth({ clientId: 'picoso-marketing', dataPath: SESSION_PATH }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  c.on('qr', async (qr) => {
    try {
      state.qrString = qr;
      state.qrDataUrl = await qrcode.toDataURL(qr, { margin: 1, scale: 6 });
      setStatus('qr');
    } catch (e) {
      console.error('[WA] qr render error', e);
    }
  });

  c.on('loading_screen', (percent, message) => {
    console.log(`[WA] loading ${percent}% ${message || ''}`);
  });

  c.on('authenticated', () => {
    state.qrDataUrl = null;
    state.qrString = null;
    setStatus('authenticated');
  });

  c.on('auth_failure', (msg) => {
    state.lastError = `Auth failure: ${msg}`;
    setStatus('auth_failure');
  });

  c.on('ready', () => {
    state.qrDataUrl = null;
    state.qrString = null;
    state.readyAt = new Date();
    try {
      const info = c.info;
      state.me = {
        pushname: info?.pushname || '',
        number: info?.wid?.user || '',
      };
    } catch { /* ignore */ }
    setStatus('ready');
  });

  c.on('disconnected', (reason) => {
    state.lastError = `Disconnected: ${reason}`;
    state.me = null;
    setStatus('disconnected');
    client = null; // allow a fresh init on next call
  });

  return c;
};

/** Start (or restart) the client. Idempotent. */
export const initClient = async () => {
  if (client && (state.status === 'ready' || state.status === 'authenticated' || state.status === 'qr')) {
    return state;
  }
  if (initializing) return state;

  initializing = true;
  state.lastError = null;
  state.startedAt = new Date();
  setStatus('initializing');

  try {
    client = createClient();
    // initialize() resolves after the browser is up; QR/ready arrive via events.
    client.initialize().catch((e) => {
      state.lastError = e?.message || String(e);
      setStatus('disconnected');
      client = null;
    });
  } catch (e) {
    state.lastError = e?.message || String(e);
    setStatus('disconnected');
    client = null;
  } finally {
    initializing = false;
  }
  return state;
};

export const getState = () => ({
  status: state.status,
  connected: state.status === 'ready',
  qr: state.qrDataUrl,
  me: state.me,
  lastError: state.lastError,
  readyAt: state.readyAt,
});

export const isReady = () => state.status === 'ready' && !!client;

/** Log out and wipe the persisted session (forces a fresh QR next time). */
export const logout = async () => {
  try {
    if (client) {
      await client.logout().catch(() => {});
      await client.destroy().catch(() => {});
    }
  } finally {
    client = null;
    state.me = null;
    state.qrDataUrl = null;
    state.qrString = null;
    setStatus('disconnected');
  }
};

/** Restart the browser session without wiping auth. */
export const restart = async () => {
  try {
    if (client) await client.destroy().catch(() => {});
  } finally {
    client = null;
    setStatus('disconnected');
  }
  return initClient();
};

/** Verify a chatId is actually registered on WhatsApp. */
export const isRegistered = async (chatId) => {
  if (!isReady()) throw new Error('WhatsApp not connected');
  try {
    const numberId = await client.getNumberId(chatId.replace('@c.us', ''));
    return !!numberId;
  } catch {
    return false;
  }
};

/** Simulate opening the chat + typing before sending (more human). */
export const simulateTyping = async (chatId, durationMs) => {
  try {
    const chat = await client.getChatById(chatId);
    await chat.sendStateTyping();
    await new Promise((r) => setTimeout(r, durationMs));
    await chat.clearState().catch(() => {});
  } catch { /* non-fatal */ }
};

/**
 * Send a message. If media is provided ({ base64, mimetype, filename } or url),
 * it is sent as an attachment with the text as caption.
 */
export const sendMessage = async (chatId, text, media = null) => {
  if (!isReady()) throw new Error('WhatsApp not connected');

  if (media && (media.base64 || media.url)) {
    let msgMedia;
    if (media.url) {
      msgMedia = await MessageMedia.fromUrl(media.url, { unsafeMime: true });
    } else {
      msgMedia = new MessageMedia(media.mimetype || 'image/png', media.base64, media.filename || 'image.png');
    }
    return client.sendMessage(chatId, msgMedia, { caption: text || undefined });
  }
  return client.sendMessage(chatId, text);
};

export { MessageMedia };
