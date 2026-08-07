/**
 * Admin2 PIN gate for the breakfast subscription console.
 * Send as header `x-admin2-pin`. Defaults to 0095, overridable via ADMIN2_PIN.
 */
const ADMIN2_PIN = process.env.ADMIN2_PIN || '0095';

export const requireAdmin2Pin = (req, res, next) => {
  const pin = req.headers['x-admin2-pin'] || req.body?.pin || req.query?.pin;
  if (!pin || String(pin) !== String(ADMIN2_PIN)) {
    return res.status(401).json({ error: 'Invalid access code' });
  }
  next();
};

export { ADMIN2_PIN };
