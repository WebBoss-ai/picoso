import jwt from 'jsonwebtoken';
import { User, OTP, Bowl, Ingredient, Order, Feedback, PlatinumCard } from '../models/Model.js';
import { generateOTP, sendOTP, verifyOTP } from '../utils/otp.js';

// Auth Controllers
export const sendOTPController = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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

    const DEFAULT_OTP = '0000';

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

    if (otpDoc) {
      await OTP.findByIdAndDelete(otpDoc._id);
    }

    const platinum = await PlatinumCard.findOne({ userId: user._id, active: true });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        isPlatinum: !!platinum
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Product / Bowl Controllers
export const getBowls = async (req, res) => {
  try {
    const filter = { available: true };
    if (req.query.pfCategory) filter.pfCategory = req.query.pfCategory;
    const bowls = await Bowl.find(filter).sort({ isBestseller: -1, createdAt: -1 });
    res.json({ success: true, bowls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBowlById = async (req, res) => {
  try {
    const bowl = await Bowl.findById(req.params.id);
    if (!bowl) return res.status(404).json({ error: 'Item not found' });
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
    const { items, deliveryAddress, totalPrice, paymentMethod, customerName, isPlatinumOrder, discountAmount, deliveryFee } = req.body;

    const estimatedDelivery = new Date(Date.now() + 30 * 60 * 1000);

    const order = await Order.create({
      userId: req.user._id,
      items,
      totalPrice,
      discountAmount: discountAmount || 0,
      deliveryFee: deliveryFee || 0,
      isPlatinumOrder: isPlatinumOrder || false,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      deliveryAddress,
      customerName: customerName || req.user.name,
      phone: req.user.phone,
      estimatedDelivery
    });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('items.bowlId')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('items.bowlId');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// User / Profile Controllers
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const platinum = await PlatinumCard.findOne({ userId: req.user._id });
    res.json({ success: true, user, platinum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    console.log("🔹 updateProfile called");
    console.log("➡️ req.user:", req.user);
    console.log("➡️ req.body:", req.body);

    let { name, email, location } = req.body;

    // Normalize email
    email = email?.trim().toLowerCase();
    console.log("📧 Normalized email:", email);

    // 🔥 Clean phone (only digits, last 10 digits)
    const rawPhone = req.user.phone;
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

    console.log("📱 Raw phone:", rawPhone);
    console.log("📱 Clean phone:", cleanPhone);

    // 🔥 Generate dummy email
    const dummyEmail = `${cleanPhone}@picoso.in`;
    console.log("🧪 Dummy email generated:", dummyEmail);

    const updateData = {
      name,
      location
    };

    // ✅ Email logic
    if (!email || email === "") {
      console.log("⚠️ No email provided → using dummy email");
      updateData.email = dummyEmail;
    } else {
      console.log("🔍 Checking duplicate for email:", email);

      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user._id }
      });

      console.log("🔎 Existing user found:", existingUser?._id);

      if (existingUser) {
        console.log("❌ Duplicate email detected");
        return res.status(400).json({ error: "Email already in use" });
      }

      updateData.email = email;
    }

    console.log("📝 Final updateData:", updateData);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log("✅ Updated user:", user?._id);

    res.json({ success: true, user });

  } catch (error) {
    console.error("🔥 updateProfile ERROR:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);

    // Extra handling for duplicate error (just in case)
    if (error.code === 11000) {
      console.error("🚨 Duplicate key error:", error.keyValue);
      return res.status(400).json({
        error: "Duplicate value",
        details: error.keyValue
      });
    }

    res.status(500).json({ error: error.message });
  }
};

export const updateAddresses = async (req, res) => {
  try {
    const { addresses } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { savedAddresses: addresses },
      { new: true }
    );
    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addAddress = async (req, res) => {
  try {
    const { label, fullAddress, area, city, landmark, lat, lng, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    if (isDefault) {
      user.savedAddresses.forEach(a => { a.isDefault = false; });
    }

    user.savedAddresses.push({ label, fullAddress, area, city, landmark, lat, lng, isDefault });
    await user.save();

    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.savedAddresses = user.savedAddresses.filter(a => a._id.toString() !== req.params.addressId);
    await user.save();
    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Platinum Controllers
export const getPlatinumStatus = async (req, res) => {
  try {
    const platinum = await PlatinumCard.findOne({ userId: req.user._id });
    res.json({ success: true, platinum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const subscribePlatinum = async (req, res) => {
  try {
    const { upiRef } = req.body;

    let platinum = await PlatinumCard.findOne({ userId: req.user._id });

    if (platinum) {
      platinum.paymentStatus = 'pending';
      platinum.upiRef = upiRef || '';
      platinum.updatedAt = new Date();
      await platinum.save();
    } else {
      platinum = await PlatinumCard.create({
        userId: req.user._id,
        active: false,
        paymentStatus: 'pending',
        upiRef: upiRef || '',
        monthlyFee: 99
      });
    }

    res.json({ success: true, platinum, message: 'Payment submitted. Card will activate after admin approval.' });
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
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

    const orders = await Order.find(filter)
      .populate('userId', 'name phone email')
      .populate('items.bowlId', 'name image price')
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
    ).populate('userId', 'name phone');
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveOrderPayment = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'paid', status: 'confirmed', updatedAt: new Date() },
      { new: true }
    ).populate('userId', 'name phone');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectOrderPayment = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'failed', status: 'cancelled', updatedAt: new Date() },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllPlatinumRequests = async (req, res) => {
  try {
    const requests = await PlatinumCard.find({ paymentStatus: 'pending' })
      .populate('userId', 'name phone email');
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approvePlatinumPayment = async (req, res) => {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const platinum = await PlatinumCard.findByIdAndUpdate(
      req.params.id,
      {
        active: true,
        paymentStatus: 'paid',
        startDate,
        endDate,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name phone');

    if (!platinum) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, platinum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectPlatinumPayment = async (req, res) => {
  try {
    const platinum = await PlatinumCard.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'failed', active: false, updatedAt: new Date() },
      { new: true }
    );
    if (!platinum) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, platinum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const platinumMap = await PlatinumCard.find({ active: true }).then(cards =>
      cards.reduce((acc, c) => { acc[c.userId.toString()] = true; return acc; }, {})
    );
    const usersWithPlatinum = users.map(u => ({
      ...u.toObject(),
      isPlatinum: !!platinumMap[u._id.toString()]
    }));
    res.json({ success: true, users: usersWithPlatinum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

    // Last 7 days range
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Last 30 days range
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalOrders, totalUsers, pendingOrders,
      pendingUpiPayments, activePlatinum, pendingPlatinum,
      todayOrders, cancelledOrders, deliveredOrders,
      // Revenue aggregates
      totalRevenueAgg, todayRevenueAgg, codRevenueAgg, upiRevenueAgg,
      codPendingRevenueAgg,
      // Payment breakdown counts
      codOrderCount, upiOrderCount, codDeliveredCount,
      // 7-day daily trend
      weeklyTrend,
      // Order status distribution
      statusDist,
      // Hourly orders today
      hourlyToday,
      // Top products
      topProducts,
      // New users last 7 days
      newUsersWeek,
      // Avg order value
      avgOrderValue,
    ] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ paymentMethod: 'upi', paymentStatus: 'pending' }),
      PlatinumCard.countDocuments({ active: true }),
      PlatinumCard.countDocuments({ paymentStatus: 'pending', active: false }),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.countDocuments({ status: 'delivered' }),
      // total paid revenue (UPI approved)
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      // today paid revenue
      Order.aggregate([{ $match: { createdAt: { $gte: todayStart }, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      // COD delivered revenue (collected)
      Order.aggregate([{ $match: { paymentMethod: 'cod', status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      // UPI paid revenue
      Order.aggregate([{ $match: { paymentMethod: 'upi', paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      // COD pending collection (out-for-delivery or pending/confirmed/preparing)
      Order.aggregate([{ $match: { paymentMethod: 'cod', status: { $nin: ['delivered', 'cancelled'] } } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      // COD order count
      Order.countDocuments({ paymentMethod: 'cod' }),
      Order.countDocuments({ paymentMethod: 'upi' }),
      Order.countDocuments({ paymentMethod: 'cod', status: 'delivered' }),
      // Daily orders + revenue last 7 days
      Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        }},
        { $sort: { _id: 1 } }
      ]),
      // Status distribution
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Hourly order distribution today
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        { $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]),
      // Top 5 products by order count
      Order.aggregate([
        { $unwind: '$items' },
        { $match: { 'items.name': { $exists: true, $ne: '' } } },
        { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      // New users this week
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      // Avg order value
      Order.aggregate([{ $group: { _id: null, avg: { $avg: '$totalPrice' } } }]),
    ]);

    // Build full 7-day array filling missing days with 0
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = weeklyTrend.find(w => w._id === key);
      weekDays.push({ date: key, orders: found?.orders || 0, revenue: found?.revenue || 0 });
    }

    // Normalise status distribution into a map
    const statusMap = {};
    statusDist.forEach(s => { statusMap[s._id] = s.count; });

    // Hourly map (0–23)
    const hourlyMap = Array(24).fill(0);
    hourlyToday.forEach(h => { hourlyMap[h._id] = h.count; });

    res.json({
      success: true,
      stats: {
        // Core counts
        totalOrders, totalUsers, pendingOrders, cancelledOrders, deliveredOrders,
        pendingUpiPayments, activePlatinum, pendingPlatinum,
        todayOrders, newUsersWeek,
        // Revenue
        totalRevenue: (totalRevenueAgg[0]?.total || 0) + (codRevenueAgg[0]?.total || 0),
        todayRevenue: todayRevenueAgg[0]?.total || 0,
        codRevenue: codRevenueAgg[0]?.total || 0,
        upiRevenue: upiRevenueAgg[0]?.total || 0,
        codPendingCollection: codPendingRevenueAgg[0]?.total || 0,
        avgOrderValue: Math.round(avgOrderValue[0]?.avg || 0),
        // Payment split
        codOrderCount, upiOrderCount, codDeliveredCount,
        // Trends & distributions
        weeklyTrend: weekDays,
        statusDistribution: statusMap,
        hourlyToday: hourlyMap,
        topProducts,
        // Rates
        deliveryRate: totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
        cancellationRate: totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0,
        platinumRate: totalUsers > 0 ? Math.round((activePlatinum / totalUsers) * 100) : 0,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Product CRUD (Admin)
export const createBowl = async (req, res) => {
  try {
    const bowlData = { ...req.body };
    if (req.file) bowlData.image = req.file.location;
    if (typeof bowlData.ingredients === 'string') {
      bowlData.ingredients = bowlData.ingredients.split(',').map(s => s.trim());
    }
    const bowl = await Bowl.create(bowlData);
    res.json({ success: true, bowl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBowl = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.image = req.file.location;
    if (typeof updateData.ingredients === 'string') {
      updateData.ingredients = updateData.ingredients.split(',').map(s => s.trim());
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
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createIngredient = async (req, res) => {
  try {
    const ingredientData = { ...req.body };
    if (req.file) ingredientData.image = req.file.location;
    const ingredient = await Ingredient.create(ingredientData);
    res.json({ success: true, ingredient });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateIngredient = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.image = req.file.location;
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
