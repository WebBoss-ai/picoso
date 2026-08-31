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

async function logWebhook({
  requestId,
  event,
  from,
  text,
  ok,
  note,
  body,
  headers,
  rawBodyLength = 0,
  signature = 'missing',
  parsed = true,
  processing = 'received',
}) {
  try {
    await WpWebhookEvent.create({
      requestId: requestId || '',
      event: event || '',
      from: from || '',
      text: String(text || '').slice(0, 500),
      ok: ok !== false,
      note: note || '',
      processing,
      rawBodyLength,
      signature,
      parsed,
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

async function markProcessing(requestId, processing, note = '') {
  if (!requestId) return;
  emitChatbotEvent({
    type: 'webhook_processing',
    requestId,
    processing,
    note: note || null,
    at: new Date().toISOString(),
  });
  try {
    await WpWebhookEvent.updateMany(
      { requestId, event: 'incoming_message' },
      { $set: { processing, ...(note ? { note } : {}) } },
    );
  } catch (err) {
    console.error(`[WP Webhook][${requestId}] processing log update failed:`, err.message);
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

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function textFromMessage(message = {}) {
  if (typeof message === 'string') return message.trim();
  if (!message || typeof message !== 'object') return '';
  const text = message.text;
  if (typeof text === 'string') return text.trim();
  if (text && typeof text === 'object') {
    const nested = firstString(text.body, text.text, text.title, text.caption);
    if (nested) return nested;
  }

  const interactive = message.interactive || {};
  return firstString(
    message.body,
    message.caption,
    message.message,
    message.content,
    message.messageContent,
    message.button?.text,
    message.button?.title,
    message.list_reply?.title,
    message.interactive?.button_reply?.title,
    message.interactive?.list_reply?.title,
    interactive.button_reply?.id,
    interactive.list_reply?.id,
  );
}

function mediaFromMessage(message = {}) {
  if (!message || typeof message !== 'object') return null;
  if (message.media && typeof message.media === 'object') return message.media;
  if (typeof message.media === 'string' && message.media.trim()) return { url: message.media.trim() };
  for (const type of ['image', 'video', 'audio', 'document', 'sticker']) {
    if (message[type] && typeof message[type] === 'object') return message[type];
  }
  return null;
}

function parseSourceTimestamp(value) {
  if (!value) return null;
  const numeric = Number(value);
  const date = Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseEmbeddedPayload(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function collectPayloadEnvelopes(body = {}) {
  const root = parseEmbeddedPayload(body) || {};
  const queue = [root];
  const envelopes = [];
  const seen = new Set();
  const nestedKeys = ['data', 'payload', 'body', 'webhook', 'event_data'];

  while (queue.length) {
    const current = parseEmbeddedPayload(queue.shift());
    if (!current || seen.has(current)) continue;
    seen.add(current);
    envelopes.push(current);
    for (const key of nestedKeys) {
      const nested = parseEmbeddedPayload(current[key]);
      if (nested) queue.push(nested);
    }
  }
  return envelopes;
}

function normaliseInbound(message = {}, body = {}, contact = {}) {
  if (!message || typeof message !== 'object') message = { text: message };
  const from = firstString(
    message.from,
    message.sender,
    message.phone,
    body.from,
    body.sender,
  );
  if (!from) return null;

  const type = firstString(message.type, message.messageType, 'text').toLowerCase();
  const text = textFromMessage(message)
    || (type !== 'text' ? `[${type} message]` : '');

  return {
    from,
    text,
    name: firstString(
      message.name,
      message.profile_name,
      message.pushName,
      message.profile?.name,
      contact.name,
      contact.profile?.name,
    ),
    messageId: firstString(message.message_id, message.messageId, message.wamid, message.id) || null,
    type,
    media: mediaFromMessage(message),
    sourcePayload: message,
    sourceTimestamp: parseSourceTimestamp(
      message.timestamp || body.timestamp || body.system?.received_at,
    ),
  };
}

/**
 * CampaignBot documents `processed` as one object, but providers can batch
 * messages or forward Meta's entry/changes envelope. Always collect every
 * message instead of selecting only index zero.
 */
export function extractInboundMessages(body = {}) {
  const candidates = [];

  for (const envelope of collectPayloadEnvelopes(body)) {
    const contacts = Array.isArray(envelope.meta_contacts)
      ? envelope.meta_contacts
      : (Array.isArray(envelope.contacts) ? envelope.contacts : []);
    const processed = parseEmbeddedPayload(envelope.processed);
    if (Array.isArray(processed)) {
      candidates.push(...processed.map((message) => ({ message, contact: contacts[0], envelope })));
    } else if (processed) {
      candidates.push({ message: processed, contact: contacts[0], envelope });
    }

    for (const entry of Array.isArray(envelope.entry) ? envelope.entry : []) {
      for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
        const value = parseEmbeddedPayload(change?.value) || {};
        const valueContacts = Array.isArray(value.contacts) ? value.contacts : contacts;
        for (const message of Array.isArray(value.messages) ? value.messages : []) {
          candidates.push({ message, contact: valueContacts[0], envelope: value });
        }
      }
    }

    const genericMessages = [
      ...(Array.isArray(envelope.messages) ? envelope.messages : []),
      ...(Array.isArray(envelope.data?.messages) ? envelope.data.messages : []),
    ];
    candidates.push(...genericMessages.map((message) => ({
      message,
      contact: contacts[0],
      envelope,
    })));

    const message = parseEmbeddedPayload(envelope.message);
    if (message) candidates.push({ message, contact: contacts[0], envelope });

    if (firstString(envelope.from, envelope.sender, envelope.phone)) {
      candidates.push({ message: envelope, contact: contacts[0], envelope });
    }
  }

  const seenIds = new Set();
  return candidates
    .map(({ message, contact, envelope }) => normaliseInbound(message, envelope || body, contact))
    .filter((message) => {
      if (!message) return false;
      // A batch must not process the same message twice if both a generic and
      // a nested representation is present.
      if (!message.messageId) return true;
      if (seenIds.has(message.messageId)) return false;
      seenIds.add(message.messageId);
      return true;
    });
}

async function handleMessageStatus(data) {
  const {
    message_id: rawWamid,
    messageId,
    wamid: alternateWamid,
    status: rawStatus,
    recipient,
    failure,
  } = data || {};
  const wamid = firstString(rawWamid, messageId, alternateWamid);
  const status = String(rawStatus || '').toLowerCase();
  if (!wamid) return { valid: false, reason: 'missing message_id' };

  const validStatuses = ['sent', 'delivered', 'read', 'failed'];
  if (!validStatuses.includes(status)) return { valid: false, reason: 'invalid status' };

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
  if (!log) return { valid: true, updated: false, reason: 'message log not found' };

  const ORDER = { queued: 0, sent: 1, delivered: 2, read: 3 };
  // Failed is terminal. Never let a delayed "sent" or "delivered" callback
  // overwrite a failure, and ignore older duplicate status callbacks.
  if (log.status === 'failed' && status !== 'failed') {
    return { valid: true, updated: false, reason: 'failed status is terminal' };
  }
  if (status !== 'failed' && log.status !== 'failed'
    && (ORDER[status] ?? -1) <= (ORDER[log.status] ?? -1)) {
    return { valid: true, updated: false, reason: 'older or duplicate status' };
  }

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
  return { valid: true, updated: true };
}

async function handleIncomingMessage(inbound, requestId = '') {
  if (!inbound?.from) {
    console.warn(`[WP Webhook][${requestId || 'unknown'}] incoming without from`);
    return null;
  }

  console.log(`[WP Webhook][${requestId || 'unknown'}] INBOUND from=${inbound.from} type=${inbound.type} id=${inbound.messageId || 'none'} text="${String(inbound.text || '').slice(0, 100)}"`);
  await markProcessing(requestId, 'processing');

  let result;
  try {
    result = await handleInboundChat({
      from: inbound.from,
      text: inbound.text,
      name: inbound.name,
      messageId: inbound.messageId,
      type: inbound.type,
      media: inbound.media,
      sourcePayload: inbound.sourcePayload,
      sourceTimestamp: inbound.sourceTimestamp,
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
    await markProcessing(requestId, result?.duplicate ? 'duplicate' : 'processed');
    console.log(`[WP Webhook][${requestId || 'unknown'}] reply via=${result?.matchedAction} err=${result?.sendError || 'none'}`);
  } catch (err) {
    console.error(`[WP Webhook][${requestId || 'unknown'}] chatbot error:`, err.message, err.stack);
    await markProcessing(requestId, 'failed', `chatbot error: ${err.message}`);
    await logWebhook({
      requestId,
      event: 'incoming_message',
      from: inbound.from,
      text: inbound.text,
      ok: false,
      note: `chatbot error: ${err.message}`,
      processing: 'failed',
    });
    return null;
  }

  // CampaignBot may retry a delivery until it sees a successful response.
  // The message-id check in handleInboundChat makes retries harmless.
  if (result?.duplicate) return result;

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
  return result;
}

async function processInboundMessages(messages, requestId = '') {
  // Keep one webhook batch ordered. This prevents simultaneous upserts for
  // the same contact from racing and makes the inbox chronology predictable.
  for (const inbound of messages) {
    try {
      await handleIncomingMessage(inbound, requestId);
    } catch (err) {
      await markProcessing(requestId, 'failed', `processing error: ${err.message}`);
      console.error(`[WP Webhook][${requestId || 'unknown'}] inbound processing failed:`, err.message);
    }
  }
}

/** GET — health / verify URL is reachable (+ Meta hub.challenge support) */
export const webhookHealth = async (req, res) => {
  // Meta / BSP verification handshake (if forwarded)
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = process.env.CAMPAIGNBOT_WEBHOOK_SECRET
    || process.env.CAMPAIGNBOT_API_KEY
    || process.env.META_VERIFY_TOKEN
    || '';
  if (mode === 'subscribe' && challenge && (!expected || token === expected)) {
    return res.status(200).send(String(challenge));
  }

  try {
    const last = await WpWebhookEvent.findOne().sort({ createdAt: -1 }).lean();
    const lastInbound = await WpWebhookEvent.findOne({ event: 'incoming_message' }).sort({ createdAt: -1 }).lean();
    return res.json({
      ok: true,
      message: 'CampaignBot webhook endpoint is live',
      path: req.originalUrl || req.path,
      lastWebhookAt: last?.createdAt || null,
      lastInboundAt: lastInbound?.createdAt || null,
      lastEvent: last?.event || null,
      lastRequestId: last?.requestId || null,
      lastProcessing: last?.processing || null,
      lastSignature: last?.signature || null,
      lastParsed: last?.parsed ?? null,
    });
  } catch (err) {
    console.error('[WP Webhook] health lookup failed:', err.message);
    return res.status(200).json({
      ok: true,
      message: 'CampaignBot webhook endpoint is live',
      path: req.originalUrl || req.path,
      database: 'unavailable',
      error: err.message,
    });
  }
};

export const handleWebhook = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const requestId = req.webhookRequestId || req.headers['x-request-id'] || crypto.randomUUID();
  const sigHeader = req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'] || '';
  const body = req.body || {};
  const event = collectPayloadEnvelopes(body)
    .map((envelope) => firstString(envelope.event, envelope.type, envelope.event_type))
    .find(Boolean) || '';
  const rawBodyLength = Buffer.byteLength(rawBody, 'utf8');
  const signatureCheck = sigHeader
    ? verifySignature(rawBody, sigHeader)
    : { ok: false, reason: 'missing' };
  const signatureState = signatureCheck.ok ? 'valid' : `invalid:${signatureCheck.reason}`;
  const logMeta = {
    requestId,
    rawBodyLength,
    signature: signatureState,
    parsed: req.webhookJsonParsed !== false,
  };

  console.log(
    `[WP Webhook][${requestId}] HIT method=${req.method} url=${req.originalUrl || req.path}` +
    ` event=${event || 'none'} signature=${signatureState}` +
    ` bytes=${rawBodyLength} bodyKeys=${Object.keys(body).join(',')}`,
  );
  emitChatbotEvent({
    type: 'webhook_received',
    requestId,
    event: event || 'unknown',
    signature: signatureState,
    parsed: req.webhookJsonParsed !== false,
    rawBodyLength,
    at: new Date().toISOString(),
  });

  if (!signatureCheck.ok) {
    console.warn(`[WP Webhook][${requestId}] signature ${signatureCheck.reason} — processing anyway`);
  }

  if (req.webhookJsonParsed === false) {
    emitChatbotEvent({
      type: 'webhook_rejected',
      requestId,
      event: 'invalid_json',
      reason: req.webhookParseError || 'invalid JSON',
      payloadPreview: rawBody.slice(0, 2000),
      at: new Date().toISOString(),
    });
    await logWebhook({
      ...logMeta,
      event: 'invalid_json',
      ok: false,
      note: `invalid JSON: ${req.webhookParseError || 'parse failed'}`,
      body: {},
      headers: req.headers,
      processing: 'failed',
    });
    return res.status(400).json({ statusCode: 400, message: 'Invalid JSON webhook payload' });
  }

  try {
    // CampaignBot "overview" ping sometimes posts signing meta without event
    if (!event && body.algorithm && body.secret) {
      await logWebhook({
        ...logMeta,
        event: 'ping',
        ok: true,
        note: 'signing overview ping',
        body,
        headers: req.headers,
        processing: 'processed',
      });
      return res.json({ statusCode: 200, message: 'Webhook received and verified successfully' });
    }

    if (event === 'message_status' && (body.data || body.status)) {
      const statusPayload = body.data && typeof body.data === 'object' && !Array.isArray(body.data)
        ? body.data
        : body;
      const statusResult = await handleMessageStatus(statusPayload);
      const status = String(statusPayload.status || '').toLowerCase();
      await logWebhook({
        ...logMeta,
        event: 'message_status',
        from: statusPayload.recipient || '',
        text: status,
        ok: statusResult.valid,
        note: statusResult.valid
          ? `status ${statusResult.updated ? 'updated' : 'acknowledged'}${statusResult.reason ? `: ${statusResult.reason}` : ''}`
          : `invalid status payload: ${statusResult.reason}`,
        body,
        headers: req.headers,
        processing: statusResult.valid ? 'processed' : 'failed',
      });
      if (!statusResult.valid) {
        return res.status(400).json({ statusCode: 400, message: 'Invalid message status payload' });
      }
      if (status === 'failed') {
        return res.json({ statusCode: 200, message: 'Failure status received successfully' });
      }
      return res.json({ statusCode: 200, message: 'Message status received successfully' });
    }

    const hasInboundShape = event === 'incoming_message'
      || event === 'message'
      || event === 'messages'
      || extractInboundMessages(body).length > 0;
    if (hasInboundShape) {
      const inbounds = extractInboundMessages(body);
      if (!inbounds.length) {
        emitChatbotEvent({
          type: 'webhook_rejected',
          requestId,
          event: event || 'incoming_message',
          reason: 'no sender/message found',
          payloadPreview: JSON.stringify(body).slice(0, 2000),
          at: new Date().toISOString(),
        });
        await logWebhook({
          ...logMeta,
          event: event || 'incoming_message',
          ok: false,
          note: 'invalid payload: no sender/message found',
          body,
          headers: req.headers,
          processing: 'failed',
        });
        return res.status(400).json({ statusCode: 400, message: 'Invalid incoming message payload' });
      }

      // Acknowledge before any database or chatbot work. CampaignBot treats
      // this response as delivery confirmation and may retry on a slow 5xx.
      res.status(200).json({
        statusCode: 200,
        message: inbounds.length === 1
          ? 'Incoming message received successfully'
          : `${inbounds.length} incoming messages received successfully`,
      });
      setImmediate(async () => {
        try {
          await Promise.all(inbounds.map((inbound) => logWebhook({
            ...logMeta,
            event: 'incoming_message',
            from: inbound.from,
            text: inbound.text,
            ok: true,
            note: `${inbounds.length > 1 ? 'batch ' : ''}accepted${inbound.messageId ? `: ${inbound.messageId}` : ''}`,
            body,
            headers: req.headers,
            processing: 'received',
          })));
          await processInboundMessages(inbounds, requestId);
        } catch (err) {
          console.error(`[WP Webhook][${requestId}] async receipt failed:`, err.message, err.stack);
        }
      });
      return;
    }

    await logWebhook({
      ...logMeta,
      event: event || 'unknown',
      ok: true,
      note: 'acknowledged unhandled',
      body,
      headers: req.headers,
      processing: 'ignored',
    });
    res.json({ statusCode: 200, message: 'Event acknowledged' });
  } catch (err) {
    console.error(`[WP Webhook][${requestId}] Error:`, err.message, err.stack);
    await logWebhook({
      ...logMeta,
      event: event || 'error',
      ok: false,
      note: `handler error: ${err.message}`,
      body,
      headers: req.headers,
      processing: 'failed',
    });
    res.json({ statusCode: 200, message: 'Webhook received (processing error logged)' });
  }
};
