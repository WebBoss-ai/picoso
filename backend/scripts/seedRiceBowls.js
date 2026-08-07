import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Bowl } from '../models/Model.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });

// Desired meal order for the rice-bowl lineup:
// 0 Nutty Beast → 2 Paneer Tikka → 3 Do Pyaza → 4 Matar → 5 Kadai → 6 Lababdar → rest
const FIXED_ORDER = {
  'Nutty Beast Protein Bowl': 0,
  'Paneer Tikka Rice Bowl': 2,
  'Paneer Do Pyaza Rice Bowl': 3,
  'Matar Paneer Rice Bowl': 4,
  'Kadai Paneer Rice Bowl': 5,
  'Paneer Lababdar Rice Bowl': 6,
};

const riceBowls = [
  {
    name: 'Paneer Do Pyaza Rice Bowl',
    description: 'A rich North Indian classic with soft paneer and double onion preparation, cooked in aromatic spices and served with fragrant rice for a wholesome meal.',
    howItsMade: 'Rich onion-based paneer curry with aromatic rice.',
    calories: 650,
    protein: 28,
    carbs: 72,
    fats: 26,
    fiber: 6,
    price: 219,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/pb_201.png',
    available: true,
    category: 'signature',
    pfCategory: 'pf-meals',
    isVeg: true,
    isBestseller: false,
    isChefSpecial: false,
    ingredients: [],
    tags: ['paneer', 'do pyaza', 'north indian', 'rice bowl', 'protein', 'veg'],
    availableFrom: '',
    availableTo: '',
    sortOrder: 2,
  },
  {
    name: 'Matar Paneer Rice Bowl',
    description: 'Comforting matar paneer cooked with fresh peas in a mildly spiced tomato gravy, paired with flavorful rice for a satisfying bowl experience.',
    howItsMade: 'Classic matar paneer with flavorful rice.',
    calories: 640,
    protein: 27,
    carbs: 74,
    fats: 25,
    fiber: 8,
    price: 219,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/pb_202.png',
    available: true,
    category: 'signature',
    pfCategory: 'pf-meals',
    isVeg: true,
    isBestseller: false,
    isChefSpecial: false,
    ingredients: [],
    tags: ['paneer', 'matar', 'rice bowl', 'comfort food', 'protein', 'veg'],
    availableFrom: '',
    availableTo: '',
    sortOrder: 3,
  },
  {
    name: 'Kadai Paneer Rice Bowl',
    description: 'Bold kadai-style paneer cooked with capsicum, onions and aromatic Indian spices, served with fragrant rice for a delicious and filling meal.',
    howItsMade: 'Spicy kadai paneer with aromatic rice.',
    calories: 630,
    protein: 30,
    carbs: 70,
    fats: 25,
    fiber: 6,
    price: 219,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/pb_203.png',
    available: true,
    category: 'signature',
    pfCategory: 'pf-meals',
    isVeg: true,
    isBestseller: false,
    isChefSpecial: false,
    ingredients: [],
    tags: ['paneer', 'kadai', 'north indian', 'rice bowl', 'protein', 'veg'],
    availableFrom: '',
    availableTo: '',
    sortOrder: 4,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log('✅ Connected to MongoDB');

    let added = 0;
    let updated = 0;

    for (const bowl of riceBowls) {
      const existing = await Bowl.findOne({ name: bowl.name, pfCategory: 'pf-meals' });
      if (existing) {
        await Bowl.updateOne({ _id: existing._id }, { $set: bowl });
        console.log(`♻️  Updated: ${bowl.name} (sortOrder ${bowl.sortOrder})`);
        updated++;
      } else {
        await Bowl.create(bowl);
        console.log(`✅ Added: ${bowl.name} (sortOrder ${bowl.sortOrder})`);
        added++;
      }
    }

    // Lock fixed rice-bowl lineup positions
    for (const [name, sortOrder] of Object.entries(FIXED_ORDER)) {
      const res = await Bowl.updateOne(
        { name, pfCategory: 'pf-meals' },
        { $set: { sortOrder } }
      );
      if (res.matchedCount) {
        console.log(`📌 Order locked: ${name} → ${sortOrder}`);
      }
    }

    // Re-pack remaining pf-meals after the fixed lineup (starting at 6)
    const remaining = await Bowl.find({
      pfCategory: 'pf-meals',
      name: { $nin: Object.keys(FIXED_ORDER) },
    }).sort({ sortOrder: 1, createdAt: 1 });

    let next = 7;
    for (const bowl of remaining) {
      if (bowl.sortOrder !== next) {
        await Bowl.updateOne({ _id: bowl._id }, { $set: { sortOrder: next } });
        console.log(`↕  Reordered: ${bowl.name} → ${next}`);
      }
      next++;
    }

    console.log('\n📋 Current pf-meals order:');
    const meals = await Bowl.find({ pfCategory: 'pf-meals' }).sort({ sortOrder: 1 }).select('name sortOrder price');
    for (const m of meals) {
      console.log(`  ${m.sortOrder}. ${m.name} — ₹${m.price}`);
    }

    console.log(`\n🎉 Done! Added: ${added}, Updated: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
