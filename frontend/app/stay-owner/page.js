'use client';

import './stay-owner.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Lock, LayoutDashboard, CalendarDays, BedDouble, KeyRound,
  FileText, LogOut, Building2, TrendingUp, CheckCircle2,
  AlertCircle, Plus, Minus, Loader2, IndianRupee, Users,
} from 'lucide-react';
import {
  checkInWithOtp,
  clearOwnerSession,
  formatINR,
  getBookings,
  getInvoices,
  getOwnerSession,
  getProperties,
  loginOwner,
  ownerStats,
  saveProperty,
  COMMISSION_RATE,
} from '@/lib/stayStore';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'rooms', label: 'Rooms', icon: BedDouble },
  { id: 'checkin', label: 'Check-in OTP', icon: KeyRound },
  { id: 'invoices', label: 'Invoices', icon: FileText },
];

export default function StayOwnerPage() {
  const [owner, setOwner] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('overview');
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    setOwner(getOwnerSession());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#fafbfb] font-stay flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-turtle-600 animate-spin" />
      </div>
    );
  }

  if (!owner) {
    return (
      <PinGate
        onSuccess={(o) => {
          setOwner(o);
          refresh();
        }}
      />
    );
  }

  const props = getProperties().filter((p) => p.ownerId === owner.id);
  const propIds = props.map((p) => p.id);
  const bookings = getBookings().filter((b) => propIds.includes(b.propertyId));
  const invoices = getInvoices().filter((i) => propIds.includes(i.propertyId));
  const stats = ownerStats(owner.id);

  const logout = () => {
    clearOwnerSession();
    setOwner(null);
  };

  return (
    <div className="min-h-screen bg-[#fafbfb] font-stay text-gray-900 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] shrink-0 border-r border-gray-200 bg-white flex-col h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-turtle-600 text-white flex items-center justify-center text-sm font-bold">
              O
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight truncate">Stay Owner</p>
              <p className="text-[11px] text-gray-400 truncate">{owner.name}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                tab === id
                  ? 'bg-turtle-600 text-white'
                  : 'text-gray-500 hover:bg-turtle-50 hover:text-turtle-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-13 flex items-center justify-between h-14">
          <div>
            <p className="text-sm font-semibold">Stay Owner</p>
            <p className="text-[10px] text-gray-400">{owner.name}</p>
          </div>
          <button type="button" onClick={logout} className="text-xs text-gray-500 flex items-center gap-1">
            <LogOut size={13} /> Out
          </button>
        </header>

        <div className="md:hidden border-b border-gray-200 bg-white overflow-x-auto flex gap-1 px-3 py-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-semibold ${
                tab === id ? 'bg-turtle-600 text-white' : 'text-gray-500 bg-gray-50'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto" key={tick}>
          {tab === 'overview' && <Overview stats={stats} bookings={bookings} props={props} />}
          {tab === 'bookings' && <BookingsPanel bookings={bookings} />}
          {tab === 'rooms' && <RoomsPanel properties={props} onSaved={refresh} />}
          {tab === 'checkin' && <CheckInPanel onDone={refresh} />}
          {tab === 'invoices' && <InvoicesPanel invoices={invoices} />}
        </main>
      </div>
    </div>
  );
}

function PinGate({ onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const submit = useCallback(
    async (pin) => {
      setLoading(true);
      setError('');
      await new Promise((r) => setTimeout(r, 350));
      const owner = loginOwner(pin);
      setLoading(false);
      if (!owner) {
        setError('Incorrect PIN — ask admin for your 6-digit code.');
        setDigits(['', '', '', '', '', '']);
        refs.current[0]?.focus();
        return;
      }
      onSuccess(owner);
    },
    [onSuccess]
  );

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) submit(next.join(''));
  };

  return (
    <div className="min-h-screen font-stay flex items-center justify-center bg-[#fafbfb] p-4 relative">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#0f766e 1px, transparent 1px), linear-gradient(90deg, #0f766e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-turtle-600 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Owner portal</h1>
          <p className="text-[13px] text-gray-400 mt-1 text-center">Enter your 6-digit PIN from admin</p>
        </div>

        <div className="flex gap-2 justify-center mb-5">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              className={`w-11 h-12 text-center text-lg font-semibold rounded-xl border outline-none transition-colors ${
                d ? 'border-turtle-500 bg-turtle-50 text-turtle-800' : 'border-gray-200 bg-gray-50'
              }`}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-[12px] justify-center mb-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {loading && (
          <div className="flex justify-center">
            <Loader2 className="w-5 h-5 text-turtle-600 animate-spin" />
          </div>
        )}
        <p className="text-center text-[11px] text-gray-400 mt-6">Demo PINs: 482910 · 193847 · 556677</p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-turtle-50 border border-turtle-100 flex items-center justify-center text-turtle-700">
          <Icon size={14} />
        </div>
      </div>
      <p className="text-xl font-semibold text-gray-900 tracking-tight">{value}</p>
    </div>
  );
}

function Overview({ stats, bookings, props }) {
  const upcoming = bookings.filter((b) => b.status === 'confirmed').slice(0, 5);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Bookings, earnings & property pulse</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="Properties" value={stats.properties} icon={Building2} />
        <Stat label="Upcoming" value={stats.upcoming} icon={CalendarDays} />
        <Stat label="Checked in" value={stats.checkedIn} icon={Users} />
        <Stat label="Your earnings" value={formatINR(stats.earnings)} icon={IndianRupee} />
        <Stat label="Picoso (10%)" value={formatINR(stats.picoso)} icon={TrendingUp} />
        <Stat label="Total bookings" value={stats.bookings} icon={CheckCircle2} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold mb-4">Upcoming check-ins</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400">No upcoming bookings.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{b.guestName}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {b.propertyName} · {b.roomName} · {b.checkIn}
                  </p>
                </div>
                <span className="text-xs font-semibold text-turtle-700 shrink-0">{formatINR(b.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-turtle-200 bg-turtle-50/50 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-turtle-700">Commission</p>
        <p className="text-sm text-gray-700 mt-1">
          Picoso Stay takes <strong>{COMMISSION_RATE * 100}%</strong> of each checked-in booking. You keep the rest — settled via invoice at check-in.
        </p>
        <p className="text-xs text-gray-500 mt-2">{props.map((p) => p.name).join(' · ') || 'No properties linked'}</p>
      </div>
    </div>
  );
}

function BookingsPanel({ bookings }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">All reservations across your properties</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {bookings.length === 0 ? (
          <p className="p-8 text-sm text-gray-400 text-center">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Stay</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{b.guestName}</p>
                      <p className="text-xs text-gray-400">+91 {b.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{b.propertyName}</p>
                      <p className="text-xs text-gray-400">{b.roomName}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {b.checkIn} → {b.checkOut}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatINR(b.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    confirmed: 'bg-turtle-50 text-turtle-700 border-turtle-100',
    checked_in: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${map[status] || map.confirmed}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function RoomsPanel({ properties, onSaved }) {
  const [editing, setEditing] = useState(null);

  const updateRoom = (propId, roomId, patch) => {
    const prop = properties.find((p) => p.id === propId);
    if (!prop) return;
    const rooms = prop.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r));
    saveProperty({ ...prop, rooms });
    onSaved();
  };

  const addRoomType = (propId) => {
    const prop = properties.find((p) => p.id === propId);
    if (!prop) return;
    const room = {
      id: `r_${Date.now()}`,
      name: 'New room type',
      description: 'Describe this room',
      price: 3000,
      total: 5,
      available: 5,
      maxGuests: 2,
      amenities: [],
    };
    saveProperty({ ...prop, rooms: [...prop.rooms, room] });
    setEditing(`${propId}:${room.id}`);
    onSaved();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Room inventory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage room types & availability — shown live on the guest site
        </p>
      </div>

      {properties.map((p) => (
        <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{p.name}</h2>
              <p className="text-xs text-gray-400">{p.location}</p>
            </div>
            <button
              type="button"
              onClick={() => addRoomType(p.id)}
              className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-turtle-700 hover:bg-turtle-50 flex items-center gap-1"
            >
              <Plus size={13} /> Room type
            </button>
          </div>

          <div className="space-y-3">
            {p.rooms.map((r) => {
              const key = `${p.id}:${r.id}`;
              const isEdit = editing === key;
              return (
                <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  {isEdit ? (
                    <div className="space-y-2">
                      <input
                        className="so-input"
                        value={r.name}
                        onChange={(e) => updateRoom(p.id, r.id, { name: e.target.value })}
                      />
                      <textarea
                        className="so-input min-h-[60px]"
                        value={r.description}
                        onChange={(e) => updateRoom(p.id, r.id, { description: e.target.value })}
                      />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <NumField
                          label="Price/night"
                          value={r.price}
                          onChange={(v) => updateRoom(p.id, r.id, { price: v })}
                        />
                        <NumField
                          label="Total rooms"
                          value={r.total}
                          onChange={(v) =>
                            updateRoom(p.id, r.id, {
                              total: v,
                              available: Math.min(r.available, v),
                            })
                          }
                        />
                        <NumField
                          label="Available"
                          value={r.available}
                          onChange={(v) => updateRoom(p.id, r.id, { available: Math.min(v, r.total) })}
                        />
                        <NumField
                          label="Max guests"
                          value={r.maxGuests}
                          onChange={(v) => updateRoom(p.id, r.id, { maxGuests: v })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="h-9 px-4 rounded-xl bg-turtle-600 text-white text-xs font-semibold"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatINR(r.price)}/night · {r.available}/{r.total} available
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <IconBtn onClick={() => updateRoom(p.id, r.id, { available: Math.max(0, r.available - 1) })}>
                          <Minus size={13} />
                        </IconBtn>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">{r.available}</span>
                        <IconBtn
                          onClick={() =>
                            updateRoom(p.id, r.id, { available: Math.min(r.total, r.available + 1) })
                          }
                        >
                          <Plus size={13} />
                        </IconBtn>
                        <button
                          type="button"
                          onClick={() => setEditing(key)}
                          className="ml-2 text-[11px] font-semibold text-turtle-700"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <style jsx global>{`
        .so-input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          background: white;
        }
        .so-input:focus {
          border-color: #14b8a6;
        }
      `}</style>
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-400 mb-1 block">{label}</span>
      <input
        type="number"
        className="so-input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function IconBtn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function CheckInPanel({ onDone }) {
  const [otp, setOtp] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    setResult(null);
    if (!/^\d{4}$/.test(otp)) {
      setError('Enter the 4-digit check-in OTP');
      return;
    }
    const res = checkInWithOtp(otp, 'owner');
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res);
    setOtp('');
    onDone();
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in OTP</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter the guest&apos;s 4-digit OTP to confirm arrival and generate invoice
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <label className="text-[11px] font-medium text-gray-500 block mb-2">Guest check-in OTP</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
          className="w-full h-14 text-center text-2xl font-semibold tracking-[0.4em] rounded-2xl border border-gray-200 focus:border-turtle-500"
        />
        {error && (
          <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5">
            <AlertCircle size={13} /> {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          className="mt-4 w-full h-11 rounded-2xl bg-turtle-600 hover:bg-turtle-700 text-white text-sm font-semibold"
        >
          Verify & generate invoice
        </button>
      </div>

      {result?.invoice && (
        <InvoiceCard invoice={result.invoice} booking={result.booking} />
      )}
    </div>
  );
}

function InvoiceCard({ invoice, booking }) {
  return (
    <div className="rounded-2xl border border-turtle-200 bg-white p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="text-turtle-600" size={18} />
        <h3 className="text-sm font-semibold">Invoice generated</h3>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">{invoice.id}</p>
      <div className="space-y-2 text-sm">
        <Line label="Guest" value={invoice.guestName} />
        <Line label="Property" value={invoice.propertyName} />
        {booking && <Line label="Room" value={booking.roomName} />}
        <Line label="Booking amount" value={formatINR(invoice.amount)} />
        <div className="h-px bg-gray-100 my-2" />
        <Line label={`Picoso Stay (${invoice.commissionRate * 100}%)`} value={formatINR(invoice.picosoShare)} accent />
        <Line label="Your earnings" value={formatINR(invoice.ownerShare)} strong />
      </div>
    </div>
  );
}

function Line({ label, value, accent, strong }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span
        className={
          strong
            ? 'font-semibold text-gray-900'
            : accent
              ? 'font-medium text-turtle-700'
              : 'text-gray-800'
        }
      >
        {value}
      </span>
    </div>
  );
}

function InvoicesPanel({ invoices }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">Generated on successful check-in</p>
      </div>
      <div className="space-y-3">
        {invoices.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-white">
            No invoices yet — check guests in with their OTP.
          </p>
        )}
        {invoices.map((inv) => (
          <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{inv.guestName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {inv.propertyName} · {new Date(inv.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatINR(inv.amount)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-turtle-50 border border-turtle-100 px-3 py-2">
                <p className="text-turtle-600/80">Picoso 10%</p>
                <p className="font-semibold text-turtle-800 mt-0.5">{formatINR(inv.picosoShare)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                <p className="text-gray-400">You earn</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatINR(inv.ownerShare)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
