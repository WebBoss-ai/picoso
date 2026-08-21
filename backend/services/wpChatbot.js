/**
 * WhatsApp chatbot — keyword actions + Cohere LLM replies.
 * Replies immediately on inbound webhook events.
 */

import * as bot from './campaignBot.js';
import { CohereProvider } from '../llm/provider/cohere.js';
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

function toE164(phone) {
  const d = phoneDigits(phone);
  if (!d) return null;
  if (d.length === 10) return `+91${d}`;
  if (d.startsWith('91') && d.length === 12) return `+${d}`;
  return d.startsWith('+') ? d : `+${d}`;
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

/** Ensure a brain exists for this client (or the first active client). */
export async function getOrCreateBrain(clientId) {
  let brain = clientId ? await WpChatbotBrain.findOne({ clientId }) : null;
  if (brain) return brain;

  let client = clientId ? await WpClient.findById(clientId) : null;
  if (!client) {
    client = await WpClient.findOne({ active: true }).sort({ createdAt: 1 });
  }
  if (!client) throw new Error('No WP Marketing client found — cannot create chatbot brain');

  brain = await WpChatbotBrain.findOne({ clientId: client._id });
  if (brain) return brain;

  brain = await WpChatbotBrain.create({
    clientId: client._id,
    enabled: true,
    business: {
      name:  client.workspace?.businessName || client.name || 'Picoso',
      about: client.workspace?.posterDesign?.businessDescription
        || 'Picoso — fresh, healthy food delivered fast.',
      tone:  'friendly, warm, concise, helpful',
      hours: '10:00 AM – 10:00 PM',
      website: 'https://picoso.in',
      phone: '+91 81670 80111',
    },
    welcomeMessage:
      'Hi! Welcome to *Picoso* 🌿\nHealthy meals, snacks & more — delivered fast.\n\nReply *menu* to see options, or just ask me anything!',
    fallbackMessage:
      "Hmm, I'm not sure about that. Reply *menu* for our dishes, *hours* for timings, or ask another way!",
  });

  console.log(`[WP Chatbot] created brain for client ${client.slug || client._id}`);
  return brain;
}

export async function ensureDefaultBrain() {
  try {
    const existing = await WpChatbotBrain.findOne().sort({ updatedAt: -1 });
    if (existing) {
      if (!existing.enabled) {
        existing.enabled = true;
        await existing.save();
        console.log('[WP Chatbot] re-enabled existing brain');
      }
      return existing;
    }
    return await getOrCreateBrain(null);
  } catch (err) {
    console.error('[WP Chatbot] ensureDefaultBrain failed:', err.message);
    return null;
  }
}

function buildMenuText(brain) {
  const products = brain.products || [];
  if (!products.length) {
    return 'Our full menu is on https://picoso.in — tell me what you\'re craving and I\'ll help!';
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
      return action.response || (b.hours ? `*Hours*\n${b.hours}` : 'Hours not set yet — check picoso.in');
    case 'location':
      return action.response || (b.location ? `*Location*\n${b.location}` : 'We deliver across our serviceable areas. Share your locality?');
    case 'contact': {
      const bits = [];
      if (b.phone) bits.push(`Phone: ${b.phone}`);
      if (b.website) bits.push(`Web: ${b.website}`);
      return action.response || (bits.length ? `*Contact*\n${bits.join('\n')}` : 'Reach us at https://picoso.in');
    }
    case 'faq_list': {
      const faqs = brain.faqs || [];
      if (!faqs.length) return 'Ask me anything about our food, delivery, or offers!';
      return ['*Quick answers*', ...faqs.slice(0, 8).map((f, i) => `${i + 1}. ${f.question}`)].join('\n');
    }
    case 'custom':
    default:
      return action.response || brain.fallbackMessage;
  }
}

/** Deterministic fast path — menu / hours / exact FAQ. Returns null to fall through to LLM. */
export function resolveFastReply(brain, inboundText) {
  const text = norm(inboundText);
  if (!text) {
    return { text: brain.welcomeMessage, matchedAction: 'welcome' };
  }

  if (/^(help|options|start)$/.test(text)) {
    const labels = (brain.actions || []).filter((a) => a.enabled).map((a) => `• ${a.label}`).join('\n');
    return {
      text: `Here's what I can help with:\n${labels || '• Ask a question'}\n\nOr just type your question.`,
      matchedAction: 'help',
    };
  }

  let bestAction = null;
  let bestScore = 0;
  for (const action of brain.actions || []) {
    if (!action.enabled) continue;
    const triggers = [...(action.triggers || []), action.label].map(norm).filter(Boolean);
    for (const t of triggers) {
      const s = scoreMatch(text, t);
      if (s > bestScore) {
        bestScore = s;
        bestAction = action;
      }
    }
  }
  if (bestAction && bestScore >= 70) {
    return { text: buildActionResponse(brain, bestAction), matchedAction: bestAction.label };
  }

  let bestProduct = null;
  let productScore = 0;
  for (const p of brain.products || []) {
    const tagScores = (p.tags || []).map((t) => scoreMatch(text, norm(t)));
    const s = Math.max(scoreMatch(text, norm(p.name)), ...(tagScores.length ? tagScores : [0]));
    if (s > productScore) {
      productScore = s;
      bestProduct = p;
    }
  }
  if (bestProduct && productScore >= 70) {
    const price = bestProduct.price ? `\nPrice: ${bestProduct.price}` : '';
    const desc = bestProduct.description ? `\n${bestProduct.description}` : '';
    return {
      text: `*${bestProduct.name}*${price}${desc}\n\nReply *menu* to see more.`,
      matchedAction: `product:${bestProduct.name}`,
    };
  }

  let bestFaq = null;
  let faqScore = 0;
  for (const faq of brain.faqs || []) {
    const keys = [faq.question, ...(faq.keywords || [])].map(norm);
    const s = Math.max(...keys.map((k) => scoreMatch(text, k)));
    if (s > faqScore) {
      faqScore = s;
      bestFaq = faq;
    }
  }
  if (bestFaq && faqScore >= 65) {
    return { text: bestFaq.answer, matchedAction: `faq:${bestFaq.question.slice(0, 40)}` };
  }

  return null;
}

function buildBrainContext(brain) {
  const b = brain.business || {};
  const products = (brain.products || []).slice(0, 30).map((p) =>
    `- ${p.name}${p.price ? ` (${p.price})` : ''}${p.description ? `: ${p.description}` : ''}`
  ).join('\n');
  const faqs = (brain.faqs || []).slice(0, 20).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
  const actions = (brain.actions || []).filter((a) => a.enabled).map((a) => a.label).join(', ');

  return `
Business name: ${b.name || 'Picoso'}
About: ${b.about || ''}
Tone: ${b.tone || 'friendly, concise'}
Hours: ${b.hours || ''}
Location: ${b.location || ''}
Phone: ${b.phone || ''}
Website: ${b.website || 'https://picoso.in'}
Extra notes: ${b.extraNotes || ''}

Quick actions customers can ask for: ${actions || 'menu, hours, contact'}

Products / menu:
${products || '(none listed — suggest visiting the website)'}

FAQs:
${faqs || '(none)'}
`.trim();
}

async function llmReply(brain, inboundText, recentMessages = []) {
  const llm = new CohereProvider({ maxTokens: 350, timeoutMs: 12000 });
  if (!llm.apiKey) {
    console.warn('[WP Chatbot] COHERE_API_KEY missing — using fallback');
    return null;
  }

  const history = recentMessages.slice(-8).map((m) => ({
    role: m.direction === 'outbound' ? 'assistant' : 'user',
    content: m.text || '',
  })).filter((m) => m.content);

  const system = `You are the official WhatsApp chatbot for ${brain.business?.name || 'Picoso'}.
Reply in short WhatsApp style (1–4 short lines). Use *bold* sparingly. No markdown tables.
Be ${brain.business?.tone || 'friendly and concise'}.
If asked for menu and products exist in context, list them briefly.
If you don't know something, say so briefly and offer menu / hours / website.
Never invent prices that contradict the brain context.
Never mention you are an AI model unless asked.

BRAIN CONTEXT:
${buildBrainContext(brain)}`;

  const messages = [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: inboundText || 'hi' },
  ];

  const result = await llm.chat({ messages, temperature: 0.4 });
  const text = String(result?.text || '').trim();
  if (!text) return null;
  return text.slice(0, 1500);
}

async function upsertConversation(clientId, contactPhone, contactName, lastMessage, direction) {
  const phone = phoneDigits(contactPhone);
  const existing = await WpChatConversation.findOne({ clientId, contactPhone: phone });

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

  return { convo, isNew: !existing };
}

/**
 * Handle inbound WhatsApp message — always tries to reply.
 */
export async function handleInboundChat({ from, text, name, messageId }) {
  const phone = phoneDigits(from);
  if (!phone) {
    console.warn('[WP Chatbot] no phone on inbound');
    return null;
  }

  let brain = await WpChatbotBrain.findOne({ enabled: true }).sort({ updatedAt: -1 });
  if (!brain) brain = await ensureDefaultBrain();
  if (!brain) {
    console.error('[WP Chatbot] no brain available');
    return { error: 'no_brain' };
  }
  if (!brain.enabled) {
    brain.enabled = true;
    await brain.save();
  }

  const clientId = brain.clientId;
  const inboundText = String(text || '').trim();
  const toPhone = toE164(from);

  const { convo } = await upsertConversation(clientId, phone, name || '', inboundText, 'inbound');

  await WpChatMessage.create({
    clientId,
    conversationId: convo._id,
    direction: 'inbound',
    text: inboundText,
    wamid: messageId || null,
  });

  await WpChatbotBrain.updateOne({ _id: brain._id }, { $inc: { 'stats.messagesReceived': 1 } });

  // Build reply: fast path → LLM → welcome/fallback
  let reply = resolveFastReply(brain, inboundText);
  if (!reply) {
    try {
      const recent = await WpChatMessage.find({ conversationId: convo._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      const llmText = await llmReply(brain, inboundText || 'hi', recent.reverse());
      if (llmText) {
        reply = { text: llmText, matchedAction: 'llm' };
      }
    } catch (err) {
      console.error('[WP Chatbot] LLM failed:', err.message);
    }
  }
  if (!reply) {
    const isGreeting = /^(hi|hello|hey|hii|hola|namaste|good (morning|afternoon|evening))\b/i.test(inboundText || 'hi');
    reply = {
      text: isGreeting || !inboundText ? brain.welcomeMessage : brain.fallbackMessage,
      matchedAction: isGreeting || !inboundText ? 'greeting' : 'fallback',
    };
  }

  let wamid = null;
  let sendError = null;
  try {
    console.log(`[WP Chatbot] sending to ${toPhone} via=${reply.matchedAction}`);
    const result = await bot.sendText({
      recipientPhone: toPhone,
      recipientName: name || undefined,
      messageContent: reply.text,
    });
    wamid = result?.payload?.messageId
      || result?.payload?.wamid
      || result?.messageId
      || result?.data?.messageId
      || null;
    console.log('[WP Chatbot] send OK', wamid || JSON.stringify(result).slice(0, 200));
  } catch (err) {
    sendError = err.message;
    console.error('[WP Chatbot] send failed:', err.message);
  }

  await upsertConversation(clientId, phone, name || '', reply.text, 'outbound');

  await WpChatMessage.create({
    clientId,
    conversationId: convo._id,
    direction: 'outbound',
    text: reply.text,
    matchedAction: reply.matchedAction + (sendError ? `:error:${sendError.slice(0, 80)}` : ''),
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

  return {
    reply: reply.text,
    matchedAction: reply.matchedAction,
    conversationId: convo._id,
    sendError,
    toPhone,
  };
}
