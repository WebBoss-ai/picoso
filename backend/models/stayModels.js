import mongoose from 'mongoose';

const stayRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  available: { type: Number, required: true },
  maxGuests: { type: Number, default: 2 },
  amenities: [{ type: String }],
}, { _id: false });

const stayDestinationSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  tagline: { type: String, default: '' },
  image: { type: String, default: '' },
  available: { type: Boolean, default: false },
}, { timestamps: true });

const stayCategorySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, default: 'home' },
}, { timestamps: true });

const stayOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  pin: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

stayOwnerSchema.index({ pin: 1 });

const stayPropertySchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'StayOwner', required: true },
  destination: { type: String, required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  tagline: { type: String, default: '' },
  description: { type: String, default: '' },
  images: [{ type: String }],
  location: { type: String, default: '' },
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  amenities: [{ type: String }],
  highlights: [{ type: String }],
  rooms: [stayRoomSchema],
  active: { type: Boolean, default: true },
}, { timestamps: true });

stayPropertySchema.index({ destination: 1, active: 1 });
stayPropertySchema.index({ ownerId: 1 });

const stayBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  phone: { type: String, required: true, index: true },
  guestName: { type: String, required: true },
  guestEmail: { type: String, default: '' },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'StayProperty', required: true },
  propertyName: { type: String, required: true },
  roomId: { type: String, required: true },
  roomName: { type: String, required: true },
  roomPrice: { type: Number, required: true },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  roomsCount: { type: Number, default: 1 },
  guests: { type: Number, default: 2 },
  nights: { type: Number, required: true },
  amount: { type: Number, required: true },
  payAtProperty: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['confirmed', 'checked_in', 'cancelled'],
    default: 'confirmed',
    index: true,
  },
  checkInOtp: { type: String, required: true, index: true },
  checkedInAt: { type: Date, default: null },
}, { timestamps: true });

stayBookingSchema.index({ propertyId: 1, status: 1 });

const stayInvoiceSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'StayBooking', required: true, unique: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'StayProperty', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'StayOwner', required: true },
  propertyName: { type: String, required: true },
  guestName: { type: String, required: true },
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  commissionRate: { type: Number, default: 0.1 },
  picosoShare: { type: Number, required: true },
  ownerShare: { type: Number, required: true },
  actor: { type: String, enum: ['owner', 'admin'], default: 'owner' },
}, { timestamps: true });

export const StayDestination = mongoose.model('StayDestination', stayDestinationSchema);
export const StayCategory = mongoose.model('StayCategory', stayCategorySchema);
export const StayOwner = mongoose.model('StayOwner', stayOwnerSchema);
export const StayProperty = mongoose.model('StayProperty', stayPropertySchema);
export const StayBooking = mongoose.model('StayBooking', stayBookingSchema);
export const StayInvoice = mongoose.model('StayInvoice', stayInvoiceSchema);
