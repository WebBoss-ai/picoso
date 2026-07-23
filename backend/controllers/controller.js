import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, OTP, Bowl, Ingredient, Order, Feedback, PlatinumCard, HealthySubscription, CategoryConfig, DeliveryPartner, StoreStatus, NotifyRequest, ClosedCheckout, OutOfRadiusAttempt, Campaign, CampaignScan, CampaignLead, CampaignRedemption, FriendReferral, FriendReferralRequest, ReferralSettings } from '../models/Model.js';
import { generateOTP, sendOTP, verifyOTP } from '../utils/otp.js';
import { processAgentCommission } from './agentController.js';

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
    console.log("🔹 verifyOTPController called");
    console.log("➡️ req.body:", req.body);

    const { phone, otp } = req.body;
    const DEFAULT_OTP = '0000';

    let otpDoc = null;

    // ✅ OTP verification (skip for default OTP)
    if (otp !== DEFAULT_OTP) {
      otpDoc = await OTP.findOne({ phone }).sort({ createdAt: -1 });

      console.log("📄 OTP doc:", otpDoc?._id);

      if (!otpDoc) {
        return res.status(400).json({ error: 'OTP not found or expired' });
      }

      const verification = verifyOTP(otp, otpDoc.otp, otpDoc.expiresAt);

      if (!verification.valid) {
        return res.status(400).json({ error: verification.message });
      }
    }

    // 🔥 Clean phone (only digits, last 10 digits)
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const dummyEmail = `${cleanPhone}@picoso.in`;

    console.log("📱 Clean phone:", cleanPhone);
    console.log("🧪 Dummy email:", dummyEmail);

    let user = await User.findOne({ phone });

    if (!user) {
      console.log("🆕 Creating new user");

      user = await User.create({
        phone,
        email: dummyEmail,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      });

    } else {
      console.log("👤 Existing user found:", user._id);

      const updates = { lastLoginAt: new Date(), lastActiveAt: new Date() };
      if (!user.email) {
        console.log("⚠️ User missing email → assigning dummy");
        updates.email = dummyEmail;
      }
      await User.findByIdAndUpdate(user._id, updates);
      user = await User.findById(user._id);
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    if (otpDoc) {
      await OTP.findByIdAndDelete(otpDoc._id);
    }

    const platinum = await PlatinumCard.findOne({
      userId: user._id,
      active: true
    });

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
    console.error("🔥 verifyOTPController ERROR:", error);

    if (error.code === 11000) {
      console.error("🚨 Duplicate key:", error.keyValue);
      return res.status(400).json({
        error: "Duplicate value",
        details: error.keyValue
      });
    }

    res.status(500).json({ error: error.message });
  }
};

// ── Availability helper (IST) ───────────────────────────────────────────────
function computeAvailability(bowl) {
  const doc = typeof bowl.toObject === 'function' ? bowl.toObject() : { ...bowl };
  if (doc.availableFrom && doc.availableTo) {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const hh  = ist.getUTCHours().toString().padStart(2, '0');
    const mm  = ist.getUTCMinutes().toString().padStart(2, '0');
    const cur = `${hh}:${mm}`;
    doc.isAvailableNow = cur >= doc.availableFrom && cur <= doc.availableTo;
  } else {
    doc.isAvailableNow = doc.available !== false;
  }
  return doc;
}

// Product / Bowl Controllers
export const getBowls = async (req, res) => {
  try {
    const filter = {};
    if (req.query.pfCategory) filter.pfCategory = req.query.pfCategory;
    const bowls = await Bowl.find(filter).sort({ sortOrder: 1, isBestseller: -1, createdAt: -1 });
    res.json({ success: true, bowls: bowls.map(computeAvailability) });
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
    const { items, deliveryAddress, totalPrice, paymentMethod, customerName, isPlatinumOrder, discountAmount, deliveryFee, campaignCode } = req.body;

    let finalDiscount = discountAmount || 0;
    let campaignRedemptionData = null;

    // Campaign free-coffee logic (per-user: up to 5 coffees, 1 per order)
    if (campaignCode) {
      const campaign = await Campaign.findOne({ code: campaignCode, active: true });
      if (campaign) {
        const hasBowl = items?.some(item => item.type === 'bowl');
        if (hasBowl) {
          let lead = await CampaignLead.findOne({ campaignId: campaign._id, userId: req.user._id });
          if (!lead) {
            lead = await CampaignLead.create({
              campaignId: campaign._id,
              userId: req.user._id,
              phone: req.user.phone,
              coffeesGiven: 0,
              maxCoffees: 5,
            });
          }
          if (lead.coffeesGiven < lead.maxCoffees) {
            finalDiscount += campaign.freeItemValue;
            campaignRedemptionData = { campaign, lead };
          }
        }
      }
    }

    const estimatedDelivery = new Date(Date.now() + 30 * 60 * 1000);

    const order = await Order.create({
      userId: req.user._id,
      items,
      totalPrice,
      discountAmount: finalDiscount,
      deliveryFee: deliveryFee !== undefined ? deliveryFee : 15,
      isPlatinumOrder: isPlatinumOrder || false,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      deliveryAddress,
      customerName: customerName || req.user.name,
      phone: req.user.phone,
      estimatedDelivery,
      referredByAgent: req.user.referredByAgent || null
    });

    // Record campaign redemption (per-user tracking)
    let campaignResult = null;
    if (campaignRedemptionData) {
      const { campaign: c, lead } = campaignRedemptionData;
      await CampaignRedemption.create({
        campaignId: c._id,
        userId: req.user._id,
        orderId: order._id,
        phone: req.user.phone,
        discountAmount: c.freeItemValue,
      });
      await CampaignLead.findByIdAndUpdate(lead._id, { $inc: { coffeesGiven: 1 } });
      await Campaign.findByIdAndUpdate(c._id, { $inc: { redeemedCount: 1 } });
      const updatedLead = await CampaignLead.findById(lead._id);
      campaignResult = {
        coffeesRemaining: Math.max(0, updatedLead.maxCoffees - updatedLead.coffeesGiven),
        maxCoffees: updatedLead.maxCoffees,
      };
    }

    // Process referral reward (fire-and-forget — awards free item to referrer on friend's first order)
    const firstItemName = items?.[0]?.name || (items?.[0]?.bowlId ? 'a bowl' : 'an item');
    processReferralReward(req.user._id, order._id, firstItemName).catch(() => {});

    res.json({ success: true, order, campaign: campaignResult });
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
        monthlyFee: 299
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

    const [platinumCards, orderStats] = await Promise.all([
      PlatinumCard.find({ active: true }),
      Order.aggregate([
        { $group: {
          _id: '$userId',
          orderCount:     { $sum: 1 },
          totalSpent:     { $sum: '$totalPrice' },
          lastOrderDate:  { $max: '$createdAt' },
          deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        }}
      ])
    ]);

    const platinumMap = platinumCards.reduce((acc, c) => {
      acc[c.userId.toString()] = true; return acc;
    }, {});
    const statsMap = orderStats.reduce((acc, s) => {
      acc[s._id.toString()] = s; return acc;
    }, {});

    const usersWithData = users.map(u => {
      const stats = statsMap[u._id.toString()] || {};
      return {
        ...u.toObject(),
        isPlatinum:     !!platinumMap[u._id.toString()],
        orderCount:     stats.orderCount     || 0,
        totalSpent:     stats.totalSpent     || 0,
        lastOrderDate:  stats.lastOrderDate  || null,
        deliveredCount: stats.deliveredCount || 0,
        cancelledCount: stats.cancelledCount || 0,
      };
    });

    res.json({ success: true, users: usersWithData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all orders for a specific user (admin)
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate('items.bowlId', 'name image price pfCategory')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Save user's current cart snapshot (called from frontend on cart change)
export const saveUserCart = async (req, res) => {
  try {
    const { cartItems } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      cartSnapshot: cartItems,
      lastActiveAt: new Date(),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Ping to update lastActiveAt
export const pingUserActivity = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastActiveAt: new Date() });
    res.json({ success: true });
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

// ── Category Config Controllers ────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'pf-meals',      label: 'Bowls',        description: 'Fresh protein-packed bowls',        active: true, sortOrder: 0, color: '#f0fdf4' },
  { id: 'pf-wraps',      label: 'Wraps',        description: 'Loaded healthy wraps',              active: true, sortOrder: 1, color: '#fefce8' },
  { id: 'pf-sandwiches', label: 'Sandwiches',   description: 'Artisan protein sandwiches',        active: true, sortOrder: 2, color: '#fff7ed' },
  { id: 'pf-salads',     label: 'Salads',       description: 'Crispy fresh salad bowls',          active: true, sortOrder: 3, color: '#ecfdf5' },
  { id: 'pf-beverages',  label: 'Cold Drinks',  description: 'Cold coffees & refreshing drinks',  active: true, sortOrder: 4, color: '#fef3c7' },
];

export const getCategories = async (req, res) => {
  try {
    // Upsert defaults — updates labels/meta, preserves admin's active toggle
    for (const def of DEFAULT_CATEGORIES) {
      await CategoryConfig.findOneAndUpdate(
        { id: def.id },
        { $set: { label: def.label, description: def.description, sortOrder: def.sortOrder, color: def.color, active: def.active },
          $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    }
    // Remove categories that no longer exist in defaults (cleanup old pf-snacks etc.)
    await CategoryConfig.deleteMany({ id: { $nin: DEFAULT_CATEGORIES.map(d => d.id) } });
    const cats = await CategoryConfig.find().sort({ sortOrder: 1 });
    res.json({ success: true, categories: cats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    const cat = await CategoryConfig.findOneAndUpdate({ id }, update, { new: true, upsert: true });
    res.json({ success: true, category: cat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const cat = await CategoryConfig.create(req.body);
    // also ensure Bowl pfCategory enum supports it (we skip strict enum here)
    res.json({ success: true, category: cat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await CategoryConfig.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Delivery Partner Controllers ───────────────────────────────────────────

export const deliveryLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const partner = await DeliveryPartner.findOne({ email: email.toLowerCase().trim() });
    if (!partner) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, partner.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (!partner.isActive) return res.status(403).json({ error: 'Account is inactive. Contact admin.' });
    const token = jwt.sign({ partnerId: partner._id, role: 'delivery' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true, token,
      partner: { _id: partner._id, name: partner.name, email: partner.email, phone: partner.phone, totalDeliveries: partner.totalDeliveries }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['confirmed', 'preparing', 'pending'] },
      deliveryPartnerId: { $exists: false }
    }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getActiveDelivery = async (req, res) => {
  try {
    const order = await Order.findOne({
      deliveryPartnerId: req.deliveryPartner._id,
      status: 'out-for-delivery'
    });
    res.json({ success: true, order: order || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getDeliveryHistory = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const orders = await Order.find({
      deliveryPartnerId: req.deliveryPartner._id,
      status: 'delivered',
      deliveredAt: { $gte: today }
    }).sort({ deliveredAt: -1 });
    res.json({ success: true, orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const pickupOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!['confirmed', 'preparing', 'pending'].includes(order.status)) {
      return res.status(400).json({ error: 'Order not available for pickup' });
    }
    if (order.deliveryPartnerId) return res.status(400).json({ error: 'Order already assigned' });
    order.status = 'out-for-delivery';
    order.deliveryPartnerId = req.deliveryPartner._id;
    order.pickedUpAt = new Date();
    order.updatedAt = new Date();
    await order.save();
    res.json({ success: true, order });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const markDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.deliveryPartnerId?.toString() !== req.deliveryPartner._id.toString()) {
      return res.status(403).json({ error: 'Not your delivery' });
    }
    if (order.status !== 'out-for-delivery') return res.status(400).json({ error: 'Order not in delivery' });
    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.updatedAt = new Date();
    if (order.paymentMethod === 'cod') order.paymentStatus = 'paid';
    await order.save();
    await DeliveryPartner.findByIdAndUpdate(req.deliveryPartner._id, { $inc: { totalDeliveries: 1 } });
    await processAgentCommission(order);
    res.json({ success: true, order });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getDeliveryStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todayDocs, earningsAgg, partner] = await Promise.all([
      Order.countDocuments({ deliveryPartnerId: req.deliveryPartner._id, status: 'delivered', deliveredAt: { $gte: today } }),
      Order.aggregate([
        { $match: { deliveryPartnerId: req.deliveryPartner._id, status: 'delivered', deliveredAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$deliveryFee' } } }
      ]),
      DeliveryPartner.findById(req.deliveryPartner._id)
    ]);
    res.json({
      success: true,
      stats: {
        todayDeliveries: todayDocs,
        todayEarnings: earningsAgg[0]?.total || 0,
        totalDeliveries: partner?.totalDeliveries || 0
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Healthy Subscription Controllers ─────────────────────────────────────────

const PLAN_PRICES = {
  3: { weeklyPrice: 690,  perBowlPrice: 230 },
  5: { weeklyPrice: 1100, perBowlPrice: 220 },
  7: { weeklyPrice: 1400, perBowlPrice: 200 },
};

export const createHealthySubscription = async (req, res) => {
  try {
    const { selectedItems, bowlsPerWeek, timeSlot, upiRef } = req.body;

    if (![3, 5, 7].includes(Number(bowlsPerWeek))) {
      return res.status(400).json({ error: 'bowlsPerWeek must be 3, 5, or 7' });
    }
    if (!selectedItems || !selectedItems.length) {
      return res.status(400).json({ error: 'Select at least one item' });
    }
    if (!upiRef || upiRef.trim().length < 6) {
      return res.status(400).json({ error: 'Valid UPI transaction reference required' });
    }

    const pricing = PLAN_PRICES[Number(bowlsPerWeek)];

    const sub = await HealthySubscription.findOneAndUpdate(
      { userId: req.user.userId },
      {
        userId:       req.user.userId,
        selectedItems,
        bowlsPerWeek: Number(bowlsPerWeek),
        ...pricing,
        timeSlot:     timeSlot || '',
        upiRef:       upiRef.trim(),
        status:       'pending_approval',
        updatedAt:    new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, subscription: sub });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getHealthySubscription = async (req, res) => {
  try {
    const sub = await HealthySubscription.findOne({ userId: req.user.userId });
    res.json({ success: true, subscription: sub || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const cancelHealthySubscription = async (req, res) => {
  try {
    const sub = await HealthySubscription.findOneAndUpdate(
      { userId: req.user.userId },
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'No subscription found' });
    res.json({ success: true, subscription: sub });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getAllHealthySubscriptions = async (req, res) => {
  try {
    const subs = await HealthySubscription.find()
      .populate('userId', 'phone name')
      .sort({ createdAt: -1 });
    res.json({ success: true, subscriptions: subs });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const approveHealthySubscription = async (req, res) => {
  try {
    const nextDelivery = new Date();
    nextDelivery.setDate(nextDelivery.getDate() + 1);

    const sub = await HealthySubscription.findByIdAndUpdate(
      req.params.id,
      {
        status:     'active',
        approvedBy: req.user.userId,
        approvedAt: new Date(),
        startDate:  new Date(),
        nextDelivery,
        updatedAt:  new Date(),
      },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    res.json({ success: true, subscription: sub });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const rejectHealthySubscription = async (req, res) => {
  try {
    const sub = await HealthySubscription.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', updatedAt: new Date() },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    res.json({ success: true, subscription: sub });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Store Status ─────────────────────────────────────────────────────────────
export const getStoreStatus = async (req, res) => {
  try {
    let status = await StoreStatus.findOne();
    if (!status) status = await StoreStatus.create({});
    res.json({ status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const updateStoreStatus = async (req, res) => {
  try {
    const { isOpen, closedReason, openingTime, closingTime } = req.body;
    let status = await StoreStatus.findOne();
    if (!status) status = new StoreStatus({});
    if (isOpen !== undefined) status.isOpen = isOpen;
    if (closedReason !== undefined) status.closedReason = closedReason;
    if (openingTime) status.openingTime = openingTime;
    if (closingTime) status.closingTime = closingTime;
    status.updatedBy = req.user._id;
    status.updatedAt = new Date();
    await status.save();
    res.json({ status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Notify Requests ──────────────────────────────────────────────────────────
export const addNotifyRequest = async (req, res) => {
  try {
    const { phone, userId } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    const existing = await NotifyRequest.findOne({ phone, notified: false });
    if (existing) return res.json({ message: 'Already registered', alreadyRegistered: true });
    const request = await NotifyRequest.create({ phone, userId: userId || null });
    res.json({ request });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getNotifyRequests = async (req, res) => {
  try {
    const pending  = await NotifyRequest.find({ notified: false }).sort('-createdAt');
    const total    = await NotifyRequest.countDocuments();
    const notified = await NotifyRequest.countDocuments({ notified: true });
    res.json({ requests: pending, total, notified });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const markNotified = async (req, res) => {
  try {
    await NotifyRequest.findByIdAndUpdate(req.params.id, { notified: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Closed Checkout Captures ─────────────────────────────────────────────────
export const saveClosedCheckout = async (req, res) => {
  try {
    const { phone, userId, items, total } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'No items' });
    const record = await ClosedCheckout.create({
      phone: phone || '',
      userId: userId || null,
      items,
      total: total || 0,
    });
    res.json({ record });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getClosedCheckouts = async (req, res) => {
  try {
    const pending  = await ClosedCheckout.find({ notified: false }).sort('-createdAt');
    const total    = await ClosedCheckout.countDocuments();
    const notified = await ClosedCheckout.countDocuments({ notified: true });
    res.json({ records: pending, total, notified });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const markClosedCheckoutNotified = async (req, res) => {
  try {
    await ClosedCheckout.findByIdAndUpdate(req.params.id, { notified: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Expansion / Out-of-radius tracking ───────────────────────────────────────
export const saveOutOfRadiusAttempt = async (req, res) => {
  try {
    const { lat, lng, address, area, city, distanceKm } = req.body;
    await OutOfRadiusAttempt.create({
      phone: req.user.phone,
      userId: req.user._id,
      lat, lng, address, area, city, distanceKm,
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getExpansionData = async (req, res) => {
  try {
    const [outOfRadius, notifyRequests, closedCheckouts, ordersWithGeo] = await Promise.all([
      OutOfRadiusAttempt.find().sort('-createdAt').limit(1000),
      NotifyRequest.find().sort('-createdAt'),
      ClosedCheckout.find().sort('-createdAt'),
      Order.find({ 'deliveryAddress.lat': { $ne: null } })
        .select('deliveryAddress totalPrice deliveryFee status createdAt customerName phone items isPlatinumOrder')
        .sort('-createdAt').limit(1000),
    ]);
    res.json({ outOfRadius, notifyRequests, closedCheckouts, ordersWithGeo });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Dev: Add Far Address to Test User ────────────────────────────────────────
// Pushes a 5 km-away saved address onto phone 9999999999's savedAddresses.
export const addFarAddressToTestUser = async (req, res) => {
  try {
    const TEST_PHONE = '9999999999';
    const TEST_LAT   = 28.482149;
    const TEST_LNG   = 77.072771;

    const user = await User.findOne({ phone: TEST_PHONE });
    if (!user) return res.status(404).json({ error: 'Test user not found. Run /dev/seed-test-user first.' });

    // Remove any existing address with same label to avoid dupes on re-run
    const filtered = (user.savedAddresses || []).filter(a => a.label !== 'Far Away (Test)');

    filtered.push({
      label:       'Far Away (Test)',
      fullAddress: '5 km North of Picoso Store, Gurugram',
      area:        'Test Area North',
      city:        'Gurugram',
      landmark:    'Picoso Test Pin',
      lat:         TEST_LAT,
      lng:         TEST_LNG,
      isDefault:   false,
    });

    user.savedAddresses = filtered;
    await user.save();

    res.json({
      message:   'Far address added',
      addresses: user.savedAddresses.map(a => ({ label: a.label, lat: a.lat, lng: a.lng })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Dev: Seed Test User ───────────────────────────────────────────────────────
// Creates / resets phone 9999999999 with a saved address pinned 5 km north of
// the store, then returns a ready-to-use JWT so you can test without OTP.
export const seedTestUser = async (req, res) => {
  try {
    const STORE_LAT = 28.437099;
    const STORE_LNG = 77.072771;
    // 5 km north: 1 degree lat ≈ 111 km
    const TEST_LAT = +(STORE_LAT + 0.04505).toFixed(6);
    const TEST_LNG = STORE_LNG;
    const TEST_PHONE = '9999999999';

    const testAddress = {
      label:       'Test Home',
      fullAddress: '5 km North of Picoso Store, Gurugram',
      area:        'Test Area',
      city:        'Gurugram',
      landmark:    'Picoso Test Pin',
      lat:         TEST_LAT,
      lng:         TEST_LNG,
      isDefault:   true,
    };

    let user = await User.findOne({ phone: TEST_PHONE });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        name:           'Test User (5 km away)',
        email:          `${TEST_PHONE}@picoso.in`,
        savedAddresses: [testAddress],
        location:       { city: 'Gurugram', area: 'Test Area', address: testAddress.fullAddress, coordinates: { lat: TEST_LAT, lng: TEST_LNG } },
        lastLoginAt:    new Date(),
        lastActiveAt:   new Date(),
      });
      user = await User.findById(user._id);
    } else {
      user = await User.create({
        phone:          TEST_PHONE,
        name:           'Test User (5 km away)',
        email:          `${TEST_PHONE}@picoso.in`,
        savedAddresses: [testAddress],
        location:       { city: 'Gurugram', area: 'Test Area', address: testAddress.fullAddress, coordinates: { lat: TEST_LAT, lng: TEST_LNG } },
        lastLoginAt:    new Date(),
        lastActiveAt:   new Date(),
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message:  'Test user ready',
      phone:    TEST_PHONE,
      name:     user.name,
      userId:   user._id,
      lat:      TEST_LAT,
      lng:      TEST_LNG,
      distance: '≈ 5 km from store',
      token,
      instructions: [
        "Open browser DevTools Console and run:",
        `localStorage.setItem('token', '${token}')`,
        "location.reload()",
      ],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Campaign Controllers ──────────────────────────────────────────────────────

// Public: get campaign info (coffees left, active status)
export const getCampaignInfo = async (req, res) => {
  try {
    const { code } = req.params;
    const campaign = await Campaign.findOne({ code });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const coffesLeft = Math.max(0, campaign.totalBudget - campaign.redeemedCount);
    res.json({
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        description: campaign.description,
        benefit: campaign.benefit,
        freeItemLabel: campaign.freeItemLabel,
        freeItemValue: campaign.freeItemValue,
        totalBudget: campaign.totalBudget,
        redeemedCount: campaign.redeemedCount,
        coffeesLeft: coffesLeft,
        active: campaign.active && coffesLeft > 0,
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Public: track page scan/visit
export const trackCampaignScan = async (req, res) => {
  try {
    const { code } = req.params;
    const campaign = await Campaign.findOne({ code });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
    const userAgent = req.headers['user-agent'] || '';
    await CampaignScan.create({ campaignId: campaign._id, ip, userAgent });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Authenticated: register as a lead after OTP login
export const registerCampaignLead = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;
    const campaign = await Campaign.findOne({ code });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    let lead = await CampaignLead.findOne({ campaignId: campaign._id, userId });
    if (!lead) {
      lead = await CampaignLead.create({
        campaignId: campaign._id,
        userId,
        phone: req.user.phone,
        coffeesGiven: 0,
        maxCoffees: 5,
      });
    }
    res.json({
      success: true,
      coffeesRemaining: lead.maxCoffees - lead.coffeesGiven,
      maxCoffees: lead.maxCoffees,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Authenticated: get user's campaign status (coffees remaining)
export const getCampaignMyStatus = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;
    const campaign = await Campaign.findOne({ code });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const lead = await CampaignLead.findOne({ campaignId: campaign._id, userId });
    const coffeesRemaining = lead ? (lead.maxCoffees - lead.coffeesGiven) : 5;
    res.json({
      active: campaign.active,
      coffeesRemaining: Math.max(0, coffeesRemaining),
      maxCoffees: lead?.maxCoffees ?? 5,
      coffeesGiven: lead?.coffeesGiven ?? 0,
      freeItemValue: campaign.freeItemValue,
      freeItemLabel: campaign.freeItemLabel,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: list all campaigns
export const adminGetCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    const result = await Promise.all(campaigns.map(async (c) => {
      const scans = await CampaignScan.countDocuments({ campaignId: c._id });
      const leads = await CampaignLead.countDocuments({ campaignId: c._id });
      const redemptions = await CampaignRedemption.countDocuments({ campaignId: c._id });
      return { ...c.toObject(), scans, leads, redemptions, coffeesLeft: Math.max(0, c.totalBudget - c.redeemedCount) };
    }));
    res.json({ campaigns: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: get campaign detail analytics
export const adminGetCampaignDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    const [scans, leads, redemptions] = await Promise.all([
      CampaignScan.find({ campaignId: id }).sort({ scannedAt: -1 }).limit(200),
      CampaignLead.find({ campaignId: id }).populate('userId', 'name phone createdAt').sort({ registeredAt: -1 }),
      CampaignRedemption.find({ campaignId: id }).populate('userId', 'name phone').populate('orderId', 'totalPrice status createdAt').sort({ redeemedAt: -1 }),
    ]);

    // Daily scans for last 14 days
    const now = new Date();
    const dailyScans = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end = new Date(day); end.setHours(23, 59, 59, 999);
      const count = scans.filter(s => s.scannedAt >= start && s.scannedAt <= end).length;
      dailyScans.push({ date: start.toISOString(), scans: count });
    }

    // Device breakdown from user agents
    const mobile = scans.filter(s => /mobile|android|iphone|ipad/i.test(s.userAgent)).length;
    const desktop = scans.length - mobile;

    res.json({
      campaign: { ...campaign.toObject(), coffeesLeft: Math.max(0, campaign.totalBudget - campaign.redeemedCount) },
      stats: {
        totalScans: scans.length,
        totalLeads: leads.length,
        totalRedemptions: redemptions.length,
        conversionRate: scans.length > 0 ? ((leads.length / scans.length) * 100).toFixed(1) : '0',
        redemptionRate: scans.length > 0 ? ((redemptions.length / scans.length) * 100).toFixed(1) : '0',
        totalDiscount: redemptions.reduce((s, r) => s + r.discountAmount, 0),
        deviceBreakdown: { mobile, desktop },
      },
      dailyScans,
      leads,
      redemptions,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: create a campaign
export const adminCreateCampaign = async (req, res) => {
  try {
    const { code, name, description, freeItemLabel, freeItemValue, totalBudget } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'Code and name required' });
    const campaign = await Campaign.create({ code, name, description, freeItemLabel, freeItemValue, totalBudget });
    res.json({ campaign });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Campaign code already exists' });
    res.status(500).json({ error: e.message });
  }
};

// ── Friend Referral System ────────────────────────────────────────────────────

function generateReferralCode(name) {
  // 3 initials from name words + 3 random digits
  const words = name.trim().split(/\s+/).filter(Boolean);
  let initials = '';
  for (const w of words) {
    if (initials.length < 3) initials += w[0].toUpperCase();
  }
  while (initials.length < 3) initials += 'X';
  const digits = String(Math.floor(100 + Math.random() * 900));
  return initials + digits;
}

// Public: get referral info by code (for landing page)
export const getReferralInfo = async (req, res) => {
  try {
    const { code } = req.params;
    const ref = await FriendReferral.findOne({ code: code.toUpperCase(), status: 'active' });
    if (!ref) return res.status(404).json({ error: 'Referral link not found or expired' });
    res.json({
      referrerName:   ref.referrerName,
      referrerGender: ref.referrerGender,
      code:           ref.code,
      valid:          true,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Authenticated: join via referral link (called after OTP login on /friendship/[code] page)
export const joinViaReferral = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;
    const user   = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ref = await FriendReferral.findOne({ code: code.toUpperCase(), status: 'active' });
    if (!ref) return res.status(404).json({ error: 'Referral link not found or expired' });

    // Don't let the referrer join their own link
    if (ref.referrerPhone === user.phone) {
      return res.status(400).json({ error: 'You cannot use your own referral link' });
    }

    // Check if already joined
    const alreadyJoined = ref.referredFriends.some(f => f.userId?.toString() === userId.toString());
    if (alreadyJoined) return res.json({ message: 'Already joined', alreadyJoined: true });

    ref.referredFriends.push({
      userId,
      name:    user.name || '',
      phone:   user.phone,
      joinedAt: new Date(),
    });
    ref.totalJoined += 1;

    // Link referrer's userId if not set
    if (!ref.referrerId) {
      const referrer = await User.findOne({ phone: ref.referrerPhone });
      if (referrer) ref.referrerId = referrer._id;
    }

    await ref.save();
    res.json({ message: 'Joined successfully', referrerName: ref.referrerName });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Authenticated: get my own referral links + friend activity feed
export const getMyReferrals = async (req, res) => {
  try {
    const user = req.user;
    // Find by userId or phone
    const refs = await FriendReferral.find({
      $or: [{ referrerId: user._id }, { referrerPhone: user.phone }],
    }).populate('referredFriends.userId', 'name phone').populate('rewardBowlId', 'name image');

    // Build notification feed: each friend's first order
    const feed = [];
    for (const ref of refs) {
      for (const f of ref.referredFriends) {
        if (f.firstOrderAt && f.firstOrderItem) {
          feed.push({
            friendName:    f.name || f.phone,
            itemName:      f.firstOrderItem,
            orderedAt:     f.firstOrderAt,
            rewardEarned:  f.rewardEarned,
          });
        }
      }
    }
    feed.sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));

    res.json({ referrals: refs, feed });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Public: user requests a referral link from menu page
export const requestReferralLink = async (req, res) => {
  try {
    const { phone, name, gender } = req.body;
    if (!phone || phone.length !== 10) return res.status(400).json({ error: 'Valid 10-digit phone required' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });

    // Check if already requested and pending
    const existing = await FriendReferralRequest.findOne({ phone, status: 'pending' });
    if (existing) return res.json({ message: 'Request already pending', pending: true });

    await FriendReferralRequest.create({ phone, name: name.trim(), gender: gender || 'other', status: 'pending' });
    res.json({ message: 'Request submitted. Admin will generate your link soon.', pending: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: get all pending referral link requests
export const adminGetReferralRequests = async (req, res) => {
  try {
    const requests = await FriendReferralRequest.find().sort({ createdAt: -1 });
    res.json({ requests });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: approve a request (auto-generates the link)
export const adminApproveReferralRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await FriendReferralRequest.findById(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Generate unique code
    let code, attempts = 0;
    do {
      code = generateReferralCode(request.name);
      attempts++;
    } while (await FriendReferral.findOne({ code }) && attempts < 20);

    const ref = await FriendReferral.create({
      code,
      referrerName:   request.name,
      referrerPhone:  request.phone,
      referrerGender: request.gender,
    });

    request.status      = 'approved';
    request.referralId  = ref._id;
    request.referralCode = code;
    await request.save();

    res.json({ referral: ref, request });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: reject a request
export const adminRejectReferralRequest = async (req, res) => {
  try {
    const { id } = req.params;
    await FriendReferralRequest.findByIdAndUpdate(id, { status: 'rejected' });
    res.json({ message: 'Rejected' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: manually create a referral link
export const adminCreateReferral = async (req, res) => {
  try {
    const { name, phone, gender, rewardBowlId, rewardLabel } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

    let code, attempts = 0;
    do {
      code = generateReferralCode(name);
      attempts++;
    } while (await FriendReferral.findOne({ code }) && attempts < 20);

    const ref = await FriendReferral.create({
      code,
      referrerName:   name.trim(),
      referrerPhone:  phone,
      referrerGender: gender || 'other',
      rewardBowlId:   rewardBowlId || null,
      rewardLabel:    rewardLabel  || '',
    });
    res.json({ referral: ref });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: get all referrals with stats
export const adminGetReferrals = async (req, res) => {
  try {
    const refs = await FriendReferral.find()
      .populate('rewardBowlId', 'name image price')
      .sort({ createdAt: -1 });

    const totalReferrals    = refs.length;
    const totalJoined       = refs.reduce((s, r) => s + r.totalJoined, 0);
    const totalOrdered      = refs.reduce((s, r) => s + r.totalOrdered, 0);
    const totalRewards      = refs.reduce((s, r) => s + r.totalRewardsEarned, 0);
    const conversionRate    = totalJoined > 0 ? ((totalOrdered / totalJoined) * 100).toFixed(1) : '0';

    // Last 30 days activity
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentJoins = refs.reduce((s, r) =>
      s + r.referredFriends.filter(f => new Date(f.joinedAt) >= since).length, 0);
    const recentOrders = refs.reduce((s, r) =>
      s + r.referredFriends.filter(f => f.firstOrderAt && new Date(f.firstOrderAt) >= since).length, 0);

    res.json({
      referrals: refs,
      stats: {
        totalReferrals, totalJoined, totalOrdered, totalRewards,
        conversionRate, recentJoins, recentOrders,
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: update referral (status, reward)
export const adminUpdateReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rewardBowlId, rewardLabel } = req.body;
    const update = {};
    if (status)       update.status      = status;
    if (rewardBowlId !== undefined) update.rewardBowlId = rewardBowlId || null;
    if (rewardLabel  !== undefined) update.rewardLabel  = rewardLabel;
    const ref = await FriendReferral.findByIdAndUpdate(id, update, { new: true }).populate('rewardBowlId', 'name image price');
    res.json({ referral: ref });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Admin: get/update referral settings
export const adminGetReferralSettings = async (req, res) => {
  try {
    let settings = await ReferralSettings.findOne().populate('rewardBowlId', 'name image price');
    if (!settings) settings = await ReferralSettings.create({});
    res.json({ settings });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const adminUpdateReferralSettings = async (req, res) => {
  try {
    const { rewardBowlId, rewardLabel, rewardNote } = req.body;
    let settings = await ReferralSettings.findOne();
    if (!settings) settings = new ReferralSettings();
    if (rewardBowlId !== undefined) settings.rewardBowlId = rewardBowlId || null;
    if (rewardLabel  !== undefined) settings.rewardLabel  = rewardLabel;
    if (rewardNote   !== undefined) settings.rewardNote   = rewardNote;
    settings.updatedAt = new Date();
    await settings.save();
    res.json({ settings });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Called from createOrder — awards referral reward when a referred friend places their FIRST order
export const processReferralReward = async (userId, orderId, itemName) => {
  try {
    // Find a referral where this user is a referred friend who hasn't ordered yet
    const ref = await FriendReferral.findOne({
      'referredFriends.userId': userId,
      'referredFriends.firstOrderId': null,
      status: 'active',
    });
    if (!ref) return;

    const friend = ref.referredFriends.find(
      f => f.userId?.toString() === userId.toString() && !f.firstOrderId
    );
    if (!friend) return;

    friend.firstOrderId   = orderId;
    friend.firstOrderAt   = new Date();
    friend.firstOrderItem = itemName;
    friend.rewardEarned   = true;
    friend.rewardEarnedAt = new Date();

    ref.totalOrdered       += 1;
    ref.totalRewardsEarned += 1;

    await ref.save();
  } catch (_) { /* non-critical */ }
};
