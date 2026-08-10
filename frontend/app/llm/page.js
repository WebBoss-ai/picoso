'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock, Sparkles, Send, Loader2, LogOut, ChevronRight,
  Calculator, Users, RefreshCw, AlertCircle, BarChart3,
} from 'lucide-react';

const PIN_KEY = 'picoso_llm_pin';
const CONV_KEY = 'picoso_llm_conversation';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';

const SUGGESTIONS = [
  '2 km ke andar Paneer Tikka Rice kitne customers ne order kiya, aur unmein se kitne repeat customers hain?',
  'Who are my best customers by spend in the last 90 days?',
  'What products sell the most?',
  'Which customers are inactive for 60 days?',
  'Last 30 din mein total revenue kitna tha?',
  'What is my average order value?',
];

function getPin() {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(PIN_KEY) || '';
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
    classifying: 'Understanding question…',
    planning: 'Planning analysis…',
    waiting_for_tool: 'Selecting tools…',
    executing: tool ? `Running ${tool.replace(/_/g, ' ')}…` : 'Querying data…',
    validating: 'Validating results…',
    answering: 'Writing answer…',
    resolving_product: 'Finding product…',
    querying: 'Running analytics query…',
    understanding: 'Understanding…',
    deterministic_mode: 'Running deterministic tools…',
    fallback: 'Falling back to tools…',
    needs_clarification: 'Need clarification…',
    completed: 'Done',
    failed: 'Failed',
  };
  return map[stage] || stage || 'Working…';
}

export default function LlmPage() {
  const [pin, setPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [authing, setAuthing] = useState(false);
  const [ready, setReady] = useState(false);

  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const abortRef = useRef(null);

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
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [turns, status, loading]);

  async function verifyPin(value, silent = false) {
    setAuthing(true);
    setPinError('');
    try {
      const res = await fetch(`${API_BASE}/llm/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-llm-pin': value,
        },
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
            'Content-Type': 'application/json',
            'x-llm-pin': pin,
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

            if (event === 'status') {
              setStatus(data);
            } else if (event === 'result') {
              finalResult = data;
              setTurns((t) => [
                ...t,
                { role: 'assistant', content: data.headline || 'Done', result: data },
              ]);
            } else if (event === 'error') {
              setError(data.message || 'Error');
            } else if (event === 'complete') {
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
            {
              role: 'assistant',
              content: 'No result returned.',
              result: null,
            },
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

  // ── PIN gate ────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="llm-root min-h-screen flex items-center justify-center px-4">
        <style dangerouslySetInnerHTML={{ __html: LLM_CSS }} />
        <div className="llm-pin-card w-full max-w-md">
          <div className="llm-brand-mark">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="llm-pin-title">Picoso Intelligence</h1>
          <p className="llm-pin-sub">Internal analytics console. Enter access code.</p>
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

  // ── Console ─────────────────────────────────────────────────────────────
  return (
    <div className="llm-root min-h-screen flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: LLM_CSS }} />

      <header className="llm-header">
        <div className="flex items-center gap-3">
          <div className="llm-brand-mark sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="llm-header-title">Picoso Intelligence</div>
            <div className="llm-header-sub">Ask anything about your business</div>
          </div>
        </div>
        <button type="button" onClick={logout} className="llm-btn-ghost">
          <LogOut className="w-4 h-4" /> Exit
        </button>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 pb-6 pt-4 min-h-0">
        <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
          {turns.length === 0 && !loading && (
            <div className="llm-hero animate-llm-in">
              <h2 className="llm-hero-title">Ask anything about your business</h2>
              <p className="llm-hero-sub">
                Live numbers from Picoso orders, products, and customers — with calculation transparency.
              </p>
              <div className="llm-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="llm-chip"
                    onClick={() => ask(s)}
                  >
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'llm-bubble-user' : 'llm-bubble-ai'}>
              {t.role === 'user' ? (
                <p>{t.content}</p>
              ) : (
                <AnswerCard turn={t} />
              )}
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
            placeholder="2 km mein paneer buyers kitne hain?"
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
    </div>
  );
}

function AnswerCard({ turn }) {
  const r = turn.result;
  if (turn.error || !r) {
    return (
      <p className={turn.error ? 'text-red-600' : ''}>
        {turn.content}
      </p>
    );
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
          <p className="llm-narrative">{r.narrative || r.headline}</p>
        )}
        {r.period && <p className="llm-meta">Period: {r.period} · Data: {r.freshness || 'live'}</p>}
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
          <p className="text-xs mt-2 opacity-70">Reply with the exact product name.</p>
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
          <div className="overflow-x-auto">
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
        </div>
      )}

      {r.customers?.length > 0 && (
        <div>
          <div className="llm-section-title">
            <Users className="w-4 h-4" /> Customers sample
          </div>
          <div className="overflow-x-auto">
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
                      {c.spend != null
                        ? `₹${Number(c.spend).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td>
                      {c.distanceKm != null ? `${c.distanceKm} km` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {r.warnings?.length > 0 && (
        <p className="text-xs text-amber-700">Checks: {r.warnings.join('; ')}</p>
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
    --llm-green: #2f6b4f;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--llm-line);
    backdrop-filter: blur(10px);
    background: rgba(247, 242, 234, 0.75);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .llm-header-title {
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: -0.02em;
  }
  .llm-header-sub {
    font-size: 0.75rem;
    color: var(--llm-muted);
  }
  .llm-brand-mark {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.85rem;
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(145deg, var(--llm-accent), var(--llm-accent-deep));
    box-shadow: 0 8px 24px rgba(196, 92, 38, 0.28);
  }
  .llm-brand-mark.sm {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 0.65rem;
  }
  .llm-pin-card {
    background: var(--llm-card);
    border: 1px solid var(--llm-line);
    border-radius: 1.25rem;
    padding: 2rem 1.5rem;
    box-shadow: 0 20px 50px rgba(40, 28, 16, 0.08);
    text-align: center;
    animation: llm-in 0.45s ease both;
  }
  .llm-pin-card .llm-brand-mark {
    margin: 0 auto 1rem;
  }
  .llm-pin-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.03em;
  }
  .llm-pin-sub {
    color: var(--llm-muted);
    font-size: 0.9rem;
    margin: 0.4rem 0 1.25rem;
  }
  .llm-input, .llm-textarea {
    width: 100%;
    border: 1px solid var(--llm-line);
    background: #fffcf7;
    border-radius: 0.85rem;
    padding: 0.75rem 0.9rem;
    font: inherit;
    color: var(--llm-ink);
    outline: none;
  }
  .llm-input:focus, .llm-textarea:focus {
    border-color: rgba(196, 92, 38, 0.45);
    box-shadow: 0 0 0 3px rgba(196, 92, 38, 0.12);
  }
  .llm-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    background: linear-gradient(145deg, var(--llm-accent), var(--llm-accent-deep));
    color: #fff;
    border: none;
    border-radius: 0.85rem;
    padding: 0.75rem 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  .llm-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .llm-btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: transparent;
    border: 1px solid var(--llm-line);
    border-radius: 999px;
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    color: var(--llm-muted);
    cursor: pointer;
  }
  .llm-hero {
    padding: 2rem 0.25rem 1rem;
  }
  .llm-hero-title {
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }
  .llm-hero-sub {
    color: var(--llm-muted);
    margin-top: 0.6rem;
    max-width: 36rem;
  }
  .llm-suggestions {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .llm-chip {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    text-align: left;
    padding: 0.75rem 0.9rem;
    border-radius: 0.9rem;
    border: 1px solid var(--llm-line);
    background: rgba(255, 252, 247, 0.7);
    font-size: 0.9rem;
    color: var(--llm-ink);
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .llm-chip:hover {
    transform: translateX(2px);
    border-color: rgba(196, 92, 38, 0.35);
  }
  .llm-bubble-user {
    margin-left: auto;
    max-width: 90%;
    background: linear-gradient(145deg, var(--llm-accent), var(--llm-accent-deep));
    color: #fff;
    padding: 0.85rem 1rem;
    border-radius: 1rem 1rem 0.3rem 1rem;
    animation: llm-in 0.3s ease both;
  }
  .llm-bubble-ai {
    max-width: 100%;
    background: var(--llm-card);
    border: 1px solid var(--llm-line);
    padding: 1rem 1.1rem;
    border-radius: 1rem 1rem 1rem 0.3rem;
    animation: llm-in 0.35s ease both;
  }
  .llm-answer-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--llm-muted);
  }
  .llm-answer-value {
    font-size: clamp(1.8rem, 5vw, 2.4rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin-top: 0.2rem;
  }
  .llm-narrative {
    margin-top: 0.5rem;
    color: var(--llm-muted);
    font-size: 0.95rem;
    white-space: pre-wrap;
  }
  .llm-meta {
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: var(--llm-muted);
  }
  .llm-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
  }
  .llm-metric {
    border: 1px solid var(--llm-line);
    border-radius: 0.75rem;
    padding: 0.6rem 0.75rem;
    background: rgba(255,255,255,0.45);
  }
  .llm-metric-label {
    font-size: 0.7rem;
    color: var(--llm-muted);
  }
  .llm-metric-value {
    font-size: 1.1rem;
    font-weight: 650;
  }
  .llm-section-title {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
  }
  .llm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .llm-table th {
    text-align: left;
    font-weight: 600;
    color: var(--llm-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.35rem 0.4rem;
    border-bottom: 1px solid var(--llm-line);
  }
  .llm-table td {
    padding: 0.4rem;
    border-bottom: 1px solid var(--llm-line);
  }
  .llm-calc {
    border-top: 1px solid var(--llm-line);
    padding-top: 0.6rem;
    font-size: 0.85rem;
  }
  .llm-calc summary {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-weight: 600;
    list-style: none;
  }
  .llm-calc summary::-webkit-details-marker { display: none; }
  .llm-calc ol, .llm-calc ul {
    margin: 0.5rem 0 0 1.1rem;
    color: var(--llm-muted);
  }
  .llm-calc li { margin: 0.2rem 0; }
  .llm-clarify {
    border: 1px solid rgba(196, 92, 38, 0.25);
    background: rgba(196, 92, 38, 0.06);
    border-radius: 0.85rem;
    padding: 0.75rem;
  }
  .llm-clarify-item {
    padding: 0.25rem 0;
  }
  .llm-status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--llm-line);
    background: rgba(255,252,247,0.9);
    font-size: 0.85rem;
    color: var(--llm-muted);
  }
  .llm-error {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #b91c1c;
    font-size: 0.9rem;
  }
  .llm-composer {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.6rem;
    align-items: end;
    position: sticky;
    bottom: 0;
    padding-top: 0.5rem;
    background: linear-gradient(to top, var(--llm-bg1) 70%, transparent);
  }
  .llm-send {
    width: 3rem;
    height: 3rem;
    padding: 0;
    border-radius: 0.9rem;
  }
  @keyframes llm-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
  .animate-llm-in { animation: llm-in 0.4s ease both; }
  @keyframes llm-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.65; }
  }
  .animate-llm-pulse { animation: llm-pulse 1.4s ease infinite; }
`;
