'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Clock, Scale, Flame, Leaf, Check,
  ChevronLeft, X, Loader2, MapPin,
} from 'lucide-react';
import { breakfastSubscription } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/* ── palette ─────────────────────────────────────────────────────────────── */
const pink = {
  50:  '#FDF7F8',
  100: '#FAECEF',
  200: '#F3D4DB',
  300: '#E8B4BF',
  400: '#D48A9A',
  500: '#C46B7E',
  600: '#A85264',
  700: '#7A3A48',
  ink: '#2C1E22',
  muted: '#8A6F76',
};

function VegDot({ isVeg = true, size = 16 }) {
  const on = isVeg !== false;
  const border = on ? '#16a34a' : '#dc2626';
  const fill = on ? '#16a34a' : '#dc2626';
  const s = size;
  const inner = Math.max(4, Math.round(size * 0.35));
  return (
    <div
      className="rounded-[3px] border-2 flex items-center justify-center flex-shrink-0 bg-white"
      style={{ width: s, height: s, borderColor: border }}
      title={on ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <div className="rounded-full" style={{ width: inner, height: inner, background: fill }} />
    </div>
  );
}

function SquareFoodImage({ src, alt, className = '', size }) {
  const dim = size ? { width: size, height: size } : undefined;
  return (
    <div
      className={`relative overflow-hidden flex-shrink-0 ${className}`}
      style={{
        ...dim,
        aspectRatio: '1 / 1',
        background: `linear-gradient(145deg, ${pink[100]} 0%, ${pink[200]} 100%)`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt || ''}
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf size={size ? size * 0.28 : 22} style={{ color: pink[400] }} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

function MacroChips({ item, large = false }) {
  const chips = [
    { k: 'Energy', v: `${item.calories || 0} kcal` },
    { k: 'Protein', v: `${item.protein || 0}g` },
    { k: 'Carbs', v: `${item.carbs || 0}g` },
    { k: 'Fats', v: `${item.fats || 0}g` },
  ];
  return (
    <div className={`grid grid-cols-4 ${large ? 'gap-2' : 'gap-1.5'}`}>
      {chips.map((c) => (
        <div
          key={c.k}
          className="rounded-xl text-center border"
          style={{
            background: pink[50],
            borderColor: pink[200],
            padding: large ? '10px 4px' : '6px 2px',
          }}
        >
          <p
            className="font-semibold leading-none"
            style={{
              color: pink.ink,
              fontSize: large ? 13 : 11,
              fontFamily: large ? "'Cormorant Garamond', serif" : 'inherit',
            }}
          >
            {c.v}
          </p>
          <p
            className="mt-1 uppercase tracking-wide"
            style={{ color: pink.muted, fontSize: large ? 9 : 8 }}
          >
            {c.k}
          </p>
        </div>
      ))}
    </div>
  );
}

/* Premium expanded plate detail */
function PlateDetailSheet({ detail, onClose }) {
  if (!detail) return null;
  const { item, row, idx } = detail;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-[#2C1E22]/45 backdrop-blur-[3px] animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] border shadow-modal animate-slide-up"
        style={{
          background: pink[50],
          borderColor: pink[200],
        }}
      >
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${pink[300]}, ${pink[500]})` }} />

        {/* square hero image */}
        <div className="px-5 pt-5">
          <div className="relative mx-auto w-full max-w-[280px]">
            <div
              className="rounded-[22px] overflow-hidden border shadow-sm"
              style={{
                borderColor: pink[200],
                boxShadow: `0 16px 40px -16px ${pink[500]}55`,
              }}
            >
              <SquareFoodImage src={item.image} alt={item.name} className="w-full" />
            </div>
            {idx === 0 && (
              <span
                className="absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: pink[600], color: '#fff' }}
              >
                First day
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center border shadow-sm"
              style={{ background: '#fff', borderColor: pink[200], color: pink[700] }}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-5 pb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {row?.date && (
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: pink[600] }}
                >
                  {formatWeekdayShort(row.date)} · {formatDayLabel(row.date)}
                </p>
              )}
              <h3
                className="text-[1.55rem] font-semibold leading-tight mt-1"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: pink.ink }}
              >
                {item.name}
              </h3>
            </div>
            <VegDot isVeg={item.isVeg} size={18} />
          </div>

          {item.tag && (
            <span
              className="inline-flex mt-3 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
              style={{ background: pink[100], color: pink[700] }}
            >
              {item.tag}
            </span>
          )}

          <p className="mt-3.5 text-[13.5px] leading-relaxed" style={{ color: pink.muted }}>
            {item.description}
          </p>

          <div className="mt-5">
            <p
              className="text-[10px] uppercase tracking-[0.16em] font-medium mb-2.5"
              style={{ color: pink[600] }}
            >
              Nutrition
            </p>
            <MacroChips item={item} large />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full h-[50px] rounded-2xl text-[14px] font-semibold text-white active:scale-[0.99] transition-transform"
            style={{
              background: `linear-gradient(135deg, ${pink[500]} 0%, ${pink[600]} 100%)`,
              boxShadow: `0 12px 28px -10px ${pink[400]}aa`,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const FALLBACK_ITEMS = [
  {
    _id: 'ps_001',
    name: 'Berry Nut Muesli & Yogurt Bowl',
    description:
      'Creamy yogurt layered with crunchy muesli, toasted nuts, seeds, and juicy pomegranate for a refreshing, satisfying breakfast.',
    tag: 'Healthy Breakfast',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_001.png',
    calories: 420,
    protein: 21,
    carbs: 55,
    fats: 16,
    isVeg: true,
  },
  {
    _id: 'ps_002',
    name: 'Smoky Chipotle Paneer & Corn Bowl',
    description:
      "Grilled chipotle paneer with sweet corn and crisp garden vegetables, finished with Picoso's signature creamy dips for a smoky, protein-packed bowl.",
    tag: 'High Protein',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_002.png',
    calories: 390,
    protein: 24,
    carbs: 48,
    fats: 14,
    isVeg: true,
  },
  {
    _id: 'ps_003',
    name: 'Chocolate Banana Overnight Oats',
    description:
      'Rich chocolate overnight oats topped with fresh banana, crunchy almonds, and mixed seeds for a naturally indulgent and energizing breakfast.',
    tag: 'Chocolate Breakfast',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_003.png',
    calories: 450,
    protein: 23,
    carbs: 58,
    fats: 16,
    isVeg: true,
  },
  {
    _id: 'ps_004',
    name: 'Creamy Spinach & Corn Grilled Sandwich',
    description:
      'Golden-grilled sandwich filled with a creamy spinach and sweet corn melt for a hearty, comforting and satisfying bite.',
    tag: 'High Protein',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_004.png',
    calories: 410,
    protein: 28,
    carbs: 42,
    fats: 15,
    isVeg: true,
  },
  {
    _id: 'ps_005',
    name: 'Banana Nut Overnight Oats',
    description:
      'Creamy overnight oats topped with fresh banana, golden toasted oats, crunchy nuts, and seeds for a wholesome, naturally sweet breakfast.',
    tag: 'Healthy Breakfast',
    image: 'https://fitness-plus.s3.ap-south-2.amazonaws.com/ps_005.png',
    calories: 440,
    protein: 22,
    carbs: 61,
    fats: 15,
    isVeg: true,
  },
];

const FALLBACK_SLOTS = [
  '08:00-08:30',
  '08:30-09:00',
  '09:00-09:30',
  '09:30-10:00',
  '10:00-10:30',
  '10:30-11:00',
];

function formatStartDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatDayLabel(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function formatWeekdayShort(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', { weekday: 'short' });
}

function mealIndexForDate(date, count) {
  if (!count || count < 1) return 0;
  const dayOfMonth = new Date(date).getDate();
  return ((dayOfMonth - 1) % count + count) % count;
}

function buildLocalSchedule(items, startDate, days = 5) {
  const list = items || [];
  const schedule = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const idx = mealIndexForDate(d, list.length);
    schedule.push({
      date: d,
      dayOffset: i,
      itemIndex: idx,
      item: list[idx] || null,
    });
  }
  return schedule;
}

function formatSlotLabel(slot) {
  if (!slot) return '';
  const [start, end] = slot.split('-');
  const to12 = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  };
  return `${to12(start)} to ${to12(end)}`;
}

function startDatePlusTwo() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 2);
  return d;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function SubscriptionPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [phase, setPhase] = useState('splash'); // splash | details
  const [items, setItems] = useState(FALLBACK_ITEMS);
  const [schedule, setSchedule] = useState([]);
  const [slots, setSlots] = useState(FALLBACK_SLOTS);
  const [startDate, setStartDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [splashReady, setSplashReady] = useState(false);
  const [location, setLocation] = useState(null); // { lat, lng, accuracy }
  const [locStatus, setLocStatus] = useState('idle'); // idle | loading | ready | denied | error | unsupported
  const [detail, setDetail] = useState(null); // { item, row, idx } | null
  const phoneRef = useRef(null);
  const locWatchRef = useRef(null);
  const locPollRef = useRef(null);

  const stopLocationLoops = useCallback(() => {
    if (locWatchRef.current != null && typeof navigator !== 'undefined' && navigator.geolocation) {
      try { navigator.geolocation.clearWatch(locWatchRef.current); } catch {}
      locWatchRef.current = null;
    }
    if (locPollRef.current != null) {
      clearInterval(locPollRef.current);
      locPollRef.current = null;
    }
  }, []);

  const applyPosition = useCallback((pos) => {
    setLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
    setLocStatus('ready');
    setError('');
    stopLocationLoops();
  }, [stopLocationLoops]);

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocStatus('unsupported');
      return;
    }

    setLocStatus((s) => (s === 'unsupported' ? s : 'loading'));

    navigator.geolocation.getCurrentPosition(
      (pos) => applyPosition(pos),
      (err) => {
        setLocation((prev) => {
          if (prev?.lat != null && prev?.lng != null) {
            // keep existing pin if refresh fails
            setTimeout(() => setLocStatus('ready'), 0);
            return prev;
          }
          setTimeout(() => setLocStatus(err?.code === 1 ? 'denied' : 'error'), 0);
          return null;
        });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [applyPosition]);

  // Keep checking until location permission is granted and pin is set
  useEffect(() => {
    // Only loop after the member has started location capture (not on first idle)
    const waiting =
      showModal &&
      !success &&
      locStatus !== 'ready' &&
      locStatus !== 'unsupported' &&
      locStatus !== 'idle';

    if (!waiting) {
      if (!showModal || success || locStatus === 'ready') stopLocationLoops();
      return undefined;
    }

    let permStatus = null;
    const onPermChange = () => {
      if (permStatus?.state === 'granted') requestLocation();
      if (permStatus?.state === 'denied') setLocStatus('denied');
    };

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          permStatus = status;
          status.addEventListener?.('change', onPermChange);
          if (status.state === 'granted') requestLocation();
          if (status.state === 'denied') setLocStatus('denied');
        })
        .catch(() => {});
    }

    if (!locPollRef.current) {
      locPollRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        requestLocation();
      }, 3000);
    }

    if (!locWatchRef.current && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        locWatchRef.current = navigator.geolocation.watchPosition(
          (pos) => applyPosition(pos),
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
        );
      } catch {}
    }

    return () => {
      if (permStatus?.removeEventListener) {
        try { permStatus.removeEventListener('change', onPermChange); } catch {}
      }
    };
  }, [showModal, success, locStatus, requestLocation, applyPosition, stopLocationLoops]);

  useEffect(() => () => stopLocationLoops(), [stopLocationLoops]);

  useEffect(() => {
    const start = startDatePlusTwo();
    setStartDate(start);
    setSchedule(buildLocalSchedule(FALLBACK_ITEMS, start, 5));
    const t = setTimeout(() => setSplashReady(true), 80);
    breakfastSubscription.getMenu()
      .then((r) => {
        const nextItems = r.data?.items?.length ? r.data.items : FALLBACK_ITEMS;
        const nextStart = r.data?.earliestStart ? new Date(r.data.earliestStart) : start;
        setItems(nextItems);
        setStartDate(nextStart);
        if (r.data?.timeSlots?.length) setSlots(r.data.timeSlots);
        if (r.data?.schedule?.length) {
          setSchedule(r.data.schedule.map((row) => ({
            ...row,
            date: new Date(row.date),
          })));
        } else {
          setSchedule(buildLocalSchedule(nextItems, nextStart, 5));
        }
      })
      .catch(() => {});
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!success) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.push('/menu');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success, router]);

  useEffect(() => {
    if (showModal && !success) {
      setTimeout(() => phoneRef.current?.focus(), 200);
    }
  }, [showModal, success]);

  const canStart = !!selectedSlot;

  const openStartModal = () => {
    if (!canStart) {
      setError('Choose a delivery window to continue');
      return;
    }
    setError('');
    setShowModal(true);
  };

  const handleSubmit = useCallback(async () => {
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!selectedSlot) {
      setError('Choose a delivery window first');
      return;
    }
    if (!location?.lat || !location?.lng) {
      setError('Tap Get my current location and allow access to continue');
      requestLocation();
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await breakfastSubscription.expressInterest({
        phone,
        timeSlot: selectedSlot,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
      });
      if (data?.token && data?.user) {
        login(data.token, data.user);
      }
      setSuccess(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [phone, selectedSlot, location, login, requestLocation]);

  const startLabel = useMemo(() => formatStartDate(startDate), [startDate]);
  const displaySchedule = useMemo(() => {
    if (schedule.length) return schedule;
    if (startDate && items.length) return buildLocalSchedule(items, startDate, 5);
    return [];
  }, [schedule, startDate, items]);

  const locationReady = locStatus === 'ready' && !!location?.lat && !!location?.lng;

  useEffect(() => {
    if (!detail) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [detail]);

  /* ── Splash ─────────────────────────────────────────────────────────────── */
  if (phase === 'splash') {
    return (
      <div
        className="min-h-[100dvh] flex flex-col relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${pink[50]} 0%, ${pink[100]} 42%, #F7E4E8 100%)`,
          fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* soft atmosphere */}
        <div
          className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full opacity-50"
          style={{ background: `radial-gradient(circle, ${pink[200]} 0%, transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute bottom-32 -left-16 w-64 h-64 rounded-full opacity-40"
          style={{ background: `radial-gradient(circle, ${pink[300]} 0%, transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #2C1E22 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />

        <div
          className={`relative flex-1 flex flex-col px-6 pt-12 pb-8 max-w-md mx-auto w-full transition-all duration-700 ${
            splashReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* brand */}
          <div className="mb-10">
            <p
              className="text-[11px] tracking-[0.28em] uppercase font-medium mb-3"
              style={{ fontFamily: 'Outfit, sans-serif', color: pink[600] }}
            >
              Picoso mornings
            </p>
            <h1
              className="text-[2.65rem] leading-[1.08] font-semibold tracking-tight"
              style={{ color: pink.ink }}
            >
              Breakfast,
              <br />
              <span style={{ fontStyle: 'italic', fontWeight: 500, color: pink[600] }}>
                composed for you.
              </span>
            </h1>
            <p
              className="mt-4 text-[15px] leading-relaxed max-w-[18rem]"
              style={{ fontFamily: 'Outfit, sans-serif', color: pink.muted, fontWeight: 400 }}
            >
              Five thoughtfully prepared mornings, delivered on your schedule. Clean plates. Measured portions. Quiet luxury.
            </p>
          </div>

          {/* pillars */}
          <div className="space-y-3 flex-1">
            {[
              {
                Icon: Flame,
                title: 'Freshly prepared',
                body: 'Cooked the same morning it reaches you. Never reheated, never waiting.',
              },
              {
                Icon: Scale,
                title: 'Weighted proportions',
                body: 'Every plate is portioned with intention so nutrition stays consistent day to day.',
              },
              {
                Icon: Leaf,
                title: 'Clean ingredients',
                body: 'Whole foods only. No fillers, no artificial shortcuts, no noise on the plate.',
              },
              {
                Icon: Clock,
                title: 'A calm morning window',
                body: 'Choose a half-hour slot between 8 and 11. We show up inside it.',
              },
            ].map(({ Icon, title, body }, i) => (
              <div
                key={title}
                className="flex gap-3.5 items-start rounded-2xl px-4 py-3.5 border transition-all duration-500"
                style={{
                  background: 'rgba(255,255,255,0.55)',
                  borderColor: pink[200],
                  backdropFilter: 'blur(8px)',
                  transitionDelay: `${120 + i * 70}ms`,
                  opacity: splashReady ? 1 : 0,
                  transform: splashReady ? 'translateY(0)' : 'translateY(10px)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: pink[100], color: pink[600] }}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <div>
                  <p
                    className="text-[15px] font-semibold leading-none"
                    style={{ fontFamily: 'Outfit, sans-serif', color: pink.ink }}
                  >
                    {title}
                  </p>
                  <p
                    className="text-[12.5px] mt-1.5 leading-relaxed"
                    style={{ fontFamily: 'Outfit, sans-serif', color: pink.muted }}
                  >
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* bottom */}
          <div className="mt-8 space-y-3">
            <div
              className="flex items-center justify-between rounded-2xl px-4 py-3 border"
              style={{ background: 'rgba(255,255,255,0.7)', borderColor: pink[200] }}
            >
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.14em]"
                  style={{ fontFamily: 'Outfit, sans-serif', color: pink.muted }}
                >
                  Weekly membership
                </p>
                <p
                  className="text-[22px] font-semibold leading-none mt-1"
                  style={{ fontFamily: 'Outfit, sans-serif', color: pink.ink }}
                >
                  ₹1,150
                  <span className="text-[13px] font-normal" style={{ color: pink.muted }}>
                    {' '}/ week
                  </span>
                </p>
              </div>
              <p
                className="text-[12px] text-right leading-snug"
                style={{ fontFamily: 'Outfit, sans-serif', color: pink.muted }}
              >
                5 breakfasts
                <br />
                each week
              </p>
            </div>

            <button
              onClick={() => setPhase('details')}
              className="w-full h-[54px] rounded-2xl flex items-center justify-center gap-2 text-[14px] font-semibold text-white active:scale-[0.98] transition-transform"
              style={{
                fontFamily: 'Outfit, sans-serif',
                background: `linear-gradient(135deg, ${pink[500]} 0%, ${pink[600]} 100%)`,
                boxShadow: `0 12px 32px -8px ${pink[400]}aa`,
              }}
            >
              Explore Menu
              <ArrowRight size={16} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Details ────────────────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-[100dvh] flex flex-col relative"
      style={{
        background: pink[50],
        fontFamily: 'Outfit, system-ui, sans-serif',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Outfit:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* top bar */}
      <header
        className="sticky top-0 z-30 px-4 py-3.5 flex items-center gap-3 border-b"
        style={{
          background: 'rgba(253,247,248,0.92)',
          backdropFilter: 'blur(12px)',
          borderColor: pink[200],
        }}
      >
        <button
          onClick={() => setPhase('splash')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: pink[100], color: pink[700] }}
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: pink[600] }}
          >
            Morning membership
          </p>
          <h1
            className="text-[17px] font-semibold leading-tight truncate"
            style={{ color: pink.ink, fontFamily: "'Cormorant Garamond', serif" }}
          >
            Your weekly table
          </h1>
        </div>
      </header>

      {/* scrollable body */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* intro strip */}
        <section className="px-5 pt-6 pb-2">
          <h2
            className="text-[1.75rem] leading-tight font-semibold"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: pink.ink }}
          >
            Five mornings.
            <br />
            <span style={{ fontStyle: 'italic', color: pink[600] }}>One membership.</span>
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: pink.muted }}>
            Five carefully prepared mornings, delivered to you. You choose the window. We handle the rest.
          </p>
        </section>

        {/* first five plate days */}
        <section className="px-5 pt-5 space-y-3">
          <p
            className="text-[10px] uppercase tracking-[0.16em] font-medium"
            style={{ color: pink[600] }}
          >
            Your first five mornings
          </p>

          {displaySchedule.map((row, idx) => {
            const item = row.item;
            if (!item) return null;
            return (
              <button
                key={`${row.date}-${item._id || idx}`}
                type="button"
                onClick={() => setDetail({ item, row, idx })}
                className="w-full text-left rounded-[18px] border p-2.5 flex gap-3 items-center active:scale-[0.99] transition-all"
                style={{
                  background: '#fff',
                  borderColor: pink[200],
                  boxShadow: '0 2px 14px rgba(122,58,72,0.05)',
                }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="rounded-[14px] overflow-hidden border"
                    style={{
                      borderColor: pink[100],
                      boxShadow: `0 6px 16px -8px ${pink[500]}66`,
                    }}
                  >
                    <SquareFoodImage
                      src={item.image}
                      alt={item.name}
                      size={88}
                    />
                  </div>
                  {idx === 0 && (
                    <span
                      className="absolute -top-1.5 -left-1.5 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={{ background: pink[600], color: '#fff' }}
                    >
                      First
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: pink[600] }}
                    >
                      {formatWeekdayShort(row.date)} · {formatDayLabel(row.date)}
                    </p>
                    <VegDot isVeg={item.isVeg} size={14} />
                  </div>
                  <h3
                    className="text-[13.5px] font-semibold leading-snug mt-0.5 line-clamp-2"
                    style={{ color: pink.ink }}
                  >
                    {item.name}
                  </h3>
                  {item.tag && (
                    <p className="text-[10px] mt-1 font-medium" style={{ color: pink[500] }}>
                      {item.tag}
                    </p>
                  )}
                  <div
                    className="flex items-center gap-2 mt-1.5 text-[10px] font-medium"
                    style={{ color: pink[600] }}
                  >
                    <span>{item.calories || 0} kcal</span>
                    <span style={{ opacity: 0.3 }}>·</span>
                    <span>P {item.protein || 0}g</span>
                    <span style={{ opacity: 0.3 }}>·</span>
                    <span className="font-semibold" style={{ color: pink[500] }}>
                      View
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* pricing */}
        <section className="px-5 pt-7">
          <div
            className="rounded-[22px] overflow-hidden border"
            style={{
              borderColor: pink[200],
              background: `linear-gradient(145deg, ${pink[600]} 0%, ${pink[500]} 55%, ${pink[400]} 100%)`,
              boxShadow: `0 16px 40px -12px ${pink[500]}66`,
            }}
          >
            <div className="px-5 pt-5 pb-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-medium">
                Membership
              </p>
              <div className="flex items-end justify-between mt-1.5">
                <div>
                  <p
                    className="text-[2.4rem] font-semibold text-white leading-none tracking-tight"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    ₹1,150
                  </p>
                  <p className="text-[13px] text-white/75 mt-1">per week · 5 days</p>
                </div>
                <div className="text-right pb-1">
                  <p className="text-[20px] font-semibold text-white leading-none">₹230</p>
                  <p className="text-[11px] text-white/65 mt-0.5">per morning</p>
                </div>
              </div>
            </div>
            <div
              className="px-5 py-3 flex items-center justify-between text-[12px]"
              style={{ background: 'rgba(0,0,0,0.12)' }}
            >
              <span className="text-white/80">Five mornings a week</span>
              <span className="text-white font-medium">Pause anytime</span>
            </div>
          </div>
        </section>

        {/* start date */}
        <section className="px-5 pt-6">
          <div
            className="rounded-2xl border px-4 py-4"
            style={{ background: '#fff', borderColor: pink[200] }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.16em] font-medium"
              style={{ color: pink[600] }}
            >
              Delivery begins
            </p>
            <p
              className="text-[1.35rem] font-semibold mt-1 leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: pink.ink }}
            >
              Starting {startLabel}
            </p>
            <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: pink.muted }}>
              Memberships open two days from today so our kitchen can prepare your first run with care.
            </p>
          </div>
        </section>

        {/* time slots */}
        <section className="px-5 pt-6 pb-4">
          <p
            className="text-[10px] uppercase tracking-[0.16em] font-medium mb-1"
            style={{ color: pink[600] }}
          >
            Delivery window
          </p>
          <p className="text-[13px] mb-3.5" style={{ color: pink.muted }}>
            Select a half-hour slot. Your breakfast arrives in this window each morning.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot) => {
              const active = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    setError('');
                  }}
                  className="h-[48px] rounded-xl text-[12.5px] font-medium transition-all active:scale-[0.98] border"
                  style={{
                    background: active ? pink[600] : '#fff',
                    color: active ? '#fff' : pink.ink,
                    borderColor: active ? pink[600] : pink[200],
                    boxShadow: active ? `0 6px 16px -4px ${pink[500]}66` : 'none',
                  }}
                >
                  {formatSlotLabel(slot)}
                </button>
              );
            })}
          </div>

          {selectedSlot && (
            <div
              className="mt-3 flex items-center gap-2.5 rounded-xl px-3.5 py-3 border"
              style={{ background: pink[100], borderColor: pink[200] }}
            >
              <Check size={14} style={{ color: pink[600] }} strokeWidth={2.5} />
              <p className="text-[12px]" style={{ color: pink[700] }}>
                Every morning, {formatSlotLabel(selectedSlot)}, from {startLabel}
              </p>
            </div>
          )}

          {error && !showModal && (
            <p className="mt-3 text-[12px] font-medium" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}
        </section>
      </div>

      {/* fixed CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t"
        style={{
          background: 'rgba(253,247,248,0.96)',
          backdropFilter: 'blur(14px)',
          borderColor: pink[200],
        }}
      >
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={openStartModal}
            className="w-full h-[54px] rounded-2xl flex items-center justify-center gap-2 text-[14.5px] font-semibold text-white active:scale-[0.98] transition-all"
            style={{
              background: canStart
                ? `linear-gradient(135deg, ${pink[500]} 0%, ${pink[600]} 100%)`
                : pink[300],
              boxShadow: canStart ? `0 12px 28px -8px ${pink[400]}aa` : 'none',
              cursor: canStart ? 'pointer' : 'default',
            }}
          >
            I want to start
            <ArrowRight size={16} strokeWidth={2.25} />
          </button>
          <p
            className="text-center text-[11px] mt-2"
            style={{ color: pink.muted }}
          >
            No payment now. We confirm your plan personally.
          </p>
        </div>
      </div>

      {/* phone modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => {
              if (!submitting && !success) setShowModal(false);
            }}
          />
          <div
            className="relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border overflow-hidden animate-slide-up"
            style={{
              background: pink[50],
              borderColor: pink[200],
              boxShadow: '0 24px 64px rgba(44,30,34,0.18)',
            }}
          >
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${pink[300]}, ${pink[500]})` }} />

            {success ? (
              <div className="px-6 pt-8 pb-9 text-center">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5"
                  style={{ background: pink[100] }}
                >
                  <Check size={26} style={{ color: pink[600] }} strokeWidth={2.25} />
                </div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-medium mb-2"
                  style={{ color: pink[600] }}
                >
                  Received
                </p>
                <h3
                  className="text-[1.55rem] font-semibold leading-snug"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: pink.ink }}
                >
                  We&apos;ve noted your interest
                  <br />
                  and we&apos;ll get to you very soon!
                </h3>
                <p className="text-[13px] mt-3 leading-relaxed" style={{ color: pink.muted }}>
                  Your morning membership is with us. We&apos;re opening the full menu so you can explore everything else we prepare.
                </p>

                <div
                  className="mt-6 rounded-2xl border px-4 py-3.5"
                  style={{ background: '#fff', borderColor: pink[200] }}
                >
                  <p className="text-[11px]" style={{ color: pink.muted }}>
                    Taking you to the menu in
                  </p>
                  <p
                    className="text-[2rem] font-semibold leading-none mt-1 tabular-nums"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: pink[600] }}
                  >
                    {countdown}s
                  </p>
                  <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: pink[100] }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{
                        width: `${((3 - countdown) / 3) * 100}%`,
                        background: pink[500],
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 pt-5 pb-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-[0.16em] font-medium"
                      style={{ color: pink[600] }}
                    >
                      Almost there
                    </p>
                    <h3
                      className="text-[1.45rem] font-semibold mt-0.5 leading-tight"
                      style={{ fontFamily: "'Cormorant Garamond', serif", color: pink.ink }}
                    >
                      Where may we reach you?
                    </h3>
                    <p className="text-[12.5px] mt-1.5" style={{ color: pink.muted }}>
                      We&apos;ll confirm your plan on this number.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: pink[100], color: pink[700] }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div
                  className="rounded-xl border px-3.5 py-2.5 mb-4 flex items-center gap-2 text-[12px]"
                  style={{ background: pink[100], borderColor: pink[200], color: pink[700] }}
                >
                  <Clock size={13} />
                  <span>
                    {formatSlotLabel(selectedSlot)} · from {startLabel}
                  </span>
                </div>

                <label className="block text-[11px] font-medium mb-1.5" style={{ color: pink.muted }}>
                  Mobile number
                </label>
                <div
                  className="flex items-center rounded-2xl border overflow-hidden bg-white"
                  style={{ borderColor: error && phone.length !== 10 ? '#fca5a5' : pink[200] }}
                >
                  <span
                    className="pl-4 pr-2 text-[14px] font-medium border-r py-3.5"
                    style={{ color: pink.muted, borderColor: pink[100] }}
                  >
                    +91
                  </span>
                  <input
                    ref={phoneRef}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit();
                    }}
                    placeholder="10-digit number"
                    className="flex-1 px-3 py-3.5 text-[15px] font-medium outline-none bg-transparent"
                    style={{ color: pink.ink }}
                  />
                </div>

                <label className="block text-[11px] font-medium mb-1.5 mt-4" style={{ color: pink.muted }}>
                  Current location
                </label>
                <div
                  className="rounded-[18px] border overflow-hidden"
                  style={{
                    borderColor: locationReady
                      ? pink[300]
                      : locStatus === 'denied' || locStatus === 'error'
                        ? '#fca5a5'
                        : pink[200],
                    background: locationReady ? '#fff' : pink[50],
                    boxShadow: locationReady ? `0 8px 24px -10px ${pink[400]}55` : 'none',
                  }}
                >
                  {locationReady ? (
                    <div className="px-4 py-4 flex items-start gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(145deg, ${pink[500]}, ${pink[600]})`,
                          boxShadow: `0 8px 18px -6px ${pink[500]}99`,
                        }}
                      >
                        <Check size={18} color="#fff" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: pink.ink }}>
                          Location saved
                        </p>
                        <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: pink.muted }}>
                          Your delivery pin is set. You can continue.
                        </p>
                        <button
                          type="button"
                          onClick={requestLocation}
                          className="mt-2 text-[11px] font-semibold"
                          style={{ color: pink[600] }}
                        >
                          Update pin
                        </button>
                      </div>
                      <MapPin size={16} className="flex-shrink-0 mt-1" style={{ color: pink[500] }} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={locStatus === 'loading' || locStatus === 'unsupported'}
                      className="w-full text-left px-4 py-4 flex items-center gap-3 active:scale-[0.99] transition-transform disabled:opacity-80"
                    >
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
                        style={{
                          background: locStatus === 'loading'
                            ? pink[100]
                            : `linear-gradient(145deg, ${pink[500]}, ${pink[600]})`,
                          boxShadow: locStatus === 'loading' ? 'none' : `0 8px 18px -6px ${pink[500]}99`,
                        }}
                      >
                        {locStatus === 'loading' ? (
                          <Loader2 size={18} className="animate-spin" style={{ color: pink[600] }} />
                        ) : (
                          <MapPin size={18} color="#fff" strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold" style={{ color: pink.ink }}>
                          {locStatus === 'loading'
                            ? 'Getting your location...'
                            : 'Get my current location'}
                        </p>
                        <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: pink.muted }}>
                          {locStatus === 'denied' &&
                            'Permission needed. Allow location in the browser prompt, then tap again.'}
                          {locStatus === 'error' &&
                            'Could not fetch your pin. Please check GPS and try again.'}
                          {locStatus === 'unsupported' &&
                            'Location is not available on this device.'}
                          {(locStatus === 'idle' || locStatus === 'loading') &&
                            'Required to plan your delivery. We only save your pin.'}
                        </p>
                      </div>
                      {locStatus !== 'loading' && locStatus !== 'unsupported' && (
                        <ArrowRight size={16} className="flex-shrink-0" style={{ color: pink[500] }} />
                      )}
                    </button>
                  )}
                </div>

                {(locStatus === 'denied' || locStatus === 'error') && !locationReady && (
                  <div
                    className="mt-2.5 rounded-xl px-3.5 py-3 border"
                    style={{ background: '#fff5f5', borderColor: '#fecaca' }}
                  >
                    <p className="text-[12px] font-medium" style={{ color: '#991b1b' }}>
                      Waiting for location permission
                    </p>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: '#b91c1c' }}>
                      Please allow location access when your browser asks. We keep checking until it is granted.
                    </p>
                    <button
                      type="button"
                      onClick={requestLocation}
                      className="mt-2.5 h-9 px-3.5 rounded-lg text-[12px] font-semibold text-white"
                      style={{ background: pink[600] }}
                    >
                      Allow location & try again
                    </button>
                  </div>
                )}

                {error && (
                  <p className="mt-2 text-[12px] font-medium" style={{ color: '#b91c1c' }}>
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  disabled={submitting || phone.length !== 10 || !locationReady}
                  onClick={handleSubmit}
                  className="mt-5 w-full h-[52px] rounded-2xl flex items-center justify-center gap-2 text-[14px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: locationReady
                      ? `linear-gradient(135deg, ${pink[500]} 0%, ${pink[600]} 100%)`
                      : pink[300],
                    boxShadow: locationReady ? `0 10px 24px -8px ${pink[400]}aa` : 'none',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving your interest
                    </>
                  ) : (
                    <>
                      Confirm my interest
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] mt-3" style={{ color: pink.muted }}>
                  By continuing, you join Picoso with this number.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <PlateDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
