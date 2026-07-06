/**
 * Seed script: creates / resets the test user (phone 9999999999)
 * with a saved address pinned 5 km north of the Picoso store.
 *
 * Run once from the backend folder:
 *   node seedTestUser.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from './models/Model.js';

// ── Store location (from checkout/page.js) ───────────────────────────────────
const STORE_LAT = 28.437099;
const STORE_LNG = 77.072771;

// 5 km north: 1 degree lat ≈ 111 km  →  5 / 111 ≈ 0.04505 degrees
const TEST_LAT = +(STORE_LAT + 0.04505).toFixed(6); // ≈ 28.482149
const TEST_LNG = STORE_LNG;

const TEST_PHONE = '9999999999';
const TEST_NAME  = 'Test User (5 km away)';

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB');

const testAddress = {
  label:       'Test Home',
  fullAddress: '5 km North of Picoso Store, Gurugram',
  area:        'Test Area',
  city:        'Gurugram',
  landmark:    'Picoso Test Pin',
  lat:         TEST_LAT,
  lng:         TEST_LNG,
  isDefault:   true,
};

let user = await User.findOne({ phone: TEST_PHONE });

if (user) {
  console.log(`♻️  Found existing user: ${user._id}  — resetting address`);
  await User.findByIdAndUpdate(user._id, {
    name:           TEST_NAME,
    email:          `${TEST_PHONE}@picoso.in`,
    savedAddresses: [testAddress],
    location: {
      city:        testAddress.city,
      area:        testAddress.area,
      address:     testAddress.fullAddress,
      coordinates: { lat: TEST_LAT, lng: TEST_LNG },
    },
    lastLoginAt:  new Date(),
    lastActiveAt: new Date(),
  });
  user = await User.findById(user._id);
} else {
  console.log('🆕 Creating new test user');
  user = await User.create({
    phone:          TEST_PHONE,
    name:           TEST_NAME,
    email:          `${TEST_PHONE}@picoso.in`,
    savedAddresses: [testAddress],
    location: {
      city:        testAddress.city,
      area:        testAddress.area,
      address:     testAddress.fullAddress,
      coordinates: { lat: TEST_LAT, lng: TEST_LNG },
    },
    lastLoginAt:  new Date(),
    lastActiveAt: new Date(),
  });
}

const token = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  TEST USER READY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Phone  : ${TEST_PHONE}`);
console.log(`  Name   : ${user.name}`);
console.log(`  User ID: ${user._id}`);
console.log(`  Lat/Lng: ${TEST_LAT}, ${TEST_LNG}  (≈ 5 km from store)`);
console.log(`  Token  : ${token}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nTo log in from the browser, open DevTools console and run:');
console.log(`  localStorage.setItem('token', '${token}')`);
console.log('  location.reload()');
console.log('');

await mongoose.disconnect();
