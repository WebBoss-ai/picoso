'use client';

import './stay-admin.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Lock, LayoutDashboard, Building2, Users, UserCircle2, Tags,
  KeyRound, FileText, LogOut, Loader2, AlertCircle, Plus, Trash2,
  CheckCircle2, IndianRupee, TrendingUp, CalendarDays, Pencil, Save, X,
} from 'lucide-react';
import { stayAdmin } from '@/lib/api';
import { formatINR, COMMISSION_RATE } from '@/lib/stayUtils';
import { AdminOwnerBookingCard, PaymentSplit } from '@/components/stay/BookingCards';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'owners', label: 'Owners', icon: Users },
  { id: 'guests', label: 'Guests', icon: UserCircle2 },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'checkin', label: 'Check-in OTP', icon: KeyRound },
  { id: 'invoices', label: 'Invoices', icon: FileText },
];

const PIN_KEY = 'picoso_stay_admin_pin';

export default function StayAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [properties, setProperties] = useState([]);
  const [owners, setOwners] = useState([]);
  const [guests, setGuests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionStorage.getItem(PIN_KEY)) return;
    setLoading(true);
    try {
      const [s, p, o, g, c, b, i] = await Promise.all([
        stayAdmin.getStats(),
        stayAdmin.getProperties(),
        stayAdmin.getOwners(),
        stayAdmin.getGuests(),
        stayAdmin.getCategories(),
        stayAdmin.getBookings(),
        stayAdmin.getInvoices(),
      ]);
      setStats(s.data);
      setProperties(p.data);
      setOwners(o.data);
      setGuests(g.data);
      setCategories(c.data);
      setBookings(b.data);
      setInvoices(i.data);
    } catch {
      sessionStorage.removeItem(PIN_KEY);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAuthed(!!sessionStorage.getItem(PIN_KEY));
    setReady(true);
  }, []);

  useEffect(() => {
    if (authed) refresh();
  }, [authed, refresh]);

  if (!ready) return <ShellLoader />;
  if (!authed) return <PinGate onSuccess={() => { setAuthed(true); refresh(); }} />;

  const logout = () => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); };

  return (
    <PortalShell nav={NAV} tab={tab} setTab={setTab} onLogout={logout} loading={loading}>
      {tab === 'overview' && <Overview stats={stats} />}
      {tab === 'properties' && <PropertiesAdmin properties={properties} owners={owners} onChange={refresh} />}
      {tab === 'owners' && <OwnersAdmin owners={owners} onChange={refresh} />}
      {tab === 'guests' && <GuestsAdmin guests={guests} />}
      {tab === 'categories' && <CategoriesAdmin categories={categories} onChange={refresh} />}
      {tab === 'bookings' && <BookingsAdmin bookings={bookings} />}
      {tab === 'checkin' && <CheckInAdmin onDone={refresh} />}
      {tab === 'invoices' && <InvoicesAdmin invoices={invoices} />}
    </PortalShell>
  );
}

function PinGate({ onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const submit = async (pin) => {
    setLoading(true); setError('');
    try {
      sessionStorage.setItem(PIN_KEY, pin);
      await stayAdmin.verifyPin(pin);
      onSuccess();
    } catch {
      sessionStorage.removeItem(PIN_KEY);
      setError('Incorrect admin PIN');
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-stay flex items-center justify-center bg-[#fafbfb] p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mb-4"><Lock className="w-5 h-5 text-white" /></div>
          <h1 className="text-lg font-semibold">Stay Admin</h1>
          <p className="text-[13px] text-gray-400 mt-1">6-digit master PIN</p>
        </div>
        <div className="flex gap-2 justify-center mb-5">
          {digits.map((d, i) => (
            <input key={i} ref={(el) => (refs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(-1);
                const next = [...digits]; next[i] = v; setDigits(next);
                if (v && i < 5) refs.current[i + 1]?.focus();
                if (next.every((x) => x !== '')) submit(next.join(''));
              }}
              className={`w-11 h-12 text-center text-lg font-semibold rounded-xl border ${d ? 'border-turtle-500 bg-turtle-50' : 'border-gray-200 bg-gray-50'}`}
              autoFocus={i === 0}
            />
          ))}
        </div>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        {loading && <div className="flex justify-center"><Loader2 className="w-5 h-5 text-turtle-600 animate-spin" /></div>}
        <p className="text-center text-[11px] text-gray-400 mt-6">Demo PIN: 246810</p>
      </div>
    </div>
  );
}

function Overview({ stats }) {
  return (
    <div className="space-y-6">
      <Header title="Platform overview" subtitle="Conversions, inventory & Picoso share" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Properties" value={stats?.properties ?? 0} icon={Building2} />
        <Stat label="Owners" value={stats?.owners ?? 0} icon={Users} />
        <Stat label="Guests" value={stats?.guests ?? 0} icon={UserCircle2} />
        <Stat label="Bookings" value={stats?.bookings ?? 0} icon={CalendarDays} />
        <Stat label="Check-ins" value={stats?.checkedIn ?? 0} icon={CheckCircle2} />
        <Stat label="Conversions" value={stats?.conversions ?? 0} icon={TrendingUp} />
        <Stat label="GMV" value={formatINR(stats?.revenue)} icon={IndianRupee} />
        <Stat label="Picoso 10%" value={formatINR(stats?.picosoShare)} icon={TrendingUp} />
      </div>
      <div className="rounded-2xl border border-turtle-200 bg-turtle-50/50 p-5 text-sm text-gray-700">
        On check-in OTP verification, invoice splits amount — <strong>{COMMISSION_RATE * 100}%</strong> to Picoso Stay, remainder to owner.
      </div>
    </div>
  );
}

function PropertiesAdmin({ properties, owners, onChange }) {
  const [edit, setEdit] = useState(null);

  const save = async () => {
    if (!edit.name?.trim()) return;
    if (edit.id) await stayAdmin.updateProperty(edit.id, edit);
    else await stayAdmin.createProperty(edit);
    setEdit(null);
    onChange();
  };

  const remove = async (id) => {
    if (!confirm('Delete property?')) return;
    await stayAdmin.deleteProperty(id);
    onChange();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Header title="Properties" subtitle="Manage stay listings" />
        <button type="button" onClick={() => setEdit({ name: '', ownerId: owners[0]?.id, destination: 'shimla', category: 'cabin', active: true })} className="h-10 px-4 rounded-xl bg-turtle-600 text-white text-xs font-semibold flex items-center gap-1"><Plus size={14} />Add</button>
      </div>
      <div className="space-y-3">
        {properties.map((p) => (
          <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4 flex gap-4">
            <div className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0 border border-gray-100" style={{ backgroundImage: `url(${p.images?.[0]})` }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.name}</p>
              <p className="text-xs text-gray-400">{p.destination} · {p.rooms?.length || 0} room types</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <IconBtn onClick={() => setEdit({ ...p })}><Pencil size={13} /></IconBtn>
              <IconBtn onClick={() => remove(p.id)}><Trash2 size={13} /></IconBtn>
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal onClose={() => setEdit(null)} title={edit.id ? 'Edit property' : 'New property'}>
          <div className="space-y-3">
            <Input label="Name" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} />
            <Input label="Tagline" value={edit.tagline || ''} onChange={(v) => setEdit({ ...edit, tagline: v })} />
            <Input label="Location" value={edit.location || ''} onChange={(v) => setEdit({ ...edit, location: v })} />
            <label className="block text-xs text-gray-500">Owner
              <select className="sa-input mt-1" value={edit.ownerId} onChange={(e) => setEdit({ ...edit, ownerId: e.target.value })}>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="button" onClick={() => setEdit(null)} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm">Cancel</button>
            <button type="button" onClick={save} className="flex-1 h-10 rounded-xl bg-turtle-600 text-white text-sm font-semibold flex items-center justify-center gap-1"><Save size={14} />Save</button>
          </div>
        </Modal>
      )}
      <AdminStyles />
    </div>
  );
}

function OwnersAdmin({ owners, onChange }) {
  const [edit, setEdit] = useState(null);

  const save = async () => {
    if (!edit.name?.trim() || !/^\d{6}$/.test(String(edit.pin))) return;
    if (edit.id) await stayAdmin.updateOwner(edit.id, edit);
    else await stayAdmin.createOwner(edit);
    setEdit(null);
    onChange();
  };

  const remove = async (id) => {
    if (!confirm('Remove owner?')) return;
    await stayAdmin.deleteOwner(id);
    onChange();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Header title="Property owners" subtitle="Issue 6-digit portal PINs" />
        <button type="button" onClick={() => setEdit({ name: '', phone: '', pin: String(Math.floor(100000 + Math.random() * 900000)) })} className="h-10 px-4 rounded-xl bg-turtle-600 text-white text-xs font-semibold flex items-center gap-1"><Plus size={14} />Add</button>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead><tr className="border-b border-gray-100 text-left text-[11px] uppercase text-gray-400"><th className="px-4 py-3">Owner</th><th className="px-4 py-3">PIN</th><th className="px-4 py-3">Props</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {owners.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3"><p className="font-medium">{o.name}</p><p className="text-xs text-gray-400">+91 {o.phone}</p></td>
                <td className="px-4 py-3 font-mono tracking-widest text-turtle-700">{o.pin}</td>
                <td className="px-4 py-3">{o.propertyCount ?? 0}</td>
                <td className="px-4 py-3"><div className="flex gap-1 justify-end"><IconBtn onClick={() => setEdit({ ...o })}><Pencil size={13} /></IconBtn><IconBtn onClick={() => remove(o.id)}><Trash2 size={13} /></IconBtn></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal onClose={() => setEdit(null)} title="Owner">
          <div className="space-y-3">
            <Input label="Name" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} />
            <Input label="Phone" value={edit.phone} onChange={(v) => setEdit({ ...edit, phone: v.replace(/\D/g, '').slice(0, 10) })} />
            <Input label="6-digit PIN" value={edit.pin} onChange={(v) => setEdit({ ...edit, pin: v.replace(/\D/g, '').slice(0, 6) })} mono />
          </div>
          <div className="flex gap-2 mt-5">
            <button type="button" onClick={() => setEdit(null)} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm">Cancel</button>
            <button type="button" onClick={save} className="flex-1 h-10 rounded-xl bg-turtle-600 text-white text-sm font-semibold">Save</button>
          </div>
        </Modal>
      )}
      <AdminStyles />
    </div>
  );
}

function GuestsAdmin({ guests }) {
  return (
    <div className="space-y-5">
      <Header title="End users" subtitle="Guests who booked stays" />
      <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-left text-[11px] uppercase text-gray-400"><th className="px-4 py-3">Guest</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Bookings</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {guests.map((g) => (
              <tr key={g.phone}><td className="px-4 py-3 font-medium">{g.name || '—'}</td><td className="px-4 py-3">+91 {g.phone}</td><td className="px-4 py-3">{g.bookings}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoriesAdmin({ categories, onChange }) {
  const [name, setName] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    const next = [...categories, { id: name.trim().toLowerCase().replace(/\s+/g, '-'), slug: name.trim().toLowerCase().replace(/\s+/g, '-'), name: name.trim(), icon: 'home' }];
    await stayAdmin.updateCategories(next.map(({ id, slug, name: n, icon }) => ({ id, slug, name: n, icon })));
    setName('');
    onChange();
  };

  const remove = async (slug) => {
    const next = categories.filter((c) => (c.slug || c.id) !== slug);
    await stayAdmin.updateCategories(next.map(({ id, slug: s, name: n, icon }) => ({ id: id || s, slug: s || id, name: n, icon })));
    onChange();
  };

  return (
    <div className="space-y-5 max-w-lg">
      <Header title="Categories" subtitle="Stay types for filtering" />
      <div className="flex gap-2">
        <input className="sa-input flex-1" placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" onClick={add} className="h-10 px-4 rounded-xl bg-turtle-600 text-white text-xs font-semibold">Add</button>
      </div>
      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id || c.slug} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div><p className="text-sm font-medium">{c.name}</p><p className="text-[11px] text-gray-400 font-mono">{c.slug || c.id}</p></div>
            <IconBtn onClick={() => remove(c.slug || c.id)}><Trash2 size={13} /></IconBtn>
          </div>
        ))}
      </div>
      <AdminStyles />
    </div>
  );
}

function BookingsAdmin({ bookings }) {
  return (
    <div className="space-y-5">
      <Header title="All bookings" subtitle="Complete details, OTP & payment status" />
      {bookings.length === 0 ? <Empty text="No bookings yet." /> : (
        <div className="space-y-4">{bookings.map((b) => <AdminOwnerBookingCard key={b.id} booking={b} />)}</div>
      )}
    </div>
  );
}

function CheckInAdmin({ onDone }) {
  const [otp, setOtp] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setResult(null);
    if (!/^\d{4}$/.test(otp)) return setError('Enter 4-digit OTP');
    setLoading(true);
    try {
      const res = await stayAdmin.checkIn(otp);
      setResult(res.data);
      setOtp('');
      onDone();
    } catch (e) {
      setError(e.response?.data?.error || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <Header title="Check-in conversion" subtitle="Verify OTP at property — tracks conversions" />
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <input type="text" inputMode="numeric" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
          className="w-full h-14 text-center text-2xl font-semibold tracking-[0.4em] rounded-2xl border border-gray-200 focus:border-turtle-500" />
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        <button type="button" onClick={submit} disabled={loading} className="mt-4 w-full h-11 rounded-2xl bg-turtle-600 text-white text-sm font-semibold disabled:opacity-50">{loading ? 'Verifying…' : 'Verify OTP & invoice'}</button>
      </div>
      {result?.invoice && (
        <div className="rounded-2xl border border-turtle-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="text-turtle-600" size={18} /><span className="font-semibold text-sm">Conversion recorded</span></div>
          <PaymentSplit invoice={result.invoice} />
        </div>
      )}
    </div>
  );
}

function InvoicesAdmin({ invoices }) {
  return (
    <div className="space-y-5">
      <Header title="Invoices" subtitle="All payment splits after check-in" />
      {invoices.length === 0 ? <Empty text="No invoices yet." /> : invoices.map((inv) => (
        <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex justify-between gap-3 mb-3">
            <div><p className="text-sm font-semibold">{inv.guestName}</p><p className="text-xs text-gray-400">{inv.propertyName} · via {inv.actor}</p></div>
            <p className="text-sm font-semibold">{formatINR(inv.amount)}</p>
          </div>
          <PaymentSplit invoice={inv} />
        </div>
      ))}
    </div>
  );
}

function PortalShell({ nav, tab, setTab, onLogout, loading, children }) {
  return (
    <div className="min-h-screen bg-[#fafbfb] font-stay text-gray-900 flex">
      <aside className="hidden lg:flex w-[250px] shrink-0 border-r border-gray-200 bg-white flex-col h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-gray-100"><p className="text-[13px] font-semibold">Stay Admin</p><p className="text-[11px] text-gray-400">Full control</p></div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium ${tab === id ? 'bg-turtle-600 text-white' : 'text-gray-500 hover:bg-turtle-50'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button type="button" onClick={onLogout} className="w-full h-10 rounded-xl border border-gray-200 text-xs font-medium flex items-center justify-center gap-2"><LogOut size={14} />Logout</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="lg:hidden border-b border-gray-200 bg-white overflow-x-auto flex gap-1 px-3 py-2">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-semibold ${tab === id ? 'bg-turtle-600 text-white' : 'text-gray-500 bg-gray-50'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto relative">
          {loading && <div className="absolute top-4 right-4"><Loader2 className="w-4 h-4 text-turtle-600 animate-spin" /></div>}
          {children}
        </main>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-base font-semibold">{title}</h2><button type="button" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center"><X size={14} /></button></div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, mono }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-gray-500 mb-1 block">{label}</span>
      <input className={`sa-input ${mono ? 'font-mono tracking-widest' : ''}`} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Header({ title, subtitle }) {
  return <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="text-sm text-gray-500 mt-1">{subtitle}</p></div>;
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3"><p className="text-[11px] font-medium text-gray-400 uppercase">{label}</p><Icon size={14} className="text-turtle-600" /></div>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function Empty({ text }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">{text}</div>;
}

function IconBtn({ children, onClick }) {
  return <button type="button" onClick={onClick} className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center">{children}</button>;
}

function ShellLoader() {
  return <div className="min-h-screen bg-[#fafbfb] font-stay flex items-center justify-center"><Loader2 className="w-5 h-5 text-turtle-600 animate-spin" /></div>;
}

function AdminStyles() {
  return (
    <style jsx global>{`
      .sa-input { width:100%; height:2.5rem; padding:0 0.75rem; border-radius:0.75rem; border:1px solid #e5e7eb; font-size:0.8125rem; }
      .sa-input:focus { border-color:#14b8a6; }
    `}</style>
  );
}
