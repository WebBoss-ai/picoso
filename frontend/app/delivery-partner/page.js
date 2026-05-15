'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LogOut, Package, CheckCircle2, Clock, MapPin, Phone, User,
  Banknote, Smartphone, RefreshCw, ChevronRight, X, Navigation,
  Bike, AlertCircle, TrendingUp, IndianRupee, Star, ArrowLeft,
  Loader2, Eye, Coffee
} from 'lucide-react';
import { delivery } from '@/lib/api';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const timeSince = (d) => {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};
const STATUS_COLORS = {
  pending:          'bg-yellow-100 text-yellow-700',
  confirmed:        'bg-blue-100 text-blue-700',
  preparing:        'bg-violet-100 text-violet-700',
  'out-for-delivery': 'bg-orange-100 text-orange-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
};
const STATUS_LABEL = {
  pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  'out-for-delivery': 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};

// ─── Map component (OpenStreetMap + Nominatim, no API key) ──────────────────
function AddressMap({ address }) {
  const [coords, setCoords] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    if (!address) { setMapLoading(false); return; }
    const q = encodeURIComponent(address);
    fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'en' }
    })
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
      })
      .catch(() => {})
      .finally(() => setMapLoading(false));
  }, [address]);

  const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;

  if (mapLoading) {
    return <div className="h-44 rounded-2xl shimmer" />;
  }

  return (
    <div className="space-y-2">
      {coords ? (
        <div className="relative rounded-2xl overflow-hidden border border-surface-200 shadow-sm">
          <iframe
            title="delivery-map"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.008},${coords.lat - 0.008},${coords.lon + 0.008},${coords.lat + 0.008}&layer=mapnik&marker=${coords.lat},${coords.lon}`}
            className="w-full h-44 pointer-events-none"
            loading="lazy"
          />
          <div className="absolute bottom-2 right-2">
            <a href={gmaps} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-md border border-gray-200 hover:bg-gray-50 transition-colors">
              <Navigation size={12} className="text-blue-600" /> Navigate
            </a>
          </div>
        </div>
      ) : (
        <div className="h-44 rounded-2xl bg-surface-50 border border-dashed border-surface-300 flex flex-col items-center justify-center gap-2">
          <MapPin size={22} className="text-gray-300" />
          <p className="text-xs text-gray-400">Map unavailable for this address</p>
          <a href={gmaps} target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
            <Navigation size={11} /> Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Order Detail Modal ─────────────────────────────────────────────────────
function OrderModal({ order, onClose, onPickup, onDeliver, loading }) {
  if (!order) return null;
  const addr = order.deliveryAddress;
  const fullAddr = [addr?.fullAddress, addr?.landmark, addr?.area, addr?.city].filter(Boolean).join(', ');
  const isCOD = order.paymentMethod === 'cod';
  const grandTotal = (order.totalPrice || 0) + (order.deliveryFee || 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-end sm:items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <div>
                <p className="text-xs text-gray-400 font-medium">Order</p>
                <p className="text-lg font-bold text-gray-900">#{order._id?.slice(-6).toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[order.status] || order.status}
                </span>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-5">

              {/* Map */}
              <AddressMap address={fullAddr} />

              {/* Address */}
              <div className="flex gap-3 p-4 bg-surface-50 rounded-2xl border border-surface-100">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={17} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Delivery Address</p>
                  <p className="text-sm font-semibold text-gray-900">{addr?.fullAddress || 'Address not provided'}</p>
                  {addr?.landmark && <p className="text-xs text-gray-500">Near: {addr.landmark}</p>}
                  {(addr?.area || addr?.city) && (
                    <p className="text-xs text-gray-500 mt-0.5">{[addr.area, addr.city].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>

              {/* Customer & Payment row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-surface-50 rounded-2xl border border-surface-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Customer</p>
                  <div className="flex items-center gap-2 mb-1">
                    <User size={13} className="text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900 truncate">{order.customerName || '—'}</p>
                  </div>
                  {order.phone && (
                    <a href={`tel:${order.phone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline mt-1">
                      <Phone size={11} /> {order.phone}
                    </a>
                  )}
                </div>

                <div className={`p-3.5 rounded-2xl border ${isCOD ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Payment</p>
                  <div className="flex items-center gap-1.5 mb-1">
                    {isCOD ? <Banknote size={14} className="text-orange-600" /> : <Smartphone size={14} className="text-green-600" />}
                    <p className={`text-xs font-bold ${isCOD ? 'text-orange-700' : 'text-green-700'}`}>
                      {isCOD ? 'Cash on Delivery' : 'UPI Paid'}
                    </p>
                  </div>
                  <p className={`text-xl font-extrabold ${isCOD ? 'text-orange-700' : 'text-green-700'}`}>
                    ₹{grandTotal}
                  </p>
                  {isCOD && (
                    <p className="text-[10px] text-orange-600 font-semibold mt-0.5">⚠ Collect cash</p>
                  )}
                  {!isCOD && (
                    <p className="text-[10px] text-green-600 font-semibold mt-0.5">✓ Already paid</p>
                  )}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="bg-surface-50 rounded-2xl border border-surface-100 px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Items subtotal</span>
                  <span>₹{order.totalPrice}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-brand-600">
                    <span>Platinum discount</span>
                    <span>−₹{order.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Delivery fee</span>
                  <span>₹{order.deliveryFee || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-surface-200">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Order Items ({order.items?.length || 0})
                </p>
                <div className="space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl border border-surface-100">
                      <div className="w-9 h-9 bg-surface-200 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800">₹{item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div className="flex gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock size={11} /> Ordered {timeSince(order.createdAt)}
                </div>
                {order.pickedUpAt && (
                  <div className="flex items-center gap-1">
                    <Bike size={11} /> Picked {fmt(order.pickedUpAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Action footer */}
            <div className="px-5 pb-5">
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                order.status === 'out-for-delivery' ? (
                  <button
                    onClick={() => onDeliver(order._id)}
                    disabled={loading}
                    className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', boxShadow: '0 4px 20px rgba(22,163,74,0.3)' }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    {loading ? 'Processing...' : 'Mark as Delivered'}
                  </button>
                ) : (
                  <button
                    onClick={() => onPickup(order._id)}
                    disabled={loading}
                    className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', boxShadow: '0 4px 20px rgba(37,99,235,0.3)' }}
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Bike size={20} />}
                    {loading ? 'Processing...' : 'Pick Up Order'}
                  </button>
                )
              )}
              {order.status === 'delivered' && (
                <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-bold">
                  <CheckCircle2 size={18} /> Delivered at {fmt(order.deliveredAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────────────
function OrderCard({ order, onView, compact = false }) {
  const addr = order.deliveryAddress;
  const isCOD = order.paymentMethod === 'cod';
  const grandTotal = (order.totalPrice || 0) + (order.deliveryFee || 0);

  return (
    <div
      onClick={() => onView(order)}
      className="bg-white rounded-2xl border border-surface-100 p-4 cursor-pointer hover:border-brand-300 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-400">#</span>
            <span className="text-sm font-bold text-gray-900">{order._id?.slice(-6).toUpperCase()}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-500'}`}>
              {STATUS_LABEL[order.status] || order.status}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={11} /> {order.customerName || 'Customer'}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-base font-extrabold ${isCOD ? 'text-orange-600' : 'text-green-600'}`}>
            ₹{grandTotal}
          </div>
          <div className={`text-[10px] font-bold ${isCOD ? 'text-orange-500' : 'text-green-500'}`}>
            {isCOD ? 'COD' : 'UPI Paid'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
        <MapPin size={11} className="flex-shrink-0" />
        <span className="truncate">{[addr?.area || addr?.fullAddress, addr?.city].filter(Boolean).join(', ') || 'Address on record'}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Package size={11} /> {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
          <span className="mx-1">·</span>
          <Clock size={11} /> {timeSince(order.createdAt)}
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-brand-600 group-hover:gap-2 transition-all">
          View <ChevronRight size={13} />
        </div>
      </div>
    </div>
  );
}

// ─── Active Delivery Banner ─────────────────────────────────────────────────
function ActiveDeliveryBanner({ order, onView, onDeliver, actionLoading }) {
  if (!order) return null;
  const addr = order.deliveryAddress;
  const isCOD = order.paymentMethod === 'cod';
  const grandTotal = (order.totalPrice || 0) + (order.deliveryFee || 0);

  return (
    <div className="rounded-3xl overflow-hidden shadow-xl mb-6"
      style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #34d399, #6ee7b7, #34d399)' }} />

      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-300 text-xs font-bold uppercase tracking-widest">Active Delivery</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs mb-0.5">Order</p>
            <p className="text-white font-extrabold text-xl">#{order._id?.slice(-6).toUpperCase()}</p>
            <p className="text-green-200 text-sm mt-1 font-medium">{order.customerName}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs mb-0.5">{isCOD ? 'Collect' : 'Paid'}</p>
            <p className={`text-2xl font-extrabold ${isCOD ? 'text-yellow-300' : 'text-green-300'}`}>₹{grandTotal}</p>
            <p className={`text-xs font-bold mt-0.5 ${isCOD ? 'text-yellow-400' : 'text-green-400'}`}>
              {isCOD ? '⚠ Cash' : '✓ Online'}
            </p>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-3.5 mb-4 flex gap-3">
          <MapPin size={16} className="text-green-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-snug">{addr?.fullAddress}</p>
            {addr?.landmark && <p className="text-green-200 text-xs mt-0.5">Near: {addr.landmark}</p>}
            {(addr?.area || addr?.city) && <p className="text-green-200 text-xs">{[addr?.area, addr?.city].filter(Boolean).join(', ')}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {order.phone && (
            <a href={`tel:${order.phone}`}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl flex-shrink-0 transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Phone size={16} className="text-green-300" />
              <span className="text-white text-sm font-semibold">{order.phone}</span>
            </a>
          )}
          <div className="flex gap-2 flex-1">
            <button onClick={() => onView(order)}
              className="flex-1 py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
              <Eye size={14} /> Details
            </button>
            <button onClick={() => onDeliver(order._id)} disabled={actionLoading}
              className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', color: '#064e3b', boxShadow: '0 4px 16px rgba(52,211,153,0.35)' }}>
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {actionLoading ? '...' : 'Delivered'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Login Page ──────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await delivery.login({ email, password });
      localStorage.setItem('picoso_delivery_token', res.data.token);
      localStorage.setItem('picoso_delivery_partner', JSON.stringify(res.data.partner));
      onLogin(res.data.partner);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}>

      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #818cf8 0%, transparent 70%)', filter: 'blur(30px)' }} />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}>
            <Bike size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Delivery Partner</h1>
          <p className="text-indigo-300 text-sm mt-1">Picoso Kitchen Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="d1@picoso.in"
                className="w-full px-4 py-3 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-medium text-red-300"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 mt-2"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)' }}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : <>Sign In <ChevronRight size={16} /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Picoso Kitchen · Delivery Partner Portal
        </p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DeliveryPartnerPage() {
  const [partner, setPartner]             = useState(null);
  const [authChecked, setAuthChecked]     = useState(false);
  const [available, setAvailable]         = useState([]);
  const [active, setActive]               = useState(null);
  const [history, setHistory]             = useState([]);
  const [stats, setStats]                 = useState({ todayDeliveries: 0, todayEarnings: 0, totalDeliveries: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dataLoading, setDataLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastRefresh, setLastRefresh]     = useState(null);
  const [tab, setTab]                     = useState('available'); // available | history
  const pollRef = useRef(null);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('picoso_delivery_token');
    const saved = localStorage.getItem('picoso_delivery_partner');
    if (token && saved) {
      try { setPartner(JSON.parse(saved)); } catch { }
    }
    setAuthChecked(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!localStorage.getItem('picoso_delivery_token')) return;
    try {
      const [avRes, acRes, hiRes, stRes] = await Promise.all([
        delivery.getAvailable(),
        delivery.getActive(),
        delivery.getHistory(),
        delivery.getStats(),
      ]);
      setAvailable(avRes.data.orders || []);
      setActive(acRes.data.order || null);
      setHistory(hiRes.data.orders || []);
      setStats(stRes.data.stats || {});
      setLastRefresh(new Date());
    } catch { /* token expired → will show login */ }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => {
    if (!partner) return;
    loadData();
    pollRef.current = setInterval(loadData, 30000);
    return () => clearInterval(pollRef.current);
  }, [partner, loadData]);

  const handlePickup = async (id) => {
    setActionLoading(true);
    try {
      await delivery.pickup(id);
      setSelectedOrder(null);
      await loadData();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to pick up order');
    } finally { setActionLoading(false); }
  };

  const handleDeliver = async (id) => {
    setActionLoading(true);
    try {
      await delivery.deliver(id);
      setSelectedOrder(null);
      await loadData();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to mark delivered');
    } finally { setActionLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('picoso_delivery_token');
    localStorage.removeItem('picoso_delivery_partner');
    clearInterval(pollRef.current);
    setPartner(null);
  };

  // Not yet checked
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  // Not logged in
  if (!partner) {
    return <LoginPage onLogin={(p) => setPartner(p)} />;
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-[#f5f6f8]">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-surface-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <Bike size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{partner.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-green-600 font-semibold">Online</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <p className="text-[10px] text-gray-400 hidden sm:block">Updated {fmt(lastRefresh)}</p>
            )}
            <button onClick={loadData}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors text-gray-400">
              <RefreshCw size={15} />
            </button>
            <button onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24">

        {/* ── Stats strip ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Today's Orders", value: stats.todayDeliveries, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: "Today's Earnings", value: `₹${stats.todayEarnings}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Delivered', value: stats.totalDeliveries, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3.5 border border-surface-100 shadow-sm">
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon size={16} className={s.color} />
              </div>
              <p className="text-lg font-extrabold text-gray-900 leading-none">{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {dataLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-surface-100">
                <div className="flex gap-3">
                  <div className="h-5 shimmer rounded w-1/3" />
                  <div className="h-5 shimmer rounded w-1/4 ml-auto" />
                </div>
                <div className="h-3 shimmer rounded w-2/3 mt-3" />
                <div className="h-3 shimmer rounded w-1/2 mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ── Active delivery ─────────────────────────────── */}
            {active && (
              <ActiveDeliveryBanner
                order={active}
                onView={setSelectedOrder}
                onDeliver={handleDeliver}
                actionLoading={actionLoading}
              />
            )}

            {/* ── Tabs ────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-surface-100 rounded-2xl mb-4">
              <button
                onClick={() => setTab('available')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'available' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Available
                {available.length > 0 && (
                  <span className="ml-2 bg-brand-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {available.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTab('history')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Today&apos;s History
                {history.length > 0 && (
                  <span className="ml-2 bg-surface-300 text-gray-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {history.length}
                  </span>
                )}
              </button>
            </div>

            {/* ── Available orders ────────────────────────────── */}
            {tab === 'available' && (
              <div>
                {available.length === 0 && !active ? (
                  <div className="bg-white rounded-2xl border border-surface-100 py-14 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center">
                      <Package size={24} className="text-gray-300" />
                    </div>
                    <p className="font-bold text-gray-400">No orders available</p>
                    <p className="text-xs text-gray-400 text-center max-w-xs">New orders will appear here automatically every 30 seconds.</p>
                    <button onClick={loadData} className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline mt-1">
                      <RefreshCw size={12} /> Refresh now
                    </button>
                  </div>
                ) : available.length === 0 && active ? (
                  <div className="bg-white rounded-2xl border border-surface-100 py-8 flex flex-col items-center gap-2">
                    <Bike size={20} className="text-green-400" />
                    <p className="text-sm font-semibold text-gray-400">Focus on your active delivery!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {available.map(order => (
                      <OrderCard key={order._id} order={order} onView={setSelectedOrder} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Today's history ──────────────────────────────── */}
            {tab === 'history' && (
              <div>
                {history.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-surface-100 py-14 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center">
                      <Star size={22} className="text-gray-300" />
                    </div>
                    <p className="font-bold text-gray-400">No deliveries today</p>
                    <p className="text-xs text-gray-400">Completed deliveries for today will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map(order => (
                      <div key={order._id} className="bg-white rounded-2xl border border-green-100 p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-green-500" />
                              <span className="text-sm font-bold text-gray-900">#{order._id?.slice(-6).toUpperCase()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{order.customerName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-extrabold text-green-600">₹{(order.totalPrice || 0) + (order.deliveryFee || 0)}</p>
                            <p className="text-[10px] text-gray-400">Delivered {fmt(order.deliveredAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin size={10} />
                          <span className="truncate">{[order.deliveryAddress?.area, order.deliveryAddress?.city].filter(Boolean).join(', ') || '—'}</span>
                          <span className="mx-1">·</span>
                          <span>{order.paymentMethod === 'cod' ? 'COD' : 'UPI'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Order detail modal ──────────────────────────────────── */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPickup={handlePickup}
          onDeliver={handleDeliver}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
