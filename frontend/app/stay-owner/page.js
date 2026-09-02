'use client';

import './stay-owner.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Lock, LayoutDashboard, CalendarDays, BedDouble, KeyRound,
  FileText, LogOut, Building2, TrendingUp, CheckCircle2,
  AlertCircle, Plus, Minus, Loader2, IndianRupee,
} from 'lucide-react';
import { stayOwner } from '@/lib/api';
import { formatINR, COMMISSION_RATE } from '@/lib/stayUtils';
import { AdminOwnerBookingCard, PaymentSplit } from '@/components/stay/BookingCards';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'rooms', label: 'Rooms', icon: BedDouble },
  { id: 'checkin', label: 'Check-in OTP', icon: KeyRound },
  { id: 'invoices', label: 'Invoices', icon: FileText },
];

const PIN_KEY = 'picoso_stay_owner_pin';
const OWNER_KEY = 'picoso_stay_owner';

export default function StayOwnerPage() {
  const [owner, setOwner] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionStorage.getItem(PIN_KEY)) return;
    setLoading(true);
    try {
      const [s, b, p, i] = await Promise.all([
        stayOwner.getStats(),
        stayOwner.getBookings(),
        stayOwner.getProperties(),
        stayOwner.getInvoices(),
      ]);
      setStats(s.data);
      setBookings(b.data);
      setProperties(p.data);
      setInvoices(i.data);
    } catch {
      sessionStorage.removeItem(PIN_KEY);
      sessionStorage.removeItem(OWNER_KEY);
      setOwner(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(OWNER_KEY);
      if (saved && sessionStorage.getItem(PIN_KEY)) {
        setOwner(JSON.parse(saved));
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (owner) refresh();
  }, [owner, refresh]);

  if (!ready) return <ShellLoader />;

  if (!owner) {
    return <PinGate onSuccess={(o) => { setOwner(o); sessionStorage.setItem(OWNER_KEY, JSON.stringify(o)); refresh(); }} />;
  }

  const logout = () => {
    sessionStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(OWNER_KEY);
    setOwner(null);
  };

  return (
    <PortalShell nav={NAV} tab={tab} setTab={tab => setTab(tab)} title="Stay Owner" subtitle={owner.name} onLogout={logout} loading={loading}>
      {tab === 'overview' && <Overview stats={stats} bookings={bookings} properties={properties} />}
      {tab === 'bookings' && <BookingsPanel bookings={bookings} />}
      {tab === 'rooms' && <RoomsPanel properties={properties} onSaved={refresh} />}
      {tab === 'checkin' && <CheckInPanel onDone={refresh} />}
      {tab === 'invoices' && <InvoicesPanel invoices={invoices} />}
    </PortalShell>
  );
}

function PinGate({ onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const submit = async (pin) => {
    setLoading(true);
    setError('');
    try {
      sessionStorage.setItem(PIN_KEY, pin);
      const res = await stayOwner.verifyPin(pin);
      onSuccess(res.data.owner);
    } catch {
      sessionStorage.removeItem(PIN_KEY);
      setError('Incorrect PIN — ask admin for your 6-digit code.');
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
          <div className="w-12 h-12 rounded-2xl bg-turtle-600 flex items-center justify-center mb-4"><Lock className="w-5 h-5 text-white" /></div>
          <h1 className="text-lg font-semibold">Owner portal</h1>
          <p className="text-[13px] text-gray-400 mt-1 text-center">Enter your 6-digit PIN from admin</p>
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
        {error && <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1"><AlertCircle size={13} />{error}</p>}
        {loading && <div className="flex justify-center mt-3"><Loader2 className="w-5 h-5 text-turtle-600 animate-spin" /></div>}
        <p className="text-center text-[11px] text-gray-400 mt-6">Demo PINs: 482910 · 193847 · 556677</p>
      </div>
    </div>
  );
}

function Overview({ stats, bookings, properties }) {
  const upcoming = bookings.filter((b) => b.status === 'confirmed').slice(0, 5);
  return (
    <div className="space-y-6">
      <Header title="Overview" subtitle="Bookings, earnings & property pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="Properties" value={stats?.properties ?? 0} icon={Building2} />
        <Stat label="Upcoming" value={stats?.upcoming ?? 0} icon={CalendarDays} />
        <Stat label="Checked in" value={stats?.checkedIn ?? 0} icon={CheckCircle2} />
        <Stat label="Your earnings" value={formatINR(stats?.earnings)} icon={IndianRupee} />
        <Stat label="Picoso (10%)" value={formatINR(stats?.picoso)} icon={TrendingUp} />
        <Stat label="Total bookings" value={stats?.bookings ?? 0} icon={CheckCircle2} />
      </div>
      <div className="rounded-2xl border border-turtle-200 bg-turtle-50/50 p-5">
        <p className="text-sm text-gray-700">Picoso Stay takes <strong>{COMMISSION_RATE * 100}%</strong> on check-in. Invoice is generated when you verify guest OTP.</p>
        <p className="text-xs text-gray-500 mt-2">{properties.map((p) => p.name).join(' · ')}</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold mb-4">Upcoming check-ins</h2>
        {upcoming.length === 0 ? <p className="text-sm text-gray-400">No upcoming bookings.</p> : upcoming.map((b) => (
          <div key={b.id} className="py-3 border-b border-gray-50 last:border-0 flex justify-between text-sm">
            <div><p className="font-medium">{b.guestName}</p><p className="text-xs text-gray-400">{b.propertyName} · OTP {b.checkInOtp}</p></div>
            <span className="font-semibold text-turtle-700">{formatINR(b.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingsPanel({ bookings }) {
  return (
    <div className="space-y-5">
      <Header title="Bookings" subtitle="All reservations with payment & OTP details" />
      {bookings.length === 0 ? <Empty text="No bookings yet." /> : (
        <div className="space-y-4">{bookings.map((b) => <AdminOwnerBookingCard key={b.id} booking={b} />)}</div>
      )}
    </div>
  );
}

function RoomsPanel({ properties, onSaved }) {
  const updateRoom = async (propId, rooms) => {
    await stayOwner.updateProperty(propId, { rooms });
    onSaved();
  };

  return (
    <div className="space-y-5">
      <Header title="Room inventory" subtitle="Availability shown live on guest site" />
      {properties.map((p) => (
        <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold mb-4">{p.name}</h2>
          <div className="space-y-3">
            {p.rooms.map((r) => (
              <div key={r.roomId} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-xs text-gray-500">{formatINR(r.price)}/night · {r.available}/{r.total} available</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconBtn onClick={() => updateRoom(p.id, p.rooms.map((x) => x.roomId === r.roomId ? { ...x, available: Math.max(0, x.available - 1) } : x))}><Minus size={13} /></IconBtn>
                  <span className="w-8 text-center text-sm font-semibold">{r.available}</span>
                  <IconBtn onClick={() => updateRoom(p.id, p.rooms.map((x) => x.roomId === r.roomId ? { ...x, available: Math.min(x.total, x.available + 1) } : x))}><Plus size={13} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckInPanel({ onDone }) {
  const [otp, setOtp] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setResult(null);
    if (!/^\d{4}$/.test(otp)) return setError('Enter the 4-digit check-in OTP');
    setLoading(true);
    try {
      const res = await stayOwner.checkIn(otp);
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
      <Header title="Check-in OTP" subtitle="Verify guest arrival & generate invoice" />
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <input type="text" inputMode="numeric" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
          className="w-full h-14 text-center text-2xl font-semibold tracking-[0.4em] rounded-2xl border border-gray-200 focus:border-turtle-500" />
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        <button type="button" onClick={submit} disabled={loading} className="mt-4 w-full h-11 rounded-2xl bg-turtle-600 text-white text-sm font-semibold disabled:opacity-50">
          {loading ? 'Verifying…' : 'Verify & generate invoice'}
        </button>
      </div>
      {result?.invoice && (
        <div className="rounded-2xl border border-turtle-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="text-turtle-600" size={18} /><span className="font-semibold text-sm">Invoice generated</span></div>
          <PaymentSplit invoice={result.invoice} />
        </div>
      )}
    </div>
  );
}

function InvoicesPanel({ invoices }) {
  return (
    <div className="space-y-5">
      <Header title="Invoices" subtitle="Payment splits after check-in" />
      {invoices.length === 0 ? <Empty text="No invoices yet." /> : invoices.map((inv) => (
        <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex justify-between gap-3 mb-3">
            <div><p className="text-sm font-semibold">{inv.guestName}</p><p className="text-xs text-gray-400">{inv.propertyName}</p></div>
            <p className="text-sm font-semibold">{formatINR(inv.amount)}</p>
          </div>
          <PaymentSplit invoice={inv} />
        </div>
      ))}
    </div>
  );
}

function PortalShell({ nav, tab, setTab, title, subtitle, onLogout, loading, children }) {
  return (
    <div className="min-h-screen bg-[#fafbfb] font-stay text-gray-900 flex">
      <aside className="hidden md:flex w-[240px] shrink-0 border-r border-gray-200 bg-white flex-col h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
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
        <div className="md:hidden border-b border-gray-200 bg-white overflow-x-auto flex gap-1 px-3 py-2">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-semibold ${tab === id ? 'bg-turtle-600 text-white' : 'text-gray-500 bg-gray-50'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto relative">
          {loading && <div className="absolute top-4 right-4"><Loader2 className="w-4 h-4 text-turtle-600 animate-spin" /></div>}
          {children}
        </main>
      </div>
    </div>
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
