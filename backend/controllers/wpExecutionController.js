/**
 * WP Marketing — Execution & Dashboard controller
 * Handles campaign execution triggers, WhatsApp/template API proxying,
 * AI analysis requests, phase advancement, and dashboard data.
 */

import { WpExperiment, WpCampaignRun } from '../models/wpMarketingModels.js';
import * as engine from '../services/wpExecutionEngine.js';
import * as bot    from '../services/campaignBot.js';
import { uploadBufferToS3 } from '../utils/s3.js';
import { publishVariantsToCampaignBot } from '../services/campaignBotPlaywright.js';
const helperPresence = new Map();

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

    const [s3Result, waResult] = await Promise.all([
      uploadBufferToS3(req.file.buffer, req.file.mimetype, req.file.originalname),
      bot.uploadMedia(req.file.buffer, req.file.mimetype, req.file.originalname),
    ]);

    const media_id = waResult?.data?.media_id;

    res.json({
      success: true,
      s3Url:   s3Result.url,
      s3Key:   s3Result.key,
      media_id,
      data:    { media_id, s3_url: s3Result.url },
    });
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
    const clientErrors = ['not approved', 'not found', 'already has', 'is required', 'No active', 'empty', 'failed to send'];
    const status = clientErrors.some((s) => err.message.includes(s)) ? 400 : 500;
    res.status(status).json({ error: err.message });
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
    const { advancedNums, eliminatedNums, nextCount, phaseNumber } = req.body;

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

/**
 * POST /wp-marketing/experiments/:id/approve-phase
 * Body: { phaseNumber }
 */
export const approvePhase = async (req, res) => {
  try {
    const phaseNumber = parseInt(req.body.phaseNumber || '1', 10);
    const experiment = await engine.approvePhase(req.params.id, phaseNumber, req.wpClient._id);
    res.json({ success: true, experiment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * PUT /wp-marketing/experiments/:id/variants/:variantNumber
 */
export const updateVariant = async (req, res) => {
  try {
    const variantNumber = parseInt(req.params.variantNumber, 10);
    const variant = await engine.updateVariant(
      req.params.id,
      variantNumber,
      req.body,
      req.wpClient._id,
    );
    res.json({ success: true, variant });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * PUT /wp-marketing/experiments/:id/template-config
 */
export const saveTemplateConfig = async (req, res) => {
  try {
    const experiment = await engine.saveTemplateConfig(
      req.params.id,
      req.body,
      req.wpClient._id,
    );
    res.json({ success: true, templateConfig: experiment.plan.templateConfig });
  } catch (err) {
    res.status(400).json({ error: err.message });
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

/* ── Scheduling ──────────────────────────────────────────────────────────── */

/**
 * POST /wp-marketing/experiments/:id/start-phase
 * One-click phase start: creates WpScheduledJob records for all runs.
 * Run 1 fires immediately in background if runSchedules[0].sendNow = true.
 */
export const startPhase = async (req, res) => {
  try {
    const { id } = req.params;
    const { phaseNumber, runSchedules, templateConfig } = req.body;

    if (!phaseNumber || !Array.isArray(runSchedules) || !runSchedules.length) {
      return res.status(400).json({ error: 'phaseNumber and runSchedules[] are required' });
    }

    const jobs = await engine.startPhaseWithSchedule(
      id,
      phaseNumber,
      req.wpClient._id.toString(),
      runSchedules,
      templateConfig || {},
    );

    res.json({
      success: true,
      jobs,
      message: `Phase ${phaseNumber} scheduled — ${jobs.length} run${jobs.length !== 1 ? 's' : ''} queued`,
    });
  } catch (err) {
    const isClient = /already|required|Need at least|must be approved|No active/.test(err.message);
    res.status(isClient ? 400 : 500).json({ error: err.message });
  }
};

/**
 * GET /wp-marketing/experiments/:id/schedule
 * Returns all WpScheduledJob records for this experiment.
 */
export const getSchedule = async (req, res) => {
  try {
    const jobs = await engine.getExperimentSchedule(
      req.params.id,
      req.wpClient._id.toString(),
    );
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /wp-marketing/scheduled-jobs/:jobId
 * Cancel a pending scheduled job.
 */
export const cancelJob = async (req, res) => {
  try {
    await engine.cancelScheduledJob(req.params.jobId, req.wpClient._id.toString());
    res.json({ success: true });
  } catch (err) {
    const isClient = /only cancel|Access denied/.test(err.message);
    res.status(isClient ? 400 : 500).json({ error: err.message });
  }
};

/**
 * PUT /wp-marketing/scheduled-jobs/:jobId
 * Reschedule a pending job to a new scheduledAt datetime.
 */
export const updateJobTime = async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });
    await engine.updateJobScheduledTime(
      req.params.jobId,
      scheduledAt,
      req.wpClient._id.toString(),
    );
    res.json({ success: true });
  } catch (err) {
    const isClient = /only reschedule|Access denied/.test(err.message);
    res.status(isClient ? 400 : 500).json({ error: err.message });
  }
};

/* ── Chrome helper (fills CampaignBot in the user's existing tab) ─────────── */

export const helperHeartbeat = (req, res) => {
  helperPresence.set(String(req.wpClient._id), {
    at: Date.now(),
    onCampaignBot: !!req.body?.onCampaignBot,
  });
  res.json({ success: true });
};

export const getHelperStatus = (req, res) => {
  const s = helperPresence.get(String(req.wpClient._id));
  const live = !!(s && Date.now() - s.at < 20000);
  res.json({
    success: true,
    helperInstalled: live,
    onCampaignBot: live && !!s.onCampaignBot,
  });
};

export const getEdgeStatus = getHelperStatus;

/**
 * Queue unpublished variants and create them on CampaignBot from the backend.
 */
export const publishTemplates = async (req, res) => {
  try {
    const experiment = await WpExperiment.findOne({
      _id: req.params.id,
      clientId: req.wpClient._id,
    });
    if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

    const variantNumbers = Array.isArray(req.body?.variantNumbers) ? req.body.variantNumbers : null;
    let queued = 0;
    for (const v of experiment.variants) {
      if (variantNumbers && !variantNumbers.includes(v.variantNumber)) continue;
      if (v.waPublishStatus !== 'published') {
        v.waPublishStatus = 'queued';
        v.waPublishError = '';
        queued += 1;
      }
    }
    await experiment.save();

    setImmediate(async () => {
      try {
        const result = await publishVariantsToCampaignBot(req.params.id, variantNumbers);
        console.log(`[CB Templates] job done — published:${result.published} failed:${result.failed}`);
      } catch (err) {
        console.error('[CB Templates] job error:', err.message);
      }
    });

    res.json({
      success: true,
      queued,
      started: true,
      message: 'Templates are being created on CampaignBot in the background. Stay on this page to watch progress.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const claimPublishJob = async (req, res) => {
  try {
    const exp = await WpExperiment.findOne({
      clientId: req.wpClient._id,
      'variants.waPublishStatus': 'queued',
    }).sort({ updatedAt: -1 });

    if (!exp) return res.json({ job: null });

    const v = exp.variants.find((x) => x.waPublishStatus === 'queued');
    if (!v) return res.json({ job: null });

    const updated = await WpExperiment.updateOne(
      {
        _id: exp._id,
        clientId: req.wpClient._id,
        variants: { $elemMatch: { variantNumber: v.variantNumber, waPublishStatus: 'queued' } },
      },
      { $set: { 'variants.$.waPublishStatus': 'publishing', 'variants.$.waPublishError': '', updatedAt: new Date() } },
    );
    if (!updated.modifiedCount) return res.json({ job: null });

    const payload = v.toObject ? v.toObject() : v;
    res.json({
      job: {
        experimentId: String(exp._id),
        variantNumber: v.variantNumber,
        variant: payload,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const reportPublishResult = async (req, res) => {
  try {
    const ok = !!req.body?.ok;
    const templateName = req.body?.templateName || '';
    const error = req.body?.error || '';
    const variantNumber = Number(req.params.variantNumber);

    const set = {
      'variants.$.waPublishStatus': ok ? 'published' : 'failed',
      'variants.$.waPublishError': ok ? '' : error,
      updatedAt: new Date(),
    };
    if (ok) {
      set['variants.$.waPublishedAt'] = new Date();
      if (templateName) set['variants.$.templateName'] = templateName;
    }

    const result = await WpExperiment.updateOne(
      {
        _id: req.params.id,
        clientId: req.wpClient._id,
        'variants.variantNumber': variantNumber,
      },
      { $set: set },
    );
    if (!result.matchedCount) return res.status(404).json({ error: 'Variant not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
