import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Agent, AgentScan, AgentLead, AgentCommission, AgentSettings, User, Order } from '../models/Model.js';

const generateAgentCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'PIC';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const generateUniqueCode = async () => {
  let code, exists;
  do {
    code = generateAgentCode();
    exists = await Agent.findOne({ agentCode: code });
  } while (exists);
  return code;
};

const getSettings = async () => {
  let s = await AgentSettings.findOne();
  if (!s) s = await AgentSettings.create({});
  return s;
};

// ── Agent Auth ────────────────────────────────────────────────────────────────

export const agentLogin = async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    let agent = await Agent.findOne({ phone });
    if (!agent) {
      if (!name) return res.status(400).json({ error: 'Name is required for new agents' });
      const agentCode = await generateUniqueCode();
      agent = await Agent.create({ name, phone, agentCode });
    }

    const token = jwt.sign(
      { agentId: agent._id, role: 'agent' },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );

    res.json({ success: true, token, agent: sanitizeAgent(agent) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Agent Profile & Dashboard ─────────────────────────────────────────────────

export const getAgentProfile = async (req, res) => {
  try {
    const agent = await Agent.findById(req.agent._id);
    const [recentScans, recentLeads, recentCommissions, scansByDay, settings] = await Promise.all([
      AgentScan.find({ agentId: agent._id }).sort({ scannedAt: -1 }).limit(20),
      AgentLead.find({ agentId: agent._id }).sort({ registeredAt: -1 }).limit(10)
        .populate('userId', 'name phone createdAt'),
      AgentCommission.find({ agentId: agent._id }).sort({ createdAt: -1 }).limit(20)
        .populate('orderId', 'totalPrice createdAt status')
        .populate('userId', 'name phone'),
      AgentScan.aggregate([
        { $match: { agentId: agent._id } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$scannedAt' } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ]),
      getSettings()
    ]);

    res.json({
      success: true,
      agent: sanitizeAgent(agent),
      displayEarningPerOrder: settings.displayEarningPerOrder,
      analytics: {
        recentScans,
        recentLeads,
        recentCommissions,
        scansByDay: scansByDay.reverse()
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Public: Track QR Scan ──────────────────────────────────────────────────────

export const trackAgentScan = async (req, res) => {
  try {
    const { agentCode } = req.params;
    const agent = await Agent.findOne({ agentCode, isActive: true });
    if (!agent) return res.status(404).json({ error: 'Invalid agent link' });

    await AgentScan.create({
      agentId: agent._id,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || ''
    });
    await Agent.findByIdAndUpdate(agent._id, { $inc: { totalScans: 1 } });

    res.json({ success: true, agentName: agent.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Public: Register Lead ──────────────────────────────────────────────────────

export const registerAgentLead = async (req, res) => {
  try {
    const { agentCode } = req.params;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    const agent = await Agent.findOne({ agentCode, isActive: true });
    if (!agent) return res.status(404).json({ error: 'Invalid agent link' });

    let user = await User.findOne({ phone });
    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        phone,
        referredByAgent: agent._id,
        referredAt: new Date(),
        giftEligible: true
      });
    } else if (!user.referredByAgent) {
      user.referredByAgent = agent._id;
      user.referredAt = new Date();
      user.giftEligible = true;
      await user.save();
    }

    const existingLead = await AgentLead.findOne({ agentId: agent._id, userId: user._id });
    if (!existingLead) {
      await AgentLead.create({ agentId: agent._id, userId: user._id });
      await Agent.findByIdAndUpdate(agent._id, { $inc: { totalLeads: 1 } });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        giftEligible: user.giftEligible,
        giftRedeemed: user.giftRedeemed
      },
      isNewUser
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Admin: List All Agents ─────────────────────────────────────────────────────

export const adminGetAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find().sort({ createdAt: -1 });
    res.json({ success: true, agents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Admin: Get Single Agent Detail ────────────────────────────────────────────

export const adminGetAgentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [agent, scans, leads, commissions, scansByDay, leadsByDay] = await Promise.all([
      Agent.findById(id),
      AgentScan.find({ agentId: id }).sort({ scannedAt: -1 }).limit(100),
      AgentLead.find({ agentId: id }).sort({ registeredAt: -1 })
        .populate('userId', 'name phone createdAt giftEligible giftRedeemed referredAt'),
      AgentCommission.find({ agentId: id }).sort({ createdAt: -1 })
        .populate('orderId', 'totalPrice createdAt status deliveredAt')
        .populate('userId', 'name phone'),
      AgentScan.aggregate([
        { $match: { agentId: new mongoose.Types.ObjectId(id) } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$scannedAt' } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } },
        { $limit: 60 }
      ]),
      AgentLead.aggregate([
        { $match: { agentId: new mongoose.Types.ObjectId(id) } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$registeredAt' } },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } },
        { $limit: 60 }
      ])
    ]);

    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    res.json({
      success: true,
      agent,
      analytics: { scans, leads, commissions, scansByDay, leadsByDay }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Admin: Update Agent ────────────────────────────────────────────────────────

export const adminUpdateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (isActive !== undefined) update.isActive = isActive;
    const agent = await Agent.findByIdAndUpdate(id, update, { new: true });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true, agent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Admin: Adjust Wallet ──────────────────────────────────────────────────────

export const adminAdjustWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount is required' });
    const agent = await Agent.findByIdAndUpdate(
      id,
      { $inc: { wallet: amount } },
      { new: true }
    );
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true, agent, note });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Admin: Delete / Deactivate Agent ─────────────────────────────────────────

export const adminDeleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    await Agent.findByIdAndUpdate(id, { isActive: false });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Admin: Agent Stats Overview ───────────────────────────────────────────────

export const adminAgentStats = async (req, res) => {
  try {
    const [totalAgents, activeAgents, totalScans, totalLeads, totalCommissions, topAgents] = await Promise.all([
      Agent.countDocuments(),
      Agent.countDocuments({ isActive: true }),
      AgentScan.countDocuments(),
      AgentLead.countDocuments(),
      AgentCommission.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Agent.find().sort({ totalEarnings: -1 }).limit(5)
    ]);

    res.json({
      success: true,
      stats: {
        totalAgents,
        activeAgents,
        totalScans,
        totalLeads,
        totalCommissionsPaid: totalCommissions[0]?.total || 0,
        topAgents
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Commission Helper (called from order delivery) ────────────────────────────

export const processAgentCommission = async (order) => {
  try {
    if (!order.referredByAgent || order.agentCommissionPaid) return;
    const settings = await getSettings();
    const COMMISSION = settings.actualCommissionPerOrder ?? 20;
    await Promise.all([
      AgentCommission.create({
        agentId: order.referredByAgent,
        userId: order.userId,
        orderId: order._id,
        amount: COMMISSION
      }),
      Agent.findByIdAndUpdate(order.referredByAgent, {
        $inc: { wallet: COMMISSION, totalEarnings: COMMISSION, totalOrders: 1 }
      }),
      Order.findByIdAndUpdate(order._id, { agentCommissionPaid: true })
    ]);
    const user = await User.findById(order.userId);
    if (user && user.giftEligible && !user.giftRedeemed) {
      await User.findByIdAndUpdate(order.userId, { giftRedeemed: true });
    }
  } catch (e) {
    console.error('Commission processing error:', e.message);
  }
};

// ── Admin: Get / Update Agent Settings ───────────────────────────────────────

export const adminGetAgentSettings = async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ success: true, settings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const adminUpdateAgentSettings = async (req, res) => {
  try {
    const { displayEarningPerOrder, actualCommissionPerOrder } = req.body;
    const update = { updatedAt: new Date() };
    if (displayEarningPerOrder !== undefined)   update.displayEarningPerOrder   = Number(displayEarningPerOrder);
    if (actualCommissionPerOrder !== undefined) update.actualCommissionPerOrder = Number(actualCommissionPerOrder);
    const settings = await AgentSettings.findOneAndUpdate({}, update, { new: true, upsert: true });
    res.json({ success: true, settings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const sanitizeAgent = (agent) => ({
  _id:           agent._id,
  name:          agent.name,
  phone:         agent.phone,
  agentCode:     agent.agentCode,
  wallet:        agent.wallet,
  isActive:      agent.isActive,
  totalScans:    agent.totalScans,
  totalLeads:    agent.totalLeads,
  totalOrders:   agent.totalOrders,
  totalEarnings: agent.totalEarnings,
  createdAt:     agent.createdAt
});
