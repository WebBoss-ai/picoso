'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot, Brain, Inbox, Plus, Trash2, Loader2, Save, Check,
  MessageSquare, Users, Send, Search, Zap,
  Clock, MapPin, Phone, Globe, ChevronRight, AlertCircle, Sparkles,
} from 'lucide-react';
import { wpMarketing } from '@/lib/api';

const TABS = [
  { id: 'brain', label: 'Brain', icon: Brain },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
];

const inputCls =
  'w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5';

function fmtTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  if (dt.toDateString() === now.toDateString()) {
    return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
        {hint && <span className="text-[10.5px] text-zinc-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/80 px-4 py-3.5 shadow-[0_1px_0_rgba(24,24,27,0.04)] backdrop-blur-sm">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">{value ?? 0}</p>
    </div>
  );
}

function ToggleSwitch({ on, onToggle, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
        on ? 'bg-emerald-500' : 'bg-zinc-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/** Lightweight SSE for inbox refresh only — no debug UI. */
function connectChatbotStream({ apiBase, pin, onEvent, onStatus }) {
  let closed = false;
  let controller = null;
  let retryTimer = null;

  const connect = async () => {
    if (closed) return;
    controller?.abort();
    controller = new AbortController();
    onStatus?.('connecting');
    try {
      const url = `${apiBase}/wp-marketing/chatbot/events?pin=${encodeURIComponent(pin)}`;
      const resp = await fetch(url, {
        headers: { Accept: 'text/event-stream', 'x-wp-pin': pin },
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(`SSE ${resp.status}`);
      onStatus?.('connected');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split('\n\n');
        buf = chunks.pop() || '';
        for (const chunk of chunks) {
          const line = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          try {
            onEvent?.(JSON.parse(line.slice(5).trim()));
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (closed || err?.name === 'AbortError') return;
      onStatus?.('reconnecting');
    }
    if (!closed) retryTimer = setTimeout(connect, 4000);
  };

  connect();
  return () => {
    closed = true;
    controller?.abort();
    clearTimeout(retryTimer);
  };
}

/* ── Brain panel ─────────────────────────────────────────────────────────── */
function BrainPanel({ brain, onChange, onSave, saving, saved, toggling, onToggle }) {
  const b = brain.business || {};
  const setBiz = (key, val) => onChange({ ...brain, business: { ...b, [key]: val } });

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
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50 px-5 py-4 shadow-[0_8px_30px_rgba(24,24,27,0.04)]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${brain.enabled ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold tracking-tight text-zinc-900">Auto-reply</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                brain.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {brain.enabled ? 'Live' : 'Paused'}
              </span>
            </div>
            <p className="text-[12.5px] text-zinc-500 mt-0.5">
              {brain.enabled
                ? 'Replies instantly when WhatsApp messages arrive'
                : 'Inbox still receives messages — replies are paused'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch
            on={!!brain.enabled}
            disabled={toggling}
            onToggle={onToggle}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving' : saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Business */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_0_rgba(24,24,27,0.03)]">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zinc-400" />
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Business</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Name">
            <input className={inputCls} value={b.name || ''} onChange={(e) => setBiz('name', e.target.value)} placeholder="Picoso" />
          </Field>
          <Field label="Tone">
            <input className={inputCls} value={b.tone || ''} onChange={(e) => setBiz('tone', e.target.value)} placeholder="friendly, concise" />
          </Field>
          <div className="md:col-span-2">
            <Field label="About" hint="Used in replies">
              <textarea className={`${inputCls} min-h-[80px] resize-y`} value={b.about || ''} onChange={(e) => setBiz('about', e.target.value)} placeholder="Healthy meals delivered fast…" />
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
              <textarea className={`${inputCls} min-h-[60px] resize-y`} value={b.extraNotes || ''} onChange={(e) => setBiz('extraNotes', e.target.value)} placeholder="Delivery radius, offers, policies…" />
            </Field>
          </div>
        </div>
      </section>

      {/* Welcome / fallback */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Welcome</p>
          <textarea className={`${inputCls} min-h-[100px] resize-y`} value={brain.welcomeMessage || ''} onChange={(e) => onChange({ ...brain, welcomeMessage: e.target.value })} />
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Fallback</p>
          <textarea className={`${inputCls} min-h-[100px] resize-y`} value={brain.fallbackMessage || ''} onChange={(e) => onChange({ ...brain, fallbackMessage: e.target.value })} />
        </div>
      </section>

      {/* Quick actions */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5">
        <div className="mb-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Quick actions</h3>
          <p className="text-[12px] text-zinc-400 mt-1">Instant replies for keywords like menu, hours</p>
        </div>
        <div className="space-y-2.5">
          {(brain.actions || []).map((a, i) => (
            <div key={a._id || i} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
              <input className={`${inputCls} md:col-span-3`} value={a.label || ''} onChange={(e) => setAction(i, { label: e.target.value })} placeholder="Label" />
              <input
                className={`${inputCls} md:col-span-4 font-mono text-[12px]`}
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
                className={`md:col-span-2 rounded-xl border text-[12px] font-medium transition ${
                  a.enabled ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-400'
                }`}
              >
                {a.enabled ? 'On' : 'Off'}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...brain, actions: brain.actions.filter((_, j) => j !== i) })}
                className="md:col-span-1 flex items-center justify-center text-zinc-300 transition hover:text-red-500"
              >
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
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            <Plus className="w-3.5 h-3.5" /> Add action
          </button>
        </div>
      </section>

      {/* Products */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Menu / products</h3>
            <p className="text-[12px] text-zinc-400 mt-1">Powers menu replies and dish lookups</p>
          </div>
          <button type="button" onClick={addProduct} className="flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="space-y-2.5">
          {(brain.products || []).length === 0 && (
            <p className="py-8 text-center text-[13px] text-zinc-400">No products yet — add your menu items</p>
          )}
          {(brain.products || []).map((p, i) => (
            <div key={p._id || i} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-xl border border-zinc-100 p-3">
              <input className={`${inputCls} md:col-span-3`} value={p.name || ''} onChange={(e) => setProduct(i, { name: e.target.value })} placeholder="Name" />
              <input className={`${inputCls} md:col-span-2`} value={p.category || ''} onChange={(e) => setProduct(i, { category: e.target.value })} placeholder="Category" />
              <input className={`${inputCls} md:col-span-2`} value={p.price || ''} onChange={(e) => setProduct(i, { price: e.target.value })} placeholder="₹199" />
              <input className={`${inputCls} md:col-span-4`} value={p.description || ''} onChange={(e) => setProduct(i, { description: e.target.value })} placeholder="Short description" />
              <button type="button" onClick={() => delProduct(i)} className="md:col-span-1 flex items-center justify-center text-zinc-300 transition hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">FAQs</h3>
            <p className="text-[12px] text-zinc-400 mt-1">Train common Q&A</p>
          </div>
          <button type="button" onClick={addFaq} className="flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="space-y-2.5">
          {(brain.faqs || []).length === 0 && (
            <p className="py-8 text-center text-[13px] text-zinc-400">No FAQs — add common questions</p>
          )}
          {(brain.faqs || []).map((f, i) => (
            <div key={f._id || i} className="space-y-2 rounded-xl border border-zinc-100 p-3">
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1`} value={f.question || ''} onChange={(e) => setFaq(i, { question: e.target.value })} placeholder="Question" />
                <button type="button" onClick={() => delFaq(i)} className="px-2 text-zinc-300 transition hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea className={`${inputCls} min-h-[56px]`} value={f.answer || ''} onChange={(e) => setFaq(i, { answer: e.target.value })} placeholder="Answer" />
              <input
                className={`${inputCls} font-mono text-[12px]`}
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

/* ── Inbox ───────────────────────────────────────────────────────────────── */
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
  const bottomRef = useRef(null);
  const activeIdRef = useRef(null);
  const conversationRequestRef = useRef(0);
  activeIdRef.current = activeId;

  const loadList = useCallback(async (silent = true) => {
    try {
      const r = await wpMarketing.getChatbotConversations({ q: q || undefined, limit: 50 });
      setList(r.data.conversations || []);
    } catch { /* ignore */ }
    finally {
      setLoading(false);
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
    }, 8000);
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
    <div className="grid min-h-[580px] grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_0_rgba(24,24,27,0.03)] lg:col-span-2">
        <div className="flex items-center gap-2 border-b border-zinc-100 p-3.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-300" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contacts"
              className={`${inputCls} pl-9 py-2 text-[12.5px]`}
            />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16 text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : list.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <MessageSquare className="mx-auto mb-3 h-7 w-7 text-zinc-300" />
              <p className="text-[13.5px] font-medium text-zinc-600">No chats yet</p>
              <p className="mt-1 text-[12px] text-zinc-400">Inbound WhatsApp messages appear here</p>
            </div>
          ) : (
            list.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => openConvo(c._id)}
                className={`w-full border-b border-zinc-50 px-4 py-3.5 text-left transition ${
                  activeId === c._id ? 'bg-zinc-50' : 'hover:bg-zinc-50/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-zinc-900">
                      {c.contactName || c.contactPhone}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-400">{c.contactPhone}</p>
                  </div>
                  <span className="shrink-0 text-[10.5px] text-zinc-400">{fmtTime(c.lastMessageAt)}</span>
                </div>
                <p className="mt-1.5 truncate text-[12.5px] text-zinc-500">
                  {c.lastDirection === 'outbound' ? 'Bot: ' : ''}{c.lastMessage || '—'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-[440px] flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_0_rgba(24,24,27,0.03)] lg:col-span-3">
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50">
              <Inbox className="h-5 w-5 text-zinc-300" />
            </div>
            <p className="text-[14px] font-medium text-zinc-600">Select a conversation</p>
            <p className="mt-1 text-[12px] text-zinc-400">Messages refresh live as they arrive</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
              <div>
                <p className="text-[14px] font-semibold text-zinc-900">{thread?.contactName || thread?.contactPhone}</p>
                <p className="font-mono text-[11.5px] text-zinc-400">
                  {thread?.contactPhone} · {thread?.botReplies || 0} bot replies
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-300" />
            </div>
            <div
              className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at top, rgba(24,24,27,0.03), transparent 55%)',
              }}
            >
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                      m.direction === 'outbound'
                        ? 'rounded-br-md bg-zinc-900 text-white'
                        : 'rounded-bl-md border border-zinc-100 bg-white text-zinc-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <div className={`mt-1.5 flex flex-wrap gap-1.5 text-[10px] ${
                      m.direction === 'outbound' ? 'text-zinc-400' : 'text-zinc-400'
                    }`}>
                      <span>{fmtTime(m.createdAt)}</span>
                      {m.messageType && m.messageType !== 'text' && <span>· {m.messageType}</span>}
                      {m.matchedAction && m.matchedAction !== 'manual' && (
                        <span>· {m.matchedAction}</span>
                      )}
                      {m.matchedAction === 'manual' && <span>· manual</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            {err && (
              <div className="mx-5 mb-2 flex items-center gap-1.5 text-[12px] text-red-600">
                <AlertCircle className="h-3.5 w-3.5" /> {err}
              </div>
            )}
            <div className="flex gap-2 border-t border-zinc-100 p-3.5">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Manual reply…"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-[12.5px] font-semibold text-white transition disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function ChatbotSection() {
  const [tab, setTab] = useState('brain');
  const [brain, setBrain] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');
  const [testPhone, setTestPhone] = useState('+91');
  const [testText, setTestText] = useState('hi');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [liveTick, setLiveTick] = useState(0);

  const load = useCallback(async () => {
    setError('');
    try {
      const [b, s] = await Promise.all([
        wpMarketing.getChatbotBrain(),
        wpMarketing.getChatbotStats(),
      ]);
      setBrain(b.data.brain);
      setStats(s.data.stats);
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not load chatbot');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live inbox updates only
  useEffect(() => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('picoso_wp_pin') : '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';
    if (!pin) return undefined;

    return connectChatbotStream({
      apiBase,
      pin,
      onEvent: (data) => {
        if (!data?.type || data.type === 'connected' || data.type === 'heartbeat') return;
        if (['inbound_received', 'inbound', 'outbound', 'inbound_sync'].includes(data.type)) {
          setLiveTick((n) => n + 1);
          if (data.type !== 'outbound') setTab('inbox');
          load().catch(() => {});
        }
      },
    });
  }, [load]);

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

  const toggleEnabled = async () => {
    if (!brain || toggling) return;
    const next = !brain.enabled;
    setToggling(true);
    setError('');
    // Optimistic UI
    setBrain({ ...brain, enabled: next });
    try {
      const r = await wpMarketing.updateChatbotBrain({ enabled: next });
      setBrain(r.data.brain);
      const s = await wpMarketing.getChatbotStats();
      setStats(s.data.stats);
    } catch (e) {
      setBrain({ ...brain, enabled: !next });
      setError(e?.response?.data?.error || 'Could not update auto-reply');
    } finally {
      setToggling(false);
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
      <div className="flex justify-center py-28 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full px-6 py-6 xl:px-10 xl:py-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(16,185,129,0.06), transparent),' +
            'radial-gradient(ellipse 60% 40% at 90% 0%, rgba(24,24,27,0.04), transparent)',
        }}
      />

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-zinc-400">WhatsApp</p>
          <h2 className="text-[28px] font-semibold tracking-tight text-zinc-900">Chatbot</h2>
          <p className="mt-1 text-[13.5px] text-zinc-500">Train once — replies instantly on every inbound message</p>
        </div>
        <div className="flex rounded-2xl border border-zinc-200/80 bg-white p-1 shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-medium transition ${
                tab === id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Contacts" value={stats?.contactsContacted} />
        <StatCard label="Bot sent" value={stats?.messagesSent} />
        <StatCard label="Received" value={stats?.messagesReceived} />
        <StatCard label="Today" value={stats?.todayInbound} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { icon: Zap, text: `${stats?.actions ?? 0} actions` },
          { icon: MessageSquare, text: `${stats?.faqs ?? 0} FAQs` },
          { icon: Users, text: `${stats?.products ?? 0} products` },
          { icon: Bot, text: stats?.enabled ? 'Live' : 'Paused' },
        ].map(({ icon: Icon, text }) => (
          <span
            key={text}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white px-3 py-1 text-[11.5px] font-medium text-zinc-600"
          >
            <Icon className="h-3 w-3 text-zinc-400" />
            {text}
          </span>
        ))}
      </div>

      {/* Compact live test */}
      <div className="mb-6 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_0_rgba(24,24,27,0.03)]">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-zinc-500" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Live test</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={`${inputCls} flex-1 font-mono`}
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+918167080111"
          />
          <input
            className={`${inputCls} flex-1`}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="hi"
          />
          <button
            type="button"
            onClick={runTest}
            disabled={testing || !testPhone.trim()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-40"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {testing ? 'Sending…' : 'Test reply'}
          </button>
        </div>
        {testResult && (
          <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3.5 py-3 text-[12.5px] text-zinc-700">
            <p className="font-medium text-zinc-900">
              {testResult.paused
                ? 'Brain is paused — message saved, no reply sent'
                : testResult.sendError
                  ? `Send error: ${testResult.sendError}`
                  : `Sent via ${testResult.matchedAction} → ${testResult.toPhone}`}
            </p>
            {testResult.reply && (
              <p className="mt-1 whitespace-pre-wrap text-zinc-600">{testResult.reply}</p>
            )}
          </div>
        )}
      </div>

      {tab === 'brain' && brain && (
        <BrainPanel
          brain={brain}
          onChange={setBrain}
          onSave={save}
          saving={saving}
          saved={saved}
          toggling={toggling}
          onToggle={toggleEnabled}
        />
      )}
      {tab === 'inbox' && <InboxPanel liveTick={liveTick} />}
    </div>
  );
}
