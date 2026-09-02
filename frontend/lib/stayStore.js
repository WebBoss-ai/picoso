/**
 * Client-side stay platform store (localStorage).
 * Demo data for /stay, /stay-owner, /stay-admin until backend lands.
 */

const KEYS = {
  user: 'picoso_stay_user',
  bookings: 'picoso_stay_bookings',
  properties: 'picoso_stay_properties',
  owners: 'picoso_stay_owners',
  guests: 'picoso_stay_guests',
  invoices: 'picoso_stay_invoices',
  categories: 'picoso_stay_categories',
  adminPin: 'picoso_stay_admin_session',
  ownerSession: 'picoso_stay_owner_session',
};

const COMMISSION_RATE = 0.1;

export const DESTINATIONS = [
  {
    id: 'shimla',
    name: 'Shimla',
    tagline: 'Pine forests & colonial charm',
    available: true,
    image:
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80',
    stays: 6,
  },
  {
    id: 'manali',
    name: 'Manali',
    tagline: 'Snow peaks & apple orchards',
    available: false,
    image:
      'https://images.unsplash.com/photo-1626621341520-097a0c7a2f2f?w=1200&q=80',
    stays: 0,
  },
  {
    id: 'kasol',
    name: 'Kasol',
    tagline: 'Parvati valley hideaways',
    available: false,
    image:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    stays: 0,
  },
];

const DEFAULT_CATEGORIES = [
  { id: 'cabin', name: 'Cabin', icon: 'home' },
  { id: 'homestay', name: 'Homestay', icon: 'users' },
  { id: 'cottage', name: 'Cottage', icon: 'tree' },
  { id: 'villa', name: 'Villa', icon: 'building' },
  { id: 'glamping', name: 'Glamping', icon: 'tent' },
];

const DEFAULT_OWNERS = [
  {
    id: 'own_1',
    name: 'Rajesh Thakur',
    phone: '9876543210',
    pin: '482910',
    propertyIds: ['prop_1', 'prop_2'],
    createdAt: '2026-01-12',
  },
  {
    id: 'own_2',
    name: 'Meera Sharma',
    phone: '9876501234',
    pin: '193847',
    propertyIds: ['prop_3', 'prop_4'],
    createdAt: '2026-02-03',
  },
  {
    id: 'own_3',
    name: 'Ankit Verma',
    phone: '9811122233',
    pin: '556677',
    propertyIds: ['prop_5', 'prop_6'],
    createdAt: '2026-03-18',
  },
];

const DEFAULT_PROPERTIES = [
  {
    id: 'prop_1',
    ownerId: 'own_1',
    destination: 'shimla',
    name: 'Cedar Nest Retreat',
    category: 'cabin',
    tagline: 'Glass walls facing the deodar canopy',
    description:
      'A handcrafted cedar cabin perched above Mashobra. Floor-to-ceiling windows, a wood stove, and trails that start at your door. Built for slow mornings and starlit nights.',
    images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
    ],
    location: 'Mashobra, Shimla',
    rating: 4.9,
    reviews: 128,
    amenities: ['Fireplace', 'Mountain view', 'Kitchen', 'Wi-Fi', 'Parking', 'Heating'],
    highlights: ['Pay at property', 'Nature trail access', 'Pet friendly'],
    rooms: [
      {
        id: 'r1',
        name: 'Deluxe with Balcony',
        description: 'King bed, private balcony overlooking cedars',
        price: 4200,
        total: 10,
        available: 7,
        maxGuests: 2,
        amenities: ['Balcony', 'King bed', 'En-suite'],
      },
      {
        id: 'r2',
        name: 'Forest Suite',
        description: 'Spacious suite with sofa and work desk',
        price: 5800,
        total: 4,
        available: 2,
        maxGuests: 3,
        amenities: ['Living area', 'Desk', 'Mini bar'],
      },
    ],
    active: true,
  },
  {
    id: 'prop_2',
    ownerId: 'own_1',
    destination: 'shimla',
    name: 'Pine & Quiet Homestay',
    category: 'homestay',
    tagline: 'Family-run warmth in Chharabra',
    description:
      'Stay with a local family who know every ridge trail. Homemade pahadi meals, a sunny courtyard, and rooms that smell of pine resin after rain.',
    images: [
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80',
    ],
    location: 'Chharabra, Shimla',
    rating: 4.8,
    reviews: 86,
    amenities: ['Home meals', 'Garden', 'Wi-Fi', 'Heating', 'Parking'],
    highlights: ['Pay at property', 'Local host', 'Home-cooked food'],
    rooms: [
      {
        id: 'r1',
        name: 'Valley View Room',
        description: 'Double bed with valley-facing window',
        price: 2800,
        total: 6,
        available: 4,
        maxGuests: 2,
        amenities: ['Valley view', 'Heater'],
      },
      {
        id: 'r2',
        name: 'Family Cottage Room',
        description: 'Two beds, ideal for small families',
        price: 3500,
        total: 3,
        available: 1,
        maxGuests: 4,
        amenities: ['Extra bed', 'Shared lounge'],
      },
    ],
    active: true,
  },
  {
    id: 'prop_3',
    ownerId: 'own_2',
    destination: 'shimla',
    name: 'Mistline Cottage',
    category: 'cottage',
    tagline: 'Stone walls, cloud mornings',
    description:
      'A restored stone cottage on the old Hindustan–Tibet road. Thick walls, a reading nook, and mist that rolls in like a soft curtain every dawn.',
    images: [
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
    ],
    location: 'Kufri Road, Shimla',
    rating: 4.7,
    reviews: 64,
    amenities: ['Fireplace', 'Library', 'Kitchen', 'Heating', 'Parking'],
    highlights: ['Pay at property', 'Quiet zone', 'Reading loft'],
    rooms: [
      {
        id: 'r1',
        name: 'Stone Chamber',
        description: 'Heritage stone room with fireplace',
        price: 3900,
        total: 5,
        available: 3,
        maxGuests: 2,
        amenities: ['Fireplace', 'Heritage interiors'],
      },
      {
        id: 'r2',
        name: 'Loft Nest',
        description: 'Upper loft with skylight',
        price: 4500,
        total: 2,
        available: 2,
        maxGuests: 2,
        amenities: ['Skylight', 'Desk'],
      },
    ],
    active: true,
  },
  {
    id: 'prop_4',
    ownerId: 'own_2',
    destination: 'shimla',
    name: 'Aether Villa',
    category: 'villa',
    tagline: 'Private estate above the clouds',
    description:
      'An entire villa for groups who want silence and space. Infinity deck, chef-ready kitchen, and uninterrupted Himalayan light.',
    images: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
    ],
    location: 'Naldehra, Shimla',
    rating: 5.0,
    reviews: 41,
    amenities: ['Private villa', 'Chef kitchen', 'Deck', 'Wi-Fi', 'Parking', 'Heating'],
    highlights: ['Pay at property', 'Entire villa', 'Group friendly'],
    rooms: [
      {
        id: 'r1',
        name: 'Master Wing',
        description: 'King suite with private deck',
        price: 7500,
        total: 2,
        available: 1,
        maxGuests: 2,
        amenities: ['Private deck', 'Bathtub'],
      },
      {
        id: 'r2',
        name: 'Garden Wing',
        description: 'Twin rooms opening to lawn',
        price: 6200,
        total: 3,
        available: 2,
        maxGuests: 3,
        amenities: ['Garden access', 'Twin option'],
      },
    ],
    active: true,
  },
  {
    id: 'prop_5',
    ownerId: 'own_3',
    destination: 'shimla',
    name: 'Canopy Glamp',
    category: 'glamping',
    tagline: 'Canvas under the constellations',
    description:
      'Luxury tents with real beds, heated floors, and a communal fire circle. Wake to birdsong and sleep under a clear Shimla sky.',
    images: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=80',
      'https://images.unsplash.com/photo-1478131143081-80f7f84ac502?w=1200&q=80',
    ],
    location: 'Chaura Maidan outskirts',
    rating: 4.6,
    reviews: 93,
    amenities: ['Heated tent', 'Fire circle', 'Shared bathhouse', 'Breakfast', 'Parking'],
    highlights: ['Pay at property', 'Stargazing', 'Eco stay'],
    rooms: [
      {
        id: 'r1',
        name: 'Deluxe Tent',
        description: 'Queen bed, heating, private porch',
        price: 3200,
        total: 12,
        available: 8,
        maxGuests: 2,
        amenities: ['Heating', 'Porch'],
      },
      {
        id: 'r2',
        name: 'Family Tent',
        description: 'Larger tent with extra bunks',
        price: 4100,
        total: 4,
        available: 3,
        maxGuests: 4,
        amenities: ['Bunks', 'Heating'],
      },
    ],
    active: true,
  },
  {
    id: 'prop_6',
    ownerId: 'own_3',
    destination: 'shimla',
    name: 'Ridgewood Cabin',
    category: 'cabin',
    tagline: 'Minimal wood, maximal views',
    description:
      'Scandinavian-inspired cabin on a quiet ridge. Smart heating, a soaking tub, and a kitchen built for long weekends.',
    images: [
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
    ],
    location: 'Summer Hill, Shimla',
    rating: 4.85,
    reviews: 57,
    amenities: ['Soaking tub', 'Smart heating', 'Kitchen', 'Wi-Fi', 'Parking'],
    highlights: ['Pay at property', 'Design cabin', 'Quiet ridge'],
    rooms: [
      {
        id: 'r1',
        name: 'Ridge Loft',
        description: 'Open loft with panoramic glass',
        price: 5100,
        total: 3,
        available: 2,
        maxGuests: 2,
        amenities: ['Panoramic glass', 'Tub'],
      },
      {
        id: 'r2',
        name: 'Studio Cabin',
        description: 'Compact studio with kitchenette',
        price: 3800,
        total: 5,
        available: 4,
        maxGuests: 2,
        amenities: ['Kitchenette', 'Workspace'],
      },
    ],
    active: true,
  },
];

function read(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeeded() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(KEYS.properties)) write(KEYS.properties, DEFAULT_PROPERTIES);
  if (!localStorage.getItem(KEYS.owners)) write(KEYS.owners, DEFAULT_OWNERS);
  if (!localStorage.getItem(KEYS.categories)) write(KEYS.categories, DEFAULT_CATEGORIES);
  if (!localStorage.getItem(KEYS.bookings)) write(KEYS.bookings, []);
  if (!localStorage.getItem(KEYS.guests)) write(KEYS.guests, []);
  if (!localStorage.getItem(KEYS.invoices)) write(KEYS.invoices, []);
}

export function hashOtp(otp) {
  // Simple demo hash display (not cryptographic) — shows truncated digest
  let h = 0;
  const s = String(otp);
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  const hex = Math.abs(h).toString(16).padStart(8, '0');
  return `sha256:${hex}…${hex.slice(-4)}`;
}

export function generateOtp(digits = 4) {
  const max = 10 ** digits;
  return String(Math.floor(Math.random() * max)).padStart(digits, '0');
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function formatINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

/* ── Guest auth ─────────────────────────────────────────────── */
export function getStayUser() {
  ensureSeeded();
  return read(KEYS.user, null);
}

export function setStayUser(user) {
  write(KEYS.user, user);
  const guests = read(KEYS.guests, []);
  if (!guests.find((g) => g.phone === user.phone)) {
    guests.push({
      id: `guest_${Date.now()}`,
      phone: user.phone,
      name: user.name || '',
      createdAt: new Date().toISOString(),
      bookings: 0,
    });
    write(KEYS.guests, guests);
  }
}

export function clearStayUser() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEYS.user);
}

export function updateGuestProfile(phone, patch) {
  const guests = read(KEYS.guests, []);
  const idx = guests.findIndex((g) => g.phone === phone);
  if (idx >= 0) {
    guests[idx] = { ...guests[idx], ...patch };
    write(KEYS.guests, guests);
  }
  const user = getStayUser();
  if (user?.phone === phone) setStayUser({ ...user, ...patch });
}

/* ── Properties / categories / owners ───────────────────────── */
export function getProperties() {
  ensureSeeded();
  return read(KEYS.properties, DEFAULT_PROPERTIES);
}

export function getProperty(id) {
  return getProperties().find((p) => p.id === id) || null;
}

export function saveProperty(property) {
  const list = getProperties();
  const idx = list.findIndex((p) => p.id === property.id);
  if (idx >= 0) list[idx] = property;
  else list.push(property);
  write(KEYS.properties, list);
  return property;
}

export function deleteProperty(id) {
  write(
    KEYS.properties,
    getProperties().filter((p) => p.id !== id)
  );
}

export function getCategories() {
  ensureSeeded();
  return read(KEYS.categories, DEFAULT_CATEGORIES);
}

export function saveCategories(cats) {
  write(KEYS.categories, cats);
}

export function getOwners() {
  ensureSeeded();
  return read(KEYS.owners, DEFAULT_OWNERS);
}

export function saveOwner(owner) {
  const list = getOwners();
  const idx = list.findIndex((o) => o.id === owner.id);
  if (idx >= 0) list[idx] = owner;
  else list.push(owner);
  write(KEYS.owners, list);
  return owner;
}

export function deleteOwner(id) {
  write(
    KEYS.owners,
    getOwners().filter((o) => o.id !== id)
  );
}

export function getGuests() {
  ensureSeeded();
  return read(KEYS.guests, []);
}

/* ── Owner session ──────────────────────────────────────────── */
export function loginOwner(pin) {
  ensureSeeded();
  const owner = getOwners().find((o) => o.pin === pin);
  if (!owner) return null;
  write(KEYS.ownerSession, { ownerId: owner.id, at: Date.now() });
  return owner;
}

export function getOwnerSession() {
  ensureSeeded();
  const s = read(KEYS.ownerSession, null);
  if (!s) return null;
  return getOwners().find((o) => o.id === s.ownerId) || null;
}

export function clearOwnerSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEYS.ownerSession);
}

/* ── Admin session ──────────────────────────────────────────── */
export const STAY_ADMIN_PIN = '246810';

export function loginAdmin(pin) {
  if (pin !== STAY_ADMIN_PIN) return false;
  write(KEYS.adminPin, { ok: true, at: Date.now() });
  return true;
}

export function isAdminLoggedIn() {
  return !!read(KEYS.adminPin, null)?.ok;
}

export function clearAdminSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEYS.adminPin);
}

/* ── Bookings ───────────────────────────────────────────────── */
export function getBookings() {
  ensureSeeded();
  return read(KEYS.bookings, []);
}

export function createBooking(payload) {
  ensureSeeded();
  const property = getProperty(payload.propertyId);
  const room = property?.rooms?.find((r) => r.id === payload.roomId);
  const nights = nightsBetween(payload.checkIn, payload.checkOut);
  const amount = (room?.price || 0) * nights * (payload.roomsCount || 1);
  const checkInOtp = generateOtp(4);

  const booking = {
    id: `bk_${Date.now()}`,
    ...payload,
    propertyName: property?.name,
    roomName: room?.name,
    nights,
    amount,
    payAtProperty: true,
    status: 'confirmed',
    checkInOtp,
    checkedInAt: null,
    createdAt: new Date().toISOString(),
  };

  const bookings = getBookings();
  bookings.unshift(booking);
  write(KEYS.bookings, bookings);

  // decrement availability
  if (property && room) {
    const nextRooms = property.rooms.map((r) =>
      r.id === room.id
        ? { ...r, available: Math.max(0, r.available - (payload.roomsCount || 1)) }
        : r
    );
    saveProperty({ ...property, rooms: nextRooms });
  }

  // bump guest booking count
  const guests = getGuests();
  const gIdx = guests.findIndex((g) => g.phone === payload.phone);
  if (gIdx >= 0) {
    guests[gIdx].bookings = (guests[gIdx].bookings || 0) + 1;
    guests[gIdx].name = payload.guestName || guests[gIdx].name;
    write(KEYS.guests, guests);
  }

  return booking;
}

export function getInvoices() {
  ensureSeeded();
  return read(KEYS.invoices, []);
}

export function checkInWithOtp(otp, actor = 'owner') {
  ensureSeeded();
  const bookings = getBookings();
  const idx = bookings.findIndex(
    (b) => b.checkInOtp === otp && b.status === 'confirmed' && !b.checkedInAt
  );
  if (idx < 0) return { ok: false, error: 'Invalid or already used OTP' };

  const booking = { ...bookings[idx], status: 'checked_in', checkedInAt: new Date().toISOString() };
  bookings[idx] = booking;
  write(KEYS.bookings, bookings);

  const picosoShare = Math.round(booking.amount * COMMISSION_RATE);
  const ownerShare = booking.amount - picosoShare;
  const invoice = {
    id: `inv_${Date.now()}`,
    bookingId: booking.id,
    propertyId: booking.propertyId,
    propertyName: booking.propertyName,
    guestName: booking.guestName,
    phone: booking.phone,
    amount: booking.amount,
    commissionRate: COMMISSION_RATE,
    picosoShare,
    ownerShare,
    actor,
    createdAt: new Date().toISOString(),
  };
  const invoices = getInvoices();
  invoices.unshift(invoice);
  write(KEYS.invoices, invoices);

  return { ok: true, booking, invoice };
}

export function ownerStats(ownerId) {
  const props = getProperties().filter((p) => p.ownerId === ownerId);
  const propIds = props.map((p) => p.id);
  const bookings = getBookings().filter((b) => propIds.includes(b.propertyId));
  const invoices = getInvoices().filter((i) => propIds.includes(i.propertyId));
  const earnings = invoices.reduce((s, i) => s + i.ownerShare, 0);
  const picoso = invoices.reduce((s, i) => s + i.picosoShare, 0);
  const upcoming = bookings.filter((b) => b.status === 'confirmed').length;
  const checkedIn = bookings.filter((b) => b.status === 'checked_in').length;
  return { properties: props.length, bookings: bookings.length, upcoming, checkedIn, earnings, picoso };
}

export function adminStats() {
  const bookings = getBookings();
  const invoices = getInvoices();
  return {
    properties: getProperties().length,
    owners: getOwners().length,
    guests: getGuests().length,
    bookings: bookings.length,
    checkedIn: bookings.filter((b) => b.status === 'checked_in').length,
    revenue: invoices.reduce((s, i) => s + i.amount, 0),
    picosoShare: invoices.reduce((s, i) => s + i.picosoShare, 0),
    conversions: invoices.length,
  };
}

export { COMMISSION_RATE, KEYS };
