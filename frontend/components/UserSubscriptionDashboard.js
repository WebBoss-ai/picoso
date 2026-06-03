'use client';
import { useState, useEffect } from 'react';
import {
  Leaf, Clock, CalendarDays, CheckCircle2, XCircle, PauseCircle,
  ChevronRight, RotateCcw, AlertCircle, Zap, Flame, Wheat,
  Edit3, X, Check
} from 'lucide-react';
import { healthySubscription } from '@/lib/api';
import HealthySubscriptionModal from './HealthySubscriptionModal';

const STATUS_CONFIG = {
  pending_payment: { label: 'Awaiting Payment',  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200', Icon: AlertCircle   },
  pending_approval:{ label: 'Pending Approval',   color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',  Icon: Clock         },
  active:          { label: 'Active',             color: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-200', Icon: CheckCircle2  },
  paused:          { label: 'Paused',             color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200',  Icon: PauseCircle   },
  cancelled:       { label: 'Cancelled',          color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-200',   Icon: XCircle       },
};

const DUMMY_ITEMS_MAP = {
  1:  { name: 'Paneer Power Bowl',   protein: 32, cal: 520, carbs: 48, gradient: ['#14532d','#166534'] },
  2:  { name: 'Chicken Warrior',     protein: 40, cal: 480, carbs: 36, gradient: ['#1c1917','#292524'] },
  3:  { name: 'Quinoa Delight',      protein: 18, cal: 420, carbs: 60, gradient: ['#065f46','#047857'] },
  4:  { name: 'Greek Protein Salad', protein: 22, cal: 380, carbs: 30, gradient: ['#1e3a5f','#1e40af'] },
  5:  { name: 'Egg White Wrap',      protein: 28, cal: 390, carbs: 40, gradient: ['#4c1d95','#6d28d9'] },
  6:  { name: 'Grilled Tofu Bowl',   protein: 24, cal: 440, carbs: 44, gradient: ['#164e63','#0e7490'] },
  7:  { name: 'Masala Oats Bowl',    protein: 14, cal: 350, carbs: 52, gradient: ['#78350f','#92400e'] },
  8:  { name: 'Brown Rice Rajma',    protein: 20, cal: 460, carbs: 62, gradient: ['#881337','#be123c'] },
  9:  { name: 'Sprouts Salad Bowl',  protein: 16, cal: 300, carbs: 28, gradient: ['#14532d','#15803d'] },
  10: { name: 'Multigrain Sandwich', protein: 18, cal: 410, carbs: 50, gradient: ['#134e4a','#0f766e'] },
};

function fmt24to12(val) {
  if (!val) return '';
  const [h, m] = val.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h > 12 ? h - 12 : h || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

export default function UserSubscriptionDashboard() {
  const [sub,          setSub]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [cancelling,   setCancelling]   = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [confirmCancel,setConfirmCancel]= useState(false);

  const load = () => {
    setLoading(true);
    healthySubscription.getStatus()
      .then(r => setSub(r.data.subscription))
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await healthySubscription.cancel();
      load();
      setConfirmCancel(false);
    } catch {}
    setCancelling(false);
  };

  const handleSubscribed = ({ items, plan, timeSlot, upiRef }) => {
    healthySubscription.create({
      selectedItems: items.map(String),
      bowlsPerWeek:  plan.id,
      timeSlot,
      upiRef,
    }).then(() => { load(); setShowModal(false); }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-32 bg-gray-100 rounded-2xl"/>
        <div className="h-24 bg-gray-100 rounded-2xl"/>
      </div>
    );
  }

  /* ── No subscription yet ─────────────────────────────────────── */
  if (!sub || sub.status === 'cancelled') {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
            <Leaf size={22} className="text-brand-500"/>
          </div>
          <div>
            <p className="font-extrabold text-gray-900">No Active Subscription</p>
            <p className="text-xs text-gray-400 mt-1">
              Subscribe to get 3, 5, or 7 fresh bowls every week at the best per-meal price.
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
            <Leaf size={14}/> Get Started
          </button>
        </div>
        <HealthySubscriptionModal isOpen={showModal} onClose={() => setShowModal(false)} onSubscribe={handleSubscribed}/>
      </>
    );
  }

  const cfg     = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending_approval;
  const StatusIcon = cfg.Icon;
  const items   = (sub.selectedItems || []).map(id => DUMMY_ITEMS_MAP[Number(id)]).filter(Boolean);
  const weeklyTotal = sub.weeklyPrice || 0;
  const avgProtein  = items.length ? Math.round(items.reduce((s, i) => s + i.protein, 0) / items.length) : 0;

  return (
    <>
      {/* Status card */}
      <div className={`rounded-2xl border p-4 mb-3 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StatusIcon size={18} className={cfg.color}/>
            <div>
              <p className={`text-sm font-extrabold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {sub.status === 'pending_approval' && 'Payment received · awaiting admin confirmation'}
                {sub.status === 'active'           && `Next delivery: ${sub.nextDelivery ? new Date(sub.nextDelivery).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'}) : 'Tomorrow'}`}
                {sub.status === 'paused'           && 'Your subscription is currently paused'}
                {sub.status === 'pending_payment'  && 'Complete UPI payment to activate'}
              </p>
            </div>
          </div>
          {sub.status === 'active' && (
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"/>
          )}
        </div>
      </div>

      {/* Plan overview */}
      <div className="rounded-2xl border border-brand-100 bg-white overflow-hidden mb-3">
        <div className="h-1 bg-gradient-to-r from-brand-400 to-emerald-400"/>
        <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">Your Plan</p>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline">
            <Edit3 size={11}/> Change Plan
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-brand-500 flex flex-col items-center justify-center text-white flex-shrink-0">
            <span className="text-xl font-black leading-none">{sub.bowlsPerWeek}</span>
            <span className="text-[9px] font-semibold text-white/70">bowls</span>
          </div>
          <div className="flex-1">
            <p className="font-extrabold text-gray-900">{sub.bowlsPerWeek} bowls / week</p>
            <p className="text-[11px] text-gray-500 mt-0.5">₹{sub.perBowlPrice}/bowl · ₹{weeklyTotal}/week</p>
            {sub.timeSlot && (
              <div className="flex items-center gap-1 mt-1.5">
                <Clock size={11} className="text-brand-500"/>
                <span className="text-[11px] font-semibold text-gray-600">Daily at {fmt24to12(sub.timeSlot)}</span>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Macro summary */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { Icon: Zap,   label: 'Avg Protein', value: `${avgProtein}g`,   color: 'text-brand-600', bg: 'bg-brand-50' },
          { Icon: Flame, label: 'Avg Calories', value: items.length ? Math.round(items.reduce((s,i)=>s+i.cal,0)/items.length) : 0, color: 'text-orange-500', bg: 'bg-orange-50' },
          { Icon: Wheat, label: 'Avg Carbs',   value: `${items.length ? Math.round(items.reduce((s,i)=>s+i.carbs,0)/items.length) : 0}g`, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ Icon, label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border border-gray-100 p-3 ${bg}`}>
            <Icon size={14} className={`${color} mb-1`}/>
            <p className="text-base font-extrabold text-gray-900 leading-none">{value}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Bowls rotation */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">Your Rotation</p>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline">
              <RotateCcw size={11}/> Swap Bowls
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {items.map((item, i) => item && (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                <div className="relative w-full" style={{ paddingTop: '80%', background: `linear-gradient(145deg,${item.gradient[0]},${item.gradient[1]})` }}>
                  <span className="absolute inset-0 flex items-center justify-center text-white/70 font-black text-lg">{item.name[0]}</span>
                </div>
                <div className="p-1.5 bg-white">
                  <p className="text-[8px] font-bold text-gray-700 text-center line-clamp-2 leading-tight">{item.name}</p>
                  <p className="text-[8px] text-center text-brand-600 font-semibold mt-0.5">{item.protein}g P</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery info */}
      {sub.timeSlot && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-3">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-2.5">Delivery Schedule</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center"><Clock size={16} className="text-brand-600"/></div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{fmt24to12(sub.timeSlot)} daily</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Mon – Sun, {sub.bowlsPerWeek} bowls/week</p>
            </div>
          </div>
        </div>
      )}

      {/* Cancel */}
      {(sub.status === 'active' || sub.status === 'paused') && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide mb-2.5">Manage</p>
          {confirmCancel ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm font-bold text-red-700 mb-2">Cancel subscription?</p>
              <p className="text-xs text-red-500 mb-3">Your current cycle will continue until the end of the week. No refunds for the current period.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50">Keep it</button>
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50">
                  {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmCancel(true)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5">
              <XCircle size={13}/> Cancel Subscription
            </button>
          )}
        </div>
      )}

      <HealthySubscriptionModal isOpen={showModal} onClose={() => setShowModal(false)} onSubscribe={handleSubscribed}/>
    </>
  );
}
