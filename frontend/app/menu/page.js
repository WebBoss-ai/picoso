'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Search, X, Leaf, Star, ChefHat, SlidersHorizontal, Clock,
  Truck, Crown, Zap, ArrowRight, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { bowls, categories } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { CATEGORY_ILLUSTRATIONS, CATEGORY_THEMES } from '@/components/CategoryIllustrations';

// ── Promo banners data ──────────────────────────────────────────────────────
const BANNERS = [
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
    sub: 'Join Platinum for ₹99/month — pay less every day.',
    cta: 'Activate Platinum',
    href: '/profile?tab=platinum',
    from: '#92400e', to: '#d97706', accent: '#fef08a',
    Icon: Crown,
    shape: 'diamond',
  },
  {
    id: 'delivery',
    tag: 'Always Free',
    headline: 'Free Delivery\non Every Order',
    sub: 'No minimum, no catch — hot to your door in 30 min.',
    cta: 'Order Now',
    href: '#',
    from: '#1e1b4b', to: '#3730a3', accent: '#c7d2fe',
    Icon: Truck,
    shape: 'triangle',
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

      {/* Decorative background shape */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: b.accent }} />
        <div className="absolute right-12 bottom-0 w-32 h-32 rounded-full opacity-[0.07]"
          style={{ background: b.accent }} />
        <div className="absolute -left-4 top-1/2 w-24 h-24 rounded-full opacity-[0.06]"
          style={{ background: b.accent }} />
      </div>

      {/* Large background icon */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.08]">
        <Icon size={120} color={b.accent} />
      </div>

      <div className="relative px-5 py-5 flex items-center justify-between gap-4">
        {/* Left content */}
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

        {/* Right icon */}
        <div className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}>
          <Icon size={40} color={b.accent} />
        </div>
      </div>

      {/* Nav arrows + dots */}
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
  const [cats, setCats]               = useState([]);
  const [activeCategory, setActive]   = useState('pf-meals');
  const [activeFilter, setFilter]     = useState('all');
  const [search, setSearch]           = useState('');
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [catsLoading, setCatsLoading] = useState(true);
  const [searchOpen, setSearchOpen]   = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    categories.getAll()
      .then(res => { const c = res.data.categories || []; setCats(c); if (c.length) setActive(c[0].id); })
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    bowls.getAll(activeCategory)
      .then(res => setProducts(res.data.bowls || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeFilter === 'veg')        list = list.filter(p => p.isVeg);
    if (activeFilter === 'bestseller') list = list.filter(p => p.isBestseller);
    if (activeFilter === 'chef')       list = list.filter(p => p.isChefSpecial);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (a.isAvailableNow === b.isAvailableNow) return 0;
      return a.isAvailableNow === false ? 1 : -1;
    });
    return list;
  }, [products, activeFilter, search]);

  const activeCat = cats.find(c => c.id === activeCategory);
  const theme = CATEGORY_THEMES[activeCategory] || CATEGORY_THEMES['pf-meals'];

  return (
    <div className="min-h-screen bg-[#f7f8f9]">

      {/* ── Sticky top bar ───────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Title + search row */}
          <div className={`flex items-center gap-3 py-3 ${searchOpen ? 'hidden sm:flex' : 'flex'}`}>
            <div className="flex-1">
              <h1 className="text-base font-bold text-gray-900 leading-none">Our Menu</h1>
              <p className="text-xs text-gray-400 mt-0.5">Nutritionist-crafted meals</p>
            </div>
            <button onClick={() => setSearchOpen(true)}
              className="sm:hidden w-9 h-9 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-brand-600 transition-colors">
              <Search size={17} />
            </button>
            <div className="hidden sm:flex relative max-w-xs flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" className="w-full pl-9 pr-8 py-2 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
                placeholder="Search meals..." value={search} onChange={e => setSearch(e.target.value)} />
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

          {/* ── Category cards row ────────────────────────────────── */}
          <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide py-3">
            {catsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-16 shimmer rounded-2xl" />
                    <div className="h-3 w-14 shimmer rounded" />
                  </div>
                ))
              : cats.map(cat => {
                  const Illustration = CATEGORY_ILLUSTRATIONS[cat.id];
                  const t = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES['pf-meals'];
                  const isActive = activeCategory === cat.id;

                  return (
                    <button key={cat.id}
                      onClick={() => cat.active && setActive(cat.id)}
                      disabled={!cat.active}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                    >
                      {/* Icon box */}
                      <div className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 relative overflow-hidden
                        ${!cat.active
                          ? 'bg-surface-100 grayscale opacity-50'
                          : isActive
                            ? `${t.bg} shadow-lg scale-105`
                            : `${t.light} group-hover:scale-105`
                        }
                        ${isActive ? `ring-2 ring-offset-2 ${t.ring}` : ''}
                      `}>
                        {Illustration && (
                          <Illustration
                            className="w-9 h-9"
                            color={isActive ? 'white' : t.color}
                          />
                        )}
                        {/* Coming soon badge — only when explicitly inactive */}
                        {cat.active === false && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[9px] font-bold text-center py-0.5">
                            SOON
                          </div>
                        )}
                      </div>
                      {/* Label */}
                      <span className={`text-[11px] font-semibold leading-tight ${isActive ? t.text : 'text-gray-400'}`}>
                        {cat.label}
                      </span>
                      {/* Active underline */}
                      <div className={`h-0.5 rounded-full transition-all duration-200 ${isActive ? `w-5 ${t.bg}` : 'w-0 bg-transparent'}`} />
                    </button>
                  );
                })
            }
          </div>
        </div>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-surface-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2.5">
            <SlidersHorizontal size={13} className="text-gray-400 flex-shrink-0 mr-1" />
            {FILTERS.map(f => {
              const Icon = f.icon;
              return (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all duration-150
                    ${activeFilter === f.id ? 'bg-gray-900 text-white' : 'bg-surface-100 text-gray-600 hover:bg-surface-200'}`}>
                  {Icon && <Icon size={11} className={activeFilter === f.id ? 'text-white' : 'text-gray-500'} />}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 pb-28">

        {/* Promotional banner carousel */}
        <div className="mb-5">
          <BannerCarousel />
        </div>

        {/* Category headline */}
        {activeCat && !loading && (
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`w-1 h-5 rounded-full ${theme.bg}`} />
            <div>
              <h2 className="text-base font-bold text-gray-900">{activeCat.label}</h2>
              {activeCat.description && <p className="text-xs text-gray-400">{activeCat.description}</p>}
            </div>
            {!loading && filtered.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">{filtered.length} items</span>
            )}
          </div>
        )}

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            {activeCat && !activeCat.active ? (
              <>
                {/* Inactive category — coming soon state */}
                {(() => { const Ill = CATEGORY_ILLUSTRATIONS[activeCategory]; return Ill ? <Ill className="w-20 h-20 opacity-20" color="#9ca3af" /> : null; })()}
                <p className="font-bold text-gray-400 text-lg">{activeCat.label} — Coming Soon</p>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                  We're working on it! Check back soon for our fresh {activeCat.label.toLowerCase()}.
                </p>
                <Link href="#" className="btn-primary mt-2 text-sm">Explore Bowls</Link>
              </>
            ) : (
              <>
                <Search size={28} className="text-gray-300" />
                <p className="font-semibold text-gray-600">No items found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters</p>
                <button onClick={() => { setSearch(''); setFilter('all'); }} className="btn-secondary text-sm px-6 mt-1">
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
