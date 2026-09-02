import {
  StayDestination,
  StayCategory,
  StayOwner,
  StayProperty,
} from '../models/stayModels.js';

const DESTINATIONS = [
  { slug: 'shimla', name: 'Shimla', tagline: 'Pine forests & colonial charm', available: true, image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80' },
  { slug: 'manali', name: 'Manali', tagline: 'Snow peaks & apple orchards', available: false, image: 'https://images.unsplash.com/photo-1626621341520-097a0c7a2f2f?w=1200&q=80' },
  { slug: 'kasol', name: 'Kasol', tagline: 'Parvati valley hideaways', available: false, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80' },
];

const CATEGORIES = [
  { slug: 'cabin', name: 'Cabin', icon: 'home' },
  { slug: 'homestay', name: 'Homestay', icon: 'users' },
  { slug: 'cottage', name: 'Cottage', icon: 'tree' },
  { slug: 'villa', name: 'Villa', icon: 'building' },
  { slug: 'glamping', name: 'Glamping', icon: 'tent' },
];

const OWNERS = [
  { name: 'Rajesh Thakur', phone: '9876543210', pin: '482910' },
  { name: 'Meera Sharma', phone: '9876501234', pin: '193847' },
  { name: 'Ankit Verma', phone: '9811122233', pin: '556677' },
];

function propertyTemplate(ownerIdx, data) {
  return { ownerIdx, ...data };
}

const PROPERTIES = [
  propertyTemplate(0, {
    destination: 'shimla', name: 'Cedar Nest Retreat', category: 'cabin',
    tagline: 'Glass walls facing the deodar canopy',
    description: 'A handcrafted cedar cabin perched above Mashobra. Floor-to-ceiling windows, a wood stove, and trails that start at your door.',
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80'],
    location: 'Mashobra, Shimla', rating: 4.9, reviews: 128,
    amenities: ['Fireplace', 'Mountain view', 'Kitchen', 'Wi-Fi', 'Parking', 'Heating'],
    highlights: ['Pay at property', 'Nature trail access', 'Pet friendly'],
    rooms: [
      { roomId: 'r1', name: 'Deluxe with Balcony', description: 'King bed, private balcony overlooking cedars', price: 4200, total: 10, available: 10, maxGuests: 2, amenities: ['Balcony', 'King bed'] },
      { roomId: 'r2', name: 'Forest Suite', description: 'Spacious suite with sofa and work desk', price: 5800, total: 4, available: 4, maxGuests: 3, amenities: ['Living area', 'Desk'] },
    ],
  }),
  propertyTemplate(0, {
    destination: 'shimla', name: 'Pine & Quiet Homestay', category: 'homestay',
    tagline: 'Family-run warmth in Chharabra',
    description: 'Stay with a local family who know every ridge trail. Homemade pahadi meals and rooms that smell of pine resin after rain.',
    images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80'],
    location: 'Chharabra, Shimla', rating: 4.8, reviews: 86,
    amenities: ['Home meals', 'Garden', 'Wi-Fi', 'Heating', 'Parking'],
    highlights: ['Pay at property', 'Local host'],
    rooms: [
      { roomId: 'r1', name: 'Valley View Room', description: 'Double bed with valley-facing window', price: 2800, total: 6, available: 6, maxGuests: 2, amenities: ['Valley view'] },
      { roomId: 'r2', name: 'Family Cottage Room', description: 'Two beds, ideal for small families', price: 3500, total: 3, available: 3, maxGuests: 4, amenities: ['Extra bed'] },
    ],
  }),
  propertyTemplate(1, {
    destination: 'shimla', name: 'Mistline Cottage', category: 'cottage',
    tagline: 'Stone walls, cloud mornings',
    description: 'A restored stone cottage on the old Hindustan–Tibet road with thick walls and mist that rolls in every dawn.',
    images: ['https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80'],
    location: 'Kufri Road, Shimla', rating: 4.7, reviews: 64,
    amenities: ['Fireplace', 'Library', 'Kitchen', 'Heating', 'Parking'],
    highlights: ['Pay at property', 'Quiet zone'],
    rooms: [
      { roomId: 'r1', name: 'Stone Chamber', description: 'Heritage stone room with fireplace', price: 3900, total: 5, available: 5, maxGuests: 2, amenities: ['Fireplace'] },
      { roomId: 'r2', name: 'Loft Nest', description: 'Upper loft with skylight', price: 4500, total: 2, available: 2, maxGuests: 2, amenities: ['Skylight'] },
    ],
  }),
  propertyTemplate(1, {
    destination: 'shimla', name: 'Aether Villa', category: 'villa',
    tagline: 'Private estate above the clouds',
    description: 'An entire villa for groups who want silence and space. Infinity deck and uninterrupted Himalayan light.',
    images: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80'],
    location: 'Naldehra, Shimla', rating: 5.0, reviews: 41,
    amenities: ['Private villa', 'Chef kitchen', 'Deck', 'Wi-Fi', 'Parking'],
    highlights: ['Pay at property', 'Entire villa'],
    rooms: [
      { roomId: 'r1', name: 'Master Wing', description: 'King suite with private deck', price: 7500, total: 2, available: 2, maxGuests: 2, amenities: ['Private deck'] },
      { roomId: 'r2', name: 'Garden Wing', description: 'Twin rooms opening to lawn', price: 6200, total: 3, available: 3, maxGuests: 3, amenities: ['Garden access'] },
    ],
  }),
  propertyTemplate(2, {
    destination: 'shimla', name: 'Canopy Glamp', category: 'glamping',
    tagline: 'Canvas under the constellations',
    description: 'Luxury tents with real beds, heated floors, and a communal fire circle under a clear Shimla sky.',
    images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=80'],
    location: 'Chaura Maidan outskirts', rating: 4.6, reviews: 93,
    amenities: ['Heated tent', 'Fire circle', 'Breakfast', 'Parking'],
    highlights: ['Pay at property', 'Stargazing'],
    rooms: [
      { roomId: 'r1', name: 'Deluxe Tent', description: 'Queen bed, heating, private porch', price: 3200, total: 12, available: 12, maxGuests: 2, amenities: ['Heating'] },
      { roomId: 'r2', name: 'Family Tent', description: 'Larger tent with extra bunks', price: 4100, total: 4, available: 4, maxGuests: 4, amenities: ['Bunks'] },
    ],
  }),
  propertyTemplate(2, {
    destination: 'shimla', name: 'Ridgewood Cabin', category: 'cabin',
    tagline: 'Minimal wood, maximal views',
    description: 'Scandinavian-inspired cabin on a quiet ridge with smart heating and a soaking tub.',
    images: ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200&q=80'],
    location: 'Summer Hill, Shimla', rating: 4.85, reviews: 57,
    amenities: ['Soaking tub', 'Smart heating', 'Kitchen', 'Wi-Fi', 'Parking'],
    highlights: ['Pay at property', 'Design cabin'],
    rooms: [
      { roomId: 'r1', name: 'Ridge Loft', description: 'Open loft with panoramic glass', price: 5100, total: 3, available: 3, maxGuests: 2, amenities: ['Panoramic glass'] },
      { roomId: 'r2', name: 'Studio Cabin', description: 'Compact studio with kitchenette', price: 3800, total: 5, available: 5, maxGuests: 2, amenities: ['Kitchenette'] },
    ],
  }),
];

export async function seedStayData() {
  const destCount = await StayDestination.countDocuments();
  if (destCount === 0) {
    await StayDestination.insertMany(DESTINATIONS);
    console.log('✅ Stay destinations seeded');
  }

  const catCount = await StayCategory.countDocuments();
  if (catCount === 0) {
    await StayCategory.insertMany(CATEGORIES);
    console.log('✅ Stay categories seeded');
  }

  let owners = await StayOwner.find().sort({ createdAt: 1 });
  if (owners.length === 0) {
    owners = await StayOwner.insertMany(OWNERS);
    console.log('✅ Stay owners seeded');
  }

  const propCount = await StayProperty.countDocuments();
  if (propCount === 0) {
    const docs = PROPERTIES.map((p) => {
      const { ownerIdx, ...rest } = p;
      return { ...rest, ownerId: owners[ownerIdx]._id, active: true };
    });
    await StayProperty.insertMany(docs);
    console.log('✅ Stay properties seeded');
  }
}
