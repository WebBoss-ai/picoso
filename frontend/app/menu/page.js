'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search, X, Leaf, Star, ChefHat, Clock,
  Truck, Crown, Zap, ArrowRight, ChevronLeft, ChevronRight, Coffee,
  LayoutGrid, List, Heart, Loader2, CheckCircle2, Phone, Salad,
  Utensils, BookOpen, ChevronUp, Sparkles, Gift, Plus, Share2, ShoppingBag,
} from 'lucide-react';
import { bowls, categories, healthySubscription, friendReferral } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { CATEGORY_ILLUSTRATIONS, CATEGORY_THEMES, WrapIllustration } from '@/components/CategoryIllustrations';
import HealthySubscriptionModal from '@/components/HealthySubscriptionModal';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

// ── Combo of the day (billboard) ─────────────────────────────────────────────
const COMBO_MEAL = {
  _id: 'combo-paneer-lababdar-mango-lassi',
  name: 'Paneer Lababdar Rice Bowl + Mango Lassi',
  price: 249,
  image: '/combo-meal.png',
  pfCategory: 'pf-meals',
  isVeg: true,
  isCombo: true,
};

/* ── Promo banners (commented out — replaced by Helping Hands banner) ─────────
const BANNERS = [
  {
    id: 'beverages',
    tag: '✨ New Launch',
    headline: 'Cold Coffees\nAre Here!',
    sub: 'Creamy iced lattes & cold brews, crafted with real espresso.',
    cta: 'Try a Drink',
    href: '#',
    from: '#78350f', to: '#b45309', accent: '#fcd34d',
    Icon: Coffee,
    shape: 'circle',
  },
  {
    id: 'fresh',
    tag: 'Our Promise',
    headline: 'Zero Preservatives.\nCooked Fresh.',
    sub: 'Every bowl made to order — no shortcuts.',
    cta: 'See All Bowls',
    href: '#',
    from: '#15803d', to: '#16a34a', accent: '#bbf7d0',
    Icon: Leaf,
    shape: 'circle',
  },
  {
    id: 'platinum',
    tag: 'Save More',
    headline: '20% Off\nEvery Order',
    sub: 'Join Platinum for ₹299/month — pay less every day.',
    cta: 'Activate Platinum',
    href: '/profile?tab=platinum',
    from: '#92400e', to: '#d97706', accent: '#fef08a',
    Icon: Crown,
    shape: 'diamond',
  },
  {
    id: 'protein',
    tag: 'Nutritionist Crafted',
    headline: '30g+ Protein\nPer Bowl',
    sub: 'Macro-perfect meals designed around your fitness goals.',
    cta: 'Explore Menu',
    href: '#',
    from: '#164e63', to: '#0891b2', accent: '#bae6fd',
    Icon: Zap,
    shape: 'wave',
  },
];
─────────────────────────────────────────────────────────────────────────────── */

const FILTERS = [
  { id: 'all',        label: 'All Items' },
  { id: 'veg',        label: 'Pure Veg',      icon: Leaf },
  { id: 'bestseller', label: 'Bestseller',     icon: Star },
  { id: 'chef',       label: "Chef's Special", icon: ChefHat },
];

/* ── BannerCarousel (commented out — replaced by HelpingHandsBanner) ──────────
function BannerCarousel() { ... }
─────────────────────────────────────────────────────────────────────────────── */

// ── Get-Link Modal ────────────────────────────────────────────────────────────
function GetLinkModal({ onClose }) {
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [gender, setGender]   = useState('male');
  const [phase, setPhase]     = useState('form'); // form | submitting | pending
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || phone.length !== 10) {
      setError('Please enter your name and a valid 10-digit phone number.');
      return;
    }
    setError('');
    setPhase('submitting');
    try {
      await friendReferral.request({ name: name.trim(), phone, gender });
      setPhase('pending');
    } catch (e) {
      setError(e?.response?.data?.error || 'Something went wrong. Try again.');
      setPhase('form');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {phase === 'pending' ? (
          /* Success state */
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Request received!</h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto mb-6">
              We&apos;ll generate your personal friendship link and share it with you. It usually takes a few minutes.
            </p>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6 text-left">
              <Clock size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">Approval pending — our team will activate your link shortly.</p>
            </div>
            <button onClick={onClose} className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors">
              Got it
            </button>
          </div>
        ) : (
          /* Form state */
          <div className="px-6 pb-8">
            <div className="py-5 border-b border-gray-100 mb-5">
              <h2 className="text-xl font-extrabold text-gray-900 mb-1">Get your friendship link</h2>
              <p className="text-sm text-gray-400">We&apos;ll set up a personal link to share with friends who love healthy eating.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  placeholder="Full name"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-gray-400 text-sm font-medium">+91</span>
                    <div className="w-px h-4 bg-gray-200" />
                  </div>
                  <input
                    type="tel" inputMode="numeric" maxLength={10}
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                    placeholder="Mobile number"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-16 pr-4 py-3.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['male','Male'],['female','Female'],['other','Other']].map(([v, l]) => (
                    <button key={v} onClick={() => setGender(v)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${gender === v ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-red-500 text-xs font-medium px-1">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={phase === 'submitting'}
                className="w-full mt-2 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                {phase === 'submitting' ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Heart size={15} className="fill-white" /> Request my link</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helping Hands Banner — sleek, minimal "free wrap" referral card ──────────
function HelpingHandsBanner({ onGetLink }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-16px_rgba(0,0,0,0.12)] select-none">
      <div className="flex items-center gap-4 p-4 sm:px-5 sm:py-4">
        {/* Emblem */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Gift size={20} className="text-emerald-600" strokeWidth={2} />
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Helping Hands</span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Reward</span>
          </div>
          <p className="text-[15px] sm:text-[16px] font-bold text-gray-900 leading-snug mt-0.5">
            Refer a friend, get a <span className="text-emerald-600">free wrap</span>
          </p>
          <p className="hidden sm:block text-[12px] text-gray-400 leading-snug mt-0.5">
            Share your link — the moment they order, your wrap is on us.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onGetLink}
          className="group flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-95 text-white font-semibold text-[13px] px-4 py-2.5 transition-all"
        >
          Get link
          <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

// ── Combo Billboard — designed artwork + real clickable CTA overlay ──────────
function ComboBillboard({ onGrab }) {
  return (
    <div className="relative w-full select-none">
      <Image
        src="/combo-billboard.png"
        alt="Combo of the Day — Paneer Lababdar paired with Mango Lassi, all-in-one at ₹249"
        width={1024}
        height={528}
        priority
        quality={100}
        className="w-full h-auto"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 640px, 900px"
      />

      {/* Real working button — sits exactly over the artwork's reserved white pill */}
      <button
        onClick={onGrab}
        aria-label="Grab this combo — Paneer Lababdar with Mango Lassi for ₹249"
        className="absolute flex items-center justify-center gap-[0.6em] rounded-full font-extrabold tracking-tight transition-all active:scale-[0.97] hover:bg-slate-900/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        style={{
          left: '5.3%', top: '78%', width: '41.5%', height: '12.6%',
          color: '#0b2e4f',
          fontSize: 'clamp(11px, 2.4vw, 17px)',
        }}
      >
        Grab This Combo
        <ArrowRight strokeWidth={2.75} style={{ width: '1.1em', height: '1.1em' }} />
      </button>
    </div>
  );
}

// ── Subscription card ────────────────────────────────────────────────────────
function SubscriptionCard({ onActivate }) {
  return (
    <div
      className="rounded-[20px] bg-white overflow-hidden mb-5"
      style={{ boxShadow: '0 2px 16px rgba(22,163,74,0.10), 0 1px 4px rgba(0,0,0,0.06)', border: '1.5px solid #e2e8f0' }}
    >
      {/* gradient accent bar */}
      <div className="h-[3px]" style={{ background: 'linear-gradient(90deg,#16a34a,#22c55e,#34d399)' }}/>

      {/* main content */}
      <div className="px-5 pt-4 pb-3">
        {/* top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-[13px] bg-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ boxShadow: '0 4px 14px rgba(34,197,94,0.35)' }}
            >
              <Leaf size={17} className="text-white"/>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[14px] font-bold text-slate-900 tracking-tight">Healthy Subscription</span>
                <span className="text-[8px] font-bold text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">New</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Chef-curated fresh bowls · weekly · choose your delivery slot
              </p>
            </div>
          </div>
        </div>

        {/* 3 plan tiers */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { bowls: 3, price: '₹690',   per: '₹230/bowl', label: 'Starter',      featured: false },
            { bowls: 5, price: '₹1,100', per: '₹220/bowl', label: 'Popular',       featured: true  },
            { bowls: 7, price: '₹1,400', per: '₹200/bowl', label: 'Best Value',   featured: false },
          ].map(({ bowls, price, per, label, featured }) => (
            <button
              key={bowls}
              onClick={onActivate}
              className={[
                'flex flex-col items-center py-3 px-2 rounded-[13px] transition-all',
                featured
                  ? 'bg-brand-500 hover:bg-brand-600 shadow-md'
                  : 'bg-slate-50 border border-slate-200 hover:border-brand-300 hover:bg-brand-50',
              ].join(' ')}
            >
              <p className={['text-[15px] font-black leading-none', featured ? 'text-white' : 'text-slate-900'].join(' ')}>
                {price}
              </p>
              <p className={['text-[8px] font-medium mt-0.5', featured ? 'text-white/70' : 'text-slate-400'].join(' ')}>
                /week
              </p>
              <div className={['w-full h-px my-2', featured ? 'bg-white/20' : 'bg-slate-200'].join(' ')}/>
              <p className={['text-[9px] font-semibold', featured ? 'text-white/85' : 'text-slate-600'].join(' ')}>
                {bowls} bowls
              </p>
              <p className={['text-[8px]', featured ? 'text-white/60' : 'text-slate-400'].join(' ')}>{per}</p>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onActivate}
          className="w-full h-[42px] rounded-[12px] bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          View plans &amp; subscribe <ChevronRight size={13}/>
        </button>
      </div>
    </div>
  );
}

// ── "Explore menu" decorative header ─────────────────────────────────────────
function ExploreMenuHeader({ itemCount, catCount }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] mb-5"
      style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 40%, #ffffff 100%)' }}>
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(34,197,94,0.16) 0%, rgba(255,255,255,0) 60%)' }} />
      {/* soft leaves */}
      <Leaf size={70} className="absolute -left-3 -top-2 text-emerald-200/40 -rotate-12" />
      <Leaf size={54} className="absolute right-2 bottom-1 text-emerald-200/40 rotate-12" />

      <div className="relative flex flex-col items-center text-center px-5 pt-7 pb-6">
        <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center mb-2.5">
          <BookOpen size={20} className="text-emerald-600" />
        </div>
        <h2 className="text-[26px] font-black tracking-tight leading-none">
          <span className="text-gray-400">explore </span>
          <span className="text-emerald-600" style={{ fontStyle: 'italic' }}>menu</span>
        </h2>
        <p className="text-[11px] text-gray-400 font-medium mt-2">
          {itemCount} dishes · {catCount} categories · cooked fresh
        </p>
      </div>
    </div>
  );
}

// ── Floating "Menu" pill button ──────────────────────────────────────────────
function FloatingMenuButton({ onClick, cartActive }) {
  return (
    <button
      onClick={onClick}
      className="fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-brand-500 text-white font-extrabold text-[14px] shadow-xl shadow-emerald-600/30 active:scale-95 transition-all"
      style={{ bottom: cartActive ? 92 : 24 }}
      aria-label="Open menu categories"
    >
      <Utensils size={17} strokeWidth={2.5} />
      Menu
    </button>
  );
}

// ── Back-to-top pill ─────────────────────────────────────────────────────────
function BackToTop({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gray-900/90 backdrop-blur-sm text-white font-bold text-[13px] shadow-xl active:scale-95 transition-all"
    >
      <ChevronUp size={16} strokeWidth={2.5} /> Back to top
    </button>
  );
}

// ── Category menu overlay (list of categories with counts) ───────────────────
function CategoryMenuOverlay({ cats, categorizedItems, activeCategory, allSelected, onPick, onClose, onBackToTop }) {
  const countFor = (id) => categorizedItems.find(c => c.id === id)?.items.length ?? 0;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: 'rgba(17,24,39,0.35)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      {/* Back to top */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2">
        <BackToTop onClick={onBackToTop} />
      </div>

      {/* Category list card */}
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
        <div className="max-h-[58vh] overflow-y-auto py-1.5">
          {cats.map(cat => {
            const isActive = !allSelected && activeCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => onPick(cat.id)}
                className="w-full flex items-center gap-2 px-5 py-3.5 text-left transition-colors hover:bg-gray-50">
                <span className={`w-2.5 flex-shrink-0 ${isActive ? 'text-emerald-500' : 'text-transparent'}`}>
                  <ChevronRight size={13} strokeWidth={3} />
                </span>
                <span className={`flex-1 text-[15px] ${isActive ? 'font-extrabold text-emerald-600' : 'font-semibold text-gray-800'}`}>
                  {cat.label}
                </span>
                <span className={`text-[14px] tabular-nums ${isActive ? 'font-extrabold text-emerald-600' : 'font-semibold text-gray-400'}`}>
                  {countFor(cat.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Close */}
      <button onClick={onClose}
        className="mt-5 w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg active:scale-90 transition-all">
        <X size={22} strokeWidth={2.5} />
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [cats, setCats]             = useState([]);
  const [activeCategory, setActive] = useState('pf-meals');
  const [activeFilter, setFilter]   = useState('all');
  // true only while the user explicitly chose "All" tab; scroll/category-click clears it
  const [allSelected, setAllSelected] = useState(true);
  const [search, setSearch]         = useState('');
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [catsLoading, setCatsLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'large'
  const searchRef  = useRef(null);
  const sectionRefs = useRef({});
  const tabsRef    = useRef(null);
  const { cartCount, addCombo } = useCart();
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  // One-click combo → add to cart, then straight to checkout (auth-gated)
  const handleGrabCombo = () => {
    addCombo(COMBO_MEAL);
    if (isLoggedIn) {
      router.push('/checkout');
    } else {
      window.dispatchEvent(new CustomEvent('picoso:require-auth', { detail: 'checkout' }));
    }
  };

  // Load categories
  useEffect(() => {
    categories.getAll()
      .then(res => {
        const c = res.data.categories || [];
        setCats(c);
        if (c.length) setActive(c[0].id);
      })
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  }, []);

  // Load ALL bowls at once (no category filter)
  useEffect(() => {
    setLoading(true);
    bowls.getAll()
      .then(res => setProducts(res.data.bowls || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // Scroll tracker — update active tab as user scrolls + toggle back-to-top
  useEffect(() => {
    if (!cats.length) return;
    const handleScroll = () => {
      const OFFSET = 155;
      let current = cats[0]?.id;
      for (const cat of cats) {
        const el = sectionRefs.current[cat.id];
        if (el && el.offsetTop <= window.scrollY + OFFSET) current = cat.id;
      }
      setAllSelected(false);
      setActive(prev => prev !== current ? current : prev);
      setShowBackTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [cats]);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  const scrollToSection = (catId) => {
    const el = sectionRefs.current[catId];
    if (el) {
      const offset = 135;
      window.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' });
    }
    setActive(catId);
    setAllSelected(false);
    setCatMenuOpen(false);
    // scroll the tab into view in the horizontal strip (if present)
    const tab = tabsRef.current?.querySelector(`[data-tab="${catId}"]`);
    tab?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCatMenuOpen(false);
  };

  // Global filter + sort
  const filtered = useMemo(() => {
    let list = [...products];
    if (activeFilter === 'veg')        list = list.filter(p => p.isVeg);
    if (activeFilter === 'bestseller') list = list.filter(p => p.isBestseller);
    if (activeFilter === 'chef')       list = list.filter(p => p.isChefSpecial);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      if (a.isAvailableNow === b.isAvailableNow) return 0;
      return a.isAvailableNow === false ? 1 : -1;
    });
  }, [products, activeFilter, search]);

  // Group by category
  const categorizedItems = useMemo(() => {
    return cats.map(cat => ({
      ...cat,
      items: filtered.filter(p => p.pfCategory === cat.id),
    }));
  }, [cats, filtered]);

  const totalFiltered = filtered.length;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Sticky top bar ───────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white" style={{ boxShadow: '0 1px 0 0 #eef0f3, 0 2px 12px rgba(0,0,0,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* ── Row 1: Search + Veg toggle + View toggle ── */}
          <div className="flex items-center gap-2 pt-3 pb-2.5">
            {/* Search field */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input ref={searchRef} type="text"
                className="w-full pl-10 pr-9 py-2.5 text-[14px] border border-gray-200 rounded-2xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 focus:bg-white transition-all placeholder-gray-400"
                placeholder="Search for dishes…"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* VEG toggle */}
            <button
              onClick={() => setFilter(activeFilter === 'veg' ? 'all' : 'veg')}
              className="flex items-center gap-1.5 pl-2.5 pr-2 py-2 rounded-2xl border border-gray-200 bg-gray-50 flex-shrink-0 active:scale-95 transition-all"
              aria-label="Toggle pure veg"
            >
              <span className={`text-[11px] font-extrabold tracking-wide ${activeFilter === 'veg' ? 'text-emerald-600' : 'text-gray-400'}`}>VEG</span>
              <span className={`relative w-8 h-[18px] rounded-full transition-colors ${activeFilter === 'veg' ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${activeFilter === 'veg' ? 'left-[16px]' : 'left-[2px]'}`} />
              </span>
            </button>

            {/* View-mode toggle */}
            <div className="hidden sm:flex items-center bg-gray-100 rounded-xl p-0.5 flex-shrink-0">
              <button onClick={() => setViewMode('list')}
                aria-label="Compact view"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <List size={16} />
              </button>
              <button onClick={() => setViewMode('large')}
                aria-label="Large image view"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'large' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {/* ── Row 2: Filter pills ── */}
          <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'bestseller', label: 'Bestseller',   Icon: Star },
              { id: 'chef',       label: "Chef's Pick",  Icon: ChefHat },
              { id: 'veg',        label: 'Pure Veg',     Icon: Leaf },
            ].map(f => {
              const on = activeFilter === f.id;
              const FIcon = f.Icon;
              return (
                <button key={f.id} onClick={() => setFilter(on ? 'all' : f.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150 border ${
                    on
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                  }`}>
                  <FIcon size={12} fill={on && f.id === 'bestseller' ? 'currentColor' : 'none'} />
                  {f.label}
                </button>
              );
            })}
            {(activeFilter !== 'all' || search) && (
              <button onClick={() => { setSearch(''); setFilter('all'); }}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors">
                <X size={10} /> Clear
              </button>
            )}
            <span className="ml-auto flex-shrink-0 text-[11px] font-semibold text-gray-400 pl-2">
              {loading ? '…' : `${totalFiltered} items`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 pb-28">

        {/* Explore menu header */}
        <ExploreMenuHeader itemCount={loading ? '—' : totalFiltered} catCount={cats.length} />

        {/* Combo of the day billboard */}
        <div className="mb-6">
          <ComboBillboard onGrab={handleGrabCombo} />
        </div>

        {/* ── Category sections ─────────────────────────────────── */}
        {loading ? (
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, si) => (
              <div key={si} className="space-y-3">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-9 h-9 shimmer rounded-full" />
                  <div className="space-y-1.5">
                    <div className="h-4 shimmer rounded w-28" />
                    <div className="h-3 shimmer rounded w-16" />
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <div className="w-full shimmer rounded-[18px]" style={{ aspectRatio: '1 / 1' }} />
                      <div className="pt-4 space-y-2">
                        <div className="h-3.5 shimmer rounded w-3/4" />
                        <div className="h-3 shimmer rounded w-full" />
                        <div className="h-4 shimmer rounded w-1/3 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {categorizedItems.map((cat) => {
              const isBev = cat.id === 'pf-beverages';
              const isMeals = cat.id === 'pf-meals';
              const theme = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['pf-meals'];
              const Illustration = CATEGORY_ILLUSTRATIONS[cat.id];

              return (
                <div key={`wrap-${cat.id}`}>
                  <div ref={el => { sectionRefs.current[cat.id] = el; }}>

                    {/* ── Section header ── */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${theme.light}`}>
                        {Illustration && <Illustration className="w-5 h-5" color={theme.color} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-[17px] font-extrabold text-gray-900 tracking-tight">{cat.label}</h2>
                          {isBev && (
                            <span className="bg-amber-400 text-amber-900 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full leading-none uppercase">New</span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-400 mt-0.5 font-medium">
                          {cat.items.length} {cat.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>

                    {/* ── Products or empty state ── */}
                    {cat.items.length === 0 ? (
                      <div className={`rounded-2xl border border-dashed py-10 flex flex-col items-center gap-3 ${isBev ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-white'}`}>
                        {Illustration && (
                          <Illustration className="w-12 h-12 opacity-20" color={isBev ? '#b45309' : '#9ca3af'} />
                        )}
                        <p className={`font-bold text-sm ${isBev ? 'text-amber-700' : 'text-gray-400'}`}>
                          {isBev ? 'Drinks launching soon!' : `No ${cat.label.toLowerCase()} match your filters`}
                        </p>
                        {!isBev && (activeFilter !== 'all' || search) && (
                          <button onClick={() => { setSearch(''); setFilter('all'); }}
                            className="text-xs font-semibold text-emerald-600 hover:underline">
                            Clear filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={
                        viewMode === 'large'
                          ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                          : 'grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-6'
                      }>
                        {cat.items.map(product => (
                          <ProductCard key={product._id} product={product} variant={viewMode} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Helping Hands (free wrap) — right after the bowls section */}
                  {isMeals && (
                    <div className="mt-7">
                      <HelpingHandsBanner onGetLink={() => setLinkModalOpen(true)} />
                    </div>
                  )}

                  {/* Healthy Subscription card — only after Cold Drinks */}
                  {isBev && (
                    <div className="mt-8 mb-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Also for you</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      </div>
                      <SubscriptionCard onActivate={() => setSubModalOpen(true)} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* No results */}
            {!loading && categorizedItems.every(c => c.items.length === 0) && (activeFilter !== 'all' || search) && (
              <div className="flex flex-col items-center py-16 gap-3">
                <Search size={28} className="text-gray-300" />
                <p className="font-bold text-gray-600">No items found</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                <button onClick={() => { setSearch(''); setFilter('all'); }}
                  className="mt-1 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors">
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Healthy Subscription modal */}
      <HealthySubscriptionModal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        onSubscribe={({ items, plan }) => {
          healthySubscription.create({
            selectedItems: items.map(String),
            bowlsPerWeek: plan.id,
          }).catch(() => {});
          setSubModalOpen(false);
        }}
      />

      {/* Get referral link modal */}
      {linkModalOpen && <GetLinkModal onClose={() => setLinkModalOpen(false)} />}

      {/* Standalone back-to-top (when scrolled & overlay closed) */}
      {showBackTop && !catMenuOpen && (
        <div className="fixed left-1/2 -translate-x-1/2 z-40" style={{ top: 130 }}>
          <BackToTop onClick={scrollToTop} />
        </div>
      )}

      {/* Floating Menu button */}
      {!catMenuOpen && !loading && cats.length > 0 && (
        <FloatingMenuButton onClick={() => setCatMenuOpen(true)} cartActive={cartCount > 0} />
      )}

      {/* Category overlay */}
      {catMenuOpen && (
        <CategoryMenuOverlay
          cats={cats}
          categorizedItems={categorizedItems}
          activeCategory={activeCategory}
          allSelected={allSelected}
          onPick={scrollToSection}
          onClose={() => setCatMenuOpen(false)}
          onBackToTop={scrollToTop}
        />
      )}
    </div>
  );
}
