'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Search, X, Leaf, Star, ChefHat, Clock,
  Truck, Crown, Zap, ArrowRight, ChevronLeft, ChevronRight, Coffee,
  LayoutGrid, Heart, Loader2, CheckCircle2, Phone,
} from 'lucide-react';
import { bowls, categories, healthySubscription, friendReferral } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { CATEGORY_ILLUSTRATIONS, CATEGORY_THEMES } from '@/components/CategoryIllustrations';
import HealthySubscriptionModal from '@/components/HealthySubscriptionModal';

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

// ── Helping Hands Banner (single, replaces carousel) ─────────────────────────
function HelpingHandsBanner({ onGetLink }) {
  return (
    <div className="relative overflow-hidden rounded-2xl select-none"
      style={{ background: 'linear-gradient(135deg, #0f2d1a 0%, #14532d 50%, #166534 100%)' }}>

      {/* Ambient circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full opacity-[0.07]" style={{ background: '#86efac' }} />
        <div className="absolute -left-6 -bottom-6 w-40 h-40 rounded-full opacity-[0.05]" style={{ background: '#6ee7b7' }} />
        <div className="absolute right-20 bottom-4 w-20 h-20 rounded-full opacity-[0.04]" style={{ background: '#d1fae5' }} />
      </div>

      {/* Wrap image on the right */}
      <div className="absolute right-0 top-0 bottom-0 w-32 sm:w-36 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#14532d]/60 z-10" />
        {/* Placeholder wrap visual — a styled box until real image is added */}
        <div className="absolute right-0 top-0 bottom-0 w-full flex items-center justify-center">
          <div className="relative">
            {/* Wrap illustration placeholder */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-300/20 border border-emerald-400/20 flex items-center justify-center">
              <span className="text-4xl">🌯</span>
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400/90 flex items-center justify-center shadow-lg">
              <span className="text-xs font-extrabold text-amber-900">★</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative px-5 py-5 pr-32 sm:pr-36">
        {/* Tag */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <Heart size={10} className="text-emerald-300 fill-emerald-300" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-emerald-300/80">Helping Hands</span>
        </div>

        {/* Headline */}
        <h3 className="text-white font-extrabold text-[19px] leading-snug mb-1.5">
          Know someone who&apos;s<br />into healthy eating?
        </h3>
        <p className="text-white/50 text-[11px] leading-relaxed mb-4 max-w-[190px]">
          Share your personal link. When they order, you get a reward.
        </p>

        {/* CTA */}
        <button
          onClick={onGetLink}
          className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-emerald-950 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-900/30"
        >
          <Heart size={11} className="fill-emerald-950" />
          Get Link
        </button>
      </div>
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
  const searchRef  = useRef(null);
  const sectionRefs = useRef({});
  const tabsRef    = useRef(null);

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

  // Scroll tracker — update active tab as user scrolls
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
    // scroll the tab into view in the horizontal strip
    const tab = tabsRef.current?.querySelector(`[data-tab="${catId}"]`);
    tab?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
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
    <div className="min-h-screen bg-[#f7f8f9]">

      {/* ── Sticky top bar ───────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white" style={{ boxShadow: '0 1px 0 0 #e2e8f0, 0 4px 16px rgba(0,0,0,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Title + search */}
          {!searchOpen && (
            <div className="flex items-center gap-3 pt-3 pb-1">
              <div className="flex-1">
                <h1 className="text-[15px] font-bold text-gray-900 leading-none">Our Menu</h1>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {loading ? 'Loading…' : `${totalFiltered} items across ${cats.length} categories`}
                </p>
              </div>
              <button onClick={() => setSearchOpen(true)}
                className="sm:hidden w-9 h-9 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-brand-600 transition-colors">
                <Search size={16} />
              </button>
              <div className="hidden sm:flex relative w-56">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text"
                  className="w-full pl-9 pr-8 py-2 text-[13px] border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                  placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={12} /></button>}
              </div>
            </div>
          )}

          {searchOpen && (
            <div className="flex items-center gap-2 py-2.5 sm:hidden">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input ref={searchRef} type="text"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={() => { setSearchOpen(false); setSearch(''); }} className="text-sm font-semibold text-brand-600">Cancel</button>
            </div>
          )}

          {/* ── All | Categories | — | Filters  (one unified scrollable row, same square) ── */}
          {/* px-1 adds breathing room so ring outlines aren't clipped on the scroll edge */}
          <div ref={tabsRef} className="flex items-start gap-3 overflow-x-auto scrollbar-hide py-3 px-1 -mx-1">

            {/* "All" square — violet so it never clashes with any category color */}
            <button
              onClick={() => { setFilter('all'); setAllSelected(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex flex-col items-center gap-1 flex-shrink-0 group"
            >
              <div className={[
                'w-[54px] h-[54px] rounded-2xl flex items-center justify-center transition-all duration-200',
                allSelected
                  ? 'bg-violet-500 shadow-md scale-105 ring-2 ring-offset-1 ring-violet-300'
                  : 'bg-violet-50 group-hover:scale-105',
              ].join(' ')}>
                <LayoutGrid size={22} className={allSelected ? 'text-white' : 'text-violet-500'} />
              </div>
              <span className={`text-[10px] font-semibold ${allSelected ? 'text-violet-600' : 'text-gray-400'}`}>All</span>
              <div className={`h-[2px] rounded-full transition-all ${allSelected ? 'w-4 bg-violet-500' : 'w-0'}`} />
            </button>

            {/* Category squares */}
            {catsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-[54px] h-[54px] shimmer rounded-2xl" />
                    <div className="h-2.5 w-10 shimmer rounded mt-0.5" />
                  </div>
                ))
              : cats.map(cat => {
                  const Illustration = CATEGORY_ILLUSTRATIONS[cat.id];
                  const t = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['pf-meals'];
                  const isActive = !allSelected && activeCategory === cat.id;
                  const isBev = cat.id === 'pf-beverages';
                  return (
                    <button
                      key={cat.id}
                      data-tab={cat.id}
                      onClick={() => scrollToSection(cat.id)}
                      className="flex flex-col items-center gap-1 flex-shrink-0 group relative"
                    >
                      {isBev && (
                        <span className="absolute -top-1 -right-0.5 z-10 bg-amber-400 text-amber-900 text-[7px] font-extrabold px-1 py-0.5 rounded-full leading-none">
                          NEW
                        </span>
                      )}
                      <div className={[
                        'w-[54px] h-[54px] rounded-2xl flex items-center justify-center transition-all duration-200',
                        isActive
                          ? `${t.bg} shadow-md shadow-brand-200/40 scale-105 ring-2 ring-offset-1 ${t.ring}`
                          : `${t.light} group-hover:scale-105`,
                      ].join(' ')}>
                        {Illustration && <Illustration className="w-7 h-7" color={isActive ? 'white' : t.color} />}
                      </div>
                      <span className={`text-[10px] font-semibold text-center leading-tight max-w-[58px] ${isActive ? t.text : 'text-gray-400'}`}>
                        {cat.label}
                      </span>
                      <div className={`h-[2px] rounded-full transition-all ${isActive ? `w-4 ${t.bg}` : 'w-0'}`} />
                    </button>
                  );
                })
            }

            {/* Visual divider between categories and filters */}
            {!catsLoading && (
              <div className="flex-shrink-0 self-stretch flex items-center px-1">
                <div className="w-px h-10 bg-surface-200 rounded-full" />
              </div>
            )}

            {/* Filter squares */}
            {[
              { id: 'bestseller', label: 'Bestseller', Icon: Star,    bg: 'bg-amber-400',   light: 'bg-amber-50',    ring: 'ring-amber-200',   text: 'text-amber-600', ic: '#b45309' },
              { id: 'chef',       label: "Chef's",     Icon: ChefHat, bg: 'bg-rose-500',    light: 'bg-rose-50',     ring: 'ring-rose-200',    text: 'text-rose-600',  ic: '#e11d48' },
              { id: 'veg',        label: 'Pure Veg',   Icon: Leaf,    bg: 'bg-emerald-500', light: 'bg-emerald-50',  ring: 'ring-emerald-200', text: 'text-emerald-600',ic: '#059669' },
            ].map(f => {
              const on = activeFilter === f.id;
              const FIcon = f.Icon;
              return (
                <button key={f.id} onClick={() => setFilter(on ? 'all' : f.id)}
                  className="flex flex-col items-center gap-1 flex-shrink-0 group">
                  <div className={[
                    'w-[54px] h-[54px] rounded-2xl flex items-center justify-center transition-all duration-200',
                    on
                      ? `${f.bg} shadow-md scale-105 ring-2 ring-offset-1 ${f.ring}`
                      : `${f.light} group-hover:scale-105`,
                  ].join(' ')}>
                    <FIcon size={20} color={on ? 'white' : f.ic}
                      fill={on && f.id === 'bestseller' ? 'white' : 'none'} />
                  </div>
                  <span className={`text-[10px] font-semibold ${on ? f.text : 'text-gray-400'}`}>{f.label}</span>
                  <div className={`h-[2px] rounded-full transition-all ${on ? `w-4 ${f.bg}` : 'w-0'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 pb-28">

        {/* Helping Hands banner */}
        <div className="mb-7">
          <HelpingHandsBanner onGetLink={() => setLinkModalOpen(true)} />
        </div>

        {/* ── Category sections ─────────────────────────────────── */}
        {loading ? (
          // Skeleton for multiple sections
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, si) => (
              <div key={si}>
                <div className="h-6 shimmer rounded w-32 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden border border-surface-100">
                      <div className="aspect-square shimmer" />
                      <div className="p-3 space-y-2">
                        <div className="h-3.5 shimmer rounded w-3/4" />
                        <div className="h-3 shimmer rounded w-full" />
                        <div className="h-5 shimmer rounded w-1/2 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {categorizedItems.map((cat, idx) => {
              const isBev = cat.id === 'pf-beverages';
              const theme = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['pf-meals'];
              const Illustration = CATEGORY_ILLUSTRATIONS[cat.id];

              return (
                <div key={`wrap-${cat.id}`}>
                <div
                  ref={el => { sectionRefs.current[cat.id] = el; }}
                >
                  {/* ── Section header ───────────────────────────── */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${theme.light}`}>
                      {Illustration && <Illustration className="w-5 h-5" color={theme.color} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-bold text-gray-900">{cat.label}</h2>
                      {cat.description && <p className="text-xs text-gray-400 truncate">{cat.description}</p>}
                    </div>
                    {cat.items.length > 0 && (
                      <span className="text-xs font-medium text-gray-400 bg-surface-100 px-2.5 py-1 rounded-lg flex-shrink-0">
                        {cat.items.length} items
                      </span>
                    )}
                  </div>

                  {/* ── Products or empty state ───────────────────── */}
                  {cat.items.length === 0 ? (
                    <div className={`rounded-2xl border border-dashed py-10 flex flex-col items-center gap-3 ${isBev ? 'border-amber-200 bg-amber-50/50' : 'border-surface-200 bg-white'}`}>
                      {Illustration && (
                        <Illustration className="w-14 h-14 opacity-20" color={isBev ? '#b45309' : '#9ca3af'} />
                      )}
                      <p className={`font-bold text-sm ${isBev ? 'text-amber-700' : 'text-gray-400'}`}>
                        {isBev ? 'Drinks launching soon!' : `No ${cat.label.toLowerCase()} match your filters`}
                      </p>
                      <p className="text-xs text-gray-400 text-center max-w-xs px-4">
                        {isBev
                          ? 'Our cold coffees are being crafted. Check back soon for a refreshing surprise!'
                          : 'Try clearing your filters to see all items.'}
                      </p>
                      {!isBev && (activeFilter !== 'all' || search) && (
                        <button
                          onClick={() => { setSearch(''); setFilter('all'); }}
                          className="mt-1 text-xs font-semibold text-brand-600 hover:underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {cat.items.map(product => (
                        <ProductCard key={product._id} product={product} />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Healthy Subscription card — only after Cold Drinks ── */}
                {isBev && (
                  <div className="mt-8 mb-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-200 to-transparent" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Also for you</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-200 to-transparent" />
                    </div>
                    <SubscriptionCard onActivate={() => setSubModalOpen(true)} />
                  </div>
                )}
                </div>
              );
            })}

            {/* No results at all */}
            {!loading && categorizedItems.every(c => c.items.length === 0) && (activeFilter !== 'all' || search) && (
              <div className="flex flex-col items-center py-16 gap-3">
                <Search size={28} className="text-gray-300" />
                <p className="font-semibold text-gray-600">No items found</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                <button onClick={() => { setSearch(''); setFilter('all'); }} className="btn-secondary text-sm px-6 mt-1">
                  Clear all filters
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
    </div>
  );
}
