/**
 * WP Marketing PIN gate.
 * The PIN itself identifies the client — each client gets a unique PIN.
 * Pin is read from (in order of priority):
 *   1. x-wp-pin request header
 *   2. pin field in JSON body
 *   3. pin query-string parameter
 */
import { WpClient } from '../models/wpMarketingModels.js';

export const requireWpPin = async (req, res, next) => {
  const pin = req.headers['x-wp-pin'] || req.body?.pin || req.query?.pin;

  if (!pin) {
    console.warn(`[WP Auth] No PIN — ${req.method} ${req.path} | headers: ${JSON.stringify(Object.keys(req.headers))}`);
    return res.status(401).json({
      error: 'PIN required',
      hint:  'Send your PIN via the x-wp-pin request header',
    });
  }

  try {
    const client = await WpClient.findOne({ pin: String(pin).trim(), active: true });
    if (!client) {
      console.warn(`[WP Auth] Invalid PIN attempt — ${req.method} ${req.path} | pin: ${String(pin).slice(0, 2)}**`);
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    console.log(`[WP Auth] OK — ${req.method} ${req.path} | client: ${client.slug}`);
    req.wpClient = client;
    next();
  } catch (err) {
    console.error('[WP Auth] Error:', err.message);
    res.status(500).json({ error: 'Authentication error' });
  }
};
