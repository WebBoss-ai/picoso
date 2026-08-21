/**
 * WhatsApp chatbot brain — match inbound text to FAQs / quick actions / menu
 * and reply immediately via CampaignBot.
 */

import * as bot from './campaignBot.js';
import {
  WpChatbotBrain,
  WpChatConversation,
  WpChatMessage,
  WpClient,
} from '../models/wpMarketingModels.js';

function norm(s = '') {
  return String(s).toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function phoneDigits(phone = '') {
  return String(phone).replace(/\D/g, '');
}

function scoreMatch(haystack, needle) {
  if (!needle) return 0;
  if (haystack === needle) return 100;
  if (haystack.includes(needle)) return 80;
  const parts = needle.split(' ').filter((w) => w.length > 2);
  if (!parts.length) return 0;
  const hits = parts.filter((w) => haystack.includes(w)).length;
  return Math.round((hits / parts.length) * 60);
}

export async function getOrCreateBrain(clientId) {
  let brain = await WpChatbotBrain.findOne({ clientId });
  if (brain) return brain;

  const client = await WpClient.findById(clientId).lean();
  brain = await WpChatbotBrain.create({
    clientId,
    enabled: true,
    business: {
      name:  client?.workspace?.businessName || client?.name || 'Our business',
      about: client?.workspace?.posterDesign?.businessDescription || '',
      tone:  'friendly, concise, helpful',
    },
  });
  return brain;
}

function buildMenuText(brain) {
  const products = brain.products || [];
  if (!products.length) {
    return brain.fallbackMessage || 'Menu is being updated. Ask us anything else!';
  }
  const byCat = {};
  for (const p of products) {
    const cat = p.category || 'Menu';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(p);
  }
  const biz = brain.business?.name || 'Menu';
  const lines = [`*${biz} — Menu*`, ''];
  for (const [cat, items] of Object.entries(byCat)) {
    lines.push(`*${cat}*`);
    for (const item of items) {
      const price = item.price ? ` — ${item.price}` : '';
      lines.push(`• ${item.name}${price}`);
      if (item.description) lines.push(`  _${item.description}_`);
    }
    lines.push('');
  }
  lines.push('Reply with a dish name for details.');
  return lines.join('\n').trim();
}

function buildActionResponse(brain, action) {
  const b = brain.business || {};
  switch (action.type) {
    case 'menu':
      return buildMenuText(brain);
    case 'hours':
      return action.response || (b.hours ? `*Hours*\n${b.hours}` : 'Hours not set yet.');
    case 'location':
      return action.response || (b.location ? `*Location*\n${b.location}` : 'Location not set yet.');
    case 'contact': {
      const bits = [];
      if (b.phone) bits.push(`Phone: ${b.phone}`);
      if (b.website) bits.push(`Web: ${b.website}`);
      return action.response || (bits.length ? `*Contact*\n${bits.join('\n')}` : 'Contact details not set yet.');
    }
    case 'faq_list': {
      const faqs = brain.faqs || [];
      if (!faqs.length) return 'No FAQs yet.';
      return ['*Quick answers*', ...faqs.slice(0, 8).map((f, i) => `${i + 1}. ${f.question}`)].join('\n');
    }
    case 'custom':
    default:
      return action.response || brain.fallbackMessage;
  }
}

export function resolveReply(brain, inboundText) {
  const text = norm(inboundText);
  if (!text) {
    return { text: brain.welcomeMessage, matchedAction: 'welcome' };
  }

  // Greetings → welcome
  if (/^(hi|hello|hey|hii|hola|namaste|good (morning|afternoon|evening))\b/.test(text)) {
    return { text: brain.welcomeMessage, matchedAction: 'greeting' };
  }

  // Help / options
  if (/^(help|options|start)$/.test(text)) {
    const labels = (brain.actions || []).filter((a) => a.enabled).map((a) => `• ${a.label}`).join('\n');
    return {
      text: `Here's what I can help with:\n${labels || '• Ask a question'}\n\nOr just type your question.`,
      matchedAction: 'help',
    };
  }

  // Quick actions by trigger
  let bestAction = null;
  let bestScore = 0;
  for (const action of brain.actions || []) {
    if (!action.enabled) continue;
    const triggers = [
      ...(action.triggers || []),
      action.label,
    ].map(norm).filter(Boolean);
    for (const t of triggers) {
      const s = scoreMatch(text, t);
      if (s > bestScore) {
        bestScore = s;
        bestAction = action;
      }
    }
  }
  if (bestAction && bestScore >= 50) {
    return {
      text: buildActionResponse(brain, bestAction),
      matchedAction: bestAction.label,
    };
  }

  // Product name match
  let bestProduct = null;
  let productScore = 0;
  for (const p of brain.products || []) {
    const s = Math.max(scoreMatch(text, norm(p.name)), ...(p.tags || []).map((t) => scoreMatch(text, norm(t))));
    if (s > productScore) {
      productScore = s;
      bestProduct = p;
    }
  }
  if (bestProduct && productScore >= 55) {
    const price = bestProduct.price ? `\nPrice: ${bestProduct.price}` : '';
    const desc = bestProduct.description ? `\n${bestProduct.description}` : '';
    return {
      text: `*${bestProduct.name}*${price}${desc}\n\nReply *menu* to see more.`,
      matchedAction: `product:${bestProduct.name}`,
    };
  }

  // FAQ match
  let bestFaq = null;
  let faqScore = 0;
  for (const faq of brain.faqs || []) {
    const keys = [faq.question, ...(faq.keywords || [])].map(norm);
    const s = Math.max(...keys.map((k) => scoreMatch(text, k)), scoreMatch(norm(faq.answer), text) > 40 ? 30 : 0);
    if (s > faqScore) {
      faqScore = s;
      bestFaq = faq;
    }
  }
  if (bestFaq && faqScore >= 45) {
    return { text: bestFaq.answer, matchedAction: `faq:${bestFaq.question.slice(0, 40)}` };
  }

  // Soft business about
  if (/who are you|about (you|us|picoso)|what (is|do) you/.test(text) && brain.business?.about) {
    return {
      text: `*${brain.business.name || 'About us'}*\n${brain.business.about}`,
      matchedAction: 'about',
    };
  }

  return { text: brain.fallbackMessage, matchedAction: 'fallback' };
}

async function upsertConversation(clientId, contactPhone, contactName, lastMessage, direction) {
  const phone = phoneDigits(contactPhone);
  const existing = await WpChatConversation.findOne({ clientId, contactPhone: phone });
  const isNew = !existing;

  const convo = await WpChatConversation.findOneAndUpdate(
    { clientId, contactPhone: phone },
    {
      $set: {
        contactName: contactName || existing?.contactName || '',
        lastMessage: String(lastMessage || '').slice(0, 280),
        lastDirection: direction,
        lastMessageAt: new Date(),
        status: 'open',
      },
      $inc: { messageCount: 1, ...(direction === 'outbound' ? { botReplies: 1 } : {}) },
      $setOnInsert: { clientId, contactPhone: phone, createdAt: new Date() },
    },
    { upsert: true, new: true },
  );

  return { convo, isNew };
}

/**
 * Handle an inbound WhatsApp message for any enabled chatbot brain.
 * Called from the CampaignBot webhook — must be fast & non-throwing to caller.
 */
export async function handleInboundChat({ from, text, name }) {
  const phone = phoneDigits(from);
  if (!phone) return null;

  // Prefer enabled brains; fall back to any brain if only one workspace
  let brain = await WpChatbotBrain.findOne({ enabled: true }).sort({ updatedAt: -1 });
  if (!brain) {
    brain = await WpChatbotBrain.findOne().sort({ updatedAt: -1 });
  }
  if (!brain || !brain.enabled) return null;

  const clientId = brain.clientId;
  const inboundText = String(text || '').trim();

  const { convo } = await upsertConversation(clientId, phone, name || '', inboundText, 'inbound');

  await WpChatMessage.create({
    clientId,
    conversationId: convo._id,
    direction: 'inbound',
    text: inboundText,
  });

  await WpChatbotBrain.updateOne(
    { _id: brain._id },
    { $inc: { 'stats.messagesReceived': 1 } },
  );

  const reply = resolveReply(brain, inboundText);

  let wamid = null;
  const toPhone = phone.length === 10 ? `+91${phone}` : (phone.startsWith('+') ? phone : `+${phone}`);
  try {
    const result = await bot.sendText({
      recipientPhone: toPhone,
      recipientName: name || undefined,
      messageContent: reply.text,
    });
    wamid = result?.payload?.messageId || result?.messageId || null;
  } catch (err) {
    console.error('[WP Chatbot] send failed:', err.message);
  }

  await upsertConversation(clientId, phone, name || '', reply.text, 'outbound');

  await WpChatMessage.create({
    clientId,
    conversationId: convo._id,
    direction: 'outbound',
    text: reply.text,
    matchedAction: reply.matchedAction,
    wamid,
  });

  const contactCount = await WpChatConversation.countDocuments({ clientId });
  await WpChatbotBrain.updateOne(
    { _id: brain._id },
    {
      $inc: { 'stats.messagesSent': 1 },
      $set: { 'stats.contactsContacted': contactCount, updatedAt: new Date() },
    },
  );

  return { reply: reply.text, matchedAction: reply.matchedAction, conversationId: convo._id };
}
