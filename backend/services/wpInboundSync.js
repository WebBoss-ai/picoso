/**
 * Active inbound sync — polls CampaignBot for new WhatsApp messages when
 * webhooks are missing or delayed. Also attempts to register our webhook URL.
 */

import axios from 'axios';
import * as bot from './campaignBot.js';
import { handleInboundChat } from './wpChatbot.js';
import { emitChatbotEvent } from './wpChatbotBus.js';
import { WpWebhookEvent } from '../models/wpMarketingModels.js';
import { extractInboundMessagesWithDebug } from './wpWebhookExtract.js';

const BASE_URL = process.env.CAMPAIGNBOT_API_URL || 'https://service.api.campaignbot.online';
const API_KEY = process.env.CAMPAIGNBOT_API_KEY || '8c226a84bf474b0dffae2efb7b69f05f3fefada3a16c115ffeb45b7a53cc34ab';
const BUSINESS_REF_ID = process.env.CAMPAIGNBOT_BUSINESS_REF || 'picoso_api_1';
const WHATSAPP_REF_ID = process.env.CAMPAIGNBOT_WA_REF || API_KEY;

const POLL_MS = Number(process.env.WP_INBOUND_SYNC_MS || 15000);

const syncState = {
  startedAt: null,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastFetched: 0,
  lastProcessed: 0,
  lastRegisterAt: null,
  lastRegisterOk: null,
  lastRegisterNote: null,
  workingFetchPath: null,
  lastFetchStatus: null,
  lastFetchBody: null,
  registerAttempts: [],
};

function apiHeaders() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'x-business-ref-id': BUSINESS_REF_ID,
    'x-whatsapp-ref-id': WHATSAPP_REF_ID,
    'Content-Type': 'application/json',
  };
}

function webhookUrls() {
  const primary = bot.getPublicWebhookUrl();
  const alt = primary.includes('/api/webhooks')
    ? primary.replace('/api/webhooks', '/webhooks')
    : primary.replace('/webhooks', '/api/webhooks');
  return [...new Set([primary, alt])];
}

async function apiCall(method, url, data = null, params = null) {
  const res = await axios({
    method,
    url: `${BASE_URL}${url}`,
    headers: apiHeaders(),
    data,
    params,
    timeout: 20000,
    validateStatus: () => true,
  });
  return res;
}

function collectMessagesFromResponse(body) {
  if (!body) return [];
  const candidates = [];
  const push = (item) => {
    if (!item || typeof item !== 'object') return;
    candidates.push(item);
  };

  if (Array.isArray(body)) body.forEach(push);
  if (Array.isArray(body.messages)) body.messages.forEach(push);
  if (Array.isArray(body.data)) body.data.forEach(push);
  if (Array.isArray(body.data?.messages)) body.data.messages.forEach(push);
  if (Array.isArray(body.results)) body.results.forEach(push);
  if (body.processed) push(body.processed);

  const extracted = [];
  for (const item of candidates) {
    const wrapped = item.event ? item : { event: 'incoming_message', processed: item };
    const { messages } = extractInboundMessagesWithDebug(wrapped);
    extracted.push(...messages);
  }

  // Whole payload as webhook shape
  if (!extracted.length && typeof body === 'object') {
    extracted.push(...extractInboundMessagesWithDebug(body).messages);
  }

  return extracted;
}

export function getInboundSyncState() {
  return { ...syncState, pollIntervalMs: POLL_MS, webhookUrls: webhookUrls() };
}

export async function registerWebhookWithCampaignBot() {
  syncState.lastRegisterAt = new Date().toISOString();
  syncState.registerAttempts = [];
  const urls = webhookUrls();
  const attempts = [
    { method: 'post', path: '/v1/webhooks', body: (url) => ({ webhookUrl: url, url, events: ['incoming_message', 'message_status'] }) },
    { method: 'post', path: '/v1/webhook', body: (url) => ({ webhookUrl: url, url }) },
    { method: 'post', path: '/v1/whatsapp/webhooks', body: (url) => ({ webhookUrl: url, callbackUrl: url }) },
    { method: 'post', path: '/v1/whatsapp/webhook/register', body: (url) => ({ webhookUrl: url }) },
    { method: 'put', path: '/v1/webhooks', body: (url) => ({ webhookUrl: url }) },
    { method: 'post', path: '/v1/settings/webhook', body: (url) => ({ webhookUrl: url }) },
  ];

  for (const url of urls) {
    for (const attempt of attempts) {
      try {
        const res = await apiCall(attempt.method, attempt.path, attempt.body(url));
        syncState.registerAttempts.push({
          url,
          path: attempt.path,
          method: attempt.method,
          status: res.status,
          body: typeof res.data === 'object' ? res.data : String(res.data || '').slice(0, 200),
        });
        if (res.status >= 200 && res.status < 300) {
          syncState.lastRegisterOk = true;
          syncState.lastRegisterNote = `registered via ${attempt.method.toUpperCase()} ${attempt.path} → ${url}`;
          console.log(`[WP InboundSync] ${syncState.lastRegisterNote}`);
          return { ok: true, note: syncState.lastRegisterNote };
        }
      } catch (err) {
        /* try next */
      }
    }
  }

  syncState.lastRegisterOk = false;
  syncState.lastRegisterNote = 'no CampaignBot webhook-register endpoint responded OK (configure URL in CampaignBot dashboard)';
  return { ok: false, note: syncState.lastRegisterNote };
}

export async function syncInboundMessages() {
  syncState.lastRunAt = new Date().toISOString();
  syncState.lastFetched = 0;
  syncState.lastProcessed = 0;

  const fetchAttempts = [
    { method: 'get', path: '/v1/whatsapp/messages/fetch', params: { page: 1, limit: 50 } },
    { method: 'post', path: '/v1/whatsapp/messages/fetch', body: { page: 1, limit: 50 } },
    { method: 'get', path: '/v1/whatsapp/messages/incoming/fetch', params: { page: 1, limit: 50 } },
    { method: 'post', path: '/v1/whatsapp/messages/incoming/fetch', body: { page: 1, limit: 50 } },
    { method: 'get', path: '/v1/whatsapp/inbox/fetch', params: { page: 1, limit: 50 } },
    { method: 'get', path: '/v1/whatsapp/conversations/fetch', params: { page: 1, limit: 50 } },
  ];

  let lastStatus = null;
  let lastBody = null;
  let lastPath = null;

  for (const attempt of fetchAttempts) {
    try {
      const res = await apiCall(attempt.method, attempt.path, attempt.body, attempt.params);
      lastStatus = res.status;
      lastBody = res.data;
      lastPath = `${attempt.method.toUpperCase()} ${attempt.path}`;
      syncState.lastFetchStatus = lastStatus;
      syncState.lastFetchBody = typeof lastBody === 'object' ? lastBody : { raw: String(lastBody || '').slice(0, 300) };
      if (res.status < 200 || res.status >= 300) continue;

      const messages = collectMessagesFromResponse(res.data);
      if (!messages.length) continue;

      syncState.workingFetchPath = `${attempt.method.toUpperCase()} ${attempt.path}`;
      syncState.lastFetched = messages.length;
      syncState.lastSuccessAt = new Date().toISOString();
      syncState.lastError = null;

      for (const inbound of messages) {
        try {
          const result = await handleInboundChat({
            from: inbound.from,
            text: inbound.text,
            name: inbound.name,
            messageId: inbound.messageId,
            type: inbound.type,
            media: inbound.media,
            sourcePayload: { ...inbound.sourcePayload, _syncSource: syncState.workingFetchPath },
            sourceTimestamp: inbound.sourceTimestamp,
          });
          if (!result?.duplicate) syncState.lastProcessed += 1;
          emitChatbotEvent({
            type: 'inbound_sync',
            from: inbound.from,
            text: inbound.text,
            source: syncState.workingFetchPath,
            at: new Date().toISOString(),
          });
        } catch (err) {
          console.error('[WP InboundSync] process failed:', err.message);
        }
      }

      await WpWebhookEvent.create({
        event: 'sync_poll',
        ok: true,
        note: `fetched ${messages.length}, processed ${syncState.lastProcessed} via ${syncState.workingFetchPath}`,
        processing: 'processed',
      });

      return { ok: true, fetched: messages.length, processed: syncState.lastProcessed, path: syncState.workingFetchPath };
    } catch (err) {
      lastStatus = err.message;
    }
  }

  syncState.lastError = lastStatus
    ? `fetch failed (last HTTP ${lastStatus} on ${lastPath || 'unknown'})${lastBody?.message ? `: ${lastBody.message}` : ''}`
    : 'no fetch endpoint returned messages';

  return { ok: false, error: syncState.lastError, status: lastStatus, path: lastPath, body: lastBody };
}

let timer = null;

export function startInboundSync() {
  if (timer) return;
  syncState.startedAt = new Date().toISOString();
  console.log(`[WP InboundSync] starting — poll every ${POLL_MS}ms`);

  const tick = async () => {
    try {
      await syncInboundMessages();
    } catch (err) {
      syncState.lastError = err.message;
      console.error('[WP InboundSync] tick error:', err.message);
    }
  };

  registerWebhookWithCampaignBot().catch(() => {});
  tick();
  timer = setInterval(tick, POLL_MS);
}
