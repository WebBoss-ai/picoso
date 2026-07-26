/**
 * Marketing PIN gate. Every /marketing route requires the 6-digit PIN, sent as
 * the `x-marketing-pin` header. Defaults to 855673, overridable via env.
 */
const MARKETING_PIN = process.env.MARKETING_PIN || '855673';

export const requireMarketingPin = (req, res, next) => {
  const pin = req.headers['x-marketing-pin'] || req.body?.pin || req.query?.pin;
  if (!pin || String(pin) !== String(MARKETING_PIN)) {
    return res.status(401).json({ error: 'Invalid marketing PIN' });
  }
  next();
};

export { MARKETING_PIN };
