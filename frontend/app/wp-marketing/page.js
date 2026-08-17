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
          Good day, {client?.workspace?.businessName || client?.name} 👋
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
                  {i === 3 && <p className={`text-[11px] font-semibold ${cfg.text} mt-1`}>🏆 Winner sends to all</p>}
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
                      {isSendDay ? <Send className="w-3.5 h-3.5" /> : isEval ? '📊' : dayNum}
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
                  <span className="text-lg flex-shrink-0">🎨</span>
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
                delivery_rate: ['📬', 'Delivery Rate', 'Message reached recipient'],
                read_rate: ['👁️', 'Read Rate', 'Recipient opened the message'],
                link_click_rate: ['🔗', 'Link Click Rate', 'Total link interactions'],
                unique_clicks: ['✨', 'Unique Clicks', 'Distinct recipients who clicked'],
                repeat_clicks: ['🔄', 'Repeat Clicks', 'Same person clicking multiple times'],
                replies: ['💬', 'Replies', 'Customer responded to message'],
                conversions: ['🛒', 'Conversions', 'Placed an order after receiving message'],
                revenue: ['💰', 'Revenue', 'Actual order value attributed to this variant'],
              };
              const [icon, label, desc] = labels[s] || ['📊', s, ''];
              return (
                <div key={s} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50">
                  <span className="text-base flex-shrink-0">{icon}</span>
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
            First send will go out on <strong className="text-gray-700">{fmtDate(phases[0]?.scheduledDates?.[0])}</strong>. You can pause at any time from the Campaigns dashboard.
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
                    <button
                      onClick={() => handleDelete(c._id)}
                      disabled={deleting === c._id}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                      {deleting === c._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
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
        return (
          <PlaceholderSection
            icon={FileText}
            title="Message Templates"
            description="Build and manage reusable WhatsApp message templates with variables, media, and personalisation."
          />
        );
      case 'whatsapp':
        return (
          <PlaceholderSection
            icon={MessageCircle}
            title="WhatsApp Connection"
            description="Connect and manage your WhatsApp number — QR code scanning, session status, and message delivery."
          />
        );
      case 'analytics':
        return (
          <PlaceholderSection
            icon={TrendingUp}
            title="Campaign Analytics"
            description="Track delivery rates, opens, replies, and conversions across all your campaigns with rich visualisations."
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
