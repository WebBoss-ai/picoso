'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    <aside className="w-[220px] flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col sticky top-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900 leading-tight">WP Marketing</p>
            <p className="text-[11px] text-gray-400 leading-tight">{client?.workspace?.businessName || client?.name}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium mb-0.5 transition-all
              ${active === id
                ? 'bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Client + logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-[12px] font-semibold flex items-center justify-center flex-shrink-0">
            {client?.name?.[0]?.toUpperCase() || 'C'}
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-gray-900 truncate">{client?.name}</p>
            <p className="text-[11px] text-gray-400">Client workspace</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
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
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100'  },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', icon: 'bg-violet-100'},
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  icon: 'bg-amber-100' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
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
    <div className="p-8 max-w-5xl">
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

      <div className="max-w-2xl">
        {/* Step header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-[11.5px] font-semibold text-blue-600 uppercase tracking-widest mb-0.5">Step 1 of 2</p>
            <h2 className="text-lg font-semibold text-gray-900">Select Contact List</h2>
          </div>
        </div>

        {/* Step tracker */}
        <div className="flex items-center gap-2 mb-7">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
            <span className="text-[13px] font-medium text-blue-600">Contacts</span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-2" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full border-2 border-gray-200 text-gray-400 text-[11px] font-bold flex items-center justify-center">2</span>
            <span className="text-[13px] text-gray-400">Context</span>
          </div>
        </div>

        {/* Search + new list button */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lists…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-600 text-[13.5px] font-medium rounded-xl hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New List
          </button>
        </div>

        {/* List grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-gray-500 mb-1">No contact lists yet</p>
            <p className="text-[13px] text-gray-400 mb-4">Create your first list to continue</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Contact List
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {filtered.map((list) => (
              <button
                key={list._id}
                onClick={() => setSelected(list)}
                className={`text-left p-4 rounded-2xl border-2 transition-all
                  ${selected?._id === list._id
                    ? 'border-blue-500 bg-blue-50 shadow-[0_0_0_4px_rgba(59,130,246,0.08)]'
                    : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center mb-2.5">
                    <Users className="w-4.5 h-4.5 text-gray-500" />
                  </div>
                  {selected?._id === list._id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[14px] font-semibold text-gray-900 leading-tight">{list.name}</p>
                {list.description && <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-1">{list.description}</p>}
                <p className="text-[12.5px] text-gray-400 mt-2">
                  <span className="font-medium text-gray-700">{list.contactCount ?? list.contacts?.length ?? 0}</span> contacts
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
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-[14px] font-semibold rounded-xl shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
  'Analysing your audience & context…',
  'Mapping 10 unique creative angles…',
  'Crafting variant messages & offers…',
  'Designing image concept briefs…',
  'Building testing schedule & phases…',
  'Setting up tracking architecture…',
  'Finalising experiment plan…',
];

function PlanGeneratingScreen() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)), 3800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_4px_24px_rgba(37,99,235,0.30)] animate-pulse">
        <FlaskConical className="w-8 h-8 text-white" />
      </div>
      <div className="text-center">
        <p className="text-[16px] font-semibold text-gray-900 mb-1">Generating Campaign Experiment Plan</p>
        <p className="text-[13px] text-gray-400">AI is building your 10-variant strategy — this may take 20–30 seconds</p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {GEN_STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2.5 text-[13px] transition-all ${i <= step ? 'text-gray-800' : 'text-gray-300'}`}>
            {i < step ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : i === step ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" />
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
  { color: 'blue',   bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700'   },
  { color: 'violet', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  { color: 'amber',  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700'  },
  { color: 'green',  bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700'  },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function ExperimentPlanView({ experiment, onApprove, approving, approved }) {
  const [activeVariant, setActiveVariant] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const { plan = {}, variants = [] } = experiment;
  const phases = plan.phases || [];
  const criteria = plan.optimizationCriteria || {};

  const copyMsg = async (i, text) => {
    await navigator.clipboard.writeText(text || '');
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const toggle = (key) => setExpandedSection((s) => (s === key ? null : key));

  const SectionHeader = ({ id, icon: Icon, title, sub, color = 'blue' }) => (
    <button
      onClick={() => toggle(id)}
      className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all text-left"
    >
      <div className={`w-9 h-9 rounded-xl bg-${color}-50 flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4.5 h-4.5 text-${color}-600`} />
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-semibold text-gray-900">{title}</p>
        {sub && <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {expandedSection === id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Approval banner */}
      {!approved ? (
        <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-amber-900">Review & Approve Campaign Plan</p>
            <p className="text-[12.5px] text-amber-700 mt-0.5">AI has designed the full experiment below. Nothing will be sent until you explicitly confirm at the bottom of this page.</p>
          </div>
          <span className="text-[11px] font-bold bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
            Awaiting Approval
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-green-800">Campaign Approved & Scheduled</p>
            <p className="text-[12.5px] text-green-600">First messages will be sent on {fmtDate(phases[0]?.scheduledDates?.[0])}.</p>
          </div>
        </div>
      )}

      {/* Title + objective */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-gray-900 leading-tight">{plan.experimentTitle || 'Campaign Experiment'}</h3>
            <p className="text-[13.5px] text-gray-500 mt-1">{plan.objective}</p>
          </div>
        </div>
        {plan.reasoning && (
          <p className="text-[12.5px] text-gray-400 mt-4 leading-relaxed border-t border-gray-50 pt-3">{plan.reasoning}</p>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Audience', value: plan.totalAudience || '—', sub: 'total contacts', color: 'blue' },
          { label: 'Variants', value: '10', sub: 'creative angles', color: 'violet' },
          { label: 'Phases', value: '4', sub: '10 → 5 → 3 → 1', color: 'amber' },
          { label: 'Test Days', value: '22', sub: 'then winner sends', color: 'green' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={`p-4 rounded-xl bg-${color}-50 border border-${color}-100`}>
            <p className={`text-[11px] font-semibold text-${color}-600 uppercase tracking-wider`}>{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
            <p className={`text-[11.5px] text-${color}-600 mt-0.5`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Experiment Progression ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Experiment Progression</p>
        <div className="flex items-stretch gap-2">
          {phases.map((ph, i) => {
            const cfg = PHASE_CONFIG[i] || PHASE_CONFIG[3];
            const scheduleDates = ph.scheduledDates || [];
            return (
              <div key={ph.phaseNumber} className="flex items-stretch gap-2 flex-1">
                <div className={`flex-1 rounded-xl border ${cfg.border} ${cfg.bg} p-3.5`}>
                  <span className={`text-[10.5px] font-bold uppercase tracking-wider ${cfg.text}`}>{ph.label}</span>
                  <p className="text-[13px] font-semibold text-gray-900 mt-1">
                    {ph.variantCount} variant{ph.variantCount > 1 ? 's' : ''}
                  </p>
                  <p className={`text-[12px] ${cfg.text} mt-0.5`}>{ph.contactsPerVariant} contacts each</p>
                  {scheduleDates.length > 0 && (
                    <p className="text-[11px] text-gray-400 mt-2">
                      {scheduleDates.map(fmtDate).join(' · ')}
                    </p>
                  )}
                  {i === 3 && <p className={`text-[11px] font-semibold ${cfg.text} mt-1 flex items-center gap-1`}><Trophy className="w-3 h-3" /> Winner sends to all</p>}
                </div>
                {i < phases.length - 1 && (
                  <div className="flex items-center justify-center w-6 flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[12px] text-gray-400 mt-4 leading-relaxed">{criteria.progressionLogic}</p>
      </div>

      {/* ── Testing Timeline ────────────────────────────────────── */}
      <SectionHeader id="timeline" icon={Clock} title="Testing Timeline" sub="6-day alternate-day schedule across 4 phases" />
      {expandedSection === 'timeline' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 -mt-2">
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

      {/* ── 10 Campaign Variants ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-blue-600" />
            <p className="text-[14px] font-semibold text-gray-900">10 Campaign Variants</p>
          </div>
          <p className="text-[12px] text-gray-400">Each tests a different creative angle</p>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
          {variants.map((v, i) => (
            <button
              key={v.variantNumber || i}
              onClick={() => setActiveVariant(i)}
              className={`flex-shrink-0 px-4 py-2.5 text-[12.5px] font-semibold border-b-2 transition-all
                ${activeVariant === i
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              {v.label || `Var ${VARIANT_LABELS[i]}`}
            </button>
          ))}
        </div>

        {/* Active variant detail */}
        {variants[activeVariant] && (() => {
          const v = variants[activeVariant];
          return (
            <div className="p-5 space-y-4">
              {/* Meta row */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  <Target className="w-3 h-3" />
                  {v.copyAngle}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {v.tone}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-[10.5px] font-semibold text-green-600 uppercase tracking-wider mb-1">Offer</p>
                  <p className="text-[13.5px] font-semibold text-gray-900">{v.offer || '—'}</p>
                </div>
                <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[10.5px] font-semibold text-blue-600 uppercase tracking-wider mb-1">Call to Action</p>
                  <p className="text-[13.5px] font-semibold text-gray-900">{v.cta || '—'}</p>
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider">WhatsApp Message</p>
                  <button
                    onClick={() => copyMsg(activeVariant, v.message)}
                    className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700"
                  >
                    {copiedIdx === activeVariant ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedIdx === activeVariant ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-900 rounded-xl p-4">
                  <pre className="text-[13px] text-green-400 whitespace-pre-wrap font-mono leading-relaxed">{v.message}</pre>
                </div>
              </div>

              {/* Image concept */}
              {v.imageConceptDescription && (
                <div className="flex items-start gap-3 p-4 bg-violet-50 rounded-xl border border-violet-100">
                  <Palette className="w-4.5 h-4.5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider mb-0.5">Image / Creative Concept</p>
                    <p className="text-[13.5px] text-gray-700">{v.imageConceptDescription}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Performance Signals ─────────────────────────────────── */}
      <SectionHeader
        id="signals"
        icon={BarChart2}
        title="Performance Signals & Optimisation"
        sub={`Primary: ${criteria.primaryMetric || 'conversions'} — ${(criteria.signals || []).length} metrics tracked`}
        color="violet"
      />
      {expandedSection === 'signals' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 -mt-2 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(criteria.signals || []).map((s) => {
              const labels = {
                delivery_rate:   [Inbox,        'Delivery Rate',    'Message reached recipient'],
                read_rate:       [Eye,           'Read Rate',        'Recipient opened the message'],
                link_click_rate: [Link2,         'Link Click Rate',  'Total link interactions'],
                unique_clicks:   [Target,        'Unique Clicks',    'Distinct recipients who clicked'],
                repeat_clicks:   [Repeat2,       'Repeat Clicks',    'Same person clicking multiple times'],
                replies:         [MessageSquare, 'Replies',          'Customer responded to message'],
                conversions:     [ShoppingCart,  'Conversions',      'Placed an order after receiving message'],
                revenue:         [DollarSign,    'Revenue',          'Order value attributed to this variant'],
              };
              const [IconComp, label, desc] = labels[s] || [BarChart2, s, ''];
              return (
                <div key={s} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50">
                  <IconComp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800">{label}</p>
                    <p className="text-[11.5px] text-gray-400">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[11.5px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Progression Logic</p>
            <p className="text-[13px] text-gray-700">{criteria.progressionLogic}</p>
          </div>
        </div>
      )}

      {/* ── Tracking Setup ──────────────────────────────────────── */}
      <SectionHeader
        id="tracking"
        icon={Link2}
        title="Unique Tracking Links"
        sub="Every contact gets a personalised tracked link"
        color="green"
      />
      {expandedSection === 'tracking' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 -mt-2 space-y-3">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
            <Link2 className="w-4.5 h-4.5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-[13.5px] text-gray-700">{plan.trackingExplanation}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Customer identity', 'Each link is tied to a specific phone number'],
              ['Variant attribution', 'Click tells us exactly which message they received'],
              ['Repeat detection', 'Second+ clicks flagged as repeat vs unique'],
              ['Conversion tracking', 'Downstream orders linked back to the campaign'],
            ].map(([t, d]) => (
              <div key={t} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12.5px] font-semibold text-gray-800">{t}</p>
                  <p className="text-[11.5px] text-gray-400">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-gray-900 rounded-xl">
            <p className="text-[11px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Example tracked link format</p>
            <code className="text-[12.5px] text-green-400 font-mono">https://picoso.in/api/t/a3f9c12e</code>
            <p className="text-[11px] text-gray-500 mt-1">↳ redirects to your URL while recording the click event</p>
          </div>
        </div>
      )}

      {/* ── Confirm & Start ─────────────────────────────────────── */}
      {!approved && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 space-y-4">
          <div className="space-y-2">
            {[
              '10 unique creative variants generated',
              '4-phase testing plan (10 → 5 → 3 → 1)',
              'Alternate-day schedule over 22 days',
              'Unique tracking links per contact + variant',
              'Optimising for conversions + revenue',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-[13.5px] text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-gray-400">
            After confirming, approve and execute each phase one at a time from the campaign dashboard.
          </p>
          <button
            onClick={onApprove}
            disabled={approving}
            className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white text-[15px] font-bold rounded-2xl shadow-[0_4px_20px_rgba(37,99,235,0.35)] hover:bg-blue-700 transition-all disabled:opacity-60"
          >
            {approving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Confirming…</>
            ) : (
              <><Play className="w-5 h-5" /> Confirm & Start Campaign</>
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
    <div className="max-w-3xl">
      {/* Step header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          disabled={generating || approved}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-[11.5px] font-semibold text-blue-600 uppercase tracking-widest mb-0.5">Step 2 of 2</p>
          <h2 className="text-lg font-semibold text-gray-900">
            {experiment ? 'Campaign Experiment Plan' : 'Campaign Context'}
          </h2>
        </div>
      </div>

      {/* Step tracker */}
      <div className="flex items-center gap-2 mb-7">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[11px] font-bold flex items-center justify-center">
            <Check className="w-3 h-3" />
          </span>
          <span className="text-[13px] text-blue-400">Contacts</span>
        </div>
        <div className="flex-1 h-px bg-blue-300 mx-2" />
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
          <span className="text-[13px] font-medium text-blue-600">Context</span>
        </div>
      </div>

      {generating ? (
        <PlanGeneratingScreen />
      ) : experiment ? (
        /* ── Plan view ─────────────────────── */
        <div>
          {/* Edit context link */}
          {!approved && (
            <button
              onClick={() => { setExperiment(null); setGenerating(false); }}
              className="flex items-center gap-1.5 text-[12.5px] text-gray-400 hover:text-gray-600 mb-4 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Edit context and regenerate plan
            </button>
          )}
          <ExperimentPlanView
            experiment={experiment}
            onApprove={approvePlan}
            approving={approving}
            approved={approved}
          />
        </div>
      ) : (
        /* ── Context input ─────────────────── */
        <>
          {/* Selected list badge */}
          <div className="flex items-center gap-2 mb-5 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
            <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-[13.5px] font-medium text-blue-800">{selectedList.name}</span>
            <span className="text-[12px] text-blue-500 ml-1">
              — {selectedList.contactCount ?? selectedList.contacts?.length ?? 0} contacts selected
            </span>
          </div>

          <div className="mb-4">
            <label className="block text-[12.5px] font-medium text-gray-700 mb-1.5">Campaign name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Campaign — ${selectedList.name}`}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-gray-900 mb-1">Describe your campaign goal</label>
            <p className="text-[12.5px] text-gray-400 mb-3">
              Write naturally — explain who these contacts are, what you want them to do, and any context. The AI will use this to design a full 10-variant experiment with automatic audience segmentation, testing schedule, and tracking.
            </p>
            <textarea
              value={context}
              onChange={(e) => { setContext(e.target.value); setError(''); }}
              rows={5}
              placeholder={`e.g. These are our repeat customers and we want to encourage them to order again. It's been 2–3 weeks since most of them last ordered. Offer them a 10% discount to come back.`}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-relaxed"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {examplePrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => { setContext(p); setError(''); }}
                  className="text-[11.5px] text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {p.slice(0, 50)}…
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-[13px] mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={generatePlan}
            disabled={!context.trim()}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-blue-600 text-white text-[14px] font-semibold rounded-xl shadow-[0_2px_12px_rgba(37,99,235,0.30)] hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FlaskConical className="w-4.5 h-4.5" />
            Generate Campaign Experiment Plan
          </button>
          <p className="text-center text-[12px] text-gray-400 mt-2">AI will design 10 creative variants · testing schedule · tracking setup</p>
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
        <div className="p-8">
          <CampaignStep1
            onNext={(list) => { setSel(list); setStep(2); }}
            onCancel={() => { setView('list'); setStep(1); }}
          />
        </div>
      );
    }
    return (
      <div className="p-8">
        <CampaignStep2
          selectedList={selectedList}
          onBack={() => setStep(1)}
          onDraftSaved={() => { setView('list'); setStep(1); setSel(null); }}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
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

      <div className="p-8 max-w-5xl">
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
          <div className="flex gap-5">
            {/* Lists column */}
            <div className="w-72 flex-shrink-0">
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
            <div className="flex-1">
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
  const [form, setForm] = useState({
    label: variant.label || '',
    copyAngle: variant.copyAngle || '',
    tone: variant.tone || '',
    offer: variant.offer || '',
    cta: variant.cta || '',
    message: variant.message || '',
    imageConceptDescription: variant.imageConceptDescription || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await wpMarketing.updateVariant(experimentId, variant.variantNumber, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-900">Edit {variant.label}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {[['label', 'Label'], ['copyAngle', 'Copy Angle'], ['tone', 'Tone'], ['offer', 'Offer'], ['cta', 'Call to Action']].map(([k, label]) => (
            <div key={k}>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">{label}</label>
              <input value={form[k]} onChange={(e) => set(k, e.target.value)} className={inp} />
            </div>
          ))}
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">WhatsApp Message</label>
            <textarea value={form.message} onChange={(e) => set('message', e.target.value)} rows={5}
              className={`${inp} font-mono text-[13px] resize-none`} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Image / Creative Concept</label>
            <textarea value={form.imageConceptDescription} onChange={(e) => set('imageConceptDescription', e.target.value)} rows={2} className={`${inp} resize-none`} />
          </div>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-500 border border-gray-200 rounded-xl">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-xl disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function PhasePanel({ phase, phaseIndex, runs, experimentId, experimentStatus, templateConfig, onRefresh }) {
  const [executing,  setExecuting]  = useState(false);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [advancing,  setAdvancing]  = useState(false);
  const [approving,  setApproving]  = useState(false);
  const [execError,  setExecError]  = useState('');
  const [analysis,   setAnalysis]   = useState(null);

  const [tmplName,    setTmplName]    = useState(templateConfig?.templateName || '');
  const [tmplId,      setTmplId]      = useState(templateConfig?.templateId || '');
  const [hasUrlBtn,   setHasUrlBtn]   = useState(templateConfig?.hasUrlButton ?? true);
  const [destUrl,     setDestUrl]     = useState(templateConfig?.destinationUrl || 'https://picoso.in');
  const [showExecForm, setShowExecForm] = useState(false);

  useEffect(() => {
    if (templateConfig?.templateName) setTmplName(templateConfig.templateName);
    if (templateConfig?.templateId) setTmplId(templateConfig.templateId);
    if (templateConfig?.hasUrlButton != null) setHasUrlBtn(templateConfig.hasUrlButton);
    if (templateConfig?.destinationUrl) setDestUrl(templateConfig.destinationUrl);
  }, [templateConfig]);

  const phaseRuns = (runs || []).filter((r) => r.phaseNumber === phase.phaseNumber);
  const completedRuns = phaseRuns.filter((r) => ['completed', 'analyzed'].includes(r.status));
  const hasAnalysis = phaseRuns.some((r) => r.aiAnalysis?.advancedVariants?.length);
  const latestRun    = phaseRuns[phaseRuns.length - 1];
  const latestAnalysis = latestRun?.aiAnalysis;

  const isPending   = phase.status === 'pending';
  const isRunning   = phase.status === 'running';
  const isCompleted = phase.status === 'completed';

  const canApprove   = isPending && experimentStatus !== 'completed' && experimentStatus !== 'awaiting_approval';
  const canExecute   = isRunning && completedRuns.length < phase.rounds && experimentStatus !== 'completed';
  const canAnalyze   = isRunning && completedRuns.length === phase.rounds && !hasAnalysis;
  const canAdvance   = hasAnalysis && isRunning && experimentStatus !== 'completed';

  const handleApprovePhase = async () => {
    setApproving(true); setExecError('');
    try {
      await wpMarketing.approvePhase(experimentId, { phaseNumber: phase.phaseNumber });
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Phase approval failed');
    }
    setApproving(false);
  };

  const handleExecute = async () => {
    if (!tmplName.trim()) { setExecError('Template name is required'); return; }
    setExecError(''); setExecuting(true);
    try {
      await wpMarketing.saveTemplateConfig(experimentId, {
        templateId: tmplId, templateName: tmplName, hasUrlButton: hasUrlBtn, destinationUrl: destUrl,
      });
      await wpMarketing.executeRun(experimentId, {
        phaseIndex,
        templateConfig: { templateId: tmplId, templateName: tmplName, hasUrlButton: hasUrlBtn, destinationUrl: destUrl },
      });
      setShowExecForm(false);
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Execution failed');
    }
    setExecuting(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
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
    const advancedNums   = src.advancedVariants || src.advancedNums;
    const eliminatedNums = src.eliminatedVariants || src.eliminatedNums;
    setAdvancing(true);
    try {
      await wpMarketing.advancePhase(experimentId, {
        advancedNums,
        eliminatedNums,
        nextCount: advancedNums?.length || 1,
      });
      onRefresh();
    } catch (err) {
      setExecError(err?.response?.data?.error || 'Advancement failed');
    }
    setAdvancing(false);
  };

  const phaseStatusBadge = {
    pending:   'bg-gray-100 text-gray-500',
    running:   'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
  };

  const workflowStep = isPending ? 1 : canAdvance ? 3 : canAnalyze ? 3 : canExecute ? 2 : isCompleted ? 4 : 2;

  return (
    <div className={`bg-white rounded-2xl border ${isRunning ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'}`}>
      {/* Phase header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <p className="text-[14px] font-semibold text-gray-900">{phase.label}</p>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {phase.variantCount} variants · up to {phase.contactsPerVariant} contacts/variant · {phase.rounds} run{phase.rounds > 1 ? 's' : ''}
          </p>
          {isPending && (
            <p className="text-[12px] text-amber-600 mt-1 font-medium">Awaiting your approval to start this phase</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11.5px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
            {completedRuns.length}/{phase.rounds} runs
          </span>
          <span className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full ${phaseStatusBadge[phase.status] || 'bg-gray-100 text-gray-500'}`}>
            {phase.status}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Workflow indicator */}
        {!isCompleted && (
          <div className="flex items-center gap-2 text-[11.5px] text-gray-400">
            {['Approve', 'Execute runs', 'Analyse & advance'].map((step, i) => (
              <span key={step} className={`flex items-center gap-1 ${workflowStep > i + 1 ? 'text-green-600' : workflowStep === i + 1 ? 'text-blue-600 font-semibold' : ''}`}>
                {workflowStep > i + 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>}
                {step}
                {i < 2 && <ChevronRight className="w-3 h-3 opacity-40" />}
              </span>
            ))}
          </div>
        )}
        {/* Run history */}
        {phaseRuns.map((run) => (
          <div key={run._id} className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-gray-800">Run {run.runNumber}</p>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${run.status === 'analyzed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {run.status}
              </span>
            </div>
            {run.metrics?.sent > 0 && (
              <div className="grid grid-cols-4 gap-2 text-center mt-3">
                {[
                  ['Sent', run.metrics.sent],
                  ['Delivered', run.metrics.delivered],
                  ['Read', run.metrics.read],
                  ['Conversions', run.metrics.conversions],
                ].map(([l, v]) => (
                  <div key={l} className="bg-white rounded-lg px-2 py-1.5">
                    <p className="text-[10px] text-gray-400">{l}</p>
                    <p className="text-[14px] font-bold text-gray-800">{v}</p>
                  </div>
                ))}
              </div>
            )}
            {run.aiAnalysis?.summary && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1">AI Analysis</p>
                <p className="text-[12.5px] text-gray-700 leading-relaxed">{run.aiAnalysis.summary}</p>
                {run.aiAnalysis.advancementDecision && (
                  <p className="text-[12px] font-semibold text-blue-700 mt-2">{run.aiAnalysis.advancementDecision}</p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Execute run form */}
        {canExecute && showExecForm && (
          <div className="p-4 border border-blue-100 rounded-xl bg-blue-50/50 space-y-3">
            <p className="text-[13px] font-semibold text-gray-900">Execute Run {completedRuns.length + 1}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11.5px] font-medium text-gray-600 block mb-1">Template Name *</label>
                <input
                  value={tmplName} onChange={(e) => setTmplName(e.target.value)}
                  placeholder="e.g. picoso_promo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] bg-white"
                />
              </div>
              <div>
                <label className="text-[11.5px] font-medium text-gray-600 block mb-1">Template ID (optional)</label>
                <input
                  value={tmplId} onChange={(e) => setTmplId(e.target.value)}
                  placeholder="e.g. 1610629016778422"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] bg-white"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
              <input type="checkbox" checked={hasUrlBtn} onChange={(e) => setHasUrlBtn(e.target.checked)} className="rounded" />
              Template has URL button (tracking link injected per recipient)
            </label>
            <div>
              <label className="text-[11.5px] font-medium text-gray-600 block mb-1">Destination URL (after click)</label>
              <input value={destUrl} onChange={(e) => setDestUrl(e.target.value)} placeholder="https://picoso.in"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] bg-white" />
            </div>
            <p className="text-[11.5px] text-gray-400">Each variant uses its AI-developed offer, CTA, and message as template variables.</p>
            {execError && <p className="text-[12.5px] text-red-600">{execError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleExecute} disabled={executing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {executing ? 'Sending…' : 'Send Messages'}
              </button>
              <button onClick={() => setShowExecForm(false)} className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        )}

        {/* Action row */}
        <div className="flex flex-wrap gap-2 pt-1">
          {canApprove && (
            <button
              onClick={handleApprovePhase}
              disabled={approving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-[13px] font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {approving ? 'Approving…' : `Approve Phase ${phase.phaseNumber}`}
            </button>
          )}
          {canExecute && !showExecForm && (
            <button
              onClick={() => setShowExecForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Execute Run {completedRuns.length + 1} of {phase.rounds}
            </button>
          )}
          {canAnalyze && (
            <button
              onClick={handleAnalyze} disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-[13px] font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60"
            >
              {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              {analyzing ? 'Analysing…' : 'Analyse Results'}
            </button>
          )}
          {canAdvance && (
            <button
              onClick={handleAdvance} disabled={advancing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-[13px] font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
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
        {execError && (
          <div className="flex items-center gap-2 text-red-600 text-[12.5px] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {execError}
          </div>
        )}
      </div>
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

  const { experiment, overall, variants = [], runs = [] } = data || {};
  const statusColors = { approved: 'bg-amber-100 text-amber-700', running: 'bg-green-100 text-green-700', completed: 'bg-violet-100 text-violet-700' };

  // Sort variants by conversionRate + clickRate for display
  const sorted = [...variants].sort((a, b) => (b.conversionRate + b.clickRate) - (a.conversionRate + a.clickRate));

  return (
    <div className="p-8 max-w-6xl">
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

      {/* Phase breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-gray-400" />
          <p className="text-[14px] font-semibold text-gray-900">Phase Execution</p>
        </div>
        <div className="space-y-4">
          {(experiment?.phases || []).map((phase, pi) => (
            <PhasePanel
              key={phase.phaseNumber}
              phase={phase}
              phaseIndex={pi}
              runs={runs}
              experimentId={expId}
              experimentStatus={experiment?.status}
              templateConfig={experiment?.templateConfig}
              onRefresh={() => load(true)}
            />
          ))}
        </div>
      </div>

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
    <div className="p-8 max-w-5xl">
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
    <div className="p-8 max-w-3xl">
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
    <div className="p-8 max-w-xl">
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="text-[13.5px] text-gray-400 mt-0.5">Your workspace information</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        {[
          { label: 'Client Name',    value: client?.name },
          { label: 'Business Name',  value: client?.workspace?.businessName },
          { label: 'Business Type',  value: client?.workspace?.businessType },
          { label: 'Industry',       value: client?.workspace?.industry },
          { label: 'Timezone',       value: client?.workspace?.timezone },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-5 py-3.5">
            <p className="text-[13px] text-gray-500">{label}</p>
            <p className="text-[13.5px] font-medium text-gray-900">{value || '—'}</p>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-gray-400 mt-4 text-center">Contact support to update workspace details.</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   DASHBOARD SHELL
══════════════════════════════════════════════════════════════════════════════ */
function Dashboard({ client, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [campaignSubView, setCampaignSubView] = useState(null);

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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar active={activeSection} setActive={handleSetActive} client={client} onLogout={onLogout} />
      <main className="flex-1 overflow-auto min-h-screen">
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
