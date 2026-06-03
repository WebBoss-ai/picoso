'use client';
import { useState } from 'react';
import {
  X, Check, ChevronRight, ChevronLeft, Leaf,
  Zap, ShieldCheck, Clock, Copy, CheckCircle2,
  Sparkles, Info, UtensilsCrossed, Sandwich, Coffee,
  Sun, Moon, Sunset, ArrowRight, Star
} from 'lucide-react';

const UPI_ID = '8210823753@ybl';

/* ─── Bowl data with full nutrition ────────────────────────────── */
const ITEMS = [
  {
    id: 1, name: 'Paneer Power Bowl',
    desc: 'Grilled cottage cheese, brown rice, roasted bell peppers & house sauce',
    cal: 520, protein: 32, carbs: 48, fats: 16, fiber: 8,
    isVeg: true, tag: 'High Protein',
    Icon: UtensilsCrossed,
    from: '#134e1f', to: '#15803d', accent: '#4ade80',
  },
  {
    id: 2, name: 'Chicken Warrior',
    desc: 'Grilled chicken breast, quinoa, spinach, tzatziki & herbs',
    cal: 480, protein: 40, carbs: 36, fats: 12, fiber: 6,
    isVeg: false, tag: 'Bestseller',
    Icon: UtensilsCrossed,
    from: '#1c1917', to: '#44403c', accent: '#d6d3d1',
  },
  {
    id: 3, name: 'Quinoa Delight',
    desc: 'Tri-colour quinoa, chickpeas, roasted sweet potato & tahini drizzle',
    cal: 420, protein: 18, carbs: 60, fats: 10, fiber: 12,
    isVeg: true, tag: 'Pure Veg',
    Icon: Leaf,
    from: '#065f46', to: '#059669', accent: '#6ee7b7',
  },
  {
    id: 4, name: 'Greek Protein Salad',
    desc: 'Romaine, feta, olives, cherry tomatoes, cucumber & lemon vinaigrette',
    cal: 380, protein: 22, carbs: 28, fats: 18, fiber: 10,
    isVeg: true, tag: 'Light & Fresh',
    Icon: Leaf,
    from: '#1e3a5f', to: '#1d4ed8', accent: '#93c5fd',
  },
  {
    id: 5, name: 'Egg White Wrap',
    desc: 'Fluffy egg whites, avocado, spinach & roasted veggies in a whole-wheat wrap',
    cal: 390, protein: 28, carbs: 40, fats: 10, fiber: 7,
    isVeg: true, tag: 'Post-Workout',
    Icon: Sandwich,
    from: '#4c1d95', to: '#7c3aed', accent: '#c4b5fd',
  },
  {
    id: 6, name: 'Grilled Tofu Bowl',
    desc: 'Marinated tofu, edamame, brown rice, sesame-ginger glaze',
    cal: 440, protein: 24, carbs: 44, fats: 14, fiber: 9,
    isVeg: true, tag: 'Vegan',
    Icon: UtensilsCrossed,
    from: '#164e63', to: '#0891b2', accent: '#67e8f9',
  },
  {
    id: 7, name: 'Masala Oats Bowl',
    desc: 'Steel-cut oats, turmeric broth, roasted veggies & coriander chutney',
    cal: 350, protein: 14, carbs: 52, fats: 8, fiber: 11,
    isVeg: true, tag: 'Morning Fuel',
    Icon: Coffee,
    from: '#78350f', to: '#b45309', accent: '#fcd34d',
  },
  {
    id: 8, name: 'Brown Rice Rajma',
    desc: 'Slow-cooked kidney beans, brown rice, pickled onions & mint raita',
    cal: 460, protein: 20, carbs: 62, fats: 10, fiber: 14,
    isVeg: true, tag: 'Comfort Meal',
    Icon: UtensilsCrossed,
    from: '#7f1d1d', to: '#b91c1c', accent: '#fca5a5',
  },
  {
    id: 9, name: 'Sprouts Power Salad',
    desc: 'Mixed sprouts, cucumber, pomegranate, lemon & chaat masala',
    cal: 300, protein: 16, carbs: 28, fats: 6, fiber: 12,
    isVeg: true, tag: 'Super Light',
    Icon: Leaf,
    from: '#14532d', to: '#22c55e', accent: '#bbf7d0',
  },
  {
    id: 10, name: 'Multigrain Sandwich',
    desc: 'Multigrain bread, grilled veggies, hummus, sprouts & mustard',
    cal: 410, protein: 18, carbs: 50, fats: 12, fiber: 10,
    isVeg: true, tag: 'Wholesome',
    Icon: Sandwich,
    from: '#134e4a', to: '#0f766e', accent: '#99f6e4',
  },
];

/* ─── Plans ─────────────────────────────────────────────────────── */
const PLANS = [
  { id: 3, bowls: 3, price: 690,  perBowl: 230, savings: null, tag: 'Starter',     hero: false },
  { id: 5, bowls: 5, price: 1100, perBowl: 220, savings: 50,   tag: 'Most Popular', hero: true  },
  { id: 7, bowls: 7, price: 1400, perBowl: 200, savings: 210,  tag: 'Best Value',  hero: false },
];

/* ─── Time slots 10 AM–10 PM ────────────────────────────────────── */
const SLOT_GROUPS = [
  {
    label: 'Morning', Icon: Sun, color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    slots: ['10:00','10:30','11:00','11:30'].map(v => {
      const [h] = v.split(':'); const h12 = +h; return { value: v, label: `${h12}:${v.split(':')[1]} AM` };
    }),
  },
  {
    label: 'Afternoon', Icon: Sunset, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa',
    slots: ['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'].map(v => {
      const h = +v.split(':')[0]; const h12 = h > 12 ? h - 12 : h; const m = v.split(':')[1];
      return { value: v, label: `${h12}:${m} ${h >= 12 ? 'PM' : 'AM'}` };
    }),
  },
  {
    label: 'Evening', Icon: Moon, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe',
    slots: ['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'].map(v => {
      const h = +v.split(':')[0]; const h12 = h > 12 ? h - 12 : h; const m = v.split(':')[1];
      return { value: v, label: `${h12}:${m} PM` };
    }),
  },
];

const STEPS = [
  { id: 0, label: 'Select Plan'     },
  { id: 1, label: 'Choose Bowls'   },
  { id: 2, label: 'Delivery Time'  },
  { id: 3, label: 'Payment'        },
];

/* ─── helpers ───────────────────────────────────────────────────── */
function slotLabel(val) {
  if (!val) return '';
  for (const g of SLOT_GROUPS) {
    const found = g.slots.find(s => s.value === val);
    if (found) return found.label;
  }
  return val;
}

function MacroBar({ protein, carbs, fats, cal }) {
  const p = (protein * 4 / cal) * 100;
  const c = (carbs   * 4 / cal) * 100;
  const f = (fats    * 9 / cal) * 100;
  return (
    <div className="flex h-[3px] rounded-full overflow-hidden gap-px">
      <div className="rounded-full" style={{ width: `${p}%`, background: '#22c55e' }}/>
      <div className="rounded-full" style={{ width: `${c}%`, background: '#f59e0b' }}/>
      <div className="rounded-full" style={{ width: `${f}%`, background: '#60a5fa' }}/>
    </div>
  );
}

/* ─── Bowl card ─────────────────────────────────────────────────── */
function BowlCard({ item, selected, atCap, onToggle }) {
  const FoodIcon = item.Icon;
  const off = atCap && !selected;

  return (
    <button
      onClick={() => !off && onToggle(item.id)}
      disabled={off}
      style={{
        boxShadow: selected ? `0 0 0 2px #22c55e, 0 4px 20px rgba(34,197,94,0.15)` : undefined,
      }}
      className={[
        'relative w-full text-left rounded-2xl overflow-hidden border-2 bg-white transition-all duration-200',
        selected ? 'border-brand-500 scale-[1.02]'
        : off     ? 'border-slate-100 opacity-35 cursor-not-allowed'
        :           'border-slate-200 hover:border-slate-300 hover:shadow-md active:scale-[0.99]',
      ].join(' ')}
    >
      {/* ── Image area ── */}
      <div
        className="relative overflow-hidden"
        style={{ paddingTop: '62%', background: `linear-gradient(145deg, ${item.from}, ${item.to})` }}
      >
        {/* dot-grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '18px 18px',
          }}
        />
        {/* glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 75% 25%, ${item.accent}, transparent 55%)` }}
        />
        {/* icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <FoodIcon size={40} color={item.accent} strokeWidth={1.25} className="opacity-60"/>
        </div>

        {/* veg indicator — top left */}
        <div className={[
          'absolute top-2 left-2 w-5 h-5 rounded-[4px] border-2 flex items-center justify-center',
          item.isVeg ? 'bg-white border-green-600' : 'bg-white border-red-500',
        ].join(' ')}>
          <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-500'}`}/>
        </div>

        {/* tag — top right */}
        <div className="absolute top-2 right-2">
          <span className="text-[8px] font-bold text-white/90 bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-full tracking-wide">
            {item.tag}
          </span>
        </div>

        {/* selected check */}
        {selected && (
          <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-brand-500 shadow-lg flex items-center justify-center">
            <Check size={12} color="white" strokeWidth={3}/>
          </div>
        )}

        {/* calorie badge bottom-left */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[9px] font-semibold text-white/80 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
            {item.cal} kcal
          </span>
        </div>
      </div>

      {/* ── Info section ── */}
      <div className="p-2.5 space-y-1.5">
        <p className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-1">{item.name}</p>
        <p className="text-[9px] text-slate-400 leading-snug line-clamp-2">{item.desc}</p>

        {/* Macro bar */}
        <MacroBar protein={item.protein} carbs={item.carbs} fats={item.fats} cal={item.cal}/>

        {/* Macro values */}
        <div className="flex items-center gap-0 text-[9px] font-semibold">
          <span className="text-green-600 mr-1.5">P {item.protein}g</span>
          <span className="text-amber-500 mr-1.5">C {item.carbs}g</span>
          <span className="text-blue-400 mr-1.5">F {item.fats}g</span>
          <span className="text-slate-400 ml-auto">{item.fiber}g fiber</span>
        </div>
      </div>
    </button>
  );
}

/* ─── Step dots ─────────────────────────────────────────────────── */
function StepDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {STEPS.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={[
            'rounded-full transition-all duration-300',
            i === step  ? 'w-6 h-2 bg-brand-500'
            : i < step  ? 'w-2 h-2 bg-brand-300'
            :              'w-2 h-2 bg-slate-200',
          ].join(' ')}/>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function HealthySubscriptionModal({ isOpen, onClose, onSubscribe }) {
  const [step,          setStep]          = useState(0);
  const [selectedPlan,  setSelectedPlan]  = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [slot,          setSlot]          = useState('');
  const [upiRef,        setUpiRef]        = useState('');
  const [copied,        setCopied]        = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [done,          setDone]          = useState(false);

  if (!isOpen) return null;

  const remaining = selectedPlan ? selectedPlan.bowls - selectedItems.length : 0;
  const bowlsDone = selectedPlan && selectedItems.length === selectedPlan.bowls;
  const canNext   = [!!selectedPlan, bowlsDone, !!slot, upiRef.trim().length >= 6][step];

  const toggle = (id) =>
    setSelectedItems(p =>
      p.includes(id) ? p.filter(i => i !== id)
      : p.length < (selectedPlan?.bowls ?? 0) ? [...p, id] : p
    );

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      onSubscribe?.({ items: selectedItems, plan: selectedPlan, timeSlot: slot, upiRef });
      setSubmitting(false); setDone(true);
    }, 900);
  };

  const reset = () => {
    setStep(0); setSelectedPlan(null); setSelectedItems([]);
    setSlot(''); setUpiRef(''); setDone(false);
  };
  const close = () => { reset(); onClose(); };

  /* ── Success ──────────────────────────────────────────────────── */
  if (done) return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={close}/>
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-[28px] shadow-modal overflow-hidden animate-slide-up">
        <div className="h-[3px] bg-gradient-to-r from-brand-400 to-emerald-400"/>
        <div className="px-6 pt-8 pb-7 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-[20px] bg-brand-50 border border-brand-100 flex items-center justify-center">
              <CheckCircle2 size={30} className="text-brand-500"/>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center">
              <Check size={10} color="white" strokeWidth={3}/>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-widest mb-1">Submitted successfully</p>
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">Subscription requested!</h2>
          <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
            <span className="font-semibold text-slate-700">{selectedPlan?.bowls} bowls/week</span> plan at{' '}
            <span className="font-semibold text-slate-700">{slotLabel(slot)}</span> daily.
          </p>
          <p className="text-[12px] text-slate-400 mt-1">Activates within 2–4 hrs after payment verification.</p>

          <div className="w-full mt-5 p-3.5 rounded-[14px] bg-amber-50 border border-amber-100 text-left flex gap-3 items-start">
            <div className="w-8 h-8 rounded-[10px] bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={14} className="text-amber-600"/>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Payment reference</p>
              <p className="text-[12px] font-mono font-bold text-amber-900 mt-0.5">{upiRef}</p>
            </div>
          </div>

          <button onClick={close}
            className="mt-5 w-full h-[48px] rounded-[14px] bg-brand-500 hover:bg-brand-600 text-white text-[14px] font-semibold transition-colors flex items-center justify-center gap-2">
            Done <Check size={14}/>
          </button>
        </div>
      </div>
    </div>
  );

  const ctaLabel =
    step === 0 ? (selectedPlan ? `Choose ${selectedPlan.bowls} bowls` : 'Select a plan first')
    : step === 1 ? 'Set delivery time'
    : step === 2 ? 'Go to payment'
    : submitting  ? 'Submitting…'
    : 'Activate subscription';

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={close}/>

      <div className="
        relative w-full sm:max-w-[480px]
        bg-white rounded-t-[28px] sm:rounded-[28px]
        shadow-modal flex flex-col
        max-h-[92dvh] sm:max-h-[88vh]
        animate-slide-up
      ">
        {/* accent */}
        <div className="h-[3px] bg-gradient-to-r from-brand-400 to-emerald-400 flex-shrink-0 rounded-t-[28px] sm:rounded-t-[28px]"/>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-brand-500 flex items-center justify-center" style={{ boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
              <Leaf size={16} className="text-white"/>
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-none">Healthy Subscription</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{STEPS[step].label}</p>
            </div>
          </div>
          <button onClick={close}
            className="w-8 h-8 rounded-[10px] bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            <X size={14}/>
          </button>
        </div>

        {/* Step dots */}
        <StepDots step={step}/>

        {/* Divider */}
        <div className="flex-shrink-0 h-px bg-slate-100 mx-5"/>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar">

          {/* ══ Step 0: Plan ══════════════════════════════════════ */}
          {step === 0 && (
            <div className="px-5 pt-4 pb-4 space-y-3">
              <p className="text-[12px] text-slate-500 leading-relaxed mb-1">
                Pick how many bowls you want each week. The more you commit, the lower your per-meal cost.
              </p>

              {PLANS.map(plan => {
                const sel = selectedPlan?.id === plan.id;
                if (plan.hero) return (
                  <button key={plan.id}
                    onClick={() => { setSelectedPlan(plan); setSelectedItems([]); }}
                    className={[
                      'relative w-full text-left rounded-[20px] p-4 overflow-hidden transition-all duration-200 active:scale-[0.99]',
                      sel ? 'ring-2 ring-offset-2 ring-brand-500' : '',
                    ].join(' ')}
                    style={{ background: 'linear-gradient(135deg, #14532d 0%, #15803d 40%, #16a34a 75%, #22c55e 100%)' }}
                  >
                    {/* highlight orb */}
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-12 translate-x-8 opacity-10 pointer-events-none"
                      style={{ background: 'radial-gradient(circle, white, transparent)' }}/>

                    <div className="flex items-center justify-between gap-3 relative">
                      <div>
                        <div className="inline-flex items-center gap-1.5 mb-2">
                          <Star size={9} className="text-yellow-300" fill="#fde047"/>
                          <span className="text-[9px] font-bold text-white/80 uppercase tracking-[0.12em]">
                            Most Popular
                          </span>
                        </div>
                        <p className="text-[17px] font-bold text-white leading-none">{plan.bowls} bowls</p>
                        <p className="text-[12px] text-white/65 mt-0.5">per week · ₹{plan.perBowl} / bowl</p>
                        <p className="text-[11px] text-emerald-300 mt-1.5">Save ₹{plan.savings} every week</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[32px] font-black text-white leading-none">₹{plan.price}</p>
                        <p className="text-[10px] text-white/50 mt-0.5">/week</p>
                        {sel && (
                          <div className="mt-2 ml-auto w-6 h-6 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                            <Check size={12} className="text-white" strokeWidth={3}/>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );

                return (
                  <button key={plan.id}
                    onClick={() => { setSelectedPlan(plan); setSelectedItems([]); }}
                    className={[
                      'w-full text-left rounded-[18px] p-4 border-2 transition-all duration-200 active:scale-[0.99]',
                      sel ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-slate-900">{plan.bowls} bowls / week</p>
                        <p className={['text-[12px] mt-0.5', sel ? 'text-brand-600' : 'text-slate-400'].join(' ')}>
                          ₹{plan.perBowl} per bowl · {plan.tag}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[24px] font-black text-slate-900 leading-none text-right">₹{plan.price}</p>
                          <p className="text-[10px] text-slate-400 text-right mt-0.5">/week</p>
                        </div>
                        {sel && (
                          <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                            <Check size={11} color="white" strokeWidth={3}/>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Perks */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { Icon: Zap,         t: 'Priority Delivery',  d: 'Your bowls jump the queue'    },
                  { Icon: ShieldCheck, t: 'Cancel Anytime',     d: 'Zero lock-in, zero stress'    },
                  { Icon: Clock,       t: 'Always Fresh',       d: 'Made fresh every single day'  },
                  { Icon: CheckCircle2,t: 'Swap Weekly',        d: 'Change bowls anytime you want' },
                ].map(({ Icon, t, d }) => (
                  <div key={t} className="flex items-start gap-2.5 p-3 rounded-[14px] bg-slate-50 border border-slate-100">
                    <div className="w-7 h-7 rounded-[8px] bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <Icon size={13} className="text-brand-500"/>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-800">{t}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ Step 1: Bowls ═════════════════════════════════════ */}
          {step === 1 && selectedPlan && (
            <div className="px-5 pt-4 pb-4">
              {/* progress header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">
                    Pick {selectedPlan.bowls} bowls you'll love
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {bowlsDone ? 'Perfect! Tap to swap any bowl.' : `${remaining} more to go`}
                  </p>
                </div>
                <div className={[
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all',
                  bowlsDone ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600',
                ].join(' ')}>
                  {selectedItems.length} / {selectedPlan.bowls}
                  {bowlsDone && <Check size={9} strokeWidth={3}/>}
                </div>
              </div>

              {/* macro legend */}
              <div className="flex items-center gap-3 mb-3 px-1">
                {[['#22c55e','Protein'],['#f59e0b','Carbs'],['#60a5fa','Fats']].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: c }}/>
                    <span className="text-[9px] text-slate-400 font-medium">{l}</span>
                  </div>
                ))}
              </div>

              {/* progress bar */}
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(selectedItems.length / selectedPlan.bowls) * 100}%`,
                    background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                  }}
                />
              </div>

              {/* Bowl grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {ITEMS.map(item => (
                  <BowlCard
                    key={item.id}
                    item={item}
                    selected={selectedItems.includes(item.id)}
                    atCap={remaining === 0}
                    onToggle={toggle}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ══ Step 2: Time slot ═════════════════════════════════ */}
          {step === 2 && (
            <div className="px-5 pt-4 pb-4 space-y-4">
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Choose your preferred 30-min delivery window. Your bowls arrive at this time every day.
              </p>

              {SLOT_GROUPS.map(group => {
                const GIcon = group.Icon;
                return (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 mb-2">
                      <GIcon size={12} style={{ color: group.color }}/>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: group.color }}>
                        {group.label}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {group.slots.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setSlot(s.value)}
                          className={[
                            'h-[38px] rounded-[10px] text-[10px] font-semibold transition-all duration-150',
                            slot === s.value
                              ? 'bg-brand-500 text-white shadow-md'
                              : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50',
                          ].join(' ')}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {slot && (
                <div className="flex items-center gap-3 p-4 rounded-[14px] bg-brand-50 border border-brand-100">
                  <div className="w-9 h-9 rounded-[10px] bg-brand-500 flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-brand-700">Delivery confirmed</p>
                    <p className="text-[13px] font-bold text-brand-900">Every day at {slotLabel(slot)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ Step 3: Payment ═══════════════════════════════════ */}
          {step === 3 && (
            <div className="px-5 pt-4 pb-4 space-y-3">
              {/* Summary card */}
              <div className="rounded-[18px] overflow-hidden"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                <div className="p-4" style={{ background: 'linear-gradient(135deg, #14532d, #15803d, #16a34a)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Total due</p>
                      <p className="text-[36px] font-black text-white leading-none mt-0.5">₹{selectedPlan?.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/50">per week</p>
                      <p className="text-[13px] font-semibold text-white mt-0.5">₹{selectedPlan?.perBowl}/bowl</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                    <div>
                      <p className="text-[10px] text-white/50">Bowls</p>
                      <p className="text-[12px] font-semibold text-white">{selectedPlan?.bowls}/week</p>
                    </div>
                    <div className="w-px h-6 bg-white/15"/>
                    <div>
                      <p className="text-[10px] text-white/50">Delivery</p>
                      <p className="text-[12px] font-semibold text-white">{slotLabel(slot)}</p>
                    </div>
                    {selectedPlan?.savings && (
                      <>
                        <div className="w-px h-6 bg-white/15"/>
                        <div>
                          <p className="text-[10px] text-white/50">You save</p>
                          <p className="text-[12px] font-semibold text-emerald-300">₹{selectedPlan.savings}/wk</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* UPI block */}
              <div className="p-4 rounded-[16px] border-2 border-amber-200 bg-amber-50">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Pay via UPI</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[15px] font-bold text-slate-900 tracking-wide">{UPI_ID}</p>
                  <button onClick={copyUPI}
                    className={[
                      'flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[11px] font-semibold transition-all flex-shrink-0',
                      copied ? 'bg-brand-500 text-white' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100',
                    ].join(' ')}
                  >
                    {copied ? <><Check size={11}/> Copied</> : <><Copy size={11}/> Copy</>}
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2.5">
                {[
                  `Open PhonePe, GPay, Paytm or any UPI app`,
                  `Send exactly ₹${selectedPlan?.price} to ${UPI_ID}`,
                  'Copy the 12-digit UTR / transaction reference',
                  'Paste it below to complete activation',
                ].map((txt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-[22px] h-[22px] rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-[12px] text-slate-600 leading-relaxed">{txt}</p>
                  </div>
                ))}
              </div>

              {/* UTR input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                  Transaction Reference / UTR No.
                </label>
                <input
                  type="text"
                  value={upiRef}
                  onChange={e => setUpiRef(e.target.value)}
                  placeholder="e.g. 524893012345"
                  className="w-full h-[48px] px-4 rounded-[13px] border-2 border-slate-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 text-[13px] font-mono font-semibold placeholder:font-normal placeholder:text-slate-300 outline-none transition-all bg-white"
                />
                {upiRef.length > 0 && upiRef.length < 6 && (
                  <p className="flex items-center gap-1 text-[10px] text-red-500 mt-1.5">
                    <Info size={10}/> Enter a valid transaction reference (min. 6 characters)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pt-3 pb-5 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 h-[50px] px-4 rounded-[14px] border-2 border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition-all flex-shrink-0"
              >
                <ChevronLeft size={15}/> Back
              </button>
            )}
            <button
              disabled={!canNext || submitting}
              onClick={step < 3 ? () => setStep(s => s + 1) : submit}
              className={[
                'flex-1 flex items-center justify-center gap-2 h-[50px] rounded-[14px] text-white text-[13px] font-semibold transition-all',
                canNext && !submitting
                  ? 'bg-brand-500 hover:bg-brand-600 active:scale-[0.99] shadow-md shadow-brand-200/50'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed',
              ].join(' ')}
            >
              {ctaLabel}
              {!submitting && step < 3 && <ChevronRight size={15}/>}
              {!submitting && step === 3 && <Sparkles size={14}/>}
            </button>
          </div>
          {step === 3 && (
            <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-2.5">
              <ShieldCheck size={10}/> Your subscription activates after we verify your UPI payment
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
