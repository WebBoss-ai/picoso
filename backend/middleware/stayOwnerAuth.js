import { StayOwner } from '../models/stayModels.js';

export const requireStayOwnerPin = async (req, res, next) => {
  try {
    const pin = req.headers['x-stay-owner-pin'] || req.body?.pin || req.query?.pin;
    if (!pin) return res.status(401).json({ error: 'Owner PIN required' });

    const owner = await StayOwner.findOne({ pin: String(pin).trim(), active: true });
    if (!owner) return res.status(401).json({ error: 'Invalid owner PIN' });

    req.stayOwner = owner;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
