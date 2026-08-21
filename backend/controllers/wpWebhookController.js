/**
 * CampaignBot Webhook Handler
 *
 * POST /api/webhooks/campaignbot  (also /webhooks/campaignbot)
 * GET  /api/webhooks/campaignbot  — health check (paste in browser to verify)
 */

import crypto from 'crypto';
import {
  WpMessageLog,
  WpExperiment,
  WpWebhookEvent,
} from '../models/wpMarketingModels.js';
import { handleInboundChat } from '../services/wpChatbot.js';
import { emitChatbotEvent } from '../services/wpChatbotBus.js';

const WEBHOOK_SECRETS = [
  process.env.CAMPAIGNBOT_WEBHOOK_SECRET,
  process.env.CAMPAIGNBOT_API_KEY,
  '8c226a84bf474b0dffae2efb7b69f05f3fefada3a16c115ffeb45b7a53cc34ab',
].filter(Boolean);

async function logWebhook({ event, from, text, ok, note, body, headers }) {
  try {
    await WpWebhookEvent.create({
      event: event || '',
      from: from || '',
      text: String(text || '').slice(0, 500),
      ok: ok !== false,
      note: note || '',
      payloadPreview: JSON.stringify(body || {}).slice(0, 2000),
      headers: {
        signature: headers?.['x-webhook-signature'] ? 'present' : 'missing',
        'content-type': headers?.['content-type'] || '',
        'user-agent': headers?.['user-agent'] || '',
      },
    });
    // keep table small
    const old = await WpWebhookEvent.find().sort({ createdAt: -1 }).skip(300).select('_id').lean();
    if (old.length) {
      await WpWebhookEvent.deleteMany({ _id: { $in: old.map((o) => o._id) } });
    }
  } catch (err) {
    console.error('[WP Webhook] log failed:', err.message);
  }
}

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader) return { ok: false, reason: 'missing' };
  const raw = typeof rawBody === 'string' ? rawBody : String(rawBody || '');
  for (const secret of WEBHOOK_SECRETS) {
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(String(signatureHeader));
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return { ok: true };
    } catch { /* next */ }
  }
  return { ok: false, reason: 'mismatch' };
}

function extractInbound(body = {}) {
  if (body.processed?.from) {
    const p = body.processed;
    return {
      from: p.from,
      text: p.text || p.body || p.caption || p.message || '',
      name: p.name || p.profile_name || p.pushName
        || body.meta_contacts?.[0]?.profile?.name
        || body.meta_contacts?.[0]?.wa_id
        || '',
      messageId: p.message_id || p.id || null,
      type: p.type || 'text',
    };
  }

  // Meta-style nested under entry/changes
  try {
    const change = body.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (msg?.from) {
      return {
        from: msg.from.startsWith('+') ? msg.from : `+${msg.from}`,
        text: msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || '',
        name: change?.contacts?.[0]?.profile?.name || '',
        messageId: msg.id || null,
        type: msg.type || 'text',
      };
    }
  } catch { /* ignore */ }

  const msg = body.message || body.data?.message || body.data || {};
  const from = msg.from || msg.sender || body.from || body.sender || body.data?.from;
  if (!from) return null;
  return {
    from,
    text: msg.text || msg.body || msg.message || body.text || '',
    name: msg.name || msg.pushName || '',
    messageId: msg.message_id || msg.id || null,
    type: msg.type || 'text',
  };
}

async function handleMessageStatus(data) {
  const { message_id: wamid, status, recipient, failure } = data || {};
  if (!wamid) return;

  const validStatuses = ['sent', 'delivered', 'read', 'failed'];
  if (!validStatuses.includes(status)) return;

  const updateFields = { status };
  if (status === 'delivered') updateFields.deliveredAt = new Date();
  if (status === 'read')      updateFields.readAt = new Date();
  if (status === 'failed') {
    updateFields.failedAt = new Date();
    updateFields.failureTitle = failure?.title || null;
    updateFields.failureMsg = failure?.message || null;
  }

  let log = await WpMessageLog.findOne({ wamid });
  if (!log && recipient) {
    const phone = String(recipient).replace(/\D/g, '');
    log = await WpMessageLog.findOne({
      contactPhone: { $regex: phone },
      status: { $in: ['queued', 'sent'] },
    }).sort({ createdAt: -1 });
  }
  if (!log) return;

  const ORDER = { queued: 0, sent: 1, delivered: 2, read: 3, failed: -1 };
  if ((ORDER[status] || 0) <= (ORDER[log.status] || 0) && status !== 'failed') return;

  await WpMessageLog.findByIdAndUpdate(log._id, { $set: updateFields });

  if (log.experimentId && log.variantNumber != null) {
    const inc = {};
    if (status === 'delivered') inc['variants.$.metrics.delivered'] = 1;
    if (status === 'read') inc['variants.$.metrics.read'] = 1;
    if (Object.keys(inc).length) {
      await WpExperiment.updateOne(
        { _id: log.experimentId, 'variants.variantNumber': log.variantNumber },
        { $inc: inc },
      );
    }
  }
}

async function handleIncomingMessage(inbound) {
  if (!inbound?.from) {
    console.warn('[WP Webhook] incoming without from');
    return;
  }

  console.log(`[WP Webhook] INBOUND from=${inbound.from} text="${String(inbound.text || '').slice(0, 100)}"`);

  try {
    const result = await handleInboundChat({
      from: inbound.from,
      text: inbound.text,
      name: inbound.name,
      messageId: inbound.messageId,
    });
    emitChatbotEvent({
      type: 'inbound',
      from: inbound.from,
      text: inbound.text,
      reply: result?.reply || null,
      matchedAction: result?.matchedAction || null,
      conversationId: result?.conversationId || null,
      at: new Date().toISOString(),
    });
    console.log(`[WP Webhook] reply via=${result?.matchedAction} err=${result?.sendError || 'none'}`);
  } catch (err) {
    console.error('[WP Webhook] chatbot error:', err.message, err.stack);
    await logWebhook({
      event: 'incoming_message',
      from: inbound.from,
      text: inbound.text,
      ok: false,
      note: `chatbot error: ${err.message}`,
    });
  }

  const phone = String(inbound.from).replace(/\D/g, '');
  if (!phone) return;
  const log = await WpMessageLog.findOne({
    contactPhone: { $regex: phone },
    status: { $in: ['sent', 'delivered', 'read'] },
  }).sort({ createdAt: -1 });
  if (!log) return;
  await WpMessageLog.findByIdAndUpdate(log._id, { $set: { replied: true } });
  if (log.experimentId && log.variantNumber != null) {
    await WpExperiment.updateOne(
      { _id: log.experimentId, 'variants.variantNumber': log.variantNumber },
      { $inc: { 'variants.$.metrics.replies': 1 } },
    );
  }
}

/** GET — health / verify URL is reachable */
export const webhookHealth = async (req, res) => {
  const last = await WpWebhookEvent.findOne().sort({ createdAt: -1 }).lean();
  const lastInbound = await WpWebhookEvent.findOne({ event: 'incoming_message' }).sort({ createdAt: -1 }).lean();
  res.json({
    ok: true,
    message: 'CampaignBot webhook endpoint is live',
    path: req.originalUrl || req.path,
    lastWebhookAt: last?.createdAt || null,
    lastInboundAt: lastInbound?.createdAt || null,
    lastEvent: last?.event || null,
    hint: 'Set this URL in CampaignBot dashboard → Webhooks',
  });
};

export const handleWebhook = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const sigHeader = req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'] || '';
  const body = req.body || {};
  const event = body.event || body.type || body.event_type || '';

  console.log(`[WP Webhook] HIT method=${req.method} url=${req.originalUrl || req.path} event=${event || 'none'} sig=${sigHeader ? 'yes' : 'no'} bodyKeys=${Object.keys(body).join(',')}`);

  if (sigHeader) {
    const check = verifySignature(rawBody, sigHeader);
    if (!check.ok) {
      console.warn(`[WP Webhook] signature ${check.reason} — processing anyway`);
    }
  }

  try {
    // CampaignBot "overview" ping sometimes posts signing meta without event
    if (!event && body.algorithm && body.secret) {
      await logWebhook({ event: 'ping', ok: true, note: 'signing overview ping', body, headers: req.headers });
      return res.json({ statusCode: 200, message: 'Webhook received and verified successfully' });
    }

    if (event === 'message_status' && (body.data || body.status)) {
      await handleMessageStatus(body.data || body);
      await logWebhook({
        event: 'message_status',
        from: body.data?.recipient || '',
        text: body.data?.status || '',
        ok: true,
        body,
        headers: req.headers,
      });
      const status = body.data?.status;
      if (status === 'failed') {
        return res.json({ statusCode: 200, message: 'Failure status received successfully' });
      }
      return res.json({ statusCode: 200, message: 'Message status received successfully' });
    }

    if (event === 'incoming_message' || event === 'message' || event === 'messages' || body.processed?.from) {
      const inbound = extractInbound(body);
      if (!inbound) {
        await logWebhook({ event: event || 'incoming_message', ok: false, note: 'invalid payload', body, headers: req.headers });
        return res.status(400).json({ statusCode: 400, message: 'Invalid incoming message payload' });
      }

      await logWebhook({
        event: 'incoming_message',
        from: inbound.from,
        text: inbound.text,
        ok: true,
        note: 'accepted',
        body,
        headers: req.headers,
      });

      // Ack immediately so CampaignBot does not timeout/retry
      res.json({ statusCode: 200, message: 'Incoming message received successfully' });
      setImmediate(() => {
        handleIncomingMessage(inbound).catch((e) =>
          console.error('[WP Webhook] async inbound failed:', e.message));
      });
      return;
    }

    await logWebhook({
      event: event || 'unknown',
      ok: true,
      note: 'acknowledged unhandled',
      body,
      headers: req.headers,
    });
    res.json({ statusCode: 200, message: 'Event acknowledged' });
  } catch (err) {
    console.error('[WP Webhook] Error:', err.message);
    res.json({ statusCode: 200, message: 'Webhook received (processing error logged)' });
  }
};
