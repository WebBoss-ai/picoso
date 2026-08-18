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
    const status = await bot.testConnection();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTemplates = async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1',  10);
    const limit = parseInt(req.query.limit || '20', 10);
    const data  = await bot.fetchTemplates(page, limit);
    res.json({ success: true, ...data });
  } catch (err) {
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
