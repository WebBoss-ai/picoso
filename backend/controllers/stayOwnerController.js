import {
  StayProperty,
  StayBooking,
  StayInvoice,
} from '../models/stayModels.js';
import {
  COMMISSION_RATE,
  serializeDoc,
  populateBookingDetails,
  performCheckIn,
} from '../services/stayService.js';

export const verifyPin = async (req, res) => {
  res.json({
    success: true,
    owner: {
      id: String(req.stayOwner._id),
      name: req.stayOwner.name,
      phone: req.stayOwner.phone,
    },
  });
};

export const getStats = async (req, res) => {
  try {
    const ownerId = req.stayOwner._id;
    const properties = await StayProperty.find({ ownerId });
    const propIds = properties.map((p) => p._id);

    const [bookings, invoices] = await Promise.all([
      StayBooking.find({ propertyId: { $in: propIds } }),
      StayInvoice.find({ ownerId }),
    ]);

    res.json({
      properties: properties.length,
      bookings: bookings.length,
      upcoming: bookings.filter((b) => b.status === 'confirmed').length,
      checkedIn: bookings.filter((b) => b.status === 'checked_in').length,
      earnings: invoices.reduce((s, i) => s + i.ownerShare, 0),
      picoso: invoices.reduce((s, i) => s + i.picosoShare, 0),
      commissionRate: COMMISSION_RATE,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getMyProperties = async (req, res) => {
  try {
    const properties = await StayProperty.find({ ownerId: req.stayOwner._id }).sort({ name: 1 });
    res.json(properties.map(serializeDoc));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateProperty = async (req, res) => {
  try {
    const property = await StayProperty.findOne({
      _id: req.params.id,
      ownerId: req.stayOwner._id,
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const { rooms, name, tagline, description, amenities, highlights, active } = req.body;
    if (rooms !== undefined) property.rooms = rooms;
    if (name !== undefined) property.name = name;
    if (tagline !== undefined) property.tagline = tagline;
    if (description !== undefined) property.description = description;
    if (amenities !== undefined) property.amenities = amenities;
    if (highlights !== undefined) property.highlights = highlights;
    if (active !== undefined) property.active = active;

    await property.save();
    res.json({ success: true, property: serializeDoc(property) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getBookings = async (req, res) => {
  try {
    const properties = await StayProperty.find({ ownerId: req.stayOwner._id }).select('_id');
    const propIds = properties.map((p) => p._id);
    const bookings = await StayBooking.find({ propertyId: { $in: propIds } }).sort({ createdAt: -1 });
    const detailed = await populateBookingDetails(bookings);
    res.json(detailed.filter(Boolean));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await StayInvoice.find({ ownerId: req.stayOwner._id }).sort({ createdAt: -1 });
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

export const checkInWithOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const result = await performCheckIn(otp, 'owner', req.stayOwner._id);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export { COMMISSION_RATE };
