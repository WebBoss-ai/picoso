'use client';

import './stay-admin.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Lock, LayoutDashboard, Building2, Users, UserCircle2, Tags,
  KeyRound, FileText, LogOut, Loader2, AlertCircle, Plus, Trash2,
  CheckCircle2, IndianRupee, TrendingUp, CalendarDays, Pencil,
  Save, X,
} from 'lucide-react';
import {
  STAY_ADMIN_PIN,
  adminStats,
  checkInWithOtp,
  clearAdminSession,
  deleteOwner,
  deleteProperty,
  formatINR,
  generateOtp,
  getBookings,
  getCategories,
  getGuests,
  getInvoices,
  getOwners,
  getProperties,
  isAdminLoggedIn,
  loginAdmin,
  saveCategories,
  saveOwner,
  saveProperty,
  COMMISSION_RATE,
} from '@/lib/stayStore';

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

export default function StayAdminPage() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('overview');
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    setAuthed(isAdminLoggedIn());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#fafbfb] font-stay flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-turtle-600 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <AdminPinGate onSuccess={() => setAuthed(true)} />;
  }

  const logout = () => {
    clearAdminSession();
    setAuthed(false);
  };

  return (
    <div className="min-h-screen bg-[#fafbfb] font-stay text-gray-900 flex">
      <aside className="hidden lg:flex w-[250px] shrink-0 border-r border-gray-200 bg-white flex-col h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
              A
            </div>
            <div>
              <p className="text-[13px] font-semibold tracking-tight">Stay Admin</p>
              <p className="text-[11px] text-gray-400">Picoso Stay</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Stay Admin</p>
            <p className="text-[10px] text-gray-400">Full control</p>
          </div>
          <button type="button" onClick={logout} className="text-xs text-gray-500 flex items-center gap-1">
            <LogOut size={13} /> Out
          </button>
        </header>

        <div className="lg:hidden border-b border-gray-200 bg-white overflow-x-auto flex gap-1 px-3 py-2">
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto" key={tick}>
          {tab === 'overview' && <AdminOverview />}
          {tab === 'properties' && <PropertiesAdmin onChange={refresh} />}
          {tab === 'owners' && <OwnersAdmin onChange={refresh} />}
          {tab === 'guests' && <GuestsAdmin />}
          {tab === 'categories' && <CategoriesAdmin onChange={refresh} />}
          {tab === 'bookings' && <BookingsAdmin />}
          {tab === 'checkin' && <AdminCheckIn onDone={refresh} />}
          {tab === 'invoices' && <InvoicesAdmin />}
        </main>
      </div>
    </div>
  );
}

function AdminPinGate({ onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef([]);

  const submit = useCallback(
    async (pin) => {
      setLoading(true);
      setError('');
      await new Promise((r) => setTimeout(r, 300));
      const ok = loginAdmin(pin);
      setLoading(false);
      if (!ok) {
        setError('Incorrect admin PIN');
        setDigits(['', '', '', '', '', '']);
        refs.current[0]?.focus();
        return;
      }
      onSuccess();
    },
    [onSuccess]
  );

  return (
    <div className="min-h-screen font-stay flex items-center justify-center bg-[#fafbfb] p-4 relative">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#134e4a 1px, transparent 1px), linear-gradient(90deg, #134e4a 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative w-full max-w-sm bg-white border border-gray-200 rounded-3xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Stay Admin</h1>
          <p className="text-[13px] text-gray-400 mt-1">6-digit master PIN</p>
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
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(-1);
                const next = [...digits];
                next[i] = v;
                setDigits(next);
                if (v && i < 5) refs.current[i + 1]?.focus();
                if (next.every((x) => x !== '')) submit(next.join(''));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              className={`w-11 h-12 text-center text-lg font-semibold rounded-xl border outline-none ${
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
        <p className="text-center text-[11px] text-gray-400 mt-6">Demo PIN: {STAY_ADMIN_PIN}</p>
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
      <p className="text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function AdminOverview() {
  const s = adminStats();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
        <p className="text-sm text-gray-500 mt-1">Conversions, inventory & Picoso share</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Properties" value={s.properties} icon={Building2} />
        <Stat label="Owners" value={s.owners} icon={Users} />
        <Stat label="Guests" value={s.guests} icon={UserCircle2} />
        <Stat label="Bookings" value={s.bookings} icon={CalendarDays} />
        <Stat label="Check-ins" value={s.checkedIn} icon={CheckCircle2} />
        <Stat label="Conversions" value={s.conversions} icon={TrendingUp} />
        <Stat label="GMV" value={formatINR(s.revenue)} icon={IndianRupee} />
        <Stat label="Picoso 10%" value={formatINR(s.picosoShare)} icon={TrendingUp} />
      </div>
      <div className="rounded-2xl border border-turtle-200 bg-turtle-50/50 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-turtle-700">Model</p>
        <p className="text-sm text-gray-700 mt-1 leading-relaxed">
          Guests book without paying online. On check-in (OTP), an invoice splits the amount —{' '}
          <strong>{COMMISSION_RATE * 100}%</strong> to Picoso Stay, remainder to the property owner.
        </p>
      </div>
    </div>
  );
}

function PropertiesAdmin({ onChange }) {
  const [list, setList] = useState([]);
  const [owners, setOwners] = useState([]);
  const [cats, setCats] = useState([]);
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    setList(getProperties());
    setOwners(getOwners());
    setCats(getCategories());
  }, []);

  const blank = () => ({
    id: `prop_${Date.now()}`,
    ownerId: owners[0]?.id || '',
    destination: 'shimla',
    name: '',
    category: cats[0]?.id || 'cabin',
    tagline: '',
    description: '',
    images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
    ],
    location: 'Shimla',
    rating: 4.5,
    reviews: 0,
    amenities: ['Wi-Fi', 'Heating', 'Parking'],
    highlights: ['Pay at property'],
    rooms: [
      {
        id: 'r1',
        name: 'Deluxe',
        description: 'Comfortable room',
        price: 3000,
        total: 5,
        available: 5,
        maxGuests: 2,
        amenities: [],
      },
    ],
    active: true,
  });

  const save = () => {
    if (!edit.name.trim()) return;
    saveProperty(edit);
    // sync owner propertyIds
    const owner = getOwners().find((o) => o.id === edit.ownerId);
    if (owner && !owner.propertyIds.includes(edit.id)) {
      saveOwner({ ...owner, propertyIds: [...owner.propertyIds, edit.id] });
    }
    setList(getProperties());
    setEdit(null);
    onChange();
  };

  const remove = (id) => {
    if (!confirm('Delete this property?')) return;
    deleteProperty(id);
    setList(getProperties());
    onChange();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">Create & manage stay listings</p>
        </div>
        <button
          type="button"
          onClick={() => setEdit(blank())}
          className="h-10 px-4 rounded-xl bg-turtle-600 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus size={14} /> Add property
        </button>
      </div>

      <div className="grid gap-3">
        {list.map((p) => (
          <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4 flex gap-4">
            <div
              className="w-20 h-20 rounded-xl bg-cover bg-center shrink-0 border border-gray-100"
              style={{ backgroundImage: `url(${p.images[0]})` }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.destination} · {p.category} · {p.rooms?.length || 0} room types
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{p.location}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <IconBtn onClick={() => setEdit({ ...p })}>
                    <Pencil size={13} />
                  </IconBtn>
                  <IconBtn onClick={() => remove(p.id)}>
                    <Trash2 size={13} />
                  </IconBtn>
                </div>
              </div>
              <span
                className={`inline-flex mt-2 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                  p.active
                    ? 'bg-turtle-50 text-turtle-700 border-turtle-100'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                {p.active ? 'Active' : 'Hidden'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <Modal title={edit.name ? 'Edit property' : 'New property'} onClose={() => setEdit(null)}>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <Field label="Name">
              <input className="sa-input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <input className="sa-input" value={edit.tagline} onChange={(e) => setEdit({ ...edit, tagline: e.target.value })} />
            </Field>
            <Field label="Description">
              <textarea className="sa-input min-h-[80px]" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Destination">
                <select className="sa-input" value={edit.destination} onChange={(e) => setEdit({ ...edit, destination: e.target.value })}>
                  <option value="shimla">Shimla</option>
                  <option value="manali">Manali</option>
                  <option value="kasol">Kasol</option>
                </select>
              </Field>
              <Field label="Category">
                <select className="sa-input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Owner">
              <select className="sa-input" value={edit.ownerId} onChange={(e) => setEdit({ ...edit, ownerId: e.target.value })}>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input className="sa-input" value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
            </Field>
            <Field label="Image URL">
              <input
                className="sa-input"
                value={edit.images[0] || ''}
                onChange={(e) => setEdit({ ...edit, images: [e.target.value, ...(edit.images.slice(1) || [])] })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={edit.active}
                onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
              />
              Active on guest site
            </label>
          </div>
          <div className="flex gap-2 mt-5">
            <button type="button" onClick={() => setEdit(null)} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium">Cancel</button>
            <button type="button" onClick={save} className="flex-1 h-10 rounded-xl bg-turtle-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
              <Save size={14} /> Save
            </button>
          </div>
        </Modal>
      )}
      <AdminStyles />
    </div>
  );
}

function OwnersAdmin({ onChange }) {
  const [list, setList] = useState([]);
  const [edit, setEdit] = useState(null);

  useEffect(() => setList(getOwners()), []);

  const blank = () => ({
    id: `own_${Date.now()}`,
    name: '',
    phone: '',
    pin: generateOtp(6),
    propertyIds: [],
    createdAt: new Date().toISOString().slice(0, 10),
  });

  const save = () => {
    if (!edit.name.trim() || !/^\d{6}$/.test(edit.pin)) return;
    saveOwner(edit);
    setList(getOwners());
    setEdit(null);
    onChange();
  };

  const remove = (id) => {
    if (!confirm('Remove this owner?')) return;
    deleteOwner(id);
    setList(getOwners());
    onChange();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Property owners</h1>
          <p className="text-sm text-gray-500 mt-1">Create owners & issue 6-digit portal PINs</p>
        </div>
        <button
          type="button"
          onClick={() => setEdit(blank())}
          className="h-10 px-4 rounded-xl bg-turtle-600 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus size={14} /> Add owner
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">PIN</th>
              <th className="px-4 py-3 font-medium">Properties</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-gray-400">+91 {o.phone}</p>
                </td>
                <td className="px-4 py-3 font-mono text-turtle-700 tracking-widest">{o.pin}</td>
                <td className="px-4 py-3 text-gray-500">{o.propertyIds?.length || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <IconBtn onClick={() => setEdit({ ...o })}><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => remove(o.id)}><Trash2 size={13} /></IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title="Owner" onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <Field label="Name">
              <input className="sa-input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="sa-input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
            </Field>
            <Field label="6-digit PIN">
              <div className="flex gap-2">
                <input
                  className="sa-input font-mono tracking-widest"
                  value={edit.pin}
                  maxLength={6}
                  onChange={(e) => setEdit({ ...edit, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                />
                <button
                  type="button"
                  onClick={() => setEdit({ ...edit, pin: generateOtp(6) })}
                  className="h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold shrink-0"
                >
                  Regenerate
                </button>
              </div>
            </Field>
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

function GuestsAdmin() {
  const guests = getGuests();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">End users</h1>
        <p className="text-sm text-gray-500 mt-1">Guests who logged in or booked</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {guests.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400">No guests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {guests.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-3 font-medium">{g.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">+91 {g.phone}</td>
                  <td className="px-4 py-3">{g.bookings || 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CategoriesAdmin({ onChange }) {
  const [cats, setCats] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => setCats(getCategories()), []);

  const add = () => {
    if (!name.trim()) return;
    const id = name.trim().toLowerCase().replace(/\s+/g, '-');
    const next = [...cats, { id, name: name.trim(), icon: 'home' }];
    saveCategories(next);
    setCats(next);
    setName('');
    onChange();
  };

  const remove = (id) => {
    const next = cats.filter((c) => c.id !== id);
    saveCategories(next);
    setCats(next);
    onChange();
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-gray-500 mt-1">Cabin, homestay, glamping, and more</p>
      </div>
      <div className="flex gap-2">
        <input
          className="sa-input flex-1"
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" onClick={add} className="h-10 px-4 rounded-xl bg-turtle-600 text-white text-xs font-semibold">
          Add
        </button>
      </div>
      <div className="space-y-2">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-[11px] text-gray-400 font-mono">{c.id}</p>
            </div>
            <IconBtn onClick={() => remove(c.id)}><Trash2 size={13} /></IconBtn>
          </div>
        ))}
      </div>
      <AdminStyles />
    </div>
  );
}

function BookingsAdmin() {
  const bookings = getBookings();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">All bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide reservations & OTPs</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
        {bookings.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400">No bookings yet.</p>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">OTP</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.guestName}</p>
                    <p className="text-xs text-gray-400">+91 {b.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{b.propertyName}</p>
                    <p className="text-xs text-gray-400">{b.roomName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {b.checkIn} → {b.checkOut}
                  </td>
                  <td className="px-4 py-3 font-mono tracking-widest text-turtle-700">{b.checkInOtp}</td>
                  <td className="px-4 py-3 font-medium">{formatINR(b.amount)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50">
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AdminCheckIn({ onDone }) {
  const [otp, setOtp] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    setResult(null);
    if (!/^\d{4}$/.test(otp)) {
      setError('Enter 4-digit OTP');
      return;
    }
    const res = checkInWithOtp(otp, 'admin');
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
        <h1 className="text-2xl font-semibold tracking-tight">Check-in conversion</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter guest OTP at property arrival — tracks conversions & creates invoice
        </p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
          className="w-full h-14 text-center text-2xl font-semibold tracking-[0.4em] rounded-2xl border border-gray-200 focus:border-turtle-500"
        />
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        <button
          type="button"
          onClick={submit}
          className="mt-4 w-full h-11 rounded-2xl bg-turtle-600 text-white text-sm font-semibold"
        >
          Verify OTP & invoice
        </button>
      </div>
      {result?.invoice && (
        <div className="rounded-2xl border border-turtle-200 bg-white p-5 space-y-2 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-turtle-600" size={18} />
            <span className="font-semibold">Conversion recorded</span>
          </div>
          <Row label="Guest" value={result.invoice.guestName} />
          <Row label="Amount" value={formatINR(result.invoice.amount)} />
          <Row label="Picoso 10%" value={formatINR(result.invoice.picosoShare)} />
          <Row label="Owner share" value={formatINR(result.invoice.ownerShare)} />
        </div>
      )}
    </div>
  );
}

function InvoicesAdmin() {
  const invoices = getInvoices();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">All check-in invoices & commission splits</p>
      </div>
      <div className="space-y-3">
        {invoices.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-white">
            No invoices yet.
          </p>
        )}
        {invoices.map((inv) => (
          <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{inv.guestName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {inv.propertyName} · via {inv.actor} · {new Date(inv.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatINR(inv.amount)}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-turtle-50 border border-turtle-100 px-3 py-2">
                <p className="text-turtle-600/80">Picoso</p>
                <p className="font-semibold text-turtle-800 mt-0.5">{formatINR(inv.picosoShare)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                <p className="text-gray-400">Owner</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatINR(inv.ownerShare)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function IconBtn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function AdminStyles() {
  return (
    <style jsx global>{`
      .sa-input {
        width: 100%;
        height: 2.5rem;
        padding: 0 0.75rem;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        background: #fff;
        font-size: 0.8125rem;
      }
      .sa-input:focus {
        border-color: #14b8a6;
      }
      textarea.sa-input {
        height: auto;
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
      }
    `}</style>
  );
}
