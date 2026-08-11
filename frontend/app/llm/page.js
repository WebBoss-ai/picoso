'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock, Sparkles, Send, Loader2, LogOut, ChevronRight,
  Calculator, Users, RefreshCw, AlertCircle, BarChart3,
  Database, Brain, CheckCircle2, Link2, Play,
} from 'lucide-react';

const PIN_KEY = 'picoso_llm_pin';
const CONV_KEY = 'picoso_llm_conversation';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';

const SUGGESTIONS = [
  '2 km ke andar Paneer Tikka Rice kitne customers ne order kiya, aur unmein se kitne repeat customers hain?',
  'Last month total sales',
  'Total orders of yesterday',
  'What products sell the most?',
  'Which customers are inactive for 60 days?',
  'What is my average order value?',
];

function getPin() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(PIN_KEY) || '';
}

function apiHeaders(pin, json = true) {
  const h = { 'x-llm-pin': pin };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function formatMetricValue(m) {
  if (!m) return '—';
  if (m.display) return m.display;
  if (m.id === 'repeat_rate' && typeof m.value === 'number') {
    const v = m.value <= 1 ? m.value * 100 : m.value;
    return `${v.toFixed(1)}%`;
  }
  if (m.unit === 'INR' || m.id === 'revenue' || m.id === 'aov' || m.id === 'spend') {
    return `₹${Number(m.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  if (typeof m.value === 'number') {
    return Number(m.value).toLocaleString('en-IN');
  }
  return String(m.value ?? '—');
}

function stageLabel(stage, tool) {
  const map = {
    received: 'Received…',
    classifying: 'Understanding…',
    planning: 'Planning with business brain…',
    waiting_for_tool: 'Selecting tools…',
    executing: tool ? `Running ${String(tool).replace(/_/g, ' ')}…` : 'Querying…',
    validating: 'Validating…',
    answering: 'Writing answer…',
    resolving_product: 'Finding product…',
    querying: 'Analytics query…',
    understanding: 'Understanding…',
    deterministic_mode: 'Tools engine…',
    tools_engine: 'Completing with tools…',
    fallback: 'Recovering…',
    completing_tools: 'Finishing metrics…',
  };
  return map[stage] || stage || 'Working…';
}

export default function LlmPage() {
  const [pin, setPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [authing, setAuthing] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('ask'); // ask | train

  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const abortRef = useRef(null);

  // Train state
  const [workspace, setWorkspace] = useState(null);
  const [trainBusy, setTrainBusy] = useState(false);
  const [trainError, setTrainError] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [draftModel, setDraftModel] = useState(null);
  const [hintQ, setHintQ] = useState('');
  const [hintA, setHintA] = useState('');
  const [externalUri, setExternalUri] = useState('');
  const [businessContext, setBusinessContext] = useState('');

  useEffect(() => {
    const saved = getPin();
    if (saved) {
      setPin(saved);
      verifyPin(saved, true);
    }
    const cid = sessionStorage.getItem(CONV_KEY);
    if (cid) setConversationId(cid);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [turns, status, loading]);

  useEffect(() => {
    if (ready && pin) loadWorkspace(pin);
  }, [ready, pin]);

  async function loadWorkspace(p = pin) {
    try {
      const res = await fetch(`${API_BASE}/llm/workspace`, {
        headers: apiHeaders(p, false),
      });
      if (!res.ok) return;
      const data = await res.json();
      setWorkspace(data);
      if (data.model) setDraftModel(data.model);
    } catch {
      /* ignore */
    }
  }

  async function verifyPin(value, silent = false) {
    setAuthing(true);
    setPinError('');
    try {
      const res = await fetch(`${API_BASE}/llm/auth`, {
        method: 'POST',
        headers: apiHeaders(value),
        body: JSON.stringify({ pin: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid access code');
      }
      sessionStorage.setItem(PIN_KEY, value);
      setPin(value);
      setReady(true);
    } catch (err) {
      sessionStorage.removeItem(PIN_KEY);
      setPin('');
      setReady(false);
      if (!silent) setPinError(err.message || 'Invalid access code');
    } finally {
      setAuthing(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(CONV_KEY);
    setPin('');
    setReady(false);
    setTurns([]);
    setConversationId(null);
  }

  async function connectSelf() {
    setTrainBusy(true);
    setTrainError('');
    try {
      await fetch(`${API_BASE}/llm/connections`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({ mode: 'self' }),
      });
      await loadWorkspace();
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function connectExternal() {
    if (!externalUri.trim()) return;
    setTrainBusy(true);
    setTrainError('');
    try {
      const res = await fetch(`${API_BASE}/llm/connections`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({
          mode: 'mongodb_uri',
          name: 'External MongoDB',
          uri: externalUri.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Connect failed');
      setExternalUri('');
      await loadWorkspace();
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function runDiscover() {
    setTrainBusy(true);
    setTrainError('');
    try {
      const res = await fetch(`${API_BASE}/llm/train/discover`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({
          sampleSize: 40,
          businessContext:
            businessContext ||
            'Food delivery / commerce. Prefer customers, orders, products when present.',
          modelName: 'Business brain',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      setSnapshot(data.snapshot);
      setDraftModel(data.model);
      await loadWorkspace();
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function activateModel() {
    if (!draftModel?.id) return;
    setTrainBusy(true);
    setTrainError('');
    try {
      // save context first
      await fetch(`${API_BASE}/llm/models/${draftModel.id}`, {
        method: 'PUT',
        headers: apiHeaders(pin),
        body: JSON.stringify({
          businessContext: businessContext || draftModel.businessContext,
          glossary: draftModel.glossary,
          entities: (draftModel.entities || []).map((e) => ({ ...e, confirmed: true })),
          metrics: (draftModel.metrics || []).map((m) => ({ ...m, confirmed: true })),
        }),
      });
      const res = await fetch(`${API_BASE}/llm/models/${draftModel.id}/activate`, {
        method: 'POST',
        headers: apiHeaders(pin),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Activate failed');
      setDraftModel(data.model);
      await loadWorkspace();
      setTab('ask');
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  async function teachHint() {
    if (!draftModel?.id || !hintQ.trim() || !hintA.trim()) return;
    setTrainBusy(true);
    try {
      const res = await fetch(`${API_BASE}/llm/models/${draftModel.id}/hints`, {
        method: 'POST',
        headers: apiHeaders(pin),
        body: JSON.stringify({ question: hintQ.trim(), answer: hintA.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Hint failed');
      setDraftModel(data.model);
      setHintQ('');
      setHintA('');
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainBusy(false);
    }
  }

  const ask = useCallback(
    async (text) => {
      const q = (text || message).trim();
      if (!q || loading || !pin) return;

      setLoading(true);
      setError('');
      setStatus({ stage: 'received' });
      setMessage('');
      setTurns((t) => [...t, { role: 'user', content: q }]);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/llm/chat`, {
          method: 'POST',
          headers: {
            ...apiHeaders(pin),
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            message: q,
            conversationId: conversationId || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';

          for (const chunk of chunks) {
            const lines = chunk.split('\n');
            let event = 'message';
            let dataLine = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              if (line.startsWith('data:')) dataLine += line.slice(5).trim();
            }
            if (!dataLine) continue;
            let data;
            try {
              data = JSON.parse(dataLine);
            } catch {
              continue;
            }

            if (event === 'status') setStatus(data);
            else if (event === 'result') {
              finalResult = data;
              setTurns((t) => [
                ...t,
                { role: 'assistant', content: data.headline || 'Done', result: data },
              ]);
            } else if (event === 'error') setError(data.message || 'Error');
            else if (event === 'complete') {
              if (data.conversationId) {
                setConversationId(data.conversationId);
                sessionStorage.setItem(CONV_KEY, data.conversationId);
              }
              setStatus(null);
            }
          }
        }

        if (!finalResult) {
          setTurns((t) => [
            ...t,
            { role: 'assistant', content: 'No result returned.', result: null },
          ]);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Request failed');
        setTurns((t) => [
          ...t,
          { role: 'assistant', content: err.message || 'Request failed', error: true },
        ]);
      } finally {
        setLoading(false);
        setStatus(null);
      }
    },
    [message, loading, pin, conversationId]
  );

  if (!ready) {
    return (
      <div className="llm-root min-h-screen flex items-center justify-center px-4">
        <style dangerouslySetInnerHTML={{ __html: LLM_CSS }} />
        <div className="llm-pin-card w-full max-w-md">
          <div className="llm-brand-mark">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="llm-pin-title">Intelligence Partner</h1>
          <p className="llm-pin-sub">
            Connect data · Train a business brain · Ask anything. Access code required.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyPin(pinInput);
            }}
            className="space-y-3"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--llm-muted)]" />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Access code"
                className="llm-input pl-10"
              />
            </div>
            {pinError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {pinError}
              </p>
            )}
            <button type="submit" disabled={authing || !pinInput} className="llm-btn-primary w-full">
              {authing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const trained = Boolean(workspace?.trained || workspace?.activeModel);

  return (
    <div className="llm-root min-h-screen flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: LLM_CSS }} />

      <header className="llm-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="llm-brand-mark sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="llm-header-title">Intelligence Partner</div>
            <div className="llm-header-sub truncate">
              {trained
                ? `Brain active · ${workspace?.activeModel?.name || 'model online'}`
                : 'Train a brain on your MongoDB — then ask anything'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="llm-tabs">
            <button
              type="button"
              className={tab === 'ask' ? 'on' : ''}
              onClick={() => setTab('ask')}
            >
              Ask
            </button>
            <button
              type="button"
              className={tab === 'train' ? 'on' : ''}
              onClick={() => setTab('train')}
            >
              Train
            </button>
          </div>
          <button type="button" onClick={logout} className="llm-btn-ghost">
            <LogOut className="w-4 h-4" /> Exit
          </button>
        </div>
      </header>

      {tab === 'train' ? (
        <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 space-y-5 overflow-y-auto">
          <section className="llm-card">
            <h2 className="llm-section-h">
              <Database className="w-4 h-4" /> 1. Connect MongoDB
            </h2>
            <p className="llm-muted">
              Default uses this app database. Optionally connect an external cluster (server must allow
              it).
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" className="llm-btn-primary" disabled={trainBusy} onClick={connectSelf}>
                <Link2 className="w-4 h-4" /> Use app database
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              <input
                className="llm-input"
                placeholder="mongodb+srv://… (optional external)"
                value={externalUri}
                onChange={(e) => setExternalUri(e.target.value)}
              />
              <button
                type="button"
                className="llm-btn-ghost"
                disabled={trainBusy || !externalUri.trim()}
                onClick={connectExternal}
              >
                Connect external
              </button>
            </div>
            {workspace?.primaryConnection && (
              <p className="llm-meta mt-2">
                Connection: {workspace.primaryConnection.mode} ·{' '}
                {workspace.primaryConnection.meta?.dbName || workspace.primaryConnection.meta?.host || '—'}{' '}
                · {workspace.primaryConnection.status}
              </p>
            )}
          </section>

          <section className="llm-card">
            <h2 className="llm-section-h">
              <Brain className="w-4 h-4" /> 2. Sample & auto-detect
            </h2>
            <p className="llm-muted">
              We sample documents, infer field types, relationships, money fields, and draft metrics.
              Full data is never sent to the model — only schema + small samples.
            </p>
            <textarea
              className="llm-textarea mt-3"
              rows={2}
              placeholder="Business context (optional): e.g. healthy food delivery in Gurugram"
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
            />
            <button
              type="button"
              className="llm-btn-primary mt-3"
              disabled={trainBusy}
              onClick={runDiscover}
            >
              {trainBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Discover schema & draft brain
            </button>
          </section>

          {(snapshot || draftModel) && (
            <section className="llm-card">
              <h2 className="llm-section-h">
                <CheckCircle2 className="w-4 h-4" /> 3. Review brain
              </h2>
              {snapshot && (
                <p className="llm-meta">
                  Snapshot v{snapshot.version} · {snapshot.collections?.length || 0} collections ·{' '}
                  {snapshot.relationships?.length || 0} relationships
                </p>
              )}
              {draftModel && (
                <>
                  <div className="llm-tag-row mt-3">
                    {(draftModel.entities || []).slice(0, 12).map((e) => (
                      <span key={e.id} className="llm-tag">
                        {e.name}
                        <em>{e.role}</em>
                      </span>
                    ))}
                  </div>
                  <div className="llm-tag-row mt-2">
                    {(draftModel.metrics || []).slice(0, 10).map((m) => (
                      <span key={m.id} className="llm-tag muted">
                        {m.name}
                      </span>
                    ))}
                  </div>
                  <p className="llm-muted mt-3 text-sm">
                    {(draftModel.entities || []).length} entities ·{' '}
                    {(draftModel.metrics || []).length} metrics ·{' '}
                    {(draftModel.dimensions || []).length} dimensions
                  </p>
                </>
              )}
              <button
                type="button"
                className="llm-btn-primary mt-4"
                disabled={trainBusy || !draftModel?.id}
                onClick={activateModel}
              >
                <CheckCircle2 className="w-4 h-4" /> Activate brain for chat
              </button>
            </section>
          )}

          {draftModel?.id && (
            <section className="llm-card">
              <h2 className="llm-section-h">4. Teach (optional)</h2>
              <p className="llm-muted">
                Example: Q “What is a completed order?” → A “status delivered or confirmed, not cancelled.”
              </p>
              <input
                className="llm-input mt-2"
                placeholder="Definition question"
                value={hintQ}
                onChange={(e) => setHintQ(e.target.value)}
              />
              <textarea
                className="llm-textarea mt-2"
                rows={2}
                placeholder="Your definition / rule"
                value={hintA}
                onChange={(e) => setHintA(e.target.value)}
              />
              <button
                type="button"
                className="llm-btn-ghost mt-2"
                disabled={trainBusy}
                onClick={teachHint}
              >
                Save teaching
              </button>
              {(draftModel.trainingHints || []).length > 0 && (
                <ul className="llm-hint-list">
                  {(draftModel.trainingHints || []).slice(-5).map((h, i) => (
                    <li key={i}>
                      <strong>{h.question}</strong>
                      <span>{h.answer}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {trainError && (
            <div className="llm-error">
              <AlertCircle className="w-4 h-4" /> {trainError}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 pb-6 pt-4 min-h-0">
          {!trained && (
            <button type="button" className="llm-banner" onClick={() => setTab('train')}>
              <Brain className="w-4 h-4" />
              No trained brain yet — open Train to sample MongoDB and activate a model. Built-in tools
              still answer common Picoso questions.
            </button>
          )}

          <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
            {turns.length === 0 && !loading && (
              <div className="llm-hero animate-llm-in">
                <h2 className="llm-hero-title">Your flexible analytics partner</h2>
                <p className="llm-hero-sub">
                  AI plans. Code runs exact queries on your data — after train, answers follow your
                  business definitions.
                </p>
                <div className="llm-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="llm-chip" onClick={() => ask(s)}>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'llm-bubble-user' : 'llm-bubble-ai'}>
                {t.role === 'user' ? <p>{t.content}</p> : <AnswerCard turn={t} />}
              </div>
            ))}

            {loading && status && (
              <div className="llm-status animate-llm-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{stageLabel(status.stage, status.tool)}</span>
              </div>
            )}

            {error && !loading && (
              <div className="llm-error">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>

          <form
            className="llm-composer"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              placeholder="Ask anything about your data…"
              rows={2}
              className="llm-textarea"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="llm-btn-primary llm-send"
              aria-label="Ask"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function AnswerCard({ turn }) {
  const r = turn.result;
  if (turn.error || !r) {
    return <p className={turn.error ? 'text-red-600' : ''}>{turn.content}</p>;
  }

  const primary = r.primaryMetric || r.metrics?.[0];
  const others = (r.metrics || []).filter((m) => m.id !== primary?.id).slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <div className="llm-answer-label">Answer</div>
        <div className="llm-answer-value">
          {primary ? formatMetricValue(primary) : r.headline}
        </div>
        {primary && r.headline && r.headline !== formatMetricValue(primary) && (
          <p className="llm-narrative" style={{ whiteSpace: 'pre-wrap' }}>
            {r.narrative || r.headline}
          </p>
        )}
        {!primary && r.narrative && (
          <p className="llm-narrative" style={{ whiteSpace: 'pre-wrap' }}>
            {r.narrative}
          </p>
        )}
        {r.period && (
          <p className="llm-meta">
            Period: {r.period} · Data: {r.freshness || 'live'}
          </p>
        )}
      </div>

      {r.clarification?.candidates?.length > 0 && (
        <div className="llm-clarify">
          <p className="font-medium mb-2">{r.headline}</p>
          <ul className="space-y-1">
            {r.clarification.candidates.map((c) => (
              <li key={c.productId} className="llm-clarify-item">
                {c.name}
                <span className="opacity-50 text-xs ml-2">
                  {Math.round((c.score || 0) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {others.length > 0 && (
        <div className="llm-metrics-grid">
          {others.map((m) => (
            <div key={m.id} className="llm-metric">
              <div className="llm-metric-label">{m.label || m.id}</div>
              <div className="llm-metric-value">{formatMetricValue(m)}</div>
            </div>
          ))}
        </div>
      )}

      {r.products?.length > 0 && (
        <div>
          <div className="llm-section-title">
            <BarChart3 className="w-4 h-4" /> Top products
          </div>
          <table className="llm-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Units</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {r.products.map((p, i) => (
                <tr key={i}>
                  <td>{p.name || '—'}</td>
                  <td>{p.units ?? p.orders}</td>
                  <td>₹{Number(p.revenue || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {r.customers?.length > 0 && (
        <div>
          <div className="llm-section-title">
            <Users className="w-4 h-4" /> Sample
          </div>
          <table className="llm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Orders</th>
                <th>Spend</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              {r.customers.slice(0, 15).map((c, i) => (
                <tr key={i}>
                  <td>{c.name || '—'}</td>
                  <td>{c.orders ?? '—'}</td>
                  <td>
                    {c.spend != null ? `₹${Number(c.spend).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td>{c.distanceKm != null ? `${c.distanceKm} km` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {r.calculationSteps?.length > 0 && (
        <details className="llm-calc">
          <summary>
            <Calculator className="w-4 h-4" /> How this was calculated
          </summary>
          <ol>
            {r.calculationSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}

      {r.definitions?.length > 0 && (
        <details className="llm-calc">
          <summary>
            <RefreshCw className="w-4 h-4" /> Definitions
          </summary>
          <ul>
            {r.definitions.map((d, i) => (
              <li key={i}>
                <strong>{d.id}:</strong> {d.text}
              </li>
            ))}
          </ul>
        </details>
      )}

      {r.confidence?.overall != null && (
        <p className="llm-meta">
          Confidence: {Math.round(r.confidence.overall * 100)}%
          {r.confidence.product != null &&
            ` · Product match ${Math.round(r.confidence.product * 100)}%`}
        </p>
      )}
    </div>
  );
}

const LLM_CSS = `
  :root {
    --llm-ink: #1a1612;
    --llm-muted: #6b6258;
    --llm-bg0: #f7f2ea;
    --llm-bg1: #efe6d8;
    --llm-card: rgba(255, 252, 247, 0.92);
    --llm-line: rgba(40, 32, 24, 0.1);
    --llm-accent: #c45c26;
    --llm-accent-deep: #9a3f12;
  }
  .llm-root {
    font-family: "Segoe UI", "Iowan Old Style", "Palatino Linotype", Palatino, serif;
    color: var(--llm-ink);
    background:
      radial-gradient(1200px 600px at 10% -10%, #f3e2c8 0%, transparent 55%),
      radial-gradient(900px 500px at 100% 0%, #e8d5c0 0%, transparent 50%),
      linear-gradient(165deg, var(--llm-bg0) 0%, var(--llm-bg1) 48%, #e7dfd2 100%);
  }
  .llm-header {
    display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
    padding: 0.85rem 1.1rem; border-bottom: 1px solid var(--llm-line);
    backdrop-filter: blur(10px); background: rgba(247, 242, 234, 0.8);
    position: sticky; top: 0; z-index: 10; flex-wrap: wrap;
  }
  .llm-header-title { font-size: 1.05rem; font-weight: 650; letter-spacing: -0.02em; }
  .llm-header-sub { font-size: 0.75rem; color: var(--llm-muted); }
  .llm-brand-mark {
    width: 2.75rem; height: 2.75rem; border-radius: 0.85rem; display: grid; place-items: center;
    color: #fff; background: linear-gradient(145deg, var(--llm-accent), var(--llm-accent-deep));
    box-shadow: 0 8px 24px rgba(196, 92, 38, 0.28);
  }
  .llm-brand-mark.sm { width: 2.1rem; height: 2.1rem; border-radius: 0.65rem; }
  .llm-tabs {
    display: inline-flex; border: 1px solid var(--llm-line); border-radius: 999px; overflow: hidden;
    background: rgba(255,252,247,0.7);
  }
  .llm-tabs button {
    border: 0; background: transparent; padding: 0.35rem 0.9rem; font-size: 0.8rem; cursor: pointer;
    color: var(--llm-muted);
  }
  .llm-tabs button.on {
    background: linear-gradient(145deg, var(--llm-accent), var(--llm-accent-deep)); color: #fff;
  }
  .llm-pin-card {
    background: var(--llm-card); border: 1px solid var(--llm-line); border-radius: 1.25rem;
    padding: 2rem 1.5rem; box-shadow: 0 20px 50px rgba(40, 28, 16, 0.08); text-align: center;
    animation: llm-in 0.45s ease both;
  }
  .llm-pin-card .llm-brand-mark { margin: 0 auto 1rem; }
  .llm-pin-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.03em; }
  .llm-pin-sub { color: var(--llm-muted); font-size: 0.9rem; margin: 0.4rem 0 1.25rem; }
  .llm-input, .llm-textarea {
    width: 100%; border: 1px solid var(--llm-line); background: #fffcf7; border-radius: 0.85rem;
    padding: 0.75rem 0.9rem; font: inherit; color: var(--llm-ink); outline: none;
  }
  .llm-input:focus, .llm-textarea:focus {
    border-color: rgba(196, 92, 38, 0.45); box-shadow: 0 0 0 3px rgba(196, 92, 38, 0.12);
  }
  .llm-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    background: linear-gradient(145deg, var(--llm-accent), var(--llm-accent-deep));
    color: #fff; border: none; border-radius: 0.85rem; padding: 0.75rem 1rem; font-weight: 600; cursor: pointer;
  }
  .llm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .llm-btn-ghost {
    display: inline-flex; align-items: center; gap: 0.35rem; background: transparent;
    border: 1px solid var(--llm-line); border-radius: 999px; padding: 0.4rem 0.75rem;
    font-size: 0.8rem; color: var(--llm-muted); cursor: pointer;
  }
  .llm-card {
    background: var(--llm-card); border: 1px solid var(--llm-line); border-radius: 1rem; padding: 1.1rem 1.2rem;
  }
  .llm-section-h {
    display: flex; align-items: center; gap: 0.4rem; font-size: 1rem; font-weight: 650; margin-bottom: 0.35rem;
  }
  .llm-muted { color: var(--llm-muted); font-size: 0.9rem; }
  .llm-tag-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .llm-tag {
    font-size: 0.75rem; border: 1px solid var(--llm-line); border-radius: 999px; padding: 0.25rem 0.6rem;
    background: rgba(255,255,255,0.5);
  }
  .llm-tag em { font-style: normal; opacity: 0.55; margin-left: 0.35rem; font-size: 0.65rem; }
  .llm-tag.muted { opacity: 0.85; }
  .llm-hint-list { margin: 0.75rem 0 0; padding: 0; list-style: none; }
  .llm-hint-list li {
    border-top: 1px solid var(--llm-line); padding: 0.5rem 0; font-size: 0.85rem; display: grid; gap: 0.15rem;
  }
  .llm-hint-list span { color: var(--llm-muted); }
  .llm-banner {
    display: flex; align-items: flex-start; gap: 0.5rem; text-align: left; width: 100%;
    border: 1px solid rgba(196, 92, 38, 0.25); background: rgba(196, 92, 38, 0.08);
    border-radius: 0.85rem; padding: 0.75rem 0.9rem; font-size: 0.85rem; margin-bottom: 0.75rem; cursor: pointer;
  }
  .llm-hero { padding: 1.5rem 0.25rem 1rem; }
  .llm-hero-title {
    font-size: clamp(1.5rem, 4vw, 2.1rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.15;
  }
  .llm-hero-sub { color: var(--llm-muted); margin-top: 0.55rem; max-width: 36rem; }
  .llm-suggestions { margin-top: 1.4rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .llm-chip {
    display: flex; align-items: flex-start; gap: 0.5rem; text-align: left; padding: 0.75rem 0.9rem;
    border-radius: 0.9rem; border: 1px solid var(--llm-line); background: rgba(255, 252, 247, 0.7);
    font-size: 0.9rem; color: var(--llm-ink); cursor: pointer;
  }
  .llm-chip:hover { border-color: rgba(196, 92, 38, 0.35); }
  .llm-bubble-user {
    margin-left: auto; max-width: 90%;
    background: linear-gradient(145deg, var(--llm-accent), var(--llm-accent-deep));
    color: #fff; padding: 0.85rem 1rem; border-radius: 1rem 1rem 0.3rem 1rem;
    animation: llm-in 0.3s ease both;
  }
  .llm-bubble-ai {
    max-width: 100%; background: var(--llm-card); border: 1px solid var(--llm-line);
    padding: 1rem 1.1rem; border-radius: 1rem 1rem 1rem 0.3rem; animation: llm-in 0.35s ease both;
  }
  .llm-answer-label {
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--llm-muted);
  }
  .llm-answer-value {
    font-size: clamp(1.8rem, 5vw, 2.4rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; margin-top: 0.2rem;
  }
  .llm-narrative { margin-top: 0.5rem; color: var(--llm-muted); font-size: 0.95rem; }
  .llm-meta { margin-top: 0.4rem; font-size: 0.75rem; color: var(--llm-muted); }
  .llm-metrics-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem;
  }
  .llm-metric {
    border: 1px solid var(--llm-line); border-radius: 0.75rem; padding: 0.6rem 0.75rem; background: rgba(255,255,255,0.45);
  }
  .llm-metric-label { font-size: 0.7rem; color: var(--llm-muted); }
  .llm-metric-value { font-size: 1.1rem; font-weight: 650; }
  .llm-section-title {
    display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem;
  }
  .llm-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .llm-table th {
    text-align: left; font-weight: 600; color: var(--llm-muted); font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 0.04em; padding: 0.35rem 0.4rem; border-bottom: 1px solid var(--llm-line);
  }
  .llm-table td { padding: 0.4rem; border-bottom: 1px solid var(--llm-line); }
  .llm-calc { border-top: 1px solid var(--llm-line); padding-top: 0.6rem; font-size: 0.85rem; }
  .llm-calc summary {
    display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-weight: 600; list-style: none;
  }
  .llm-calc summary::-webkit-details-marker { display: none; }
  .llm-calc ol, .llm-calc ul { margin: 0.5rem 0 0 1.1rem; color: var(--llm-muted); }
  .llm-clarify {
    border: 1px solid rgba(196, 92, 38, 0.25); background: rgba(196, 92, 38, 0.06);
    border-radius: 0.85rem; padding: 0.75rem;
  }
  .llm-status {
    display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.85rem;
    border-radius: 999px; border: 1px solid var(--llm-line); background: rgba(255,252,247,0.9);
    font-size: 0.85rem; color: var(--llm-muted);
  }
  .llm-error { display: flex; align-items: center; gap: 0.4rem; color: #b91c1c; font-size: 0.9rem; }
  .llm-composer {
    display: grid; grid-template-columns: 1fr auto; gap: 0.6rem; align-items: end;
    position: sticky; bottom: 0; padding-top: 0.5rem;
    background: linear-gradient(to top, var(--llm-bg1) 70%, transparent);
  }
  .llm-send { width: 3rem; height: 3rem; padding: 0; border-radius: 0.9rem; }
  @keyframes llm-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
  .animate-llm-in { animation: llm-in 0.4s ease both; }
  @keyframes llm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
  .animate-llm-pulse { animation: llm-pulse 1.4s ease infinite; }
`;
