/**
 * CampaignBot incoming_message extraction — permissive + debug trace.
 * Handles documented shape, stringified JSON, nested wrappers, Meta envelopes.
 */

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

export function normalizePhone(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (s.startsWith('+')) return s;
  return `+${digits}`;
}

function parseEmbedded(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
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

function looksLikeMessage(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const hasId = !!(obj.message_id || obj.messageId || obj.wamid || obj.id);
  const hasFrom = !!(obj.from || obj.sender || obj.phone || obj.wa_id || obj.recipient);
  const hasText = !!(textFromMessage(obj) || obj.type);
  return (hasFrom && (hasText || hasId)) || (hasId && hasText);
}

function deepWalk(value, visit, path = 'root', seen = new Set()) {
  const node = parseEmbedded(value);
  if (!node) return;
  if (typeof node !== 'object') return;
  if (seen.has(node)) return;
  seen.add(node);
  visit(node, path);
  if (Array.isArray(node)) {
    node.forEach((item, i) => deepWalk(item, visit, `${path}[${i}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    deepWalk(child, visit, `${path}.${key}`, seen);
  }
}

function collectEnvelopes(body) {
  const envelopes = [];
  const seen = new Set();
  deepWalk(body, (node, path) => {
    if (seen.has(node)) return;
    seen.add(node);
    envelopes.push({ node, path });
  });
  return envelopes;
}

function isEmptyObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0;
}

/** CampaignBot sometimes sends processed:{} but puts Meta payload in meta_raw. */
function extractFromMetaRaw(metaRaw, envelope, contact, path, candidates, addStep) {
  const raw = parseEmbedded(metaRaw);
  if (!raw || typeof raw !== 'object') return;

  let found = 0;

  if (Array.isArray(raw.entry)) {
    for (const entry of raw.entry) {
      for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
        const value = parseEmbedded(change?.value) || {};
        const valueContacts = Array.isArray(value.contacts) ? value.contacts : [];
        const c = valueContacts[0] || contact;
        for (const message of Array.isArray(value.messages) ? value.messages : []) {
          candidates.push({
            message,
            envelope: value,
            contact: c,
            source: `${path}.meta_raw.entry.changes.messages`,
          });
          found += 1;
        }
      }
    }
  }

  if (Array.isArray(raw.messages)) {
    raw.messages.forEach((m, i) => {
      candidates.push({
        message: m,
        envelope: raw,
        contact,
        source: `${path}.meta_raw.messages[${i}]`,
      });
      found += 1;
    });
  }

  if (looksLikeMessage(raw)) {
    candidates.push({ message: raw, envelope, contact, source: `${path}.meta_raw(self)` });
    found += 1;
  }

  if (found) addStep('meta_raw_messages', { path, count: found });
}

function contactFromEnvelope(envelope = {}) {
  const lists = [
    envelope.meta_contacts,
    envelope.contacts,
    envelope.meta_raw?.contacts,
  ].filter(Array.isArray);
  for (const list of lists) {
    const c = list[0];
    if (c) return c;
  }
  return {};
}

function resolveFrom(message = {}, envelope = {}, contact = {}) {
  const raw = firstString(
    message.from,
    message.sender,
    message.phone,
    message.wa_id,
    message.recipient,
    envelope.from,
    envelope.sender,
    envelope.phone,
    contact.wa_id,
    contact.id,
    contact.phone,
  );
  return normalizePhone(raw);
}

function normaliseInbound(message = {}, envelope = {}, contact = {}, source = 'unknown') {
  if (!message || typeof message !== 'object') message = { text: message };
  const from = resolveFrom(message, envelope, contact);
  if (!from) return null;

  const type = firstString(message.type, message.messageType, 'text').toLowerCase();
  const text = textFromMessage(message) || (type !== 'text' ? `[${type} message]` : '');

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
      message.timestamp || envelope.timestamp || envelope.system?.received_at,
    ),
    _extractSource: source,
  };
}

/**
 * @returns {{ messages: object[], debug: object }}
 */
export function extractInboundMessagesWithDebug(body = {}, rawBody = '') {
  const debug = {
    steps: [],
    bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
    rawBodyLength: Buffer.byteLength(String(rawBody || ''), 'utf8'),
    rawBodyPreview: String(rawBody || '').slice(0, 8000),
    parsedBody: body,
  };

  const addStep = (step, detail) => debug.steps.push({ step, detail, at: new Date().toISOString() });

  const candidates = [];
  const envelopes = collectEnvelopes(body);
  addStep('envelopes_found', envelopes.length);

  for (const { node, path } of envelopes) {
    const contact = contactFromEnvelope(node);

    if (node.processed !== undefined) {
      const processed = parseEmbedded(node.processed);
      if (Array.isArray(processed)) {
        addStep('processed_array', { path, count: processed.length });
        processed.forEach((m, i) => candidates.push({
          message: m,
          envelope: node,
          contact,
          source: `${path}.processed[${i}]`,
        }));
      } else if (isEmptyObject(processed)) {
        addStep('processed_empty', { path, hint: 'CampaignBot sent processed:{} — trying meta_raw' });
      } else if (processed && typeof processed === 'object') {
        addStep('processed_object', { path, keys: Object.keys(processed) });
        candidates.push({ message: processed, envelope: node, contact, source: `${path}.processed` });
      } else {
        addStep('processed_unparsed', { path, type: typeof node.processed });
      }
    }

    if (node.meta_raw !== undefined) {
      extractFromMetaRaw(node.meta_raw, node, contact, path, candidates, addStep);
    }

    if (Array.isArray(node.messages)) {
      node.messages.forEach((m, i) => candidates.push({
        message: m,
        envelope: node,
        contact,
        source: `${path}.messages[${i}]`,
      }));
    }

    if (Array.isArray(node.entry)) {
      for (const entry of node.entry) {
        for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
          const value = parseEmbedded(change?.value) || {};
          const valueContacts = Array.isArray(value.contacts) ? value.contacts : [];
          const c = valueContacts[0] || contact;
          for (const message of Array.isArray(value.messages) ? value.messages : []) {
            candidates.push({ message, envelope: value, contact: c, source: `${path}.entry.changes.messages` });
          }
        }
      }
    }

    if (looksLikeMessage(node)) {
      candidates.push({ message: node, envelope: node, contact, source: `${path}(self)` });
    }
  }

  addStep('candidates_before_dedupe', candidates.length);

  const seenIds = new Set();
  const messages = [];
  for (const { message, envelope, contact, source } of candidates) {
    const normalized = normaliseInbound(message, envelope, contact, source);
    if (!normalized) {
      addStep('candidate_rejected', {
        source,
        reason: 'no phone/from',
        keys: message && typeof message === 'object' ? Object.keys(message) : [],
        sample: JSON.stringify(message).slice(0, 500),
      });
      continue;
    }
    if (normalized.messageId) {
      if (seenIds.has(normalized.messageId)) continue;
      seenIds.add(normalized.messageId);
    }
    messages.push(normalized);
    addStep('candidate_accepted', {
      source,
      from: normalized.from,
      messageId: normalized.messageId,
      text: normalized.text?.slice(0, 80),
    });
  }

  addStep('messages_extracted', messages.length);

  if (!messages.length) {
    addStep('extraction_failed', {
      hint: 'CampaignBot POST reached server but no from/text/message_id could be parsed',
      topLevelEvent: firstString(body?.event, body?.type),
      processedType: typeof body?.processed,
      processedKeys: body?.processed && typeof body.processed === 'object' ? Object.keys(body.processed) : null,
    });
  }

  return { messages, debug };
}

/** @deprecated use extractInboundMessagesWithDebug */
export function extractInboundMessages(body = {}) {
  return extractInboundMessagesWithDebug(body).messages;
}

export function detectWebhookEvent(body = {}) {
  for (const { node } of collectEnvelopes(body)) {
    const ev = firstString(node.event, node.type, node.event_type);
    if (ev) return ev;
  }
  return firstString(body?.event, body?.type, body?.event_type) || '';
}
