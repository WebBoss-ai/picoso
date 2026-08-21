/**
 * WP Marketing Chatbot — brain CRUD + inbox APIs.
 */

import {
  WpChatbotBrain,
  WpChatConversation,
  WpChatMessage,
} from '../models/wpMarketingModels.js';
import { getOrCreateBrain } from '../services/wpChatbot.js';
import * as bot from '../services/campaignBot.js';

function clientId(req) {
  return req.wpClient._id;
}

/** GET /wp-marketing/chatbot/brain */
export const getBrain = async (req, res) => {
  try {
    const brain = await getOrCreateBrain(clientId(req));
    res.json({ success: true, brain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** PUT /wp-marketing/chatbot/brain */
export const updateBrain = async (req, res) => {
  try {
    const brain = await getOrCreateBrain(clientId(req));
    const {
      enabled,
      business,
      welcomeMessage,
      fallbackMessage,
      products,
      faqs,
      actions,
    } = req.body || {};

    if (typeof enabled === 'boolean') brain.enabled = enabled;
    if (business && typeof business === 'object') {
      brain.business = { ...(brain.business?.toObject?.() || brain.business || {}), ...business };
    }
    if (typeof welcomeMessage === 'string') brain.welcomeMessage = welcomeMessage;
    if (typeof fallbackMessage === 'string') brain.fallbackMessage = fallbackMessage;
    if (Array.isArray(products)) {
      brain.products = products.filter((p) => String(p?.name || '').trim());
    }
    if (Array.isArray(faqs)) {
      brain.faqs = faqs
        .filter((f) => String(f?.question || '').trim() && String(f?.answer || '').trim())
        .map((f) => ({
          question: String(f.question).trim(),
          answer: String(f.answer).trim(),
          keywords: Array.isArray(f.keywords) ? f.keywords : [],
        }));
    }
    if (Array.isArray(actions)) brain.actions = actions;
    brain.updatedAt = new Date();

    await brain.save();
    res.json({ success: true, brain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /wp-marketing/chatbot/stats */
export const getStats = async (req, res) => {
  try {
    const cid = clientId(req);
    const brain = await getOrCreateBrain(cid);
    const [conversations, messagesSent, messagesReceived, todayInbound] = await Promise.all([
      WpChatConversation.countDocuments({ clientId: cid }),
      WpChatMessage.countDocuments({ clientId: cid, direction: 'outbound' }),
      WpChatMessage.countDocuments({ clientId: cid, direction: 'inbound' }),
      WpChatMessage.countDocuments({
        clientId: cid,
        direction: 'inbound',
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        enabled: brain.enabled,
        contactsContacted: conversations,
        messagesSent,
        messagesReceived,
        todayInbound,
        products: brain.products?.length || 0,
        faqs: brain.faqs?.length || 0,
        actions: (brain.actions || []).filter((a) => a.enabled).length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /wp-marketing/chatbot/conversations */
export const listConversations = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100);
    const q = String(req.query.q || '').trim();
    const filter = { clientId: clientId(req) };
    if (q) {
      filter.$or = [
        { contactPhone: { $regex: q.replace(/\D/g, '') || q, $options: 'i' } },
        { contactName: { $regex: q, $options: 'i' } },
        { lastMessage: { $regex: q, $options: 'i' } },
      ];
    }
    const conversations = await WpChatConversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /wp-marketing/chatbot/conversations/:id */
export const getConversation = async (req, res) => {
  try {
    const convo = await WpChatConversation.findOne({
      _id: req.params.id,
      clientId: clientId(req),
    }).lean();
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const messages = await WpChatMessage.find({ conversationId: convo._id })
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    res.json({ success: true, conversation: convo, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** POST /wp-marketing/chatbot/conversations/:id/reply — manual agent reply */
export const replyConversation = async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'text is required' });

    const convo = await WpChatConversation.findOne({
      _id: req.params.id,
      clientId: clientId(req),
    });
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const phone = convo.contactPhone.startsWith('+') ? convo.contactPhone : `+${convo.contactPhone}`;
    let wamid = null;
    try {
      const result = await bot.sendText({
        recipientPhone: phone,
        recipientName: convo.contactName || undefined,
        messageContent: text,
      });
      wamid = result?.payload?.messageId || result?.messageId || null;
    } catch (err) {
      return res.status(502).json({ error: err.message || 'Send failed' });
    }

    convo.lastMessage = text.slice(0, 280);
    convo.lastDirection = 'outbound';
    convo.lastMessageAt = new Date();
    convo.messageCount += 1;
    convo.botReplies += 1;
    await convo.save();

    const msg = await WpChatMessage.create({
      clientId: clientId(req),
      conversationId: convo._id,
      direction: 'outbound',
      text,
      matchedAction: 'manual',
      wamid,
    });

    await WpChatbotBrain.updateOne(
      { clientId: clientId(req) },
      { $inc: { 'stats.messagesSent': 1 }, $set: { updatedAt: new Date() } },
    );

    res.json({ success: true, message: msg, conversation: convo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
