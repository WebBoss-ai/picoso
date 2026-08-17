/**
 * WP Marketing PIN gate.
 * The PIN itself identifies the client — each client gets a unique PIN.
 * Pin is sent as the `x-wp-pin` request header.
 */
import { WpClient } from '../models/wpMarketingModels.js';

export const requireWpPin = async (req, res, next) => {
  const pin = req.headers['x-wp-pin'] || req.body?.pin || req.query?.pin;
  if (!pin) return res.status(401).json({ error: 'PIN required' });

  try {
    const client = await WpClient.findOne({ pin: String(pin).trim(), active: true });
    if (!client) return res.status(401).json({ error: 'Invalid PIN' });
    req.wpClient = client;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authentication error' });
  }
};
