'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Lock, LogOut, LayoutDashboard, Megaphone, Users, FileText,
  MessageCircle, BarChart3, Settings, ChevronRight, Plus, Trash2,
  Loader2, Sparkles, ArrowLeft, CheckCircle2, X, Phone,
  Search, Copy, Check, AlertCircle, Zap, Target,
  Clock, MessageSquare, TrendingUp, Send, Eye, RefreshCw,
  FlaskConical, ShieldCheck, BarChart2, Layers, Link2,
  ChevronDown, ChevronUp, Play,
  // Phase 3
  Wifi, WifiOff, ShoppingCart, DollarSign, Inbox, Repeat2,
  ListChecks, Trophy, Palette, Signal, ArrowRight,
  Activity, SortAsc, Table2, Info,
  // WhatsApp & Templates
  Upload, Image, Film, Music, FileUp, Filter, Tag, Globe,
  Hash, LayoutList, ChevronLeft, Smartphone, Bold, Type,
  AlignLeft, ExternalLink, Paperclip, MessageSquarePlus,
  ToggleLeft, ToggleRight, ClipboardList, SquareStack,
  // Scheduling & calendar
  CalendarDays, BellRing, Pencil, Ban, Edit2, Italic, HelpCircle,
} from 'lucide-react';
import { wpMarketing } from '@/lib/api';

const WP_PIN_KEY    = 'picoso_wp_pin';
const WP_CLIENT_KEY = 'picoso_wp_client';

function getPin()    { return typeof window !== 'undefined' ? sessionStorage.getItem(WP_PIN_KEY)    || '' : ''; }
function getClient() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(sessionStorage.getItem(WP_CLIENT_KEY) || 'null'); } catch { return null; }
}

/* ══════════════════════════════════════════════════════════════════════════════
   PIN GATE
══════════════════════════════════════════════════════════════════════════════ */
function PinGate({ onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const submit = useCallback(async (pin) => {
    setLoading(true);
    setError('');
    try {
      const res = await wpMarketing.verifyPin(pin);
      sessionStorage.setItem(WP_PIN_KEY, pin);
      sessionStorage.setItem(WP_CLIENT_KEY, JSON.stringify(res.data.client));
      onSuccess(res.data.client);
    } catch {
      setError('Incorrect PIN — access denied.');
      setDigits(['', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 3) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) submit(next.join(''));
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (paste.length) {
      const next = (paste + '    ').slice(0, 4).split('');
      setDigits(next.map((c) => c.trim()));
      if (paste.length === 4) submit(paste);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#1e293b 1px,transparent 1px),linear-gradient(90deg,#1e293b 1px,transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-[0_2px_48px_rgba(0,0,0,0.08)] border border-gray-100 p-10">
          {/* Logo mark */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.30)] mb-5">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">WP Marketing</h1>
            <p className="text-[13px] text-gray-400 mt-1">Enter your 4-digit access PIN</p>
          </div>

          {/* Digit inputs */}
          <div className="flex gap-3 justify-center mb-7" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                className={`w-14 h-14 text-center text-xl font-semibold rounded-xl border-2 outline-none transition-all
                  ${d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-900'}
                  focus:border-blue-500 focus:bg-blue-50 focus:ring-4 focus:ring-blue-100`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-[13px] mb-5 justify-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Loader */}
          {loading && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          )}
        </div>

        <p className="text-center text-[12px] text-gray-400 mt-5">
          Secure workspace — each client has a unique PIN
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════════════════════ */
const NAV = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
  { id: 'campaigns',  label: 'Campaigns',  icon: Megaphone },
  { id: 'contacts',   label: 'Contacts',   icon: Users },
  { id: 'templates',  label: 'Templates',  icon: FileText },
  { id: 'whatsapp',   label: 'WhatsApp',   icon: MessageCircle },
  { id: 'analytics',  label: 'Analytics',  icon: BarChart3 },
  { id: 'settings',   label: 'Settings',   icon: Settings },
];

function Sidebar({ active, setActive, client, onLogout }) {
  return (
    <aside className="w-[264px] flex-shrink-0 h-screen bg-white border-r border-slate-200/80 flex flex-col">
      <div className="px-5 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_8px_20px_rgba(37,99,235,0.28)]">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-slate-900 leading-tight tracking-tight">WP Marketing</p>
            <p className="text-[11.5px] text-slate-400 leading-tight mt-0.5 truncate">{client?.workspace?.businessName || client?.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-[10.5px] font-semibold text-slate-400 uppercase tracking-[0.16em]">Workspace</p>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium mb-0.5 transition-all
              ${active === id
                ? 'bg-blue-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.28)]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-blue-50/70'
              }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 text-[12px] font-semibold flex items-center justify-center flex-shrink-0">
            {client?.name?.[0]?.toUpperCase() || 'C'}
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-slate-900 truncate">{client?.name}</p>
            <p className="text-[11px] text-slate-400">Client workspace</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-blue-50/80',   text: 'text-blue-600',   icon: 'bg-blue-100'  },
    green:  { bg: 'bg-sky-50',       text: 'text-sky-700',    icon: 'bg-sky-100' },
    violet: { bg: 'bg-indigo-50',    text: 'text-indigo-600', icon: 'bg-indigo-100'},
    amber:  { bg: 'bg-blue-50',      text: 'text-blue-700',   icon: 'bg-blue-100' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-start gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>
      <div>
        <p className="text-[13px] text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   OVERVIEW SECTION
══════════════════════════════════════════════════════════════════════════════ */
function Overview({ client, onNavigate }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wpMarketing.getOverview()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor = {
    draft:          'bg-gray-100 text-gray-600',
    strategy_ready: 'bg-blue-100 text-blue-700',
    scheduled:      'bg-amber-100 text-amber-700',
    running:        'bg-green-100 text-green-700',
    completed:      'bg-violet-100 text-violet-700',
    paused:         'bg-orange-100 text-orange-700',
  };

  return (
    <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-gray-900">
          Good day, {client?.workspace?.businessName || client?.name}
        </h2>
        <p className="text-[13.5px] text-gray-400 mt-1">Here's what's happening in your workspace.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading overview…
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Contact Lists"    value={data?.totalLists}     icon={Users}      color="blue"   />
            <StatCard label="Total Contacts"   value={data?.totalContacts}  icon={Phone}      color="green"  sub="across all lists" />
            <StatCard label="Campaigns"        value={data?.totalCampaigns} icon={Megaphone}  color="violet" />
            <StatCard label="Active Now"       value={data?.activeCampaigns ?? 0} icon={Zap}  color="amber"  sub="running campaigns" />
          </div>

          {/* Quick actions */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => onNavigate('campaigns', 'create')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13.5px] font-medium rounded-xl shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
            <button
              onClick={() => onNavigate('contacts')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-[13.5px] font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4" />
              Manage Contacts
            </button>
          </div>

          {/* Recent campaigns */}
          {data?.recentCampaigns?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-[14px] font-semibold text-gray-900">Recent Campaigns</h3>
                <button onClick={() => onNavigate('campaigns')} className="text-[12.5px] text-blue-600 hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                {data.recentCampaigns.map((c, i) => (
                  <div
                    key={c._id}
                    className={`flex items-center gap-4 px-5 py-3.5 ${i < data.recentCampaigns.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-[12px] text-gray-400">
                        {c.contactListId?.name || 'No list selected'} · {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full ${statusColor[c.status] || 'bg-gray-100 text-gray-500'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!data?.recentCampaigns?.length && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-gray-500">No campaigns yet</p>
              <p className="text-[13px] text-gray-400 mt-1 mb-4">Create your first campaign to get started</p>
              <button
                onClick={() => onNavigate('campaigns', 'create')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Campaign
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CREATE CONTACT LIST MODAL
══════════════════════════════════════════════════════════════════════════════ */
function CreateListModal({ onClose, onCreate }) {
  const [name, setName]         = useState('');
  const [description, setDesc]  = useState('');
  const [rawText, setRawText]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const parseContacts = (text) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[\t,|]+/).map((p) => p.trim());
        const phoneRaw = parts.find((p) => /\d{7,}/.test(p.replace(/\D/g, ''))) || '';
        const phone    = phoneRaw.replace(/\D/g, '').slice(-10);
        const nameStr  = parts.find((p) => p && !/^\d/.test(p) && p !== phoneRaw) || '';
        if (!phone) return null;
        return { name: nameStr, phone };
      })
      .filter(Boolean);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please give this list a name.'); return; }
    const contacts = rawText.trim() ? parseContacts(rawText) : [];
    setLoading(true);
    setError('');
    try {
      const res = await wpMarketing.createContactList({ name, description, contacts });
      onCreate(res.data.list);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to create list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.12)] border border-gray-100 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">Create Contact List</h3>
            <p className="text-[12.5px] text-gray-400 mt-0.5">New list added to this campaign</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">List name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Repeat Customers — June"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Description</label>
            <input
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">
              Import contacts <span className="text-gray-400 font-normal">(optional — one per line)</span>
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              placeholder={`Paste contacts here:\nRahul, 9876543210\n9012345678\nPriya Sharma\t9123456789`}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-[11.5px] text-gray-400 mt-1">
              Format: Name, Phone (or just phone numbers). Commas, tabs, or pipes as separators.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-[12.5px]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13.5px] text-gray-500 hover:text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-[13.5px] font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create List
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CAMPAIGN STEP 1 — SELECT CONTACTS
══════════════════════════════════════════════════════════════════════════════ */
function CampaignStep1({ onNext, onCancel }) {
  const [lists, setLists]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [search, setSearch]         = useState('');

  const load = useCallback(() => {
    setLoading(true);
    wpMarketing.getContactLists()
      .then((r) => setLists(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = lists.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreated = (newList) => {
    setShowModal(false);
    setLists((prev) => [newList, ...prev]);
    setSelected(newList);
  };

  return (
    <>
      {showModal && <CreateListModal onClose={() => setShowModal(false)} onCreate={handleCreated} />}

      <div className="w-full">
        {/* Step header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-[11px] font-medium text-zinc-400 tracking-[0.16em] uppercase mb-1">Step 1 of 2</p>
            <h2 className="text-[22px] font-semibold text-zinc-900 tracking-tight">Audience</h2>
          </div>
        </div>

        {/* Step tracker */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[11px] font-medium flex items-center justify-center">1</span>
            <span className="text-[13px] font-medium text-zinc-900">Contacts</span>
          </div>
          <div className="flex-1 h-px bg-zinc-200" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full border border-zinc-200 text-zinc-400 text-[11px] font-medium flex items-center justify-center">2</span>
            <span className="text-[13px] text-zinc-400">Brief</span>
          </div>
        </div>

        {/* Search + new list button */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lists"
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder-zinc-400 bg-white focus:outline-none focus:border-zinc-400"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 text-zinc-800 text-[13.5px] font-medium rounded-xl hover:bg-zinc-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New list
          </button>
        </div>

        {/* List grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
            <Users className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-zinc-600 mb-1">No contact lists yet</p>
            <p className="text-[13px] text-zinc-400 mb-4">Create a list to continue</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create list
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mb-6">
            {filtered.map((list) => (
              <button
                key={list._id}
                onClick={() => setSelected(list)}
                className={`text-left p-4 rounded-2xl border transition-all
                  ${selected?._id === list._id
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-150 border-zinc-200 bg-white hover:border-zinc-400'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center mb-2.5">
                    <Users className="w-4.5 h-4.5 text-zinc-500" />
                  </div>
                  {selected?._id === list._id && (
                    <CheckCircle2 className="w-5 h-5 text-zinc-900 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[14px] font-semibold text-zinc-900 leading-tight">{list.name}</p>
                {list.description && <p className="text-[12px] text-zinc-400 mt-0.5 line-clamp-1">{list.description}</p>}
                <p className="text-[12.5px] text-zinc-400 mt-2">
                  <span className="font-medium text-zinc-700">{list.contactCount ?? list.contacts?.length ?? 0}</span> contacts
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Continue CTA */}
        <div className="flex justify-end">
          <button
            onClick={() => selected && onNext(selected)}
            disabled={!selected}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-[14px] font-medium rounded-xl hover:bg-blue-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_6px_16px_rgba(37,99,235,0.25)]"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXPERIMENT PLAN — GENERATION LOADING SCREEN
══════════════════════════════════════════════════════════════════════════════ */
const GEN_STEPS = [
  'Reading audience and brief',
  'Mapping ten creative angles',
  'Writing template bodies',
  'Setting headers and buttons',
  'Building the test schedule',
  'Configuring tracking',
  'Assembling the experiment',
];

function PlanGeneratingScreen() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)), 3800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-8">
      <div className="w-12 h-12 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-zinc-800 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-[18px] font-semibold text-zinc-900 tracking-tight">Generating experiment</p>
        <p className="text-[13px] text-zinc-400 mt-1">Ten WhatsApp templates, phased tests, tracking</p>
      </div>
      <div className="w-full max-w-xs space-y-2.5">
        {GEN_STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2.5 text-[13px] transition-all ${i <= step ? 'text-zinc-800' : 'text-zinc-300'}`}>
            {i < step ? (
              <CheckCircle2 className="w-4 h-4 text-zinc-800 flex-shrink-0" />
            ) : i === step ? (
              <Loader2 className="w-4 h-4 text-zinc-800 animate-spin flex-shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-zinc-200 flex-shrink-0" />
            )}
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXPERIMENT PLAN VIEW — FULL PLAN REVIEW BEFORE APPROVAL
══════════════════════════════════════════════════════════════════════════════ */
const VARIANT_LABELS = ['A','B','C','D','E','F','G','H','I','J'];
const PHASE_CONFIG = [
  { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
  { bg: 'bg-blue-50/80', border: 'border-blue-100', text: 'text-blue-700' },
  { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-800' },
  { bg: 'bg-blue-700', border: 'border-blue-700', text: 'text-blue-100' },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const TPL_LANGUAGES = [
  { code: 'en_US', label: 'English (US) (en_US)' },
  { code: 'en_GB', label: 'English (UK) (en_GB)' },
  { code: 'hi',    label: 'Hindi (hi)' },
];

function countTplVars(body) {
  return [...String(body || '').matchAll(/\{\{(\d+)\}\}/g)].reduce((m, x) => Math.max(m, parseInt(x[1], 10)), 0);
}

function categoryForVariantNumber(n, fallback) {
  const num = Number(n) || 0;
  if (num >= 1 && num <= 7) return 'UTILITY';
  if (num >= 8) return 'MARKETING';
  return fallback || 'MARKETING';
}

function variantToTpl(v) {
  const body = (v?.body || v?.message || '').replace(/\{\{name\}\}/gi, '{{1}}');
  const cta  = v?.cta || 'Order Now';
  const category = categoryForVariantNumber(v?.variantNumber, v?.category);
  return {
    templateName: v?.templateName || '',
    category,
    language:     v?.language || 'en_US',
    headerType:   v?.headerType || (v?.headerText ? 'TEXT' : 'NONE'),
    headerText:   v?.headerText || '',
    body,
    footerType:   v?.footerType || (v?.cta ? 'BUTTONS' : 'NONE'),
    footerText:   category === 'MARKETING' ? (v?.footerText || '') : '',
    buttons:      Array.isArray(v?.buttons) && v.buttons.length
      ? v.buttons
      : (cta ? [{ type: 'URL', text: cta, url: 'https://picoso.in' }] : []),
    copyAngle:    v?.copyAngle || '',
    offer:        v?.offer || '',
    tone:         v?.tone || '',
  };
}

function wrapFmt(body, start, end, marker) {
  const sel = body.slice(start, end);
  if (!sel) return { body: `${body}${marker}text${marker}`, caret: null };
  return { body: body.slice(0, start) + `${marker}${sel}${marker}` + body.slice(end), caret: null };
}

/* ── WhatsApp phone preview ─────────────────────────────────────────────── */
function WaPhonePreview({ tpl, businessName = 'Picoso' }) {
  const preview = (tpl.body || '')
    .replace(/\{\{1\}\}/g, 'Aarav')
    .replace(/\{\{2\}\}/g, 'TRACK')
    .replace(/\*([^*]+)\*/g, '$1');
  const buttons = tpl.footerType === 'BUTTONS' ? (tpl.buttons || []) : [];
  const vars = countTplVars(tpl.body);

  return (
    <div className="flex flex-col">
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.14em] mb-3">Live preview</p>
      <div className="relative mx-auto w-[260px] bg-[#0b141a] rounded-[2.2rem] border-[7px] border-zinc-900 shadow-[0_24px_60px_rgba(0,0,0,0.35)] overflow-hidden h-[480px] flex flex-col">
        <div className="absolute top-0 inset-x-0 h-5 bg-zinc-900 rounded-b-2xl w-28 mx-auto z-20" />
        <div className="bg-[#075e54] text-white px-3 pt-7 pb-2.5 flex items-center gap-2 shrink-0">
          <ChevronLeft className="w-4 h-4 opacity-80" />
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">{businessName.slice(0, 1)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold truncate leading-tight">{businessName}</p>
            <p className="text-[10px] text-white/70">online</p>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto p-3"
          style={{ background: '#e5ddd5 url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png) repeat' }}
        >
          <div className="max-w-[88%] bg-white rounded-lg rounded-tl-sm shadow-sm px-2.5 pt-2 pb-1.5">
            {tpl.headerType === 'TEXT' && tpl.headerText && (
              <p className="text-[12.5px] font-bold text-zinc-900 mb-1">{tpl.headerText}</p>
            )}
            {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(tpl.headerType) && (
              <div className="h-24 rounded-md bg-zinc-100 mb-2 flex items-center justify-center text-[11px] text-zinc-400 uppercase tracking-wider">
                {tpl.headerType} header
              </div>
            )}
            <p className="text-[13px] text-[#111b21] whitespace-pre-wrap leading-relaxed">
              {preview || <span className="italic text-zinc-400">[Message body]</span>}
            </p>
            {tpl.footerType === 'TEXT' && tpl.footerText && tpl.category === 'MARKETING' && (
              <p className="text-[11px] text-zinc-400 mt-1.5">{tpl.footerText}</p>
            )}
            {tpl.category === 'MARKETING' && (
              <p className="text-[11px] text-zinc-400 mt-1.5">Stop</p>
            )}
            <div className="flex justify-end items-center gap-0.5 mt-1">
              <span className="text-[10px] text-zinc-400">10:00 AM</span>
              <span className="text-[#53bdeb] text-[11px] leading-none">✓✓</span>
            </div>
            {buttons.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-zinc-100 space-y-1">
                {buttons.map((b, i) => (
                  <p key={i} className="text-center text-[12.5px] font-medium text-[#00a5f4] py-1">{b.text || 'Button'}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ['Category', tpl.category || '—'],
          ['Language', tpl.language || 'en_US'],
          ['Variables', `${vars} parameter${vars === 1 ? '' : 's'}`],
          ['Buttons', `${buttons.length} attached`],
        ].map(([k, val]) => (
          <div key={k} className="rounded-xl border border-zinc-100 bg-white px-3 py-2">
            <p className="text-[9.5px] font-semibold uppercase tracking-wider text-zinc-400">{k}</p>
            <p className="text-[12px] font-semibold text-zinc-800 truncate mt-0.5">{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Create-template form (structure of CampaignBot, premium styling) ──── */
function TemplateStudio({ tpl, onChange, readOnly }) {
  const set = (k, v) => onChange({ ...tpl, [k]: v });
  const bodyRef = useRef(null);
  const vars = countTplVars(tpl.body);
  const field = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[13.5px] text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all disabled:bg-zinc-50';
  const label = 'block text-[12px] font-medium text-zinc-600 mb-1.5';

  const addVariable = () => {
    const next = vars + 1;
    set('body', `${tpl.body || ''}${tpl.body ? ' ' : ''}{{${next}}}`);
  };

  const applyFmt = (marker) => {
    const el = bodyRef.current;
    if (!el || readOnly) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { body } = wrapFmt(tpl.body || '', start, end, marker);
    set('body', body);
  };

  const updateButton = (i, patch) => {
    const next = [...(tpl.buttons || [])];
    next[i] = { ...next[i], ...patch };
    set('buttons', next);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={label}>WhatsApp account</label>
            <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-[13.5px] font-medium text-zinc-800">Picoso Foods — +91 81670 80111</span>
            </div>
          </div>
          <div>
            <label className={label}>Template name *</label>
            <input disabled={readOnly} value={tpl.templateName || ''} onChange={(e) => set('templateName', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder="e.g. picoso_urgency_01" className={`${field} font-mono`} />
            <p className="mt-1 text-[11px] text-zinc-400">Lowercase letters, numbers, underscores</p>
          </div>
          <div>
            <label className={label}>Category *</label>
            <select disabled value={tpl.category || 'MARKETING'} className={field}>
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utility</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
            <p className="mt-1 text-[11px] text-zinc-400">
              {tpl.category === 'UTILITY'
                ? 'Variants A–G are Utility. No Stop footer.'
                : 'Variants H–J are Marketing. Stop footer is required.'}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className={label}>Language *</label>
            <select disabled={readOnly} value={tpl.language || 'en_US'} onChange={(e) => set('language', e.target.value)} className={field}>
              {TPL_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-5">
          <h4 className="text-[13px] font-semibold text-zinc-800 mb-3">Header</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Header type</label>
              <select disabled={readOnly} value={tpl.headerType || 'NONE'} onChange={(e) => set('headerType', e.target.value)} className={field}>
                <option value="NONE">None</option>
                <option value="TEXT">Text</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
              </select>
            </div>
            {tpl.headerType === 'TEXT' && (
              <div>
                <label className={label}>Header text</label>
                <input
                  disabled={readOnly}
                  maxLength={60}
                  value={tpl.headerText || ''}
                  onChange={(e) => set('headerText', e.target.value.replace(/[\u2014\u2013]/g, '-').replace(/[^A-Za-z0-9 .,'!?-]/g, ''))}
                  className={field}
                  placeholder="e.g. Today only"
                />
                <p className="mt-1 text-[11px] text-zinc-400">Letters and numbers only. No emoji or special characters.</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-semibold text-zinc-800">Body *</h4>
            {!readOnly && (
              <button type="button" onClick={addVariable} className="text-[12px] font-medium px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                Add variable
              </button>
            )}
          </div>
          <div className="mb-2 flex items-center gap-1 p-1.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <button type="button" disabled={readOnly} onClick={() => applyFmt('*')} title="Bold (*text*)" className="p-1.5 rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-800 disabled:opacity-40">
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button type="button" disabled={readOnly} onClick={() => applyFmt('_')} title="Italic (_text_)" className="p-1.5 rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-800 disabled:opacity-40">
              <Italic className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-zinc-400 pl-2 flex items-center gap-1"><HelpCircle className="w-3 h-3" /> *bold*  _italic_  {'{{1}}'} name</span>
          </div>
          <textarea
            ref={bodyRef}
            disabled={readOnly}
            value={tpl.body || ''}
            onChange={(e) => set('body', e.target.value.slice(0, 1024))}
            rows={6}
            placeholder="Enter message. Use {{1}} for the customer name."
            className={`${field} resize-none min-h-[120px]`}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[11px] text-zinc-400">{'{'}{'{1}'}{'}'} = customer name · click Add variable for more</p>
            <p className={`text-[11px] font-medium ${(tpl.body || '').length > 900 ? 'text-amber-600' : 'text-zinc-400'}`}>{(tpl.body || '').length}/1024</p>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-5">
          <h4 className="text-[13px] font-semibold text-zinc-800 mb-3">Footer</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Footer type</label>
              <select disabled={readOnly} value={tpl.footerType || 'NONE'} onChange={(e) => set('footerType', e.target.value)} className={field}>
                <option value="NONE">None</option>
                <option value="TEXT">Text</option>
                <option value="BUTTONS">Buttons</option>
              </select>
            </div>
            {tpl.footerType === 'TEXT' && tpl.category === 'MARKETING' && (
              <div>
                <label className={label}>Footer text</label>
                <input disabled={readOnly} maxLength={60} value={tpl.footerText || ''} onChange={(e) => set('footerText', e.target.value)} className={field} />
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            {tpl.category === 'MARKETING'
              ? 'CampaignBot adds a Stop footer on Marketing templates.'
              : 'Utility templates never include a Stop footer.'}
          </p>
          {tpl.footerType === 'BUTTONS' && (
            <div className="mt-3 space-y-2">
              {(tpl.buttons || []).map((b, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <select disabled={readOnly} value={b.type || 'URL'} onChange={(e) => updateButton(i, { type: e.target.value })} className={field}>
                    <option value="URL">URL</option>
                    <option value="QUICK_REPLY">Quick reply</option>
                    <option value="PHONE">Phone</option>
                  </select>
                  <input disabled={readOnly} value={b.text || ''} onChange={(e) => updateButton(i, { text: e.target.value })} placeholder="Button text" className={field} />
                  {b.type !== 'QUICK_REPLY' && (
                    <input disabled={readOnly} value={b.url || b.phone || ''} onChange={(e) => updateButton(i, b.type === 'PHONE' ? { phone: e.target.value } : { url: e.target.value })} placeholder={b.type === 'PHONE' ? 'Phone' : 'https://picoso.in'} className={field} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4">
          <WaPhonePreview tpl={tpl} />
        </div>
      </div>
    </div>
  );
}

function CampaignBotAuthPanel({ force = false }) {
  const [auth, setAuth] = useState({ phase: 'idle' });
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tick = () => {
      wpMarketing.getCbAuth()
        .then((r) => {
          const d = r.data || {};
          setAuth(d.phase ? d : (d.data || {}));
        })
        .catch(() => {});
    };
    tick();
    const t = setInterval(tick, 1500);
    return () => clearInterval(t);
  }, []);

  const phase = (force && (!auth.phase || auth.phase === 'idle' || auth.phase === 'ready'))
    ? 'phone'
    : (auth.phase || 'idle');

  if (!force && !['launching', 'phone', 'otp', 'error'].includes(auth.phase)) return null;

  const sendPhone = async () => {
    setBusy(true); setErr('');
    try {
      const r = await wpMarketing.submitCbPhone(phone);
      const d = r.data || {};
      setAuth(d.phase ? d : { ...auth, phase: 'phone', message: 'Sending OTP on CampaignBot' });
    } catch (e) { setErr(e?.response?.data?.error || 'Could not submit number'); }
    setBusy(false);
  };

  const sendOtp = async () => {
    setBusy(true); setErr('');
    try {
      const r = await wpMarketing.submitCbOtp(otp);
      const d = r.data || {};
      setAuth(d.phase ? d : { ...auth, phase: 'otp', message: 'Verifying OTP' });
    } catch (e) { setErr(e?.response?.data?.error || 'Could not submit OTP'); }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-5 space-y-4">
      <div>
        <p className="text-[14px] font-semibold text-slate-900">CampaignBot sign-in</p>
        <p className="text-[13px] text-slate-500 mt-1">
          {auth.message || 'Enter the CampaignBot mobile number, then the OTP on this page. Templates start as soon as login succeeds.'}
        </p>
        <p className="text-[12px] text-blue-700 mt-2">
          {auth.phase === 'otp' ? 'Server is waiting for the OTP.'
            : auth.phase === 'phone' ? 'Server is waiting for the mobile number.'
            : auth.phase === 'ready' ? 'Signed in. Creating templates.'
            : auth.phase === 'error' ? 'Login failed — send the number and OTP again, then Retry login.'
            : 'Keep this page open. Send the number, then the OTP.'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile"
          className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={sendPhone}
          disabled={busy || phone.length !== 10}
          className="px-4 py-2.5 bg-blue-600 text-white text-[13.5px] font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40"
        >
          {busy && auth.phase !== 'otp' ? 'Sending' : 'Send OTP'}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit OTP"
          className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] bg-white tracking-[0.2em] focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={sendOtp}
          disabled={busy || otp.length !== 6}
          className="px-4 py-2.5 bg-blue-600 text-white text-[13.5px] font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40"
        >
          {busy && auth.phase === 'otp' ? 'Verifying' : 'Verify OTP'}
        </button>
      </div>
      {phase === 'launching' && (
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Waiting for CampaignBot
        </div>
      )}
      {err && <p className="text-[12.5px] text-slate-700">{err}</p>}
    </div>
  );
}

function ExperimentPlanView({ experiment, onApprove, approving, approved, onReload }) {
  const [activeVariant, setActiveVariant] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [draftTpl, setDraftTpl] = useState(null);
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplError, setTplError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState('');

  const { plan = {}, variants = [] } = experiment;
  const phases = plan.phases || [];
  const criteria = plan.optimizationCriteria || {};

  useEffect(() => {
    if (variants[activeVariant]) setDraftTpl(variantToTpl(variants[activeVariant]));
  }, [activeVariant, experiment]);

  const anyPublishing = (variants || []).some((v) => v.waPublishStatus === 'publishing');
  const publishedCount = (variants || []).filter((v) => v.waPublishStatus === 'published').length;
  const failedCount = (variants || []).filter((v) => v.waPublishStatus === 'failed').length;
  const queuedCount = (variants || []).filter((v) => v.waPublishStatus === 'queued' || v.waPublishStatus === 'draft').length;

  useEffect(() => {
    if (!publishing && !anyPublishing && queuedCount === 0) return;
    const t = setInterval(() => { onReload?.(); }, 2500);
    return () => clearInterval(t);
  }, [publishing, anyPublishing, queuedCount, onReload]);

  useEffect(() => {
    if (!publishing) return;
    if (!variants.length) return;
    const still = variants.some((v) => v.waPublishStatus === 'publishing');
    if (!still && publishedCount + failedCount > 0) setPublishing(false);
  }, [publishing, variants, publishedCount, failedCount]);

  const handlePublish = async () => {
    if (!experiment?._id) return;
    setPublishing(true); setPublishMsg('');
    try {
      const r = await wpMarketing.publishTemplates(experiment._id);
      setPublishMsg(r.data?.message || 'Creating templates in the background. Stay on this page.');
      onReload?.();
    } catch (err) {
      setPublishMsg(err?.response?.data?.error || 'Could not start template creation');
      setPublishing(false);
    }
  };

  const copyMsg = async (i, text) => {
    await navigator.clipboard.writeText(text || '');
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const toggle = (key) => setExpandedSection((s) => (s === key ? null : key));

  const SectionHeader = ({ id, icon: Icon, title, sub }) => (
    <button
      onClick={() => toggle(id)}
      className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition-all text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-zinc-500" />
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-semibold text-zinc-900">{title}</p>
        {sub && <p className="text-[12px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      {expandedSection === id ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Approval banner */}
      {!approved ? (
        <div className="flex items-start gap-4 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-zinc-900">Review before anything is sent</p>
            <p className="text-[12.5px] text-slate-500 mt-0.5">Edit templates below. They are created on CampaignBot in the background from this page.</p>
          </div>
          <span className="text-[11px] font-medium text-zinc-500 px-2.5 py-1 rounded-full border border-zinc-200">Awaiting approval</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-zinc-800 flex-shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-zinc-900">Campaign approved</p>
            <p className="text-[12.5px] text-zinc-500">First send: {fmtDate(phases[0]?.scheduledDates?.[0])}.</p>
          </div>
        </div>
      )}

      {/* Title + objective */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <p className="text-[11px] font-medium text-zinc-400 tracking-[0.16em] uppercase mb-2">Experiment</p>
        <h3 className="text-[22px] font-semibold text-zinc-900 tracking-tight leading-snug">{plan.experimentTitle || 'Campaign experiment'}</h3>
        <p className="text-[14px] text-zinc-500 mt-2 leading-relaxed">{plan.objective}</p>
        {plan.reasoning && (
          <p className="text-[13px] text-zinc-400 mt-4 leading-relaxed border-t border-zinc-100 pt-4">{plan.reasoning}</p>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Audience', value: plan.totalAudience || '—', sub: 'contacts' },
          { label: 'Templates', value: '10', sub: 'variants' },
          { label: 'Phases', value: '4', sub: '10 to 5 to 3 to 1' },
          { label: 'Horizon', value: '22d', sub: 'then winner' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="p-4 rounded-2xl bg-white border border-zinc-200">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em]">{label}</p>
            <p className="text-[22px] font-semibold text-zinc-900 mt-1 tracking-tight">{value}</p>
            <p className="text-[12px] text-zinc-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Experiment Progression ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5">
        <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.14em] mb-4">Progression</p>
        <div className="flex items-stretch gap-2">
          {phases.map((ph, i) => {
            const scheduleDates = ph.scheduledDates || [];
            const isFinal = i === phases.length - 1;
            return (
              <div key={ph.phaseNumber} className="flex items-stretch gap-2 flex-1">
                <div className={`flex-1 rounded-xl border ${isFinal ? 'border-blue-700 bg-blue-700' : 'border-blue-100 bg-blue-50/70'} p-3.5`}>
                  <span className={`text-[10.5px] font-medium uppercase tracking-wider ${isFinal ? 'text-blue-200' : 'text-blue-500'}`}>{ph.label}</span>
                  <p className={`text-[13px] font-semibold mt-1 ${isFinal ? 'text-white' : 'text-slate-900'}`}>
                    {ph.variantCount} template{ph.variantCount > 1 ? 's' : ''}
                  </p>
                  <p className={`text-[12px] mt-0.5 ${isFinal ? 'text-blue-100' : 'text-slate-500'}`}>{ph.contactsPerVariant} contacts each</p>
                  {scheduleDates.length > 0 && (
                    <p className={`text-[11px] mt-2 ${isFinal ? 'text-blue-200/80' : 'text-slate-400'}`}>
                      {scheduleDates.map(fmtDate).join(' · ')}
                    </p>
                  )}
                  {isFinal && <p className="text-[11px] font-medium text-blue-100 mt-1 flex items-center gap-1"><Trophy className="w-3 h-3" /> Winner to remaining audience</p>}
                </div>
                {i < phases.length - 1 && (
                  <div className="flex items-center justify-center w-6 flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[12px] text-zinc-400 mt-4 leading-relaxed">{criteria.progressionLogic}</p>
      </div>

      {/* ── Testing Timeline ────────────────────────────────────── */}
      <SectionHeader id="timeline" icon={Clock} title="Testing Timeline" sub="6-day alternate-day schedule across 4 phases" />
      {expandedSection === 'timeline' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 -mt-2">
          <div className="overflow-x-auto">
            <div className="flex gap-1.5 min-w-max pb-2">
              {Array.from({ length: 23 }, (_, i) => {
                const dayNum = i + 1;
                let phaseIdx = null;
                let isSendDay = false;
                let isEval = false;

                phases.forEach((ph, pIdx) => {
                  (ph.scheduledDates || []).forEach((d) => {
                    const diff = Math.round((new Date(d) - new Date(phases[0]?.scheduledDates?.[0] || Date.now())) / 86400000) + 1;
                    if (diff === dayNum) { phaseIdx = pIdx; isSendDay = true; }
                  });
                });

                if ([6, 13, 20].includes(dayNum)) isEval = true;
                if (dayNum === 22) { phaseIdx = 3; isSendDay = true; }

                const cfg = phaseIdx !== null ? PHASE_CONFIG[phaseIdx] : null;

                return (
                  <div key={dayNum} className="flex flex-col items-center gap-1 w-[38px]">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold
                      ${isSendDay && cfg ? `${cfg.bg} border ${cfg.border} ${cfg.text}` :
                        isEval ? 'bg-gray-100 border border-gray-200 text-gray-500' :
                        'bg-gray-50 text-gray-300'}`}
                    >
                      {isSendDay ? <Send className="w-3.5 h-3.5" /> : isEval ? <BarChart2 className="w-3 h-3" /> : dayNum}
                    </div>
                    <span className="text-[9px] text-gray-400">D{dayNum}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-4 mt-3 flex-wrap">
            {PHASE_CONFIG.slice(0, 4).map((cfg, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${cfg.bg} border ${cfg.border}`} />
                <span className="text-[11.5px] text-gray-500">Phase {i + 1}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
              <span className="text-[11.5px] text-gray-500">Evaluate</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 10 Campaign Variants as WhatsApp templates ─────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 gap-3 flex-wrap">
          <div>
            <p className="text-[14px] font-semibold text-zinc-900">Templates</p>
            <p className="text-[12px] text-slate-400 mt-0.5">Created on CampaignBot from the server. Stay on this page.</p>
          </div>
          <div className="flex items-center gap-2">
            {publishedCount > 0 && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{publishedCount} live</span>
            )}
            {failedCount > 0 && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200 text-slate-600">{failedCount} failed</span>
            )}
            <button
              onClick={handlePublish}
              disabled={publishing && !anyPublishing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-[12.5px] font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-[0_4px_14px_rgba(37,99,235,0.25)]"
            >
              {(publishing || anyPublishing) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              {(publishing || anyPublishing) ? 'Retry login' : failedCount ? 'Retry failed' : 'Create templates'}
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 space-y-3">
          {(anyPublishing || queuedCount > 0 || publishing) && (
            <CampaignBotAuthPanel force />
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-slate-600">
              {anyPublishing || queuedCount
                ? 'Enter the CampaignBot number and OTP in the sign-in card above, then stay on this page. Templates start as soon as login succeeds.'
                : publishedCount === (variants || []).length && (variants || []).length
                  ? 'All templates are live on CampaignBot.'
                  : 'Templates are created automatically after generation. Progress appears below.'}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(variants || []).map((v, i) => {
              const st = v.waPublishStatus || 'queued';
              return (
                <div key={v.variantNumber || i} className="rounded-xl bg-white border border-slate-100 px-3 py-2">
                  <p className="text-[11px] text-slate-400">{v.label || `Var ${VARIANT_LABELS[i]}`}</p>
                  <p className="text-[12px] font-medium text-slate-800 capitalize mt-0.5">
                    {st === 'publishing' ? 'Creating' : st === 'queued' || st === 'draft' ? 'Queued' : st}
                  </p>
                </div>
              );
            })}
          </div>
          {publishMsg && <p className="text-[12.5px] text-slate-500">{publishMsg}</p>}
          {variants[activeVariant]?.waPublishError && (
            <p className="text-[12.5px] text-slate-700">{variants[activeVariant].waPublishError}</p>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
          {variants.map((v, i) => (
            <button
              key={v.variantNumber || i}
              onClick={() => setActiveVariant(i)}
              className={`flex-shrink-0 px-4 py-2.5 text-[12.5px] font-semibold border-b-2 transition-all flex items-center gap-1.5
                ${activeVariant === i
                  ? 'border-zinc-900 text-zinc-900 bg-zinc-50'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              {v.label || `Var ${VARIANT_LABELS[i]}`}
              {v.waPublishStatus === 'published' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              {v.waPublishStatus === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
              {v.waPublishStatus === 'queued' && <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />}
              {v.waPublishStatus === 'publishing' && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            </button>
          ))}
        </div>

        {variants[activeVariant] && draftTpl && (
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-zinc-900 text-white px-3 py-1 rounded-full">
                {variants[activeVariant].copyAngle}
              </span>
              {variants[activeVariant].tone && (
                <span className="text-[12px] text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">{variants[activeVariant].tone}</span>
              )}
              {variants[activeVariant].offer && (
                <span className="text-[12px] text-zinc-600 bg-zinc-100 px-3 py-1 rounded-full">{variants[activeVariant].offer}</span>
              )}
            </div>
            <TemplateStudio
              tpl={draftTpl}
              onChange={setDraftTpl}
              readOnly={!!approved}
            />
            {!approved && experiment?._id && (
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100">
                {tplError && <p className="text-[12.5px] text-red-600 mr-auto">{tplError}</p>}
                <button
                  onClick={async () => {
                    setSavingTpl(true); setTplError('');
                    try {
                      await wpMarketing.updateVariant(experiment._id, variants[activeVariant].variantNumber, {
                        ...draftTpl,
                        message: draftTpl.body,
                        cta: draftTpl.buttons?.[0]?.text || variants[activeVariant].cta,
                      });
                    } catch (err) {
                      setTplError(err?.response?.data?.error || 'Could not save template');
                    }
                    setSavingTpl(false);
                  }}
                  disabled={savingTpl}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingTpl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save template
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <SectionHeader
        id="signals"
        icon={BarChart2}
        title="Performance signals"
        sub={`Primary: ${criteria.primaryMetric || 'conversions'} — ${(criteria.signals || []).length} metrics`}
      />
      {expandedSection === 'signals' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 -mt-2 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(criteria.signals || []).map((s) => {
              const labels = {
                delivery_rate:   [Inbox,        'Delivery rate',    'Message reached recipient'],
                read_rate:       [Eye,           'Read rate',        'Recipient opened the message'],
                link_click_rate: [Link2,         'Link click rate',  'Total link interactions'],
                unique_clicks:   [Target,        'Unique clicks',    'Distinct recipients who clicked'],
                repeat_clicks:   [Repeat2,       'Repeat clicks',    'Same person clicking multiple times'],
                replies:         [MessageSquare, 'Replies',          'Customer responded to message'],
                conversions:     [ShoppingCart,  'Conversions',      'Placed an order after receiving message'],
                revenue:         [DollarSign,    'Revenue',          'Order value attributed to this variant'],
              };
              const [IconComp, label, desc] = labels[s] || [BarChart2, s, ''];
              return (
                <div key={s} className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <IconComp className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-medium text-zinc-800">{label}</p>
                    <p className="text-[11.5px] text-zinc-400">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.12em] mb-1">Progression</p>
            <p className="text-[13px] text-zinc-700">{criteria.progressionLogic}</p>
          </div>
        </div>
      )}

      <SectionHeader
        id="tracking"
        icon={Link2}
        title="Tracking links"
        sub="Each contact gets a personalised tracked URL"
      />
      {expandedSection === 'tracking' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 -mt-2 space-y-3">
          <p className="text-[13.5px] text-zinc-600 leading-relaxed">{plan.trackingExplanation}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Customer identity', 'Each link is tied to a specific phone number'],
              ['Variant attribution', 'Click tells us exactly which message they received'],
              ['Repeat detection', 'Second and later clicks flagged as repeat vs unique'],
              ['Conversion tracking', 'Downstream orders linked back to the campaign'],
            ].map(([t, d]) => (
              <div key={t} className="flex items-start gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <CheckCircle2 className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12.5px] font-medium text-zinc-800">{t}</p>
                  <p className="text-[11.5px] text-zinc-400">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-zinc-900 rounded-xl">
            <p className="text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-[0.12em]">Example format</p>
            <code className="text-[12.5px] text-zinc-200 font-mono">https://picoso.in/api/t/a3f9c12e</code>
            <p className="text-[11px] text-zinc-500 mt-1">Redirects to your URL while recording the click</p>
          </div>
        </div>
      )}

      {/* ── Confirm & Start ─────────────────────────────────────── */}
      {!approved && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
          <div className="space-y-2">
            {[
              'Ten WhatsApp templates generated',
              'Four-phase test (10 to 5 to 3 to 1)',
              'Alternate-day schedule over 22 days',
              'Unique tracking links per contact',
              'Optimised for conversions and revenue',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-[13.5px] text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-zinc-400">
            After confirming, run each phase from the campaign dashboard. Nothing is sent until you start a phase.
          </p>
          <button
            onClick={onApprove}
            disabled={approving}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-blue-600 text-white text-[14px] font-medium rounded-xl hover:bg-blue-700 transition-all disabled:opacity-60 shadow-[0_8px_20px_rgba(37,99,235,0.28)]"
          >
            {approving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Confirming</>
            ) : (
              <><Play className="w-4 h-4" /> Confirm campaign</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CAMPAIGN STEP 2 — CONTEXT → EXPERIMENT PLAN
══════════════════════════════════════════════════════════════════════════════ */
function CampaignStep2({ selectedList, onBack, onDraftSaved }) {
  const [name, setName]             = useState('');
  const [context, setContext]       = useState('');
  const [generating, setGenerating] = useState(false);
  const [experiment, setExperiment] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [error, setError]           = useState('');
  const [approving, setApproving]   = useState(false);
  const [approved, setApproved]     = useState(false);

  const examplePrompts = [
    'These are our repeat customers and we want to encourage them to order again.',
    "First-time buyers who ordered last month but haven't returned.",
    'Premium customers — share an exclusive offer to reward their loyalty.',
    'Festival season is coming — announce a special seasonal menu.',
  ];

  const generatePlan = async () => {
    if (!context.trim()) { setError('Please describe your campaign goal above.'); return; }
    setError('');
    setGenerating(true);
    setExperiment(null);
    try {
      let id = campaignId;
      if (!id) {
        const res = await wpMarketing.createCampaign({
          name: name.trim() || `Campaign — ${selectedList.name}`,
          contactListId: selectedList._id,
          context,
        });
        id = res.data.campaign._id;
        setCampaignId(id);
      } else {
        await wpMarketing.updateCampaign(id, {
          name: name.trim() || `Campaign — ${selectedList.name}`,
          contactListId: selectedList._id,
          context,
        });
      }
      const res = await wpMarketing.generatePlan(id);
      setExperiment(res.data.experiment);
    } catch (e) {
      setError(e?.response?.data?.error || 'Plan generation failed — please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const approvePlan = async () => {
    if (!campaignId) return;
    setApproving(true);
    try {
      const res = await wpMarketing.approvePlan(campaignId);
      setExperiment(res.data.experiment);
      setApproved(true);
      setTimeout(() => onDraftSaved(), 2000);
    } catch (e) {
      setError(e?.response?.data?.error || 'Approval failed');
      setApproving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          disabled={generating || approved}
          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-colors disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-[11px] font-medium text-zinc-400 tracking-[0.16em] uppercase mb-1">Step 2 of 2</p>
          <h2 className="text-[22px] font-semibold text-zinc-900 tracking-tight">
            {experiment ? 'Experiment plan' : 'Campaign brief'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[11px] font-medium flex items-center justify-center">
            <Check className="w-3 h-3" />
          </span>
          <span className="text-[13px] text-zinc-400">Contacts</span>
        </div>
        <div className="flex-1 h-px bg-zinc-200" />
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[11px] font-medium flex items-center justify-center">2</span>
          <span className="text-[13px] font-medium text-zinc-900">Brief</span>
        </div>
      </div>

      {generating ? (
        <PlanGeneratingScreen />
      ) : experiment ? (
        <div>
          {!approved && (
            <button
              onClick={() => { setExperiment(null); setGenerating(false); }}
              className="flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-zinc-700 mb-4 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Edit brief and regenerate
            </button>
          )}
          {error && (
            <div className="flex items-center gap-2 text-zinc-700 text-[13px] mb-4 p-3 rounded-xl border border-zinc-200 bg-zinc-50">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <ExperimentPlanView
            experiment={experiment}
            onApprove={approvePlan}
            approving={approving}
            approved={approved}
            onReload={async () => {
              if (!campaignId) return;
              const r = await wpMarketing.getPlan(campaignId);
              setExperiment(r.data);
            }}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-6 p-4 bg-white rounded-2xl border border-zinc-200">
            <Users className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <span className="text-[13.5px] font-medium text-zinc-900">{selectedList.name}</span>
            <span className="text-[12px] text-zinc-400">
              {selectedList.contactCount ?? selectedList.contacts?.length ?? 0} contacts
            </span>
          </div>

          <div className="mb-4">
            <label className="block text-[12.5px] font-medium text-zinc-700 mb-1.5">Campaign name <span className="text-zinc-400 font-normal">(optional)</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Campaign — ${selectedList.name}`}
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-zinc-900 placeholder-zinc-400 bg-white focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="mb-5">
            <label className="block text-[13px] font-medium text-zinc-900 mb-1">Campaign goal</label>
            <p className="text-[12.5px] text-zinc-400 mb-3">
              Describe the audience and what you want them to do. Ten templates, a test schedule, and tracking are generated from this.
            </p>
            <textarea
              value={context}
              onChange={(e) => { setContext(e.target.value); setError(''); }}
              rows={5}
              placeholder="e.g. These are repeat customers. It has been two to three weeks since most last ordered. Offer 10 percent off to come back."
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-[14px] text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 resize-none leading-relaxed"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {examplePrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => { setContext(p); setError(''); }}
                  className="text-[11.5px] text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  {p.slice(0, 50)}…
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-zinc-700 text-[13px] mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={generatePlan}
            disabled={!context.trim()}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-blue-600 text-white text-[14px] font-medium rounded-xl hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(37,99,235,0.28)]"
          >
            Generate experiment
          </button>
          <p className="text-center text-[12px] text-slate-400 mt-3">Ten templates are created on CampaignBot in the background. Stay on this page.</p>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CAMPAIGNS SECTION
══════════════════════════════════════════════════════════════════════════════ */
function CampaignsSection({ initialView }) {
  const [view, setView]         = useState(initialView || 'list');
  const [step, setStep]         = useState(1);
  const [selectedList, setSel]  = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [dashCampaignId, setDashCampaignId] = useState(null);

  const loadCampaigns = useCallback(() => {
    setLoading(true);
    wpMarketing.getCampaigns()
      .then((r) => setCampaigns(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view === 'list') loadCampaigns();
  }, [view, loadCampaigns]);

  useEffect(() => {
    if (initialView === 'create') setView('create');
  }, [initialView]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign draft?')) return;
    setDeleting(id);
    try {
      await wpMarketing.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c._id !== id));
    } catch {}
    setDeleting(null);
  };

  const statusBadge = {
    draft:          'bg-gray-100 text-gray-600',
    strategy_ready: 'bg-blue-100 text-blue-700',
    scheduled:      'bg-amber-100 text-amber-700',
    running:        'bg-green-100 text-green-700',
    completed:      'bg-violet-100 text-violet-700',
    paused:         'bg-orange-100 text-orange-700',
  };

  if (view === 'dashboard' && dashCampaignId) {
    return (
      <CampaignDashboard
        campaignId={dashCampaignId}
        onBack={() => { setView('list'); setDashCampaignId(null); }}
      />
    );
  }

  if (view === 'create') {
    if (step === 1) {
      return (
        <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
          <CampaignStep1
            onNext={(list) => { setSel(list); setStep(2); }}
            onCancel={() => { setView('list'); setStep(1); }}
          />
        </div>
      );
    }
    return (
      <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
        <CampaignStep2
          selectedList={selectedList}
          onBack={() => setStep(1)}
          onDraftSaved={() => { setView('list'); setStep(1); setSel(null); }}
        />
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Campaigns</h2>
          <p className="text-[13.5px] text-gray-400 mt-0.5">Manage your WhatsApp campaign drafts</p>
        </div>
        <button
          onClick={() => { setView('create'); setStep(1); setSel(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13.5px] font-semibold rounded-xl shadow-[0_2px_8px_rgba(37,99,235,0.20)] hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-gray-500 mb-1">No campaigns yet</p>
          <p className="text-[13.5px] text-gray-400 mb-5">Create your first AI-powered campaign in 2 simple steps</p>
          <button
            onClick={() => { setView('create'); setStep(1); setSel(null); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">Campaign</th>
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">Contact List</th>
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr key={c._id} className={`${i < campaigns.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}>
                  <td className="px-5 py-3.5">
                    <p className="text-[13.5px] font-semibold text-gray-900">{c.name}</p>
                    {c.context && <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-1">{c.context.slice(0, 60)}…</p>}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-gray-600">
                    {c.contactListId?.name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full ${statusBadge[c.status] || 'bg-gray-100 text-gray-500'}`}>
                      {c.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[12.5px] text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      {['scheduled', 'running', 'completed'].includes(c.status) && (
                        <button
                          onClick={() => { setDashCampaignId(c._id); setView('dashboard'); }}
                          className="px-3 py-1.5 text-[12px] font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Activity className="w-3 h-3" />
                          Dashboard
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c._id)}
                        disabled={deleting === c._id}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        {deleting === c._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CONTACTS SECTION
══════════════════════════════════════════════════════════════════════════════ */
function ContactsSection() {
  const [lists, setLists]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    wpMarketing.getContactLists()
      .then((r) => setLists(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact list?')) return;
    setDeleting(id);
    try {
      await wpMarketing.deleteContactList(id);
      setLists((prev) => prev.filter((l) => l._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch {}
    setDeleting(null);
  };

  return (
    <>
      {showModal && (
        <CreateListModal
          onClose={() => setShowModal(false)}
          onCreate={(list) => { setShowModal(false); setLists((p) => [list, ...p]); }}
        />
      )}

      <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contacts</h2>
            <p className="text-[13.5px] text-gray-400 mt-0.5">Manage your contact lists and audiences</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13.5px] font-semibold rounded-xl shadow-[0_2px_8px_rgba(37,99,235,0.20)] hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New List
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
        ) : (
          <div className="flex gap-6 min-h-[calc(100vh-9rem)]">
            {/* Lists column */}
            <div className="w-80 flex-shrink-0 overflow-y-auto pr-1">
              {lists.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-[13.5px] font-medium text-gray-400 mb-3">No lists yet</p>
                  <button onClick={() => setShowModal(true)} className="text-[13px] text-blue-600 font-medium hover:underline">
                    Create your first list
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div
                      key={list._id}
                      onClick={() => setSelected(list)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border-2 transition-all
                        ${selected?._id === list._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-transparent bg-white hover:border-gray-200'
                        }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-gray-900 truncate">{list.name}</p>
                        <p className="text-[12px] text-gray-400">{list.contactCount ?? list.contacts?.length ?? 0} contacts</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(list._id); }}
                        disabled={deleting === list._id}
                        className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        {deleting === list._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto">
              {!selected ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center h-full flex flex-col items-center justify-center">
                  <Eye className="w-8 h-8 text-gray-200 mb-3" />
                  <p className="text-[14px] font-medium text-gray-400">Select a list to see contacts</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-[14.5px] font-semibold text-gray-900">{selected.name}</h3>
                      {selected.description && <p className="text-[12px] text-gray-400 mt-0.5">{selected.description}</p>}
                    </div>
                    <span className="text-[12.5px] font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {selected.contactCount ?? selected.contacts?.length ?? 0} contacts
                    </span>
                  </div>
                  {(selected.contacts?.length === 0 || !selected.contacts) ? (
                    <div className="p-10 text-center text-gray-400 text-[13.5px]">
                      No contacts in this list yet.
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      {selected.contacts.slice(0, 50).map((c, i) => (
                        <div key={c._id || i} className={`flex items-center gap-3 px-5 py-3 ${i < selected.contacts.length - 1 ? 'border-b border-gray-50' : ''}`}>
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-[12px] font-semibold flex items-center justify-center flex-shrink-0">
                            {c.name?.[0]?.toUpperCase() || '#'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-medium text-gray-900">{c.name || <span className="text-gray-400">—</span>}</p>
                            <p className="text-[12px] text-gray-400 font-mono">{c.phone}</p>
                          </div>
                          {c.orderCount > 0 && (
                            <span className="text-[11.5px] text-gray-400">{c.orderCount} orders</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CAMPAIGN EXECUTION DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */

function MetricCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    violet: 'bg-violet-50 text-violet-700',
    amber:  'bg-amber-50 text-amber-700',
    rose:   'bg-rose-50 text-rose-700',
    teal:   'bg-teal-50 text-teal-700',
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <p className="text-[11.5px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-[12px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

function VariantRow({ v, rank, onEdit }) {
  const statusColors = { active: 'text-blue-600', top5: 'text-amber-600', top3: 'text-violet-600', winner: 'text-green-600', eliminated: 'text-gray-400' };
  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
      <td className="px-4 py-3 text-[13px] text-gray-400 font-mono">#{rank}</td>
      <td className="px-4 py-3">
        <p className="text-[13px] font-semibold text-gray-900">{v.label}</p>
        <p className="text-[11.5px] text-gray-400">{v.copyAngle}</p>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-[11.5px] font-semibold capitalize ${statusColors[v.status] || 'text-gray-500'}`}>{v.status}</span>
      </td>
      <td className="px-4 py-3 text-center text-[13px] text-gray-700">{v.sent}</td>
      <td className="px-4 py-3 text-center text-[13px] text-gray-700">{v.deliveryRate}%</td>
      <td className="px-4 py-3 text-center text-[13px] text-gray-700">{v.readRate}%</td>
      <td className="px-4 py-3 text-center text-[13px] text-gray-700">{v.clickRate}%</td>
      <td className="px-4 py-3 text-center text-[13px] text-gray-700">{v.conversionRate}%</td>
      <td className="px-4 py-3 text-center text-[13px] font-semibold text-gray-800">
        {v.revenue > 0 ? `₹${v.revenue.toLocaleString('en-IN')}` : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        {onEdit && (
          <button onClick={() => onEdit(v)} className="text-[12px] text-blue-600 hover:text-blue-800 font-medium">
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

function VariantEditModal({ variant, experimentId, onClose, onSaved }) {
  const [tpl, setTpl] = useState(() => variantToTpl(variant));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await wpMarketing.updateVariant(experimentId, variant.variantNumber, {
        ...tpl,
        message: tpl.body,
        cta: tpl.buttons?.[0]?.text || variant.cta,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h3 className="text-[16px] font-semibold text-zinc-900">Create template — {variant.label}</h3>
            <p className="text-[12px] text-zinc-400 mt-0.5">{variant.copyAngle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <TemplateStudio tpl={tpl} onChange={setTpl} />
          {error && <p className="text-[13px] text-red-600 mt-3">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-[13px] font-semibold rounded-xl disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save template
          </button>
        </div>
      </div>
    </div>
  );
}

const PHASE_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

function PhasePanel({ phase, phaseIndex, runs, scheduledJobs, experimentId, experimentStatus, templateConfig, onRefresh }) {
  const [analyzing,   setAnalyzing]   = useState(false);
  const [advancing,   setAdvancing]   = useState(false);
  const [approving,   setApproving]   = useState(false);
  const [starting,    setStarting]    = useState(false);
  const [execError,   setExecError]   = useState('');
  const [analysis,    setAnalysis]    = useState(null);
  const [showStartForm, setShowStartForm] = useState(false);
  const [destUrl, setDestUrl] = useState(templateConfig?.destinationUrl || 'https://picoso.in');

  // Per-run schedule state: [{runNumber, date, time, sendNow}]
  const [runSchedules, setRunSchedules] = useState([]);
  // Editing a job's time
  const [editingJobId, setEditingJobId] = useState(null);
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    if (templateConfig?.destinationUrl) setDestUrl(templateConfig.destinationUrl);
  }, [templateConfig]);

  // Build default run schedules when the form opens
  useEffect(() => {
    if (!showStartForm) return;
    const now = new Date();
    const schedules = [];
    for (let r = 1; r <= phase.rounds; r++) {
      const base = phase.scheduledDates?.[r - 1];
      let dt;
      if (base) {
        dt = new Date(base);
      } else {
        dt = new Date(now);
        dt.setDate(dt.getDate() + (r - 1) * 2);
      }
      dt.setHours(10, 0, 0, 0);
      const pad = (n) => String(n).padStart(2, '0');
      schedules.push({
        runNumber: r,
        date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
        time: '10:00',
        sendNow: r === 1,
      });
    }
    setRunSchedules(schedules);
  }, [showStartForm, phase]);

  const phaseRuns  = (runs || []).filter((r) => r.phaseNumber === phase.phaseNumber);
  const phaseJobs  = (scheduledJobs || []).filter((j) => j.phaseNumber === phase.phaseNumber);
  const completedRuns = phaseRuns.filter((r) => ['completed', 'analyzed'].includes(r.status));
  const hasAnalysis   = phaseRuns.some((r) => r.aiAnalysis?.advancedVariants?.length);
  const latestRun     = phaseRuns[phaseRuns.length - 1];
  const latestAnalysis = latestRun?.aiAnalysis;

  const isPending   = phase.status === 'pending';
  const isRunning   = phase.status === 'running';
  const isCompleted = phase.status === 'completed';
  const isStarted   = phaseJobs.filter((j) => j.status !== 'cancelled').length > 0;

  const canApprove  = isPending && !['completed', 'awaiting_approval'].includes(experimentStatus);
  const canStart    = isRunning && !isStarted;
  const canAnalyze  = isRunning && isStarted && completedRuns.length >= phase.rounds && !hasAnalysis;
  const canAdvance  = hasAnalysis && isRunning;

  // Handlers
  const handleApprove = async () => {
    setApproving(true); setExecError('');
    try {
      await wpMarketing.approvePhase(experimentId, { phaseNumber: phase.phaseNumber });
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Phase approval failed');
    }
    setApproving(false);
  };

  const handleStart = async () => {
    setStarting(true); setExecError('');
    try {
      const schedules = runSchedules.map((s) => ({
        runNumber:   s.runNumber,
        scheduledAt: new Date(`${s.date}T${s.time}:00`).toISOString(),
        sendNow:     s.runNumber === 1 && s.sendNow,
      }));
      await wpMarketing.startPhase(experimentId, {
        phaseNumber:    phase.phaseNumber,
        runSchedules:   schedules,
        templateConfig: { destinationUrl: destUrl },
      });
      setShowStartForm(false);
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Failed to start phase');
    }
    setStarting(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true); setExecError('');
    try {
      const r = await wpMarketing.analyzeRun(experimentId, { phaseNumber: phase.phaseNumber });
      setAnalysis(r.data.analysis);
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Analysis failed');
    }
    setAnalyzing(false);
  };

  const handleAdvance = async () => {
    const src = latestAnalysis || analysis;
    if (!src) return;
    setAdvancing(true); setExecError('');
    try {
      await wpMarketing.advancePhase(experimentId, {
        advancedNums:   src.advancedVariants || src.advancedNums,
        eliminatedNums: src.eliminatedVariants || src.eliminatedNums,
        nextCount:      (src.advancedVariants || src.advancedNums)?.length || 1,
      });
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Advancement failed');
    }
    setAdvancing(false);
  };

  const handleCancelJob = async (jobId) => {
    setExecError('');
    try {
      await wpMarketing.cancelJob(jobId);
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Cancel failed');
    }
  };

  const handleSaveJobTime = async (jobId) => {
    setExecError('');
    try {
      const [date, time] = editTime.split('T');
      const iso = new Date(`${date}T${time || '10:00'}:00`).toISOString();
      await wpMarketing.updateJobTime(jobId, { scheduledAt: iso });
      setEditingJobId(null);
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Reschedule failed');
    }
  };

  // Badge helpers
  const statusBadge = { pending: 'bg-gray-100 text-gray-500', running: 'bg-amber-100 text-amber-700', completed: 'bg-green-100 text-green-700' };
  const jobBadge    = { pending: 'bg-zinc-100 text-zinc-500', running: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-600', cancelled: 'bg-gray-100 text-gray-400' };
  const phaseColor  = PHASE_COLORS[phaseIndex % PHASE_COLORS.length];

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${isRunning ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'}`}>
      {/* Colour bar */}
      <div className="h-1 w-full" style={{ backgroundColor: phaseColor, opacity: isCompleted ? 0.35 : 1 }} />

      {/* Phase header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <p className="text-[14px] font-semibold text-gray-900">{phase.label}</p>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {phase.variantCount} variant template{phase.variantCount !== 1 ? 's' : ''} ·
            {' '}{phase.contactsPerVariant} contacts/variant · {phase.rounds} run{phase.rounds > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
            {completedRuns.length}/{phase.rounds} runs
          </span>
          <span className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full ${statusBadge[phase.status] || 'bg-gray-100 text-gray-500'}`}>
            {phase.status}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* ─── Scheduled jobs timeline ─────────────────────────────── */}
        {isStarted && (
          <div className="space-y-2">
            {phaseJobs.filter((j) => j.status !== 'cancelled').map((job) => {
              const run = phaseRuns.find((r) => r.runNumber === job.runNumber);
              const jobDt = new Date(job.scheduledAt);
              const fmtDate = jobDt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              const fmtTime = jobDt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              const isEditing = editingJobId === job._id;
              return (
                <div key={job._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="mt-0.5 flex-shrink-0">
                    {job.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : job.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : job.status === 'running' ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-gray-800">Run {job.runNumber}</p>
                      <span className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded-full ${jobBadge[job.status]}`}>{job.status}</span>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="datetime-local"
                          defaultValue={jobDt.toISOString().slice(0, 16)}
                          onChange={(e) => setEditTime(e.target.value.replace('T', 'T').replace(/:\d{2}$/, ''))}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button onClick={() => handleSaveJobTime(job._id)} className="text-[12px] text-blue-600 font-medium hover:text-blue-800">Save</button>
                        <button onClick={() => setEditingJobId(null)} className="text-[12px] text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        {fmtDate} · {fmtTime}
                        {run?.metrics?.sent > 0 && ` · ${run.metrics.sent} sent`}
                      </p>
                    )}
                    {job.status === 'failed' && job.error && (
                      <p className="text-[11.5px] text-red-500 mt-1">{job.error}</p>
                    )}
                    {run?.aiAnalysis?.summary && (
                      <div className="mt-2 p-2.5 bg-blue-50 rounded-lg">
                        <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1">AI Analysis</p>
                        <p className="text-[12px] text-gray-700 leading-relaxed">{run.aiAnalysis.summary}</p>
                      </div>
                    )}
                  </div>
                  {job.status === 'pending' && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingJobId(job._id); setEditTime(jobDt.toISOString().slice(0, 16)); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Reschedule"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCancelJob(job._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Cancel run"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Run metrics (completed runs without scheduled jobs) ── */}
        {phaseRuns.filter((r) => !phaseJobs.find((j) => j.runNumber === r.runNumber)).map((run) => (
          <div key={run._id} className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-gray-800">Run {run.runNumber}</p>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${run.status === 'analyzed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{run.status}</span>
            </div>
            {run.metrics?.sent > 0 && (
              <div className="grid grid-cols-4 gap-2 text-center mt-3">
                {[['Sent', run.metrics.sent], ['Delivered', run.metrics.delivered], ['Read', run.metrics.read], ['Conversions', run.metrics.conversions]].map(([l, v]) => (
                  <div key={l} className="bg-white rounded-lg px-2 py-1.5">
                    <p className="text-[10px] text-gray-400">{l}</p>
                    <p className="text-[14px] font-bold text-gray-800">{v || 0}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ─── One-click start form ─────────────────────────────────── */}
        {canStart && showStartForm && (
          <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/40 space-y-4">
            <p className="text-[13px] font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              Schedule all {phase.rounds} runs at once
            </p>

            <p className="text-[11.5px] text-zinc-500">
              Contacts are split across this phase&apos;s variant templates. Each group receives only that variant&apos;s template — no extra template name needed.
            </p>

            {/* Run schedule inputs */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Run Schedule</p>
              {runSchedules.map((s, i) => (
                <div key={s.runNumber} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: phaseColor }}>
                    {s.runNumber}
                  </div>
                  <span className="text-[12.5px] font-medium text-gray-600 w-10 flex-shrink-0">Run {s.runNumber}</span>
                  <input type="date" value={s.date}
                    onChange={(e) => setRunSchedules((prev) => prev.map((r, ri) => ri === i ? { ...r, date: e.target.value } : r))}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input type="time" value={s.time}
                    onChange={(e) => setRunSchedules((prev) => prev.map((r, ri) => ri === i ? { ...r, time: e.target.value } : r))}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-[12px] w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {s.runNumber === 1 && (
                    <label className="flex items-center gap-1.5 text-[12px] text-blue-600 cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={s.sendNow}
                        onChange={(e) => setRunSchedules((prev) => prev.map((r, ri) => ri === i ? { ...r, sendNow: e.target.checked } : r))}
                        className="rounded"
                      />
                      Send now
                    </label>
                  )}
                </div>
              ))}
            </div>

            {execError && <p className="text-[12.5px] text-red-600">{execError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleStart} disabled={starting}
                className="flex items-center gap-2 px-4 py-2 text-white text-[13px] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: phaseColor }}
              >
                {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {starting ? 'Scheduling…' : `Start Phase ${phase.phaseNumber} — ${phase.rounds} run${phase.rounds !== 1 ? 's' : ''} scheduled`}
              </button>
              <button onClick={() => { setShowStartForm(false); setExecError(''); }} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        )}

        {/* ─── Action row ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 pt-1">
          {canApprove && (
            <button onClick={handleApprove} disabled={approving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-[13px] font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60">
              {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {approving ? 'Approving…' : `Approve Phase ${phase.phaseNumber}`}
            </button>
          )}
          {canStart && !showStartForm && (
            <button onClick={() => { setShowStartForm(true); setExecError(''); }}
              className="flex items-center gap-2 px-4 py-2 text-white text-[13px] font-semibold rounded-xl hover:opacity-90 transition-opacity"
              style={{ backgroundColor: phaseColor }}>
              <BellRing className="w-3.5 h-3.5" />
              Start Phase {phase.phaseNumber} — Schedule all {phase.rounds} runs
            </button>
          )}
          {canAnalyze && (
            <button onClick={handleAnalyze} disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-[13px] font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60">
              {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              {analyzing ? 'Analysing…' : 'Analyse Results'}
            </button>
          )}
          {canAdvance && (
            <button onClick={handleAdvance} disabled={advancing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-[13px] font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60">
              {advancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              {advancing ? 'Advancing…' : 'Advance to Next Phase'}
            </button>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1.5 text-[13px] text-green-600 font-medium px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> Phase completed
            </span>
          )}
        </div>

        {execError && !showStartForm && (
          <div className="flex items-center gap-2 text-red-600 text-[12.5px] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {execError}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Variant Template Card ────────────────────────────────────────────── */
function VariantTemplateCard({ variant, onEdit }) {
  const statusColor = {
    active:     'bg-blue-50 text-blue-600',
    top5:       'bg-amber-50 text-amber-700',
    top3:       'bg-violet-50 text-violet-700',
    winner:     'bg-green-50 text-green-700',
    eliminated: 'bg-gray-100 text-gray-400',
  };
  const tpl = variantToTpl(variant);
  const preview = (tpl.body || '').replace(/\{\{1\}\}/g, '{{name}}').replace(/\{\{2\}\}/g, '…');
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${variant.status === 'eliminated' ? 'border-gray-100 opacity-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-bold text-zinc-900">{variant.label}</span>
          <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${statusColor[variant.status] || 'bg-gray-100 text-gray-500'}`}>{variant.status}</span>
        </div>
        <button onClick={() => onEdit(variant)} className="flex items-center gap-1 text-[11.5px] text-zinc-400 hover:text-zinc-800 transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="px-4 pt-3">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{tpl.templateName || 'untitled_template'}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{tpl.category} · {tpl.language} · {tpl.headerType === 'NONE' ? 'No header' : tpl.headerType}</p>
      </div>
      {variant.copyAngle && (
        <div className="px-4 pt-2">
          <p className="text-[12.5px] text-zinc-700 font-medium">{variant.copyAngle}</p>
        </div>
      )}
      <div className="px-4 py-3">
        <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-sm px-3 py-2.5">
          {tpl.headerType === 'TEXT' && tpl.headerText && (
            <p className="text-[12px] font-bold text-[#111b21] mb-1">{tpl.headerText}</p>
          )}
          <p className="text-[12px] text-[#111b21] whitespace-pre-line leading-relaxed">{preview || 'No body yet'}</p>
          {tpl.buttons?.[0]?.text && (
            <div className="mt-2 pt-2 border-t border-[#b5e8a0]">
              <p className="text-[12px] font-semibold text-[#00a5f4] text-center">{tpl.buttons[0].text}</p>
            </div>
          )}
          <p className="text-[10px] text-[#667781] text-right mt-1">10:00 AM ✓✓</p>
        </div>
      </div>
      {(variant.sent > 0 || variant.delivered > 0) && (
        <div className="grid grid-cols-4 gap-0 border-t border-zinc-100">
          {[['Sent', variant.sent], ['Read', variant.read], ['Clicks', variant.uniqueClicks], ['Conv.', variant.conversions]].map(([l, val]) => (
            <div key={l} className="py-2 text-center">
              <p className="text-[10px] text-zinc-400">{l}</p>
              <p className="text-[13px] font-bold text-zinc-800">{val || 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Campaign Calendar ─────────────────────────────────────────────────── */
function CampaignCalendar({ scheduledJobs = [], runs = [], phases = [] }) {
  const [viewDate,     setViewDate]     = useState(() => new Date());
  const [selectedDay,  setSelectedDay]  = useState(null);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const eventMap = useMemo(() => {
    const map = new Map();
    const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    scheduledJobs.forEach((job) => {
      const d = new Date(job.scheduledAt);
      const k = key(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push({
        phaseNumber: job.phaseNumber,
        label:   `Phase ${job.phaseNumber} · Run ${job.runNumber}`,
        status:  job.status,
        time:    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        date:    d,
        sent:    null,
      });
    });

    runs.forEach((run) => {
      const d = new Date(run.completedAt || run.startedAt);
      if (!d || isNaN(d)) return;
      const k = key(d);
      if (!scheduledJobs.find((j) => j.phaseNumber === run.phaseNumber && j.runNumber === run.runNumber)) {
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({
          phaseNumber: run.phaseNumber,
          label:   `Phase ${run.phaseNumber} · Run ${run.runNumber}`,
          status:  run.status,
          time:    null,
          date:    d,
          sent:    run.metrics?.sent,
        });
      }
    });

    return map;
  }, [scheduledJobs, runs]);

  const firstDow  = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMo  = new Date(year, month + 1, 0).getDate();
  const cells     = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)];
  const today     = new Date();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const jobBadgeCls = {
    pending:   'bg-zinc-700 text-zinc-300',
    running:   'bg-blue-900 text-blue-300',
    completed: 'bg-green-900 text-green-300',
    failed:    'bg-red-900 text-red-300',
    cancelled: 'bg-zinc-800 text-zinc-500',
  };

  return (
    <div className="bg-zinc-950 rounded-3xl border border-zinc-800 p-6 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
            <CalendarDays className="w-4.5 h-4.5 text-zinc-300" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-white">Campaign Schedule</h3>
            <p className="text-[12px] text-zinc-500">All scheduled & completed sends</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-lg font-light">
            ‹
          </button>
          <span className="text-[13.5px] font-medium text-white min-w-[130px] text-center px-2">
            {monthName} {year}
          </span>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-lg font-light">
            ›
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <p key={d} className="text-center text-[11px] font-medium text-zinc-600 py-1">{d}</p>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const k = `${year}-${month}-${day}`;
          const dayEvents = eventMap.get(k) || [];
          const isToday   = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const hasEvents = dayEvents.length > 0;
          const uniquePhases = [...new Set(dayEvents.map((e) => e.phaseNumber))];

          return (
            <button
              key={k}
              onClick={() => setSelectedDay(hasEvents ? { day, events: dayEvents } : null)}
              disabled={!hasEvents}
              className={`relative h-[52px] rounded-xl flex flex-col items-center justify-start pt-1.5 gap-0.5 transition-all
                ${hasEvents ? 'bg-zinc-800 hover:bg-zinc-700 cursor-pointer' : 'hover:bg-zinc-900/50 cursor-default'}
                ${isToday ? 'ring-1 ring-blue-500/60' : ''}
              `}
            >
              <span className={`text-[12px] font-medium ${isToday ? 'text-blue-400' : hasEvents ? 'text-white' : 'text-zinc-600'}`}>
                {day}
              </span>
              {hasEvents && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {uniquePhases.slice(0, 3).map((pNum) => (
                    <div key={pNum} className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: PHASE_COLORS[(pNum - 1) % PHASE_COLORS.length] }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-5 mt-5 flex-wrap">
        {phases.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }} />
            <span className="text-[11.5px] text-zinc-500">{p.label || `Phase ${i + 1}`}</span>
          </div>
        ))}
      </div>

      {/* Selected day popup */}
      {selectedDay && (
        <div className="mt-4 p-4 bg-zinc-900 rounded-xl border border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-white">
              {new Date(year, month, selectedDay.day).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <button onClick={() => setSelectedDay(null)} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {selectedDay.events.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-zinc-800 rounded-lg">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PHASE_COLORS[(ev.phaseNumber - 1) % PHASE_COLORS.length] }} />
                <div className="flex-1">
                  <p className="text-[12.5px] font-medium text-white">{ev.label}</p>
                  <p className="text-[11px] text-zinc-500">
                    {ev.time && <span>{ev.time}</span>}
                    {ev.sent != null && ev.sent > 0 && <span> · {ev.sent} messages sent</span>}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${jobBadgeCls[ev.status] || 'bg-zinc-700 text-zinc-400'}`}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignDashboard({ campaignId, onBack }) {
  const [loading,    setLoading]    = useState(true);
  const [data,       setData]       = useState(null);
  const [expId,      setExpId]      = useState(null);
  const [error,      setError]      = useState('');
  const [editVariant,setEditVariant]= useState(null);
  const [polling,    setPolling]    = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const expRes = await wpMarketing.getExperiment(campaignId);
      const eid = expRes.data?._id;
      setExpId(eid);
      const dash = await wpMarketing.getDashboard(eid);
      setData(dash.data);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.error || 'Could not load dashboard');
    }
    if (!silent) setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  // Real-time polling while campaign is active
  useEffect(() => {
    if (!polling || !expId) return;
    const status = data?.experiment?.status;
    if (status === 'completed') return;
    const interval = setInterval(() => load(true), 10000);
    return () => clearInterval(interval);
  }, [polling, expId, data?.experiment?.status, load]);

  if (loading) return (
    <div className="p-8 flex justify-center py-24"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
  );

  if (error) return (
    <div className="p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>
      <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-[14px] font-semibold text-red-700">{error}</p>
        <p className="text-[13px] text-red-500 mt-1">The experiment plan may not be approved yet.</p>
      </div>
    </div>
  );

  const { experiment, overall, variants = [], runs = [], scheduledJobs = [] } = data || {};
  const statusColors = { approved: 'bg-amber-100 text-amber-700', running: 'bg-green-100 text-green-700', completed: 'bg-violet-100 text-violet-700' };

  // Sort variants by conversionRate + clickRate for display
  const sorted = [...variants].sort((a, b) => (b.conversionRate + b.clickRate) - (a.conversionRate + a.clickRate));

  return (
    <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-7">
        <button onClick={onBack} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">{experiment?.title || 'Campaign Dashboard'}</h2>
            <span className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[experiment?.status] || 'bg-gray-100 text-gray-500'}`}>
              {experiment?.status}
            </span>
          </div>
          <p className="text-[13px] text-gray-400 mt-0.5">{experiment?.objective}</p>
        </div>
        <button onClick={() => load()} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPolling((p) => !p)}
          className={`px-3 py-2 rounded-xl border text-[12px] font-medium transition-all ${polling ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
        >
          {polling ? 'Live ●' : 'Live off'}
        </button>
      </div>

      {/* Overall metrics */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <MetricCard label="Messages Sent"   value={overall?.totalMessages?.toLocaleString('en-IN') || 0}  color="blue"   sub={`${overall?.deliveryRate || 0}% delivered`} />
        <MetricCard label="Read"            value={overall?.read?.toLocaleString('en-IN') || 0}            color="teal"   sub={`${overall?.readRate || 0}% read rate`} />
        <MetricCard label="Unique Clicks"   value={overall?.uniqueClicks?.toLocaleString('en-IN') || 0}   color="amber"  sub={`${overall?.clickRate || 0}% click rate`} />
        <MetricCard label="Conversions"     value={overall?.conversions?.toLocaleString('en-IN') || 0}    color="green"  sub={`${overall?.conversionRate || 0}% conversion rate`} />
        <MetricCard label="Revenue"         value={overall?.revenue > 0 ? `₹${overall.revenue.toLocaleString('en-IN')}` : '₹0'}  color="violet" />
        <MetricCard label="Experiment Stage" value={`Phase ${experiment?.phases?.findIndex((p) => p.status === 'running') + 1 || (experiment?.status === 'completed' ? 'Complete' : '—')}`} color="rose" />
      </div>

      {/* Variant performance table */}
      {sorted.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <Table2 className="w-4 h-4 text-gray-400" />
            <p className="text-[14px] font-semibold text-gray-900">Variant Rankings</p>
            <span className="text-[12px] text-gray-400">(sorted by conversion + click rate)</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#', 'Variant', 'Stage', 'Sent', 'Delivery', 'Read', 'Click', 'Conv.', 'Revenue', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((v, i) => (
                  <VariantRow key={v.variantNumber} v={v} rank={i + 1} onEdit={setEditVariant} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Variant Templates — WhatsApp message preview for each variant */}
      {variants.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <p className="text-[14px] font-semibold text-gray-900">Variant Templates</p>
            <span className="text-[12px] text-gray-400">each variant is its own WhatsApp template</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {variants.map((v) => (
              <VariantTemplateCard key={v.variantNumber} variant={v} onEdit={setEditVariant} />
            ))}
          </div>
        </div>
      )}

      {/* Phase breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-gray-400" />
          <p className="text-[14px] font-semibold text-gray-900">Phase Execution</p>
          <span className="text-[12px] text-gray-400">click once per phase to schedule all runs automatically</span>
        </div>
        <div className="space-y-4">
          {(experiment?.phases || []).map((phase, pi) => (
            <PhasePanel
              key={phase.phaseNumber}
              phase={phase}
              phaseIndex={pi}
              runs={runs}
              scheduledJobs={scheduledJobs}
              experimentId={expId}
              experimentStatus={experiment?.status}
              templateConfig={experiment?.templateConfig}
              onRefresh={() => load(true)}
            />
          ))}
        </div>
      </div>

      {/* Campaign Calendar */}
      <CampaignCalendar
        scheduledJobs={scheduledJobs}
        runs={runs}
        phases={experiment?.phases || []}
      />

      {editVariant && expId && (
        <VariantEditModal
          variant={editVariant}
          experimentId={expId}
          onClose={() => setEditVariant(null)}
          onSaved={() => load(true)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TEMPLATE CARD (shared between Templates section and execution section)
══════════════════════════════════════════════════════════════════════════════ */

function TemplateCard({ tpl, onSelect, onSend }) {
  const [expanded, setExpanded] = useState(false);

  const paramCount = (tpl.template_body?.match(/\{\{\d+\}\}/g) || []).length;
  const hasMedia   = !!tpl.media_type;
  const urlButtons = (tpl.buttons || []).filter((b) => b.type === 'URL');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-[13.5px] font-semibold text-gray-900">{tpl.template_name}</p>
              <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{tpl.language}</span>
              <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${tpl.meta_status === 'APPROVED' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {tpl.meta_status}
              </span>
              {tpl.category && (
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tpl.category}</span>
              )}
              {hasMedia && (
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{tpl.media_type}</span>
              )}
            </div>
            <p className="text-[12px] text-gray-400 font-mono">ID: {tpl.template_id}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onSend && (
              <button
                onClick={() => onSend(tpl)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-3 h-3" />
                Send
              </button>
            )}
            {onSelect && (
              <button
                onClick={() => onSelect(tpl)}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 text-[12px] font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Select
              </button>
            )}
            <button
              onClick={() => setExpanded((e) => !e)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 mt-2">
          {paramCount > 0 && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Hash className="w-3 h-3" />{paramCount} variable{paramCount > 1 ? 's' : ''}
            </span>
          )}
          {tpl.buttons?.length > 0 && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />{tpl.buttons.length} button{tpl.buttons.length > 1 ? 's' : ''}
            </span>
          )}
          {tpl.createdAt && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />{new Date(tpl.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
          {tpl.template_body && (
            <div>
              <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <AlignLeft className="w-3 h-3" /> Body
              </p>
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <p className="text-[13px] text-gray-700 whitespace-pre-line leading-relaxed">{tpl.template_body}</p>
              </div>
            </div>
          )}
          {hasMedia && (
            <div>
              <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> Header
              </p>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-3">
                {tpl.media_type === 'IMAGE'    && <Image    className="w-4 h-4 text-violet-500" />}
                {tpl.media_type === 'VIDEO'    && <Film     className="w-4 h-4 text-violet-500" />}
                {tpl.media_type === 'AUDIO'    && <Music    className="w-4 h-4 text-violet-500" />}
                {tpl.media_type === 'DOCUMENT' && <FileText className="w-4 h-4 text-violet-500" />}
                <span className="text-[13px] text-gray-600">{tpl.media_type?.toLowerCase()} header</span>
                {tpl.media_gcp_url && (
                  <a href={tpl.media_gcp_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[12px] text-blue-600 hover:underline flex items-center gap-1">
                    Preview <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
          {tpl.buttons?.length > 0 && (
            <div>
              <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Buttons
              </p>
              <div className="flex flex-wrap gap-2">
                {tpl.buttons.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg">
                    {b.type === 'URL'          && <ExternalLink   className="w-3 h-3 text-blue-500" />}
                    {b.type === 'PHONE_NUMBER' && <Smartphone     className="w-3 h-3 text-green-500" />}
                    {b.type === 'QUICK_REPLY'  && <MessageSquare  className="w-3 h-3 text-violet-500" />}
                    <span className="font-medium">{b.text}</span>
                    <span className="text-gray-400">({b.type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TEMPLATE SEND MODAL
══════════════════════════════════════════════════════════════════════════════ */

function TemplateSendModal({ tpl, onClose }) {
  const paramCount  = (tpl.template_body?.match(/\{\{\d+\}\}/g) || []).length;
  const urlButtons  = (tpl.buttons || []).filter((b) => b.type === 'URL');
  const hasMedia    = !!tpl.media_type;

  const [phone,          setPhone]         = useState('');
  const [name,           setName]          = useState('');
  const [params,         setParams]        = useState(Array(paramCount).fill(''));
  const [useHeader,      setUseHeader]     = useState(hasMedia);
  const [headerType,     setHeaderType]    = useState((tpl.media_type || 'IMAGE').toLowerCase());
  const [headerMediaId,  setHeaderMediaId] = useState('');
  const [headerText,     setHeaderText]    = useState('');
  const [headerFilename, setHeaderFilename]= useState('');
  const [useDynBtn,      setUseDynBtn]     = useState(urlButtons.length > 0);
  const [dynBtnValues,   setDynBtnValues]  = useState(urlButtons.map(() => ''));
  const [sending,        setSending]       = useState(false);
  const [result,         setResult]        = useState(null);
  const [error,          setError]         = useState('');

  const updateParam = (i, v) => setParams((p) => { const n = [...p]; n[i] = v; return n; });
  const updateDynBtn = (i, v) => setDynBtnValues((a) => { const n = [...a]; n[i] = v; return n; });

  const handleSend = async () => {
    setError(''); setResult(null);
    if (!phone.trim()) { setError('Recipient phone is required'); return; }
    if (!phone.startsWith('+')) { setError('Phone must start with country code e.g. +91...'); return; }

    let dynamicHeader;
    if (useHeader && hasMedia) {
      if (headerType === 'text') {
        if (!headerText.trim()) { setError('Header text is required'); return; }
        dynamicHeader = { type: 'text', text: headerText.trim() };
      } else {
        if (!headerMediaId.trim()) { setError('Media ID is required for header'); return; }
        dynamicHeader = {
          type:     headerType,
          mediaId:  headerMediaId.trim(),
          filename: headerFilename.trim() || undefined,
        };
      }
    }

    const dynamicButtons = useDynBtn && urlButtons.length > 0
      ? urlButtons.map((_, i) => ({ type: 'url', index: i, variableValue: dynBtnValues[i] })).filter((b) => b.variableValue)
      : undefined;

    setSending(true);
    try {
      const r = await wpMarketing.sendMessage({
        recipientPhone:  phone.trim(),
        recipientName:   name.trim() || undefined,
        messageType:     'template',
        templateName:    tpl.template_name,
        languageCode:    tpl.language || 'en_US',
        templateParams:  params.filter(Boolean),
        dynamicHeader,
        dynamicButtons,
      });
      setResult({ ok: true, messageId: r.data?.result?.payload?.messageId });
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.14)] border border-gray-100 w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">Send Template Message</h3>
            <p className="text-[12.5px] text-gray-400 mt-0.5 font-mono">{tpl.template_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Preview */}
          {tpl.template_body && (
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-[10.5px] font-semibold text-green-700 uppercase tracking-wider mb-1.5">Template Preview</p>
              <p className="text-[13px] text-gray-700 whitespace-pre-line">{tpl.template_body}</p>
            </div>
          )}

          {/* Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Phone * <span className="text-gray-400 font-normal">(with country code)</span></label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999999999"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipient name"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          {/* Template params */}
          {paramCount > 0 && (
            <div>
              <label className="block text-[12.5px] font-medium text-gray-700 mb-2">Template Variables</label>
              <div className="space-y-2">
                {params.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[12px] font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg w-8 text-center flex-shrink-0">{`{{${i + 1}}}`}</span>
                    <input value={v} onChange={(e) => updateParam(i, e.target.value)} placeholder={`Variable ${i + 1} value`}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic header */}
          {hasMedia && (
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                  Dynamic Header <span className="text-[11px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full ml-1">{tpl.media_type}</span>
                </p>
                <button onClick={() => setUseHeader((v) => !v)} className={`text-[12px] font-medium px-3 py-1 rounded-lg transition-colors ${useHeader ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {useHeader ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {useHeader && (
                <div className="space-y-2">
                  {tpl.media_type !== 'TEXT' && (
                    <>
                      <input value={headerMediaId} onChange={(e) => setHeaderMediaId(e.target.value)} placeholder="Media ID from Meta (media object ID)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      {tpl.media_type === 'DOCUMENT' && (
                        <input value={headerFilename} onChange={(e) => setHeaderFilename(e.target.value)} placeholder="Filename e.g. invoice_july.pdf"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      )}
                    </>
                  )}
                  {tpl.media_type === 'TEXT' && (
                    <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Dynamic header text"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dynamic URL buttons */}
          {urlButtons.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  Dynamic URL Buttons
                </p>
                <button onClick={() => setUseDynBtn((v) => !v)} className={`text-[12px] font-medium px-3 py-1 rounded-lg transition-colors ${useDynBtn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {useDynBtn ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              {useDynBtn && urlButtons.map((b, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] text-gray-500 truncate max-w-[120px]">{b.text}</span>
                  <input value={dynBtnValues[i]} onChange={(e) => updateDynBtn(i, e.target.value)} placeholder="URL variable value e.g. ORD-1234"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              ))}
            </div>
          )}

          {/* Result */}
          {result?.ok && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-green-700">Message sent successfully!</p>
                {result.messageId && <p className="text-[11.5px] text-green-600 font-mono mt-0.5 break-all">{result.messageId}</p>}
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || result?.ok}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Sending…' : 'Send Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TEMPLATES SECTION
══════════════════════════════════════════════════════════════════════════════ */

function TemplatesSection() {
  const [templates,  setTemplates]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const LIMIT = 20;

  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [sendModal,  setSendModal]  = useState(null); // template to send

  const loadTemplates = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await wpMarketing.getTemplates(p, LIMIT);
      const data = r.data;
      setTemplates(data?.data || []);
      setTotal(data?.total || 0);
      setPage(p);
    } catch (err) {
      console.error('getTemplates error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(1); }, [loadTemplates]);

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))];
  const statuses   = [...new Set(templates.map((t) => t.meta_status).filter(Boolean))];

  const filtered = templates.filter((t) => {
    if (search     && !t.template_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter  && t.category   !== catFilter)  return false;
    if (statusFilter && t.meta_status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Template Library</h2>
          <p className="text-[13.5px] text-gray-400 mt-0.5">
            {loading ? 'Loading…' : `${total} approved template${total !== 1 ? 's' : ''} from your WhatsApp Business account`}
          </p>
        </div>
        <button
          onClick={() => loadTemplates(page)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by template name…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {statuses.length > 0 && (
          <select
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {(search || catFilter || statusFilter) && (
          <button onClick={() => { setSearch(''); setCatFilter(''); setStatusFilter(''); }}
            className="text-[13px] text-gray-400 hover:text-gray-700 flex items-center gap-1 px-2">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Template list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-[14px] font-medium">No templates found</p>
          <p className="text-[13px] mt-1">
            {search || catFilter || statusFilter ? 'Try clearing the filters' : 'No approved templates in your WhatsApp Business account'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.template_id}
              tpl={t}
              onSend={() => setSendModal(t)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 1 || loading}
            onClick={() => loadTemplates(page - 1)}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[13px] text-gray-500 font-medium">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => loadTemplates(page + 1)}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Send modal */}
      {sendModal && (
        <TemplateSendModal tpl={sendModal} onClose={() => setSendModal(null)} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   WHATSAPP SECTION — FULL REWRITE WITH ALL MESSAGE TYPES
══════════════════════════════════════════════════════════════════════════════ */

/* — helpers — */
const MSG_TYPES = [
  { id: 'text',     label: 'Text',     icon: Type },
  { id: 'image',    label: 'Image',    icon: Image },
  { id: 'video',    label: 'Video',    icon: Film },
  { id: 'audio',    label: 'Audio',    icon: Music },
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'template', label: 'Template', icon: SquareStack },
];

function WaTab({ id, label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all ${
        active ? 'bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

/* — Connection Tab — */
function WaConnectionTab() {
  const [status,     setStatus]    = useState(null);
  const [loading,    setLoading]   = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const r = await wpMarketing.getWaStatus();
      setStatus(r.data);
    } catch {
      setStatus({ connected: false, error: 'Connection check failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${loading ? 'bg-gray-100' : status?.connected ? 'bg-green-100' : 'bg-red-100'}`}>
              {loading
                ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                : status?.connected
                  ? <Wifi className="w-5 h-5 text-green-600" />
                  : <WifiOff className="w-5 h-5 text-red-500" />}
            </div>
            <div>
              <p className="text-[14.5px] font-semibold text-gray-900">CampaignBot API</p>
              <p className={`text-[13px] font-medium ${loading ? 'text-gray-400' : status?.connected ? 'text-green-600' : 'text-red-500'}`}>
                {loading
                  ? 'Checking connection…'
                  : status?.connected
                    ? `Connected — ${status.templateCount ?? 0} templates available`
                    : status?.error || 'Not connected'}
              </p>
            </div>
          </div>
          <button
            onClick={check}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recheck
          </button>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Service ID',   value: 'picoso_api_1' },
            { label: 'Endpoint',     value: 'campaignbot.online' },
            { label: 'Auth',         value: 'Bearer Token' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl py-3 px-3 text-center">
              <p className="text-[10.5px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
              <p className="text-[12.5px] font-semibold text-gray-800 mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status indicator legend */}
      {status && !loading && (
        <div className={`rounded-2xl border p-4 ${status.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {status.connected
              ? <><CheckCircle2 className="w-4 h-4 text-green-600" /><p className="text-[13px] font-medium text-green-700">API is operational. You can send messages and access templates.</p></>
              : <><AlertCircle className="w-4 h-4 text-red-500" /><p className="text-[13px] font-medium text-red-700">{status.error || 'Unable to reach the CampaignBot API. Check credentials.'}</p></>
            }
          </div>
        </div>
      )}
    </div>
  );
}

/* — Send Message Tab — */
function WaSendTab({ preloadedTemplates }) {
  const [msgType,        setMsgType]        = useState('text');
  const [phone,          setPhone]          = useState('');
  const [name,           setName]           = useState('');
  // text
  const [textContent,    setTextContent]    = useState('');
  const [replyToId,      setReplyToId]      = useState('');
  // media
  const [mediaId,        setMediaId]        = useState('');
  const [caption,        setCaption]        = useState('');
  const [docFilename,    setDocFilename]    = useState('');
  // template
  const [tplName,        setTplName]        = useState('');
  const [langCode,       setLangCode]       = useState('en_US');
  const [tplParams,      setTplParams]      = useState(['']);
  const [useDynHeader,   setUseDynHeader]   = useState(false);
  const [dynHdrType,     setDynHdrType]     = useState('image');
  const [dynHdrMediaId,  setDynHdrMediaId]  = useState('');
  const [dynHdrText,     setDynHdrText]     = useState('');
  const [dynHdrFilename, setDynHdrFilename] = useState('');
  const [useDynBtns,     setUseDynBtns]     = useState(false);
  const [dynBtns,        setDynBtns]        = useState([{ index: 0, variableValue: '' }]);

  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  // When a preloaded template is selected from dropdown
  const handleTplSelect = (e) => {
    const tpl = preloadedTemplates?.find((t) => t.template_name === e.target.value);
    if (tpl) {
      setTplName(tpl.template_name);
      setLangCode(tpl.language || 'en_US');
      const count = (tpl.template_body?.match(/\{\{\d+\}\}/g) || []).length;
      setTplParams(Array(Math.max(count, 1)).fill(''));
    } else {
      setTplName(e.target.value);
    }
  };

  const addParam = () => setTplParams((p) => [...p, '']);
  const removeParam = (i) => setTplParams((p) => p.filter((_, idx) => idx !== i));
  const updateParam = (i, v) => setTplParams((p) => { const n = [...p]; n[i] = v; return n; });
  const addDynBtn = () => setDynBtns((b) => [...b, { index: b.length, variableValue: '' }]);
  const removeDynBtn = (i) => setDynBtns((b) => b.filter((_, idx) => idx !== i));
  const updateDynBtn = (i, v) => setDynBtns((b) => { const n = [...b]; n[i] = { ...n[i], variableValue: v }; return n; });

  const handleSend = async () => {
    setError(''); setResult(null);
    if (!phone.trim()) { setError('Recipient phone is required'); return; }
    if (!phone.startsWith('+')) { setError('Phone must include country code e.g. +91...'); return; }

    const base = { recipientPhone: phone.trim(), recipientName: name.trim() || undefined, messageType: msgType };
    let payload = { ...base };

    if (msgType === 'text') {
      if (!textContent.trim()) { setError('Message content is required'); return; }
      payload.messageContent = textContent.trim();
      if (replyToId.trim()) payload.replyToMessageId = { id: replyToId.trim() };

    } else if (['image', 'video', 'audio', 'document'].includes(msgType)) {
      if (!mediaId.trim()) { setError('Media ID (from Meta) is required'); return; }
      payload.mediaUrl = mediaId.trim();
      if (caption.trim())      payload.caption  = caption.trim();
      if (msgType === 'document' && docFilename.trim()) payload.filename = docFilename.trim();

    } else if (msgType === 'template') {
      if (!tplName.trim()) { setError('Template name is required'); return; }
      payload.templateName   = tplName.trim();
      payload.languageCode   = langCode;
      payload.templateParams = tplParams.filter(Boolean);

      if (useDynHeader) {
        if (dynHdrType === 'text') {
          if (!dynHdrText.trim()) { setError('Header text is required'); return; }
          payload.dynamicHeader = { type: 'text', text: dynHdrText.trim() };
        } else {
          if (!dynHdrMediaId.trim()) { setError('Header media ID is required'); return; }
          payload.dynamicHeader = { type: dynHdrType, mediaId: dynHdrMediaId.trim() };
          if (dynHdrFilename.trim()) payload.dynamicHeader.filename = dynHdrFilename.trim();
        }
      }

      if (useDynBtns) {
        const validBtns = dynBtns.filter((b) => b.variableValue.trim());
        if (validBtns.length > 0) {
          payload.dynamicButtons = validBtns.map((b) => ({ type: 'url', index: b.index, variableValue: b.variableValue.trim() }));
        }
      }
    }

    setSending(true);
    try {
      const r = await wpMarketing.sendMessage(payload);
      setResult({ ok: true, messageId: r.data?.result?.payload?.messageId });
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Send failed';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="space-y-4">
      {/* Message type selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Message Type</p>
        <div className="flex flex-wrap gap-2">
          {MSG_TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setMsgType(id); setResult(null); setError(''); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium rounded-xl border transition-all ${
                msgType === id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Common fields */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Recipient</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Phone * <span className="text-gray-400 font-normal">(with country code)</span></label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999999999" className={inp} />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipient name" className={inp} />
          </div>
        </div>
      </div>

      {/* Type-specific fields */}
      {msgType === 'text' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider">Message Content</p>
          <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={4} placeholder="Hello! This is a test message."
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          <div>
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Reply To Message ID <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={replyToId} onChange={(e) => setReplyToId(e.target.value)} placeholder="wamid.HBg..." className={inp} />
          </div>
        </div>
      )}

      {['image', 'video', 'audio', 'document'].includes(msgType) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider">Media Details</p>
          <div>
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Media Object ID * <span className="text-gray-400 font-normal">(from Meta / after upload)</span></label>
            <input value={mediaId} onChange={(e) => setMediaId(e.target.value)} placeholder="174509235678912" className={`${inp} font-mono`} />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Caption <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Check this out!" className={inp} />
          </div>
          {msgType === 'document' && (
            <div>
              <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Filename <span className="text-gray-400 font-normal">(shown to recipient)</span></label>
              <input value={docFilename} onChange={(e) => setDocFilename(e.target.value)} placeholder="invoice_july.pdf" className={inp} />
            </div>
          )}
        </div>
      )}

      {msgType === 'template' && (
        <div className="space-y-4">
          {/* Template name */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider">Template</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Template Name *</label>
                {preloadedTemplates?.length > 0 ? (
                  <select value={tplName} onChange={handleTplSelect} className={inp}>
                    <option value="">Select a template…</option>
                    {preloadedTemplates.map((t) => (
                      <option key={t.template_id} value={t.template_name}>{t.template_name}</option>
                    ))}
                  </select>
                ) : (
                  <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="order_update" className={inp} />
                )}
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Language Code</label>
                <input value={langCode} onChange={(e) => setLangCode(e.target.value)} placeholder="en_US" className={inp} />
              </div>
            </div>
          </div>

          {/* Template params */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider">Template Variables</p>
              <button onClick={addParam} className="text-[12px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {tplParams.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[12px] font-mono bg-gray-100 text-gray-600 px-2 py-1.5 rounded-lg w-10 text-center flex-shrink-0">{`{{${i + 1}}}`}</span>
                <input value={v} onChange={(e) => updateParam(i, e.target.value)} placeholder={`Variable ${i + 1}`}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                {tplParams.length > 1 && (
                  <button onClick={() => removeParam(i)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Dynamic header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Dynamic Header <span className="font-normal text-gray-400">(optional)</span>
              </p>
              <button onClick={() => setUseDynHeader((v) => !v)}
                className={`text-[12px] font-medium px-3 py-1 rounded-lg transition-colors ${useDynHeader ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {useDynHeader ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {useDynHeader && (
              <div className="space-y-2">
                <select value={dynHdrType} onChange={(e) => setDynHdrType(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                </select>
                {dynHdrType === 'text' ? (
                  <input value={dynHdrText} onChange={(e) => setDynHdrText(e.target.value)} placeholder="Dynamic header text e.g. Order Alert"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                ) : (
                  <>
                    <input value={dynHdrMediaId} onChange={(e) => setDynHdrMediaId(e.target.value)} placeholder="Media ID from Meta"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    {dynHdrType === 'document' && (
                      <input value={dynHdrFilename} onChange={(e) => setDynHdrFilename(e.target.value)} placeholder="Filename e.g. invoice_july.pdf"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Dynamic URL buttons */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Dynamic URL Buttons <span className="font-normal text-gray-400">(optional)</span>
              </p>
              <button onClick={() => setUseDynBtns((v) => !v)}
                className={`text-[12px] font-medium px-3 py-1 rounded-lg transition-colors ${useDynBtns ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {useDynBtns ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {useDynBtns && (
              <div className="space-y-2">
                {dynBtns.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-500 flex-shrink-0">Button {b.index}</span>
                    <input value={b.variableValue} onChange={(e) => updateDynBtn(i, e.target.value)} placeholder="URL variable value e.g. ORD-1234"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    {dynBtns.length > 1 && (
                      <button onClick={() => removeDynBtn(i)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addDynBtn} className="text-[12px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add button
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result / Error */}
      {result?.ok && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13.5px] font-semibold text-green-700">Message sent successfully!</p>
            {result.messageId && (
              <p className="text-[12px] text-green-600 font-mono mt-1 break-all">{result.messageId}</p>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[13.5px] text-red-700">{error}</p>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? 'Sending…' : `Send ${MSG_TYPES.find((m) => m.id === msgType)?.label || ''} Message`}
      </button>
    </div>
  );
}

/* — Bulk Send Tab — */
function WaBulkTab({ preloadedTemplates }) {
  const [templateId,   setTemplateId]   = useState('');
  const [templateName, setTemplateName] = useState('');
  const [campName,     setCampName]     = useState('');
  const [campDesc,     setCampDesc]     = useState('');
  const [langCode,     setLangCode]     = useState('en_US');
  const [useDynHdr,    setUseDynHdr]    = useState(false);
  const [dynHdrType,   setDynHdrType]   = useState('image');
  const [dynHdrMediaId,setDynHdrMediaId]= useState('');
  const [dynHdrFile,   setDynHdrFile]   = useState('');
  const [pasteMode,    setPasteMode]    = useState(true);
  const [rawRecipients,setRawRecipients]= useState('');
  const [recipients,   setRecipients]   = useState([{ phone: '', name: '', params: '' }]);
  const [sending,      setSending]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState('');

  const handleTplSelect = (e) => {
    const tpl = preloadedTemplates?.find((t) => t.template_id === e.target.value);
    if (tpl) {
      setTemplateId(tpl.template_id);
      setTemplateName(tpl.template_name);
      setLangCode(tpl.language || 'en_US');
    }
  };

  const parseRaw = (raw) => {
    return raw.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(/[\t,|]+/).map((p) => p.trim());
      const phoneRaw = parts.find((p) => /\d{7,}/.test(p.replace(/\D/g, ''))) || '';
      const phone = phoneRaw.startsWith('+') ? phoneRaw : (phoneRaw ? `+91${phoneRaw.replace(/\D/g, '').slice(-10)}` : '');
      const nameStr = parts.find((p) => p && !/^\d/.test(p) && p !== phoneRaw) || '';
      const params = parts.filter((p) => p !== phoneRaw && p !== nameStr);
      return { phone, name: nameStr, templateParams: params };
    }).filter((r) => r.phone);
  };

  const addRow = () => setRecipients((r) => [...r, { phone: '', name: '', params: '' }]);
  const removeRow = (i) => setRecipients((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => setRecipients((r) => { const n = [...r]; n[i] = { ...n[i], [field]: value }; return n; });

  const handleSend = async () => {
    setError(''); setResult(null);
    if (!templateId.trim())   { setError('Template is required'); return; }
    if (!campName.trim())     { setError('Campaign name is required'); return; }

    let finalRecipients;
    if (pasteMode) {
      finalRecipients = parseRaw(rawRecipients);
      if (!finalRecipients.length) { setError('No valid recipients found in pasted text'); return; }
    } else {
      finalRecipients = recipients.filter((r) => r.phone.trim()).map((r) => ({
        phone:          r.phone.trim(),
        name:           r.name.trim() || undefined,
        templateParams: r.params ? r.params.split(',').map((p) => p.trim()).filter(Boolean) : [],
      }));
      if (!finalRecipients.length) { setError('Add at least one recipient with a phone number'); return; }
    }

    let dynamicHeader;
    if (useDynHdr) {
      if (!dynHdrMediaId.trim()) { setError('Header media ID is required'); return; }
      dynamicHeader = { type: dynHdrType, mediaId: dynHdrMediaId.trim() };
      if (dynHdrFile.trim()) dynamicHeader.filename = dynHdrFile.trim();
    }

    setSending(true);
    try {
      const r = await wpMarketing.sendBulkTemplate({
        templateId:          templateId.trim(),
        templateName:        templateName.trim(),
        campaignName:        campName.trim(),
        campaignDescription: campDesc.trim(),
        languageCode:        langCode,
        dynamicHeader,
        recipients:          finalRecipients,
      });
      setResult(r.data?.result || r.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Bulk send failed');
    } finally {
      setSending(false);
    }
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="space-y-4">
      {/* Template */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider">Template</p>
        {preloadedTemplates?.length > 0 ? (
          <select value={templateId} onChange={handleTplSelect} className={inp}>
            <option value="">Select a template…</option>
            {preloadedTemplates.map((t) => (
              <option key={t.template_id} value={t.template_id}>{t.template_name} ({t.template_id})</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <input value={templateId} onChange={(e) => setTemplateId(e.target.value)} placeholder="Template ID e.g. 1610629016778422" className={`${inp} font-mono`} />
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name e.g. order_update" className={inp} />
          </div>
        )}
        <input value={langCode} onChange={(e) => setLangCode(e.target.value)} placeholder="Language code e.g. en_US" className={inp} />
      </div>

      {/* Campaign info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider">Campaign</p>
        <input value={campName} onChange={(e) => setCampName(e.target.value)} placeholder="Campaign name *" className={inp} />
        <input value={campDesc} onChange={(e) => setCampDesc(e.target.value)} placeholder="Campaign description (optional)" className={inp} />
      </div>

      {/* Dynamic header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" /> Media Header <span className="font-normal text-gray-400">(optional)</span>
          </p>
          <button onClick={() => setUseDynHdr((v) => !v)}
            className={`text-[12px] font-medium px-3 py-1 rounded-lg transition-colors ${useDynHdr ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            {useDynHdr ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        {useDynHdr && (
          <div className="space-y-2">
            <select value={dynHdrType} onChange={(e) => setDynHdrType(e.target.value)} className={inp}>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
            </select>
            <input value={dynHdrMediaId} onChange={(e) => setDynHdrMediaId(e.target.value)} placeholder="Media ID from Meta *"
              className={`${inp} font-mono`} />
            {dynHdrType === 'document' && (
              <input value={dynHdrFile} onChange={(e) => setDynHdrFile(e.target.value)} placeholder="Filename e.g. promo_banner.jpg" className={inp} />
            )}
          </div>
        )}
      </div>

      {/* Recipients */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider">Recipients</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPasteMode(true)}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${pasteMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              Paste
            </button>
            <button onClick={() => setPasteMode(false)}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${!pasteMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              Manual
            </button>
          </div>
        </div>

        {pasteMode ? (
          <div>
            <textarea
              value={rawRecipients} onChange={(e) => setRawRecipients(e.target.value)}
              rows={6}
              placeholder={`Paste recipients here (one per line):\nRahul, +919999999999, Param1, Param2\nPriya, +918888888888, Hello, ORD-1234\n+917777777777, Alice, ORD-5678`}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-[11.5px] text-gray-400 mt-1.5">Format: Name, Phone, Param1, Param2, … — comma/tab/pipe separated. Country code auto-added as +91 if missing.</p>
            {rawRecipients && (
              <p className="text-[12px] text-gray-500 mt-1.5 font-medium">{parseRaw(rawRecipients).length} valid recipient{parseRaw(rawRecipients).length !== 1 ? 's' : ''} detected</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-1">
              <p className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">Phone *</p>
              <p className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">Name</p>
              <p className="text-[11.5px] font-semibold text-gray-400 uppercase tracking-wider">Params (comma-sep)</p>
              <span />
            </div>
            {recipients.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <input value={r.phone} onChange={(e) => updateRow(i, 'phone', e.target.value)} placeholder="+919999999999"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input value={r.name} onChange={(e) => updateRow(i, 'name', e.target.value)} placeholder="Name"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input value={r.params} onChange={(e) => updateRow(i, 'params', e.target.value)} placeholder="Value1, Value2"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <button onClick={() => removeRow(i)} disabled={recipients.length === 1}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button onClick={addRow} className="text-[12.5px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-1">
              <Plus className="w-3.5 h-3.5" /> Add recipient
            </button>
          </div>
        )}
      </div>

      {/* Result / Error */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-1">
          <p className="text-[13.5px] font-semibold text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Bulk campaign enqueued!
          </p>
          {result?.payload?.campaignRefId && <p className="text-[12px] text-green-600 font-mono">Campaign ID: {result.payload.campaignRefId}</p>}
          {result?.payload?.enqueuedCount != null && <p className="text-[12px] text-green-600">{result.payload.enqueuedCount} messages enqueued</p>}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[13.5px] text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? 'Sending bulk messages…' : 'Send Bulk Campaign'}
      </button>
    </div>
  );
}

/* — Media Upload Tab — */
function WaMediaTab() {
  const [file,     setFile]     = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading,setUploading]= useState(false);
  const [mediaId,  setMediaId]  = useState('');
  const [s3Url,    setS3Url]    = useState('');
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState('');
  const fileRef = useRef(null);

  const ACCEPTED = 'image/jpeg,image/png,image/webp,video/mp4,audio/ogg,audio/mpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const handleFile = (f) => {
    if (!f) return;
    setFile(f); setMediaId(''); setS3Url(''); setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a file'); return; }
    setError(''); setMediaId(''); setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await wpMarketing.uploadMedia(form);
      const id = r.data?.data?.media_id || r.data?.media_id;
      const s3Url = r.data?.s3Url || r.data?.data?.s3_url;
      if (!id) throw new Error('No media_id returned from server');
      setMediaId(id);
      if (s3Url) setS3Url(s3Url);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mediaId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image')) return <Image className="w-6 h-6 text-violet-500" />;
    if (type?.startsWith('video')) return <Film className="w-6 h-6 text-blue-500" />;
    if (type?.startsWith('audio')) return <Music className="w-6 h-6 text-green-500" />;
    return <FileText className="w-6 h-6 text-amber-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-[12.5px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Upload Media to WhatsApp</p>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-blue-400 bg-blue-50' : file ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {file ? (
            <div className="flex flex-col items-center gap-2">
              {getFileIcon(file.type)}
              <p className="text-[14px] font-semibold text-gray-900">{file.name}</p>
              <p className="text-[12.5px] text-gray-500">{file.type} · {formatSize(file.size)}</p>
              <p className="text-[12px] text-blue-600">Click to change file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-300" />
              <p className="text-[14px] font-medium text-gray-600">Drop file here or click to browse</p>
              <p className="text-[12.5px] text-gray-400">Images, Videos, Audio, Documents · Max 50 MB</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept={ACCEPTED} onChange={(e) => handleFile(e.target.files[0])} className="hidden" />

        {/* Supported formats */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { icon: Image,    label: 'Images',    formats: 'JPEG, PNG, WebP' },
            { icon: Film,     label: 'Videos',    formats: 'MP4' },
            { icon: Music,    label: 'Audio',     formats: 'OGG, MP3' },
            { icon: FileText, label: 'Documents', formats: 'PDF, DOC, DOCX' },
          ].map(({ icon: Icon, label, formats }) => (
            <div key={label} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-gray-700">{label}</p>
                <p className="text-[11px] text-gray-400">{formats}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload to WhatsApp'}
        </button>
      </div>

      {/* Result */}
      {mediaId && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="text-[13.5px] font-semibold text-green-700 flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4" />
            Media uploaded successfully!
          </p>
          <p className="text-[12.5px] text-gray-600 mb-2">Use this Media ID in WhatsApp messages and template headers:</p>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-green-200 px-3 py-2.5 mb-2">
            <p className="flex-1 text-[13.5px] font-mono text-gray-800 break-all">{mediaId}</p>
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy ID'}
            </button>
          </div>
          {s3Url && (
            <div>
              <p className="text-[12px] text-gray-500 mb-1">Stored in AWS S3:</p>
              <a href={s3Url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-blue-600 hover:underline break-all">{s3Url}</a>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[13.5px] text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

/* — WhatsApp Section shell — */
function WhatsAppSection() {
  const [activeTab,  setActiveTab]  = useState('connection');
  const [templates,  setTemplates]  = useState([]);

  useEffect(() => {
    wpMarketing.getTemplates(1, 100).then((r) => {
      setTemplates(r.data?.data || []);
    }).catch(() => {});
  }, []);

  const TABS = [
    { id: 'connection', label: 'Connection', icon: Wifi },
    { id: 'send',       label: 'Send Message', icon: Send },
    { id: 'bulk',       label: 'Bulk Send',   icon: SquareStack },
    { id: 'media',      label: 'Media Upload', icon: Upload },
  ];

  return (
    <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">WhatsApp</h2>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Send messages, manage media, and monitor API connection</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        {TABS.map((t) => <WaTab key={t.id} {...t} active={activeTab === t.id} onClick={setActiveTab} />)}
      </div>

      {activeTab === 'connection' && <WaConnectionTab />}
      {activeTab === 'send'       && <WaSendTab       preloadedTemplates={templates} />}
      {activeTab === 'bulk'       && <WaBulkTab        preloadedTemplates={templates} />}
      {activeTab === 'media'      && <WaMediaTab />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PLACEHOLDER SECTIONS
══════════════════════════════════════════════════════════════════════════════ */
function PlaceholderSection({ icon: Icon, title, description, badge = 'Coming Soon' }) {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7 text-gray-400" />
        </div>
        <span className="inline-block bg-blue-50 text-blue-600 text-[11.5px] font-semibold px-2.5 py-1 rounded-full mb-3">{badge}</span>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-[13.5px] text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SETTINGS SECTION
══════════════════════════════════════════════════════════════════════════════ */
function SettingsSection({ client }) {
  return (
    <div className="w-full px-6 py-6 xl:px-10 xl:py-8">
      <div className="mb-8">
        <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-[13.5px] text-slate-500 mt-1">Workspace and CampaignBot helper</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="px-5 py-4">
            <p className="text-[13px] font-semibold text-slate-900">Workspace</p>
          </div>
          {[
            { label: 'Client name',    value: client?.name },
            { label: 'Business name',  value: client?.workspace?.businessName },
            { label: 'Business type',  value: client?.workspace?.businessType },
            { label: 'Industry',       value: client?.workspace?.industry },
            { label: 'Timezone',       value: client?.workspace?.timezone },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <p className="text-[13px] text-slate-500">{label}</p>
              <p className="text-[13.5px] font-medium text-slate-900">{value || '—'}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-[13px] font-semibold text-slate-900 mb-1">Template creation</p>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Stay in WP Marketing. After you generate a plan, the server creates each template on CampaignBot and this page shows queued, creating, and live status. You do not need to open campaignbot.online.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   DASHBOARD SHELL
══════════════════════════════════════════════════════════════════════════════ */
function Dashboard({ client, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [campaignSubView, setCampaignSubView] = useState(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';
    const send = () => {
      window.postMessage({ source: 'picoso-wp-auth', pin: getPin(), apiBase }, '*');
    };
    send();
    const t = setInterval(send, 8000);
    return () => clearInterval(t);
  }, []);

  const handleNavigate = (section, subview = null) => {
    setActiveSection(section);
    if (section === 'campaigns') setCampaignSubView(subview);
  };

  const handleSetActive = (section) => {
    setActiveSection(section);
    if (section !== 'campaigns') setCampaignSubView(null);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview client={client} onNavigate={handleNavigate} />;
      case 'campaigns':
        return <CampaignsSection initialView={campaignSubView || 'list'} />;
      case 'contacts':
        return <ContactsSection />;
      case 'templates':
        return <TemplatesSection />;
      case 'whatsapp':
        return <WhatsAppSection />;
      case 'analytics':
        return (
          <PlaceholderSection
            icon={TrendingUp}
            title="Campaign Analytics"
            description="Aggregate analytics across all campaigns — open rates, revenue attribution, cohort comparison, and trends."
          />
        );
      case 'settings':
        return <SettingsSection client={client} />;
      default:
        return <Overview client={client} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#F4F7FB] flex">
      <Sidebar active={activeSection} setActive={handleSetActive} client={client} onLogout={onLogout} />
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE EXPORT
══════════════════════════════════════════════════════════════════════════════ */
export default function WpMarketingPage() {
  const [pinVerified, setPinVerified] = useState(false);
  const [client, setClient]           = useState(null);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedPin    = getPin();
    const savedClient = getClient();
    if (savedPin && savedClient) {
      wpMarketing.verifyPin(savedPin)
        .then((r) => {
          setClient(r.data.client);
          setPinVerified(true);
        })
        .catch(() => {
          sessionStorage.removeItem(WP_PIN_KEY);
          sessionStorage.removeItem(WP_CLIENT_KEY);
        });
    }
  }, []);

  const handleSuccess = useCallback((c) => {
    setClient(c);
    setPinVerified(true);
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(WP_PIN_KEY);
    sessionStorage.removeItem(WP_CLIENT_KEY);
    setPinVerified(false);
    setClient(null);
  }, []);

  if (!mounted) return null;
  if (!pinVerified) return <PinGate onSuccess={handleSuccess} />;
  return <Dashboard client={client} onLogout={handleLogout} />;
}
