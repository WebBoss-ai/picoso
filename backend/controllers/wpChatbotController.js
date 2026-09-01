/**
 * WP Marketing Chatbot — brain CRUD + inbox APIs.
 */

import {
  WpChatbotBrain,
  WpChatConversation,
  WpChatMessage,
  WpWebhookEvent,
} from '../models/wpMarketingModels.js';
import { getOrCreateBrain, handleInboundChat } from '../services/wpChatbot.js';
import { chatbotBus } from '../services/wpChatbotBus.js';
import {
  getInboundSyncState,
  registerWebhookWithCampaignBot,
  syncInboundMessages,
} from '../services/wpInboundSync.js';
import {
  analyzeRootCause,
  getWebhookDiagnostics,
} from '../services/wpWebhookDiagnostics.js';
import { REAL_WEBHOOK_QUERY, CAMPAIGNBOT_TRAFFIC_QUERY } from '../services/wpWebhookVerify.js';
import { runLocalWebhookSelfTest } from '../services/wpWebhookSelfTest.js';
import { getWebhookSecretCandidates } from '../services/wpWebhookSignature.js';
import { hydrateDiagnosticsFromEvent } from '../services/wpWebhookDiagnostics.js';
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

    // Do not truncate a conversation. CampaignBot can deliver messages in
    // bursts, and the inbox must expose the complete stored history.
    const messages = await WpChatMessage.find({ conversationId: convo._id })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    res.json({ success: true, conversation: convo, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /wp-marketing/chatbot/webhook-status */
export const getWebhookStatus = async (req, res) => {
  try {
    const cid = clientId(req);
    const [lastAny, lastCampaignBot, lastInbound, lastRejected, recent, lastInboundMsg, lastOutboundMsg, convoCount] = await Promise.all([
      WpWebhookEvent.findOne(REAL_WEBHOOK_QUERY).sort({ createdAt: -1 }).lean(),
      WpWebhookEvent.findOne(CAMPAIGNBOT_TRAFFIC_QUERY).sort({ createdAt: -1 }).lean(),
      WpWebhookEvent.findOne({ ...REAL_WEBHOOK_QUERY, event: 'incoming_message' }).sort({ createdAt: -1 }).lean(),
      WpWebhookEvent.findOne({ ...REAL_WEBHOOK_QUERY, ok: false }).sort({ createdAt: -1 }).lean(),
      WpWebhookEvent.find(REAL_WEBHOOK_QUERY).sort({ createdAt: -1 }).limit(25).lean(),
      WpChatMessage.findOne({ clientId: cid, direction: 'inbound' }).sort({ createdAt: -1 }).lean(),
      WpChatMessage.findOne({ clientId: cid, direction: 'outbound' }).sort({ createdAt: -1 }).lean(),
      WpChatConversation.countDocuments({ clientId: cid }),
    ]);
    const webhookUrl = bot.getPublicWebhookUrl();
    const serverNow = new Date().toISOString();
    const sync = getInboundSyncState();
    const diagnostics = getWebhookDiagnostics();
    const lastWebhookMs = lastAny?.createdAt ? Date.now() - new Date(lastAny.createdAt).getTime() : null;
    const minutesSinceLastWebhook = lastWebhookMs != null ? Math.floor(lastWebhookMs / 60000) : null;
    const webhookStale = diagnostics.realPostStale;

    res.json({
      success: true,
      serverNow,
      webhookUrl,
      webhookUrls: sync.webhookUrls || [webhookUrl],
      minutesSinceLastWebhook,
      webhookStale,
      inboundSync: sync,
      webhookDiagnostics: getWebhookDiagnostics(),
      lastWebhookAt: lastAny?.createdAt || null,
      lastInboundAt: lastInbound?.createdAt || null,
      lastEvent: lastAny?.event || null,
      lastRequestId: lastAny?.requestId || null,
      lastProcessing: lastAny?.processing || null,
      lastSignature: lastAny?.signature || null,
      lastParsed: lastAny?.parsed ?? null,
      lastInboundRequestId: lastInbound?.requestId || null,
      lastInboundProcessing: lastInbound?.processing || null,
      lastInboundSignature: lastInbound?.signature || null,
      lastInboundParsed: lastInbound?.parsed ?? null,
      lastInboundSavedAt: lastInboundMsg?.createdAt || null,
      lastInboundSavedText: lastInboundMsg?.text?.slice(0, 120) || null,
      lastOutboundReplyAt: lastOutboundMsg?.createdAt || null,
      lastOutboundReplyText: lastOutboundMsg?.text?.slice(0, 120) || null,
      lastOutboundAction: lastOutboundMsg?.matchedAction || null,
      conversationCount: convoCount,
      lastRejectedAt: lastRejected?.createdAt || null,
      lastRejectedNote: lastRejected?.note || null,
      lastRejectedPayload: lastRejected?.payloadPreview || null,
      lastRejectedRawBody: lastRejected?.rawBodyPreview || null,
      lastRejectedDebugTrace: lastRejected?.debugTrace || null,
      lastCampaignBotWebhookAt: lastCampaignBot?.createdAt || null,
      lastCampaignBotWebhookNote: lastCampaignBot?.note || null,
      webhookSecretConfigured: getWebhookSecretCandidates().length > 0,
      receiving: !!(lastCampaignBot?.createdAt && (Date.now() - new Date(lastCampaignBot.createdAt).getTime()) < 7 * 24 * 3600 * 1000),
      note: webhookStale
        ? `CampaignBot has not POSTed a real WhatsApp webhook in ${diagnostics.minutesSinceLastRealPost ?? minutesSinceLastWebhook ?? '?'} minutes. Active sync poller is running every 15s as backup.`
        : 'CampaignBot POSTs incoming_message here. Valid requests return HTTP 200 immediately, then process async.',
      recent: recent.map((e) => ({
        id: e._id,
        event: e.event,
        from: e.from,
        text: e.text,
        ok: e.ok,
        note: e.note,
        requestId: e.requestId,
        processing: e.processing,
        signature: e.signature,
        parsed: e.parsed,
        rawBodyLength: e.rawBodyLength,
        payloadPreview: e.payloadPreview,
        rawBodyPreview: e.rawBodyPreview,
        debugTrace: e.debugTrace,
        at: e.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /wp-marketing/chatbot/webhook-verify — full diagnostic + root cause */
export const verifyWebhook = async (req, res) => {
  try {
    const sync = getInboundSyncState();
    const webhookUrl = bot.getPublicWebhookUrl();
    const altUrl = webhookUrl.includes('/api/webhooks')
      ? webhookUrl.replace('/api/webhooks', '/webhooks')
      : webhookUrl.replace('/webhooks', '/api/webhooks');

    const [lastAny, lastCampaignBot, eventCount, realEventCount, cbTrafficCount, cbStatus] = await Promise.all([
      WpWebhookEvent.findOne(REAL_WEBHOOK_QUERY).sort({ createdAt: -1 }).lean(),
      WpWebhookEvent.findOne(CAMPAIGNBOT_TRAFFIC_QUERY).sort({ createdAt: -1 }).lean(),
      WpWebhookEvent.countDocuments(),
      WpWebhookEvent.countDocuments(REAL_WEBHOOK_QUERY),
      WpWebhookEvent.countDocuments(CAMPAIGNBOT_TRAFFIC_QUERY),
      bot.testConnection().catch((err) => ({ connected: false, error: err.message })),
    ]);

    const selfTest = runLocalWebhookSelfTest();
    const secrets = getWebhookSecretCandidates();

    const diag = getWebhookDiagnostics();
    if (lastCampaignBot?.createdAt && diag.totalRealPosts === 0) {
      hydrateDiagnosticsFromEvent(lastCampaignBot);
    }
    const diagFinal = getWebhookDiagnostics();

    const causes = analyzeRootCause({
      diagnostics: diagFinal,
      lastWebhookAt: lastCampaignBot?.createdAt,
      sync,
      cbConnected: cbStatus?.connected,
    });

    const checklist = [
      {
        id: 'endpoint_live',
        label: 'Webhook parser + endpoint logic (local test)',
        pass: selfTest.ok,
        detail: selfTest.ok
          ? `${selfTest.detail} — no HTTP ping (does not count as CampaignBot traffic)`
          : `Local test failed: ${selfTest.detail || 'unknown'}`,
      },
      {
        id: 'webhook_secret',
        label: 'Webhook signing secret configured',
        pass: secrets.length > 0,
        detail: process.env.CAMPAIGNBOT_WEBHOOK_SECRET
          ? 'CAMPAIGNBOT_WEBHOOK_SECRET is set — overview ping signatures can be verified'
          : 'Set CAMPAIGNBOT_WEBHOOK_SECRET to your CampaignBot "client webhook secret key" (falls back to API key)',
      },
      {
        id: 'signature_math',
        label: 'HMAC-SHA256 signature verification',
        pass: selfTest.signatureMathOk,
        detail: selfTest.signatureMathOk
          ? 'Signature round-trip OK (sha256= prefix, raw body)'
          : 'Signature check failed — set CAMPAIGNBOT_WEBHOOK_SECRET from CampaignBot dashboard',
      },
      {
        id: 'mongodb',
        label: 'MongoDB CampaignBot traffic log',
        pass: cbTrafficCount > 0,
        detail: cbTrafficCount > 0
          ? `${cbTrafficCount} CampaignBot event(s), last at ${lastCampaignBot?.createdAt || 'never'}`
          : `${realEventCount} non-verify event(s) but all are manual probes — no CampaignBot WhatsApp traffic yet`,
      },
      {
        id: 'post_received',
        label: 'Real POST from CampaignBot hit server',
        pass: diagFinal.totalRealPosts > 0 && !diagFinal.realPostStale,
        detail: diagFinal.totalRealPosts > 0
          ? `${diagFinal.totalRealPosts} real POST(s), last ${diagFinal.lastRealPostAt} from ${diagFinal.lastRealPostIp}`
          : lastCampaignBot?.createdAt
            ? `No POST since server boot — last CampaignBot event in DB: ${lastCampaignBot.createdAt}`
            : 'No CampaignBot POST ever recorded',
      },
      {
        id: 'campaignbot_api',
        label: 'CampaignBot API connected',
        pass: !!cbStatus?.connected,
        detail: cbStatus?.connected
          ? `Templates API OK (${cbStatus.templateCount ?? 0} templates)`
          : (cbStatus?.error || 'API access denied — check CAMPAIGNBOT_API_KEY'),
      },
      {
        id: 'campaignbot_delivering',
        label: 'CampaignBot delivering real WhatsApp webhooks',
        pass: cbTrafficCount > 0 && !diagFinal.realPostStale,
        detail: cbTrafficCount === 0
          ? 'No CampaignBot WhatsApp webhook ever logged (Aug 31 empty processed may be only attempt)'
          : diagFinal.realPostStale
            ? `No real CampaignBot POST in ${diagFinal.minutesSinceLastRealPost ?? '?'} min`
            : `Last CampaignBot webhook: ${lastCampaignBot?.createdAt}`,
      },
    ];

    res.json({
      success: true,
      serverNow: new Date().toISOString(),
      webhookUrl,
      altUrl,
      diagnostics: diagFinal,
      sync,
      selfTest,
      webhookSecrets: {
        configured: secrets.length,
        webhookSecretEnvSet: !!process.env.CAMPAIGNBOT_WEBHOOK_SECRET,
        apiKeyFallback: !!process.env.CAMPAIGNBOT_API_KEY,
      },
      checklist,
      rootCauses: causes,
      campaignBotApi: cbStatus,
      mongo: {
        totalEvents: eventCount,
        realEvents: realEventCount,
        campaignBotEvents: cbTrafficCount,
        lastCampaignBotEventAt: lastCampaignBot?.createdAt || null,
        lastRealEventAt: lastAny?.createdAt || null,
        lastEvent: lastAny?.event || null,
        lastNote: lastAny?.note || null,
      },
      realCause: causes.find((c) => c.severity === 'critical') || causes[0] || null,
      instructions: [
        '1. In CampaignBot dashboard set webhook URL exactly to: ' + webhookUrl,
        '2. Copy "client webhook secret key" into server env as CAMPAIGNBOT_WEBHOOK_SECRET',
        '3. Enable incoming_message webhook events and save (CampaignBot sends a signed overview ping)',
        '4. Send a WhatsApp message to +91 81670 80111',
        '5. Click Run verification — "Real POST from CampaignBot" must update within seconds',
        '6. If step 5 fails, contact CampaignBot support — their dashboard webhook is not firing',
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** POST /wp-marketing/chatbot/sync-inbound — force poll CampaignBot now */
export const syncInbound = async (req, res) => {
  try {
    const result = await syncInboundMessages();
    res.json({ success: true, result, sync: getInboundSyncState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** POST /wp-marketing/chatbot/register-webhook — try to register webhook URL with CampaignBot */
export const registerWebhook = async (req, res) => {
  try {
    const result = await registerWebhookWithCampaignBot();
    res.json({ success: true, result, sync: getInboundSyncState() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /wp-marketing/chatbot/webhook-debug — full trace for support */
export const getWebhookDebug = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const events = await WpWebhookEvent.find(CAMPAIGNBOT_TRAFFIC_QUERY)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      serverNow: new Date().toISOString(),
      webhookUrl: bot.getPublicWebhookUrl(),
      count: events.length,
      events: events.map((e) => ({
        id: e._id,
        requestId: e.requestId,
        event: e.event,
        from: e.from,
        text: e.text,
        ok: e.ok,
        note: e.note,
        processing: e.processing,
        signature: e.signature,
        parsed: e.parsed,
        rawBodyLength: e.rawBodyLength,
        payloadPreview: e.payloadPreview,
        rawBodyPreview: e.rawBodyPreview,
        debugTrace: e.debugTrace,
        headers: e.headers,
        at: e.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /wp-marketing/chatbot/events — SSE live stream (pass ?pin=) */
export const streamEvents = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'identity');
  if (res.flushHeaders) res.flushHeaders();

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  // Force proxies (nginx, cloudflare) to flush immediately.
  res.write(': stream-open\n\n');
  send({ type: 'connected', at: new Date().toISOString() });

  const onChat = (payload) => send(payload);
  chatbotBus.on('chat', onChat);

  const heartbeat = setInterval(() => {
    send({ type: 'heartbeat', at: new Date().toISOString() });
  }, 10000);

  req.on('close', () => {
    clearInterval(heartbeat);
    chatbotBus.off('chat', onChat);
  });
};

/** POST /wp-marketing/chatbot/simulate — fire a fake inbound for testing */
export const simulateInbound = async (req, res) => {
  try {
    const phone = String(req.body?.phone || '').trim();
    const text = String(req.body?.text || 'hi').trim();
    const name = String(req.body?.name || 'Test User').trim();
    if (!phone) return res.status(400).json({ error: 'phone is required e.g. +918167080111' });

    const result = await handleInboundChat({ from: phone, text, name });
    res.json({ success: true, result });
  } catch (err) {
    console.error('[WP Chatbot] simulate failed:', err.message);
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

    const digits = String(convo.contactPhone).replace(/\D/g, '');
    const phone = digits.length === 10 ? `+91${digits}` : (digits.startsWith('+') ? digits : `+${digits}`);
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
      messageType: 'text',
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
