import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Bowl } from '../models/Model.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });

const coffees = [
  {
    name: 'Iced Americano',
    description: 'Bold, smooth, and refreshingly strong. Our Iced Americano is crafted using rich espresso shots poured over crystal-clear ice and chilled water for a clean black coffee experience. Lightly balanced with a subtle touch of milk near the base for smoothness while preserving the intense espresso flavor. Crisp, refreshing, and perfect for pure coffee lovers.',
    howItsMade: 'Double espresso shots pulled fresh, poured over ice with chilled water and a splash of milk at the base.',
    calories: 35, protein: 1, carbs: 4, fats: 1, fiber: 0,
    price: 99,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/cc_p_01.png',
    available: true,
    category: 'cold-coffee',
    pfCategory: 'pf-beverages',
    isVeg: true, isBestseller: false, isChefSpecial: false,
    ingredients: ['Espresso', 'Filtered water', 'Ice', 'Milk (trace)'],
    tags: ['iced coffee', 'americano', 'black coffee', 'espresso', 'cold coffee', 'refreshing'],
    sortOrder: 1,
  },
  {
    name: 'Iced Espresso',
    description: 'Intensely rich and caffeine-forward. Our Iced Espresso delivers concentrated espresso flavor served ice-cold with glossy crema and minimal milk for a strong, bold finish. Crafted for serious coffee enthusiasts who enjoy deep roasted notes and a powerful energy boost in every sip.',
    howItsMade: 'Concentrated double espresso pulled fresh and poured directly over ice with a dash of cold milk.',
    calories: 25, protein: 1, carbs: 3, fats: 1, fiber: 0,
    price: 99,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/cc_p_02.png',
    available: true,
    category: 'cold-coffee',
    pfCategory: 'pf-beverages',
    isVeg: true, isBestseller: false, isChefSpecial: false,
    ingredients: ['Espresso', 'Ice', 'Milk (dash)'],
    tags: ['espresso', 'iced espresso', 'strong coffee', 'caffeine', 'cold coffee', 'premium coffee'],
    sortOrder: 2,
  },
  {
    name: 'Iced Latte',
    description: 'Smooth, creamy, and perfectly balanced. Our Iced Latte combines freshly brewed espresso with chilled silky milk poured over ice to create soft caramel coffee notes with a velvety finish. A comforting café-style classic made refreshing for all-day enjoyment.',
    howItsMade: 'Fresh espresso pulled and combined with chilled whole milk poured gently over ice.',
    calories: 180, protein: 8, carbs: 18, fats: 8, fiber: 0,
    price: 99,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/cc_p_03.png',
    available: true,
    category: 'cold-coffee',
    pfCategory: 'pf-beverages',
    isVeg: true, isBestseller: true, isChefSpecial: false,
    ingredients: ['Espresso', 'Whole milk', 'Ice'],
    tags: ['latte', 'iced latte', 'milk coffee', 'cold coffee', 'creamy coffee', 'café style'],
    sortOrder: 3,
  },
  {
    name: 'Iced Mocha',
    description: 'A rich fusion of espresso and chocolate crafted for indulgence. Our Iced Mocha blends premium espresso, chilled milk, and smooth dark chocolate into a creamy mocha experience served over ice. Deep cocoa notes and coffee richness come together in a luxurious dessert-style cold coffee.',
    howItsMade: 'Dark chocolate syrup blended with fresh espresso and chilled milk, served over ice.',
    calories: 260, protein: 9, carbs: 28, fats: 12, fiber: 2,
    price: 149,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/cc_p_04.png',
    available: true,
    category: 'cold-coffee',
    pfCategory: 'pf-beverages',
    isVeg: true, isBestseller: false, isChefSpecial: true,
    ingredients: ['Espresso', 'Whole milk', 'Dark chocolate syrup', 'Ice', 'Cocoa powder'],
    tags: ['mocha', 'iced mocha', 'chocolate coffee', 'cold coffee', 'creamy coffee', 'dessert coffee'],
    sortOrder: 4,
  },
  {
    name: 'Iced Cappuccino',
    description: 'Light, airy, and café-authentic. Our Iced Cappuccino is made using balanced espresso, chilled milk, and a smooth cold foam layer for a refreshing take on the classic cappuccino. Creamy texture and bold coffee notes create the perfect chilled coffee experience.',
    howItsMade: 'Espresso combined with cold milk and topped with freshly whipped cold foam.',
    calories: 160, protein: 7, carbs: 16, fats: 7, fiber: 0,
    price: 99,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/cc_p_05.png',
    available: true,
    category: 'cold-coffee',
    pfCategory: 'pf-beverages',
    isVeg: true, isBestseller: false, isChefSpecial: false,
    ingredients: ['Espresso', 'Whole milk', 'Cold foam', 'Ice'],
    tags: ['cappuccino', 'iced cappuccino', 'foam coffee', 'cold coffee', 'café coffee'],
    sortOrder: 5,
  },
  {
    name: 'Iced Caramel Macchiato',
    description: 'Beautifully layered and handcrafted to perfection. Our Iced Caramel Macchiato features chilled milk, smooth caramel, and bold espresso poured over ice to create dramatic layers and rich flavor transitions. Sweet caramel notes balance the espresso for a luxurious café-style drink.',
    howItsMade: 'Chilled milk and caramel syrup layered with ice, topped with fresh espresso for a dramatic pour.',
    calories: 240, protein: 8, carbs: 30, fats: 10, fiber: 0,
    price: 99,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/cc_p_06.png',
    available: true,
    category: 'cold-coffee',
    pfCategory: 'pf-beverages',
    isVeg: true, isBestseller: true, isChefSpecial: true,
    ingredients: ['Espresso', 'Whole milk', 'Caramel syrup', 'Vanilla syrup', 'Ice'],
    tags: ['macchiato', 'caramel macchiato', 'iced coffee', 'layered coffee', 'cold coffee'],
    sortOrder: 6,
  },
  {
    name: 'Iced Flat White',
    description: 'Silky, balanced, and smooth. Our Iced Flat White combines rich espresso with velvety chilled milk for a refined coffee experience with a creamy texture and bold coffee finish. Less foamy than a latte yet richer in texture, crafted for true coffee lovers.',
    howItsMade: 'Ristretto espresso shots combined with micro-foamed chilled milk poured over ice.',
    calories: 170, protein: 8, carbs: 15, fats: 8, fiber: 0,
    price: 99,
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/cc_p_07.png',
    available: true,
    category: 'cold-coffee',
    pfCategory: 'pf-beverages',
    isVeg: true, isBestseller: false, isChefSpecial: false,
    ingredients: ['Ristretto espresso', 'Whole milk', 'Ice'],
    tags: ['flat white', 'iced flat white', 'smooth coffee', 'milk coffee', 'premium coffee'],
    sortOrder: 7,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let added = 0, skipped = 0;
    for (const coffee of coffees) {
      const exists = await Bowl.findOne({ name: coffee.name, pfCategory: 'pf-beverages' });
      if (exists) {
        console.log(`⏭  Skipped (already exists): ${coffee.name}`);
        skipped++;
      } else {
        await Bowl.create(coffee);
        console.log(`✅ Added: ${coffee.name}`);
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
