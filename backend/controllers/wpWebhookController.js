/**
 * CampaignBot Webhook Handler
 *
 * POST /api/webhooks/campaignbot  (also /webhooks/campaignbot)
 * GET  /api/webhooks/campaignbot  — health check
 */

import crypto from 'crypto';
import {
  WpMessageLog,
  WpExperiment,
  WpWebhookEvent,
} from '../models/wpMarketingModels.js';
import { handleInboundChat } from '../services/wpChatbot.js';
import { emitChatbotEvent } from '../services/wpChatbotBus.js';
import {
  detectWebhookEvent,
  extractInboundMessagesWithDebug,
} from '../services/wpWebhookExtract.js';
import { recordWebhookHit } from '../services/wpWebhookDiagnostics.js';
import { isSelfVerifyRequest } from '../services/wpWebhookVerify.js';

const WEBHOOK_SECRETS = [
  process.env.CAMPAIGNBOT_WEBHOOK_SECRET,
  process.env.CAMPAIGNBOT_API_KEY,
  '8c226a84bf474b0dffae2efb7b69f05f3fefada3a16c115ffeb45b7a53cc34ab',
].filter(Boolean);

const RAW_BODY_STORE_LIMIT = 12000;

async function logWebhook({
  requestId,
  event,
  from,
  text,
  ok,
  note,
  body,
  headers,
  rawBody = '',
  rawBodyLength = 0,
  signature = 'missing',
  parsed = true,
  processing = 'received',
  debugTrace = null,
  isVerify = false,
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
      isVerify: !!isVerify,
      rawBodyLength,
      rawBodyPreview: String(rawBody || '').slice(0, RAW_BODY_STORE_LIMIT),
      signature,
      parsed,
      payloadPreview: JSON.stringify(body || {}).slice(0, 8000),
      debugTrace,
      headers: {
        signature: headers?.['x-webhook-signature'] ? 'present' : 'missing',
        'content-type': headers?.['content-type'] || '',
        'user-agent': headers?.['user-agent'] || '',
      },
    });
    const old = await WpWebhookEvent.find().sort({ createdAt: -1 }).skip(500).select('_id').lean();
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

  if (String(inbound.text || '').includes('__picoso_webhook_verify__')) {
    console.log(`[WP Webhook][${requestId || 'unknown'}] verify ping — skip chatbot`);
    return { skipped: true, reason: 'verify_ping' };
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
    emitChatbotEvent({
      type: 'webhook_processing',
      requestId,
      processing: 'failed',
      note: `chatbot error: ${err.message}`,
      at: new Date().toISOString(),
    });
    return null;
  }

  if (result?.duplicate) return result;

  const phone = String(inbound.from).replace(/\D/g, '');
  if (!phone) return result;
  const log = await WpMessageLog.findOne({
    contactPhone: { $regex: phone },
    status: { $in: ['sent', 'delivered', 'read'] },
  }).sort({ createdAt: -1 });
  if (!log) return result;
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
  for (const inbound of messages) {
    try {
      await handleIncomingMessage(inbound, requestId);
    } catch (err) {
      await markProcessing(requestId, 'failed', `processing error: ${err.message}`);
      console.error(`[WP Webhook][${requestId || 'unknown'}] inbound processing failed:`, err.message);
    }
  }
}

function isIncomingWebhook(event, body) {
  if (['incoming_message', 'message', 'messages'].includes(event)) return true;
  if (body?.processed !== undefined) return true;
  const { messages } = extractInboundMessagesWithDebug(body);
  return messages.length > 0;
}

/** GET — health */
export const webhookHealth = async (req, res) => {
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
    });
  } catch (err) {
    return res.status(200).json({
      ok: true,
      message: 'CampaignBot webhook endpoint is live',
      database: 'unavailable',
      error: err.message,
    });
  }
};

export const handleWebhook = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const requestId = req.webhookRequestId || req.headers['x-request-id'] || crypto.randomUUID();
  const body = req.body || {};
  const event = detectWebhookEvent(body);
  const rawBodyLength = Buffer.byteLength(rawBody, 'utf8');
  const isVerify = isSelfVerifyRequest(req, body);

  recordWebhookHit(req, {
    requestId,
    event: event || body?.event,
    bytes: rawBodyLength,
    bodyPreview: rawBody.slice(0, 500),
    isVerify,
  });

  const sigHeader = req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'] || '';
  const signatureCheck = sigHeader
    ? verifySignature(rawBody, sigHeader)
    : { ok: false, reason: 'missing' };
  const signatureState = signatureCheck.ok ? 'valid' : `invalid:${signatureCheck.reason}`;
  const logMeta = {
    requestId,
    rawBody,
    rawBodyLength,
    signature: signatureState,
    parsed: req.webhookJsonParsed !== false,
  };

  console.log(
    `[WP Webhook][${requestId}] HIT event=${event || 'none'} signature=${signatureState}` +
    ` bytes=${rawBodyLength} bodyKeys=${Object.keys(body).join(',')}` +
    (isVerify ? ' [self-verify]' : ''),
  );

  if (isVerify) {
    emitChatbotEvent({
      type: 'webhook_verify',
      requestId,
      at: new Date().toISOString(),
    });
    return res.status(200).json({
      statusCode: 200,
      message: 'Self-test webhook acknowledged',
      requestId,
      verify: true,
    });
  }

  emitChatbotEvent({
    type: 'webhook_received',
    requestId,
    event: event || 'unknown',
    signature: signatureState,
    parsed: req.webhookJsonParsed !== false,
    rawBodyLength,
    bodyKeys: Object.keys(body),
    at: new Date().toISOString(),
  });

  if (req.webhookJsonParsed === false) {
    const debugTrace = { steps: [{ step: 'json_parse_failed', detail: req.webhookParseError }] };
    emitChatbotEvent({
      type: 'webhook_rejected',
      requestId,
      event: 'invalid_json',
      reason: req.webhookParseError || 'invalid JSON',
      rawBodyPreview: rawBody.slice(0, 8000),
      debugTrace,
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
      debugTrace,
    });
    return res.status(400).json({ statusCode: 400, message: 'Invalid JSON webhook payload' });
  }

  try {
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

    if (isIncomingWebhook(event, body)) {
      const { messages: inbounds, debug } = extractInboundMessagesWithDebug(body, rawBody);

      if (isSelfVerifyRequest(req, body, inbounds)) {
        return res.status(200).json({
          statusCode: 200,
          message: 'Self-test webhook acknowledged',
          requestId,
          verify: true,
        });
      }

      // Always acknowledge incoming webhooks with 200 so CampaignBot keeps delivering.
      res.status(200).json({
        statusCode: 200,
        message: inbounds.length === 1
          ? 'Incoming message received successfully'
          : inbounds.length > 1
            ? `${inbounds.length} incoming messages received successfully`
            : 'Incoming message received successfully',
        requestId,
        extracted: inbounds.length,
      });

      emitChatbotEvent({
        type: 'webhook_processing',
        requestId,
        event: event || 'incoming_message',
        processing: 'acknowledged',
        note: `HTTP 200 sent to CampaignBot · extracted=${inbounds.length}`,
        at: new Date().toISOString(),
      });

      setImmediate(async () => {
        try {
          if (!inbounds.length) {
            const failNote = 'extraction failed: no sender/message found — see debugTrace';
            emitChatbotEvent({
              type: 'webhook_rejected',
              requestId,
              event: event || 'incoming_message',
              reason: failNote,
              payloadPreview: JSON.stringify(body).slice(0, 8000),
              rawBodyPreview: rawBody.slice(0, 8000),
              debugTrace: debug,
              at: new Date().toISOString(),
            });
            await logWebhook({
              ...logMeta,
              event: 'incoming_message',
              ok: false,
              note: failNote,
              body,
              headers: req.headers,
              processing: 'failed',
              debugTrace: debug,
            });
            return;
          }

          await Promise.all(inbounds.map((inbound) => logWebhook({
            ...logMeta,
            event: 'incoming_message',
            from: inbound.from,
            text: inbound.text,
            ok: true,
            note: `accepted via ${inbound._extractSource || 'parser'}${inbound.messageId ? `: ${inbound.messageId}` : ''}`,
            body,
            headers: req.headers,
            processing: 'received',
            debugTrace: debug,
          })));

          emitChatbotEvent({
            type: 'webhook_extracted',
            requestId,
            count: inbounds.length,
            from: inbounds[0]?.from,
            text: inbounds[0]?.text,
            debugTrace: debug,
            at: new Date().toISOString(),
          });

          await processInboundMessages(inbounds, requestId);
        } catch (err) {
          console.error(`[WP Webhook][${requestId}] async receipt failed:`, err.message, err.stack);
          emitChatbotEvent({
            type: 'webhook_rejected',
            requestId,
            reason: `async error: ${err.message}`,
            at: new Date().toISOString(),
          });
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

// Re-export for tests
export { extractInboundMessagesWithDebug } from '../services/wpWebhookExtract.js';
