import {
  StayBooking,
  StayInvoice,
  StayProperty,
} from '../models/stayModels.js';

export const COMMISSION_RATE = 0.1;

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export function generateCheckInOtp() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

export function serializeDoc(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  o.id = String(o._id);
  delete o._id;
  delete o.__v;
  if (o.ownerId?._id) o.ownerId = String(o.ownerId._id);
  else if (o.ownerId) o.ownerId = String(o.ownerId);
  if (o.userId) o.userId = String(o.userId);
  if (o.propertyId?._id) {
    o.property = serializeDoc(o.propertyId);
    o.propertyId = String(o.propertyId._id);
  } else if (o.propertyId) o.propertyId = String(o.propertyId);
  if (o.bookingId) o.bookingId = String(o.bookingId);
  return o;
}

export function serializeBooking(booking, extra = {}) {
  const b = serializeDoc(booking);
  return { ...b, ...extra };
}

export async function populateBookingDetails(bookings) {
  const list = Array.isArray(bookings) ? bookings : [bookings];
  return Promise.all(
    list.map(async (b) => {
      const doc = typeof b.toObject === 'function' ? b : await StayBooking.findById(b._id || b.id);
      if (!doc) return null;
      const property = await StayProperty.findById(doc.propertyId).populate('ownerId', 'name phone');
      const invoice = await StayInvoice.findOne({ bookingId: doc._id });
      return serializeBooking(doc, {
        property: property ? serializeDoc(property) : null,
        invoice: invoice ? serializeDoc(invoice) : null,
      });
    })
  );
}

export async function performCheckIn(otp, actor = 'owner', ownerId = null) {
  const query = {
    checkInOtp: String(otp).trim(),
    status: 'confirmed',
    checkedInAt: null,
  };

  const booking = await StayBooking.findOne(query);
  if (!booking) return { ok: false, error: 'Invalid or already used OTP' };

  const property = await StayProperty.findById(booking.propertyId);
  if (!property) return { ok: false, error: 'Property not found' };

  if (ownerId && String(property.ownerId) !== String(ownerId)) {
    return { ok: false, error: 'This booking does not belong to your properties' };
  }

  const existingInvoice = await StayInvoice.findOne({ bookingId: booking._id });
  if (existingInvoice) {
    return { ok: false, error: 'Booking already checked in' };
  }

  booking.status = 'checked_in';
  booking.checkedInAt = new Date();
  await booking.save();

  const picosoShare = Math.round(booking.amount * COMMISSION_RATE);
  const ownerShare = booking.amount - picosoShare;

  const invoice = await StayInvoice.create({
    bookingId: booking._id,
    propertyId: property._id,
    ownerId: property.ownerId,
    propertyName: booking.propertyName,
    guestName: booking.guestName,
    phone: booking.phone,
    amount: booking.amount,
    commissionRate: COMMISSION_RATE,
    picosoShare,
    ownerShare,
    actor,
  });

  const [detailed] = await populateBookingDetails(booking);
  return {
    ok: true,
    booking: detailed,
    invoice: serializeDoc(invoice),
  };
}
