'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, MapPin, ChevronDown, ChevronRight, User, Clock,
  Star, Crown, Leaf, Truck, Zap, Percent, Gift,
  ShoppingBag, ChefHat, Shield, Timer, Dumbbell,
  ArrowRight, CheckCircle2, Sparkles, Minus, Plus,
  ShoppingCart, BadgeCheck
} from 'lucide-react';
import { bowls, categories } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { CATEGORY_ILLUSTRATIONS, CATEGORY_THEMES } from '@/components/CategoryIllustrations';

/* ??????????????????????????????????????????????????????????????????????????? */
/*  STATIC DATA                                                                 */
/* ??????????????????????????????????????????????????????????????????????????? */
const DESKTOP_BANNERS = [
  { id: 'a', from: '#15803d', to: '#16a34a', accent: '#bbf7d0', Icon: Truck,  h: 'Free Delivery',      s: 'On every order, always.' },
  { id: 'b', from: '#92400e', to: '#d97706', accent: '#fef08a', Icon: Crown,  h: '20% Savings',        s: 'Picoso Platinum - Rs.99/mo' },
  { id: 'c', from: '#1e3a5f', to: '#2563eb', accent: '#bfdbfe', Icon: Leaf,   h: 'Zero Preservatives', s: 'Cooked fresh to order.' },
  { id: 'd', from: '#4c1d95', to: '#7c3aed', accent: '#ddd6fe', Icon: Zap,    h: '30g+ Protein',       s: 'Per bowl, guaranteed.' },
];
const FEATURES = [
  { Icon: Truck,    t: 'Free Delivery',        d: 'Every order, no minimum',    c: 'text-brand-600',   bg: 'bg-brand-50' },
  { Icon: Timer,    t: '30-Min Delivery',       d: 'Hot and fresh, guaranteed',  c: 'text-violet-600',  bg: 'bg-violet-50' },
  { Icon: Leaf,     t: 'Zero Preservatives',    d: 'Clean whole ingredients',    c: 'text-emerald-600', bg: 'bg-emerald-50' },
  { Icon: Shield,   t: 'FSSAI Certified',       d: 'Hygiene-first kitchen',      c: 'text-blue-600',    bg: 'bg-blue-50' },
  { Icon: Dumbbell, t: 'Nutritionist-Crafted',  d: 'Designed for your goals',    c: 'text-orange-600',  bg: 'bg-orange-50' },
  { Icon: ChefHat,  t: 'Chef-Quality Taste',    d: "Healthy does not mean bland",c: 'text-rose-600',    bg: 'bg-rose-50' },
];
const HOW_STEPS = [
  { Icon: Search,      n: '01', t: 'Browse',         d: 'Pick from 30+ protein-rich meals.' },
  { Icon: ShoppingBag, n: '02', t: 'Add & Checkout',  d: 'Cart, login, pay fast.' },
  { Icon: ChefHat,     n: '03', t: 'We Cook Fresh',   d: 'Prepared after your order.' },
  { Icon: Truck,       n: '04', t: 'Hot Delivery',    d: 'To your door in 30 minutes.' },
];
const PLATINUM_PERKS = [
  { Icon: Percent, t: '20% Off Every Meal' },
  { Icon: Truck,   t: 'Free Delivery Always' },
  { Icon: Zap,     t: 'Priority Dispatch' },
  { Icon: Gift,    t: 'Exclusive Deals' },
];
const FALLBACK_CATS = [
  { id: 'pf-meals',      label: 'Bowls',      description: 'Protein-packed', active: true },
  { id: 'pf-wraps',      label: 'Wraps',      description: 'Loaded wraps',   active: true },
  { id: 'pf-sandwiches', label: 'Sandwiches', description: 'Artisan picks',  active: true },
  { id: 'pf-salads',     label: 'Salads',     description: 'Fresh greens',   active: true },
];

/* ??????????????????????????????????????????????????????????????????????????? */
/*  MINI PRODUCT CARD  (mobile-only, image-dominant)                           */
/* ??????????????????????????????????????????????????????????????????????????? */
function MiniCard({ item }) {
  const { items, addItem, updateQty } = useCart();
  const qty = items.find(i => i._id === item._id)?.quantity || 0;

  const handleAdd = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(item);
  }, [addItem, item]);

  const handleDec = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    updateQty(item._id, qty - 1);
  }, [updateQty, item._id, qty]);

  return (
    <div className="w-[148px] flex-shrink-0">
      {/* Image block */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100" style={{ paddingTop: '100%' }}>
        {item.image ? (
          <img
            src={item.image} alt={item.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-brand-50 flex items-center justify-center">
            <ChefHat size={26} className="text-brand-200" />
          </div>
        )}

        {/* Veg indicator ? top left */}
        <div className="absolute top-2 left-2 w-4 h-4 bg-white rounded-[3px] border-[1.5px] border-brand-500 flex items-center justify-center shadow-sm">
          <div className="w-2 h-2 bg-brand-500 rounded-full" />
        </div>

        {/* Bestseller badge ? top right */}
        {item.isBestseller && (
          <div className="absolute top-2 right-2 bg-amber-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md text-gray-900 leading-tight shadow-sm">
            Best
          </div>
        )}

        {/* Bottom gradient scrim */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />

        {/* ADD / QTY control ? overlaid on image bottom-right */}
        {qty > 0 ? (
          <div className="absolute bottom-2 right-2 flex items-center bg-white rounded-lg shadow-md overflow-hidden h-7">
            <button onClickCapture={handleDec} className="w-7 h-full flex items-center justify-center text-brand-600 font-bold active:bg-gray-50">
              <Minus size={11} />
            </button>
            <span className="text-brand-600 font-extrabold text-xs min-w-[18px] text-center">{qty}</span>
            <button onClickCapture={handleAdd} className="w-7 h-full flex items-center justify-center text-brand-600 font-bold active:bg-gray-50">
              <Plus size={11} />
            </button>
          </div>
        ) : (
          <button
            onClickCapture={handleAdd}
            className="absolute bottom-2 right-2 bg-white text-brand-600 text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-0.5 border border-brand-200 active:scale-95 transition-transform h-7"
          >
            + ADD
          </button>
        )}
      </div>

      {/* Text info */}
      <div className="mt-2 px-0.5">
        <p className="text-[12px] font-semibold text-gray-900 leading-tight line-clamp-1">{item.name}</p>
        <p className="text-[13px] font-extrabold text-gray-900 mt-0.5">Rs.{item.price}</p>
      </div>
    </div>
  );
}

/* ??????????????????????????????????????????????????????????????????????????? */
/*  DESKTOP BANNER STRIP                                                        */
/* ??????????????????????????????????????????????????????????????????????????? */
function DesktopBannerStrip() {
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % DESKTOP_BANNERS.length), 3500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    ref.current?.children[active]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);
  return (
    <div className="max-w-6xl mx-auto px-6 py-4">
      <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide">
        {DESKTOP_BANNERS.map((b, i) => (
          <div key={b.id} onClick={() => setActive(i)}
            className="flex-shrink-0 flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-300 min-w-[210px]"
            style={{ background: `linear-gradient(135deg,${b.from},${b.to})`, opacity: active === i ? 1 : 0.7, transform: active === i ? 'scale(1.02)' : 'scale(1)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <b.Icon size={18} color={b.accent} />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{b.h}</p>
              <p className="text-xs leading-tight mt-0.5" style={{ color: b.accent + 'cc' }}>{b.s}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ??????????????????????????????????????????????????????????????????????????? */
/*  HERO BACKGROUND PATTERN                                                     */
/* ??????????????????????????????????????????????????????????????????????????? */
function StarPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="absolute opacity-[0.1]"
          style={{ left: `${(i % 6) * 17 + 2}%`, top: `${Math.floor(i / 6) * 26 + 8}%` }}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M4.5 0L5.5 3.4L9 4.5L5.5 5.6L4.5 9L3.5 5.6L0 4.5L3.5 3.4Z" fill="white" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ??????????????????????????????????????????????????????????????????????????? */
/*  PAGE                                                                        */
/* ??????????????????????????????????????????????????????????????????????????? */
export default function HomePage() {
  const [featured,    setFeatured]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [cats,        setCats]        = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [deliveryTime, setDeliveryTime] = useState(20);
  const [greeting, setGreeting]         = useState('Good morning');
  const [heroLocation, setHeroLocation] = useState('');
  const { isLoggedIn, isPlatinum, user } = useAuth();
  const { cartCount: heroCartCount, setIsOpen: heroOpenCart } = useCart();

  // Client-only values ? avoids SSR/hydration mismatch
  useEffect(() => {
    setDeliveryTime(20 + Math.floor(Math.random() * 3));
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    try {
      const cached = sessionStorage.getItem('picoso_location');
      if (cached) {
        const loc = JSON.parse(cached);
        setHeroLocation([loc.area, loc.city].filter(Boolean).join(', '));
      }
    } catch {}
  }, []);

  useEffect(() => {
    bowls.getAll('pf-meals')
      .then(res => {
        const items = res.data.bowls || [];
        const best  = items.filter(b => b.isBestseller);
        setFeatured(best.length >= 2 ? best.slice(0, 8) : items.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    categories.getAll()
      .then(res => setCats(res.data.categories || []))
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  }, []);

  const displayCats = cats.length > 0 ? cats : FALLBACK_CATS;

  /* ===========================================================
     MOBILE  ( < md )
  =========================================================== */
  const MobileView = (
    <div className="md:hidden bg-[#f4f5f6]">

      {/* ?? Premium Hero (navbar + hero merged) ??????????????????? */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0a2e12 0%,#0f3d1a 35%,#166534 70%,#1a7a3c 100%)' }}>
        <StarPattern />

        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.07] pointer-events-none"
          style={{ background: 'radial-gradient(circle,#86efac,transparent)' }} />
        <div className="absolute top-1/3 -left-12 w-36 h-36 rounded-full opacity-[0.05] pointer-events-none"
          style={{ background: 'radial-gradient(circle,#4ade80,transparent)' }} />
        <div className="absolute bottom-10 right-8 w-20 h-20 rounded-full opacity-[0.06] pointer-events-none"
          style={{ background: 'radial-gradient(circle,#bbf7d0,transparent)' }} />

        {/* ?? Row 1: Logo + Nav actions ????????????????????????? */}
        <div className="relative flex items-center justify-between px-4 pt-12 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shadow-sm">
              <span className="text-white font-extrabold text-sm">P</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-[16px] tracking-tight leading-none">Picoso</span>
              {isPlatinum ? (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <Crown size={8} className="text-amber-300" />
                  <span className="text-amber-300/90 text-[9px] font-bold uppercase tracking-wide leading-none">Platinum</span>
                </div>
              ) : (
                <span className="text-green-300/70 text-[9px] font-semibold leading-none mt-0.5">Healthy Bowls &amp; More</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cart */}
            <button onClickCapture={() => heroOpenCart(true)}
              className="relative w-10 h-10 bg-white/12 border border-white/20 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
              <ShoppingCart size={18} className="text-white" />
              {heroCartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-400 text-gray-900 text-[9px] font-extrabold rounded-full flex items-center justify-center px-1 shadow">
                  {heroCartCount > 9 ? '9+' : heroCartCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <Link href={isLoggedIn ? '/profile' : '/'}>
              <div className="w-10 h-10 bg-white/12 border border-white/20 rounded-2xl flex items-center justify-center active:scale-95 transition-transform overflow-hidden">
                {isLoggedIn && user?.name ? (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <span className="text-white font-extrabold text-sm">{user.name[0].toUpperCase()}</span>
                  </div>
                ) : (
                  <User size={18} className="text-white" />
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* ?? Row 2: Greeting + delivery badge ????????????????? */}
        <div className="relative px-4 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-green-200/75 text-[11px] font-semibold tracking-widest uppercase">
                {greeting}{isLoggedIn && user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </p>
              <h2 className="text-white font-extrabold text-[22px] leading-tight mt-1">
                What are you<br />eating today?
              </h2>
            </div>
            {/* Delivery time */}
            <div className="flex-shrink-0 flex flex-col items-center bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 shadow-sm mb-1">
              <Clock size={13} className="text-amber-300 mb-0.5" />
              <span className="text-white font-extrabold text-2xl leading-none">{deliveryTime}</span>
              <span className="text-green-200/60 text-[9px] font-bold uppercase tracking-widest mt-0.5">MIN</span>
            </div>
          </div>
        </div>

        {/* ?? Row 3: Location ??????????????????????????????????? */}
        <div className="relative px-4 pt-2.5">
          <button className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-2xl px-3 py-2 active:bg-white/20 transition-colors max-w-[80vw]">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-300 opacity-70" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <MapPin size={11} className="text-green-300 flex-shrink-0" />
            <span className="text-green-100/90 text-xs font-semibold truncate max-w-[52vw]">
              {heroLocation || 'Delivering to your area'}
            </span>
            <ChevronDown size={11} className="text-green-300/70 flex-shrink-0" />
          </button>
        </div>

        {/* ?? Row 4: Search bar ????????????????????????????????? */}
        <div className="relative px-4 pt-3.5 pb-3">
          <Link href="/menu" className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-lg">
            <div className="w-7 h-7 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Search size={14} className="text-brand-500" />
            </div>
            <span className="text-gray-400 text-[13px] flex-1">Bowls, wraps, salads &amp; more...</span>
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-brand-500 px-3 py-1.5 rounded-xl">
              <ShoppingBag size={11} className="text-white" />
              <span className="text-white text-[10px] font-extrabold tracking-wide">ORDER</span>
            </div>
          </Link>
        </div>

        {/* ?? Row 5: Feature tags ??????????????????????????????? */}
        <div className="relative px-4 pb-6 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {[
            { Icon: Leaf,       label: 'No Preservatives', c: '#86efac' },
            { Icon: Zap,        label: '30g+ Protein',      c: '#fde68a' },
            { Icon: Truck,      label: 'Free Delivery',     c: '#bfdbfe' },
            { Icon: BadgeCheck, label: 'FSSAI Certified',   c: '#d9f99d' },
          ].map(tag => (
            <div key={tag.label}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">
              <tag.Icon size={11} color={tag.c} />
              <span className="text-white/80 text-[11px] font-semibold whitespace-nowrap">{tag.label}</span>
            </div>
          ))}
        </div>

        {/* Rounded bottom */}
        <div className="h-6 relative">
          <div className="absolute bottom-0 inset-x-0 h-6 bg-[#f4f5f6] rounded-tl-[28px] rounded-tr-[28px]" />
        </div>
      </div>

      {/* ?? Category Chips ????????????????????????????????????????? */}
      <div className="bg-white">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-0 px-3 py-4">
            {displayCats.map(cat => {
              const Ill = CATEGORY_ILLUSTRATIONS[cat.id];
              const t   = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['pf-meals'];
              return (
                <Link key={cat.id} href="/menu"
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 px-3 active:scale-95 transition-transform">
                  <div
                    className="w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-md"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${t.color}38, ${t.color}18)`,
                      boxShadow: `0 3px 12px ${t.color}30, inset 0 1px 2px rgba(255,255,255,0.5)`,
                    }}
                  >
                    {Ill && <Ill className="w-8 h-8" color={t.color} />}
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 leading-none">{cat.label}</span>
                  <div className="h-[2.5px] w-5 rounded-full" style={{ background: t.color }} />
                </Link>
              );
            })}

            {/* Separator */}
            <div className="w-px bg-gray-100 mx-2 self-stretch my-1" />

            {/* Filter chips column */}
            {[
              { id: 'bs', label: 'Bestsellers', Icon: Star,    c: '#d97706', bg: '#fef9c3' },
              { id: 'nw', label: 'New',         Icon: Sparkles,c: '#7c3aed', bg: '#ede9fe' },
              { id: 'pr', label: 'Protein',     Icon: Zap,     c: '#2563eb', bg: '#dbeafe' },
              { id: 'vg', label: 'Pure Veg',    Icon: Leaf,    c: '#16a34a', bg: '#dcfce7' },
            ].map(f => (
              <Link key={f.id} href="/menu"
                className="flex flex-col items-center gap-1.5 flex-shrink-0 px-3 active:scale-95 transition-transform">
                <div
                  className="w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-md"
                  style={{ background: f.bg, boxShadow: `0 3px 10px ${f.c}22` }}
                >
                  <f.Icon size={22} color={f.c} />
                </div>
                <span className="text-[11px] font-semibold text-gray-500 leading-none">{f.label}</span>
                <div className="h-[2.5px] w-5 rounded-full bg-gray-200" />
              </Link>
            ))}
          </div>
        </div>
        <div className="h-px bg-gray-100" />
      </div>

      {/* ?? Customer Favourites ???????????????????????????????????? */}
      <div className="mt-4 bg-white pb-4">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <h2 className="text-[15px] font-extrabold text-gray-900">Customer Favourites</h2>
            </div>
          </div>
          <Link href="/menu" className="text-xs font-extrabold text-brand-600 flex items-center gap-0.5 bg-brand-50 px-3 py-1.5 rounded-lg">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto scrollbar-hide px-4">
          <div className="flex gap-3 pb-1">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-[148px] flex-shrink-0">
                    <div className="rounded-2xl bg-gray-100 shimmer" style={{ paddingTop: '82%' }} />
                    <div className="mt-2 space-y-1.5">
                      <div className="h-3 shimmer rounded w-4/5" />
                      <div className="h-3.5 shimmer rounded w-2/5" />
                    </div>
                  </div>
                ))
              : featured.length > 0
                ? [
                    ...featured.map(item => <MiniCard key={item._id} item={item} />),
                    <Link key="view-all" href="/menu"
                      className="w-[80px] flex-shrink-0 bg-brand-50 border-2 border-dashed border-brand-200 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-brand-600 active:scale-95 transition-transform"
                      style={{ minHeight: '140px' }}>
                      <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
                        <ArrowRight size={16} className="text-brand-600" />
                      </div>
                      <span className="text-[10px] font-extrabold text-center leading-tight">Full Menu</span>
                    </Link>,
                  ]
                : <p className="text-sm text-gray-400 py-4 px-2">No items yet</p>
            }
          </div>
        </div>
      </div>

      {/* ?? Explore Categories ????????????????????????????????????? */}
      <div className="mt-3 bg-white">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <ChefHat size={14} className="text-brand-600" />
              <h2 className="text-[15px] font-extrabold text-gray-900">Explore</h2>
            </div>
          </div>
          <Link href="/menu" className="text-xs font-extrabold text-brand-600 flex items-center gap-0.5 bg-brand-50 px-3 py-1.5 rounded-lg">
            See all <ChevronRight size={12} />
          </Link>
        </div>

        {/* 2x2 category grid */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          {catsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 shimmer rounded-2xl" />
              ))
            : displayCats.map(cat => {
                const Ill = CATEGORY_ILLUSTRATIONS[cat.id];
                const t   = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['pf-meals'];
                return (
                  <Link key={cat.id} href="/menu"
                    className="relative h-28 rounded-2xl overflow-hidden flex items-end p-3 active:scale-[0.98] transition-transform"
                    style={{
                      background: `linear-gradient(145deg, ${t.color}22, ${t.color}0e)`,
                      border: `1.5px solid ${t.color}28`,
                    }}>
                    {/* Ghost illustration background */}
                    <div className="absolute -right-1 -top-1 opacity-[0.18]">
                      {Ill && <Ill className="w-[72px] h-[72px]" color={t.color} />}
                    </div>
                    {/* Foreground icon */}
                    <div className="absolute right-2.5 top-2 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${t.color}28` }}>
                      {Ill && <Ill className="w-6 h-6" color={t.color} />}
                    </div>
                    {/* Label */}
                    <div>
                      <p className="font-extrabold text-gray-900 text-[13px] leading-tight">{cat.label}</p>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: t.color }}>
                        Order &rarr;
                      </p>
                    </div>
                  </Link>
                );
              })
          }
        </div>
      </div>

      {/* ?? Perks strip ???????????????????????????????????????????? */}
      <div className="mt-3 mx-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2">
          {[
            { Icon: Truck,  l: 'Free Delivery',    s: 'Every order' },
            { Icon: Clock,  l: deliveryTime + ' min Delivery', s: 'Hot and fresh' },
            { Icon: Leaf,   l: 'No Preservatives',  s: 'Always fresh' },
            { Icon: Shield, l: 'FSSAI Certified',   s: 'Safe kitchen' },
          ].map((p, i) => (
            <div key={p.l}
              className={`flex items-center gap-2.5 px-3 py-3 ${i % 2 === 0 ? 'border-r border-gray-100' : ''} ${i < 2 ? 'border-b border-gray-100' : ''}`}>
              <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <p.Icon size={14} className="text-brand-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold text-gray-900 leading-tight truncate">{p.l}</p>
                <p className="text-[9px] text-gray-400 mt-0.5">{p.s}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ?? Platinum CTA ??????????????????????????????????????????? */}
      {!isPlatinum && (
        <div className={`mt-3 mx-4 ${heroCartCount > 0 ? 'mb-24' : 'mb-5'}`}>
          <div className="relative overflow-hidden rounded-2xl px-4 py-5"
            style={{ background: 'linear-gradient(135deg,#7c2d12,#c2410c,#ea580c)' }}>
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute right-8 bottom-0 w-20 h-20 bg-white/5 rounded-full" />

            <div className="relative flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Crown size={22} className="text-amber-200" />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-extrabold text-base leading-tight">Picoso Platinum</span>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Rs.99/mo</span>
                </div>
                <p className="text-white/75 text-xs mt-1 leading-relaxed">
                  20% off every meal &bull; Free delivery &bull; Priority orders
                </p>
                <Link href="/profile?tab=platinum"
                  className="inline-flex items-center gap-1.5 bg-white text-orange-700 font-extrabold text-xs px-4 py-2 rounded-xl mt-3 shadow-sm active:scale-95 transition-transform">
                  <Crown size={12} /> Activate Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      {isPlatinum && <div className={heroCartCount > 0 ? 'h-24' : 'h-4'} />}
    </div>
  );

  /* ===========================================================
     DESKTOP  ( md+ )
  =========================================================== */
  const DesktopView = (
    <div className="hidden md:block">

      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-brand-100 rounded-full opacity-40 blur-3xl" />
          <div className="absolute top-1/2 -left-28 w-72 h-72 bg-violet-100 rounded-full opacity-25 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-48 h-48 bg-amber-100 rounded-full opacity-35 blur-2xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-100 text-brand-700 rounded-full text-xs font-bold mb-6">
              <Sparkles size={12} /> Nutritionist-Crafted Healthy Food
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-5">
              Fuel Your Body,<br />
              <span className="relative inline-block">
                <span className="text-brand-500">Love Every Bite</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 8" fill="none">
                  <path d="M2 6 Q75 2 150 5 Q225 8 298 4" stroke="#86efac" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Fresh bowls, wraps, sandwiches and salads crafted with zero junk and the protein your body needs. Delivered hot in 30 minutes.
            </p>
            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start mb-10">
              <Link href="/menu" className="btn-primary text-base px-7 py-3.5 shadow-premium flex items-center gap-2">
                Order Now <ArrowRight size={18} />
              </Link>
              <Link href="/profile?tab=platinum" className="btn-platinum text-base px-7 py-3.5 flex items-center gap-2">
                <Crown size={16} /> Get Platinum
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <div className="flex -space-x-1.5">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="w-7 h-7 rounded-full bg-brand-200 border-2 border-white flex items-center justify-center">
                      <ShoppingBag size={11} className="text-brand-600" />
                    </div>
                  ))}
                </div>
                <span>10,000+ happy customers</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                {[0,1,2,3,4].map(i => <Star key={i} size={12} fill="currentColor" />)}
                <span className="text-gray-600 font-medium ml-0.5">4.9 rating</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                <CheckCircle2 size={13} /> FSSAI Certified
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-full max-w-sm lg:max-w-md">
            <div className="relative">
              <div className="bg-gradient-to-br from-brand-100 via-brand-50 to-white rounded-[2rem] p-8 shadow-premium border border-brand-100">
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 bg-brand-500 rounded-[1.5rem] flex items-center justify-center shadow-lg">
                    <ChefHat size={44} className="text-white" />
                  </div>
                </div>
                <div className="text-center mb-4">
                  <p className="font-bold text-gray-900 text-lg">Ultimate Protein Bowl</p>
                  <p className="text-sm text-gray-500 mt-0.5">40g Protein &bull; 480 kcal</p>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {[['40g','Protein','bg-brand-100 text-brand-700'],['45g','Carbs','bg-blue-100 text-blue-700'],['12g','Fats','bg-amber-100 text-amber-700']].map(([v,l,cls]) => (
                    <span key={l} className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{v} {l}</span>
                  ))}
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-card-hover px-3.5 py-2.5 flex items-center gap-2 border border-surface-100">
                <div className="w-7 h-7 bg-brand-100 rounded-xl flex items-center justify-center">
                  <Truck size={14} className="text-brand-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Free Delivery</p>
                  <p className="text-xs text-gray-400">in 30 min</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-card-hover px-3.5 py-2.5 flex items-center gap-2 border border-surface-100">
                <div className="w-7 h-7 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Leaf size={14} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">100% Fresh</p>
                  <p className="text-xs text-gray-400">No preservatives</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop banner strip */}
      <div className="border-y border-surface-100 bg-white">
        <DesktopBannerStrip />
      </div>

      {/* Categories 4-col */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">What We Serve</h2>
            <p className="text-sm text-gray-400 mt-1">Fresh made-to-order ? bowls, wraps, sandwiches and salads</p>
          </div>
          <Link href="/menu" className="flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700">
            Full Menu <ChevronRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {catsLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-44 shimmer rounded-2xl" />)
            : displayCats.map(cat => {
                const Ill = CATEGORY_ILLUSTRATIONS[cat.id];
                const t   = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['pf-meals'];
                return (
                  <Link key={cat.id} href="/menu"
                    className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-surface-100 bg-white hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" style={{ background: t.color + '08' }} />
                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: t.color + '1a' }}>
                      {Ill && <Ill className="w-10 h-10" color={t.color} />}
                    </div>
                    <div className="relative text-center">
                      <p className="font-extrabold text-gray-900 text-base">{cat.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
                    </div>
                    <span className="relative text-xs font-bold px-4 py-1.5 rounded-xl text-white group-hover:scale-105 transition-transform" style={{ background: t.color }}>
                      Order Now <ChevronRight size={11} className="inline" />
                    </span>
                  </Link>
                );
              })}
        </div>
      </section>

      {/* Customer Favourites */}
      <section className="bg-surface-50 border-y border-surface-100">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Star size={18} className="text-amber-500 fill-amber-500" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Customer Favourites</h2>
                <p className="text-sm text-amber-500 font-semibold mt-0.5 flex items-center gap-1">
                  <Sparkles size={12} /> Most ordered this week
                </p>
              </div>
            </div>
            <Link href="/menu" className="flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-5">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-surface-100">
                  <div className="aspect-square shimmer" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 shimmer rounded w-3/4" />
                    <div className="h-3 shimmer rounded w-full" />
                    <div className="h-6 shimmer rounded w-1/2 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-3 gap-5">
              {featured.slice(0, 3).map(item => <ProductCard key={item._id} product={item} />)}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <ChefHat size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Menu coming soon</p>
            </div>
          )}
        </div>
      </section>

      {/* Why Picoso */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Why Picoso?</h2>
        <p className="text-sm text-gray-400 mb-7">Healthy food that actually works</p>
        <div className="grid grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.t} className="flex items-start gap-3 p-4 rounded-xl border border-surface-100 bg-white hover:shadow-card transition-all">
              <div className={`w-9 h-9 ${f.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <f.Icon size={16} className={f.c} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{f.t}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-surface-100 bg-surface-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">How It Works</h2>
          <p className="text-sm text-gray-400 mb-7">From browse to doorstep in 4 simple steps</p>
          <div className="grid grid-cols-4 gap-4">
            {HOW_STEPS.map((s, i) => (
              <div key={s.n} className="relative flex flex-col gap-3 p-4 rounded-xl border border-surface-100 bg-white">
                {i < HOW_STEPS.length - 1 && <div className="hidden lg:block absolute top-7 -right-1.5 w-3 h-px bg-surface-200 z-10" />}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                    <s.Icon size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-300">{s.n}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">{s.t}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platinum CTA */}
      {!isPlatinum && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="relative overflow-hidden rounded-2xl p-7 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between"
            style={{ background: 'linear-gradient(135deg,#92400e,#d97706)' }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -left-6 -bottom-6 w-28 h-28 bg-white/5 rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Crown size={17} className="text-white" />
                </div>
                <span className="text-white font-extrabold text-lg">Picoso Platinum</span>
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">Rs.99/mo</span>
              </div>
              <p className="text-white/80 text-sm mb-4 max-w-md">
                Save on every order - 20% off, free delivery and priority dispatch.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {PLATINUM_PERKS.map(p => (
                  <div key={p.t} className="flex items-center gap-1.5">
                    <p.Icon size={13} className="text-white/80" />
                    <span className="text-xs text-white/90 font-medium">{p.t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex-shrink-0 flex flex-col items-start md:items-end gap-1.5">
              <Link href="/profile?tab=platinum"
                className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 font-extrabold text-sm rounded-xl hover:bg-orange-50 transition-colors shadow-lg">
                <Crown size={15} /> Activate Now
              </Link>
              <p className="text-xs text-white/60">Cancel anytime &middot; No hidden fees</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  /* =========================================================
     RENDER
  ========================================================= */
  return (
    <div className="overflow-x-hidden">
      {MobileView}
      {DesktopView}
    </div>
  );
}
