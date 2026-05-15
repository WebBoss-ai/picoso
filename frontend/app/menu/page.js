'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Search, X, Leaf, Star, ChefHat, Clock,
  Truck, Crown, Zap, ArrowRight, ChevronLeft, ChevronRight, Coffee
} from 'lucide-react';
import { bowls, categories } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { CATEGORY_ILLUSTRATIONS, CATEGORY_THEMES } from '@/components/CategoryIllustrations';

// ── Promo banners ────────────────────────────────────────────────────────────
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

const FILTERS = [
  { id: 'all',        label: 'All Items' },
  { id: 'veg',        label: 'Pure Veg',      icon: Leaf },
  { id: 'bestseller', label: 'Bestseller',     icon: Star },
  { id: 'chef',       label: "Chef's Special", icon: ChefHat },
];

// ── Banner carousel ──────────────────────────────────────────────────────────
function BannerCarousel() {
  const [active, setActive] = useState(0);
  const intervalRef = useRef(null);

  const start = () => {
    intervalRef.current = setInterval(() => setActive(a => (a + 1) % BANNERS.length), 4000);
  };
  const stop = () => clearInterval(intervalRef.current);

  useEffect(() => { start(); return stop; }, []);

  const prev = () => { stop(); setActive(a => (a - 1 + BANNERS.length) % BANNERS.length); start(); };
  const next = () => { stop(); setActive(a => (a + 1) % BANNERS.length); start(); };

  const b = BANNERS[active];
  const Icon = b.Icon;

  return (
    <div className="relative overflow-hidden rounded-2xl select-none"
      style={{ background: `linear-gradient(135deg, ${b.from}, ${b.to})` }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full opacity-10" style={{ background: b.accent }} />
        <div className="absolute right-12 bottom-0 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: b.accent }} />
        <div className="absolute -left-4 top-1/2 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: b.accent }} />
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.08]">
        <Icon size={120} color={b.accent} />
      </div>
      <div className="relative px-5 py-5 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Icon size={12} color={b.accent} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: b.accent }}>{b.tag}</span>
          </div>
          <h3 className="text-white font-extrabold text-xl leading-tight mb-1.5 whitespace-pre-line">{b.headline}</h3>
          <p className="text-white/70 text-xs leading-relaxed mb-3 max-w-[200px]">{b.sub}</p>
          <Link href={b.href}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all"
            style={{ background: b.accent, color: b.from }}>
            {b.cta} <ArrowRight size={12} />
          </Link>
        </div>
        <div className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}>
          <Icon size={40} color={b.accent} />
        </div>
      </div>
      <div className="flex items-center justify-between px-5 pb-3 pt-0 relative z-10">
        <div className="flex gap-1.5">
          {BANNERS.map((_, i) => (
            <button key={i} onClick={() => { stop(); setActive(i); start(); }}
              className="transition-all duration-200 rounded-full"
              style={{ width: i === active ? 20 : 6, height: 6, background: i === active ? b.accent : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={prev} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <ChevronLeft size={14} color="white" />
          </button>
          <button onClick={next} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <ChevronRight size={14} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [cats, setCats]             = useState([]);
  const [activeCategory, setActive] = useState('pf-beverages');
  const [activeFilter, setFilter]   = useState('all');
  const [search, setSearch]         = useState('');
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [catsLoading, setCatsLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
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
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Title + search row */}
          <div className={`flex items-center gap-3 py-3 ${searchOpen ? 'hidden sm:flex' : 'flex'}`}>
            <div className="flex-1">
              <h1 className="text-base font-bold text-gray-900 leading-none">Our Menu</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading ? 'Loading...' : `${totalFiltered} items across ${cats.length} categories`}
              </p>
            </div>
            <button onClick={() => setSearchOpen(true)}
              className="sm:hidden w-9 h-9 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-brand-600 transition-colors">
              <Search size={17} />
            </button>
            <div className="hidden sm:flex relative max-w-xs flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" className="w-full pl-9 pr-8 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                placeholder="Search across all categories..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
            </div>
          </div>

          {/* Mobile search expanded */}
          {searchOpen && (
            <div className="flex items-center gap-2 py-2.5 sm:hidden">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input ref={searchRef} type="text" className="w-full pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={() => { setSearchOpen(false); setSearch(''); }} className="text-sm font-semibold text-brand-600">Cancel</button>
            </div>
          )}

          {/* ── Category nav tabs ─────────────────────────────────── */}
          <div ref={tabsRef} className="flex items-start gap-4 overflow-x-auto scrollbar-hide py-3">
            {catsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-16 shimmer rounded-2xl" />
                    <div className="h-3 w-14 shimmer rounded" />
                  </div>
                ))
              : cats.map(cat => {
                  const Illustration = CATEGORY_ILLUSTRATIONS[cat.id];
                  const t = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['pf-meals'];
                  const isActive = activeCategory === cat.id;
                  const isBev = cat.id === 'pf-beverages';

                  return (
                    <button
                      key={cat.id}
                      data-tab={cat.id}
                      onClick={() => scrollToSection(cat.id)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 group relative"
                    >
                      {/* NEW badge for beverages */}
                      {isBev && (
                        <span className="absolute -top-1 -right-1 z-10 bg-amber-400 text-amber-900 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                          NEW
                        </span>
                      )}
                      <div className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 relative overflow-hidden
                        ${isActive ? `${t.bg} shadow-lg scale-105` : `${t.light} group-hover:scale-105`}
                        ${isActive ? `ring-2 ring-offset-2 ${t.ring}` : ''}
                      `}>
                        {Illustration && (
                          <Illustration className="w-9 h-9" color={isActive ? 'white' : t.color} />
                        )}
                      </div>
                      <span className={`text-[11px] font-semibold leading-tight ${isActive ? t.text : 'text-gray-400'}`}>
                        {cat.label}
                      </span>
                      <div className={`h-0.5 rounded-full transition-all duration-200 ${isActive ? `w-5 ${t.bg}` : 'w-0 bg-transparent'}`} />
                    </button>
                  );
                })
            }
          </div>
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 pb-28">

        {/* Filter pills */}
        <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeFilter === f.id
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white text-gray-500 border-surface-200 hover:border-brand-300'
              }`}>
              {f.icon && <f.icon size={12} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Promo banner carousel */}
        <div className="mb-7">
          <BannerCarousel />
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
                <div
                  key={cat.id}
                  ref={el => { sectionRefs.current[cat.id] = el; }}
                >
                  {/* ── Beverages: premium featured header ───────── */}
                  {isBev ? (
                    <div
                      className="relative rounded-2xl overflow-hidden mb-5 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #78350f 0%, #b45309 55%, #d97706 100%)' }}
                    >
                      {/* Decorative blobs */}
                      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10 bg-amber-300 pointer-events-none" />
                      <div className="absolute right-16 bottom-0 w-28 h-28 rounded-full opacity-[0.07] bg-amber-200 pointer-events-none" />
                      <div className="absolute -left-6 top-1/2 w-24 h-24 rounded-full opacity-[0.06] bg-amber-400 pointer-events-none" />
                      {/* Large ghost illustration */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-[0.09] pointer-events-none">
                        {Illustration && <Illustration className="w-32 h-32" color="#fcd34d" />}
                      </div>

                      <div className="relative px-6 py-6 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="bg-amber-300 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide animate-pulse">
                              ✨ NEW
                            </span>
                            {cat.items.length > 0 && (
                              <span className="text-amber-300/90 text-xs font-semibold">{cat.items.length} drinks available</span>
                            )}
                          </div>
                          <h2 className="text-white font-extrabold text-2xl leading-tight mb-1.5">
                            Cold Coffees<br />& Beverages
                          </h2>
                          <p className="text-amber-200/90 text-xs leading-relaxed max-w-[230px]">
                            Crafted with real espresso &amp; premium ingredients. Served ice-cold, sip by sip.
                          </p>
                        </div>
                        <div
                          className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                          {Illustration && <Illustration className="w-12 h-12" color="#fcd34d" />}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Regular section header ─────────────────── */
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
                  )}

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
    </div>
  );
}
