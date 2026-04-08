'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, CreditCard, UtensilsCrossed, Users,
  TrendingUp, ShoppingBag, DollarSign, Clock, Crown, CheckCircle2,
  XCircle, ChevronDown, Search, Plus, Edit, Trash2, Save,
  RefreshCw, Loader2, ArrowUpRight, ArrowDownRight,
  LogOut, Menu, X, Banknote, Smartphone, Percent,
  Activity, PieChart, BarChart2, Zap, AlertTriangle,
  ToggleLeft, ToggleRight, GripVertical, Tag
} from 'lucide-react';
import { admin } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SIDEBAR_ITEMS = [
  { id: 'overview',    label: 'Overview',   icon: LayoutDashboard },
  { id: 'orders',      label: 'Orders',     icon: Package },
  { id: 'payments',    label: 'Payments',   icon: CreditCard },
  { id: 'platinum',    label: 'Platinum',   icon: Crown },
  { id: 'products',    label: 'Products',   icon: UtensilsCrossed },
  { id: 'categories',  label: 'Categories', icon: Menu },
  { id: 'users',       label: 'Users',      icon: Users },
];

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
          <StatCard label="Active Platinum" value={s.activePlatinum ?? 0} icon={<Crown size={14} />} color="orange" sub={`₹${(s.activePlatinum ?? 0) * 99}/mo recurring`} />
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
function OrdersSection() {
  const [orderList, setOrderList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = () => {
    setLoading(true);
    admin.getOrders(filterStatus ? { status: filterStatus } : {})
      .then(res => setOrderList(res.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

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
    return o._id.includes(q) || o.userId?.name?.toLowerCase().includes(q) || o.userId?.phone?.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Orders Management</h2>
        <button onClick={load} className="btn-secondary text-xs px-3 py-2"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
          <input className="input-field pl-10" placeholder="Search by order ID, name, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <div key={order._id} className="card p-5">
              <div className="flex flex-wrap items-start gap-4 justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900 text-sm">#{order._id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.userId?.name || 'Unknown'} • +91 {order.userId?.phone || order.phone}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status.replace(/-/g, ' ')}
                  </span>
                  <span className="text-sm font-bold text-gray-900">₹{order.totalPrice}</span>
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${order.paymentMethod === 'upi' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {order.paymentMethod === 'upi' ? <Smartphone size={10} /> : <Banknote size={10} />}
                    {order.paymentMethod === 'upi' ? 'UPI' : 'COD'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-3">
                {order.items?.length} item(s) • {order.deliveryAddress?.fullAddress || order.deliveryAddress?.area || '—'}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={order.status}
                  onChange={e => handleStatusChange(order._id, e.target.value)}
                  disabled={updatingId === order._id}
                  className="text-xs border border-surface-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 font-medium focus:border-brand-400 outline-none"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
                </select>
                {updatingId === order._id && <Loader2 size={14} className="animate-spin text-brand-500" />}
              </div>
            </div>
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
          <p className="text-sm text-gray-500 mt-0.5">Activate platinum memberships after verifying ₹99 UPI payments</p>
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
                  <p className="text-2xl font-extrabold text-gray-900">₹99</p>
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

// ─── Users Section ────────────────────────────────────────────────────────────
function UsersSection() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    admin.getUsers().then(res => setUserList(res.data.users || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = userList.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.phone?.includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Users ({userList.length})</h2>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
        <input className="input-field pl-10" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u._id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 font-bold text-sm">{u.name ? u.name[0].toUpperCase() : u.phone?.slice(-2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{u.name || 'No name'}</p>
                  {u.role === 'admin' && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">Admin</span>}
                  {u.isPlatinum && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Crown size={9} /> Platinum</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">+91 {u.phone} {u.email ? `• ${u.email}` : ''}</p>
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">{new Date(u.createdAt).toLocaleDateString('en-IN')}</p>
            </div>
          ))}
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

// ─── Save icon import fix ─────────────────────────────────────────────────────
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
      case 'overview': return <OverviewSection stats={stats} onRefresh={loadStats} />;
      case 'orders': return <OrdersSection />;
      case 'payments': return <PaymentsSection />;
      case 'platinum': return <PlatinumSection />;
      case 'products':   return <ProductsSection />;
      case 'categories': return <CategoriesSection />;
      case 'users':      return <UsersSection />;
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
