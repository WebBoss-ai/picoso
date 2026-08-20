/**
 * WP Marketing Execution Engine
 * Handles audience allocation, sends, webhook-driven metrics, AI analysis,
 * and variant advancement (10 → 5 → 3 → 1).
 */

import crypto from 'crypto';
import {
  WpExperiment, WpContactList, WpMessageLog, WpCampaignRun, WpTrackingLink, WpScheduledJob,
} from '../models/wpMarketingModels.js';
import { sendTemplate, sendText } from './campaignBot.js';
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
  return crypto.randomBytes(4).toString('hex');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * Split contacts evenly across variants (round-robin).
 * With 2 contacts and 10 variants → 2 variants each get 1 contact.
 */
function allocateContacts(contacts, variantCount, maxPerVariant = Infinity) {
  const valid = contacts.filter((c) => normalisePhone(c.phone));
  const shuffled = shuffleArray(valid);
  const allocations = {};
  for (let i = 0; i < variantCount; i++) allocations[i] = [];

  shuffled.forEach((contact, idx) => {
    const vi = idx % variantCount;
    if (allocations[vi].length < maxPerVariant) {
      allocations[vi].push(contact);
    }
  });

  return allocations;
}

/** Count positional {{n}} variables in a template body. */
function bodyVarCount(body) {
  const matches = [...String(body || '').matchAll(/\{\{(\d+)\}\}/g)];
  return matches.reduce((max, m) => Math.max(max, parseInt(m[1], 10)), 0);
}

/** Params for WhatsApp template send — {{1}} = name, {{2}} = tracking code. */
function buildTemplateParams(variant, contact, shortCode) {
  const name = contact.name || 'Customer';
  const count = bodyVarCount(variant.body || variant.message);
  const params = [];
  for (let i = 1; i <= Math.max(count, 1); i++) {
    if (i === 1) params.push(name);
    else if (i === 2) params.push(shortCode);
    else params.push(variant.offer || '');
  }
  return params;
}

function variantHasUrlButton(variant) {
  return (variant.buttons || []).some((b) => b.type === 'URL') || variant.footerType === 'BUTTONS';
}

function renderTextBody(variant, contact, trackingUrl) {
  const name = contact.name || 'Customer';
  let body = String(variant.body || variant.message || '')
    .replace(/\{\{name\}\}/gi, name)
    .replace(/\{\{1\}\}/g, name)
    .replace(/\{\{2\}\}/g, trackingUrl);
  if (variant.headerType === 'TEXT' && variant.headerText) {
    body = `*${variant.headerText}*\n\n${body}`;
  }
  if (variant.footerType === 'TEXT' && variant.footerText) {
    body += `\n\n_${variant.footerText}_`;
  }
  if (trackingUrl && variantHasUrlButton(variant)) {
    body += `\n${trackingUrl}`;
  }
  return body.trim();
}

function variantDestUrl(variant, fallback = 'https://picoso.in') {
  const btn = (variant.buttons || []).find((b) => b.type === 'URL' && b.url);
  return btn?.url || fallback;
}

/** Merge saved experiment templateConfig with per-run overrides. */
function resolveTemplateConfig(experiment, overrides = {}) {
  const saved = experiment.plan?.templateConfig || {};
  return {
    templateId:      overrides.templateId      || saved.templateId      || '',
    templateName:    overrides.templateName    || saved.templateName    || '',
    languageCode:    overrides.languageCode    || saved.languageCode    || 'en_US',
    hasUrlButton:    overrides.hasUrlButton    ?? saved.hasUrlButton    ?? false,
    destinationUrl:  overrides.destinationUrl  || saved.destinationUrl  || 'https://picoso.in',
    dynamicHeader:   overrides.dynamicHeader   || null,
  };
}

/* ── Phase approval ──────────────────────────────────────────────────────── */

export async function approvePhase(experimentId, phaseNumber, clientId) {
  const experiment = await WpExperiment.findOne({ _id: experimentId, clientId });
  if (!experiment) throw new Error('Experiment not found');
  if (!['approved', 'running'].includes(experiment.status)) {
    throw new Error(`Experiment must be approved before activating a phase (current: ${experiment.status})`);
  }

  const phaseIndex = phaseNumber - 1;
  const phase = experiment.plan.phases[phaseIndex];
  if (!phase) throw new Error(`Phase ${phaseNumber} not found`);

  if (phase.status === 'completed') throw new Error(`Phase ${phaseNumber} is already completed`);
  if (phase.status === 'running') throw new Error(`Phase ${phaseNumber} is already approved and running`);

  // Phase 2+ requires previous phase completed
  if (phaseIndex > 0) {
    const prev = experiment.plan.phases[phaseIndex - 1];
    if (prev?.status !== 'completed') {
      throw new Error(`Phase ${phaseNumber - 1} must be completed before approving Phase ${phaseNumber}`);
    }
  }

  await WpExperiment.updateOne(
    { _id: experimentId },
    {
      $set: {
        [`plan.phases.${phaseIndex}.status`]:     'running',
        [`plan.phases.${phaseIndex}.approvedAt`]: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return WpExperiment.findById(experimentId);
}

/* ── Execute a phase run (one run per click) ─────────────────────────────── */

export async function executePhaseRun(experimentId, phaseIndex, templateConfig = {}) {
  const experiment = await WpExperiment.findById(experimentId);
  if (!experiment) throw new Error('Experiment not found');
  if (!['approved', 'running'].includes(experiment.status)) {
    throw new Error(`Experiment status is "${experiment.status}" — must be approved or running`);
  }

  const phase = experiment.plan.phases[phaseIndex];
  if (!phase) throw new Error(`Phase ${phaseIndex + 1} not found in experiment plan`);

  if (phase.status !== 'running') {
    if (phase.status === 'pending') {
      throw new Error(`Phase ${phaseIndex + 1} is not approved yet — approve this phase before executing runs`);
    }
    if (phase.status === 'completed') {
      throw new Error(`Phase ${phaseIndex + 1} is already completed`);
    }
  }

  // Block if a previous phase is still running (not completed)
  for (let i = 0; i < phaseIndex; i++) {
    const prev = experiment.plan.phases[i];
    if (prev && prev.status === 'running') {
      throw new Error(`Complete Phase ${i + 1} (analyse + advance) before running Phase ${phaseIndex + 1}`);
    }
  }

  const completedRunCount = await WpCampaignRun.countDocuments({
    experimentId,
    phaseNumber: phaseIndex + 1,
    status: { $in: ['completed', 'analyzed'] },
  });

  const runNumber = completedRunCount + 1;
  if (runNumber > phase.rounds) {
    throw new Error(`Phase ${phaseIndex + 1} already has ${phase.rounds} runs completed`);
  }

  const destFallback = experiment.plan?.templateConfig?.destinationUrl || templateConfig.destinationUrl || 'https://picoso.in';

  const activeVariants = activeVariantsForPhase(experiment.variants, phaseIndex);
  if (activeVariants.length === 0) throw new Error('No active variants for this phase');

  const list = await WpContactList.findById(experiment.contactListId).lean();
  if (!list?.contacts?.length) throw new Error('Contact list is empty');

  // Minimum 10 contacts per active variant
  const minRequired = activeVariants.length * 10;
  if (list.contacts.length < minRequired) {
    throw new Error(
      `Need at least ${minRequired} contacts for Phase ${phaseIndex + 1} with ${activeVariants.length} variants ` +
      `(minimum 10 per variant). Contact list has ${list.contacts.length} contacts.`,
    );
  }

  const maxPerVariant = phase.contactsPerVariant || Math.ceil(list.contacts.length / activeVariants.length);
  const allocations = allocateContacts(list.contacts, activeVariants.length, maxPerVariant);

  const run = await WpCampaignRun.create({
    clientId:       experiment.clientId,
    experimentId,
    phaseNumber:    phaseIndex + 1,
    runNumber,
    status:         'running',
    startedAt:      new Date(),
    variantNumbers: activeVariants.map((v) => v.variantNumber),
    scheduledAt:    phase.scheduledDates?.[completedRunCount] || new Date(),
  });

  const API_BASE = process.env.API_PUBLIC_URL || 'https://picoso.in/api';
  let totalSent   = 0;
  let totalFailed = 0;

  for (let vi = 0; vi < activeVariants.length; vi++) {
    const variant  = activeVariants[vi];
    const contacts = allocations[vi] || [];
    if (!contacts.length) continue;

    let variantSent   = 0;
    let variantFailed = 0;

    // Per-recipient sends for real-time delivery + per-message status
    for (const contact of contacts) {
      const phone = normalisePhone(contact.phone);
      if (!phone) continue;

      const shortCode     = generateShortCode();
      const trackingUrl   = `${API_BASE}/t/${shortCode}`;
      const tParams       = buildTemplateParams(variant, contact, shortCode);
      const hasUrlBtn     = variantHasUrlButton(variant);
      const dynButtons    = hasUrlBtn
        ? [{ type: 'url', index: 0, variableValue: shortCode }]
        : undefined;
      const destUrl       = variantDestUrl(variant, destFallback);
      const lang          = variant.language || 'en_US';
      const tplName       = variant.templateName || '';

      const msgLog = await WpMessageLog.create({
        clientId:          experiment.clientId,
        experimentId,
        campaignRunId:     run._id,
        variantNumber:     variant.variantNumber,
        phaseNumber:       phaseIndex + 1,
        runNumber,
        contactPhone:      contact.phone,
        contactName:       contact.name || '',
        status:            'queued',
        templateName:      tplName,
        trackingShortCode: shortCode,
        trackingUrl,
      });

      await WpTrackingLink.create({
        shortCode,
        clientId:      experiment.clientId,
        experimentId,
        variantNumber: variant.variantNumber,
        contactPhone:  contact.phone,
        contactName:   contact.name || '',
        originalUrl:   destUrl,
      });

      const dynamicHeader = variant.mediaWaId
        ? { type: 'image', mediaId: variant.mediaWaId, filename: 'promo.jpg' }
        : undefined;

      try {
        let result;
        if (tplName) {
          try {
            result = await sendTemplate({
              recipientPhone: phone,
              recipientName:  contact.name || '',
              templateName:   tplName,
              languageCode:   lang,
              templateParams: tParams,
              dynamicHeader,
              dynamicButtons: dynButtons,
            });
          } catch (tplErr) {
            console.warn(`[WP Exec] template ${tplName} failed (${tplErr.message}) — falling back to text`);
            result = await sendText({
              recipientPhone: phone,
              recipientName:  contact.name || '',
              messageContent: renderTextBody(variant, contact, trackingUrl),
            });
          }
        } else {
          result = await sendText({
            recipientPhone: phone,
            recipientName:  contact.name || '',
            messageContent: renderTextBody(variant, contact, trackingUrl),
          });
        }

        const wamid = result?.payload?.messageId || null;

        await WpMessageLog.findByIdAndUpdate(msgLog._id, {
          $set: { status: 'sent', sentAt: new Date(), wamid },
        });

        variantSent++;
        totalSent++;

        // Small delay to avoid rate limits while keeping near-real-time delivery
        await sleep(120);
      } catch (err) {
        await WpMessageLog.findByIdAndUpdate(msgLog._id, {
          $set: { status: 'failed', failedAt: new Date(), failureMsg: err.message },
        });
        variantFailed++;
        totalFailed++;
      }
    }

    if (variantSent > 0) {
      await WpExperiment.updateOne(
        { _id: experimentId, 'variants.variantNumber': variant.variantNumber },
        { $inc: { 'variants.$.metrics.sent': variantSent } },
      );
    }
  }

  run.status       = totalSent > 0 ? 'completed' : 'failed';
  run.completedAt  = new Date();
  run.contactCount = totalSent;
  run.metrics      = { sent: totalSent };
  await run.save();

  if (experiment.status === 'approved') {
    await WpExperiment.findByIdAndUpdate(experimentId, { status: 'running' });
  }

  if (totalSent === 0 && totalFailed > 0) {
    throw new Error(`All ${totalFailed} message(s) failed to send — check variant templates and API connection`);
  }

  return run;
}

/* ── Update variant copy ─────────────────────────────────────────────────── */

export async function updateVariant(experimentId, variantNumber, updates, clientId) {
  const allowed = [
    'label', 'copyAngle', 'tone', 'offer', 'cta', 'message', 'imageConceptDescription',
    'mediaS3Url', 'mediaWaId', 'scheduledSendTime',
    'templateName', 'category', 'language', 'headerType', 'headerText',
    'body', 'footerType', 'footerText', 'buttons',
    'waPublishStatus', 'waPublishError', 'waPublishedAt',
  ];
  const patch = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) patch[`variants.$.${key}`] = updates[key];
  }
  const n = Number(variantNumber);
  if (n >= 1 && n <= 7) patch['variants.$.category'] = 'UTILITY';
  else if (n >= 8) patch['variants.$.category'] = 'MARKETING';
  if (patch['variants.$.category'] === 'UTILITY' && updates.footerText !== undefined) {
    patch['variants.$.footerText'] = '';
  }
  if (!Object.keys(patch).length) throw new Error('No valid fields to update');

  const result = await WpExperiment.findOneAndUpdate(
    { _id: experimentId, clientId, 'variants.variantNumber': variantNumber },
    { $set: { ...patch, updatedAt: new Date() } },
    { new: true },
  );
  if (!result) throw new Error('Experiment or variant not found');
  return result.variants.find((v) => v.variantNumber === variantNumber);
}

/* ── Save template config on experiment ──────────────────────────────────── */

export async function saveTemplateConfig(experimentId, config, clientId) {
  const experiment = await WpExperiment.findOne({ _id: experimentId, clientId });
  if (!experiment) throw new Error('Experiment not found');

  const fields = {};
  if (config.templateId      !== undefined) fields['plan.templateConfig.templateId']     = config.templateId;
  if (config.templateName    !== undefined) fields['plan.templateConfig.templateName']   = config.templateName;
  if (config.languageCode    !== undefined) fields['plan.templateConfig.languageCode']   = config.languageCode;
  if (config.hasUrlButton    !== undefined) fields['plan.templateConfig.hasUrlButton']   = config.hasUrlButton;
  if (config.destinationUrl  !== undefined) fields['plan.templateConfig.destinationUrl'] = config.destinationUrl;

  await WpExperiment.updateOne({ _id: experimentId }, { $set: { ...fields, updatedAt: new Date() } });
  return WpExperiment.findById(experimentId);
}

/* ── One-click phase start with full schedule ────────────────────────────── */

/**
 * Create WpScheduledJob records for every round in a phase.
 * If runSchedules[0].sendNow = true, Run 1 fires immediately in the background.
 */
export async function startPhaseWithSchedule(experimentId, phaseNumber, clientId, runSchedules, templateConfig = {}) {
  const experiment = await WpExperiment.findOne({ _id: experimentId, clientId });
  if (!experiment) throw new Error('Experiment not found');

  const phaseIndex = phaseNumber - 1;
  const phase = experiment.plan.phases[phaseIndex];
  if (!phase) throw new Error(`Phase ${phaseNumber} not found`);
  if (phase.status !== 'running') {
    throw new Error(`Phase ${phaseNumber} must be approved before starting (current: ${phase.status})`);
  }

  // Check for existing non-cancelled jobs
  const existingJobs = await WpScheduledJob.countDocuments({
    experimentId, phaseNumber, status: { $ne: 'cancelled' },
  });
  if (existingJobs > 0) throw new Error(`Phase ${phaseNumber} has already been scheduled`);

  // Validate minimum contacts (10 per active variant)
  const activeVariants = activeVariantsForPhase(experiment.variants, phaseIndex);
  if (activeVariants.length === 0) throw new Error('No active variants for this phase');
  const list = await WpContactList.findById(experiment.contactListId).lean();
  const contactCount = list?.contacts?.length || 0;
  const minRequired = activeVariants.length * 10;
  if (contactCount < minRequired) {
    throw new Error(
      `Need at least ${minRequired} contacts for Phase ${phaseNumber} with ${activeVariants.length} variants ` +
      `(minimum 10 per variant). Contact list has ${contactCount} contacts.`,
    );
  }

  const destUrl = templateConfig.destinationUrl
    || experiment.plan?.templateConfig?.destinationUrl
    || 'https://picoso.in';

  await WpExperiment.updateOne({ _id: experimentId }, {
    $set: {
      'plan.templateConfig.destinationUrl': destUrl,
      updatedAt: new Date(),
    },
  });

  const createdJobs = [];
  let run1Job = null;

  for (const sched of runSchedules) {
    const isSendNow = sched.runNumber === 1 && sched.sendNow;
    const job = await WpScheduledJob.create({
      clientId:    experiment.clientId,
      experimentId,
      phaseNumber,
      phaseIndex,
      runNumber:   sched.runNumber,
      scheduledAt: new Date(sched.scheduledAt),
      status:      isSendNow ? 'running' : 'pending',
      templateConfig: {
        destinationUrl: destUrl,
      },
    });
    createdJobs.push(job.toObject());
    if (isSendNow) run1Job = job;
  }

  // Fire Run 1 asynchronously if sendNow
  if (run1Job) {
    const jobId = run1Job._id;
    setImmediate(async () => {
      try {
        const run = await executePhaseRun(experimentId, phaseIndex, { destinationUrl: destUrl });
        await WpScheduledJob.findByIdAndUpdate(jobId, {
          status: 'completed', executedAt: new Date(), runId: run._id,
        });
        console.log(`[PhaseStart] Phase ${phaseNumber} Run 1 completed — ${run.contactCount} sent`);
      } catch (err) {
        await WpScheduledJob.findByIdAndUpdate(jobId, { status: 'failed', error: err.message });
        console.error(`[PhaseStart] Phase ${phaseNumber} Run 1 failed: ${err.message}`);
      }
    });
  }

  return createdJobs;
}

/* ── Scheduled job helpers ───────────────────────────────────────────────── */

export async function getExperimentSchedule(experimentId, clientId) {
  const experiment = await WpExperiment.findOne({ _id: experimentId, clientId });
  if (!experiment) throw new Error('Experiment not found');
  return WpScheduledJob.find({ experimentId }).sort({ scheduledAt: 1 }).lean();
}

export async function cancelScheduledJob(jobId, clientId) {
  const job = await WpScheduledJob.findById(jobId);
  if (!job) throw new Error('Scheduled job not found');
  if (job.status !== 'pending') {
    throw new Error(`Can only cancel pending jobs (current status: ${job.status})`);
  }
  const exp = await WpExperiment.findOne({ _id: job.experimentId, clientId });
  if (!exp) throw new Error('Access denied');
  await WpScheduledJob.findByIdAndUpdate(jobId, { status: 'cancelled' });
}

export async function updateJobScheduledTime(jobId, newScheduledAt, clientId) {
  const job = await WpScheduledJob.findById(jobId);
  if (!job) throw new Error('Scheduled job not found');
  if (job.status !== 'pending') {
    throw new Error(`Can only reschedule pending jobs (current status: ${job.status})`);
  }
  const exp = await WpExperiment.findOne({ _id: job.experimentId, clientId });
  if (!exp) throw new Error('Access denied');
  await WpScheduledJob.findByIdAndUpdate(jobId, { scheduledAt: new Date(newScheduledAt) });
}

/* ── AI analysis of a completed phase ───────────────────────────────────── */

export async function analyzePhaseResults(experimentId, phaseNumber) {
  const experiment = await WpExperiment.findById(experimentId);
  if (!experiment) throw new Error('Experiment not found');

  const phase = experiment.plan.phases[phaseNumber - 1];
  if (!phase) throw new Error(`Phase ${phaseNumber} not found`);

  const runs = await WpCampaignRun.find({
    experimentId,
    phaseNumber,
    status: { $in: ['completed', 'analyzed'] },
  }).lean();

  if (!runs.length) throw new Error('No completed runs found for this phase');

  const completedRuns = runs.filter((r) => r.status === 'completed' || r.status === 'analyzed');
  if (completedRuns.length < phase.rounds) {
    throw new Error(`Phase ${phaseNumber} needs ${phase.rounds} completed runs before analysis (${completedRuns.length} done)`);
  }

  const logs = await WpMessageLog.find({ experimentId, phaseNumber }).lean();
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

  variantStats.sort((a, b) => b.score - a.score);

  const currentCount = phase.variantCount;
  const nextCount    = currentCount >= 10 ? 5 : currentCount >= 5 ? 3 : currentCount >= 3 ? 1 : 1;

  const advancedNums   = variantStats.slice(0, nextCount).map((v) => v.variantNumber);
  const eliminatedNums = variantStats.slice(nextCount).map((v) => v.variantNumber);

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

  const variantRankings = variantStats.map((v) => ({
    variantNumber: v.variantNumber,
    label:         v.label,
    score:         v.score,
    reason:        `${v.deliveryRate}% delivery, ${v.readRate}% read, ${v.clickRate}% click, ${v.conversionRate}% conversion`,
  }));

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
      advancedVariants:   advancedNums,
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

  const currentPhaseIndex = experiment.plan.phases.findIndex((p) => p.status === 'running');
  if (currentPhaseIndex === -1) throw new Error('No running phase found to advance from');

  const isWinner = nextCount === 1 && experiment.plan.phases[currentPhaseIndex].variantCount <= 1;

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

  const phaseUpdates = {
    [`plan.phases.${currentPhaseIndex}.status`]: 'completed',
    updatedAt: new Date(),
  };

  const nextPhaseIndex = currentPhaseIndex + 1;
  if (nextPhaseIndex < experiment.plan.phases.length && !isWinner) {
    phaseUpdates[`plan.phases.${nextPhaseIndex}.status`] = 'pending';
  }

  await WpExperiment.updateOne({ _id: experimentId }, { $set: phaseUpdates });

  if (isWinner || currentPhaseIndex === experiment.plan.phases.length - 1) {
    await WpExperiment.findByIdAndUpdate(experimentId, { status: 'completed' });
  }
}

/* ── Aggregate dashboard snapshot ────────────────────────────────────────── */

export async function buildDashboardSnapshot(experimentId) {
  const [experiment, runs, totalLogs, scheduledJobs] = await Promise.all([
    WpExperiment.findById(experimentId),
    WpCampaignRun.find({ experimentId }).sort({ createdAt: 1 }).lean(),
    WpMessageLog.countDocuments({ experimentId }),
    WpScheduledJob.find({ experimentId }).sort({ scheduledAt: 1 }).lean(),
  ]);

  if (!experiment) throw new Error('Experiment not found');

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

  const variants = experiment.variants.map((v) => {
    const s = variantStatsMap[v.variantNumber] || {};
    return {
      variantNumber: v.variantNumber,
      label:         v.label,
      copyAngle:     v.copyAngle,
      tone:          v.tone,
      offer:         v.offer,
      cta:           v.cta,
      message:       v.message,
      templateName:  v.templateName,
      category:      v.category,
      language:      v.language,
      headerType:    v.headerType,
      headerText:    v.headerText,
      body:          v.body,
      footerType:    v.footerType,
      footerText:    v.footerText,
      buttons:       v.buttons,
      waPublishStatus: v.waPublishStatus,
      waPublishError:  v.waPublishError,
      waPublishedAt:   v.waPublishedAt,
      imageConceptDescription: v.imageConceptDescription,
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
      templateConfig: experiment.plan.templateConfig || {},
    },
    overall: {
      totalMessages: totalLogs,
      delivered:     deliveredCount,
      read:          readCount,
      uniqueClicks:  clickCount,
      conversions:   convCount,
      revenue:       totalRevenue,
      deliveryRate:  totalLogs > 0 ? +(deliveredCount / totalLogs * 100).toFixed(1) : 0,
      readRate:      deliveredCount > 0 ? +(readCount / deliveredCount * 100).toFixed(1) : 0,
      clickRate:     totalLogs > 0 ? +(clickCount / totalLogs * 100).toFixed(1) : 0,
      conversionRate:totalLogs > 0 ? +(convCount / totalLogs * 100).toFixed(1) : 0,
    },
    variants,
    runs,
    scheduledJobs,
  };
}
