import mongoose from 'mongoose';

const savedAddressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  fullAddress: { type: String, required: true },
  area: String,
  city: String,
  landmark: String,
  lat: Number,
  lng: Number,
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  email: { type: String, default: null },
  location: {
    city: String,
    area: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  savedAddresses: [savedAddressSchema],
  role:          { type: String, enum: ['user', 'admin'], default: 'user' },
  lastLoginAt:   { type: Date },
  lastActiveAt:  { type: Date },
  cartSnapshot:  { type: mongoose.Schema.Types.Mixed, default: null },
  referredByAgent:  { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
  referredAt:       { type: Date, default: null },
  giftEligible:     { type: Boolean, default: false },
  giftRedeemed:     { type: Boolean, default: false },
  createdAt:     { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false }
});

const bowlSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  howItsMade: { type: String },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  ingredients: [{ type: String }],
  price: { type: Number, required: true },
  image: { type: String, required: true },
  available: { type: Boolean, default: true },
  category: { type: String, default: 'signature' },
  pfCategory: {
    type: String,
    enum: ['pf-beverages', 'pf-meals', 'pf-wraps', 'pf-sandwiches', 'pf-salads'],
    default: 'pf-meals'
  },
  isVeg: { type: Boolean, default: true },
  isBestseller: { type: Boolean, default: false },
  isChefSpecial: { type: Boolean, default: false },
  tags: [{ type: String }],
  availableFrom: { type: String, default: '' },  // "09:00" IST
  availableTo:   { type: String, default: '' },  // "21:00" IST — empty = always available
  sortOrder: { type: Number, default: 0 }
});

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  price: { type: Number, required: true },
  image: { type: String },
  available: { type: Boolean, default: true },
  category: { type: String, default: 'base' }
});

const agentSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  phone:         { type: String, required: true, unique: true },
  agentCode:     { type: String, required: true, unique: true },
  wallet:        { type: Number, default: 0 },
  isActive:      { type: Boolean, default: true },
  totalScans:    { type: Number, default: 0 },
  totalLeads:    { type: Number, default: 0 },
  totalOrders:   { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now }
});

const agentScanSchema = new mongoose.Schema({
  agentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  ip:        { type: String, default: '' },
  userAgent: { type: String, default: '' },
  scannedAt: { type: Date, default: Date.now }
});

const agentLeadSchema = new mongoose.Schema({
  agentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registeredAt: { type: Date, default: Date.now }
});

const agentCommissionSchema = new mongoose.Schema({
  agentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount:    { type: Number, default: 20 },
  createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    type: { type: String, enum: ['bowl', 'custom'], required: true },
    bowlId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bowl' },
    name: String,
    image: String,
    customIngredients: [{
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
      quantity: Number
    }],
    quantity: { type: Number, default: 1 },
    price: Number,
    nutrition: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number
    }
  }],
  totalPrice: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 15 },
  isPlatinumOrder: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: { type: String, enum: ['upi', 'cod'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  upiRef: { type: String, default: '' },
  deliveryAddress: {
    label: String,
    fullAddress: String,
    area: String,
    city: String,
    landmark: String,
    lat: Number,
    lng: Number
  },
  customerName: String,
  phone: { type: String, required: true },
  estimatedDelivery: { type: Date },
  deliveryPartnerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },
  pickedUpAt:         { type: Date },
  deliveredAt:        { type: Date },
  referredByAgent:    { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
  agentCommissionPaid:{ type: Boolean, default: false },
  createdAt:          { type: Date, default: Date.now },
  updatedAt:          { type: Date, default: Date.now }
});

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating: { type: Number, min: 1, max: 5 },
  message: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const platinumCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  active: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
  monthlyFee: { type: Number, default: 299 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  upiRef: { type: String, default: '' },
  autoRenew: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const healthySubscriptionSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  selectedItems: [{ type: String }],
  bowlsPerWeek:  { type: Number, enum: [3, 5, 7], required: true },
  weeklyPrice:   { type: Number, required: true },
  perBowlPrice:  { type: Number, required: true },
  timeSlot:      { type: String, default: '' },
  upiRef:        { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending_payment', 'pending_approval', 'active', 'paused', 'cancelled', 'rejected'],
    default: 'pending_approval',
  },
  approvedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt:    { type: Date },
  startDate:     { type: Date },
  nextDelivery:  { type: Date },
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now },
});

const categoryConfigSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  label:       { type: String, required: true },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  active:      { type: Boolean, default: false },
  sortOrder:   { type: Number, default: 0 },
  color:       { type: String, default: '#f0fdf4' },
  createdAt:   { type: Date, default: Date.now }
});

const deliveryPartnerSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name:     { type: String, required: true },
  phone:    { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  totalDeliveries: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const OTP = mongoose.model('OTP', otpSchema);
export const Bowl = mongoose.model('Bowl', bowlSchema);
export const Ingredient = mongoose.model('Ingredient', ingredientSchema);
export const Order = mongoose.model('Order', orderSchema);
// ── Store on/off control ─────────────────────────────────────────────────────
const storeStatusSchema = new mongoose.Schema({
  isOpen:        { type: Boolean, default: true },
  closedReason:  { type: String,  default: "Due to high demand we're not accepting orders right now. We'll be back between 10 AM – 10 PM." },
  openingTime:   { type: String,  default: '10:00' },
  closingTime:   { type: String,  default: '22:00' },
  updatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt:     { type: Date, default: Date.now },
});

// ── Notify-me requests ───────────────────────────────────────────────────────
const notifyRequestSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notified:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
notifyRequestSchema.index({ phone: 1, notified: 1 });

export const Feedback = mongoose.model('Feedback', feedbackSchema);
export const PlatinumCard = mongoose.model('PlatinumCard', platinumCardSchema);
export const HealthySubscription = mongoose.model('HealthySubscription', healthySubscriptionSchema);
export const CategoryConfig = mongoose.model('CategoryConfig', categoryConfigSchema);
export const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
// ── Closed-store checkout captures ──────────────────────────────────────────
const closedCheckoutSchema = new mongoose.Schema({
  phone:    { type: String, default: '' },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items:    [{ name: String, price: Number, qty: Number }],
  total:    { type: Number, default: 0 },
  notified: { type: Boolean, default: false },  // admin marked as notified
  createdAt:{ type: Date, default: Date.now },
});

export const StoreStatus     = mongoose.model('StoreStatus',    storeStatusSchema);
export const NotifyRequest   = mongoose.model('NotifyRequest',  notifyRequestSchema);
export const ClosedCheckout  = mongoose.model('ClosedCheckout', closedCheckoutSchema);

// ── Out-of-radius interest capture (for expansion analytics) ─────────────────
const outOfRadiusSchema = new mongoose.Schema({
  phone:      { type: String, default: '' },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lat:        { type: Number },
  lng:        { type: Number },
  address:    { type: String, default: '' },
  area:       { type: String, default: '' },
  city:       { type: String, default: '' },
  distanceKm: { type: Number },
  notified:   { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now },
});
outOfRadiusSchema.index({ createdAt: -1 });
outOfRadiusSchema.index({ lat: 1, lng: 1 });

export const OutOfRadiusAttempt = mongoose.model('OutOfRadiusAttempt', outOfRadiusSchema);

export const Agent           = mongoose.model('Agent',           agentSchema);
export const AgentScan       = mongoose.model('AgentScan',       agentScanSchema);
export const AgentLead       = mongoose.model('AgentLead',       agentLeadSchema);
export const AgentCommission = mongoose.model('AgentCommission', agentCommissionSchema);

const agentSettingsSchema = new mongoose.Schema({
  displayEarningPerOrder:  { type: Number, default: 0 },
  actualCommissionPerOrder:{ type: Number, default: 20 },
  updatedAt: { type: Date, default: Date.now }
});

export const AgentSettings = mongoose.model('AgentSettings', agentSettingsSchema);
