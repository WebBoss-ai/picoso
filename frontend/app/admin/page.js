'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, CreditCard, UtensilsCrossed, Users,
  TrendingUp, ShoppingBag, DollarSign, Clock, Crown, CheckCircle2,
  XCircle, ChevronDown, Search, Plus, Edit, Trash2, Save,
  RefreshCw, Loader2, ArrowUpRight, ArrowDownRight,
  LogOut, Menu, X, Banknote, Smartphone, Percent,
  Activity, PieChart, BarChart2, Zap, AlertTriangle,
  ToggleLeft, ToggleRight, GripVertical, Tag,
  Store, BellRing, PhoneCall, CheckCheck, Power, ShoppingCart,
  MapPin, Navigation, QrCode, Wallet, ScanLine, IndianRupee,
  UserCheck, BadgeDollarSign, ChevronRight,
} from 'lucide-react';
import { admin, adminAgents, agentAuth as agentAuthApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SIDEBAR_ITEMS = [
  { id: 'overview',       label: 'Overview',        icon: LayoutDashboard },
  { id: 'store',          label: 'Store',            icon: Store },
  { id: 'orders',         label: 'Orders',           icon: Package },
  { id: 'zones',          label: 'Delivery Zones',   icon: MapPin },
  { id: 'payments',       label: 'Payments',         icon: CreditCard },
  { id: 'platinum',       label: 'Platinum',         icon: Crown },
  { id: 'subscriptions',  label: 'Subscriptions',    icon: Zap },
  { id: 'products',       label: 'Products',         icon: UtensilsCrossed },
  { id: 'categories',     label: 'Categories',       icon: Menu },
  { id: 'users',          label: 'Users',            icon: Users },
  { id: 'agents',         label: 'Ad Agents',        icon: QrCode },
];

// ─── Store location & distance utilities ─────────────────────────────────────
const STORE_LAT = 28.437099;
const STORE_LNG = 77.072771;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

// Google Maps route: store → customer
function mapsRouteUrl(lat, lng) {
  return `https://www.google.com/maps/dir/${STORE_LAT},${STORE_LNG}/${lat},${lng}`;
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  'out-for-delivery': 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color = 'brand', trend, trendUp }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <div className="flex items-center justify-between mt-1">
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${trendUp ? 'text-brand-600' : 'text-red-500'}`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Bar Chart (pure SVG) ─────────────────────────────────────────────────────
function BarChart({ data, valueKey = 'orders', color = '#22c55e', height = 120 }) {
  if (!data?.length) return <div className="h-32 flex items-center justify-center text-xs text-gray-400">No data</div>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const barW = 100 / data.length;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="relative">
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const barH = (d[valueKey] / max) * (height - 20);
          const x = i * barW + barW * 0.15;
          const w = barW * 0.7;
          const y = height - 16 - barH;
          return (
            <g key={i}>
              <rect x={`${x}%`} y={y} width={`${w}%`} height={barH}
                fill={color} rx="3" opacity="0.85" />
              <text x={`${i * barW + barW / 2}%`} y={height - 2}
                textAnchor="middle" fontSize="5" fill="#9ca3af">
                {days[new Date(d.date).getDay()]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Line Chart (pure SVG) ────────────────────────────────────────────────────
function LineChart({ data, valueKey = 'revenue', color = '#22c55e', height = 100 }) {
  if (!data?.length) return <div className="h-24 flex items-center justify-center text-xs text-gray-400">No data</div>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 98 + 1;
    const y = ((1 - d[valueKey] / max) * (height - 20)) + 5;
    return `${x},${y}`;
  });
  const areaBottom = `100,${height - 10} 0,${height - 10}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts.join(' ')} ${areaBottom}`} fill="url(#lineGrad)" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',');
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />;
      })}
    </svg>
  );
}

// ─── Donut Chart (pure SVG) ───────────────────────────────────────────────────
function DonutChart({ segments, size = 90 }) {
  // segments: [{ label, value, color }]
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="flex items-center justify-center text-xs text-gray-400" style={{ width: size, height: size }}>No data</div>;

  let cumulative = 0;
  const r = 30; const cx = 50; const cy = 50;
  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    return { ...seg, d: `M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} Z`, pct };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" />
      {arcs.map((arc, i) => (
        <path key={i} d={arc.d} fill={arc.color} opacity="0.9" />
      ))}
      <circle cx={cx} cy={cy} r={18} fill="white" />
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#111827">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="4.5" fill="#6b7280">orders</text>
    </svg>
  );
}

// ─── Hourly Bar (mini) ────────────────────────────────────────────────────────
function HourlyChart({ hourlyData, height = 60 }) {
  if (!hourlyData) return null;
  const max = Math.max(...hourlyData, 1);
  const barW = 100 / 24;

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {hourlyData.map((val, i) => {
          const barH = (val / max) * (height - 12);
          const x = i * barW + barW * 0.1;
          const w = barW * 0.8;
    return (
            <g key={i}>
              <rect x={`${x}%`} y={height - 10 - barH} width={`${w}%`} height={barH}
                fill="#22c55e" rx="1" opacity={val > 0 ? 0.8 : 0.15} />
            </g>
          );
        })}
        {[0, 6, 12, 18, 23].map(h => (
          <text key={h} x={`${h * barW + barW / 2}%`} y={height - 1} textAnchor="middle" fontSize="4.5" fill="#9ca3af">
            {h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
          </text>
        ))}
      </svg>
      </div>
    );
  }

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#22c55e', label, subLabel }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 truncate">{label}</span>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{subLabel}</span>
        </div>
        <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ─── Overview Section ─────────────────────────────────────────────────────────
function OverviewSection({ stats, onRefresh }) {
  const s = stats || {};
  const totalRevDisplay = s.totalRevenue ? `₹${s.totalRevenue.toLocaleString('en-IN')}` : '₹0';
  const codRevDisplay = s.codRevenue ? `₹${s.codRevenue.toLocaleString('en-IN')}` : '₹0';
  const upiRevDisplay = s.upiRevenue ? `₹${s.upiRevenue.toLocaleString('en-IN')}` : '₹0';

  const paymentSegments = [
    { label: 'COD', value: s.codOrderCount || 0, color: '#6366f1' },
    { label: 'UPI', value: s.upiOrderCount || 0, color: '#22c55e' },
  ];

  const statusSegments = [
    { label: 'Delivered', value: s.statusDistribution?.delivered || 0, color: '#22c55e' },
    { label: 'Preparing', value: s.statusDistribution?.preparing || 0, color: '#a855f7' },
    { label: 'Confirmed', value: s.statusDistribution?.confirmed || 0, color: '#3b82f6' },
    { label: 'Pending', value: s.statusDistribution?.pending || 0, color: '#f59e0b' },
    { label: 'Cancelled', value: s.statusDistribution?.cancelled || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-5">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={onRefresh} className="btn-secondary text-xs px-3 py-2">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Alerts row */}
      {(s.pendingUpiPayments > 0 || s.pendingPlatinum > 0) && (
        <div className="flex flex-wrap gap-3">
          {s.pendingUpiPayments > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
              <AlertTriangle size={13} />
              {s.pendingUpiPayments} UPI payment{s.pendingUpiPayments > 1 ? 's' : ''} need approval
            </div>
          )}
          {s.pendingPlatinum > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700 font-medium">
              <Crown size={13} />
              {s.pendingPlatinum} Platinum activation{s.pendingPlatinum > 1 ? 's' : ''} pending
            </div>
          )}
        </div>
      )}

      {/* KPI row — Today */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Today</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Orders" value={s.todayOrders ?? 0} icon={<ShoppingBag size={14} />} color="brand" sub="Today" />
          <StatCard label="Revenue" value={s.todayRevenue ? `₹${s.todayRevenue}` : '₹0'} icon={<TrendingUp size={14} />} color="green" sub="Confirmed paid" />
          <StatCard label="New Users" value={s.newUsersWeek ?? 0} icon={<Users size={14} />} color="blue" sub="This week" />
          <StatCard label="Avg Order" value={s.avgOrderValue ? `₹${s.avgOrderValue}` : '₹0'} icon={<Activity size={14} />} color="purple" sub="Per order" />
        </div>
      </div>

      {/* Revenue breakdown cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Revenue Breakdown</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total */}
          <div className="card p-5 bg-gradient-to-br from-brand-50 to-brand-100 border-brand-200">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">Total Collected</p>
            <p className="text-3xl font-extrabold text-brand-700">{totalRevDisplay}</p>
            <p className="text-xs text-brand-500 mt-1">UPI approved + COD delivered</p>
          </div>
          {/* COD */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Banknote size={12} className="text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">COD Collected</p>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{codRevDisplay}</p>
            <p className="text-xs text-gray-400 mt-1">{s.codDeliveredCount ?? 0} delivered orders</p>
            {(s.codPendingCollection || 0) > 0 && (
              <div className="mt-2 px-2.5 py-1.5 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700 font-medium">₹{s.codPendingCollection} pending collection</p>
              </div>
            )}
          </div>
          {/* UPI */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
                <Smartphone size={12} className="text-brand-600" />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">UPI Collected</p>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{upiRevDisplay}</p>
            <p className="text-xs text-gray-400 mt-1">{s.upiOrderCount ?? 0} UPI orders</p>
            {(s.pendingUpiPayments || 0) > 0 && (
              <div className="mt-2 px-2.5 py-1.5 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700 font-medium">{s.pendingUpiPayments} awaiting approval</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly orders bar chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Orders — Last 7 Days</p>
              <p className="text-xs text-gray-400">Daily order volume</p>
            </div>
            <BarChart2 size={15} className="text-gray-300" />
          </div>
          <BarChart data={s.weeklyTrend || []} valueKey="orders" color="#22c55e" height={110} />
        </div>

        {/* Payment method donut */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Payment Mix</p>
              <p className="text-xs text-gray-400">COD vs UPI</p>
            </div>
            <PieChart size={15} className="text-gray-300" />
          </div>
          <div className="flex items-center justify-center mb-3">
            <DonutChart segments={paymentSegments} size={100} />
          </div>
          <div className="space-y-1.5">
            {paymentSegments.map(seg => (
              <div key={seg.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                  <span className="text-gray-600">{seg.label}</span>
                </div>
                <span className="font-bold text-gray-900">{seg.value} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue line chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Revenue Trend — Last 7 Days</p>
            <p className="text-xs text-gray-400">Total order value per day</p>
          </div>
          <TrendingUp size={15} className="text-gray-300" />
        </div>
        <LineChart data={s.weeklyTrend || []} valueKey="revenue" color="#22c55e" height={100} />
        {/* Day labels */}
        <div className="flex justify-between mt-1 px-1">
          {(s.weeklyTrend || []).map(d => (
            <span key={d.date} className="text-xs text-gray-400">
              {['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(d.date).getDay()]}
            </span>
          ))}
        </div>
      </div>

      {/* Hourly + Status row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly distribution */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Today's Order Hours</p>
              <p className="text-xs text-gray-400">When orders are placed</p>
            </div>
            <Clock size={15} className="text-gray-300" />
          </div>
          <HourlyChart hourlyData={s.hourlyToday} height={70} />
          {s.hourlyToday && (() => {
            const peak = s.hourlyToday.indexOf(Math.max(...s.hourlyToday));
            const peakLabel = peak === 0 ? '12am' : peak < 12 ? `${peak}am` : peak === 12 ? '12pm' : `${peak - 12}pm`;
            return s.hourlyToday[peak] > 0 ? (
              <p className="text-xs text-gray-400 mt-2">Peak hour: <span className="font-semibold text-gray-700">{peakLabel}</span></p>
            ) : <p className="text-xs text-gray-400 mt-2">No orders yet today</p>;
          })()}
        </div>

        {/* Order status distribution */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Order Status Distribution</p>
              <p className="text-xs text-gray-400">All-time breakdown</p>
            </div>
            <Activity size={15} className="text-gray-300" />
          </div>
          <div className="space-y-2.5">
            {statusSegments.map(seg => (
              <ProgressBar
                key={seg.label}
                label={seg.label}
                value={seg.value}
                max={s.totalOrders || 1}
                color={seg.color}
                subLabel={`${seg.value} (${s.totalOrders > 0 ? Math.round((seg.value / s.totalOrders) * 100) : 0}%)`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Top products + User metrics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Top Products</p>
            <Zap size={15} className="text-gray-300" />
          </div>
          {s.topProducts?.length > 0 ? (
            <div className="space-y-3">
              {s.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-surface-100 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p._id || 'Unknown'}</p>
                    <div className="h-1.5 bg-surface-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.round((p.count / (s.topProducts[0]?.count || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-gray-900">{p.count} sold</p>
                    <p className="text-xs text-gray-400">₹{p.revenue || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4 text-center">No product data yet</p>
          )}
        </div>

        {/* User behaviour metrics */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">User Behaviour</p>
            <Users size={15} className="text-gray-300" />
          </div>
          <div className="space-y-3">
            <StatMini label="Total Users" value={s.totalUsers ?? 0} icon="👥" />
            <StatMini label="New This Week" value={s.newUsersWeek ?? 0} icon="🆕" />
            <StatMini label="Platinum Members" value={s.activePlatinum ?? 0} icon="👑" sub={`${s.platinumRate ?? 0}% of users`} />
            <StatMini label="Avg Order Value" value={s.avgOrderValue ? `₹${s.avgOrderValue}` : '₹0'} icon="💰" />
            <div className="pt-2 border-t border-surface-100 space-y-2">
              <ProgressBar label="Delivery Rate" value={s.deliveryRate ?? 0} max={100} color="#22c55e"
                subLabel={`${s.deliveryRate ?? 0}%`} />
              <ProgressBar label="Cancellation Rate" value={s.cancellationRate ?? 0} max={100} color="#f87171"
                subLabel={`${s.cancellationRate ?? 0}%`} />
              <ProgressBar label="Platinum Adoption" value={s.platinumRate ?? 0} max={100} color="#fb923c"
                subLabel={`${s.platinumRate ?? 0}%`} />
            </div>
          </div>
        </div>
      </div>

      {/* All-time summary row */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">All Time</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Orders" value={s.totalOrders ?? 0} icon={<Package size={14} />} color="blue" sub={`${s.deliveredOrders ?? 0} delivered`} />
          <StatCard label="Total Users" value={s.totalUsers ?? 0} icon={<Users size={14} />} color="purple" sub={`${s.newUsersWeek ?? 0} this week`} />
          <StatCard label="Total Revenue" value={totalRevDisplay} icon={<DollarSign size={14} />} color="brand" sub="COD + UPI" />
          <StatCard label="Active Platinum" value={s.activePlatinum ?? 0} icon={<Crown size={14} />} color="orange" sub={`₹${(s.activePlatinum ?? 0) * 299}/mo recurring`} />
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value, icon, sub }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className="text-right">
        <span className="text-sm font-bold text-gray-900">{value}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Orders Section ───────────────────────────────────────────────────────────
function OrderCard({ order, onStatusChange, updating }) {
  const [expanded, setExpanded] = useState(false);

  const addr = order.deliveryAddress || {};
  const addrStr = [addr.fullAddress || addr.area, addr.city].filter(Boolean).join(', ') || '—';
  const subtotal = order.items?.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0) || order.totalPrice;

  // Distance from store
  const hasCoords = addr.lat != null && addr.lng != null;
  const distKm    = hasCoords ? haversineKm(STORE_LAT, STORE_LNG, addr.lat, addr.lng) : null;
  const distLabel = distKm != null ? formatDist(distKm) : null;
  const navUrl    = hasCoords ? mapsRouteUrl(addr.lat, addr.lng) : null;

  const PAYMENT_STATUS_COLORS = {
    pending: 'bg-amber-100 text-amber-700',
    paid:    'bg-green-100 text-green-700',
    failed:  'bg-red-100 text-red-600',
  };

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div
        className="p-4 cursor-pointer hover:bg-surface-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900 text-sm font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {order.status?.replace(/-/g, ' ')}
                </span>
                {order.isPlatinumOrder && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                    <Crown size={9} /> Platinum
                  </span>
                )}
                <span className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 ${order.paymentMethod === 'upi' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {order.paymentMethod === 'upi' ? <Smartphone size={9} /> : <Banknote size={9} />}
                  {order.paymentMethod?.toUpperCase()}
                </span>
                {order.paymentStatus && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PAYMENT_STATUS_COLORS[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {order.paymentStatus}
                  </span>
                )}
                {/* Distance badge */}
                {distLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1">
                    <MapPin size={8} /> {distLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {order.userId?.name || order.customerName || 'Unknown'} &nbsp;•&nbsp;
                +91 {order.userId?.phone || order.phone}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-extrabold text-gray-900 text-base">₹{order.totalPrice}</p>
              <p className="text-[10px] text-gray-400">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-surface-100 bg-surface-50/40">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Items ordered */}
            <div className="sm:col-span-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Items Ordered</p>
              <div className="space-y-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white rounded-xl p-2.5 border border-surface-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed size={14} className="text-brand-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      {item.type === 'custom' && item.customIngredients?.length > 0 && (
                        <p className="text-[10px] text-gray-400 truncate">
                          Custom: {item.customIngredients.map(ci => ci.name || ci).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-gray-900">₹{item.price} × {item.quantity || 1}</p>
                      <p className="text-xs text-gray-400">= ₹{item.price * (item.quantity || 1)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price breakdown */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Price Breakdown</p>
              <div className="bg-white rounded-xl p-3 border border-surface-100 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal}</span></div>
                {order.deliveryFee !== undefined && (
                  <div className="flex justify-between text-gray-600"><span>Delivery fee</span><span>₹{order.deliveryFee}</span></div>
                )}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-brand-600"><span>Discount</span><span>−₹{order.discountAmount}</span></div>
                )}
                <div className="flex justify-between font-extrabold text-gray-900 pt-1.5 border-t border-surface-100">
                  <span>Total</span><span>₹{order.totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Delivery info */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Delivery Details</p>
              <div className="bg-white rounded-xl p-3 border border-surface-100 space-y-1.5 text-xs text-gray-600">
                <p><span className="font-semibold text-gray-700">Address: </span>{addrStr}</p>
                {addr.landmark && <p><span className="font-semibold text-gray-700">Landmark: </span>{addr.landmark}</p>}
                {order.phone && <p><span className="font-semibold text-gray-700">Phone: </span>+91 {order.phone}</p>}
                {hasCoords && (
                  <p className="flex items-center gap-1">
                    <span className="font-semibold text-gray-700">GPS: </span>
                    <span className="font-mono text-[10px] text-gray-500">{addr.lat.toFixed(5)}, {addr.lng.toFixed(5)}</span>
                    {distLabel && (
                      <span className="ml-1 font-bold text-cyan-700">· {distLabel}</span>
                    )}
                  </p>
                )}
                {order.upiRef && <p><span className="font-semibold text-gray-700">UPI Ref: </span><span className="font-mono">{order.upiRef}</span></p>}
                {order.pickedUpAt && <p><span className="font-semibold text-gray-700">Picked up: </span>{new Date(order.pickedUpAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>}
                {order.deliveredAt && <p><span className="font-semibold text-gray-700">Delivered: </span>{new Date(order.deliveredAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>}
                {order.estimatedDelivery && <p><span className="font-semibold text-gray-700">ETA: </span>{order.estimatedDelivery}</p>}
                {order.updatedAt && <p><span className="font-semibold text-gray-700">Last updated: </span>{new Date(order.updatedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>}
                {/* Navigate button */}
                {navUrl && (
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                  >
                    <Navigation size={11} /> Navigate to Customer
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Status changer */}
          <div className="px-4 pb-4 flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-500">Update Status:</label>
            <select
              value={order.status}
              onChange={e => onStatusChange(order._id, e.target.value)}
              disabled={updating}
              className="text-xs border border-surface-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 font-medium focus:border-brand-400 outline-none"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
            </select>
            {updating && <Loader2 size={14} className="animate-spin text-brand-500" />}
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersSection() {
  const [orderList, setOrderList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterStatus)  params.status = filterStatus;
    if (filterPayment) params.paymentMethod = filterPayment;
    admin.getOrders(params)
      .then(res => setOrderList(res.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus, filterPayment]);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await admin.updateOrderStatus(id, status);
      setOrderList(list => list.map(o => o._id === id ? { ...o, status } : o));
    } catch {}
    setUpdatingId(null);
  };

  const filtered = orderList.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o._id.toLowerCase().includes(q) ||
      o.userId?.name?.toLowerCase().includes(q) ||
      o.userId?.phone?.includes(q) ||
      o.phone?.includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.upiRef?.toLowerCase().includes(q)
    );
  });

  const totalRevenue = filtered.reduce((s, o) => s + (o.totalPrice || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Orders Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} orders &nbsp;•&nbsp; ₹{totalRevenue.toLocaleString()} total</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-2"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search by order ID, name, phone, UPI ref..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
        </select>
        <select className="input-field sm:w-32" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
          <option value="">All Payment</option>
          <option value="upi">UPI</option>
          <option value="cod">COD</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              onStatusChange={handleStatusChange}
              updating={updatingId === order._id}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Payments Section ─────────────────────────────────────────────────────────
function PaymentsSection() {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const load = () => {
    setLoading(true);
    admin.getOrders({ paymentMethod: 'upi', paymentStatus: 'pending' })
      .then(res => setPendingPayments(res.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await admin.approvePayment(id);
      setPendingPayments(list => list.filter(o => o._id !== id));
    } catch {}
    setProcessingId(null);
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await admin.rejectPayment(id);
      setPendingPayments(list => list.filter(o => o._id !== id));
    } catch {}
    setProcessingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">UPI Payment Approvals</h2>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve UPI payments for food orders</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-2"><RefreshCw size={13} /> Refresh</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : pendingPayments.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={40} className="text-brand-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">All caught up!</p>
          <p className="text-sm text-gray-400">No pending UPI payments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingPayments.map(order => (
            <div key={order._id} className="card p-5 border-l-4 border-amber-400">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900">Order #{order._id.slice(-6).toUpperCase()}</p>
                    <span className="tag-chip bg-amber-100 text-amber-700"><Clock size={10} /> Pending</span>
                  </div>
                  <p className="text-sm text-gray-600">{order.userId?.name || '—'} • +91 {order.userId?.phone || order.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {order.upiRef && (
                    <p className="text-xs text-gray-500 mt-1">Ref: <span className="font-mono text-gray-700">{order.upiRef}</span></p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-gray-900">₹{order.totalPrice}</p>
                  <p className="text-xs text-gray-400">UPI Payment</p>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-surface-100">
                <button
                  onClick={() => handleApprove(order._id)}
                  disabled={processingId === order._id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
                >
                  {processingId === order._id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Approve Payment
                </button>
                <button
                  onClick={() => handleReject(order._id)}
                  disabled={processingId === order._id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 border border-red-200"
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Platinum Approvals Section ───────────────────────────────────────────────
function PlatinumSection() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const load = () => {
    setLoading(true);
    admin.getPlatinumRequests()
      .then(res => setRequests(res.data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await admin.approvePlatinum(id);
      setRequests(list => list.filter(r => r._id !== id));
    } catch {}
    setProcessingId(null);
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await admin.rejectPlatinum(id);
      setRequests(list => list.filter(r => r._id !== id));
    } catch {}
    setProcessingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Platinum Card Approvals</h2>
          <p className="text-sm text-gray-500 mt-0.5">Activate platinum memberships after verifying ₹299 UPI payments</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-2"><RefreshCw size={13} /> Refresh</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center">
          <Crown size={40} className="text-platinum-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No pending requests</p>
          <p className="text-sm text-gray-400">All platinum subscriptions are processed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req._id} className="card p-5 border-l-4 border-orange-400">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown size={15} className="text-platinum-500" />
                    <p className="font-bold text-gray-900">{req.userId?.name || 'User'}</p>
                    <span className="tag-chip bg-orange-100 text-orange-700"><Clock size={10} /> Pending</span>
                  </div>
                  <p className="text-sm text-gray-600">+91 {req.userId?.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">{req.userId?.email}</p>
                  {req.upiRef && <p className="text-xs text-gray-500 mt-1">UTR: <span className="font-mono text-gray-700">{req.upiRef}</span></p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-gray-900">₹299</p>
                  <p className="text-xs text-gray-400">Monthly</p>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-surface-100">
                <button
                  onClick={() => handleApprove(req._id)}
                  disabled={processingId === req._id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-platinum-400 to-platinum-500 hover:from-platinum-500 hover:to-platinum-600 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
                >
                  {processingId === req._id ? <Loader2 size={15} className="animate-spin" /> : <Crown size={15} />}
                  Activate Card
                </button>
            <button
                  onClick={() => handleReject(req._id)}
                  disabled={processingId === req._id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 border border-red-200"
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Products Section ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', description: '', price: '', calories: '', protein: '',
  carbs: '', fats: '', fiber: '', pfCategory: 'pf-meals', isVeg: true,
  isBestseller: false, isChefSpecial: false, available: true, image: '',
  availableFrom: '', availableTo: '', sortOrder: '0', tags: '',
};

function ProductsSection() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch]       = useState('');

  const load = () => {
    setLoading(true);
    admin.getBowls().then(res => setProducts(res.data.bowls || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditItem(null); };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      ...EMPTY_FORM, ...item,
      price: String(item.price || ''),
      calories: String(item.calories || ''),
      protein: String(item.protein || ''),
      carbs: String(item.carbs || 0),
      fats: String(item.fats || 0),
      fiber: String(item.fiber || 0),
      sortOrder: String(item.sortOrder || 0),
      availableFrom: item.availableFrom || '',
      availableTo: item.availableTo || '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'image' && typeof v !== 'string') return;
        fd.append(k, v);
      });
      if (editItem) { await admin.updateBowl(editItem._id, fd); }
      else { await admin.createBowl(fd); }
      load(); setShowForm(false); resetForm();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    setDeletingId(id);
    try { await admin.deleteBowl(id); load(); } catch {}
    setDeletingId(null);
  };

  const F = ({ label, children, span = false }) => (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      {children}
    </div>
  );

  const displayProducts = products.filter(p => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Products Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} items total</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn-primary text-sm px-4 py-2">
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Item</>}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 animate-slide-up border-brand-200">
          <h3 className="font-bold text-gray-900 mb-4">{editItem ? 'Edit' : 'Add New'} Product</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Name *" span><input className="input-field" placeholder="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></F>
            <F label="Description" span><textarea className="input-field resize-none" rows={2} placeholder="Brief description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></F>

            <F label="Price (₹) *">
              <input className="input-field" type="number" placeholder="169" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </F>
            <F label="Category">
              <select className="input-field" value={form.pfCategory} onChange={e => setForm(f => ({ ...f, pfCategory: e.target.value }))}>
                <option value="pf-meals">Bowls</option>
                <option value="pf-wraps">Wraps</option>
                <option value="pf-sandwiches">Sandwiches</option>
                <option value="pf-salads">Salads</option>
              </select>
            </F>

            <F label="Calories (kcal)"><input className="input-field" type="number" placeholder="350" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} /></F>
            <F label="Protein (g)"><input className="input-field" type="number" placeholder="30" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} /></F>
            <F label="Carbs (g)"><input className="input-field" type="number" placeholder="40" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} /></F>
            <F label="Fats (g)"><input className="input-field" type="number" placeholder="10" value={form.fats} onChange={e => setForm(f => ({ ...f, fats: e.target.value }))} /></F>
            <F label="Fiber (g)"><input className="input-field" type="number" placeholder="5" value={form.fiber} onChange={e => setForm(f => ({ ...f, fiber: e.target.value }))} /></F>
            <F label="Sort Order">
              <input className="input-field" type="number" placeholder="0 = first" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
            </F>

            {/* ── Availability window ───────────────────────────── */}
            <F label="Available From (IST time)">
              <input className="input-field" type="time" value={form.availableFrom} onChange={e => setForm(f => ({ ...f, availableFrom: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Leave blank = always available</p>
            </F>
            <F label="Available Until (IST time)">
              <input className="input-field" type="time" value={form.availableTo} onChange={e => setForm(f => ({ ...f, availableTo: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">e.g. 21:00 for 9 PM cutoff</p>
            </F>

            <F label="Image URL" span>
              <input className="input-field" placeholder="https://picoso.in/menu/bowl101.jpg" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
            </F>
            <F label="Tags (comma-separated)" span>
              <input className="input-field" placeholder="protein, healthy, veg" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </F>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Flags</label>
              <div className="flex flex-wrap gap-4">
                {[['isVeg', 'Vegetarian'], ['isBestseller', 'Bestseller'], ['isChefSpecial', "Chef's Special"], ['available', 'Available on menu']].map(([key, lbl]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="w-4 h-4 accent-brand-500" />
                    <span className="text-sm text-gray-700">{lbl}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Availability preview */}
          {form.availableFrom && form.availableTo && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <Clock size={14} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                This item will appear <strong>grayed out</strong> outside <strong>{form.availableFrom} – {form.availableTo} IST</strong>.
                Customers can see it but cannot add to cart.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {editItem ? 'Save Changes' : 'Add Product'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input-field pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-2">
          {displayProducts.map(p => (
            <div key={p._id} className={`card p-4 flex items-start gap-4 ${!p.available ? 'opacity-60' : ''}`}>
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-100 flex-shrink-0">
                {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed size={20} className="text-gray-300" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.isVeg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {p.isVeg ? 'Veg' : 'Non-Veg'}
                  </span>
                  {p.isBestseller && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Bestseller</span>}
                  {p.isChefSpecial && <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">Chef's Special</span>}
                  {!p.available && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Hidden</span>}
                </div>
                <p className="text-xs text-gray-400 line-clamp-1 mb-1">{p.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">₹{p.price}</span>
                  {p.availableFrom && p.availableTo && (
                    <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      <Clock size={9} /> {p.availableFrom}–{p.availableTo}
                    </span>
                  )}
                  {p.availableFrom && !p.availableTo && (
                    <span className="flex items-center gap-1 text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                      <Clock size={9} /> From {p.availableFrom}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDelete(p._id)} disabled={deletingId === p._id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  {deletingId === p._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
          {displayProducts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search ? 'No products match your search.' : 'No products yet.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Categories Section ────────────────────────────────────────────────────────
function CategoriesSection() {
  const [cats, setCats]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ id: '', label: '', description: '', active: false, sortOrder: '0', color: '#f0fdf4' });

  const load = () => {
    setLoading(true);
    admin.getCategories().then(res => setCats(res.data.categories || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggle = async (cat, field, val) => {
    setSaving(cat.id);
    try {
      const res = await admin.updateCategory(cat.id, { [field]: val });
      setCats(list => list.map(c => c.id === cat.id ? res.data.category : c));
    } catch {}
    setSaving(null);
  };

  const updateField = async (cat, field, val) => {
    setSaving(cat.id);
    try {
      const res = await admin.updateCategory(cat.id, { [field]: val });
      setCats(list => list.map(c => c.id === cat.id ? res.data.category : c));
    } catch {}
    setSaving(null);
  };

  const handleCreate = async () => {
    if (!newForm.id || !newForm.label) return;
    setSaving('new');
    try {
      const res = await admin.createCategory({ ...newForm, sortOrder: Number(newForm.sortOrder) });
      setCats(list => [...list, res.data.category]);
      setShowNew(false);
      setNewForm({ id: '', label: '', description: '', active: false, sortOrder: '0', color: '#f0fdf4' });
    } catch {}
    setSaving(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Items using this category will still exist.')) return;
    setSaving(id);
    try { await admin.deleteCategory(id); setCats(list => list.filter(c => c.id !== id)); } catch {}
    setSaving(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Category Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Control which categories are visible on the menu</p>
        </div>
        <button onClick={() => setShowNew(v => !v)} className="btn-primary text-sm px-4 py-2">
          {showNew ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Category</>}
        </button>
      </div>

      {showNew && (
        <div className="card p-5 animate-slide-up border-brand-200">
          <h3 className="font-bold text-gray-900 mb-4">Add New Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">ID (slug) *</label>
              <input className="input-field" placeholder="pf-bowls" value={newForm.id} onChange={e => setNewForm(f => ({ ...f, id: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Unique, no spaces (e.g. pf-meals)</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Display Label *</label>
              <input className="input-field" placeholder="PF Bowls" value={newForm.label} onChange={e => setNewForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
              <input className="input-field" placeholder="Brief description" value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Sort Order</label>
              <input className="input-field" type="number" placeholder="0" value={newForm.sortOrder} onChange={e => setNewForm(f => ({ ...f, sortOrder: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Card Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 rounded-xl cursor-pointer border border-surface-200" value={newForm.color} onChange={e => setNewForm(f => ({ ...f, color: e.target.value }))} />
                <span className="text-sm text-gray-500">{newForm.color}</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newForm.active} onChange={e => setNewForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-gray-700">Active (visible on menu page)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} disabled={saving === 'new'} className="btn-primary">
              {saving === 'new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Category
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-3">
          {cats.map(cat => (
            <div key={cat.id} className="card p-4">
              <div className="flex items-start gap-4">
                {/* Color swatch */}
                <div className="w-10 h-10 rounded-xl flex-shrink-0 border border-surface-200 flex items-center justify-center" style={{ background: cat.color || '#f0fdf4' }}>
                  <Tag size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">{cat.label}</p>
                    <code className="text-[10px] bg-surface-100 text-gray-500 px-1.5 py-0.5 rounded">{cat.id}</code>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cat.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {cat.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {cat.description && <p className="text-xs text-gray-400">{cat.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Sort: {cat.sortOrder}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle active */}
                  <button
                    onClick={() => toggle(cat, 'active', !cat.active)}
                    disabled={saving === cat.id}
                    title={cat.active ? 'Deactivate' : 'Activate'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${cat.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-surface-100 text-gray-500 hover:bg-surface-200'}`}
                  >
                    {saving === cat.id ? <Loader2 size={12} className="animate-spin inline" /> : (cat.active ? 'Live' : 'Off')}
                  </button>
                  <button onClick={() => handleDelete(cat.id)} disabled={saving === cat.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {cats.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Tag size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No categories yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN');
}

// ─── User Row (expandable) ────────────────────────────────────────────────────
function UserRow({ u }) {
  const [expanded, setExpanded]   = useState(false);
  const [orders, setOrders]       = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchOrders = async () => {
    if (orders !== null) return; // already loaded
    setLoadingOrders(true);
    try {
      const res = await admin.getUserOrders(u._id);
      setOrders(res.data.orders || []);
    } catch { setOrders([]); }
    setLoadingOrders(false);
  };

  const handleExpand = () => {
    setExpanded(e => !e);
    if (!expanded) fetchOrders();
  };

  const cartItems = u.cartSnapshot || [];
  const isActive  = u.lastActiveAt && (Date.now() - new Date(u.lastActiveAt).getTime()) < 15 * 60 * 1000;

  return (
    <div className="card overflow-hidden">
      {/* Summary row */}
      <div className="p-4 cursor-pointer hover:bg-surface-50 transition-colors" onClick={handleExpand}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
              <span className="text-brand-700 font-bold text-sm">
                {u.name ? u.name[0].toUpperCase() : u.phone?.slice(-2)}
              </span>
            </div>
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" title="Active in last 15 min" />
            )}
          </div>

          {/* Core info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
              <p className="font-semibold text-gray-900 text-sm">{u.name || 'No name'}</p>
              {u.role === 'admin' && <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>}
              {u.isPlatinum && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Crown size={8} /> PLT</span>}
              {cartItems.length > 0 && <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full font-bold">{cartItems.length} in cart</span>}
            </div>
            <p className="text-xs text-gray-500">+91 {u.phone}</p>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-5 flex-shrink-0 mr-2">
            <div className="text-center">
              <p className="text-sm font-extrabold text-gray-900">{u.orderCount || 0}</p>
              <p className="text-[10px] text-gray-400">orders</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-extrabold text-gray-900">₹{(u.totalSpent || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">spent</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-600">{timeAgo(u.lastActiveAt)}</p>
              <p className="text-[10px] text-gray-400">last seen</p>
            </div>
          </div>

          <ChevronDown size={15} className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-surface-100 bg-surface-50/40 p-4 space-y-4">

          {/* Two-col meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Joined',      value: new Date(u.createdAt).toLocaleDateString('en-IN') },
              { label: 'Last Login',  value: timeAgo(u.lastLoginAt) },
              { label: 'Last Active', value: timeAgo(u.lastActiveAt) },
              { label: 'Delivered',   value: `${u.deliveredCount || 0} orders` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl p-2.5 border border-surface-100 text-center">
                <p className="text-xs font-bold text-gray-900">{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Contact</p>
            <div className="bg-white rounded-xl p-3 border border-surface-100 text-xs text-gray-600 space-y-1">
              <p><span className="font-semibold text-gray-700">Phone: </span>+91 {u.phone}</p>
              {u.email && !u.email.endsWith('@picoso.in') && (
                <p><span className="font-semibold text-gray-700">Email: </span>{u.email}</p>
              )}
              {u.location?.area && (
                <p><span className="font-semibold text-gray-700">Location: </span>{[u.location.area, u.location.city].filter(Boolean).join(', ')}</p>
              )}
              {u.savedAddresses?.length > 0 && (
                <p><span className="font-semibold text-gray-700">Saved addresses: </span>{u.savedAddresses.length}</p>
              )}
            </div>
          </div>

          {/* Current cart snapshot */}
          {cartItems.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Current Cart ({cartItems.length} items)</p>
              <div className="space-y-1.5">
                {cartItems.map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-2.5 border border-surface-100 flex items-center gap-3 text-xs">
                    <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed size={12} className="text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-gray-900 flex-shrink-0">₹{item.price * item.quantity}</p>
                  </div>
                ))}
                <div className="bg-brand-50 rounded-xl p-2.5 border border-brand-100 flex justify-between text-xs font-bold text-brand-700">
                  <span>Cart Total</span>
                  <span>₹{cartItems.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent orders */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Order History {orders ? `(${orders.length})` : ''}
            </p>
            {loadingOrders ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-500" /></div>
            ) : orders?.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No orders yet</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {orders?.map(o => (
                  <div key={o._id} className="bg-white rounded-xl p-2.5 border border-surface-100 flex items-center gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="font-mono text-gray-500">#{o._id.slice(-6).toUpperCase()}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                          {o.status?.replace(/-/g, ' ')}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${o.paymentMethod === 'upi' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {o.paymentMethod?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400">{o.items?.length} item(s) &nbsp;• {new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <p className="font-extrabold text-gray-900 flex-shrink-0">₹{o.totalPrice}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subscriptions Section ────────────────────────────────────────────────────
const SUB_STATUS_COLORS = {
  pending_payment:  'bg-amber-100 text-amber-700',
  pending_approval: 'bg-blue-100 text-blue-700',
  active:           'bg-green-100 text-green-700',
  paused:           'bg-gray-100 text-gray-600',
  cancelled:        'bg-red-100 text-red-600',
};

function fmt24to12Admin(val) {
  if (!val) return '—';
  const [h, m] = val.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h > 12 ? h - 12 : h || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ─── Store Section ────────────────────────────────────────────────────────────
function StoreSection() {
  const [status, setStatus]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [closedReason, setReason]         = useState('');
  const [openingTime, setOpen]            = useState('10:00');
  const [closingTime, setClose]           = useState('22:00');
  const [notifyList, setNotifyList]       = useState([]);
  const [notifyTotal, setNotifyTotal]     = useState(0);
  const [notifyDone, setNotifyDone]       = useState(0);
  const [markingId, setMarkingId]         = useState(null);
  // Closed checkout captures
  const [checkouts, setCheckouts]         = useState([]);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [expandedId, setExpandedId]       = useState(null);
  const [markingChk, setMarkingChk]       = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, nRes, cRes] = await Promise.all([
        admin.getStoreStatus(),
        admin.getNotifyRequests(),
        admin.getClosedCheckouts(),
      ]);
      const s = sRes.data.status;
      setStatus(s);
      setReason(s.closedReason);
      setOpen(s.openingTime);
      setClose(s.closingTime);
      setNotifyList(nRes.data.requests || []);
      setNotifyTotal(nRes.data.total || 0);
      setNotifyDone(nRes.data.notified || 0);
      setCheckouts(cRes.data.records || []);
      setCheckoutTotal(cRes.data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async () => {
    setSaving(true);
    try {
      const res = await admin.updateStoreStatus({ isOpen: !status.isOpen });
      setStatus(res.data.status);
    } catch {}
    setSaving(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await admin.updateStoreStatus({ closedReason, openingTime, closingTime });
      setStatus(res.data.status);
    } catch {}
    setSaving(false);
  };

  const markDone = async (id) => {
    setMarkingId(id);
    try {
      await admin.markNotified(id);
      setNotifyList(prev => prev.filter(r => r._id !== id));
      setNotifyDone(d => d + 1);
    } catch {}
    setMarkingId(null);
  };

  const markCheckoutDone = async (id) => {
    setMarkingChk(id);
    try {
      await admin.markClosedCheckoutNotified(id);
      setCheckouts(prev => prev.filter(r => r._id !== id));
    } catch {}
    setMarkingChk(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  );

  const isOpen = status?.isOpen ?? true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Store Control</h2>
          <p className="text-sm text-gray-400 mt-0.5">Toggle store open/closed · Manage notify-me requests</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm gap-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Big toggle card ── */}
      <div className={`rounded-2xl border-2 p-6 transition-all duration-300 ${isOpen ? 'border-brand-200 bg-brand-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isOpen ? 'bg-brand-500' : 'bg-red-500'} shadow-md`}>
              <Power size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-extrabold text-gray-900">
                  {isOpen ? 'Store is OPEN' : 'Store is CLOSED'}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isOpen ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700'}`}>
                  {isOpen ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Operating hours: {openingTime} – {closingTime} · Click to {isOpen ? 'close' : 'reopen'} the store
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
              isOpen
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                : 'bg-brand-500 hover:bg-brand-600 text-white shadow-md hover:shadow-lg'
            } disabled:opacity-60`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            {isOpen ? 'Close Store' : 'Open Store'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Settings card ── */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Clock size={16} className="text-brand-600" /> Store Settings
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Opening Time</label>
              <input type="time" value={openingTime} onChange={e => setOpen(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Closing Time</label>
              <input type="time" value={closingTime} onChange={e => setClose(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Closed Message (shown to users)</label>
            <textarea rows={3} value={closedReason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          </div>

          <button onClick={saveSettings} disabled={saving}
            className="btn-primary w-full text-sm gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Settings
          </button>
        </div>

        {/* ── Notify requests stats ── */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <BellRing size={16} className="text-amber-500" /> Notify-Me Requests
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total',    value: notifyTotal,                    color: 'text-gray-900' },
              { label: 'Pending',  value: notifyList.length,              color: 'text-amber-600' },
              { label: 'Notified', value: notifyDone,                     color: 'text-brand-600' },
            ].map(s => (
              <div key={s.label} className="bg-surface-50 rounded-xl p-3 text-center">
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {notifyList.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2 text-gray-400">
              <CheckCheck size={28} />
              <p className="text-sm font-medium">All requests handled</p>
            </div>
          ) : (
            <p className="text-xs text-amber-600 font-semibold">
              {notifyList.length} customer{notifyList.length > 1 ? 's' : ''} waiting to be notified
            </p>
          )}
        </div>
      </div>

      {/* ── Pending notify requests table ── */}
      {notifyList.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <PhoneCall size={15} className="text-amber-500" />
              Pending Notifications
              <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{notifyList.length}</span>
            </h3>
          </div>
          <div className="divide-y divide-surface-100">
            {notifyList.map(req => (
              <div key={req._id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center">
                    <PhoneCall size={14} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{req.phone}</p>
                    <p className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <button
                  onClick={() => markDone(req._id)}
                  disabled={markingId === req._id}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {markingId === req._id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <CheckCircle2 size={12} />}
                  Mark Notified
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Closed-store Checkout Captures ─────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={15} className="text-red-500" />
            <h3 className="font-bold text-gray-900">Missed Orders</h3>
            {checkouts.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">{checkouts.length} pending</span>
            )}
          </div>
          <span className="text-xs text-gray-400">{checkoutTotal} total captured</span>
        </div>

        {checkouts.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400 gap-2">
            <ShoppingCart size={28} className="opacity-30" />
            <p className="text-sm">No pending missed orders</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {checkouts.map(rec => {
              const isExpanded = expandedId === rec._id;
              const recTotal   = rec.total || rec.items.reduce((s, i) => s + i.price * i.qty, 0);
              return (
                <div key={rec._id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : rec._id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <ShoppingCart size={14} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {rec.phone || <span className="text-gray-400 font-normal">No phone</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          {rec.items.length} item{rec.items.length !== 1 ? 's' : ''} · ₹{recTotal} · {new Date(rec.createdAt).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : rec._id)}
                        className="text-xs font-semibold text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-surface-50 transition-colors"
                      >
                        {isExpanded ? 'Hide' : 'View cart'}
                      </button>
                      <button
                        onClick={() => markCheckoutDone(rec._id)}
                        disabled={markingChk === rec._id}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {markingChk === rec._id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <CheckCircle2 size={12} />}
                        Done
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 ml-11 rounded-xl border border-surface-200 overflow-hidden">
                      <div className="divide-y divide-surface-50">
                        {rec.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-surface-100 text-gray-500 text-[10px] font-bold rounded flex items-center justify-center">
                                {item.qty}
                              </span>
                              <span className="text-xs text-gray-700">{item.name}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-900">₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 bg-surface-50 border-t border-surface-100">
                        <span className="text-xs font-bold text-gray-600">Total</span>
                        <span className="text-sm font-extrabold text-gray-900">₹{recTotal}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SubscriptionsSection() {
  const [subs,     setSubs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [actioning,setActioning]= useState({});

  const load = () => {
    setLoading(true);
    admin.getAllHealthySubs()
      .then(r => setSubs(r.data.subscriptions || []))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    setActioning(p => ({ ...p, [id]: action }));
    try {
      if (action === 'approve') await admin.approveHealthySub(id);
      else                      await admin.rejectHealthySub(id);
      load();
    } catch {}
    setActioning(p => ({ ...p, [id]: null }));
  };

  const filtered = subs.filter(s => {
    const matchStatus = filter === 'all' || s.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.userId?.phone?.includes(q) || s.userId?.name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  /* ── Analytics ── */
  const total       = subs.length;
  const active      = subs.filter(s => s.status === 'active').length;
  const pending     = subs.filter(s => s.status === 'pending_approval').length;
  const cancelled   = subs.filter(s => s.status === 'cancelled').length;
  const weeklyRev   = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.weeklyPrice || 0), 0);
  const plan3       = subs.filter(s => s.bowlsPerWeek === 3).length;
  const plan5       = subs.filter(s => s.bowlsPerWeek === 5).length;
  const plan7       = subs.filter(s => s.bowlsPerWeek === 7).length;

  return (
    <div className="space-y-5">
      {/* Analytics cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Subscriptions" value={total}          icon={<Zap size={14}/>}        color="brand"  />
        <StatCard label="Active"              value={active}         icon={<Activity size={14}/>}   color="green"  />
        <StatCard label="Pending Approval"    value={pending}        icon={<Clock size={14}/>}      color="amber"  />
        <StatCard label="Weekly Revenue"      value={`₹${weeklyRev.toLocaleString()}`} icon={<DollarSign size={14}/>} color="purple" />
      </div>

      {/* Plan distribution */}
      <div className="card">
        <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-3">Plan Distribution</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '3 Bowls/Week', count: plan3, price: 690,  color: 'bg-brand-500'  },
            { label: '5 Bowls/Week', count: plan5, price: 1100, color: 'bg-blue-500'   },
            { label: '7 Bowls/Week', count: plan7, price: 1400, color: 'bg-purple-500' },
          ].map(({ label, count, price, color }) => (
            <div key={label} className="p-3 rounded-xl bg-surface-50 border border-surface-100">
              <div className={`w-6 h-1.5 rounded-full ${color} mb-2`}/>
              <p className="text-lg font-black text-gray-900">{count}</p>
              <p className="text-[10px] font-bold text-gray-500">{label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">₹{price}/wk each</p>
            </div>
          ))}
        </div>

        {/* Cancelled stat */}
        <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-2">
            <XCircle size={14} className="text-red-500"/>
            <span className="text-xs font-bold text-red-600">Cancelled Subscriptions</span>
          </div>
          <span className="text-sm font-extrabold text-red-700">{cancelled}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by phone or name..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all','pending_approval','active','paused','cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filter === f ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-surface-200 hover:border-brand-300'}`}>
              {f === 'all' ? 'All' : f.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
            </button>
          ))}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 bg-white text-xs font-semibold text-gray-600 hover:bg-surface-50">
          <RefreshCw size={12}/> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-brand-500"/></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No subscriptions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  {['User','Plan','Time Slot','UPI Ref','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(sub => (
                  <tr key={sub._id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">{sub.userId?.name || '—'}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{sub.userId?.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center font-extrabold text-brand-600 text-xs flex-shrink-0">{sub.bowlsPerWeek}x</span>
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">₹{sub.weeklyPrice}/wk</p>
                          <p className="text-[10px] text-gray-400">₹{sub.perBowlPrice}/bowl</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-700">{fmt24to12Admin(sub.timeSlot)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-gray-600 max-w-[100px] truncate">{sub.upiRef || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${SUB_STATUS_COLORS[sub.status] || 'bg-gray-100 text-gray-500'}`}>
                        {sub.status?.replace('_',' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === 'pending_approval' ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => act(sub._id,'approve')} disabled={actioning[sub._id]}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-500 text-white text-[10px] font-bold hover:bg-brand-600 disabled:opacity-50 whitespace-nowrap">
                            {actioning[sub._id] === 'approve' ? <Loader2 size={10} className="animate-spin"/> : <CheckCircle2 size={10}/>} Approve
                          </button>
                          <button onClick={() => act(sub._id,'reject')} disabled={actioning[sub._id]}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold hover:bg-red-100 disabled:opacity-50 whitespace-nowrap">
                            {actioning[sub._id] === 'reject' ? <Loader2 size={10} className="animate-spin"/> : <XCircle size={10}/>} Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
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

// ─── Users Section ────────────────────────────────────────────────────────────
function UsersSection() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    admin.getUsers()
      .then(res => setUserList(res.data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = userList.filter(u => {
    if (filterRole === 'admin'    && u.role !== 'admin')   return false;
    if (filterRole === 'platinum' && !u.isPlatinum)        return false;
    if (filterRole === 'active'   && !u.orderCount)        return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const totalSpent   = userList.reduce((s, u) => s + (u.totalSpent || 0), 0);
  const platinumCount = userList.filter(u => u.isPlatinum).length;
  const activeCount   = userList.filter(u => u.lastActiveAt && (Date.now() - new Date(u.lastActiveAt).getTime()) < 15 * 60 * 1000).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Users ({userList.length})</h2>
          <p className="text-sm text-gray-500">
            {platinumCount} platinum &nbsp;•&nbsp; {activeCount} online now &nbsp;•&nbsp; ₹{totalSpent.toLocaleString()} total spent
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Users</option>
          <option value="platinum">Platinum only</option>
          <option value="admin">Admins only</option>
          <option value="active">With orders</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => <UserRow key={u._id} u={u} />)}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ad Agents Section ───────────────────────────────────────────────────────

const BASE_URL_ADMIN = typeof window !== 'undefined' ? window.location.origin : 'https://picoso.in';

function AgentDetailModal({ agentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletAmt, setWalletAmt] = useState('');
  const [walletNote, setWalletNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    adminAgents.getById(agentId)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [agentId]);

  const handleWalletAdjust = async () => {
    if (!walletAmt) return;
    setAdjusting(true);
    try {
      const res = await adminAgents.adjustWallet(agentId, { amount: parseFloat(walletAmt), note: walletNote });
      setData(prev => ({ ...prev, agent: res.data.agent }));
      setWalletAmt('');
      setWalletNote('');
    } catch {}
    setAdjusting(false);
  };

  const handleToggleActive = async () => {
    if (!data) return;
    try {
      const res = await adminAgents.update(agentId, { isActive: !data.agent.isActive });
      setData(prev => ({ ...prev, agent: res.data.agent }));
    } catch {}
  };

  const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{data?.agent?.name || 'Loading…'}</h2>
            <p className="text-gray-500 text-sm">{data?.agent?.phone} &nbsp;·&nbsp; Code: <span className="font-mono font-bold">{data?.agent?.agentCode}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-px bg-gray-100 border-b">
              {[
                { label: 'Wallet', value: `₹${data.agent.wallet?.toLocaleString('en-IN') || 0}`, color: 'text-emerald-600' },
                { label: 'Scans', value: data.agent.totalScans || 0, color: 'text-blue-600' },
                { label: 'Leads', value: data.agent.totalLeads || 0, color: 'text-violet-600' },
                { label: 'Orders', value: data.agent.totalOrders || 0, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="bg-white p-4 text-center">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-gray-400 text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="p-5 space-y-5">
              {/* Status + Wallet controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${data.agent.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {data.agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={handleToggleActive} className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      {data.agent.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Joined {fmtDt(data.agent.createdAt)}</p>
                </div>

                <div className="flex-1 bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Adjust Wallet</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount (+ or -)"
                      value={walletAmt}
                      onChange={e => setWalletAmt(e.target.value)}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={handleWalletAdjust}
                      disabled={adjusting || !walletAmt}
                      className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                    >
                      {adjusting ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={walletNote}
                    onChange={e => setWalletNote(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* QR Preview */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${BASE_URL_ADMIN}/ref/${data.agent.agentCode}`)}&bgcolor=ffffff&color=065f46`}
                  alt="QR"
                  className="w-20 h-20 rounded-lg border"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Agent Referral Link</p>
                  <p className="text-xs font-mono text-gray-700 break-all">{BASE_URL_ADMIN}/ref/{data.agent.agentCode}</p>
                  <div className="mt-2 flex gap-2">
                    <a href={`${BASE_URL_ADMIN}/ref/${data.agent.agentCode}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                      Preview page
                    </a>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                  { id: 'overview', label: 'Scans' },
                  { id: 'leads', label: 'Leads' },
                  { id: 'commissions', label: 'Commissions' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Recent QR scans</p>
                  {data.analytics.scans.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No scans yet</p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {data.analytics.scans.map((s, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                          <span className="text-gray-600 text-xs">QR Scanned</span>
                          <span className="text-gray-400 text-xs">{fmtDt(s.scannedAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'leads' && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Registered leads</p>
                  {data.analytics.leads.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No leads yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {data.analytics.leads.map((l, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                          <div>
                            <div className="text-sm font-medium text-gray-800">{l.userId?.name || 'User'}</div>
                            <div className="text-xs text-gray-400">{l.userId?.phone}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">{fmtDt(l.registeredAt)}</div>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${l.userId?.giftRedeemed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {l.userId?.giftRedeemed ? 'Gift used' : 'Gift pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'commissions' && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Commission history</p>
                  {data.analytics.commissions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No commissions yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {data.analytics.commissions.map((c, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                          <div>
                            <div className="text-sm font-medium text-gray-800">{c.userId?.name || c.userId?.phone}</div>
                            <div className="text-xs text-gray-400">Order • {fmtDt(c.createdAt)}</div>
                          </div>
                          <span className="text-emerald-600 font-bold text-sm">+₹{c.amount}</span>
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
    </div>
  );
}

function AgentsSection() {
  const [agents, setAgents] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [addingAgent, setAddingAgent] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({ displayEarningPerOrder: 0, actualCommissionPerOrder: 20 });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [displayInput, setDisplayInput] = useState('');
  const [actualInput, setActualInput] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([adminAgents.getAll(), adminAgents.getStats()])
      .then(([agRes, stRes]) => {
        setAgents(agRes.data.agents || []);
        setOverallStats(stRes.data.stats || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadSettings = () => {
    setSettingsLoading(true);
    adminAgents.getSettings()
      .then(r => {
        const s = r.data.settings;
        setSettings(s);
        setDisplayInput(String(s.displayEarningPerOrder ?? 0));
        setActualInput(String(s.actualCommissionPerOrder ?? 20));
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await adminAgents.updateSettings({
        displayEarningPerOrder:   parseFloat(displayInput)  || 0,
        actualCommissionPerOrder: parseFloat(actualInput) || 0,
      });
      setSettings(res.data.settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch {}
    setSavingSettings(false);
  };
  useEffect(() => { loadAll(); loadSettings(); }, []);

  const filtered = agents.filter(a => {
    if (filterStatus === 'active' && !a.isActive) return false;
    if (filterStatus === 'inactive' && a.isActive) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.phone?.includes(q) || a.agentCode?.toLowerCase().includes(q);
  });

  const handleDeactivate = async (id) => {
    try {
      await adminAgents.delete(id);
      setAgents(prev => prev.map(a => a._id === id ? { ...a, isActive: false } : a));
    } catch {}
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Advertisement Agents</h2>
          <p className="text-sm text-gray-500">Manage door-to-door agents and their QR campaigns</p>
        </div>
        <button
          onClick={() => setAddingAgent(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-400 transition-colors shadow-sm"
        >
          <Plus size={15} /> Add Agent
        </button>
      </div>

      {/* Overview Stats */}
      {overallStats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Agents', value: overallStats.totalAgents, icon: <Users size={16} />, color: 'text-blue-600 bg-blue-50' },
            { label: 'Active', value: overallStats.activeAgents, icon: <UserCheck size={16} />, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Total Scans', value: overallStats.totalScans, icon: <ScanLine size={16} />, color: 'text-violet-600 bg-violet-50' },
            { label: 'Total Leads', value: overallStats.totalLeads, icon: <Users size={16} />, color: 'text-amber-600 bg-amber-50' },
            { label: 'Commissions Paid', value: `₹${overallStats.totalCommissionsPaid?.toLocaleString('en-IN') || 0}`, icon: <IndianRupee size={16} />, color: 'text-rose-600 bg-rose-50' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${s.color} mb-2`}>{s.icon}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-gray-400 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Commission Settings */}
      <div className="card p-5 border border-emerald-100 bg-emerald-50/50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Commission Rate Settings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Control what agents see vs. what gets actually credited</p>
          </div>
          {settingsLoading && <Loader2 size={14} className="animate-spin text-emerald-500 mt-1" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Displayed to Agent (₹ per order)
              <span className="font-normal text-gray-400 ml-1">— what agents see on their dashboard</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={displayInput}
              onChange={e => setDisplayInput(e.target.value)}
              placeholder="e.g. 40"
              className="input-field w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Currently showing: <span className="font-semibold text-emerald-600">₹{settings.displayEarningPerOrder}</span>
              {settings.displayEarningPerOrder === 0 && ' (hidden from agents)'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Actual Wallet Credit (₹ per order)
              <span className="font-normal text-gray-400 ml-1">— what gets credited to wallet</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={actualInput}
              onChange={e => setActualInput(e.target.value)}
              placeholder="e.g. 20"
              className="input-field w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Currently crediting: <span className="font-semibold text-blue-600">₹{settings.actualCommissionPerOrder}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {savingSettings
              ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
              : settingsSaved
              ? <><CheckCircle2 size={13} /> Saved!</>
              : <><Save size={13} /> Save Settings</>
            }
          </button>
          <p className="text-xs text-gray-400">
            Changes take effect immediately for all new commissions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search by name, phone, code…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Agents</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={loadAll} className="btn-secondary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Add Agent Form */}
      {addingAgent && (
        <div className="card p-4 border-2 border-emerald-200 bg-emerald-50">
          <h3 className="font-semibold text-gray-900 mb-3">Add New Agent</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input-field flex-1"
              placeholder="Full name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <input
              className="input-field flex-1"
              placeholder="Phone number"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              type="tel"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!newName || !newPhone) return;
                  setCreating(true);
                  try {
                    await agentAuthApi.login({ name: newName.trim(), phone: newPhone });
                    loadAll();
                    setAddingAgent(false);
                    setNewName('');
                    setNewPhone('');
                  } catch {}
                  setCreating(false);
                }}
                disabled={creating || !newName || newPhone.length !== 10}
                className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm hover:bg-emerald-400 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
              </button>
              <button onClick={() => setAddingAgent(false)} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <QrCode size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No agents found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Code</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Wallet</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Scans</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Leads</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Orders</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.phone}</div>
                      <div className="text-xs text-gray-300 hidden sm:block">Joined {fmtDate(a.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-700">{a.agentCode}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-emerald-600">₹{(a.wallet || 0).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{a.totalScans || 0}</td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{a.totalLeads || 0}</td>
                    <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">{a.totalOrders || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setSelectedAgentId(a._id)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                          title="View details"
                        >
                          <ChevronRight size={14} />
                        </button>
                        {a.isActive && (
                          <button
                            onClick={() => handleDeactivate(a._id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedAgentId && (
        <AgentDetailModal agentId={selectedAgentId} onClose={() => { setSelectedAgentId(null); loadAll(); }} />
      )}
    </div>
  );
}

// ─── Delivery Zones Section ───────────────────────────────────────────────────

const ZONE_BANDS = [
  { label: '0–1 km',   min: 0,  max: 1,          color: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  { label: '1–2 km',   min: 1,  max: 2,           color: '#22c55e', bg: '#f0fdf4', text: '#14532d' },
  { label: '2–3 km',   min: 2,  max: 3,           color: '#84cc16', bg: '#f7fee7', text: '#365314' },
  { label: '3–4 km',   min: 3,  max: 4,           color: '#eab308', bg: '#fefce8', text: '#713f12' },
  { label: '4–5 km',   min: 4,  max: 5,           color: '#f97316', bg: '#fff7ed', text: '#7c2d12' },
  { label: '5–6 km',   min: 5,  max: 6,           color: '#ef4444', bg: '#fef2f2', text: '#7f1d1d' },
  { label: '6–7 km',   min: 6,  max: 7,           color: '#dc2626', bg: '#fef2f2', text: '#7f1d1d' },
  { label: '7–8 km',   min: 7,  max: 8,           color: '#be123c', bg: '#fff1f2', text: '#881337' },
  { label: '8–9 km',   min: 8,  max: 9,           color: '#9f1239', bg: '#fff1f2', text: '#881337' },
  { label: '9–10 km',  min: 9,  max: 10,          color: '#7e22ce', bg: '#faf5ff', text: '#581c87' },
  { label: '10+ km',   min: 10, max: Infinity,     color: '#6b7280', bg: '#f9fafb', text: '#374151' },
];

function getZoneBand(km) {
  return ZONE_BANDS.find(b => km >= b.min && km < b.max) || ZONE_BANDS[ZONE_BANDS.length - 1];
}

function CoverageMap({ geoOrders, selectedZone, onSelectZone, hoveredOrder, onHoverOrder }) {
  const W = 480, H = 480;
  const CX = W / 2, CY = H / 2;
  const PX_PER_KM = 22;
  const RINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const LAT_KM = 111;
  const LNG_KM = 111 * Math.cos(STORE_LAT * Math.PI / 180);

  const toSVG = (lat, lng) => ({
    x: CX + (lng - STORE_LNG) * LNG_KM * PX_PER_KM,
    y: CY - (lat - STORE_LAT) * LAT_KM * PX_PER_KM,
  });

  return (
    <div className="relative select-none">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <defs>
          <pattern id="zgrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#f1f5f9" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#zgrid)" rx="12" />

        {/* Rings */}
        {RINGS.map((km, i) => {
          const band = ZONE_BANDS[i] || ZONE_BANDS[ZONE_BANDS.length - 2];
          const r = km * PX_PER_KM;
          const isActive = selectedZone?.label === band.label;
          return (
            <g key={km} onClick={() => onSelectZone(band)} style={{ cursor: 'pointer' }}>
              <circle cx={CX} cy={CY} r={r}
                fill={band.color + (isActive ? '1a' : '0a')}
                stroke={band.color + (isActive ? 'cc' : '55')}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={km > 5 ? '5 3' : 'none'} />
              <text x={CX + r + 3} y={CY - 3} fontSize="8" fill="#94a3b8" fontWeight="600">{km}km</text>
            </g>
          );
        })}

        {/* Crosshair */}
        <line x1={CX} y1={CY - 225} x2={CX} y2={CY + 225} stroke="#cbd5e1" strokeWidth="0.5" />
        <line x1={CX - 225} y1={CY} x2={CX + 225} y2={CY} stroke="#cbd5e1" strokeWidth="0.5" />

        {/* Compass N */}
        <text x={CX + 5} y={24} fontSize="11" fill="#64748b" fontWeight="800">N</text>
        <path d={`M${CX} 28 L${CX - 4} 38 L${CX} 35 L${CX + 4} 38 Z`} fill="#64748b" />

        {/* Order dots */}
        {geoOrders.map((order, idx) => {
          const { x, y } = toSVG(order.deliveryAddress.lat, order.deliveryAddress.lng);
          const band = getZoneBand(order.km);
          const isHov = hoveredOrder?._id === order._id;
          const dimmed = selectedZone && selectedZone.label !== band.label;
          if (x < 5 || x > W - 5 || y < 5 || y > H - 5) return null;
          return (
            <circle key={order._id + idx} cx={x} cy={y}
              r={isHov ? 7 : 4.5}
              fill={band.color}
              fillOpacity={dimmed ? 0.15 : isHov ? 1 : 0.8}
              stroke="white"
              strokeWidth={isHov ? 2 : 1}
              style={{ cursor: 'pointer', transition: 'r 0.1s, fill-opacity 0.2s' }}
              onMouseEnter={() => onHoverOrder(order)}
              onMouseLeave={() => onHoverOrder(null)} />
          );
        })}

        {/* Store pin */}
        <circle cx={CX} cy={CY} r={11} fill="#4f46e5" />
        <circle cx={CX} cy={CY} r={6} fill="white" />
        <circle cx={CX} cy={CY} r={3} fill="#4f46e5" />
        <text x={CX + 14} y={CY + 4} fontSize="9" fill="#4f46e5" fontWeight="800">Store</text>
      </svg>

      {/* Hover tooltip */}
      {hoveredOrder && (
        <div className="absolute top-3 left-3 bg-white border border-surface-200 rounded-xl shadow-lg px-3 py-2.5 text-xs pointer-events-none z-10 space-y-0.5">
          <p className="font-bold text-gray-900">#{hoveredOrder._id?.slice(-6).toUpperCase()}</p>
          <p className="text-gray-600">{hoveredOrder.customerName || hoveredOrder.phone || '—'}</p>
          <p className="font-semibold text-gray-800">₹{hoveredOrder.totalPrice}</p>
          <p className="text-gray-400">{hoveredOrder.km?.toFixed(2)} km from store</p>
          <p className={`font-semibold capitalize ${STATUS_COLORS[hoveredOrder.status]?.replace('bg-', 'text-').split(' ')[0] || ''}`}>
            {hoveredOrder.status}
          </p>
        </div>
      )}
    </div>
  );
}

function ZonesSection() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [expandedZone, setExpandedZone] = useState(null);
  const [hoveredOrder, setHoveredOrder] = useState(null);
  const [sortKey, setSortKey]         = useState('count');

  useEffect(() => {
    setLoading(true);
    admin.getOrders({})
      .then(res => setOrders(res.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const geoOrders = useMemo(() =>
    orders
      .filter(o => o.deliveryAddress?.lat != null && o.deliveryAddress?.lng != null)
      .map(o => ({
        ...o,
        km: haversineKm(STORE_LAT, STORE_LNG, o.deliveryAddress.lat, o.deliveryAddress.lng),
      })),
  [orders]);

  const noGeoCount = orders.length - geoOrders.length;

  const zoneData = useMemo(() => {
    const result = ZONE_BANDS.map(band => {
      const zo = geoOrders.filter(o => o.km >= band.min && o.km < band.max);
      if (!zo.length) return null;

      const uniqueCustomerSet = new Set(zo.map(o => o.userId?._id || o.phone));
      const customerFreq = {};
      zo.forEach(o => {
        const k = o.userId?._id || o.phone;
        customerFreq[k] = (customerFreq[k] || 0) + 1;
      });
      const repeatCustomers = Object.values(customerFreq).filter(c => c > 1).length;

      const itemMap = {};
      zo.forEach(o => o.items?.forEach(item => {
        const n = item.name || 'Unknown';
        itemMap[n] = (itemMap[n] || 0) + (item.quantity || 1);
      }));
      const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const totalRevenue   = zo.reduce((s, o) => s + (o.totalPrice || 0), 0);
      const codCount       = zo.filter(o => o.paymentMethod === 'cod').length;
      const platinumCount  = zo.filter(o => o.isPlatinumOrder).length;
      const deliveredCount = zo.filter(o => o.status === 'delivered').length;
      const cancelledCount = zo.filter(o => o.status === 'cancelled').length;
      const pendingCount   = zo.filter(o => o.status === 'pending').length;
      const avgDist        = zo.reduce((s, o) => s + o.km, 0) / zo.length;

      return {
        ...band,
        orders: zo.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        count:          zo.length,
        uniqueCustomers: uniqueCustomerSet.size,
        repeatCustomers,
        avgOrderFreq:   (zo.length / uniqueCustomerSet.size).toFixed(1),
        totalRevenue,
        avgOrderValue:  Math.round(totalRevenue / zo.length),
        codCount,
        upiCount:       zo.length - codCount,
        platinumCount,
        deliveredCount,
        cancelledCount,
        pendingCount,
        topItems,
        avgDist:        avgDist.toFixed(2),
      };
    }).filter(Boolean);

    const sortFns = {
      count:   (a, b) => b.count - a.count,
      revenue: (a, b) => b.totalRevenue - a.totalRevenue,
      avg:     (a, b) => b.avgOrderValue - a.avgOrderValue,
    };
    return result.sort(sortFns[sortKey] || sortFns.count);
  }, [geoOrders, sortKey]);

  const totalGeoRevenue = geoOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const avgDist = geoOrders.length
    ? (geoOrders.reduce((s, o) => s + o.km, 0) / geoOrders.length).toFixed(1) : '—';
  const maxDist = geoOrders.length
    ? Math.max(...geoOrders.map(o => o.km)).toFixed(1) : '—';
  const minDist = geoOrders.length
    ? Math.min(...geoOrders.map(o => o.km)).toFixed(2) : '—';

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Delivery Zone Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {geoOrders.length} GPS-tracked · {noGeoCount} untracked · Store: {STORE_LAT.toFixed(4)}, {STORE_LNG.toFixed(4)}
          </p>
        </div>
        <button onClick={() => { setLoading(true); admin.getOrders({}).then(r => setOrders(r.data.orders || [])).catch(() => {}).finally(() => setLoading(false)); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-600 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Mapped Orders', value: geoOrders.length, sub: `${orders.length > 0 ? Math.round(geoOrders.length / orders.length * 100) : 0}% of total`, color: 'brand' },
          { label: 'Avg Distance',  value: `${avgDist} km`,  sub: 'mean delivery range', color: 'blue' },
          { label: 'Nearest Order', value: `${minDist} km`,  sub: 'closest customer', color: 'green' },
          { label: 'Farthest Order',value: `${maxDist} km`,  sub: 'max delivery range', color: 'amber' },
        ].map(k => (
          <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} color={k.color}
            icon={<MapPin size={14} />} />
        ))}
      </div>

      {/* Map + zones */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Coverage Map ── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-700">Coverage Map</p>
            {selectedZone && (
              <button onClick={() => { setSelectedZone(null); setExpandedZone(null); }}
                className="text-[11px] text-brand-600 hover:underline flex items-center gap-1">
                <X size={10} /> Clear filter
              </button>
            )}
          </div>

          {geoOrders.length === 0 ? (
            <div className="h-72 bg-surface-50 rounded-2xl border border-dashed border-surface-300 flex flex-col items-center justify-center gap-3 text-center px-6">
              <MapPin size={32} className="text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">No GPS data yet</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Once customers share their location at checkout, orders will appear on this map automatically.
              </p>
            </div>
          ) : (
            <CoverageMap
              geoOrders={geoOrders}
              selectedZone={selectedZone}
              onSelectZone={z => {
                setSelectedZone(prev => prev?.label === z.label ? null : z);
                setExpandedZone(prev => {
                  const target = ZONE_BANDS.find(b => b.label === z.label)?.label;
                  return prev === target ? null : target;
                });
              }}
              hoveredOrder={hoveredOrder}
              onHoverOrder={setHoveredOrder}
            />
          )}

          {/* Colour legend */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ZONE_BANDS.slice(0, 8).map(b => (
              <span key={b.label}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: b.bg, color: b.text, borderColor: b.color + '50' }}
                onClick={() => {
                  setSelectedZone(prev => prev?.label === b.label ? null : b);
                  setExpandedZone(prev => prev === b.label ? null : b.label);
                }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color }} />
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Zone accordion ── */}
        <div className="lg:col-span-3">
          {/* Sort controls */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-700">Zone Breakdown</p>
            <div className="flex gap-1">
              {[['count', 'Orders'], ['revenue', 'Revenue'], ['avg', 'Avg AOV']].map(([k, lbl]) => (
                <button key={k}
                  onClick={() => setSortKey(k)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${sortKey === k ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-gray-500 hover:bg-surface-200'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {zoneData.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No GPS-tracked orders yet</div>
          ) : (
            <div className="space-y-2">
              {zoneData.map(zone => {
                const isExpanded = expandedZone === zone.label;
                const isSelected = selectedZone?.label === zone.label;
                return (
                  <div key={zone.label}
                    className="rounded-xl border overflow-hidden transition-shadow"
                    style={{
                      borderColor: isSelected ? zone.color : zone.color + '35',
                      boxShadow: isSelected ? `0 0 0 2px ${zone.color}40` : 'none',
                    }}>

                    {/* Zone header */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      style={{ background: zone.bg }}
                      onClick={() => {
                        setSelectedZone(prev => prev?.label === zone.label ? null : zone);
                        setExpandedZone(prev => prev === zone.label ? null : zone.label);
                      }}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: zone.color }} />
                      <span className="text-xs font-extrabold flex-1" style={{ color: zone.text }}>{zone.label}</span>
                      <span className="text-xs font-bold" style={{ color: zone.color }}>{zone.count} order{zone.count !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-gray-400">{zone.uniqueCustomers} customer{zone.uniqueCustomers !== 1 ? 's' : ''}</span>
                      <span className="text-xs font-bold text-gray-600">₹{zone.totalRevenue.toLocaleString()}</span>
                      <ChevronDown size={13} className="flex-shrink-0 transition-transform"
                        style={{ color: zone.text, transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {/* Quick stats row */}
                    <div className="bg-white px-4 py-2 border-t grid grid-cols-4 gap-2 text-center"
                      style={{ borderColor: zone.color + '20' }}>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">Avg Order</p>
                        <p className="text-xs font-bold text-gray-800">₹{zone.avgOrderValue}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">Frequency</p>
                        <p className="text-xs font-bold text-gray-800">{zone.avgOrderFreq}×</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">Platinum</p>
                        <p className="text-xs font-bold text-gray-800">{zone.platinumCount}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wide">Avg Dist</p>
                        <p className="text-xs font-bold text-gray-800">{zone.avgDist}km</p>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="bg-white border-t px-4 py-4 space-y-4"
                        style={{ borderColor: zone.color + '20' }}>

                        {/* Full analytics grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { label: 'Repeat Customers', value: zone.repeatCustomers },
                            { label: 'Delivered',         value: zone.deliveredCount },
                            { label: 'Cancelled',         value: zone.cancelledCount, red: true },
                            { label: 'COD Orders',        value: zone.codCount },
                            { label: 'UPI Orders',        value: zone.upiCount },
                            { label: 'Pending',           value: zone.pendingCount },
                          ].map(s => (
                            <div key={s.label} className="bg-surface-50 rounded-xl p-3 text-center border border-surface-100">
                              <p className="text-[10px] text-gray-400 mb-1">{s.label}</p>
                              <p className={`text-base font-extrabold ${s.red && s.value > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                {s.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Revenue bar */}
                        <div>
                          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                            <span>Zone share of tracked revenue</span>
                            <span>{totalGeoRevenue > 0 ? ((zone.totalRevenue / totalGeoRevenue) * 100).toFixed(1) : 0}%</span>
                          </div>
                          <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${totalGeoRevenue > 0 ? (zone.totalRevenue / totalGeoRevenue) * 100 : 0}%`, background: zone.color }} />
                          </div>
                        </div>

                        {/* Top items */}
                        {zone.topItems.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Top Items Ordered</p>
                            <div className="space-y-1.5">
                              {zone.topItems.map(([name, qty], rank) => {
                                const pct = zone.topItems[0][1] > 0 ? (qty / zone.topItems[0][1]) * 100 : 0;
                                return (
                                  <div key={name} className="flex items-center gap-2">
                                    <span className="text-[9px] font-extrabold text-gray-400 w-4 flex-shrink-0">#{rank + 1}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-xs text-gray-700 font-medium truncate flex-1">{name}</span>
                                        <span className="text-xs font-bold text-gray-500 ml-2 flex-shrink-0">{qty}×</span>
                                      </div>
                                      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: zone.color }} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Customer profiles */}
                        {zone.orders.length > 0 && (() => {
                          const custMap = {};
                          zone.orders.forEach(o => {
                            const k = o.userId?._id || o.phone || 'unknown';
                            if (!custMap[k]) {
                              custMap[k] = {
                                name: o.customerName || o.userId?.name || '—',
                                phone: o.phone || o.userId?.phone || '—',
                                orders: 0,
                                revenue: 0,
                                isPlatinum: o.isPlatinumOrder,
                              };
                            }
                            custMap[k].orders++;
                            custMap[k].revenue += o.totalPrice || 0;
                          });
                          const customers = Object.values(custMap)
                            .sort((a, b) => b.orders - a.orders)
                            .slice(0, 5);
                          return (
                            <div>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Top Customers in Zone</p>
                              <div className="space-y-1.5">
                                {customers.map((c, i) => (
                                  <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-surface-50 last:border-0">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold flex-shrink-0"
                                      style={{ background: zone.bg, color: zone.text }}>
                                      {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                                      <p className="text-[10px] text-gray-400">{c.phone}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-xs font-bold text-gray-700">{c.orders} order{c.orders !== 1 ? 's' : ''}</p>
                                      <p className="text-[10px] text-gray-400">₹{c.revenue.toLocaleString()}</p>
                                    </div>
                                    {c.isPlatinum && (
                                      <Crown size={10} className="text-orange-400 flex-shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Order list */}
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">
                            All Orders in Zone ({zone.orders.length})
                          </p>
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {zone.orders.map(o => (
                              <div key={o._id}
                                className="flex items-center gap-2.5 py-1.5 border-b border-surface-50 last:border-0 text-xs">
                                <span className="font-mono text-gray-400 flex-shrink-0">#{o._id?.slice(-6).toUpperCase()}</span>
                                <span className="text-gray-600 flex-1 truncate">{o.customerName || o.phone || '—'}</span>
                                <span className="text-gray-500 flex-shrink-0">{o.km.toFixed(1)} km</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {o.status?.replace(/-/g, ' ')}
                                </span>
                                <span className="font-bold text-gray-800 flex-shrink-0">₹{o.totalPrice}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Revenue by zone bar chart */}
      {zoneData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-700">Revenue Distribution by Zone</p>
            <p className="text-xs text-gray-400">Total tracked: ₹{totalGeoRevenue.toLocaleString()}</p>
          </div>
          <div className="space-y-2.5">
            {zoneData.map(zone => {
              const pct = totalGeoRevenue > 0 ? (zone.totalRevenue / totalGeoRevenue) * 100 : 0;
              return (
                <div key={zone.label} className="flex items-center gap-3">
                  <div className="w-[72px] text-xs font-semibold text-gray-500 flex-shrink-0">{zone.label}</div>
                  <div className="flex-1 h-5 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full flex items-center justify-end pr-1.5 transition-all duration-700"
                      style={{ width: `${Math.max(pct, 0.5)}%`, background: zone.color }}>
                      {pct > 8 && (
                        <span className="text-[9px] font-extrabold text-white">{pct.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 w-24 text-right flex-shrink-0">
                    <span className="font-bold">₹{zone.totalRevenue.toLocaleString()}</span>
                    <span className="text-gray-400"> · {zone.count} ord</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Untracked warning */}
      {noGeoCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {noGeoCount} order{noGeoCount !== 1 ? 's' : ''} without GPS coordinates
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              These are older orders placed before location capture was enabled.
              All new orders from customers who grant location permission will appear on the map automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { isLoggedIn, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { router.replace('/'); return; }
    if (!isAdmin) { router.replace('/'); return; }
    loadStats();
  }, [isLoggedIn, isAdmin, router]);

  const loadStats = () => {
    setStatsLoading(true);
    admin.getStats().then(res => setStats(res.data.stats)).catch(() => {}).finally(() => setStatsLoading(false));
  };

  if (!isLoggedIn || !isAdmin) return null;

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':      return <OverviewSection stats={stats} onRefresh={loadStats} />;
      case 'store':         return <StoreSection />;
      case 'orders':        return <OrdersSection />;
      case 'zones':         return <ZonesSection />;
      case 'payments':      return <PaymentsSection />;
      case 'platinum':      return <PlatinumSection />;
      case 'subscriptions': return <SubscriptionsSection />;
      case 'products':      return <ProductsSection />;
      case 'categories':    return <CategoriesSection />;
      case 'users':         return <UsersSection />;
      case 'agents':        return <AgentsSection />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-surface-100 flex flex-col
        transform transition-transform duration-300 lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 gradient-brand rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Picoso Admin</p>
              <p className="text-xs text-gray-400">Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                className={activeSection === item.id ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-surface-100">
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="sidebar-item w-full text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-surface-100 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors"
            >
              <Menu size={18} />
            </button>
            <h1 className="font-bold text-gray-900 capitalize">
              {SIDEBAR_ITEMS.find(s => s.id === activeSection)?.label || 'Dashboard'}
            </h1>
          </div>
          {statsLoading && <Loader2 size={16} className="animate-spin text-brand-500" />}
        </header>

        {/* Content area */}
        <main className="flex-1 p-5 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {renderSection()}
        </div>
        </main>
      </div>
    </div>
  );
}
