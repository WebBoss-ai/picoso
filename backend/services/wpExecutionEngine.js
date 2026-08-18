/**
 * WP Marketing Execution Engine
 * Handles audience allocation, bulk sends, webhook-driven metric aggregation,
 * AI-powered run analysis, and variant advancement (10 → 5 → 3 → 1).
 */

import crypto from 'crypto';
import { WpExperiment, WpContactList, WpMessageLog, WpCampaignRun } from '../models/wpMarketingModels.js';
import { sendBulkTemplate } from './campaignBot.js';
import { CohereProvider } from '../llm/provider/cohere.js';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateShortCode() {
  return crypto.randomBytes(4).toString('hex'); // 8-char hex
}

function normalisePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (raw.startsWith('+')) return raw;
  return `+${digits}`;
}

/** Return the active variants for a given phase index. */
function activeVariantsForPhase(variants, phaseIndex) {
  if (phaseIndex === 0) return variants.filter((v) => v.status === 'active');
  if (phaseIndex === 1) return variants.filter((v) => ['top5', 'active'].includes(v.status));
  if (phaseIndex === 2) return variants.filter((v) => v.status === 'top3');
  return variants.filter((v) => v.status === 'winner');
}

/**
 * Allocate contacts evenly across active variants.
 * Returns { [variantIndex]: [contacts] }
 */
function allocateContacts(contacts, variantCount, contactsPerVariant) {
  const shuffled = shuffleArray(contacts);
  const allocations = {};
  for (let i = 0; i < variantCount; i++) {
    const start = i * contactsPerVariant;
    allocations[i] = shuffled.slice(start, start + contactsPerVariant);
  }
  return allocations;
}

/* ── Execute a phase run ─────────────────────────────────────────────────── */

/**
 * @param {string} experimentId
 * @param {number} phaseIndex   0-based (0 = Phase 1)
 * @param {object} templateConfig { templateId, templateName, languageCode, hasUrlButton, dynamicHeader? }
 * @returns {WpCampaignRun}
 */
export async function executePhaseRun(experimentId, phaseIndex, templateConfig = {}) {
  const experiment = await WpExperiment.findById(experimentId);
  if (!experiment) throw new Error('Experiment not found');
  if (!['approved', 'running'].includes(experiment.status)) {
    throw new Error(`Experiment status is "${experiment.status}" — must be approved or running`);
  }

  const phase = experiment.plan.phases[phaseIndex];
  if (!phase) throw new Error(`Phase ${phaseIndex + 1} not found in experiment plan`);

  // Determine run number (how many runs have already been executed for this phase)
  const completedRunCount = await WpCampaignRun.countDocuments({
    experimentId,
    phaseNumber: phaseIndex + 1,
    status: { $in: ['completed', 'analyzed'] },
  });

  const runNumber = completedRunCount + 1;
  if (runNumber > phase.rounds) {
    throw new Error(`Phase ${phaseIndex + 1} already has ${phase.rounds} runs completed`);
  }

  // Get active variants for this phase
  const activeVariants = activeVariantsForPhase(experiment.variants, phaseIndex);
  if (activeVariants.length === 0) throw new Error('No active variants for this phase');

  // Load contact list
  const list = await WpContactList.findById(experiment.contactListId).lean();
  if (!list?.contacts?.length) throw new Error('Contact list is empty');

  // Allocate contacts
  const allocations = allocateContacts(
    list.contacts,
    activeVariants.length,
    phase.contactsPerVariant,
  );

  // Create campaign run record
  const run = await WpCampaignRun.create({
    clientId:    experiment.clientId,
    experimentId,
    phaseNumber: phaseIndex + 1,
    runNumber,
    status:      'running',
    startedAt:   new Date(),
    variantNumbers: activeVariants.map((v) => v.variantNumber),
    scheduledAt: phase.scheduledDates?.[completedRunCount] || new Date(),
  });

  const API_BASE = process.env.API_PUBLIC_URL || 'https://picoso.in/api';
  let totalSent  = 0;
  let totalFailed = 0;

  // Send messages per variant
  for (let vi = 0; vi < activeVariants.length; vi++) {
    const variant  = activeVariants[vi];
    const contacts = allocations[vi] || [];
    if (!contacts.length) continue;

    // Build per-recipient data + create message log records
    const bulkRecipients = [];

    for (const contact of contacts) {
      const phone = normalisePhone(contact.phone);
      if (!phone) continue;

      const shortCode  = generateShortCode();
      const trackingUrl = `${API_BASE}/t/${shortCode}`;

      // Create message log (queued state)
      const msgLog = await WpMessageLog.create({
        clientId:      experiment.clientId,
        experimentId,
        campaignRunId: run._id,
        variantNumber: variant.variantNumber,
        phaseNumber:   phaseIndex + 1,
        runNumber,
        contactPhone:  contact.phone,
        contactName:   contact.name || '',
        status:        'queued',
        templateName:  templateConfig.templateName || '',
        trackingShortCode: shortCode,
        trackingUrl,
      });

      // Template params: [name, offer, CTA]
      const tParams = [
        contact.name || 'Customer',
        variant.offer || '',
        variant.cta   || '',
      ];

      // Dynamic button carries the tracking short-code as URL suffix
      const dynButtons = templateConfig.hasUrlButton
        ? [{ type: 'url', index: 0, variableValue: shortCode }]
        : undefined;

      bulkRecipients.push({
        phone,
        name:           contact.name || '',
        templateParams: tParams,
        ...(dynButtons ? { dynamicButtons: dynButtons } : {}),
        _logId: msgLog._id.toString(),
      });
    }

    // Strip internal _logId before API call
    const apiPayload = bulkRecipients.map(({ _logId, ...r }) => r);

    try {
      const result = await sendBulkTemplate({
        templateId:         templateConfig.templateId   || '',
        templateName:       templateConfig.templateName || `wpm_variant_${variant.variantNumber}`,
        campaignName:       `Exp ${experimentId.toString().slice(-6)} P${phaseIndex + 1}R${runNumber} ${variant.label}`,
        campaignDescription: experiment.plan.experimentTitle || '',
        languageCode:       templateConfig.languageCode || 'en_US',
        dynamicHeader:      templateConfig.dynamicHeader,
        recipients:         apiPayload,
      });

      const refId = result?.payload?.campaignRefId || null;

      // Mark logs as sent
      await WpMessageLog.updateMany(
        { campaignRunId: run._id, variantNumber: variant.variantNumber },
        { $set: { status: 'sent', sentAt: new Date(), campaignBotRefId: refId } },
      );

      // Increment variant sent counter on experiment
      await WpExperiment.updateOne(
        { _id: experimentId, 'variants.variantNumber': variant.variantNumber },
        { $inc: { 'variants.$.metrics.sent': contacts.length } },
      );

      totalSent += contacts.length;
    } catch (err) {
      // Mark logs as failed
      await WpMessageLog.updateMany(
        { campaignRunId: run._id, variantNumber: variant.variantNumber },
        { $set: { status: 'failed', failedAt: new Date(), failureMsg: err.message } },
      );
      totalFailed += contacts.length;
    }
  }

  // Finalise run record
  run.status       = 'completed';
  run.completedAt  = new Date();
  run.contactCount = totalSent;
  await run.save();

  // Mark experiment as running
  if (experiment.status === 'approved') {
    await WpExperiment.findByIdAndUpdate(experimentId, { status: 'running' });
  }

  return run;
}

/* ── AI analysis of a completed phase ───────────────────────────────────── */

/**
 * Compute per-variant metrics from message logs, score variants, call AI
 * for a natural-language explanation, then persist the analysis on the run.
 */
export async function analyzePhaseResults(experimentId, phaseNumber) {
  const experiment = await WpExperiment.findById(experimentId);
  if (!experiment) throw new Error('Experiment not found');

  const phase = experiment.plan.phases[phaseNumber - 1];
  if (!phase) throw new Error(`Phase ${phaseNumber} not found`);

  // Get all runs for this phase that are completed
  const runs = await WpCampaignRun.find({
    experimentId,
    phaseNumber,
    status: { $in: ['completed', 'analyzed'] },
  }).lean();

  if (!runs.length) throw new Error('No completed runs found for this phase');

  // Aggregate message logs across all phase runs
  const logs = await WpMessageLog.find({ experimentId, phaseNumber }).lean();

  // Build per-variant metrics map
  const activeVariants = activeVariantsForPhase(experiment.variants, phaseNumber - 1);

  const variantStats = activeVariants.map((v) => {
    const vLogs = logs.filter((l) => l.variantNumber === v.variantNumber);
    const sent       = vLogs.length;
    const delivered  = vLogs.filter((l) => ['delivered', 'read'].includes(l.status)).length;
    const read       = vLogs.filter((l) => l.status === 'read').length;
    const clicks     = vLogs.reduce((s, l) => s + (l.totalClicks || 0), 0);
    const unique     = vLogs.filter((l) => l.clicked).length;
    const replies    = vLogs.filter((l) => l.replied).length;
    const conversions= vLogs.filter((l) => l.converted).length;
    const revenue    = vLogs.reduce((s, l) => s + (l.conversionValue || 0), 0);

    const deliveryRate   = sent       > 0 ? (delivered   / sent       * 100) : 0;
    const readRate       = delivered  > 0 ? (read        / delivered  * 100) : 0;
    const clickRate      = sent       > 0 ? (unique      / sent       * 100) : 0;
    const conversionRate = sent       > 0 ? (conversions / sent       * 100) : 0;

    // Weighted performance score
    // Conversions 3×, revenue (normalised) 2×, read rate 0.5×, click rate 1.5×
    const score = conversionRate * 3 + clickRate * 1.5 + readRate * 0.5 + (revenue > 0 ? 1 : 0) * 2;

    return {
      variantNumber: v.variantNumber,
      label:         v.label,
      copyAngle:     v.copyAngle,
      sent, delivered, read, clicks, unique, replies, conversions, revenue,
      deliveryRate: +deliveryRate.toFixed(1),
      readRate:     +readRate.toFixed(1),
      clickRate:    +clickRate.toFixed(1),
      conversionRate: +conversionRate.toFixed(1),
      score:        +score.toFixed(2),
    };
  });

  // Sort by score descending
  variantStats.sort((a, b) => b.score - a.score);

  // Determine how many to advance
  const currentCount = phase.variantCount;
  const nextCount    = currentCount >= 10 ? 5 : currentCount >= 5 ? 3 : currentCount >= 3 ? 1 : 1;

  const advancedNums   = variantStats.slice(0, nextCount).map((v) => v.variantNumber);
  const eliminatedNums = variantStats.slice(nextCount).map((v) => v.variantNumber);

  // AI summary via Cohere
  const llm = new CohereProvider({ maxTokens: 600, timeoutMs: 30000 });
  let summary = '';
  let advancementDecision = '';
  try {
    const statsText = variantStats.map((v, i) =>
      `${i + 1}. ${v.label} (${v.copyAngle}): ${v.sent} sent, ${v.deliveryRate}% delivered, ` +
      `${v.readRate}% read, ${v.clickRate}% click, ${v.conversionRate}% conversion, ${v.revenue} revenue, score ${v.score}`
    ).join('\n');

    const prompt =
      `You are a data-driven marketing analyst. Analyse these WhatsApp campaign variant results and write a concise professional assessment. ` +
      `Identify what drove performance differences, explain why specific variants outperformed others, and state what this means for the next phase. ` +
      `Write in plain sentences only — no markdown, no bullet points.\n\n` +
      `Phase ${phaseNumber} results:\n${statsText}\n\n` +
      `Advancing: ${advancedNums.map((n) => variantStats.find((v) => v.variantNumber === n)?.label).join(', ')}\n` +
      `Eliminated: ${eliminatedNums.map((n) => variantStats.find((v) => v.variantNumber === n)?.label).join(', ') || 'none'}`;

    const result = await llm.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    summary = result.text;
    advancementDecision = nextCount === 1
      ? `${variantStats[0]?.label} selected as the winning template.`
      : `Advancing top ${nextCount} variants to Phase ${phaseNumber + 1}.`;
  } catch {
    summary = 'AI analysis unavailable — review metrics manually.';
    advancementDecision = `Top ${nextCount} variants will proceed.`;
  }

  // Build rankings
  const variantRankings = variantStats.map((v) => ({
    variantNumber: v.variantNumber,
    label:         v.label,
    score:         v.score,
    reason:        `${v.deliveryRate}% delivery, ${v.readRate}% read, ${v.clickRate}% click, ${v.conversionRate}% conversion`,
  }));

  // Persist analysis on the most recent run
  const latestRun = runs[runs.length - 1];
  await WpCampaignRun.findByIdAndUpdate(latestRun._id, {
    status: 'analyzed',
    metrics: {
      sent:         variantStats.reduce((s, v) => s + v.sent, 0),
      delivered:    variantStats.reduce((s, v) => s + v.delivered, 0),
      read:         variantStats.reduce((s, v) => s + v.read, 0),
      clicks:       variantStats.reduce((s, v) => s + v.clicks, 0),
      uniqueClicks: variantStats.reduce((s, v) => s + v.unique, 0),
      replies:      variantStats.reduce((s, v) => s + v.replies, 0),
      conversions:  variantStats.reduce((s, v) => s + v.conversions, 0),
      revenue:      variantStats.reduce((s, v) => s + v.revenue, 0),
    },
    aiAnalysis: {
      summary,
      variantRankings,
      advancementDecision,
      advancedVariants:  advancedNums,
      eliminatedVariants: eliminatedNums,
      generatedAt: new Date(),
    },
  });

  return { variantStats, advancedNums, eliminatedNums, summary, advancementDecision, nextCount };
}

/* ── Advance variants to next phase ─────────────────────────────────────── */

export async function advanceToNextPhase(experimentId, advancedNums, eliminatedNums, nextCount) {
  const experiment = await WpExperiment.findById(experimentId);
  if (!experiment) throw new Error('Experiment not found');

  const isWinner = nextCount === 1;

  for (const v of experiment.variants) {
    let newStatus = v.status;
    if (advancedNums.includes(v.variantNumber)) {
      newStatus = isWinner ? 'winner' : nextCount <= 3 ? 'top3' : 'top5';
    } else if (eliminatedNums.includes(v.variantNumber)) {
      newStatus = 'eliminated';
    }
    if (newStatus !== v.status) {
      await WpExperiment.updateOne(
        { _id: experimentId, 'variants.variantNumber': v.variantNumber },
        { $set: { 'variants.$.status': newStatus } },
      );
    }
  }

  if (isWinner) {
    await WpExperiment.findByIdAndUpdate(experimentId, { status: 'completed' });
  }
}

/* ── Aggregate dashboard snapshot ────────────────────────────────────────── */

export async function buildDashboardSnapshot(experimentId) {
  const [experiment, runs, totalLogs] = await Promise.all([
    WpExperiment.findById(experimentId),
    WpCampaignRun.find({ experimentId }).sort({ createdAt: 1 }).lean(),
    WpMessageLog.countDocuments({ experimentId }),
  ]);

  if (!experiment) throw new Error('Experiment not found');

  // Overall stats
  const [deliveredCount, readCount, clickCount, convCount] = await Promise.all([
    WpMessageLog.countDocuments({ experimentId, status: { $in: ['delivered', 'read'] } }),
    WpMessageLog.countDocuments({ experimentId, status: 'read' }),
    WpMessageLog.countDocuments({ experimentId, clicked: true }),
    WpMessageLog.countDocuments({ experimentId, converted: true }),
  ]);

  const revenueResult = await WpMessageLog.aggregate([
    { $match: { experimentId: experiment._id, converted: true } },
    { $group: { _id: null, total: { $sum: '$conversionValue' } } },
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;

  // Per-variant aggregated stats from logs
  const variantLogs = await WpMessageLog.aggregate([
    { $match: { experimentId: experiment._id } },
    {
      $group: {
        _id:          '$variantNumber',
        sent:         { $sum: 1 },
        delivered:    { $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] } },
        read:         { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        clicks:       { $sum: '$totalClicks' },
        uniqueClicks: { $sum: { $cond: ['$clicked', 1, 0] } },
        replies:      { $sum: { $cond: ['$replied', 1, 0] } },
        conversions:  { $sum: { $cond: ['$converted', 1, 0] } },
        revenue:      { $sum: '$conversionValue' },
      },
    },
  ]);

  const variantStatsMap = {};
  for (const row of variantLogs) variantStatsMap[row._id] = row;

  // Merge with variant metadata
  const variants = experiment.variants.map((v) => {
    const s = variantStatsMap[v.variantNumber] || {};
    return {
      variantNumber: v.variantNumber,
      label:         v.label,
      copyAngle:     v.copyAngle,
      tone:          v.tone,
      status:        v.status,
      sent:          s.sent         || 0,
      delivered:     s.delivered    || 0,
      read:          s.read         || 0,
      clicks:        s.clicks       || 0,
      uniqueClicks:  s.uniqueClicks || 0,
      replies:       s.replies      || 0,
      conversions:   s.conversions  || 0,
      revenue:       s.revenue      || 0,
      deliveryRate:  s.sent > 0 ? +((s.delivered || 0) / s.sent * 100).toFixed(1) : 0,
      readRate:      s.delivered > 0 ? +((s.read || 0) / s.delivered * 100).toFixed(1) : 0,
      clickRate:     s.sent > 0 ? +((s.uniqueClicks || 0) / s.sent * 100).toFixed(1) : 0,
      conversionRate:s.sent > 0 ? +((s.conversions || 0) / s.sent * 100).toFixed(1) : 0,
    };
  });

  return {
    experiment: {
      id:     experiment._id,
      status: experiment.status,
      title:  experiment.plan.experimentTitle,
      objective: experiment.plan.objective,
      phases: experiment.plan.phases,
    },
    overall: {
      totalMessages: totalLogs,
      delivered:     deliveredCount,
      read:          readCount,
      uniqueClicks:  clickCount,
      conversions:   convCount,
      revenue:       totalRevenue,
      deliveryRate:  totalLogs > 0 ? +( deliveredCount / totalLogs * 100).toFixed(1) : 0,
      readRate:      deliveredCount > 0 ? +(readCount / deliveredCount * 100).toFixed(1) : 0,
      clickRate:     totalLogs > 0 ? +(clickCount / totalLogs * 100).toFixed(1) : 0,
      conversionRate:totalLogs > 0 ? +(convCount / totalLogs * 100).toFixed(1) : 0,
    },
    variants,
    runs,
  };
}
