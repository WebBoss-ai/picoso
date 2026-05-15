import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import routes from './routes/routes.js';
import { DeliveryPartner } from './models/Model.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
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

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedDeliveryPartners();
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
