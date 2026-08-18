/**
 * CampaignBot API client — https://service.api.campaignbot.online
 * Service: picoso_api_1
 * Ref Key: stored in CAMPAIGNBOT_API_KEY env variable
 *
 * Uses axios so it stays consistent with the rest of the backend.
 * All public functions throw on non-2xx responses.
 */

import axios from 'axios';

const BASE_URL  = process.env.CAMPAIGNBOT_API_URL || 'https://service.api.campaignbot.online';
const API_KEY   = process.env.CAMPAIGNBOT_API_KEY  || '8c226a84bf474b0dffae2efb7b69f05f3fefada3a16c115ffeb45b7a53cc34ab';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'CampaignBot API error';
    throw new Error(msg);
  }
);

/* ── Single message sends ────────────────────────────────────────────────── */

export async function sendText({ recipientPhone, recipientName, messageContent, replyToMessageId }) {
  return client.post('/v1/whatsapp/message/send', {
    recipientPhone,
    recipientName,
    messageType: 'text',
    messageContent,
    ...(replyToMessageId ? { replyToMessageId } : {}),
  });
}

export async function sendMedia({ recipientPhone, recipientName, messageType, mediaUrl, caption, filename }) {
  return client.post('/v1/whatsapp/message/send', {
    recipientPhone,
    recipientName,
    messageType,                                  // image | video | audio | document
    mediaUrl,
    ...(caption  ? { caption }  : {}),
    ...(filename ? { filename } : {}),
  });
}

export async function sendTemplate({
  recipientPhone, recipientName,
  templateName, languageCode = 'en_US',
  templateParams = [],
  dynamicHeader,
  dynamicButtons,
}) {
  return client.post('/v1/whatsapp/message/send', {
    recipientPhone,
    recipientName,
    messageType: 'template',
    templateName,
    languageCode,
    templateParams,
    ...(dynamicHeader              ? { dynamicHeader }  : {}),
    ...(dynamicButtons?.length     ? { dynamicButtons } : {}),
  });
}

/* ── Bulk sends ──────────────────────────────────────────────────────────── */

/**
 * Send bulk template messages.
 * recipients: [{ phone, name, templateParams, dynamicButtons? }]
 */
export async function sendBulkTemplate({
  templateId, templateName,
  campaignName, campaignDescription = '',
  languageCode = 'en_US',
  dynamicHeader,
  recipients,
}) {
  return client.post('/v1/whatsapp/messages/bulk/send', {
    templateId,
    templateName,
    campaignName,
    campaignDescription,
    languageCode,
    ...(dynamicHeader ? { dynamicHeader } : {}),
    recipients,
  });
}

/* ── Templates ───────────────────────────────────────────────────────────── */

export async function fetchTemplates(page = 1, limit = 20) {
  return client.get(`/v1/whatsapp/templates/fetch?page=${page}&limit=${limit}`);
}

/* ── Media upload ────────────────────────────────────────────────────────── */

/**
 * Upload media to WhatsApp via CampaignBot.
 * fileBuffer: Buffer, mimeType: string, filename: string
 * Returns { data: { media_id: "..." } }
 */
export async function uploadMedia(fileBuffer, mimeType, filename) {
  const { FormData, Blob } = await import('buffer');

  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimeType }), filename);

  return client.post('/v1/whatsapp/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/* ── Connectivity check ──────────────────────────────────────────────────── */

export async function testConnection() {
  try {
    const result = await fetchTemplates(1, 1);
    return { connected: true, templateCount: result?.total ?? 0 };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}
