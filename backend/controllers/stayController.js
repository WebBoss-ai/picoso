import {
  StayDestination,
  StayCategory,
  StayProperty,
  StayBooking,
} from '../models/stayModels.js';
import { User } from '../models/Model.js';
import {
  nightsBetween,
  generateCheckInOtp,
  serializeDoc,
  populateBookingDetails,
  performCheckIn,
} from '../services/stayService.js';

export const getDestinations = async (req, res) => {
  try {
    const destinations = await StayDestination.find().sort({ available: -1, name: 1 }).lean();
    const result = await Promise.all(
      destinations.map(async (d) => {
        const stays = d.available
          ? await StayProperty.countDocuments({ destination: d.slug, active: true })
          : 0;
        return { ...d, id: d.slug, stays };
      })
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const cats = await StayCategory.find().sort({ name: 1 }).lean();
    res.json(cats.map((c) => ({ ...c, id: c.slug })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getPropertiesByDestination = async (req, res) => {
  try {
    const { slug } = req.params;
    const properties = await StayProperty.find({ destination: slug, active: true }).sort({ rating: -1 });
    res.json(properties.map(serializeDoc));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getProperty = async (req, res) => {
  try {
    const property = await StayProperty.findById(req.params.id);
    if (!property || !property.active) return res.status(404).json({ error: 'Property not found' });
    res.json(serializeDoc(property));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const {
      propertyId, roomId, checkIn, checkOut,
      roomsCount = 1, guests = 2, guestName, guestEmail = '',
    } = req.body;

    if (!propertyId || !roomId || !checkIn || !checkOut || !guestName?.trim()) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    const property = await StayProperty.findById(propertyId);
    if (!property || !property.active) return res.status(404).json({ error: 'Property not found' });

    const room = property.rooms.find((r) => r.roomId === roomId);
    if (!room) return res.status(400).json({ error: 'Room type not found' });

    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) return res.status(400).json({ error: 'Check-out must be after check-in' });
    if (roomsCount > room.available) {
      return res.status(400).json({ error: `Only ${room.available} rooms available` });
    }

    const amount = room.price * nights * roomsCount;
    const checkInOtp = generateCheckInOtp();

    const booking = await StayBooking.create({
      userId: req.user._id,
      phone: req.user.phone,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      propertyId: property._id,
      propertyName: property.name,
      roomId: room.roomId,
      roomName: room.name,
      roomPrice: room.price,
      checkIn,
      checkOut,
      roomsCount,
      guests,
      nights,
      amount,
      payAtProperty: true,
      status: 'confirmed',
      checkInOtp,
    });

    // decrement availability
    await StayProperty.updateOne(
      { _id: property._id, 'rooms.roomId': roomId },
      { $inc: { 'rooms.$.available': -roomsCount } }
    );

    const [detailed] = await populateBookingDetails(booking);
    res.status(201).json({ success: true, booking: detailed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await StayBooking.find({ phone: req.user.phone }).sort({ createdAt: -1 });
    const detailed = await populateBookingDetails(bookings);
    res.json(detailed.filter(Boolean));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getMyBooking = async (req, res) => {
  try {
    const booking = await StayBooking.findOne({ _id: req.params.id, phone: req.user.phone });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const [detailed] = await populateBookingDetails(booking);
    res.json(detailed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const bookings = await StayBooking.find({ phone: req.user.phone }).sort({ createdAt: -1 });
    const detailed = await populateBookingDetails(bookings);
    res.json({
      user: {
        id: String(req.user._id),
        phone: req.user.phone,
        name: req.user.name || '',
        email: req.user.email || '',
      },
      bookings: detailed.filter(Boolean),
      stats: {
        total: bookings.length,
        upcoming: bookings.filter((b) => b.status === 'confirmed').length,
        checkedIn: bookings.filter((b) => b.status === 'checked_in').length,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({
      success: true,
      user: {
        id: String(user._id),
        phone: user.phone,
        name: user.name,
        email: user.email,
      },
    });
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
