import jwt from 'jsonwebtoken';
import { User, OTP, Bowl, Ingredient, Order, Feedback } from '../models/Model.js';
import { generateOTP, sendOTP, verifyOTP } from '../utils/otp.js';

// Auth Controllers
export const sendOTPController = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.findOneAndDelete({ phone });
    await OTP.create({ phone, otp, expiresAt });

    await sendOTP(phone, otp);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyOTPController = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Allow default OTP
    const DEFAULT_OTP = '000000';

    let otpDoc = null;

    if (otp !== DEFAULT_OTP) {
      otpDoc = await OTP.findOne({ phone }).sort({ createdAt: -1 });

      if (!otpDoc) {
        return res.status(400).json({ error: 'OTP not found or expired' });
      }

      const verification = verifyOTP(otp, otpDoc.otp, otpDoc.expiresAt);

      if (!verification.valid) {
        return res.status(400).json({ error: verification.message });
      }
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Delete OTP only if it was not default OTP
    if (otpDoc) {
      await OTP.findByIdAndDelete(otpDoc._id);
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bowl Controllers
export const getBowls = async (req, res) => {
  try {
    const bowls = await Bowl.find({ available: true });
    res.json({ success: true, bowls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBowlById = async (req, res) => {
  try {
    const bowl = await Bowl.findById(req.params.id);
    if (!bowl) {
      return res.status(404).json({ error: 'Bowl not found' });
    }
    res.json({ success: true, bowl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Ingredient Controllers
export const getIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ available: true });
    res.json({ success: true, ingredients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Order Controllers
export const createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, totalPrice } = req.body;
    
    const order = await Order.create({
      userId: req.user._id,
      items,
      totalPrice,
      deliveryAddress,
      phone: req.user.phone
    });

    await order.populate('items.bowlId items.customIngredients.ingredientId');

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('items.bowlId items.customIngredients.ingredientId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('items.bowlId items.customIngredients.ingredientId');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// User Controllers
export const updateProfile = async (req, res) => {
  try {
    const { name, email, location } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, location },
      { new: true }
    );

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Feedback Controllers
export const createFeedback = async (req, res) => {
  try {
    const { orderId, rating, message } = req.body;
    
    const feedback = await Feedback.create({
      userId: req.user._id,
      orderId,
      rating,
      message
    });

    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Controllers
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId items.bowlId items.customIngredients.ingredientId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createBowl = async (req, res) => {
  try {
    const bowlData = req.body;
    if (req.file) {
      bowlData.image = req.file.location;
    }
    
    const bowl = await Bowl.create(bowlData);
    res.json({ success: true, bowl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBowl = async (req, res) => {
  try {
    const updateData = req.body;
    if (req.file) {
      updateData.image = req.file.location;
    }
    
    const bowl = await Bowl.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, bowl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBowl = async (req, res) => {
  try {
    await Bowl.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bowl deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createIngredient = async (req, res) => {
  try {
    const ingredientData = req.body;
    if (req.file) {
      ingredientData.image = req.file.location;
    }
    
    const ingredient = await Ingredient.create(ingredientData);
    res.json({ success: true, ingredient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateIngredient = async (req, res) => {
  try {
    const updateData = req.body;
    if (req.file) {
      updateData.image = req.file.location;
    }
    
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, ingredient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteIngredient = async (req, res) => {
  try {
    await Ingredient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Ingredient deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingOrders
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
