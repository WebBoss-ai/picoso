const STAY_ADMIN_PIN = process.env.STAY_ADMIN_PIN || '246810';

export const requireStayAdminPin = (req, res, next) => {
  const pin = req.headers['x-stay-admin-pin'] || req.body?.pin || req.query?.pin;
  if (!pin || String(pin) !== String(STAY_ADMIN_PIN)) {
    return res.status(401).json({ error: 'Invalid stay admin PIN' });
  }
  next();
};

export { STAY_ADMIN_PIN };
