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
import { REAL_WEBHOOK_QUERY } from '../services/wpWebhookVerify.js';
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
    const [lastAny, lastInbound, lastRejected, recent, lastInboundMsg, lastOutboundMsg, convoCount] = await Promise.all([
      WpWebhookEvent.findOne(REAL_WEBHOOK_QUERY).sort({ createdAt: -1 }).lean(),
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
      receiving: !!(lastInbound?.createdAt && (Date.now() - new Date(lastInbound.createdAt).getTime()) < 7 * 24 * 3600 * 1000),
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

    const [lastAny, eventCount, realEventCount, cbStatus] = await Promise.all([
      WpWebhookEvent.findOne(REAL_WEBHOOK_QUERY).sort({ createdAt: -1 }).lean(),
      WpWebhookEvent.countDocuments(),
      WpWebhookEvent.countDocuments(REAL_WEBHOOK_QUERY),
      bot.testConnection().catch((err) => ({ connected: false, error: err.message })),
    ]);

    // Self-test: POST to our own public webhook URL
    let selfTest = { ok: false, error: 'not run' };
    try {
      const pingBody = JSON.stringify({
        event: 'incoming_message',
        meta_raw: {},
        meta_contacts: [],
        meta_metadata: {},
        processed: {
          message_id: `wamid.VERIFY_${Date.now()}`,
          from: '+919999999999',
          type: 'text',
          text: '__picoso_webhook_verify__',
          timestamp: new Date().toISOString(),
          media: { id: null, url: null },
        },
        system: { received_at: new Date().toISOString(), source: 'self_verify' },
      });
      const pingRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Verify': 'picoso-self-test' },
        body: pingBody,
      });
      const pingText = await pingRes.text();
      selfTest = {
        ok: pingRes.status >= 200 && pingRes.status < 300,
        status: pingRes.status,
        url: webhookUrl,
        responsePreview: pingText.slice(0, 300),
      };
    } catch (err) {
      selfTest = { ok: false, error: err.message, url: webhookUrl };
    }

    const causes = analyzeRootCause({
      diagnostics: getWebhookDiagnostics(),
      lastWebhookAt: lastAny?.createdAt,
      sync,
      cbConnected: cbStatus?.connected,
    });

    const diag = getWebhookDiagnostics();
    const checklist = [
      {
        id: 'endpoint_live',
        label: 'Webhook endpoint reachable (self-test)',
        pass: selfTest.ok,
        detail: selfTest.ok
          ? `POST ${webhookUrl} → HTTP ${selfTest.status} (picoso internal ping — not CampaignBot)`
          : `Failed: ${selfTest.error || selfTest.responsePreview || 'unknown'}`,
      },
      {
        id: 'mongodb',
        label: 'MongoDB real webhook log',
        pass: realEventCount > 0,
        detail: realEventCount > 0
          ? `${realEventCount} real event(s), last at ${lastAny?.createdAt || 'never'}`
          : `${eventCount} total stored (${eventCount - realEventCount} self-test filtered out) — no real CampaignBot traffic logged`,
      },
      {
        id: 'post_received',
        label: 'Real POST from CampaignBot hit server',
        pass: diag.totalRealPosts > 0 && !diag.realPostStale,
        detail: diag.totalRealPosts > 0
          ? `${diag.totalRealPosts} real POST(s), last ${diag.lastRealPostAt} from ${diag.lastRealPostIp}`
          : diag.totalVerifyPosts > 0
            ? `Only ${diag.totalVerifyPosts} self-test POST(s) — no CampaignBot traffic yet`
            : 'No POST ever recorded in this server process',
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
        pass: !diag.realPostStale && diag.totalRealPosts > 0,
        detail: diag.totalRealPosts === 0
          ? 'No real WhatsApp webhook ever received — configure webhook in CampaignBot dashboard'
          : diag.realPostStale
            ? `No real CampaignBot POST in ${diag.minutesSinceLastRealPost ?? '?'} min — YOUR MESSAGES ARE NOT REACHING PICOSO`
            : `Last real webhook: ${diag.lastRealPostAt} from ${diag.lastRealPostIp}`,
      },
    ];

    res.json({
      success: true,
      serverNow: new Date().toISOString(),
      webhookUrl,
      altUrl,
      diagnostics: diag,
      sync,
      selfTest,
      checklist,
      rootCauses: causes,
      campaignBotApi: cbStatus,
      mongo: {
        totalEvents: eventCount,
        realEvents: realEventCount,
        lastRealEventAt: lastAny?.createdAt || null,
        lastEvent: lastAny?.event || null,
        lastNote: lastAny?.note || null,
      },
      realCause: causes.find((c) => c.severity === 'critical') || causes[0] || null,
      instructions: [
        '1. In CampaignBot dashboard set webhook URL exactly to: ' + webhookUrl,
        '2. Enable incoming_message webhook events',
        '3. Send a WhatsApp message to your business number (+91 81670 80111)',
        '4. Click Run verification — "Real POST from CampaignBot" must show a new hit within seconds',
        '5. Self-test passing only proves picoso.in works — if step 4 fails, CampaignBot is NOT firing webhooks',
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
    const events = await WpWebhookEvent.find(REAL_WEBHOOK_QUERY)
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
