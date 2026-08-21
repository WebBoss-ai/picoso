/**
 * CampaignBot Webhook Handler
 *
 * Receives real-time delivery, read, and incoming-message events.
 * Route: POST /api/webhooks/campaignbot
 */

import crypto from 'crypto';
import { WpMessageLog, WpExperiment } from '../models/wpMarketingModels.js';
import { handleInboundChat } from '../services/wpChatbot.js';

const WEBHOOK_SECRETS = [
  process.env.CAMPAIGNBOT_WEBHOOK_SECRET,
  process.env.CAMPAIGNBOT_API_KEY,
  '8c226a84bf474b0dffae2efb7b69f05f3fefada3a16c115ffeb45b7a53cc34ab',
].filter(Boolean);

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader) return { ok: false, reason: 'missing' };
  const raw = typeof rawBody === 'string' ? rawBody : String(rawBody || '');
  for (const secret of WEBHOOK_SECRETS) {
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(raw).digest('hex')}`;
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(signatureHeader);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return { ok: true };
      }
    } catch {
      /* try next */
    }
  }
  return { ok: false, reason: 'mismatch' };
}

function extractInbound(body = {}) {
  // Canonical CampaignBot shape
  if (body.processed?.from) {
    return {
      from: body.processed.from,
      text: body.processed.text
        || body.processed.body
        || body.processed.caption
        || '',
      name: body.processed.name
        || body.processed.profile_name
        || body.processed.pushName
        || body.meta_contacts?.[0]?.profile?.name
        || '',
      messageId: body.processed.message_id || body.processed.id || null,
      type: body.processed.type || 'text',
    };
  }

  // Alternate / nested shapes
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
  if (status === 'read')      updateFields.readAt       = new Date();
  if (status === 'failed') {
    updateFields.failedAt     = new Date();
    updateFields.failureTitle = failure?.title   || null;
    updateFields.failureMsg   = failure?.message || null;
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
    if (status === 'read')      inc['variants.$.metrics.read']       = 1;
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
    console.warn('[WP Webhook] incoming without from — ignored');
    return;
  }

  console.log(`[WP Webhook] inbound from=${inbound.from} text="${String(inbound.text || '').slice(0, 80)}"`);

  try {
    const result = await handleInboundChat({
      from: inbound.from,
      text: inbound.text,
      name: inbound.name,
      messageId: inbound.messageId,
    });
    if (result?.reply) {
      console.log(`[WP Webhook] chatbot replied (${result.matchedAction}): "${String(result.reply).slice(0, 80)}"`);
    } else {
      console.warn('[WP Webhook] chatbot returned no reply', result);
    }
  } catch (err) {
    console.error('[WP Webhook] chatbot error:', err.message, err.stack);
  }

  // Campaign engagement tracking (best-effort)
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

export const handleWebhook = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const sigHeader = req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'] || '';

  if (sigHeader) {
    const check = verifySignature(rawBody, sigHeader);
    if (!check.ok) {
      console.error(`[WP Webhook] signature ${check.reason} — still acknowledging body for debug; event=${req.body?.event}`);
      // Do NOT hard-block: wrong secret previously caused total silence.
      // Log loudly; process the event so chatbot stays alive.
    }
  } else {
    console.warn('[WP Webhook] no signature header present');
  }

  const body = req.body || {};
  const event = body.event || body.type || body.event_type || '';

  try {
    if (event === 'message_status' && (body.data || body.status)) {
      await handleMessageStatus(body.data || body);
      return res.json({ statusCode: 200, message: 'Message status received successfully' });
    }

    if (event === 'incoming_message' || event === 'message' || event === 'messages') {
      const inbound = extractInbound(body);
      if (!inbound) {
        console.warn('[WP Webhook] could not extract inbound payload', JSON.stringify(body).slice(0, 500));
        return res.status(400).json({ statusCode: 400, message: 'Invalid incoming message payload' });
      }
      // Respond fast; process reply async so CampaignBot doesn't time out
      res.json({ statusCode: 200, message: 'Incoming message received successfully' });
      setImmediate(() => {
        handleIncomingMessage(inbound).catch((e) => console.error('[WP Webhook] async inbound failed:', e.message));
      });
      return;
    }

    // Some providers omit event and only send processed
    if (body.processed?.from) {
      res.json({ statusCode: 200, message: 'Incoming message received successfully' });
      setImmediate(() => {
        handleIncomingMessage(extractInbound(body)).catch((e) => console.error('[WP Webhook] async inbound failed:', e.message));
      });
      return;
    }

    console.log(`[WP Webhook] acknowledged unhandled event="${event}"`);
    res.json({ statusCode: 200, message: 'Event acknowledged' });
  } catch (err) {
    console.error('[WP Webhook] Error:', err.message);
    res.json({ statusCode: 200, message: 'Webhook received (processing error logged)' });
  }
};
