import jwt from 'jsonwebtoken';
import {
  User,
  PlatinumCard,
  BreakfastMenuItem,
  BreakfastSubscription,
} from '../models/Model.js';
import { ADMIN2_PIN } from '../middleware/admin2Auth.js';

/** Canonical breakfast membership menu (ps_001–ps_005). */
const DEFAULT_ITEMS = [
  {
    name: 'Berry Nut Muesli & Yogurt Bowl',
    description:
      'Creamy yogurt layered with crunchy muesli, toasted nuts, seeds, and juicy pomegranate for a refreshing, satisfying breakfast.',
    tag: 'Healthy Breakfast',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_001.png',
    calories: 420,
    protein: 21,
    carbs: 55,
    fats: 16,
    isVeg: true,
    available: true,
    sortOrder: 6,
  },
  {
    name: 'Smoky Chipotle Paneer & Corn Bowl',
    description:
      "Grilled chipotle paneer with sweet corn and crisp garden vegetables, finished with Picoso's signature creamy dips for a smoky, protein-packed bowl.",
    tag: 'High Protein',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_002.png',
    calories: 390,
    protein: 24,
    carbs: 48,
    fats: 14,
    isVeg: true,
    available: true,
    sortOrder: 7,
  },
  {
    name: 'Chocolate Banana Overnight Oats',
    description:
      'Rich chocolate overnight oats topped with fresh banana, crunchy almonds, and mixed seeds for a naturally indulgent and energizing breakfast.',
    tag: 'Chocolate Breakfast',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_003.png',
    calories: 450,
    protein: 23,
    carbs: 58,
    fats: 16,
    isVeg: true,
    available: true,
    sortOrder: 8,
  },
  {
    name: 'Creamy Spinach & Corn Grilled Sandwich',
    description:
      'Golden-grilled sandwich filled with a creamy spinach and sweet corn melt for a hearty, comforting and satisfying bite.',
    tag: 'High Protein',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_004.png',
    calories: 410,
    protein: 28,
    carbs: 42,
    fats: 15,
    isVeg: true,
    available: true,
    sortOrder: 9,
  },
  {
    name: 'Banana Nut Overnight Oats',
    description:
      'Creamy overnight oats topped with fresh banana, golden toasted oats, crunchy nuts, and seeds for a wholesome, naturally sweet breakfast.',
    tag: 'Healthy Breakfast',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_005.png',
    calories: 440,
    protein: 22,
    carbs: 61,
    fats: 15,
    isVeg: true,
    available: true,
    sortOrder: 10,
  },
];

const LEGACY_DUMMY_NAMES = [
  'Garden Herb Omelette',
  'Honey Millet Porridge',
  'Avocado Multigrain Toast',
  'Spinach Paneer Parfait',
  'Berry Yoghurt Bowl',
];

/**
 * Keep the live catalog on the ps_001–ps_005 set.
 * Replaces empty DB, legacy dummy rows, or a partial catalog.
 */
async function ensureDefaultMenu() {
  const total = await BreakfastMenuItem.countDocuments();
  const hasLegacy = total > 0
    ? !!(await BreakfastMenuItem.exists({ name: { $in: LEGACY_DUMMY_NAMES } }))
    : false;
  const canonicalCount = await BreakfastMenuItem.countDocuments({
    name: { $in: DEFAULT_ITEMS.map((i) => i.name) },
  });

  if (total === 0 || hasLegacy || canonicalCount < DEFAULT_ITEMS.length) {
    await BreakfastMenuItem.deleteMany({});
    await BreakfastMenuItem.insertMany(DEFAULT_ITEMS);
  }
}

function cleanPhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-10);
}

function startDateInTwoDays() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 2);
  return d;
}

/**
 * Meal index for a calendar date from sorted menu (sortOrder).
 * Day 1 of the month → first plate, day 2 → second, … after N items the cycle restarts.
 * Everyone receives the same plate on a given calendar date.
 * e.g. 5 items: 1st→#1, 6th→#1, 9th→#4
 */
export function mealIndexForDate(date, count) {
  if (!count || count < 1) return 0;
  const d = new Date(date);
  const dayOfMonth = d.getDate();
  return ((dayOfMonth - 1) % count + count) % count;
}

/** Next `days` plates starting on startDate (inclusive). */
export function buildRotationSchedule(items, startDate, days = 5) {
  const list = Array.isArray(items) ? items : [];
  const count = list.length;
  const schedule = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const idx = mealIndexForDate(d, count);
    const item = count ? list[idx] : null;
    schedule.push({
      date: d,
      dayOffset: i,
      itemIndex: idx,
      item: item
        ? {
            _id: item._id,
            name: item.name,
            description: item.description,
            tag: item.tag,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            isVeg: item.isVeg,
            image: item.image || '',
          }
        : null,
    });
  }
  return schedule;
}

const VALID_SLOTS = [
  '08:00-08:30',
  '08:30-09:00',
  '09:00-09:30',
  '09:30-10:00',
  '10:00-10:30',
  '10:30-11:00',
];

// Picoso kitchen pin (same as rest of app)
const STORE_LAT = 28.437099;
const STORE_LNG = 77.072771;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseLocation(body) {
  const lat = Number(body?.lat ?? body?.location?.lat);
  const lng = Number(body?.lng ?? body?.location?.lng);
  const accuracy = body?.accuracy != null
    ? Number(body.accuracy)
    : (body?.location?.accuracy != null ? Number(body.location.accuracy) : null);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const distanceFromStoreKm = haversineKm(STORE_LAT, STORE_LNG, lat, lng);
  return {
    location: {
      lat,
      lng,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
    },
    distanceFromStoreKm: Math.round(distanceFromStoreKm * 1000) / 1000,
  };
}

// ── Public ───────────────────────────────────────────────────────────────────

export const verifyAdmin2Pin = async (req, res) => {
  res.json({ success: true });
};

export const getBreakfastMenu = async (req, res) => {
  try {
    await ensureDefaultMenu();
    const items = await BreakfastMenuItem.find({ available: true }).sort({ sortOrder: 1, createdAt: 1 });
    const startDate = startDateInTwoDays();
    const planDays = 5;
    const schedule = buildRotationSchedule(items, startDate, planDays);

    res.json({
      success: true,
      items,
      schedule,
      pricing: { weeklyPrice: 1150, daysPerWeek: planDays, perDay: 230 },
      earliestStart: startDate,
      timeSlots: VALID_SLOTS,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Capture breakfast membership interest, create/login user, return token.
 */
export const expressBreakfastInterest = async (req, res) => {
  try {
    const { phone, timeSlot, name = '' } = req.body;
    const clean = cleanPhone(phone);

    if (!clean || clean.length !== 10) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }
    if (!timeSlot || !VALID_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ error: 'Please select a valid delivery window' });
    }

    const parsedLocation = parseLocation(req.body);
    if (!parsedLocation) {
      return res.status(400).json({ error: 'Location is required to continue' });
    }

    const dummyEmail = `${clean}@picoso.in`;
    let user = await User.findOne({ phone: clean });

    if (!user) {
      user = await User.create({
        phone: clean,
        name: name || '',
        email: dummyEmail,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        location: {
          coordinates: {
            lat: parsedLocation.location.lat,
            lng: parsedLocation.location.lng,
          },
        },
      });
    } else {
      const updates = {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        location: {
          ...(user.location?.toObject?.() || user.location || {}),
          coordinates: {
            lat: parsedLocation.location.lat,
            lng: parsedLocation.location.lng,
          },
        },
      };
      if (name && !user.name) updates.name = name;
      if (!user.email) updates.email = dummyEmail;
      await User.findByIdAndUpdate(user._id, updates);
      user = await User.findById(user._id);
    }

    const startDate = startDateInTwoDays();

    const subscription = await BreakfastSubscription.create({
      userId: user._id,
      phone: clean,
      name: name || user.name || '',
      timeSlot,
      startDate,
      weeklyPrice: 1150,
      daysPerWeek: 5,
      location: parsedLocation.location,
      distanceFromStoreKm: parsedLocation.distanceFromStoreKm,
      status: 'interested',
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const platinum = await PlatinumCard.findOne({ userId: user._id, active: true });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        isPlatinum: !!platinum,
      },
      subscription: {
        id: subscription._id,
        timeSlot: subscription.timeSlot,
        startDate: subscription.startDate,
        weeklyPrice: subscription.weeklyPrice,
        status: subscription.status,
      },
      message: "We've noted your interest and we'll get to you very soon!",
    });
  } catch (e) {
    console.error('expressBreakfastInterest ERROR:', e);
    res.status(500).json({ error: e.message });
  }
};

// ── Admin2 ───────────────────────────────────────────────────────────────────

export const admin2GetStats = async (req, res) => {
  try {
    const [total, interested, contacted, active, paused, cancelled, rejected, menuCount] =
      await Promise.all([
        BreakfastSubscription.countDocuments(),
        BreakfastSubscription.countDocuments({ status: 'interested' }),
        BreakfastSubscription.countDocuments({ status: 'contacted' }),
        BreakfastSubscription.countDocuments({ status: 'active' }),
        BreakfastSubscription.countDocuments({ status: 'paused' }),
        BreakfastSubscription.countDocuments({ status: 'cancelled' }),
        BreakfastSubscription.countDocuments({ status: 'rejected' }),
        BreakfastMenuItem.countDocuments(),
      ]);

    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const recent = await BreakfastSubscription.find({ createdAt: { $gte: since } })
      .select('createdAt status weeklyPrice')
      .lean();

    const dayMap = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { date: key, leads: 0, revenuePotential: 0 };
    }
    for (const row of recent) {
      const key = new Date(row.createdAt).toISOString().slice(0, 10);
      if (dayMap[key]) {
        dayMap[key].leads += 1;
        dayMap[key].revenuePotential += row.weeklyPrice || 1150;
      }
    }

    const slotAgg = await BreakfastSubscription.aggregate([
      { $group: { _id: '$timeSlot', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const potentialWeeklyRevenue = active * 1150;

    res.json({
      success: true,
      stats: {
        total,
        interested,
        contacted,
        active,
        paused,
        cancelled,
        rejected,
        menuCount,
        potentialWeeklyRevenue,
        conversionRate: total ? Math.round((active / total) * 100) : 0,
      },
      timeline: Object.values(dayMap),
      slotDistribution: slotAgg.map((s) => ({ slot: s._id, count: s.count })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const admin2GetLeads = async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (q) {
      filter.$or = [
        { phone: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }
    const leads = await BreakfastSubscription.find(filter)
      .populate('userId', 'phone name email createdAt')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json({ success: true, leads });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const admin2UpdateLead = async (req, res) => {
  try {
    const { status, notes, name, timeSlot } = req.body;
    const update = { updatedAt: new Date() };
    if (status) {
      update.status = status;
      if (status === 'contacted') update.contactedAt = new Date();
      if (status === 'active') update.activatedAt = new Date();
    }
    if (notes !== undefined) update.notes = notes;
    if (name !== undefined) update.name = name;
    if (timeSlot !== undefined) {
      if (!VALID_SLOTS.includes(timeSlot)) {
        return res.status(400).json({ error: 'Invalid time slot' });
      }
      update.timeSlot = timeSlot;
    }

    const lead = await BreakfastSubscription.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('userId', 'phone name email');
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const admin2DeleteLead = async (req, res) => {
  try {
    const lead = await BreakfastSubscription.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const admin2GetMenu = async (req, res) => {
  try {
    await ensureDefaultMenu();
    const items = await BreakfastMenuItem.find().sort({ sortOrder: 1, createdAt: 1 });
    const available = items.filter((i) => i.available);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = startDateInTwoDays();
    res.json({
      success: true,
      items,
      rotationPreview: {
        todayIndex: mealIndexForDate(today, available.length),
        startDate,
        startIndex: mealIndexForDate(startDate, available.length),
        schedule: buildRotationSchedule(available, startDate, 5),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const admin2CreateMenuItem = async (req, res) => {
  try {
    const {
      name, description, tag, calories, protein, carbs, fats,
      isVeg, image, available, sortOrder,
    } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const item = await BreakfastMenuItem.create({
      name: name.trim(),
      description: description || '',
      tag: tag || '',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      isVeg: isVeg !== false,
      image: image || '',
      available: available !== false,
      sortOrder: Number(sortOrder) || 0,
    });
    res.json({ success: true, item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const admin2UpdateMenuItem = async (req, res) => {
  try {
    const allowed = [
      'name', 'description', 'tag', 'calories', 'protein', 'carbs', 'fats',
      'isVeg', 'image', 'available', 'sortOrder',
    ];
    const update = { updatedAt: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const item = await BreakfastMenuItem.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true, item });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const admin2DeleteMenuItem = async (req, res) => {
  try {
    const item = await BreakfastMenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export { VALID_SLOTS, ADMIN2_PIN };
