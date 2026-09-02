import crypto from 'crypto';
import {
  StayOwner,
  StayProperty,
  StayCategory,
  StayBooking,
  StayInvoice,
  StayDestination,
} from '../models/stayModels.js';
import {
  COMMISSION_RATE,
  serializeDoc,
  populateBookingDetails,
  performCheckIn,
} from '../services/stayService.js';

export const verifyPin = async (req, res) => {
  res.json({ success: true });
};

export const getStats = async (req, res) => {
  try {
    const [properties, owners, bookings, invoices] = await Promise.all([
      StayProperty.countDocuments(),
      StayOwner.countDocuments({ active: true }),
      StayBooking.countDocuments(),
      StayInvoice.find(),
    ]);

    const guestPhones = await StayBooking.distinct('phone');
    res.json({
      properties,
      owners,
      guests: guestPhones.length,
      bookings,
      checkedIn: await StayBooking.countDocuments({ status: 'checked_in' }),
      conversions: invoices.length,
      revenue: invoices.reduce((s, i) => s + i.amount, 0),
      picosoShare: invoices.reduce((s, i) => s + i.picosoShare, 0),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getProperties = async (req, res) => {
  try {
    const properties = await StayProperty.find().populate('ownerId', 'name phone').sort({ createdAt: -1 });
    res.json(properties.map(serializeDoc));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const createProperty = async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.ownerId || !data.destination) {
      return res.status(400).json({ error: 'Name, owner and destination required' });
    }
    const property = await StayProperty.create({
      ...data,
      rooms: data.rooms?.length ? data.rooms : [{
        roomId: 'r1', name: 'Standard', description: '', price: 3000, total: 5, available: 5, maxGuests: 2, amenities: [],
      }],
      active: data.active !== false,
    });
    res.status(201).json({ success: true, property: serializeDoc(property) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateProperty = async (req, res) => {
  try {
    const property = await StayProperty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json({ success: true, property: serializeDoc(property) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    await StayProperty.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getOwners = async (req, res) => {
  try {
    const owners = await StayOwner.find().sort({ createdAt: -1 });
    const result = await Promise.all(
      owners.map(async (o) => {
        const count = await StayProperty.countDocuments({ ownerId: o._id });
        return { ...serializeDoc(o), propertyCount: count };
      })
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const createOwner = async (req, res) => {
  try {
    const { name, phone, pin } = req.body;
    if (!name?.trim() || !phone || !/^\d{6}$/.test(String(pin))) {
      return res.status(400).json({ error: 'Name, phone and 6-digit PIN required' });
    }
    const owner = await StayOwner.create({ name: name.trim(), phone, pin: String(pin) });
    res.status(201).json({ success: true, owner: serializeDoc(owner) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateOwner = async (req, res) => {
  try {
    const owner = await StayOwner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!owner) return res.status(404).json({ error: 'Owner not found' });
    res.json({ success: true, owner: serializeDoc(owner) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteOwner = async (req, res) => {
  try {
    await StayOwner.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const regenerateOwnerPin = async (req, res) => {
  try {
    const pin = String(crypto.randomInt(100000, 999999));
    const owner = await StayOwner.findByIdAndUpdate(req.params.id, { pin }, { new: true });
    if (!owner) return res.status(404).json({ error: 'Owner not found' });
    res.json({ success: true, owner: serializeDoc(owner) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getGuests = async (req, res) => {
  try {
    const bookings = await StayBooking.find().sort({ createdAt: -1 });
    const map = new Map();
    for (const b of bookings) {
      if (!map.has(b.phone)) {
        map.set(b.phone, {
          phone: b.phone,
          name: b.guestName,
          bookings: 0,
          lastBookingAt: b.createdAt,
        });
      }
      const g = map.get(b.phone);
      g.bookings += 1;
      if (b.createdAt > g.lastBookingAt) {
        g.lastBookingAt = b.createdAt;
        g.name = b.guestName;
      }
    }
    const guests = [...map.values()].sort((a, b) => b.lastBookingAt - a.lastBookingAt);
    res.json(guests);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getBookings = async (req, res) => {
  try {
    const bookings = await StayBooking.find().sort({ createdAt: -1 });
    const detailed = await populateBookingDetails(bookings);
    res.json(detailed.filter(Boolean));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await StayInvoice.find().sort({ createdAt: -1 });
    const result = await Promise.all(
      invoices.map(async (inv) => {
        const booking = await StayBooking.findById(inv.bookingId);
        return {
          ...serializeDoc(inv),
          booking: booking ? serializeDoc(booking) : null,
        };
      })
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const cats = await StayCategory.find().sort({ name: 1 });
    res.json(cats.map((c) => ({ ...serializeDoc(c), id: c.slug })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateCategories = async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) return res.status(400).json({ error: 'categories array required' });

    await StayCategory.deleteMany({});
    const docs = categories.map((c) => ({
      slug: c.slug || c.id,
      name: c.name,
      icon: c.icon || 'home',
    }));
    await StayCategory.insertMany(docs);
    res.json({ success: true, categories: docs.map((c) => ({ ...c, id: c.slug })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const checkInWithOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const result = await performCheckIn(otp, 'admin');
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getDestinations = async (req, res) => {
  try {
    const destinations = await StayDestination.find().sort({ name: 1 });
    res.json(destinations.map((d) => ({ ...serializeDoc(d), id: d.slug })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export { COMMISSION_RATE };
