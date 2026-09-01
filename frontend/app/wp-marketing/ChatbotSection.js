'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot, Brain, Inbox, Plus, Trash2, Loader2, Save, Check,
  MessageSquare, Users, Send, Search, RefreshCw, Zap,
  Clock, MapPin, Phone, Globe, ToggleLeft, ToggleRight,
  ChevronRight, AlertCircle, Sparkles,
} from 'lucide-react';
import { wpMarketing } from '@/lib/api';

const TABS = [
  { id: 'brain', label: 'Brain', icon: Brain },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
];


function fmtTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const sameDay = dt.toDateString() === now.toDateString();
  if (sameDay) return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(d, now = Date.now()) {
  if (!d) return 'never';
  const ms = now - new Date(d).getTime();
  if (ms < 0) return 'just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return fmtTime(d);
}

function fmtClock(now = Date.now()) {
  return new Date(now).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Re-render every second so relative timestamps stay live. */
function useLiveClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const WEBHOOK_PIPELINE = [
  { id: 'post', label: 'POST hit server', types: ['webhook_received'] },
  { id: 'ack', label: 'HTTP 200 ack sent', types: ['webhook_processing'], processing: ['acknowledged'] },
  { id: 'parse', label: 'JSON parsed', types: ['webhook_received'], field: 'parsed' },
  { id: 'extract', label: 'Message extracted', types: ['webhook_extracted'] },
  { id: 'process', label: 'Chatbot processing', types: ['webhook_processing'], processing: ['processing', 'received'] },
  { id: 'save', label: 'Inbound saved', types: ['inbound_received'] },
  { id: 'reply', label: 'Reply sent', types: ['inbound'] },
];

function stageFromServerEvent(e = {}) {
  const proc = String(e.processing || '').toLowerCase();
  const note = String(e.note || '');
  if (e.ok === false) return `Failed: ${note || e.event || 'error'}`;
  if (note.toLowerCase().includes('accepted')) return 'Message extracted & accepted';
  if (proc === 'processing') return 'Chatbot processing';
  if (proc === 'processed') return 'Chatbot reply completed';
  if (proc === 'received') return 'Webhook received';
  if (proc === 'duplicate') return 'Duplicate (skipped)';
  if (proc === 'failed') return `Failed: ${note || 'error'}`;
  if (proc === 'acknowledged') return 'HTTP 200 ack sent';
  if (e.event === 'message_status') return `Status: ${e.text || note || '-'}`;
  return e.event || note || 'Webhook event';
}

function stageFromSseEvent(e = {}) {
  const map = {
    webhook_received: 'POST hit server',
    webhook_rejected: `Rejected: ${e.reason || 'invalid'}`,
    webhook_extracted: `Extracted ${e.count ?? 1} message(s)`,
    webhook_processing: e.processing === 'acknowledged'
      ? 'HTTP 200 ack sent to CampaignBot'
      : `Processing: ${e.processing || e.note || '-'}`,
    inbound_received: 'Inbound saved to DB',
    inbound: `Reply sent (${e.matchedAction || 'bot'})`,
    inbound_sync: `Synced from CampaignBot (${e.source || 'poll'})`,
    heartbeat: 'SSE heartbeat',
    connected: 'SSE connected',
  };
  return map[e.type] || e.type || 'Event';
}

function sseDetail(e = {}) {
  const parts = [e.type];
  if (e.event) parts.push(e.event);
  if (e.requestId) parts.push(`req:${String(e.requestId).slice(0, 8)}`);
  if (e.from) parts.push(e.from);
  if (e.text) parts.push(`"${String(e.text).slice(0, 60)}"`);
  if (e.reason) parts.push(e.reason);
  if (e.signature) parts.push(`sig:${e.signature}`);
  if (e.processing) parts.push(e.processing);
  return parts.join(' · ');
}

function buildActivityFeed(liveEvents = [], debugLog = []) {
  const seen = new Set();
  const items = [];

  const push = (item) => {
    const key = `${item.at}-${item.stage}-${item.requestId || ''}-${item.source}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const e of debugLog) {
    push({
      id: `srv-${e.id || e.requestId || e.at}`,
      at: e.at,
      source: 'server',
      stage: stageFromServerEvent(e),
      status: e.ok === false ? 'fail' : 'ok',
      detail: [e.event, e.from, e.note || e.text].filter(Boolean).join(' · '),
      requestId: e.requestId || null,
      processing: e.processing || null,
      event: e,
    });
  }

  for (const e of liveEvents) {
    if (e.type === 'heartbeat') continue;
    push({
      id: `sse-${e.receivedAt || e.at}-${e.type}`,
      at: e.at || e.receivedAt,
      source: 'live',
      stage: stageFromSseEvent(e),
      status: e.type === 'webhook_rejected' || e.processing === 'failed' ? 'fail'
        : e.type === 'webhook_processing' ? 'pending' : 'ok',
      detail: sseDetail(e),
      requestId: e.requestId || null,
      processing: e.processing || null,
      event: e,
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 100);
}

function pipelineState(feed = [], webhook = null) {
  const latestReq = feed.find((f) => f.requestId)?.requestId
    || webhook?.lastInboundRequestId
    || webhook?.lastRequestId
    || null;
  const related = latestReq
    ? feed.filter((f) => f.requestId === latestReq)
    : feed.slice(0, 20);

  const matchTypes = (f, types = []) => (
    types.includes(f.event?.type)
    || types.includes(f.event?.event)
    || types.some((t) => f.stage?.toLowerCase().includes(t.replace('webhook_', '')))
  );

  return WEBHOOK_PIPELINE.map((step) => {
    let hit = related.find((f) => matchTypes(f, step.types));
    if (!hit && step.id === 'parse') {
      hit = related.find((f) => f.event?.parsed === true || (f.source === 'server' && f.status === 'ok'));
    }
    if (!hit && step.id === 'post') {
      hit = related.find((f) => f.stage.includes('POST') || f.stage.includes('received') || f.event?.event === 'incoming_message');
    }
    if (!hit && step.id === 'extract') {
      hit = related.find((f) => f.stage.includes('Extracted') || (f.event?.from && f.status === 'ok'));
    }
    if (!hit && step.processing) {
      hit = related.find((f) => step.processing.includes(f.processing));
    }

    // DB-backed chatbot steps — visible via polling even when SSE is down.
    if (!hit && step.id === 'save' && webhook?.lastInboundSavedAt) {
      return {
        ...step,
        state: 'done',
        at: webhook.lastInboundSavedAt,
        detail: webhook.lastInboundSavedText || 'saved to MongoDB',
      };
    }
    if (!hit && step.id === 'reply' && webhook?.lastOutboundReplyAt) {
      return {
        ...step,
        state: 'done',
        at: webhook.lastOutboundReplyAt,
        detail: `${webhook.lastOutboundAction || 'bot'}: ${(webhook.lastOutboundReplyText || '').slice(0, 60)}`,
      };
    }
    if (!hit && step.id === 'process' && webhook?.lastInboundSavedAt && !webhook?.lastOutboundReplyAt) {
      return {
        ...step,
        state: 'pending',
        at: webhook.lastInboundSavedAt,
        detail: 'Inbound saved — waiting for outbound reply',
      };
    }

    const failed = related.some((f) => f.status === 'fail');
    return {
      ...step,
      state: hit ? (hit.status === 'fail' ? 'fail' : hit.status === 'pending' ? 'pending' : 'done') : (failed ? 'skip' : 'wait'),
      at: hit?.at || null,
      detail: hit?.detail || null,
    };
  });
}

function statusDot(state) {
  if (state === 'done') return 'bg-emerald-500';
  if (state === 'pending') return 'bg-amber-400 animate-pulse';
  if (state === 'fail') return 'bg-red-500';
  return 'bg-zinc-200';
}

/** Fetch-based SSE — works through nginx/proxy better than EventSource. */
function connectChatbotStream({ apiBase, pin, onEvent, onStatus }) {
  let closed = false;
  let controller = null;
  let retryTimer = null;

  const connect = async () => {
    if (closed) return;
    controller?.abort();
    controller = new AbortController();
    onStatus('connecting');
    try {
      const url = `${apiBase}/wp-marketing/chatbot/events?pin=${encodeURIComponent(pin)}`;
      const resp = await fetch(url, {
        headers: {
          Accept: 'text/event-stream',
          'x-wp-pin': pin,
        },
        signal: controller.signal,
      });
      if (!resp.ok) {
        onStatus(`error HTTP ${resp.status}`);
        retryTimer = setTimeout(connect, 4000);
        return;
      }
      onStatus('connected');
      const reader = resp.body?.getReader();
      if (!reader) {
        onStatus('error no stream');
        retryTimer = setTimeout(connect, 4000);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = '';
      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';
        for (const chunk of chunks) {
          const line = chunk.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            onEvent(JSON.parse(line.slice(6)));
          } catch { /* ignore malformed */ }
        }
      }
      if (!closed) {
        onStatus('reconnecting');
        retryTimer = setTimeout(connect, 2000);
      }
    } catch (err) {
      if (closed || err?.name === 'AbortError') return;
      onStatus(`error: ${err.message || 'stream failed'}`);
      retryTimer = setTimeout(connect, 4000);
    }
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    controller?.abort();
  };
}

function tryPrettyJson(raw) {
  if (!raw) return '';
  try {
    return JSON.stringify(typeof raw === 'string' ? JSON.parse(raw) : raw, null, 2);
  } catch {
    return String(raw);
  }
}

/* ── Backend verification checklist ──────────────────────────────────────── */
function WebhookVerifyPanel({ verify, loading, onRun, now }) {
  if (!verify && !loading) {
    return (
      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Backend verification</p>
            <p className="text-[12px] text-blue-900/80 mt-0.5">Run a full diagnostic to find why CampaignBot messages are not arriving.</p>
          </div>
          <button type="button" onClick={onRun} className="rounded-lg bg-blue-800 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-900">
            Run verification
          </button>
        </div>
      </div>
    );
  }

  const rc = verify?.realCause;

  return (
    <div className="mb-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">Backend verification</p>
          <p className="text-[12px] text-blue-900/80 mt-0.5">
            {loading ? 'Running self-test + root cause analysis…' : `Last run ${verify?.serverNow ? fmtRelative(verify.serverNow, now) : '-'}`}
          </p>
        </div>
        <button type="button" onClick={onRun} disabled={loading} className="rounded-lg bg-blue-800 px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
          {loading ? 'Running…' : 'Run again'}
        </button>
      </div>

      {rc && rc.severity === 'critical' && (
        <div className="rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3">
          <p className="text-[13px] font-bold text-red-900">Real cause: {rc.title}</p>
          <p className="text-[12px] text-red-800 mt-1">{rc.detail}</p>
          {rc.action && <p className="text-[11px] text-red-700 mt-2 font-medium">→ {rc.action}</p>}
        </div>
      )}

      {verify?.checklist && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Checklist</p>
          {verify.checklist.map((item) => (
            <div key={item.id} className={`flex gap-2 rounded-lg border px-3 py-2 ${item.pass ? 'border-emerald-200 bg-emerald-50/80' : 'border-red-200 bg-white'}`}>
              <span className={`text-[14px] ${item.pass ? 'text-emerald-600' : 'text-red-500'}`}>{item.pass ? '✓' : '✗'}</span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-zinc-800">{item.label}</p>
                <p className="text-[10.5px] font-mono text-zinc-600 break-all">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {verify?.diagnostics && (
        <details className="rounded-lg border border-blue-100 bg-white p-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-blue-800">Server POST tracker (in-memory)</summary>
          <pre className="mt-2 text-[10px] font-mono text-zinc-700 whitespace-pre-wrap break-all max-h-48 overflow-auto">
            {tryPrettyJson({
              totalPosts: verify.diagnostics.totalPosts,
              lastPostAt: verify.diagnostics.lastPostAt,
              lastPostIp: verify.diagnostics.lastPostIp,
              lastPostUserAgent: verify.diagnostics.lastPostUserAgent,
              lastPostEvent: verify.diagnostics.lastPostEvent,
              lastPostBodyPreview: verify.diagnostics.lastPostBodyPreview,
              recentHits: verify.diagnostics.recentHits?.slice(0, 8),
            })}
          </pre>
        </details>
      )}

      {verify?.instructions && (
        <div className="text-[11px] text-blue-900/90 space-y-1">
          <p className="font-semibold">Steps to fix:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            {verify.instructions.map((line) => <li key={line}>{line}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

/* ── Live webhook dashboard — every step visible ─────────────────────────── */
function WebhookLiveDashboard({
  webhook,
  debugLog,
  liveEvents,
  sseStatus,
  lastHeartbeat,
  serverNow,
  lastPollAt,
  pollCount,
  pollError,
  now,
  onRefresh,
  onSyncNow,
  onRegisterWebhook,
  syncing,
  refreshing,
}) {
  const feed = buildActivityFeed(liveEvents, debugLog);
  const pipeline = pipelineState(feed, webhook);
  const sync = webhook?.inboundSync || {};

  return (
    <div className="mb-5 rounded-2xl border-2 border-zinc-900/10 bg-white shadow-sm overflow-hidden">
      {/* Live header — clock always ticking */}
      <div className="border-b border-zinc-100 bg-zinc-900 px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Webhook live monitor</p>
            <p className="text-2xl font-mono font-semibold tabular-nums tracking-tight mt-0.5">
              {fmtClock(now)}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Local clock · updates every second
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono">
            <span className={`rounded-lg px-2.5 py-1 ${sseStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'}`}>
              SSE: {sseStatus}
            </span>
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-zinc-200">
              Poll #{pollCount} · {lastPollAt ? fmtRelative(lastPollAt, now) : 'starting…'}
            </span>
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-zinc-200">
              Server {serverNow ? fmtRelative(serverNow, now) : '-'}
            </span>
            {lastHeartbeat && (
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-zinc-200">
                Heartbeat {fmtRelative(lastHeartbeat, now)}
              </span>
            )}
            {sync.lastRunAt && (
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-zinc-200">
                Sync {fmtRelative(sync.lastRunAt, now)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Inbound webhook</p>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              CampaignBot POSTs <span className="font-mono text-zinc-700">incoming_message</span> here. Every step below updates live — no refresh needed.
            </p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
            webhook?.lastInboundProcessing === 'failed'
              ? 'border-red-200 bg-red-50 text-red-700'
              : webhook?.lastInboundAt
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            {webhook?.lastInboundProcessing === 'failed'
              ? 'Processing error'
              : webhook?.lastInboundAt ? 'Receiving' : 'Waiting for inbound'}
          </span>
        </div>

        <code className="block rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11.5px] font-mono text-zinc-700 break-all">
          {webhook?.webhookUrl || 'https://picoso.in/api/webhooks/campaignbot'}
        </code>

        {(webhook?.webhookUrls || []).length > 1 && (
          <p className="text-[10px] text-zinc-500 font-mono">
            Alt URL: {webhook.webhookUrls.find((u) => u !== webhook.webhookUrl) || '-'}
          </p>
        )}

        {webhook?.webhookStale && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 px-3 py-3 space-y-2">
            <p className="text-[12px] font-semibold text-red-800">
              CampaignBot has NOT pushed any webhook in {webhook.minutesSinceLastWebhook ?? '?'} minutes
            </p>
            <p className="text-[11px] text-red-700">
              Your WhatsApp messages are not reaching picoso.in. The monitor and sync poller are running, but only CampaignBot can deliver real inbound events. Verify the webhook URL above is set exactly in CampaignBot dashboard.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onSyncNow} disabled={syncing} className="rounded-lg bg-red-800 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
                {syncing ? 'Syncing…' : 'Sync from CampaignBot now'}
              </button>
              <button type="button" onClick={onRegisterWebhook} disabled={syncing} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-800 disabled:opacity-50">
                Register webhook URL
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 text-[11px] text-zinc-600 space-y-1">
          <p><span className="font-semibold text-zinc-800">Active sync poller:</span> every {Math.round((sync.pollIntervalMs || 15000) / 1000)}s {sync.workingFetchPath ? `(via ${sync.workingFetchPath})` : '(no fetch API found yet)'}</p>
          <p>Last sync run: {sync.lastRunAt ? `${fmtRelative(sync.lastRunAt, now)} · fetched ${sync.lastFetched || 0} · processed ${sync.lastProcessed || 0}` : 'not started'}</p>
          {sync.lastError && <p className="text-amber-800">Sync note: {sync.lastError}</p>}
          {sync.lastFetchStatus && sync.lastFetchStatus >= 400 && sync.lastFetchBody && (
            <p className="text-amber-800 font-mono text-[10px] break-all">
              Fetch HTTP {sync.lastFetchStatus}: {typeof sync.lastFetchBody === 'string' ? sync.lastFetchBody : tryPrettyJson(sync.lastFetchBody).slice(0, 400)}
            </p>
          )}
          {sync.lastRegisterNote && <p className="text-zinc-500">Register: {sync.lastRegisterNote}</p>}
        </div>

        {pollError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            Poll error: {pollError}
          </div>
        )}

        {webhook?.lastOutboundReplyText && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-900">
            <span className="font-semibold">Last bot reply ({webhook.lastOutboundAction || 'bot'}): </span>
            {webhook.lastOutboundReplyText}
          </div>
        )}

        {webhook?.lastInboundSavedAt && !webhook?.lastOutboundReplyAt && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900">
            Inbound was saved to DB but no bot reply yet — check CampaignBot send API or brain config.
          </div>
        )}

        {!webhook?.lastInboundSavedAt && webhook?.lastInboundAt && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900">
            Webhook was received but message was not saved to chatbot DB — backend may need restart with latest code.
          </div>
        )}

        {/* Key metrics — relative + absolute, both live */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Last webhook', value: webhook?.lastWebhookAt },
            { label: 'Last inbound', value: webhook?.lastInboundAt },
            { label: 'Last event', value: webhook?.lastEvent, static: true },
            { label: 'Processing', value: webhook?.lastInboundProcessing, static: true },
            { label: 'Signature', value: webhook?.lastInboundSignature, static: true },
            { label: 'Request ID', value: webhook?.lastInboundRequestId ? String(webhook.lastInboundRequestId).slice(0, 12) : '-', static: true },
            { label: 'DB inbound', value: webhook?.lastInboundSavedAt },
            { label: 'DB reply', value: webhook?.lastOutboundReplyAt },
            { label: 'Conversations', value: webhook?.conversationCount ?? 0, static: true },
          ].map(({ label, value, static: isStatic }) => (
            <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-2.5 py-2">
              <p className="text-[9px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
              {isStatic ? (
                <p className="text-[11px] font-mono text-zinc-800 truncate mt-0.5">{value || '-'}</p>
              ) : (
                <>
                  <p className="text-[11px] font-mono font-semibold text-zinc-900 mt-0.5">{fmtRelative(value, now)}</p>
                  <p className="text-[9px] font-mono text-zinc-400">{fmtTime(value) || '-'}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Pipeline — every processing step */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Latest request pipeline</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {pipeline.map((step) => (
              <div key={step.id} className="rounded-xl border border-zinc-100 p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot(step.state)}`} />
                  <p className="text-[10px] font-medium text-zinc-700 leading-tight">{step.label}</p>
                </div>
                <p className="text-[9px] font-mono text-zinc-400 capitalize">{step.state}</p>
                {step.at && <p className="text-[9px] font-mono text-zinc-500">{fmtRelative(step.at, now)}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Live activity feed — always visible */}
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-zinc-50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Live activity ({feed.length} events)
            </p>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Refresh now
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50">
            {feed.length === 0 ? (
              <p className="p-4 text-[11px] text-zinc-400 text-center">No webhook activity yet. Send a WhatsApp message to your business number.</p>
            ) : (
              feed.map((item) => (
                <div key={item.id} className="px-3 py-2 hover:bg-zinc-50/80">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      item.status === 'fail' ? 'bg-red-500' : item.status === 'pending' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-zinc-800">{item.stage}</p>
                      <p className="text-[10px] font-mono text-zinc-500 truncate">{item.detail || '-'}</p>
                      <p className="text-[9px] font-mono text-zinc-400 mt-0.5">
                        {fmtRelative(item.at, now)} · {fmtTime(item.at)} · {item.source}
                        {item.requestId ? ` · req:${String(item.requestId).slice(0, 8)}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {webhook?.lastRejectedNote && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-red-800">Latest failure: {webhook.lastRejectedNote}</p>
            {webhook.lastRejectedDebugTrace?.steps && (
              <pre className="max-h-32 overflow-auto text-[9px] text-red-700 whitespace-pre-wrap break-all">
                {tryPrettyJson(webhook.lastRejectedDebugTrace)}
              </pre>
            )}
            {webhook.lastRejectedRawBody && (
              <details>
                <summary className="cursor-pointer text-[10px] font-medium text-red-700">Raw body from CampaignBot</summary>
                <pre className="mt-1 max-h-40 overflow-auto text-[9px] text-red-800 whitespace-pre-wrap break-all">{webhook.lastRejectedRawBody}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Webhook debug console (detailed payloads) ───────────────────────────── */
function WebhookDebugConsole({
  webhook,
  debugLog,
  liveEvents,
  sseStatus,
  lastHeartbeat,
  serverNow,
  now,
  onRefresh,
  refreshing,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [copied, setCopied] = useState(false);

  const report = {
    generatedAt: new Date().toISOString(),
    serverNow,
    webhookUrl: webhook?.webhookUrl,
    sseStatus,
    lastHeartbeat,
    lastWebhookAt: webhook?.lastWebhookAt,
    lastInboundAt: webhook?.lastInboundAt,
    lastRejectedNote: webhook?.lastRejectedNote,
    lastRejectedPayload: webhook?.lastRejectedPayload,
    lastRejectedRawBody: webhook?.lastRejectedRawBody,
    lastRejectedDebugTrace: webhook?.lastRejectedDebugTrace,
    recent: debugLog,
    liveEvents: liveEvents.slice(0, 40),
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const rows = debugLog?.length ? debugLog : (webhook?.recent || []);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">Webhook debug console</p>
          <p className="text-[11px] text-amber-900/70 mt-0.5">
            Timestamps tick live every second. Webhook log auto-refreshes every 4s + on SSE events.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Reload logs
          </button>
          <button
            type="button"
            onClick={copyReport}
            className="rounded-lg bg-amber-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-800"
          >
            {copied ? 'Copied' : 'Copy full report'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10.5px] font-mono">
        <div className="rounded-lg border border-amber-100 bg-white p-2">
          <p className="text-amber-600">Server now</p>
          <p className="text-amber-950">{serverNow ? `${fmtRelative(serverNow, now)} · ${fmtTime(serverNow)}` : '-'}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-white p-2">
          <p className="text-amber-600">SSE / heartbeat</p>
          <p className="text-amber-950">{sseStatus}{lastHeartbeat ? ` · ${fmtRelative(lastHeartbeat, now)}` : ''}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-white p-2">
          <p className="text-amber-600">Last webhook</p>
          <p className="text-amber-950">{fmtRelative(webhook?.lastWebhookAt, now)} ({fmtTime(webhook?.lastWebhookAt) || '-'})</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-white p-2">
          <p className="text-amber-600">Last inbound</p>
          <p className="text-amber-950">{fmtRelative(webhook?.lastInboundAt, now)} · {webhook?.lastInboundProcessing || '-'}</p>
        </div>
      </div>

      {webhook?.lastRejectedNote && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-red-800">Latest failure: {webhook.lastRejectedNote}</p>
          {webhook.lastRejectedDebugTrace?.steps && (
            <pre className="max-h-32 overflow-auto text-[9px] text-red-700 whitespace-pre-wrap break-all">
              {tryPrettyJson(webhook.lastRejectedDebugTrace)}
            </pre>
          )}
          {webhook.lastRejectedRawBody && (
            <details>
              <summary className="cursor-pointer text-[10px] font-medium text-red-700">Raw body from CampaignBot</summary>
              <pre className="mt-1 max-h-40 overflow-auto text-[9px] text-red-800 whitespace-pre-wrap break-all">{webhook.lastRejectedRawBody}</pre>
            </details>
          )}
          {webhook.lastRejectedPayload && (
            <details>
              <summary className="cursor-pointer text-[10px] font-medium text-red-700">Parsed JSON body</summary>
              <pre className="mt-1 max-h-40 overflow-auto text-[9px] text-red-800 whitespace-pre-wrap break-all">{tryPrettyJson(webhook.lastRejectedPayload)}</pre>
            </details>
          )}
        </div>
      )}

      <div className="rounded-xl border border-amber-100 bg-white max-h-80 overflow-y-auto">
        <p className="sticky top-0 bg-white border-b border-amber-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
          Stored webhook events ({rows.length})
        </p>
        {rows.length === 0 ? (
          <p className="p-4 text-[11px] text-amber-800/60">No webhook events stored yet. Send a WhatsApp message to Picoso number.</p>
        ) : (
          rows.map((e) => {
            const id = e.id || e.requestId || e.at;
            const open = expandedId === id;
            return (
              <div key={id} className="border-b border-amber-50 last:border-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : id)}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50/80"
                >
                  <p className={`text-[10px] font-mono truncate ${e.ok === false ? 'text-red-700' : 'text-amber-950'}`}>
                    {fmtRelative(e.at, now)} · {fmtTime(e.at)} · {e.event} · {e.processing || '-'} · {e.ok === false ? 'FAIL' : 'OK'} · {e.from || '-'} · {e.note || e.text || ''}
                  </p>
                </button>
                {open && (
                  <div className="px-3 pb-3 space-y-2 bg-amber-50/50">
                    <pre className="text-[9px] text-amber-950 whitespace-pre-wrap break-all max-h-48 overflow-auto">
                      {tryPrettyJson({
                        requestId: e.requestId,
                        signature: e.signature,
                        parsed: e.parsed,
                        rawBodyLength: e.rawBodyLength,
                        note: e.note,
                        debugTrace: e.debugTrace,
                      })}
                    </pre>
                    {e.rawBodyPreview && (
                      <details open>
                        <summary className="text-[9px] font-semibold text-amber-800">rawBodyPreview</summary>
                        <pre className="text-[9px] whitespace-pre-wrap break-all max-h-40 overflow-auto">{e.rawBodyPreview}</pre>
                      </details>
                    )}
                    {e.payloadPreview && (
                      <details>
                        <summary className="text-[9px] font-semibold text-amber-800">payloadPreview</summary>
                        <pre className="text-[9px] whitespace-pre-wrap break-all max-h-40 overflow-auto">{tryPrettyJson(e.payloadPreview)}</pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {liveEvents.length > 0 && (
        <details className="rounded-xl border border-amber-100 bg-white p-2.5">
          <summary className="cursor-pointer text-[10px] font-semibold text-amber-800">
            Live SSE events this session ({liveEvents.length})
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto text-[9px] text-amber-900 whitespace-pre-wrap break-all">
            {tryPrettyJson(liveEvents.slice(0, 40))}
          </pre>
        </details>
      )}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="mt-0.5 font-mono text-[18px] font-semibold tabular-nums tracking-tight text-zinc-900">{value ?? 0}</p>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-zinc-500">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10.5px] text-zinc-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12.5px] text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all';

/* ── Brain editor ─────────────────────────────────────────────────────────── */
function BrainPanel({ brain, onChange, onSave, saving, saved }) {
  const b = brain.business || {};

  const setBiz = (k, v) => onChange({ ...brain, business: { ...b, [k]: v } });

  const addFaq = () => onChange({
    ...brain,
    faqs: [...(brain.faqs || []), { question: '', answer: '', keywords: [] }],
  });
  const setFaq = (i, patch) => {
    const faqs = [...(brain.faqs || [])];
    faqs[i] = { ...faqs[i], ...patch };
    onChange({ ...brain, faqs });
  };
  const delFaq = (i) => onChange({ ...brain, faqs: brain.faqs.filter((_, j) => j !== i) });

  const addProduct = () => onChange({
    ...brain,
    products: [...(brain.products || []), { name: '', description: '', price: '', category: 'Menu', tags: [] }],
  });
  const setProduct = (i, patch) => {
    const products = [...(brain.products || [])];
    products[i] = { ...products[i], ...patch };
    onChange({ ...brain, products });
  };
  const delProduct = (i) => onChange({ ...brain, products: brain.products.filter((_, j) => j !== i) });

  const setAction = (i, patch) => {
    const actions = [...(brain.actions || [])];
    actions[i] = { ...actions[i], ...patch };
    onChange({ ...brain, actions });
  };

  return (
    <div className="space-y-5">
      {/* Enable + save */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${brain.enabled ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}>
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-zinc-900">Auto-reply</p>
            <p className="text-[11px] text-zinc-400 truncate">Replies the moment a WhatsApp message arrives</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...brain, enabled: !brain.enabled })}
            className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-600"
          >
            {brain.enabled ? <ToggleRight className="w-6 h-6 text-zinc-900" /> : <ToggleLeft className="w-6 h-6 text-zinc-300" />}
            {brain.enabled ? 'On' : 'Off'}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving' : saved ? 'Saved' : 'Save brain'}
          </button>
        </div>
      </div>

      {/* Business */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Business</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name">
            <input className={inputCls} value={b.name || ''} onChange={(e) => setBiz('name', e.target.value)} placeholder="Picoso" />
          </Field>
          <Field label="Tone">
            <input className={inputCls} value={b.tone || ''} onChange={(e) => setBiz('tone', e.target.value)} placeholder="friendly, concise" />
          </Field>
          <div className="md:col-span-2">
            <Field label="About" hint="Short pitch the bot can use">
              <textarea className={`${inputCls} min-h-[72px] resize-y`} value={b.about || ''} onChange={(e) => setBiz('about', e.target.value)} placeholder="Healthy meals delivered fast…" />
            </Field>
          </div>
          <Field label="Hours">
            <div className="relative">
              <Clock className="pointer-events-none absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-300" />
              <input className={`${inputCls} pl-9`} value={b.hours || ''} onChange={(e) => setBiz('hours', e.target.value)} placeholder="10 AM – 10 PM daily" />
            </div>
          </Field>
          <Field label="Location">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-300" />
              <input className={`${inputCls} pl-9`} value={b.location || ''} onChange={(e) => setBiz('location', e.target.value)} placeholder="City / area" />
            </div>
          </Field>
          <Field label="Phone">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-300" />
              <input className={`${inputCls} pl-9`} value={b.phone || ''} onChange={(e) => setBiz('phone', e.target.value)} placeholder="+91…" />
            </div>
          </Field>
          <Field label="Website">
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-300" />
              <input className={`${inputCls} pl-9`} value={b.website || ''} onChange={(e) => setBiz('website', e.target.value)} placeholder="https://…" />
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="Extra notes">
              <textarea className={`${inputCls} min-h-[56px] resize-y`} value={b.extraNotes || ''} onChange={(e) => setBiz('extraNotes', e.target.value)} placeholder="Delivery radius, offers, policies…" />
            </Field>
          </div>
        </div>
      </section>

      {/* Welcome / fallback */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Welcome</p>
          <textarea className={`${inputCls} min-h-[88px] resize-y`} value={brain.welcomeMessage || ''} onChange={(e) => onChange({ ...brain, welcomeMessage: e.target.value })} />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Fallback</p>
          <textarea className={`${inputCls} min-h-[88px] resize-y`} value={brain.fallbackMessage || ''} onChange={(e) => onChange({ ...brain, fallbackMessage: e.target.value })} />
        </div>
      </section>

      {/* Quick actions */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Quick actions</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Triggers like “menu”, “hours”</p>
          </div>
        </div>
        <div className="space-y-2">
          {(brain.actions || []).map((a, i) => (
            <div key={a._id || i} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 p-2.5">
              <input className={`${inputCls} md:col-span-3`} value={a.label || ''} onChange={(e) => setAction(i, { label: e.target.value })} placeholder="Label" />
              <input
                className={`${inputCls} md:col-span-4 font-mono text-[11.5px]`}
                value={(a.triggers || []).join(', ')}
                onChange={(e) => setAction(i, { triggers: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                placeholder="triggers, comma separated"
              />
              <select className={`${inputCls} md:col-span-2`} value={a.type || 'custom'} onChange={(e) => setAction(i, { type: e.target.value })}>
                <option value="menu">Menu</option>
                <option value="hours">Hours</option>
                <option value="location">Location</option>
                <option value="contact">Contact</option>
                <option value="faq_list">FAQ list</option>
                <option value="custom">Custom</option>
              </select>
              <button
                type="button"
                onClick={() => setAction(i, { enabled: !a.enabled })}
                className={`md:col-span-2 rounded-xl border text-[11.5px] font-medium ${a.enabled ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-400'}`}
              >
                {a.enabled ? 'Enabled' : 'Off'}
              </button>
              <button type="button" onClick={() => onChange({ ...brain, actions: brain.actions.filter((_, j) => j !== i) })} className="md:col-span-1 flex items-center justify-center text-zinc-300 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {a.type === 'custom' && (
                <textarea
                  className={`${inputCls} md:col-span-12 min-h-[56px]`}
                  value={a.response || ''}
                  onChange={(e) => setAction(i, { response: e.target.value })}
                  placeholder="Custom reply text"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({
              ...brain,
              actions: [...(brain.actions || []), { label: 'New action', triggers: [], type: 'custom', response: '', enabled: true }],
            })}
            className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-600 hover:text-zinc-900"
          >
            <Plus className="w-3.5 h-3.5" /> Add action
          </button>
        </div>
      </section>

      {/* Products / menu */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Menu / products</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Powers “Show Menu” and dish lookups</p>
          </div>
          <button type="button" onClick={addProduct} className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-700 hover:bg-zinc-50">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {(brain.products || []).length === 0 && (
            <p className="text-[12px] text-zinc-400 py-4 text-center">No products yet — add your menu items</p>
          )}
          {(brain.products || []).map((p, i) => (
            <div key={p._id || i} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-zinc-100 p-2.5">
              <input className={`${inputCls} md:col-span-3`} value={p.name || ''} onChange={(e) => setProduct(i, { name: e.target.value })} placeholder="Name" />
              <input className={`${inputCls} md:col-span-2`} value={p.category || ''} onChange={(e) => setProduct(i, { category: e.target.value })} placeholder="Category" />
              <input className={`${inputCls} md:col-span-2`} value={p.price || ''} onChange={(e) => setProduct(i, { price: e.target.value })} placeholder="₹199" />
              <input className={`${inputCls} md:col-span-4`} value={p.description || ''} onChange={(e) => setProduct(i, { description: e.target.value })} placeholder="Short description" />
              <button type="button" onClick={() => delProduct(i)} className="md:col-span-1 flex items-center justify-center text-zinc-300 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">FAQs</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Train Q&A in seconds</p>
          </div>
          <button type="button" onClick={addFaq} className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-700 hover:bg-zinc-50">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {(brain.faqs || []).length === 0 && (
            <p className="text-[12px] text-zinc-400 py-4 text-center">No FAQs — add common questions</p>
          )}
          {(brain.faqs || []).map((f, i) => (
            <div key={f._id || i} className="rounded-xl border border-zinc-100 p-2.5 space-y-2">
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1`} value={f.question || ''} onChange={(e) => setFaq(i, { question: e.target.value })} placeholder="Question" />
                <button type="button" onClick={() => delFaq(i)} className="px-2 text-zinc-300 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea className={`${inputCls} min-h-[56px]`} value={f.answer || ''} onChange={(e) => setFaq(i, { answer: e.target.value })} placeholder="Answer" />
              <input
                className={`${inputCls} font-mono text-[11.5px]`}
                value={(f.keywords || []).join(', ')}
                onChange={(e) => setFaq(i, { keywords: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                placeholder="keywords (optional)"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Inbox ────────────────────────────────────────────────────────────────── */
function InboxPanel({ liveTick }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [live] = useState(true);
  const bottomRef = useRef(null);
  const activeIdRef = useRef(null);
  const conversationRequestRef = useRef(0);
  activeIdRef.current = activeId;

  const loadList = useCallback(async (silent = true) => {
    try {
      const r = await wpMarketing.getChatbotConversations({ q: q || undefined, limit: 50 });
      setList(r.data.conversations || []);
    } catch {
      /* ignore */
    } finally {
      if (!silent) setLoading(false);
      else setLoading(false);
    }
  }, [q]);

  const openConvo = useCallback(async (id, soft = false) => {
    if (!id) return;
    if (!soft) {
      activeIdRef.current = id;
      setActiveId(id);
    }
    const requestId = ++conversationRequestRef.current;
    setErr('');
    try {
      const r = await wpMarketing.getChatbotConversation(id);
      // Polling can return out of order. Never let an older response replace
      // a newer thread or a conversation selected by the user.
      if (requestId !== conversationRequestRef.current || activeIdRef.current !== id) return;
      setThread(r.data.conversation);
      setMessages(r.data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: soft ? 'auto' : 'smooth' }), 40);
    } catch (e) {
      if (!soft) setErr(e?.response?.data?.error || 'Could not load chat');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => loadList(false), 120);
    return () => clearTimeout(t);
  }, [loadList]);

  // Refresh on SSE events, and poll every few seconds as a backup.
  useEffect(() => {
    if (!liveTick) return;
    loadList(true);
    if (activeIdRef.current) openConvo(activeIdRef.current, true);
  }, [liveTick, loadList, openConvo]);

  useEffect(() => {
    loadList(true);
    const id = setInterval(() => {
      loadList(true);
      if (activeIdRef.current) openConvo(activeIdRef.current, true);
    }, 4000);
    return () => clearInterval(id);
  }, [loadList, openConvo]);

  const sendReply = async () => {
    if (!reply.trim() || !activeId) return;
    setSending(true); setErr('');
    try {
      await wpMarketing.replyChatbotConversation(activeId, { text: reply.trim() });
      setReply('');
      await openConvo(activeId);
      await loadList(true);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 min-h-[560px]">
      <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white flex flex-col overflow-hidden">
        <div className="p-3 border-b border-zinc-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-300" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contacts"
              className={`${inputCls} pl-8 py-1.5 text-[12px]`}
            />
          </div>
          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border ${live ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 text-zinc-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
            Live
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12 text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : list.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <MessageSquare className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
              <p className="text-[12.5px] font-medium text-zinc-500">No chats yet</p>
              <p className="text-[11px] text-zinc-400 mt-1">When CampaignBot delivers webhooks, chats appear here instantly</p>
            </div>
          ) : (
            list.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => openConvo(c._id)}
                className={`w-full text-left px-3.5 py-3 border-b border-zinc-50 transition-colors ${activeId === c._id ? 'bg-zinc-50' : 'hover:bg-zinc-50/70'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-zinc-900 truncate">
                      {c.contactName || c.contactPhone}
                    </p>
                    <p className="text-[10.5px] font-mono text-zinc-400">{c.contactPhone}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0">{fmtTime(c.lastMessageAt)}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-zinc-500 truncate">
                  {c.lastDirection === 'outbound' ? 'Bot: ' : ''}{c.lastMessage || '-'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white flex flex-col overflow-hidden min-h-[420px]">
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Inbox className="w-7 h-7 text-zinc-300 mb-2" />
            <p className="text-[13px] font-medium text-zinc-500">Select a conversation</p>
          <p className="text-[11px] text-zinc-400 mt-1">Inbox refreshes every 4 seconds and on new webhooks</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-zinc-900">{thread?.contactName || thread?.contactPhone}</p>
                <p className="text-[11px] font-mono text-zinc-400">{thread?.contactPhone} · {thread?.botReplies || 0} bot replies</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-zinc-50/40">
              {messages.map((m) => (
                <div key={m._id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                    m.direction === 'outbound'
                      ? 'bg-zinc-900 text-white rounded-br-md'
                      : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-md'
                  }`}>
                    <p className="text-[12.5px] whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    <div className="mt-1 flex items-center gap-2 text-[9.5px] text-zinc-400">
                      <span>{fmtTime(m.sourceTimestamp || m.createdAt)}</span>
                      {m.messageType && m.messageType !== 'text' && <span>· {m.messageType}</span>}
                      {m.matchedAction && m.matchedAction !== 'manual' && (
                        <span className="opacity-80">· {m.matchedAction}</span>
                      )}
                      {m.matchedAction === 'manual' && <span>· manual</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            {err && (
              <div className="mx-4 mb-2 flex items-center gap-1.5 text-[11.5px] text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> {err}
              </div>
            )}
            <div className="p-3 border-t border-zinc-100 flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Manual reply"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main section ─────────────────────────────────────────────────────────── */
export default function ChatbotSection() {
  const [tab, setTab] = useState('brain');
  const [brain, setBrain] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testPhone, setTestPhone] = useState('+91');
  const [testText, setTestText] = useState('hi');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [webhook, setWebhook] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [serverNow, setServerNow] = useState(null);
  const [debugRefreshing, setDebugRefreshing] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [sseStatus, setSseStatus] = useState('connecting');
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [debugEvents, setDebugEvents] = useState([]);
  const [lastPollAt, setLastPollAt] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [pollError, setPollError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [verify, setVerify] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const now = useLiveClock(1000);

  const pushDebug = useCallback((event) => {
    const entry = { ...event, receivedAt: new Date().toISOString() };
    setDebugEvents((items) => [entry, ...items].slice(0, 50));
  }, []);

  const refreshWebhookDebug = useCallback(async (silent = false) => {
    if (!silent) setDebugRefreshing(true);
    try {
      const r = await wpMarketing.getChatbotWebhookDebug({ limit: 40 });
      setDebugLog(r.data.events || []);
      setServerNow(r.data.serverNow || new Date().toISOString());
    } catch { /* ignore */ }
    finally { if (!silent) setDebugRefreshing(false); }
  }, []);

  const lastWebhookAtRef = useRef(null);

  const refreshWebhookStatus = useCallback(async () => {
    try {
      const w = await wpMarketing.getChatbotWebhookStatus();
      if (!w?.data) return;
      const nextAt = w.data.lastWebhookAt;
      if (nextAt && nextAt !== lastWebhookAtRef.current) {
        lastWebhookAtRef.current = nextAt;
        setLiveTick((n) => n + 1);
      }
      setWebhook(w.data);
      setServerNow(w.data.serverNow || new Date().toISOString());
      setPollError('');
    } catch (e) {
      setPollError(e?.response?.data?.error || e?.message || 'status fetch failed');
    }
  }, []);

  const runSyncNow = useCallback(async () => {
    setSyncing(true);
    try {
      await wpMarketing.syncChatbotInbound();
      await refreshWebhookStatus();
      await refreshWebhookDebug(true);
      setLiveTick((n) => n + 1);
    } catch (e) {
      setPollError(e?.response?.data?.error || e?.message || 'sync failed');
    } finally {
      setSyncing(false);
    }
  }, [refreshWebhookStatus, refreshWebhookDebug]);

  const runRegisterWebhook = useCallback(async () => {
    setSyncing(true);
    try {
      await wpMarketing.registerChatbotWebhook();
      await refreshWebhookStatus();
    } catch (e) {
      setPollError(e?.response?.data?.error || e?.message || 'register failed');
    } finally {
      setSyncing(false);
    }
  }, [refreshWebhookStatus]);

  const runVerify = useCallback(async () => {
    setVerifyLoading(true);
    try {
      const r = await wpMarketing.verifyChatbotWebhook();
      setVerify(r.data);
      await refreshWebhookStatus();
      await refreshWebhookDebug(true);
    } catch (e) {
      setPollError(e?.response?.data?.error || e?.message || 'verify failed');
    } finally {
      setVerifyLoading(false);
    }
  }, [refreshWebhookStatus, refreshWebhookDebug]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [b, s, w] = await Promise.all([
        wpMarketing.getChatbotBrain(),
        wpMarketing.getChatbotStats(),
        wpMarketing.getChatbotWebhookStatus().catch(() => ({ data: null })),
      ]);
      setBrain(b.data.brain);
      setStats(s.data.stats);
      if (w?.data) {
        setWebhook(w.data);
        setServerNow(w.data.serverNow || null);
        lastWebhookAtRef.current = w.data.lastWebhookAt || null;
      }
      await refreshWebhookDebug();
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not load chatbot');
    } finally {
      setLoading(false);
    }
  }, [refreshWebhookDebug]);

  useEffect(() => {
    runVerify().catch(() => {});
  }, [runVerify]);

  useEffect(() => { load(); }, [load]);

  // Continuous polling — webhook status + debug log every 2s.
  useEffect(() => {
    const poll = async () => {
      setPollCount((n) => n + 1);
      setLastPollAt(new Date().toISOString());
      await Promise.all([
        refreshWebhookStatus().catch(() => {}),
        refreshWebhookDebug(true).catch(() => {}),
      ]);
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [refreshWebhookStatus, refreshWebhookDebug]);

  // Live stream via fetch (EventSource often hangs behind nginx).
  useEffect(() => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('picoso_wp_pin') : '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';
    if (!pin) {
      setSseStatus('missing PIN');
      return undefined;
    }

    const disconnect = connectChatbotStream({
      apiBase,
      pin,
      onStatus: setSseStatus,
      onEvent: (data) => {
        if (!data?.type || data.type === 'connected') return;
        if (data.type === 'heartbeat') {
          setLastHeartbeat(data.at);
          return;
        }
        pushDebug(data);

        if (data.type === 'webhook_received' || data.type === 'webhook_rejected' || data.type === 'webhook_extracted') {
          setWebhook((previous) => ({
            ...(previous || {}),
            lastWebhookAt: data.at,
            lastEvent: data.event || 'unknown',
            lastRequestId: data.requestId || previous?.lastRequestId || null,
            lastProcessing: data.type === 'webhook_rejected' ? 'failed' : data.type === 'webhook_extracted' ? 'extracted' : 'received',
            lastSignature: data.signature || previous?.lastSignature || null,
            lastParsed: data.parsed ?? previous?.lastParsed ?? null,
            ...(data.event === 'incoming_message' || data.type === 'webhook_extracted' ? {
              lastInboundAt: data.at,
              lastInboundRequestId: data.requestId || null,
              lastInboundProcessing: data.type === 'webhook_rejected' ? 'failed' : data.processing || 'received',
            } : {}),
            ...(data.type === 'webhook_rejected' ? {
              lastRejectedAt: data.at,
              lastRejectedNote: data.reason || 'Webhook rejected',
              lastRejectedPayload: data.payloadPreview || null,
              lastRejectedRawBody: data.rawBodyPreview || null,
              lastRejectedDebugTrace: data.debugTrace || null,
            } : {}),
          }));
          refreshWebhookStatus().catch(() => {});
          refreshWebhookDebug(true).catch(() => {});
        }
        if (data.type === 'webhook_processing') {
          setWebhook((previous) => ({
            ...(previous || {}),
            lastProcessing: data.processing || previous?.lastProcessing || null,
            lastInboundProcessing: data.processing || previous?.lastInboundProcessing || null,
            ...(data.note ? { lastRejectedNote: data.note } : {}),
          }));
          refreshWebhookStatus().catch(() => {});
          refreshWebhookDebug(true).catch(() => {});
        }

            if (['inbound_received', 'inbound', 'outbound', 'inbound_sync'].includes(data.type)) {
              setLiveTick((n) => n + 1);
              if (data.type !== 'outbound') setTab('inbox');
              refreshWebhookStatus().catch(() => {});
              load().catch(() => {});
            }
      },
    });

    return disconnect;
  }, [load, pushDebug, refreshWebhookDebug, refreshWebhookStatus]);

  const save = async () => {
    if (!brain) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const r = await wpMarketing.updateChatbotBrain({
        enabled: brain.enabled,
        business: brain.business,
        welcomeMessage: brain.welcomeMessage,
        fallbackMessage: brain.fallbackMessage,
        products: brain.products,
        faqs: brain.faqs,
        actions: brain.actions,
      });
      setBrain(r.data.brain);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      const s = await wpMarketing.getChatbotStats();
      setStats(s.data.stats);
    } catch (e) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true); setTestResult(null); setError('');
    try {
      const r = await wpMarketing.simulateChatbotInbound({
        phone: testPhone.trim(),
        text: testText.trim() || 'hi',
        name: 'Test',
      });
      setTestResult(r.data.result);
      await load();
      setTab('inbox');
    } catch (e) {
      setError(e?.response?.data?.error || 'Test send failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full px-6 py-6 xl:px-10 xl:py-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 40% at 20% 0%, rgba(24,24,27,0.04), transparent),' +
            'linear-gradient(rgba(24,24,27,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(24,24,27,0.03) 1px, transparent 1px)',
          backgroundSize: 'auto, 28px 28px, 28px 28px',
        }}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white">
              <Bot className="w-3.5 h-3.5 text-zinc-700" />
            </div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-zinc-400">Chatbot</p>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">WhatsApp brain</h2>
          <p className="text-[12.5px] text-zinc-400 mt-0.5">Train once — replies instantly on every inbound message</p>
        </div>
        <div className="flex rounded-xl border border-zinc-200 bg-white p-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-medium transition-all ${
                tab === id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Backend verification — root cause + checklist */}
      <WebhookVerifyPanel verify={verify} loading={verifyLoading} onRun={runVerify} now={now} />

      {/* Live webhook monitor — every step visible, clock ticks every second */}
      <WebhookLiveDashboard
        webhook={webhook}
        debugLog={debugLog}
        liveEvents={debugEvents}
        sseStatus={sseStatus}
        lastHeartbeat={lastHeartbeat}
        serverNow={serverNow}
        lastPollAt={lastPollAt}
        pollCount={pollCount}
        pollError={pollError}
        now={now}
        onRefresh={() => { refreshWebhookStatus(); refreshWebhookDebug(); }}
        onSyncNow={runSyncNow}
        onRegisterWebhook={runRegisterWebhook}
        syncing={syncing}
        refreshing={debugRefreshing}
      />

      <WebhookDebugConsole
        webhook={webhook}
        debugLog={debugLog}
        liveEvents={debugEvents}
        sseStatus={sseStatus}
        lastHeartbeat={lastHeartbeat}
        serverNow={serverNow}
        now={now}
        onRefresh={refreshWebhookDebug}
        refreshing={debugRefreshing}
      />

      {/* Live test — sends a real WhatsApp reply via CampaignBot */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5 text-zinc-500" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Live test</p>
        </div>
        <p className="text-[11.5px] text-zinc-400 mb-3">
          Simulates an inbound WhatsApp message and sends a real reply to that number (uses LLM + brain).
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+918167080111"
          />
          <input
            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="hi"
          />
          <button
            type="button"
            onClick={runTest}
            disabled={testing || !testPhone.trim()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {testing ? 'Sending…' : 'Test reply'}
          </button>
        </div>
        {testResult && (
          <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-700">
            <p className="font-medium text-zinc-900">
              {testResult.sendError ? `Send error: ${testResult.sendError}` : `Sent via ${testResult.matchedAction} → ${testResult.toPhone}`}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-zinc-600">{testResult.reply}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
        <StatPill label="Contacts" value={stats?.contactsContacted} />
        <StatPill label="Bot sent" value={stats?.messagesSent} />
        <StatPill label="Received" value={stats?.messagesReceived} />
        <StatPill label="Today in" value={stats?.todayInbound} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { icon: Zap, text: `${stats?.actions ?? 0} actions` },
          { icon: MessageSquare, text: `${stats?.faqs ?? 0} FAQs` },
          { icon: Users, text: `${stats?.products ?? 0} products` },
          { icon: Bot, text: stats?.enabled ? 'Live' : 'Paused' },
        ].map(({ icon: Icon, text }) => (
          <span key={text} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600">
            <Icon className="w-3 h-3 text-zinc-400" />
            {text}
          </span>
        ))}
      </div>

      {tab === 'brain' && brain && (
        <BrainPanel brain={brain} onChange={setBrain} onSave={save} saving={saving} saved={saved} />
      )}
      {tab === 'inbox' && <InboxPanel liveTick={liveTick} />}
    </div>
  );
}
