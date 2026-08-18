/**
 * WP Marketing — Execution & Dashboard controller
 * Handles campaign execution triggers, WhatsApp/template API proxying,
 * AI analysis requests, phase advancement, and dashboard data.
 */

import { WpExperiment, WpCampaignRun } from '../models/wpMarketingModels.js';
import * as engine from '../services/wpExecutionEngine.js';
import * as bot    from '../services/campaignBot.js';

/* ── WhatsApp connection & templates ─────────────────────────────────────── */

export const getWaStatus = async (req, res) => {
  try {
    console.log(`[WP Exec] getWaStatus — client: ${req.wpClient?.slug}`);
    const status = await bot.testConnection();
    console.log(`[WP Exec] WA status: ${JSON.stringify(status)}`);
    res.json({ success: true, ...status });
  } catch (err) {
    console.error('[WP Exec] getWaStatus error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getTemplates = async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1',  10);
    const limit = parseInt(req.query.limit || '20', 10);
    console.log(`[WP Exec] getTemplates — client: ${req.wpClient?.slug} page:${page} limit:${limit}`);
    const data  = await bot.fetchTemplates(page, limit);
    console.log(`[WP Exec] Templates fetched: ${data?.total ?? 0} total`);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[WP Exec] getTemplates error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const sendTestMessage = async (req, res) => {
  try {
    const { recipientPhone, recipientName, messageContent } = req.body;
    if (!recipientPhone || !messageContent) {
      return res.status(400).json({ error: 'recipientPhone and messageContent required' });
    }
    const result = await bot.sendText({ recipientPhone, recipientName, messageContent });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Unified message send ────────────────────────────────────────────────── */

/**
 * POST /wp-marketing/wa/send
 * Unified handler for text, media, and template messages.
 */
export const sendMessage = async (req, res) => {
  try {
    const {
      recipientPhone, recipientName,
      messageType,
      // text
      messageContent, replyToMessageId,
      // media
      mediaUrl, caption, filename,
      // template
      templateName, languageCode, templateParams,
      dynamicHeader, dynamicButtons,
    } = req.body;

    if (!recipientPhone) return res.status(400).json({ error: 'recipientPhone is required' });
    if (!messageType)    return res.status(400).json({ error: 'messageType is required' });

    let result;

    if (messageType === 'text') {
      if (!messageContent) return res.status(400).json({ error: 'messageContent is required for text messages' });
      result = await bot.sendText({ recipientPhone, recipientName, messageContent, replyToMessageId });

    } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
      if (!mediaUrl) return res.status(400).json({ error: `mediaUrl (media object ID) is required for ${messageType} messages` });
      result = await bot.sendMedia({ recipientPhone, recipientName, messageType, mediaUrl, caption, filename });

    } else if (messageType === 'template') {
      if (!templateName) return res.status(400).json({ error: 'templateName is required for template messages' });
      result = await bot.sendTemplate({
        recipientPhone,
        recipientName,
        templateName,
        languageCode:   languageCode   || 'en_US',
        templateParams: templateParams || [],
        dynamicHeader,
        dynamicButtons,
      });

    } else {
      return res.status(400).json({ error: `Invalid messageType "${messageType}". Allowed: text | image | video | audio | document | template` });
    }

    console.log(`[WP Exec] sendMessage OK — type:${messageType} to:${recipientPhone}`);
    res.json({ success: true, result });
  } catch (err) {
    console.error('[WP Exec] sendMessage error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ── Bulk template send ──────────────────────────────────────────────────── */

/**
 * POST /wp-marketing/wa/bulk-send
 */
export const sendBulkTemplate = async (req, res) => {
  try {
    const {
      templateId, templateName,
      campaignName, campaignDescription,
      languageCode, dynamicHeader,
      recipients,
    } = req.body;

    if (!templateId)         return res.status(400).json({ error: 'templateId is required' });
    if (!templateName)       return res.status(400).json({ error: 'templateName is required' });
    if (!campaignName)       return res.status(400).json({ error: 'campaignName is required' });
    if (!recipients?.length) return res.status(400).json({ error: 'recipients array is required and must not be empty' });

    // Validate each recipient has a phone
    const invalid = recipients.filter((r) => !r.phone);
    if (invalid.length) return res.status(400).json({ error: `${invalid.length} recipient(s) are missing phone numbers` });

    const result = await bot.sendBulkTemplate({
      templateId,
      templateName,
      campaignName,
      campaignDescription: campaignDescription || '',
      languageCode:        languageCode || 'en_US',
      dynamicHeader,
      recipients,
    });

    console.log(`[WP Exec] sendBulkTemplate OK — ${recipients.length} recipients | campaign: ${campaignName}`);
    res.json({ success: true, result });
  } catch (err) {
    console.error('[WP Exec] sendBulkTemplate error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ── Media upload ────────────────────────────────────────────────────────── */

/**
 * POST /wp-marketing/wa/media/upload
 * Accepts multipart/form-data with field "file".
 * Returns { success: true, media_id: "..." }
 */
export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field "file".' });

    console.log(`[WP Exec] uploadMedia — file:${req.file.originalname} type:${req.file.mimetype} size:${req.file.size}`);
    const result = await bot.uploadMedia(req.file.buffer, req.file.mimetype, req.file.originalname);

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[WP Exec] uploadMedia error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ── Experiment execution ────────────────────────────────────────────────── */

/**
 * POST /wp-marketing/experiments/:id/execute
 * Body: { phaseIndex, templateConfig: { templateId, templateName, languageCode, hasUrlButton, dynamicHeader? } }
 */
export const executeRun = async (req, res) => {
  try {
    const { phaseIndex = 0, templateConfig = {} } = req.body;

    const experiment = await WpExperiment.findOne({
      _id: req.params.id,
      clientId: req.wpClient._id,
    });
    if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

    const run = await engine.executePhaseRun(req.params.id, phaseIndex, templateConfig);
    res.json({ success: true, run });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /wp-marketing/experiments/:id/analyze
 * Body: { phaseNumber }
 */
export const analyzeRun = async (req, res) => {
  try {
    const phaseNumber = parseInt(req.body.phaseNumber || '1', 10);

    const experiment = await WpExperiment.findOne({
      _id: req.params.id,
      clientId: req.wpClient._id,
    });
    if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

    const analysis = await engine.analyzePhaseResults(req.params.id, phaseNumber);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /wp-marketing/experiments/:id/advance
 * Advances to the next phase (updates variant statuses) after a successful analysis.
 * Body: { advancedNums: [1,3,5,...], eliminatedNums: [2,4,...], nextCount: 5 }
 */
export const advancePhase = async (req, res) => {
  try {
    const { advancedNums, eliminatedNums, nextCount } = req.body;

    const experiment = await WpExperiment.findOne({
      _id: req.params.id,
      clientId: req.wpClient._id,
    });
    if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

    await engine.advanceToNextPhase(req.params.id, advancedNums, eliminatedNums, nextCount);
    const updated = await WpExperiment.findById(req.params.id);
    res.json({ success: true, experiment: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Dashboard ───────────────────────────────────────────────────────────── */

/**
 * GET /wp-marketing/experiments/:id/dashboard
 * Returns everything the campaign dashboard needs in one call.
 */
export const getDashboard = async (req, res) => {
  try {
    const experiment = await WpExperiment.findOne({
      _id: req.params.id,
      clientId: req.wpClient._id,
    });
    if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

    const snapshot = await engine.buildDashboardSnapshot(req.params.id);
    res.json({ success: true, ...snapshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /wp-marketing/campaigns/:id/experiment
 * Returns the experiment linked to a campaign (used to load dashboard from campaign list).
 */
export const getExperimentByCampaign = async (req, res) => {
  try {
    const experiment = await WpExperiment.findOne({
      campaignId: req.params.id,
      clientId:   req.wpClient._id,
    });
    if (!experiment) return res.status(404).json({ error: 'No experiment found' });
    res.json(experiment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
