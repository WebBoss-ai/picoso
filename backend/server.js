import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import routes from './routes/routes.js';
import { DeliveryPartner, User, Campaign } from './models/Model.js';
import { WpClient } from './models/wpMarketingModels.js';

dotenv.config();

const app = express();

app.use(cors());

/* ── Request logger ─────────────────────────────────────────────────────────
   Logs method, path, status code, response time, and (for /api/wp-marketing
   and /api/webhooks routes) the presence/absence of auth headers so issues
   with missing PINs are immediately visible in server output.
─────────────────────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms   = Date.now() - start;
    const isWp = req.path.startsWith('/api/wp-marketing') || req.path.startsWith('/api/webhooks');
    const pin  = req.headers['x-wp-pin'] ? '[pin:set]' : '[pin:MISSING]';
    const auth = req.headers.authorization ? '[auth:set]' : '';
    const tag  = isWp ? ` ${pin}${auth}` : '';
    const color = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}${req.method} ${req.path} → ${res.statusCode}\x1b[0m  ${ms}ms${tag}`);
  });
  next();
});

// Capture raw body for HMAC webhook verification before JSON parsing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks/')) {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      req.rawBody = raw;
      try { req.body = JSON.parse(raw || '{}'); } catch { req.body = {}; }
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Seed delivery partners ─────────────────────────────────────────────────
async function seedDeliveryPartners() {
  const partners = [
    { email: 'd1@picoso.in', password: 'd1#1245', name: 'Delivery Partner 1' },
    { email: 'd2@picoso.in', password: 'd2#3574', name: 'Delivery Partner 2' },
  ];
  for (const p of partners) {
    const exists = await DeliveryPartner.findOne({ email: p.email });
    if (!exists) {
      const hashed = await bcrypt.hash(p.password, 10);
      await DeliveryPartner.create({ email: p.email, password: hashed, name: p.name });
      console.log(`✅ Delivery partner seeded: ${p.email}`);
    }
  }
}

async function ensureTestUserAddress() {
  const TEST_PHONE = '9999999999';
  const FAR_LABEL  = 'Far Away (Test)';
  const user = await User.findOne({ phone: TEST_PHONE });
  if (!user) return;
  const already = user.savedAddresses?.some(a => a.label === FAR_LABEL);
  if (already) return;
  user.savedAddresses.push({
    label:       FAR_LABEL,
    fullAddress: '5 km North of Picoso Store, Gurugram',
    area:        'Test Area North',
    city:        'Gurugram',
    landmark:    'Picoso Test Pin',
    lat:         28.482149,
    lng:         77.072771,
    isDefault:   false,
  });
  await user.save();
  console.log('✅ Far-away address added to test user 9999999999');
}

async function seedCampaign1() {
  const exists = await Campaign.findOne({ code: '483271' });
  if (!exists) {
    await Campaign.create({
      code:          '483271',
      name:          'Free Coffee Launch',
      description:   'Get 1 free coffee on every bowl order — launch campaign.',
      benefit:       'free_coffee',
      freeItemLabel: 'Free Coffee',
      freeItemValue: 79,
      totalBudget:   5,
      active:        true,
    });
    console.log('✅ Campaign 1 (Free Coffee Launch) seeded — code: 483271');
  }
}

async function seedWpClients() {
  const exists = await WpClient.findOne({ slug: 'client-001' });
  if (!exists) {
    await WpClient.create({
      slug: 'client-001',
      name: 'Picoso',
      pin: '0095',
      active: true,
      workspace: {
        businessName: 'Picoso',
        businessType: 'Food Delivery',
        industry: 'F&B',
        timezone: 'Asia/Kolkata',
      },
    });
    console.log('✅ WP Marketing client seeded — Picoso (PIN: 0095)');
  }
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedDeliveryPartners();
    await ensureTestUserAddress();
    await seedCampaign1();
    await seedWpClients();
  })
  .catch(err => console.error('❌ MongoDB Error:', err));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: 'Trezla Bowl Shop API Running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
