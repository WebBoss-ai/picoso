'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lock, LayoutDashboard, Users, UtensilsCrossed, LogOut, Menu, X,
  RefreshCw, Loader2, Search, Plus, Trash2, Save, Phone,
  UserPlus, Activity, IndianRupee, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { admin2 } from '@/lib/api';

const PIN_KEY = 'picoso_admin2_pin';
const STATUS_OPTS = ['interested', 'contacted', 'active', 'paused', 'cancelled', 'rejected'];
const STATUS_STYLE = {
  interested: 'bg-rose-50 text-rose-700 border-rose-100',
  contacted:  'bg-amber-50 text-amber-700 border-amber-100',
  active:     'bg-emerald-50 text-emerald-700 border-emerald-100',
  paused:     'bg-slate-50 text-slate-600 border-slate-200',
  cancelled:  'bg-gray-100 text-gray-500 border-gray-200',
  rejected:   'bg-red-50 text-red-600 border-red-100',
};

const SLOTS = [
  '08:00-08:30', '08:30-09:00', '09:00-09:30',
  '09:30-10:00', '10:00-10:30', '10:30-11:00',
];

function formatSlot(slot) {
  if (!slot) return '-';
  const [a, b] = slot.split('-');
  const to12 = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'pm' : 'am';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
  };
  return `${to12(a)} to ${to12(b)}`;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/* ── PIN gate ────────────────────────────────────────────────────────────── */
function PinGate({ onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const submit = useCallback(async (pin) => {
    setLoading(true);
    setError('');
    try {
      await admin2.verifyPin(pin);
      sessionStorage.setItem(PIN_KEY, pin);
      onSuccess();
    } catch {
      setError('Incorrect access code.');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-stone-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-rose-100 p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-rose-600" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Subscription Admin</h1>
          <p className="text-sm text-stone-500 mt-1">Enter the 4-digit access code</p>
        </div>

        <div className="flex justify-center gap-3 mb-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              disabled={loading}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-stone-200 rounded-xl focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
            />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center mb-2">
            <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
          </div>
        )}
        {error && <p className="text-center text-sm text-red-500 font-medium">{error}</p>}
      </div>
    </div>
  );
}

/* ── Stat tile ───────────────────────────────────────────────────────────── */
function StatTile({ label, value, sub, icon: Icon, tone = 'rose' }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    stone: 'bg-stone-100 text-stone-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-stone-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Overview ────────────────────────────────────────────────────────────── */
function OverviewSection({ data, onRefresh, loading }) {
  const stats = data?.stats || {};
  const timeline = data?.timeline || [];
  const slots = data?.slotDistribution || [];
  const maxLeads = Math.max(...timeline.map((d) => d.leads), 1);
  const maxSlot = Math.max(...slots.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Overview</h2>
          <p className="text-sm text-stone-500">Breakfast membership analytics</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 h-9 px-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total leads" value={stats.total ?? 0} icon={UserPlus} tone="rose" />
        <StatTile label="Interested" value={stats.interested ?? 0} icon={Activity} tone="amber" sub="Awaiting contact" />
        <StatTile label="Active members" value={stats.active ?? 0} icon={CheckCircle2} tone="emerald" />
        <StatTile
          label="Weekly potential"
          value={`₹${(stats.potentialWeeklyRevenue ?? 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          tone="violet"
          sub={`${stats.conversionRate ?? 0}% conversion`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STATUS_OPTS.map((s) => (
          <div key={s} className="bg-white rounded-xl border border-stone-100 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold">{s}</p>
            <p className="text-lg font-bold text-stone-800 mt-0.5">{stats[s] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-800 mb-4">Leads · last 14 days</h3>
          <div className="flex items-end gap-1 h-32">
            {timeline.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className="w-full rounded-t-md bg-rose-400/80 min-h-[2px] transition-all"
                  style={{ height: `${(d.leads / maxLeads) * 100}%` }}
                  title={`${d.date}: ${d.leads}`}
                />
                <span className="text-[8px] text-stone-400 rotate-0">
                  {new Date(d.date).getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-800 mb-4">Preferred delivery windows</h3>
          {slots.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">No slot data yet</p>
          ) : (
            <div className="space-y-2.5">
              {slots.map((s) => (
                <div key={s.slot} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-stone-600 w-28 flex-shrink-0">
                    {formatSlot(s.slot)}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{ width: `${(s.count / maxSlot) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-stone-700 w-6 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-stone-800 mb-1">Menu items on board</h3>
        <p className="text-3xl font-bold text-stone-900">{stats.menuCount ?? 0}</p>
        <p className="text-xs text-stone-400 mt-1">Managed from the Menu section</p>
      </div>
    </div>
  );
}

/* ── Leads ───────────────────────────────────────────────────────────────── */
function LeadsSection() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await admin2.getLeads({
        status: status === 'all' ? undefined : status,
        q: q || undefined,
      });
      setLeads(data.leads || []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => { load(); }, [load]);

  const openLead = (lead) => {
    setSelected(lead);
    setNotes(lead.notes || '');
    setEditStatus(lead.status);
  };

  const saveLead = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await admin2.updateLead(selected._id, {
        status: editStatus,
        notes,
      });
      setSelected(data.lead);
      setLeads((prev) => prev.map((l) => (l._id === data.lead._id ? data.lead : l)));
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const removeLead = async (id) => {
    if (!confirm('Delete this lead permanently?')) return;
    try {
      await admin2.deleteLead(id);
      setLeads((prev) => prev.filter((l) => l._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Members &amp; leads</h2>
        <p className="text-sm text-stone-500">Everyone who expressed interest in breakfast membership</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search phone or name"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-stone-200 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-50"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 px-3 rounded-xl border border-stone-200 text-sm outline-none bg-white"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="h-10 px-4 rounded-xl bg-stone-900 text-white text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Sync
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-sm text-stone-400">No leads found</div>
          ) : (
            <div className="divide-y divide-stone-50 max-h-[70vh] overflow-y-auto">
              {leads.map((lead) => (
                <button
                  key={lead._id}
                  type="button"
                  onClick={() => openLead(lead)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-rose-50/40 transition-colors flex items-center gap-3 ${
                    selected?._id === lead._id ? 'bg-rose-50/70' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                    <Phone size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-stone-900 truncate">
                        {lead.name || lead.phone}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border capitalize ${STATUS_STYLE[lead.status] || ''}`}>
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                      <span>{lead.phone}</span>
                      <span className="opacity-30">·</span>
                      <span>{formatSlot(lead.timeSlot)}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-stone-400">{formatDate(lead.createdAt)}</p>
                    <ChevronRight size={14} className="text-stone-300 ml-auto mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-10 text-center text-sm text-stone-400">
              Select a lead to manage
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-400 font-semibold">Lead detail</p>
                  <h3 className="text-lg font-bold text-stone-900 mt-0.5">
                    {selected.name || 'Unnamed'}
                  </h3>
                  <p className="text-sm text-stone-600 font-medium">{selected.phone}</p>
                </div>
                <button
                  onClick={() => removeLead(selected._id)}
                  className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <p className="text-stone-400 mb-0.5">Start date</p>
                  <p className="font-semibold text-stone-800">{formatDate(selected.startDate)}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <p className="text-stone-400 mb-0.5">Window</p>
                  <p className="font-semibold text-stone-800">{formatSlot(selected.timeSlot)}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <p className="text-stone-400 mb-0.5">Price</p>
                  <p className="font-semibold text-stone-800">₹{selected.weeklyPrice}/wk</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-2.5">
                  <p className="text-stone-400 mb-0.5">Submitted</p>
                  <p className="font-semibold text-stone-800">{formatDateTime(selected.createdAt)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1.5">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stone-200 text-sm bg-white outline-none capitalize"
                >
                  {STATUS_OPTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-500 block mb-1.5">Internal notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Call notes, address, payment status..."
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-rose-300 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveLead}
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save changes
                </button>
                <a
                  href={`tel:+91${selected.phone}`}
                  className="h-10 px-3 rounded-xl border border-stone-200 text-stone-600 flex items-center justify-center hover:bg-stone-50"
                >
                  <Phone size={15} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Menu manager ────────────────────────────────────────────────────────── */
const EMPTY_ITEM = {
  name: '',
  description: '',
  tag: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  isVeg: true,
  available: true,
  sortOrder: 0,
};

function MenuSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await admin2.getMenu();
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_ITEM, sortOrder: items.length + 1 });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      tag: item.tag || '',
      calories: item.calories ?? '',
      protein: item.protein ?? '',
      carbs: item.carbs ?? '',
      fats: item.fats ?? '',
      isVeg: item.isVeg !== false,
      available: item.available !== false,
      sortOrder: item.sortOrder ?? 0,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return alert('Name is required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fats: Number(form.fats) || 0,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await admin2.updateItem(editing._id, payload);
      } else {
        await admin2.createItem(payload);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove this menu item?')) return;
    try {
      await admin2.deleteItem(id);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete');
    }
  };

  const toggleAvailable = async (item) => {
    try {
      await admin2.updateItem(item._id, { available: !item.available });
      await load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Breakfast menu</h2>
          <p className="text-sm text-stone-500">Five weekly plates shown on /subscription</p>
        </div>
        <button
          onClick={openNew}
          className="h-10 px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-rose-700"
        >
          <Plus size={15} />
          Add item
        </button>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl border border-stone-100 p-4 flex items-start gap-4 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-stone-900">{item.name}</h3>
                  {item.tag && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-500">
                      {item.tag}
                    </span>
                  )}
                  {!item.available && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-200 text-stone-500">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.description}</p>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  {item.calories} kcal · P {item.protein}g · C {item.carbs}g · F {item.fats}g
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => toggleAvailable(item)}
                  className="h-8 px-2.5 rounded-lg text-xs font-medium border border-stone-200 text-stone-600 hover:bg-stone-50"
                >
                  {item.available ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => openEdit(item)}
                  className="h-8 px-2.5 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(item._id)}
                  className="h-8 w-8 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 flex items-center justify-center"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-12 text-center text-sm text-stone-400 bg-white rounded-2xl border border-stone-100">
              No menu items yet
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="font-bold text-stone-900">
                {editing ? 'Edit menu item' : 'New menu item'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'tag', label: 'Tag', type: 'text' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-stone-500 block mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm outline-none focus:border-rose-300"
                    />
                  ) : (
                    <input
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-stone-200 text-sm outline-none focus:border-rose-300"
                    />
                  )}
                </div>
              ))}
              <div className="grid grid-cols-4 gap-2">
                {['calories', 'protein', 'carbs', 'fats'].map((k) => (
                  <div key={k}>
                    <label className="text-xs font-semibold text-stone-500 block mb-1 capitalize">{k}</label>
                    <input
                      type="number"
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="w-full h-10 px-2 rounded-xl border border-stone-200 text-sm outline-none focus:border-rose-300"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500 block mb-1">Sort order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-stone-200 text-sm outline-none"
                  />
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isVeg}
                      onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
                    />
                    Vegetarian
                  </label>
                  <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.available}
                      onChange={(e) => setForm({ ...form, available: e.target.checked })}
                    />
                    Visible
                  </label>
                </div>
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editing ? 'Update item' : 'Create item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */
const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'leads', label: 'Subscriptions', icon: Users },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
];

export default function Admin2Page() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState('leads');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const pin = sessionStorage.getItem(PIN_KEY);
    if (!pin) {
      setChecking(false);
      return;
    }
    admin2.verifyPin(pin)
      .then(() => setAuthed(true))
      .catch(() => sessionStorage.removeItem(PIN_KEY))
      .finally(() => setChecking(false));
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await admin2.getStats();
      setStatsData(data);
    } catch {
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && section === 'overview') loadStats();
  }, [authed, section, loadStats]);

  const logout = () => {
    sessionStorage.removeItem(PIN_KEY);
    setAuthed(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-7 h-7 animate-spin text-rose-400" />
      </div>
    );
  }

  if (!authed) {
    return <PinGate onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* sidebar desktop */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-stone-200 bg-white fixed inset-y-0 left-0 z-30">
        <div className="px-5 py-5 border-b border-stone-100">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-rose-500">Admin 2</p>
          <h1 className="text-base font-bold text-stone-900 mt-0.5">Breakfast Suite</h1>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                section === id
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-stone-100">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-rose-500">Admin 2</p>
                <h1 className="text-base font-bold text-stone-900">Breakfast Suite</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setSection(id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    section === id ? 'bg-rose-50 text-rose-700' : 'text-stone-600'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t">
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-stone-500">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* main */}
      <div className="flex-1 lg:ml-60 min-w-0">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center"
          >
            <Menu size={16} />
          </button>
          <div>
            <p className="text-sm font-bold text-stone-900">
              {NAV.find((n) => n.id === section)?.label}
            </p>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-6xl mx-auto">
          {section === 'overview' && (
            <OverviewSection data={statsData} onRefresh={loadStats} loading={statsLoading} />
          )}
          {section === 'leads' && <LeadsSection />}
          {section === 'menu' && <MenuSection />}
        </main>
      </div>
    </div>
  );
}
