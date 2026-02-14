import mongoose from 'mongoose';

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
  category: { type: String, default: 'signature' }
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
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending' 
  },
  deliveryAddress: {
    city: String,
    area: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  phone: { type: String, required: true },
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

export const User = mongoose.model('User', userSchema);
export const OTP = mongoose.model('OTP', otpSchema);
export const Bowl = mongoose.model('Bowl', bowlSchema);
export const Ingredient = mongoose.model('Ingredient', ingredientSchema);
export const Order = mongoose.model('Order', orderSchema);
export const Feedback = mongoose.model('Feedback', feedbackSchema);
