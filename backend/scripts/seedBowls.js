import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Bowl } from '../models/Model.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });

const bowls = [
  {
    name: 'Nutty Beast Protein Bowl',
    description: 'A powerhouse bowl loaded with roasted peanuts, grilled paneer, crisp vegetables, and our signature dressing. Crunchy, satisfying, and packed with clean protein.',
    howItsMade: 'Grilled paneer placed over a bed of shredded lettuce, topped with roasted peanuts, diced cucumber, tomato, and red onion, finished with our smoky chipotle and herb green dressing.',
    calories: 690, protein: 43, carbs: 22, fats: 47, fiber: 9,
    price: 199,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/bowl_301.png',
    available: true,
    category: 'signature',
    pfCategory: 'pf-meals',
    isVeg: true, isBestseller: true, isChefSpecial: false,
    ingredients: ['Grilled paneer', 'Roasted peanuts', 'Shredded lettuce', 'Cucumber', 'Tomato', 'Red onion', 'Black sesame seeds', 'Chipotle dressing', 'Herb green dressing'],
    tags: ['high-protein', 'peanut', 'paneer', 'crunchy', 'keto-friendly', 'veg', 'bestseller'],
    sortOrder: 1,
  },
  {
    name: 'Babycorn Blaze Paneer Bowl',
    description: 'Smoky grilled paneer paired with juicy babycorn, fresh vegetables, and creamy signature sauces for the perfect balance of flavor and protein.',
    howItsMade: 'Paneer grilled on a high-heat grill alongside tender babycorn, served over fresh greens with diced vegetables and a generous drizzle of our creamy signature sauce.',
    calories: 455, protein: 34, carbs: 24, fats: 24, fiber: 8,
    price: 189,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/bowl_302.png',
    available: true,
    category: 'signature',
    pfCategory: 'pf-meals',
    isVeg: true, isBestseller: false, isChefSpecial: false,
    ingredients: ['Grilled paneer', 'Babycorn', 'Shredded lettuce', 'Cucumber', 'Tomato', 'Red onion', 'Signature sauce'],
    tags: ['paneer', 'babycorn', 'high-protein', 'grilled', 'veg'],
    sortOrder: 2,
  },
  {
    name: 'Banana Fuel Bowl',
    description: 'Creamy banana oats topped with crunchy muesli, roasted almonds, pumpkin seeds, sunflower seeds, and a drizzle of golden honey.',
    howItsMade: 'Rolled oats cooked to a creamy texture, layered with sliced fresh banana, a generous scoop of crunchy muesli, and topped with roasted almonds, pumpkin seeds, sunflower seeds, and a honey drizzle.',
    calories: 465, protein: 17, carbs: 62, fats: 17, fiber: 9,
    price: 169,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/bowl_303.png',
    available: true,
    category: 'breakfast',
    pfCategory: 'pf-meals',
    isVeg: true, isBestseller: false, isChefSpecial: false,
    ingredients: ['Rolled oats', 'Banana', 'Muesli', 'Roasted almonds', 'Pumpkin seeds', 'Sunflower seeds', 'Honey'],
    tags: ['breakfast', 'oats', 'banana', 'honey', 'healthy', 'veg', 'energy-bowl'],
    sortOrder: 3,
  },
  {
    name: 'Choco Charge Bowl',
    description: 'Rich cocoa oats topped with banana, crunchy muesli, roasted almonds, pumpkin seeds, sunflower seeds, and a light drizzle of honey.',
    howItsMade: 'Oats slow-cooked with premium cocoa powder for a deep chocolate base, layered with sliced banana, muesli, and topped with roasted almonds, pumpkin seeds, sunflower seeds, and a honey drizzle.',
    calories: 480, protein: 18, carbs: 64, fats: 18, fiber: 10,
    price: 179,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/bowl_304.png',
    available: true,
    category: 'breakfast',
    pfCategory: 'pf-meals',
    isVeg: true, isBestseller: false, isChefSpecial: false,
    ingredients: ['Rolled oats', 'Cocoa powder', 'Banana', 'Muesli', 'Roasted almonds', 'Pumpkin seeds', 'Sunflower seeds', 'Honey'],
    tags: ['cocoa', 'oats', 'breakfast', 'protein', 'chocolate', 'veg', 'energy-bowl', 'new'],
    sortOrder: 4,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log('✅ Connected to MongoDB');

    let added = 0, skipped = 0;
    for (const bowl of bowls) {
      const exists = await Bowl.findOne({ name: bowl.name, pfCategory: 'pf-meals' });
      if (exists) {
        console.log(`⏭  Skipped (already exists): ${bowl.name}`);
        skipped++;
      } else {
        await Bowl.create(bowl);
        console.log(`✅ Added: ${bowl.name}`);
        added++;
      }
    }

    console.log(`\n🎉 Done! Added: ${added}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
