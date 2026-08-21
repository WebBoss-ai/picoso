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
  if (sameDay) return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
    if (!soft) setActiveId(id);
    setErr('');
    try {
      const r = await wpMarketing.getChatbotConversation(id);
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

  // Fast auto-refresh — no manual reload needed
  useEffect(() => {
    const iv = setInterval(() => {
      loadList(true);
      if (activeIdRef.current) openConvo(activeIdRef.current, true);
    }, 2500);
    return () => clearInterval(iv);
  }, [loadList, openConvo]);

  // Instant refresh when parent SSE/liveTick fires
  useEffect(() => {
    if (!liveTick) return;
    loadList(true);
    if (activeIdRef.current) openConvo(activeIdRef.current, true);
  }, [liveTick, loadList, openConvo]);

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
            <p className="text-[11.5px] text-zinc-400 mt-1">Inbox auto-updates every few seconds</p>
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
                      <span>{fmtTime(m.createdAt)}</span>
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
  const [liveTick, setLiveTick] = useState(0);

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
      if (w?.data) setWebhook(w.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not load chatbot');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live SSE + webhook status poll
  useEffect(() => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('picoso_wp_pin') : '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';
    let es;
    if (pin) {
      try {
        es = new EventSource(`${apiBase}/wp-marketing/chatbot/events?pin=${encodeURIComponent(pin)}`);
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data?.type && data.type !== 'connected') {
              setLiveTick((n) => n + 1);
              setTab('inbox');
              load();
            }
          } catch { /* ignore */ }
        };
      } catch { /* EventSource unavailable */ }
    }
    const iv = setInterval(() => {
      wpMarketing.getChatbotWebhookStatus()
        .then((r) => setWebhook(r.data))
        .catch(() => {});
    }, 5000);
    return () => {
      es?.close();
      clearInterval(iv);
    };
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

      {/* Webhook connectivity — CampaignBot POSTs here */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Inbound webhook</p>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              Our receiver is live. CampaignBot must POST <span className="font-mono text-zinc-700">incoming_message</span> events here (no register API exists on their side).
            </p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
            webhook?.lastInboundAt
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            {webhook?.lastInboundAt ? 'Receiving' : 'Waiting for inbound'}
          </span>
        </div>
        <code className="block rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11.5px] font-mono text-zinc-700 break-all">
          {webhook?.webhookUrl || 'https://picoso.in/api/webhooks/campaignbot'}
        </code>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11.5px] text-zinc-500">
          <p>Last webhook: <span className="font-mono text-zinc-800">{webhook?.lastWebhookAt ? fmtTime(webhook.lastWebhookAt) : 'never'}</span></p>
          <p>Last inbound: <span className="font-mono text-zinc-800">{webhook?.lastInboundAt ? fmtTime(webhook.lastInboundAt) : 'never'}</span></p>
          <p>Last event: <span className="font-mono text-zinc-800">{webhook?.lastEvent || '-'}</span></p>
        </div>
        {webhook?.recent?.length > 0 && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5 max-h-28 overflow-y-auto space-y-1">
            {webhook.recent.slice(0, 6).map((e) => (
              <p key={e.id} className="text-[10.5px] font-mono text-zinc-600 truncate">
                {fmtTime(e.at)} · {e.event} · {e.from || '-'} · {e.text || e.note || ''}
              </p>
            ))}
          </div>
        )}
      </div>

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
