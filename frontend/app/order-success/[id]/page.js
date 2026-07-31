'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, Clock, Package, ChefHat, Bike, Home,
  RotateCcw, Gamepad2, X, ArrowRight, MapPin, Sparkles,
  Phone, Copy, Check, IndianRupee,
} from 'lucide-react';
import { orders } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const DELIVERY_MINS = 30;
const C = {
  bg: '#F7F8F2',
  ink: '#0B5C3A',
  mint: '#E8F5E9',
  soft: '#DCE9DC',
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Placed', icon: CheckCircle2, tip: 'We got your order!' },
  { key: 'confirmed', label: 'Confirmed', icon: Package, tip: 'Kitchen is on it' },
  { key: 'preparing', label: 'Cooking', icon: ChefHat, tip: 'Fresh bowls coming up' },
  { key: 'out-for-delivery', label: 'On the way', icon: Bike, tip: 'Rider is heading to you' },
  { key: 'delivered', label: 'Delivered', icon: Home, tip: 'Enjoy your meal!' },
];

const STATUS_COPY = {
  pending: { title: 'Order placed', sub: 'Hang tight — confirming with the kitchen' },
  confirmed: { title: 'Order confirmed', sub: 'Your bowls are next in line' },
  preparing: { title: 'Being prepared', sub: 'Fresh ingredients, real cooking' },
  'out-for-delivery': { title: 'Out for delivery', sub: 'Almost there — keep an eye on the door' },
  delivered: { title: 'Delivered', sub: 'Hope it made you feel good' },
  cancelled: { title: 'Order cancelled', sub: 'Reach out if you need help' },
};

// ─── Snake Game ───────────────────────────────────────────────────────────────
const CELL = 18;
const ROWS = 14;
const COLS = 16;

function getInitialSnake() { return [{ x: 8, y: 7 }, { x: 7, y: 7 }]; }
function randomFood(snake) {
  let f;
  do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
  while (snake.some(s => s.x === f.x && s.y === f.y));
  return f;
}

function SnakeGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    snake: getInitialSnake(),
    food: { x: 12, y: 7 },
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    score: 0,
    running: false,
    gameOver: false,
  });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const loopRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.fillStyle = '#F7F8F2';
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    ctx.fillStyle = '#E5E7EB';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(s.food.x * CELL + CELL / 2 - 1, s.food.y * CELL + 1, 2, 4);

    s.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#0B5C3A' : '#22C55E';
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 5 : 3);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(seg.x * CELL + 6, seg.y * CELL + 6, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(seg.x * CELL + 12, seg.y * CELL + 6, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    });
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    s.dir = s.nextDir;
    const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || s.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      s.running = false;
      s.gameOver = true;
      setGameOver(true);
      draw();
      return;
    }
    s.snake.unshift(head);
    if (head.x === s.food.x && head.y === s.food.y) {
      s.score++;
      setScore(s.score);
      s.food = randomFood(s.snake);
    } else {
      s.snake.pop();
    }
    draw();
  }, [draw]);

  const startGame = () => {
    const snake = getInitialSnake();
    stateRef.current = {
      snake,
      food: randomFood(snake),
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      score: 0,
      running: true,
      gameOver: false,
    };
    setScore(0);
    setGameOver(false);
    setStarted(true);
    draw();
  };

  useEffect(() => {
    if (!started || gameOver) { clearInterval(loopRef.current); return; }
    loopRef.current = setInterval(tick, 130);
    return () => clearInterval(loopRef.current);
  }, [started, gameOver, tick]);

  useEffect(() => {
    const handleKey = (e) => {
      const s = stateRef.current;
      if (!s.running) return;
      const dirs = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
        a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      };
      const d = dirs[e.key];
      if (d && !(d.x === -s.dir.x && d.y === -s.dir.y)) {
        s.nextDir = d;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => { draw(); }, [draw]);

  const handleSwipe = (() => {
    let sx = null, sy = null;
    return {
      start: (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; },
      end: (e) => {
        if (sx == null || sy == null) return;
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        const s = stateRef.current;
        if (!s.running) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 30 && s.dir.x !== -1) s.nextDir = { x: 1, y: 0 };
          if (dx < -30 && s.dir.x !== 1) s.nextDir = { x: -1, y: 0 };
        } else {
          if (dy > 30 && s.dir.y !== -1) s.nextDir = { x: 0, y: 1 };
          if (dy < -30 && s.dir.y !== 1) s.nextDir = { x: 0, y: -1 };
        }
        sx = null; sy = null;
      },
    };
  })();

  return (
    <div className="flex flex-col items-center w-full">
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="rounded-2xl border border-gray-200 touch-none w-full max-w-[288px] h-auto"
        onTouchStart={handleSwipe.start}
        onTouchEnd={handleSwipe.end}
      />
      <div className="flex items-center justify-between w-full max-w-[288px] mt-3">
        <p className="text-sm font-semibold text-gray-700">
          Score <span className="text-brand-700 tabular-nums">{score}</span>
        </p>
        {(!started || gameOver) && (
          <button
            onClick={startGame}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-white"
            style={{ background: C.ink }}
          >
            <RotateCcw size={12} /> {gameOver ? 'Play again' : 'Start'}
          </button>
        )}
      </div>
      {!started && <p className="text-[11px] text-gray-400 mt-2">Swipe or use arrow keys</p>}
      {gameOver && (
        <p className="mt-2 text-xs font-medium text-gray-600">Game over — nice try!</p>
      )}
    </div>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function CountdownTimer({ estimatedDelivery, delivered }) {
  const [remaining, setRemaining] = useState(DELIVERY_MINS * 60);

  useEffect(() => {
    if (delivered) { setRemaining(0); return; }
    const target = estimatedDelivery
      ? new Date(estimatedDelivery).getTime()
      : Date.now() + DELIVERY_MINS * 60 * 1000;
    const update = () => setRemaining(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [estimatedDelivery, delivered]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const total = DELIVERY_MINS * 60;
  const progress = Math.min(1, Math.max(0, remaining / total));
  const circumference = 2 * Math.PI * 54;
  const strokeDash = progress * circumference;

  if (delivered) {
    return (
      <div className="flex flex-col items-center">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{ background: C.mint }}
        >
          <CheckCircle2 size={48} style={{ color: C.ink }} strokeWidth={1.75} />
        </div>
        <p className="mt-3 text-sm font-bold text-gray-900">Delivered</p>
        <p className="text-xs text-gray-500">Enjoy your meal</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#E8EDE8" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={C.ink} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[32px] font-extrabold text-gray-950 leading-none tabular-nums tracking-tight">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
          <span className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wider">mins left</span>
        </div>
      </div>
    </div>
  );
}

// ─── Hero illustration ────────────────────────────────────────────────────────
function SuccessHero({ delivered }) {
  return (
    <div className="relative mx-auto w-40 h-40 sm:w-44 sm:h-44">
      {/* soft rings */}
      <div className="absolute inset-0 rounded-full opacity-40 animate-ping" style={{ background: C.soft, animationDuration: '2.4s' }} />
      <div className="absolute inset-3 rounded-full" style={{ background: C.mint }} />
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <svg viewBox="0 0 160 160" className="w-[78%] h-[78%]" aria-hidden>
          {/* bowl */}
          <ellipse cx="80" cy="118" rx="42" ry="8" fill="#0B5C3A" opacity="0.12" />
          <path d="M40 78 C42 112 118 112 120 78 Z" fill="#0B5C3A" />
          <path d="M44 78 C48 102 112 102 116 78 Z" fill="#157A4A" />
          <ellipse cx="80" cy="78" rx="42" ry="14" fill="#1A8F58" />
          {/* food bits */}
          <circle cx="62" cy="74" r="8" fill="#E8C07A" />
          <circle cx="80" cy="70" r="9" fill="#D4924A" />
          <circle cx="98" cy="74" r="7" fill="#7CB342" />
          <circle cx="88" cy="82" r="5" fill="#C23B4A" />
          {/* check badge */}
          <circle cx="118" cy="52" r="18" fill="#fff" />
          <circle cx="118" cy="52" r="15" fill={delivered ? '#16A34A' : '#0B5C3A'} />
          <path d="M110 52 L116 58 L128 46" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <Sparkles size={16} className="absolute top-2 right-4 text-amber-400 os-float" />
      <Sparkles size={12} className="absolute bottom-8 left-2 text-brand-500 os-float-delay" />
    </div>
  );
}

// ─── Status stepper ───────────────────────────────────────────────────────────
function StatusTracker({ currentKey }) {
  const idx = Math.max(0, STATUS_STEPS.findIndex(s => s.key === currentKey));
  const isCancelled = currentKey === 'cancelled';

  if (isCancelled) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
        This order was cancelled
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex items-start min-w-[320px] px-1">
        {STATUS_STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i <= idx;
          const active = i === idx;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className="absolute top-4 left-[50%] right-[-50%] h-[2px]"
                  style={{ background: i < idx ? C.ink : '#E5E7EB' }}
                />
              )}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done
                    ? 'text-white'
                    : 'bg-white text-gray-300 border-gray-200'
                } ${active ? 'os-pulse-ring' : ''}`}
                style={done ? { background: C.ink, borderColor: C.ink } : undefined}
              >
                <Icon size={14} strokeWidth={2.25} />
              </div>
              <p className={`mt-2 text-[10px] font-semibold text-center leading-tight ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  const { id } = useParams();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGame, setShowGame] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.replace('/'); return; }

    orders.getById(id)
      .then(res => setOrder(res.data.order))
      .catch(() => {})
      .finally(() => setLoading(false));

    const poll = setInterval(() => {
      orders.getById(id)
        .then(res => setOrder(res.data.order))
        .catch(() => {});
    }, 12000);

    return () => clearInterval(poll);
  }, [id, isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!order) return;
    if (order.paymentMethod === 'upi' && order.paymentStatus !== 'paid') return;
    const eventId = `order_${order._id}`;
    if (typeof window !== 'undefined' && window.fbq && !localStorage.getItem(eventId)) {
      window.fbq('track', 'Purchase', {
        value: order.totalPrice,
        currency: 'INR',
        content_ids: order.items?.map(item => item.bowlId?._id || item.name) || [],
        contents: order.items?.map(item => ({
          id: item.bowlId?._id || item.name,
          quantity: item.quantity,
        })) || [],
        content_type: 'product',
      }, { eventID: eventId });
      localStorage.setItem(eventId, 'true');
    }
  }, [order]);

  const orderCode = useMemo(() => (id ? String(id).slice(-6).toUpperCase() : '------'), [id]);
  const statusKey = order?.status || 'pending';
  const copy = STATUS_COPY[statusKey] || STATUS_COPY.pending;
  const delivered = statusKey === 'delivered';
  const addr = order?.deliveryAddress;
  const grandTotal = (order?.totalPrice || 0) + (order?.deliveryFee ?? 15);
  const itemCount = order?.items?.reduce((n, i) => n + (i.quantity || 1), 0) || 0;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  if (authLoading || (!isLoggedIn && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <style>{`
        @keyframes osFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes osPulseRing {
          0% { box-shadow: 0 0 0 0 rgba(11,92,58,0.35); }
          70% { box-shadow: 0 0 0 10px rgba(11,92,58,0); }
          100% { box-shadow: 0 0 0 0 rgba(11,92,58,0); }
        }
        .os-float { animation: osFloat 2.8s ease-in-out infinite; }
        .os-float-delay { animation: osFloat 2.8s ease-in-out 0.6s infinite; }
        .os-pulse-ring { animation: osPulseRing 2s ease-out infinite; }
      `}</style>

      <div className="max-w-lg mx-auto px-4 sm:px-5 pt-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <div className="w-10 h-10 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Loading your order…</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <section className="text-center mb-6">
              <SuccessHero delivered={delivered} />
              <h1 className="mt-2 text-[26px] sm:text-[28px] font-extrabold text-gray-950 tracking-tight">
                {delivered ? 'Enjoy your meal!' : 'Order confirmed!'}
              </h1>
              <p className="mt-1.5 text-sm text-gray-500 font-medium max-w-xs mx-auto">
                {copy.sub}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Order</span>
                <span className="text-sm font-bold text-gray-900 tracking-wide">#{orderCode}</span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-50"
                  aria-label="Copy order id"
                >
                  {copied ? <Check size={13} className="text-brand-600" /> : <Copy size={13} />}
                </button>
              </div>

              {order?.paymentMethod === 'upi' && order?.paymentStatus !== 'paid' && (
                <div className="mt-3 mx-auto max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                  <p className="text-xs text-amber-800 font-medium">
                    UPI payment pending verification — we&apos;ll confirm once approved
                  </p>
                </div>
              )}
            </section>

            {/* ETA card */}
            <section className="bg-white border border-gray-200 rounded-[20px] p-5 mb-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    {delivered ? 'Status' : 'Arriving in'}
                  </p>
                  <p className="text-lg font-bold text-gray-950 mt-0.5">{copy.title}</p>
                </div>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                  style={{ background: C.mint, color: C.ink }}
                >
                  <Clock size={12} />
                  ~{DELIVERY_MINS} min
                </div>
              </div>
              <CountdownTimer estimatedDelivery={order?.estimatedDelivery} delivered={delivered} />
            </section>

            {/* Live tracker */}
            <section className="bg-white border border-gray-200 rounded-[20px] p-5 mb-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.mint }}>
                  <Bike size={15} style={{ color: C.ink }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-950">Live tracking</p>
                  <p className="text-[11px] text-gray-400">Updates every few seconds</p>
                </div>
              </div>
              <StatusTracker currentKey={statusKey} />
            </section>

            {/* Delivery address */}
            {addr?.fullAddress && (
              <section className="bg-white border border-gray-200 rounded-[20px] p-4 mb-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-2xl border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} style={{ color: C.ink }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Delivering to</p>
                    <p className="text-sm font-bold text-gray-950 mt-0.5">
                      {addr.label || 'Home'}
                      {addr.area ? ` · ${addr.area}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                      {addr.fullAddress}
                      {addr.city ? `, ${addr.city}` : ''}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Order summary */}
            {order?.items?.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-[20px] overflow-hidden mb-3">
                <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-950">Your order</p>
                    <p className="text-[11px] text-gray-400">{itemCount} item{itemCount === 1 ? '' : 's'}</p>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: C.mint, color: C.ink }}
                  >
                    {order.paymentMethod === 'cod' ? 'Cash on delivery' : 'UPI'}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {order.items.map((item, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center flex-shrink-0 border border-gray-200 text-gray-700"
                        >
                          {item.quantity}×
                        </span>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name || item.bowlId?.name || 'Item'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3.5 border-t border-gray-100 space-y-1.5 bg-[#FAFBFA]">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums">₹{order.totalPrice}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-xs font-medium" style={{ color: C.ink }}>
                      <span>Discount</span>
                      <span className="tabular-nums">−₹{order.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Delivery</span>
                    <span className="tabular-nums">₹{order.deliveryFee ?? 15}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-bold text-gray-950 flex items-center gap-1">
                      <IndianRupee size={14} /> Total
                    </span>
                    <span className="text-base font-extrabold text-gray-950 tabular-nums">₹{grandTotal}</span>
                  </div>
                </div>
              </section>
            )}

            {/* While you wait */}
            {!delivered && statusKey !== 'cancelled' && (
              <section className="bg-white border border-gray-200 rounded-[20px] p-4 mb-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: C.mint }}>
                      <Gamepad2 size={16} style={{ color: C.ink }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-950">While you wait</p>
                      <p className="text-[11px] text-gray-400 truncate">Play a quick game — food&apos;s on the way</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGame(v => !v)}
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      showGame
                        ? 'border-gray-200 text-gray-600 bg-white'
                        : 'text-white border-transparent'
                    }`}
                    style={!showGame ? { background: C.ink } : undefined}
                  >
                    {showGame ? <><X size={12} /> Hide</> : <>Play</>}
                  </button>
                </div>
                {showGame && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <SnakeGame />
                  </div>
                )}
              </section>
            )}

            {/* Help strip */}
            <section className="rounded-[20px] border border-gray-200 bg-white px-4 py-3.5 flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-bold text-gray-950">Need help?</p>
                <p className="text-[11px] text-gray-400">We&apos;re here if something feels off</p>
              </div>
              <a
                href="tel:+918210823753"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border border-gray-200 text-gray-800 hover:bg-gray-50"
              >
                <Phone size={12} /> Call
              </a>
            </section>
          </>
        )}
      </div>

      {/* Sticky bottom CTAs */}
      {!loading && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto px-4 pt-3 flex gap-2.5">
            <Link
              href="/menu"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3.5 rounded-full text-sm font-bold border border-gray-200 text-gray-800 bg-white hover:bg-gray-50"
            >
              Order again
            </Link>
            <Link
              href="/profile?tab=orders"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3.5 rounded-full text-sm font-bold text-white"
              style={{ background: C.ink }}
            >
              My orders <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
