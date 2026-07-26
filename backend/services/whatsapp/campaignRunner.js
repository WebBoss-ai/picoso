/**
 * Bulk campaign runner.
 *
 * Processes a WaCampaign's recipients ONE BY ONE with the full anti-ban timing
 * model. Supports pause / resume / stop, survives across restarts (resumes from
 * the persisted `cursor`), enforces daily caps and active-hour windows, and
 * trips a circuit breaker on repeated failures to protect the number.
 */

import { WaCampaign, WaMessageLog } from '../../models/Model.js';
import { isReady, isRegistered, simulateTyping, sendMessage } from './waClient.js';
import {
  buildMessage,
  computeSendDelay,
  computeBatchCooldown,
  typingDurationMs,
  isWithinActiveHours,
  todayKey,
  sleep,
} from './antiBan.js';

// campaignId -> control signal ('run' | 'pause' | 'stop')
const control = new Map();

const CIRCUIT_BREAKER_LIMIT = 5; // consecutive failures before auto-pause

/** Interruptible sleep — wakes early if the campaign is paused/stopped. */
const controlledSleep = async (campaignId, ms) => {
  const step = 1000;
  let waited = 0;
  while (waited < ms) {
    const signal = control.get(campaignId);
    if (signal === 'pause' || signal === 'stop') return signal;
    await sleep(Math.min(step, ms - waited));
    waited += step;
  }
  return control.get(campaignId);
};

const buildMedia = (c) => {
  if (c.imageUrl) return { url: c.imageUrl };
  if (c.imageBase64) return { base64: c.imageBase64, mimetype: c.imageMime || 'image/png', filename: 'attachment' };
  return null;
};

const resetDailyIfNeeded = (c) => {
  const key = todayKey();
  if (c.sentTodayDate !== key) {
    c.sentTodayDate = key;
    c.sentToday = 0;
  }
};

/** Main processing loop for a single campaign (runs detached). */
const runLoop = async (campaignId) => {
  let sentInRun = 0;
  let consecutiveFailures = 0;

  try {
    while (true) {
      const signal = control.get(campaignId);
      if (signal === 'stop') { await finalize(campaignId, 'stopped'); return; }
      if (signal === 'pause') { await finalize(campaignId, 'paused'); return; }

      const c = await WaCampaign.findById(campaignId);
      if (!c) { control.delete(campaignId); return; }

      if (c.cursor >= c.recipients.length) { await finalize(campaignId, 'completed'); return; }

      // Connection guard.
      if (!isReady()) {
        c.lastError = 'WhatsApp disconnected — auto-paused. Reconnect and resume.';
        await c.save();
        control.set(campaignId, 'pause');
        await finalize(campaignId, 'paused');
        return;
      }

      // Active-hours guard: sleep in short hops until the window opens.
      if (!isWithinActiveHours(c.config)) {
        c.lastError = `Outside active hours (${c.config.activeHourStart}:00–${c.config.activeHourEnd}:00). Waiting…`;
        await c.save();
        const s = await controlledSleep(campaignId, 5 * 60 * 1000);
        if (s === 'stop') { await finalize(campaignId, 'stopped'); return; }
        if (s === 'pause') { await finalize(campaignId, 'paused'); return; }
        continue;
      }

      // Daily cap guard.
      resetDailyIfNeeded(c);
      if (c.sentToday >= c.config.dailyCap) {
        c.lastError = `Daily cap of ${c.config.dailyCap} reached. Auto-paused until tomorrow.`;
        await c.save();
        control.set(campaignId, 'pause');
        await finalize(campaignId, 'paused');
        return;
      }

      const idx = c.cursor;
      const r = c.recipients[idx];

      // Already-processed rows (e.g. after a resume) — advance cursor.
      if (!r || r.status !== 'queued') {
        c.cursor = idx + 1;
        await c.save();
        continue;
      }

      // Invalid / unparseable number.
      if (!r.chatId) {
        r.status = 'invalid';
        r.error = 'Unparseable number';
        c.invalidCount += 1;
        c.cursor = idx + 1;
        await c.save();
        await logMessage('campaign', campaignId, r, 'invalid', !!buildMedia(c));
        continue;
      }

      // Optional WhatsApp-registration validation (skips dead numbers).
      if (c.config.validateNumbers) {
        let registered = false;
        try { registered = await isRegistered(r.chatId); } catch { registered = false; }
        if (!registered) {
          r.status = 'invalid';
          r.error = 'Not on WhatsApp';
          c.invalidCount += 1;
          c.cursor = idx + 1;
          await c.save();
          await logMessage('campaign', campaignId, r, 'invalid', false);
          continue;
        }
      }

      // Human-like pre-send delay.
      const delay = computeSendDelay(sentInRun, c.config);
      const s1 = await controlledSleep(campaignId, delay);
      if (s1 === 'stop') { await finalize(campaignId, 'stopped'); return; }
      if (s1 === 'pause') { await finalize(campaignId, 'paused'); return; }

      const body = buildMessage(c.message, { name: r.name, phone: r.phone });
      const media = buildMedia(c);

      // Typing simulation.
      if (c.config.typingSim) {
        await simulateTyping(r.chatId, typingDurationMs(body));
      }

      // Send (with a single retry on transient failure).
      let ok = false;
      let errMsg = '';
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        try {
          r.attempts += 1;
          await sendMessage(r.chatId, body, media);
          ok = true;
        } catch (e) {
          errMsg = e?.message || String(e);
          if (attempt === 0) await sleep(3000);
        }
      }

      const fresh = await WaCampaign.findById(campaignId);
      if (!fresh) { control.delete(campaignId); return; }
      resetDailyIfNeeded(fresh);
      const fr = fresh.recipients[idx];

      if (ok) {
        fr.status = 'sent';
        fr.sentAt = new Date();
        fr.attempts = r.attempts;
        fresh.sentCount += 1;
        fresh.sentToday += 1;
        fresh.lastError = '';
        consecutiveFailures = 0;
        sentInRun += 1;
        await logMessage('campaign', campaignId, fr, 'sent', !!media);
      } else {
        fr.status = 'failed';
        fr.error = errMsg;
        fr.attempts = r.attempts;
        fresh.failedCount += 1;
        fresh.lastError = errMsg;
        consecutiveFailures += 1;
        await logMessage('campaign', campaignId, fr, 'failed', !!media);
      }
      fresh.cursor = idx + 1;
      await fresh.save();

      // Circuit breaker — stop hammering a possibly-flagged number.
      if (consecutiveFailures >= CIRCUIT_BREAKER_LIMIT) {
        fresh.lastError = `Auto-paused: ${CIRCUIT_BREAKER_LIMIT} consecutive failures (possible block/rate-limit).`;
        await fresh.save();
        control.set(campaignId, 'pause');
        await finalize(campaignId, 'paused');
        return;
      }

      // Long batch cooldown to mimic human sending sessions.
      const cooldown = computeBatchCooldown(sentInRun, fresh.config);
      if (cooldown > 0) {
        const s2 = await controlledSleep(campaignId, cooldown);
        if (s2 === 'stop') { await finalize(campaignId, 'stopped'); return; }
        if (s2 === 'pause') { await finalize(campaignId, 'paused'); return; }
      }
    }
  } catch (e) {
    console.error('[WA] campaign loop error', e);
    try {
      await WaCampaign.findByIdAndUpdate(campaignId, { status: 'failed', lastError: e?.message || String(e), finishedAt: new Date() });
    } catch { /* ignore */ }
    control.delete(campaignId);
  }
};

const finalize = async (campaignId, status) => {
  control.delete(campaignId);
  const patch = { status };
  if (status === 'completed' || status === 'stopped') patch.finishedAt = new Date();
  await WaCampaign.findByIdAndUpdate(campaignId, patch).catch(() => {});
};

const logMessage = async (type, campaignId, r, status, hasMedia) => {
  try {
    await WaMessageLog.create({
      type,
      campaignId,
      phone: r.phone,
      chatId: r.chatId,
      status,
      hasMedia,
      error: r.error || '',
    });
  } catch { /* ignore */ }
};

/** Public: start or resume a campaign. */
export const startCampaign = async (campaignId) => {
  const id = String(campaignId);
  if (control.get(id) === 'run') return { started: false, reason: 'already running' };

  const c = await WaCampaign.findById(id);
  if (!c) return { started: false, reason: 'not found' };
  if (c.cursor >= c.recipients.length) return { started: false, reason: 'nothing to send' };

  control.set(id, 'run');
  c.status = 'running';
  c.lastError = '';
  if (!c.startedAt) c.startedAt = new Date();
  await c.save();

  // Detach — do not await the loop.
  runLoop(id);
  return { started: true };
};

export const pauseCampaign = async (campaignId) => {
  const id = String(campaignId);
  if (control.get(id) === 'run') control.set(id, 'pause');
  else await WaCampaign.findByIdAndUpdate(id, { status: 'paused' }).catch(() => {});
  return { paused: true };
};

export const stopCampaign = async (campaignId) => {
  const id = String(campaignId);
  if (control.get(id) === 'run') control.set(id, 'stop');
  else await WaCampaign.findByIdAndUpdate(id, { status: 'stopped', finishedAt: new Date() }).catch(() => {});
  return { stopped: true };
};

export const isCampaignRunning = (campaignId) => control.get(String(campaignId)) === 'run';
