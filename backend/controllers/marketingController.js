/**
 * Marketing controller — WhatsApp connection, welcome automation, single sends,
 * and mass (bulk) campaigns. All routes are PIN-protected upstream.
 */

import { WaCampaign, WaMessageLog } from '../models/Model.js';
import * as wa from '../services/whatsapp/waClient.js';
import { getWelcomeConfig } from '../services/whatsapp/welcome.js';
import { WelcomeConfig } from '../models/Model.js';
import { parseRecipients, shuffle, buildMessage, toChatId, typingDurationMs } from '../services/whatsapp/antiBan.js';
import { startCampaign, pauseCampaign, stopCampaign, isCampaignRunning } from '../services/whatsapp/campaignRunner.js';

/* ── Auth ping ─────────────────────────────────────────────────────────────── */
export const verifyPin = (req, res) => res.json({ success: true });

/* ── WhatsApp connection ───────────────────────────────────────────────────── */
export const getWaStatus = (req, res) => {
  res.json(wa.getState());
};

export const initWa = async (req, res) => {
  const state = await wa.initClient();
  res.json({ success: true, status: state.status, qr: state.qrDataUrl || null });
};

export const restartWa = async (req, res) => {
  await wa.restart();
  res.json({ success: true, status: wa.getState().status });
};

export const logoutWa = async (req, res) => {
  await wa.logout();
  res.json({ success: true });
};

/* ── Single send (test / one-off) ──────────────────────────────────────────── */
export const sendSingle = async (req, res) => {
  try {
    const { phone, name = '', message = '', imageBase64 = '', imageMime = 'image/png', imageUrl = '' } = req.body;
    if (!wa.isReady()) return res.status(400).json({ error: 'WhatsApp not connected' });

    const chatId = toChatId(phone);
    if (!chatId) return res.status(400).json({ error: 'Invalid phone number' });

    const body = buildMessage(message, { name, phone });
    const media = imageUrl ? { url: imageUrl } : (imageBase64 ? { base64: imageBase64, mimetype: imageMime, filename: 'attachment' } : null);

    await wa.simulateTyping(chatId, typingDurationMs(body));
    await wa.sendMessage(chatId, body, media);

    await WaMessageLog.create({ type: 'single', phone, chatId, status: 'sent', hasMedia: !!media });
    res.json({ success: true });
  } catch (e) {
    await WaMessageLog.create({ type: 'single', phone: req.body?.phone || '', status: 'failed', error: e?.message || String(e) }).catch(() => {});
    res.status(500).json({ error: e?.message || 'Send failed' });
  }
};

/* ── Welcome automation config ─────────────────────────────────────────────── */
export const getWelcome = async (req, res) => {
  const cfg = await getWelcomeConfig();
  res.json(cfg);
};

export const updateWelcome = async (req, res) => {
  try {
    const { enabled, message, imageBase64, imageMime, imageUrl, delaySec } = req.body;
    const cfg = await getWelcomeConfig();
    if (enabled !== undefined) cfg.enabled = !!enabled;
    if (message !== undefined) cfg.message = message;
    if (imageBase64 !== undefined) cfg.imageBase64 = imageBase64;
    if (imageMime !== undefined) cfg.imageMime = imageMime;
    if (imageUrl !== undefined) cfg.imageUrl = imageUrl;
    if (delaySec !== undefined) cfg.delaySec = Number(delaySec) || 0;
    cfg.updatedAt = new Date();
    await cfg.save();
    res.json({ success: true, config: cfg });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Update failed' });
  }
};

/* ── Bulk campaigns ────────────────────────────────────────────────────────── */
const splitNumbers = (numbers, numbersText) => {
  let raw = [];
  if (Array.isArray(numbers)) raw = numbers;
  if (typeof numbersText === 'string' && numbersText.trim()) {
    raw = raw.concat(numbersText.split(/[\n\r]+/));
  }
  return raw.map((s) => (typeof s === 'string' ? s.trim() : s)).filter(Boolean);
};

export const createCampaign = async (req, res) => {
  try {
    const {
      name = 'Untitled Campaign',
      message = '',
      numbers,
      numbersText,
      imageBase64 = '',
      imageMime = 'image/png',
      imageUrl = '',
      config = {},
      shuffleOrder = true,
    } = req.body;

    const rawList = splitNumbers(numbers, numbersText);
    if (!rawList.length) return res.status(400).json({ error: 'No recipients provided' });
    if (!message.trim() && !imageBase64 && !imageUrl) {
      return res.status(400).json({ error: 'Provide a message and/or an attachment' });
    }

    let recipients = parseRecipients(rawList);
    if (shuffleOrder) recipients = shuffle(recipients);

    const invalidCount = recipients.filter((r) => r.status === 'invalid').length;

    const campaign = await WaCampaign.create({
      name,
      message,
      imageBase64,
      imageMime,
      imageUrl,
      recipients,
      total: recipients.length,
      invalidCount,
      status: 'draft',
      config: {
        minDelaySec:      config.minDelaySec ?? 18,
        maxDelaySec:      config.maxDelaySec ?? 55,
        batchSize:        config.batchSize ?? 20,
        batchCooldownMin: config.batchCooldownMin ?? 12,
        dailyCap:         config.dailyCap ?? 250,
        warmup:           config.warmup ?? true,
        validateNumbers:  config.validateNumbers ?? true,
        typingSim:        config.typingSim ?? true,
        activeHourStart:  config.activeHourStart ?? 8,
        activeHourEnd:    config.activeHourEnd ?? 22,
      },
    });

    res.json({ success: true, id: campaign._id, total: campaign.total, invalidCount });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Create failed' });
  }
};

export const listCampaigns = async (req, res) => {
  const items = await WaCampaign.find({}, {
    name: 1, status: 1, total: 1, sentCount: 1, failedCount: 1, invalidCount: 1,
    cursor: 1, createdAt: 1, startedAt: 1, finishedAt: 1, lastError: 1,
  }).sort({ createdAt: -1 }).limit(100).lean();
  const withRunning = items.map((c) => ({ ...c, running: isCampaignRunning(c._id) }));
  res.json(withRunning);
};

export const getCampaign = async (req, res) => {
  const c = await WaCampaign.findById(req.params.id).lean();
  if (!c) return res.status(404).json({ error: 'Not found' });
  // Trim media payloads out of the response (they can be large).
  delete c.imageBase64;
  c.running = isCampaignRunning(c._id);
  res.json(c);
};

export const startCampaignCtrl = async (req, res) => {
  if (!wa.isReady()) return res.status(400).json({ error: 'WhatsApp not connected' });
  const result = await startCampaign(req.params.id);
  if (!result.started) return res.status(400).json({ error: result.reason || 'Could not start' });
  res.json({ success: true });
};

export const pauseCampaignCtrl = async (req, res) => {
  await pauseCampaign(req.params.id);
  res.json({ success: true });
};

export const stopCampaignCtrl = async (req, res) => {
  await stopCampaign(req.params.id);
  res.json({ success: true });
};

export const deleteCampaign = async (req, res) => {
  if (isCampaignRunning(req.params.id)) return res.status(400).json({ error: 'Stop the campaign before deleting' });
  await WaCampaign.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

/* ── Logs & stats ──────────────────────────────────────────────────────────── */
export const getLogs = async (req, res) => {
  const type = req.query.type;
  const q = type ? { type } : {};
  const logs = await WaMessageLog.find(q).sort({ createdAt: -1 }).limit(200).lean();
  res.json(logs);
};

export const getStats = async (req, res) => {
  const [welcomeSent, campaignSent, totalFailed] = await Promise.all([
    WaMessageLog.countDocuments({ type: 'welcome', status: 'sent' }),
    WaMessageLog.countDocuments({ type: 'campaign', status: 'sent' }),
    WaMessageLog.countDocuments({ status: 'failed' }),
  ]);
  res.json({
    connection: wa.getState().status,
    welcomeSent,
    campaignSent,
    totalFailed,
  });
};
