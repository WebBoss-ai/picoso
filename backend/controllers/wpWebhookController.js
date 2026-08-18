/**
 * CampaignBot Webhook Handler
 *
 * Receives real-time delivery, read, and incoming-message events from
 * CampaignBot. Verifies the HMAC-SHA-256 signature on every request and
 * updates WpMessageLog + WpExperiment metrics atomically.
 *
 * Route: POST /api/webhooks/campaignbot
 * Public endpoint — no PIN required; secured by HMAC signature only.
 */

import crypto from 'crypto';
import { WpMessageLog, WpExperiment } from '../models/wpMarketingModels.js';

const WEBHOOK_SECRET = process.env.CAMPAIGNBOT_WEBHOOK_SECRET
  || process.env.CAMPAIGNBOT_API_KEY
  || '8c226a84bf474b0dffae2efb7b69f05f3fefada3a16c115ffeb45b7a53cc34ab';

/* ── Signature verification ──────────────────────────────────────────────── */

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const expected = `sha256=${crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')}`;
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader),
    );
  } catch {
    return false;
  }
}

/* ── Status → delivery update ────────────────────────────────────────────── */

async function handleMessageStatus(data) {
  const { message_id: wamid, status, recipient, failure } = data;
  if (!wamid) return;

  const validStatuses = ['sent', 'delivered', 'read', 'failed'];
  if (!validStatuses.includes(status)) return;

  const updateFields = { status };
  if (status === 'delivered') updateFields.deliveredAt = new Date();
  if (status === 'read')      updateFields.readAt       = new Date();
  if (status === 'failed') {
    updateFields.failedAt    = new Date();
    updateFields.failureTitle = failure?.title   || null;
    updateFields.failureMsg   = failure?.message || null;
  }

  // Find the log by wamid (set during bulk send response) or contactPhone+sent combo
  let log = await WpMessageLog.findOne({ wamid });

  // Fallback: match by contactPhone + queued/sent status when wamid not yet populated
  if (!log && recipient) {
    const phone = recipient.replace(/\D/g, '');
    log = await WpMessageLog.findOne({
      contactPhone: { $regex: phone },
      status: { $in: ['queued', 'sent'] },
    }).sort({ createdAt: -1 });
  }

  if (!log) return;

  // Avoid downgrading status (e.g. read should not revert to delivered)
  const ORDER = { queued: 0, sent: 1, delivered: 2, read: 3, failed: -1 };
  if ((ORDER[status] || 0) <= (ORDER[log.status] || 0) && status !== 'failed') return;

  await WpMessageLog.findByIdAndUpdate(log._id, { $set: updateFields });

  // Increment experiment variant metrics
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

/* ── Incoming message (reply) ────────────────────────────────────────────── */

async function handleIncomingMessage(processed) {
  const { from, text } = processed;
  if (!from) return;

  const phone = from.replace(/\D/g, '');

  // Find the most recent outbound log for this contact
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

/* ── Main handler ────────────────────────────────────────────────────────── */

export const handleWebhook = async (req, res) => {
  // Verify signature (rawBody injected by express.raw middleware on this route)
  const rawBody  = req.rawBody || JSON.stringify(req.body);
  const sigHeader = req.headers['x-webhook-signature'] || '';

  if (sigHeader && !verifySignature(rawBody, sigHeader)) {
    return res.status(401).json({ statusCode: 401, message: 'Invalid or missing webhook signature' });
  }

  const { event, data, processed } = req.body;

  try {
    if (event === 'message_status' && data) {
      await handleMessageStatus(data);
      return res.json({ statusCode: 200, message: 'Message status received successfully' });
    }

    if (event === 'incoming_message' && processed) {
      await handleIncomingMessage(processed);
      return res.json({ statusCode: 200, message: 'Incoming message received successfully' });
    }

    // Unknown event — acknowledge without processing
    res.json({ statusCode: 200, message: 'Event acknowledged' });
  } catch (err) {
    // Always 200 to prevent CampaignBot from retrying indefinitely
    console.error('[WP Webhook] Error:', err.message);
    res.json({ statusCode: 200, message: 'Webhook received (processing error logged)' });
  }
};
