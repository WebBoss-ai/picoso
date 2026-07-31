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

// ── Notify-me requests (bounty / free coffee waitlist) ────────────────────────
const notifyRequestSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  notified:  { type: Boolean, default: false },
  // Location pin captured at signup
  lat:       { type: Number, default: null },
  lng:       { type: Number, default: null },
  address:   { type: String, default: '' },
  area:      { type: String, default: '' },
  city:      { type: String, default: '' },
  pincode:   { type: String, default: '' },
  source:    { type: String, default: 'closed_store' },
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

// ── Marketing Campaigns ───────────────────────────────────────────────────────
const campaignSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true },
  name:          { type: String, required: true },
  description:   { type: String, default: '' },
  benefit:       { type: String, default: 'free_coffee' },
  freeItemLabel: { type: String, default: 'Free Coffee' },
  freeItemValue: { type: Number, default: 79 },
  totalBudget:   { type: Number, default: 5 },
  redeemedCount: { type: Number, default: 0 },
  active:        { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now },
});

const campaignScanSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  ip:         { type: String, default: '' },
  userAgent:  { type: String, default: '' },
  scannedAt:  { type: Date, default: Date.now },
});

const campaignLeadSchema = new mongoose.Schema({
  campaignId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phone:           { type: String, default: '' },
  coffeesGiven:    { type: Number, default: 0 },
  maxCoffees:      { type: Number, default: 5 },
  registeredAt:    { type: Date, default: Date.now },
});

const campaignRedemptionSchema = new mongoose.Schema({
  campaignId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  phone:          { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  redeemedAt:     { type: Date, default: Date.now },
});

export const Campaign            = mongoose.model('Campaign',            campaignSchema);
export const CampaignScan        = mongoose.model('CampaignScan',        campaignScanSchema);
export const CampaignLead        = mongoose.model('CampaignLead',        campaignLeadSchema);

// ── Friend Referral System ────────────────────────────────────────────────────
const friendReferralSchema = new mongoose.Schema({
  code:             { type: String, required: true, unique: true },   // 6 chars e.g. KIS492
  referrerName:     { type: String, required: true },
  referrerPhone:    { type: String, required: true },
  referrerGender:   { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  referrerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:           { type: String, enum: ['active', 'paused', 'expired'], default: 'active' },
  // Per-referral reward override (null = use global settings)
  rewardBowlId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Bowl', default: null },
  rewardLabel:      { type: String, default: '' },
  // Each friend who joined via this link
  referredFriends:  [{
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:           { type: String, default: '' },
    phone:          { type: String, default: '' },
    joinedAt:       { type: Date, default: Date.now },
    firstOrderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    firstOrderAt:   { type: Date, default: null },
    firstOrderItem: { type: String, default: '' },   // exact item name
    rewardEarned:   { type: Boolean, default: false },
    rewardEarnedAt: { type: Date, default: null },
    rewardGivenToReferrer: { type: Boolean, default: false },
  }],
  totalJoined:      { type: Number, default: 0 },
  totalOrdered:     { type: Number, default: 0 },
  totalRewardsEarned: { type: Number, default: 0 },
  createdAt:        { type: Date, default: Date.now },
});
friendReferralSchema.index({ code: 1 });
friendReferralSchema.index({ referrerPhone: 1 });
friendReferralSchema.index({ referrerId: 1 });

const friendReferralRequestSchema = new mongoose.Schema({
  phone:       { type: String, required: true },
  name:        { type: String, default: '' },
  gender:      { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  referralId:  { type: mongoose.Schema.Types.ObjectId, ref: 'FriendReferral', default: null },
  referralCode:{ type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
});

const referralSettingsSchema = new mongoose.Schema({
  rewardBowlId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Bowl', default: null },
  rewardLabel:    { type: String, default: 'Free Wrap' },
  rewardNote:     { type: String, default: 'Your friend earned you a free item!' },
  updatedAt:      { type: Date, default: Date.now },
});

export const FriendReferral        = mongoose.model('FriendReferral',        friendReferralSchema);
export const FriendReferralRequest = mongoose.model('FriendReferralRequest', friendReferralRequestSchema);
export const ReferralSettings      = mongoose.model('ReferralSettings',      referralSettingsSchema);
export const CampaignRedemption  = mongoose.model('CampaignRedemption',  campaignRedemptionSchema);

// ── WhatsApp Marketing ────────────────────────────────────────────────────────
// Welcome message config — auto-sent on new user registration.
const welcomeConfigSchema = new mongoose.Schema({
  key:        { type: String, default: 'default', unique: true },
  enabled:    { type: Boolean, default: true },
  // Message supports spintax {a|b|c} and tokens {{name}} {{phone}}
  message:    { type: String, default: 'Welcome to *Picoso*, {{name}}. Thoughtfully crafted bowls, wraps, and coffee, prepared fresh with care. Explore our menu anytime at *picoso.in*. We look forward to serving you.' },
  imageBase64:{ type: String, default: '' },   // raw base64 (no data: prefix)
  imageMime:  { type: String, default: 'image/png' },
  imageUrl:   { type: String, default: '' },   // alternative to base64
  delaySec:   { type: Number, default: 20 },   // small delay so it looks human
  updatedAt:  { type: Date, default: Date.now },
});

// Bulk / mass WhatsApp campaign.
const waRecipientSchema = new mongoose.Schema({
  phone:   { type: String, required: true },
  name:    { type: String, default: '' },
  chatId:  { type: String, default: '' },
  status:  { type: String, enum: ['queued', 'sent', 'failed', 'skipped', 'invalid'], default: 'queued' },
  error:   { type: String, default: '' },
  attempts:{ type: Number, default: 0 },
  sentAt:  { type: Date, default: null },
}, { _id: false });

const waCampaignSchema = new mongoose.Schema({
  name:        { type: String, default: 'Untitled Campaign' },
  message:     { type: String, default: '' },      // spintax + tokens supported
  imageBase64: { type: String, default: '' },
  imageMime:   { type: String, default: 'image/png' },
  imageUrl:    { type: String, default: '' },
  recipients:  [waRecipientSchema],
  total:       { type: Number, default: 0 },
  sentCount:   { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  skippedCount:{ type: Number, default: 0 },
  invalidCount:{ type: Number, default: 0 },
  cursor:      { type: Number, default: 0 },        // index of next recipient to process
  status:      { type: String, enum: ['draft', 'running', 'paused', 'completed', 'stopped', 'failed'], default: 'draft' },
  // Anti-ban configuration snapshot
  config: {
    minDelaySec:      { type: Number, default: 18 },
    maxDelaySec:      { type: Number, default: 55 },
    batchSize:        { type: Number, default: 20 },   // messages before a long cooldown
    batchCooldownMin: { type: Number, default: 12 },   // long pause between batches
    dailyCap:         { type: Number, default: 250 },  // hard stop per 24h
    warmup:           { type: Boolean, default: true },// ramp slowly at start
    validateNumbers:  { type: Boolean, default: true },// skip non-WhatsApp numbers
    typingSim:        { type: Boolean, default: true },// simulate typing
    activeHourStart:  { type: Number, default: 8 },    // 24h; only send within window
    activeHourEnd:    { type: Number, default: 22 },
  },
  sentToday:   { type: Number, default: 0 },
  sentTodayDate:{ type: String, default: '' },        // YYYY-MM-DD marker for daily cap
  lastError:   { type: String, default: '' },
  startedAt:   { type: Date, default: null },
  finishedAt:  { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now },
});
waCampaignSchema.index({ createdAt: -1 });

// Lightweight per-message log (welcome + single sends + campaign summary rows).
const waMessageLogSchema = new mongoose.Schema({
  type:       { type: String, enum: ['welcome', 'single', 'campaign'], default: 'single' },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'WaCampaign', default: null },
  phone:      { type: String, default: '' },
  chatId:     { type: String, default: '' },
  status:     { type: String, enum: ['sent', 'failed', 'skipped', 'invalid'], default: 'sent' },
  hasMedia:   { type: Boolean, default: false },
  error:      { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now },
});
waMessageLogSchema.index({ createdAt: -1 });
waMessageLogSchema.index({ type: 1, createdAt: -1 });

export const WelcomeConfig = mongoose.model('WelcomeConfig', welcomeConfigSchema);
export const WaCampaign    = mongoose.model('WaCampaign',    waCampaignSchema);
export const WaMessageLog  = mongoose.model('WaMessageLog',  waMessageLogSchema);
