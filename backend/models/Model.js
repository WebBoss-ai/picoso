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
  email: { type: String, default: '' },
  location: {
    city: String,
    area: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  savedAddresses: [savedAddressSchema],
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
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
    enum: ['pf-meals', 'pf-snacks', 'pf-desserts', 'pf-beverages'],
    default: 'pf-meals'
  },
  isVeg: { type: Boolean, default: true },
  isBestseller: { type: Boolean, default: false },
  isChefSpecial: { type: Boolean, default: false },
  tags: [{ type: String }]
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
  deliveryFee: { type: Number, default: 0 },
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
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
  monthlyFee: { type: Number, default: 99 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  upiRef: { type: String, default: '' },
  autoRenew: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const OTP = mongoose.model('OTP', otpSchema);
export const Bowl = mongoose.model('Bowl', bowlSchema);
export const Ingredient = mongoose.model('Ingredient', ingredientSchema);
export const Order = mongoose.model('Order', orderSchema);
export const Feedback = mongoose.model('Feedback', feedbackSchema);
export const PlatinumCard = mongoose.model('PlatinumCard', platinumCardSchema);
