'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, Clock, Package, ChefHat, Bike, Home,
  RotateCcw, Gamepad2, X, ArrowRight
} from 'lucide-react';
import { orders } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const DELIVERY_MINS = 30;

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: CheckCircle2 },
  { key: 'confirmed', label: 'Confirmed', icon: Package },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'out-for-delivery', label: 'On the way', icon: Bike },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

// ─── Snake Game ───────────────────────────────────────────────────────────────
const CELL = 20;
const ROWS = 15;
const COLS = 18;

function getInitialSnake() { return [{ x: 9, y: 7 }, { x: 8, y: 7 }]; }
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
    food: { x: 14, y: 7 },
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

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Grid dots
    ctx.fillStyle = '#e5e7eb';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Food
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(s.food.x * CELL + CELL / 2 - 1, s.food.y * CELL + 1, 2, 5);

    // Snake
    s.snake.forEach((seg, i) => {
      const r = i === 0 ? 6 : 4;
      ctx.fillStyle = i === 0 ? '#16a34a' : '#22c55e';
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, r);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(seg.x * CELL + 6, seg.y * CELL + 6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(seg.x * CELL + 14, seg.y * CELL + 6, 2, 0, Math.PI * 2); ctx.fill();
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
    stateRef.current = {
      snake: getInitialSnake(),
      food: randomFood(getInitialSnake()),
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
        if (!sx || !sy) return;
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
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="rounded-2xl border border-surface-200 touch-none"
        onTouchStart={handleSwipe.start}
        onTouchEnd={handleSwipe.end}
      />

      <div className="flex items-center justify-between w-full mt-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <span className="text-xl">🍎</span> Score: <span className="text-brand-600">{score}</span>
        </div>
        {(!started || gameOver) && (
          <button onClick={startGame} className="btn-primary px-4 py-2 text-sm">
            <RotateCcw size={14} /> {gameOver ? 'Play Again' : 'Start Game'}
          </button>
        )}
      </div>

      {!started && (
        <p className="text-xs text-gray-400 mt-2">Use arrow keys or swipe to play</p>
      )}
      {gameOver && (
        <div className="mt-2 px-4 py-2 bg-red-50 rounded-xl text-sm text-red-600 font-medium">
          Game Over! Score: {score}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function CountdownTimer({ estimatedDelivery }) {
  const [remaining, setRemaining] = useState(DELIVERY_MINS * 60);

  useEffect(() => {
    if (estimatedDelivery) {
      const target = new Date(estimatedDelivery).getTime();
      const update = () => {
        const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
        setRemaining(diff);
      };
      update();
      const t = setInterval(update, 1000);
      return () => clearInterval(t);
    }
  }, [estimatedDelivery]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = (remaining / (DELIVERY_MINS * 60)) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDash = (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke="#22c55e" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${strokeDash} ${circumference}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-gray-900 leading-none">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
          <span className="text-xs text-gray-400 mt-1">mins</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700 mt-2">Estimated delivery</p>
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
    }, 15000);

    return () => clearInterval(poll);
  }, [id, isLoggedIn, authLoading, router]);

  /**
   * 🔥 META PURCHASE TRACKING (SAFE + OPTIMIZED)
   */
  useEffect(() => {
    if (!order) return;

    // Only fire when payment is actually valid
    if (order.paymentMethod === 'upi' && order.paymentStatus !== 'paid') return;

    const eventId = `order_${order._id}`;

    // Prevent duplicate firing (refresh / re-render safe)
    if (typeof window !== 'undefined' && window.fbq && !localStorage.getItem(eventId)) {
      window.fbq('track', 'Purchase', {
        value: order.totalPrice,
        currency: 'INR',

        // Required for better ad optimization
        content_ids: order.items?.map(item => item.bowlId?._id || item.name) || [],

        contents: order.items?.map(item => ({
          id: item.bowlId?._id || item.name,
          quantity: item.quantity
        })) || [],

        content_type: 'product'
      }, {
        eventID: eventId
      });

      localStorage.setItem(eventId, 'true');
    }
  }, [order]);

  const currentStepIndex = order
    ? STATUS_STEPS.findIndex(s => s.key === order.status)
    : 0;

  if (authLoading || (!isLoggedIn && authLoading)) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Success Banner */}
            <div className="card p-8 text-center mb-6 animate-slide-up">
              <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={40} className="text-brand-500" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Order Confirmed!</h1>
              <p className="text-gray-500 text-sm">
                Order #{id?.slice(-6).toUpperCase()} • {order?.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI Payment'}
              </p>
              {order?.paymentMethod === 'upi' && order?.paymentStatus !== 'paid' && (
                <div className="mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl inline-block">
                  <p className="text-xs text-amber-700 font-medium">
                    Payment pending verification — we'll confirm once approved
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Timer */}
              <div className="card p-6 flex flex-col items-center">
                <p className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-1.5">
                  <Clock size={14} /> Delivery Timer
                </p>
                <CountdownTimer estimatedDelivery={order?.estimatedDelivery} />
              </div>

              {/* Status Steps */}
              <div className="card p-6">
                <p className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-1.5">
                  <Package size={14} /> Order Status
                </p>
                <div className="space-y-3">
                  {STATUS_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= currentStepIndex;
                    const active = i === currentStepIndex;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          done ? 'bg-brand-500' : 'bg-surface-100'
                        } ${active ? 'ring-2 ring-brand-300 ring-offset-1' : ''}`}>
                          <Icon size={14} className={done ? 'text-white' : 'text-gray-400'} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                        </div>
                        {done && <CheckCircle2 size={14} className="text-brand-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mini Game */}
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Gamepad2 size={18} className="text-brand-600" />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">While you wait...</p>
                    <p className="text-xs text-gray-400">Play Snake to pass the time!</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGame(!showGame)}
                  className={showGame ? 'btn-secondary text-xs px-3 py-1.5' : 'btn-primary text-xs px-3 py-1.5'}
                >
                  {showGame ? <><X size={13} /> Hide</> : <><Gamepad2 size={13} /> Play</>}
                </button>
              </div>
              {showGame && <SnakeGame />}
            </div>

            {/* Order Items */}
            {order?.items?.length > 0 && (
              <div className="card p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4">Your Order</h3>
                <div className="space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name || item.bowlId?.name || 'Item'}</p>
                        <p className="text-xs text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">₹{item.price * item.quantity}</p>
                    </div>
                  ))}
                  <div className="border-t border-surface-100 pt-3 flex justify-between font-bold text-gray-900">
                    <span>Total Paid</span>
                    <span>₹{order.totalPrice}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Link href="/menu" className="btn-secondary flex-1 justify-center">
                Order Again
              </Link>
              <Link href="/profile?tab=orders" className="btn-primary flex-1 justify-center">
                My Orders <ArrowRight size={15} />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
