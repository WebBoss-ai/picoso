'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Truck, Clock, Shield, Crown, Leaf, Sparkles,
  CheckCircle2, Star, ChevronRight, Dumbbell, Heart,
  UtensilsCrossed, Cookie, Coffee, Percent, Zap, Gift, Package,
  Timer, Search, ShoppingBag, ChefHat
} from 'lucide-react';
import { bowls } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
  {
    id: 'pf-meals', label: 'PF Meals',
    description: 'High-protein balanced meals',
    icon: UtensilsCrossed, active: true, href: '/menu',
    iconBg: 'bg-brand-100', iconColor: 'text-brand-600',
    activeBorder: 'border-brand-200', activeBg: 'bg-brand-50',
  },
  {
    id: 'pf-snacks', label: 'PF Snacks',
    description: 'Guilt-free nutritious snacks',
    icon: Cookie, active: false,
    iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
  },
  {
    id: 'pf-desserts', label: 'PF Desserts',
    description: 'Sweet treats, macro-friendly',
    icon: Heart, active: false,
    iconBg: 'bg-pink-100', iconColor: 'text-pink-600',
  },
  {
    id: 'pf-beverages', label: 'PF Beverages',
    description: 'Functional refreshing drinks',
    icon: Coffee, active: false,
    iconBg: 'bg-sky-100', iconColor: 'text-sky-600',
  },
];

const FEATURES = [
  { icon: Truck,    title: 'Free Delivery',       desc: 'Every order, no minimum',    color: 'text-brand-600',   bg: 'bg-brand-50' },
  { icon: Timer,    title: '30-Min Delivery',      desc: 'Hot & fresh, guaranteed',    color: 'text-violet-600',  bg: 'bg-violet-50' },
  { icon: Leaf,     title: 'Zero Preservatives',   desc: 'Clean whole ingredients',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: Shield,   title: 'FSSAI Certified',      desc: 'Hygiene-first kitchen',      color: 'text-blue-600',    bg: 'bg-blue-50' },
  { icon: Dumbbell, title: 'Nutritionist-Crafted', desc: 'Designed for your goals',    color: 'text-orange-600',  bg: 'bg-orange-50' },
  { icon: ChefHat,  title: 'Chef-Quality Taste',   desc: 'Healthy doesn\'t mean bland', color: 'text-rose-600',   bg: 'bg-rose-50' },
];

const STATS = [
  { icon: ShoppingBag, value: '10,000+', label: 'Orders Delivered',   color: 'text-brand-600',  bg: 'bg-brand-50' },
  { icon: Clock,       value: '30 min',  label: 'Avg Delivery Time',   color: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: Package,     value: '30+',     label: 'Fresh Meal Options',  color: 'text-orange-600', bg: 'bg-orange-50' },
  { icon: Star,        value: '4.9',     label: 'Customer Rating',     color: 'text-amber-600',  bg: 'bg-amber-50' },
];

const HOW_IT_WORKS = [
  { icon: Search,      step: '01', title: 'Browse & Pick',    desc: 'Choose from 30+ protein-rich PF Meals.' },
  { icon: ShoppingBag, step: '02', title: 'Add & Checkout',   desc: 'Cart → phone login → pay in 60 seconds.' },
  { icon: ChefHat,     step: '03', title: 'Freshly Prepared', desc: 'Cooked fresh after your order is placed.' },
  { icon: Truck,       step: '04', title: 'Delivered Hot',    desc: 'At your door, hot and ready to eat.' },
];

const PLATINUM_PERKS = [
  { icon: Percent, title: '20% Off Every Meal',  desc: 'Flat discount on all orders' },
  { icon: Truck,   title: 'Free Delivery Always', desc: 'Zero fees on every order' },
  { icon: Zap,     title: 'Priority Dispatch',    desc: 'Your order jumps the queue' },
  { icon: Gift,    title: 'Exclusive Deals',      desc: 'Member-only offers' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isPlatinum } = useAuth();

  useEffect(() => {
    bowls.getAll('pf-meals').then(res => {
      const items = res.data.bowls || [];
      const bestsellers = items.filter(b => b.isBestseller).slice(0, 3);
      setFeatured(bestsellers.length >= 2 ? bestsellers : items.slice(0, 3));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="overflow-x-hidden">

      {/* ─── Hero (unchanged) ───────────────────────────────────────── */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-brand-100 rounded-full opacity-50 blur-3xl" />
          <div className="absolute top-1/2 -left-24 w-72 h-72 bg-violet-100 rounded-full opacity-30 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-48 h-48 bg-amber-100 rounded-full opacity-40 blur-2xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left max-w-xl mx-auto lg:mx-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-100 text-brand-700 rounded-full text-xs font-bold mb-6 shadow-sm">
                <Sparkles size={12} /> Nutritionist-Crafted Healthy Food
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-5">
                Fuel Your Body,<br />
                <span className="relative inline-block">
                  <span className="text-brand-500">Love Every Bite</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 8" fill="none">
                    <path d="M2 6 Q75 2 150 5 Q225 8 298 4" stroke="#86efac" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </svg>
                </span>
              </h1>
              <p className="text-base sm:text-lg text-gray-500 leading-relaxed mb-8">
                PF Meals crafted with real ingredients, zero junk, and exactly the protein your body needs — delivered hot in 30 minutes.
              </p>
              <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start mb-10">
                <Link href="/menu" className="btn-primary text-base px-7 py-3.5 shadow-premium">
                  Order Now <ArrowRight size={18} />
                </Link>
                <Link href="/profile?tab=platinum" className="btn-platinum text-base px-7 py-3.5">
                  <Crown size={16} /> Get Platinum
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <div className="flex -space-x-1.5">
                    {['🧑','👩','👨','🧑','👩'].map((e, i) => (
                      <span key={i} className="w-7 h-7 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center text-xs">{e}</span>
                    ))}
                  </div>
                  <span>10,000+ customers</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                  {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor" />)}
                  <span className="text-gray-600 font-medium ml-0.5">4.9 rating</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                  <CheckCircle2 size={13} /> FSSAI Certified
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-full max-w-sm lg:max-w-md">
              <div className="relative">
                <div className="relative bg-gradient-to-br from-brand-100 via-brand-50 to-white rounded-[2rem] p-8 shadow-premium border border-brand-100">
                  <div className="text-center mb-4">
                    <span className="text-7xl">🥗</span>
                  </div>
                  <div className="text-center mb-4">
                    <p className="font-bold text-gray-900 text-lg">Ultimate Protein Bowl</p>
                    <p className="text-sm text-gray-500 mt-0.5">40g Protein • 480 kcal</p>
                  </div>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {[['40g', 'Protein', 'bg-brand-100 text-brand-700'], ['45g', 'Carbs', 'bg-blue-100 text-blue-700'], ['12g', 'Fats', 'bg-amber-100 text-amber-700']].map(([v, l, cls]) => (
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
        </div>
      </section>

      {/* ─── Stats strip ────────────────────────────────────────────── */}
      <section className="border-y border-surface-100 bg-surface-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.label}
                  className={`flex items-center gap-3 py-5 px-4 ${i < STATS.length - 1 ? 'border-r border-surface-200' : ''} ${i >= 2 ? 'border-t border-surface-200 md:border-t-0' : ''}`}>
                  <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={s.color} />
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-gray-900 leading-none">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      
      {/* ─── Bestsellers ────────────────────────────────────────────── */}
      <section className="bg-surface-50 border-y border-surface-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Customer Favourites</h2>
              <p className="text-sm text-gray-400 mt-0.5">Most ordered this week</p>
            </div>
            <Link href="/menu" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card">
                  <div className="aspect-[4/3] shimmer rounded-t-2xl" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 shimmer rounded w-3/4" />
                    <div className="h-3 shimmer rounded w-full" />
                    <div className="flex justify-between pt-2">
                      <div className="h-6 shimmer rounded w-16" />
                      <div className="h-8 shimmer rounded-xl w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(item => (
                <ProductCard key={item._id} product={item} />
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ─── Categories ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Our Categories</h2>
            <p className="text-sm text-gray-400 mt-0.5">PF Meals live now — more coming soon</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.id}>
                {cat.active ? (
                  <Link href={cat.href}
                    className={`group flex items-center gap-3 p-4 rounded-xl border ${cat.activeBorder} ${cat.activeBg} hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200`}>
                    <div className={`w-10 h-10 ${cat.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={cat.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{cat.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate hidden sm:block">{cat.description}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-surface-200 bg-surface-50 cursor-not-allowed opacity-60">
                    <div className={`w-10 h-10 ${cat.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 grayscale`}>
                      <Icon size={18} className={cat.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-400 text-sm leading-tight">{cat.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Coming soon</p>
                    </div>
                    <span className="text-xs bg-surface-200 text-gray-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Soon</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Why Picoso ─────────────────────────────────────────────── */}
      <section className="border-t border-surface-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Why Picoso?</h2>
              <p className="text-sm text-gray-400 mt-0.5">Healthy food that actually works</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl border border-surface-100 bg-white hover:border-surface-200 hover:shadow-card transition-all duration-150">
                  <div className={`w-9 h-9 ${f.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={16} className={f.color} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">How It Works</h2>
            <p className="text-sm text-gray-400 mt-0.5">Click to doorstep in four steps</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.step} className="relative flex flex-col gap-3 p-4 rounded-xl border border-surface-100 bg-white">
                {/* Connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-7 -right-1.5 w-3 h-px bg-surface-200 z-10" />
                )}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-300">{step.step}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">{step.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Platinum CTA ───────────────────────────────────────────── */}
      {!isPlatinum && (
        <section className="border-t border-surface-100 bg-surface-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between p-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 relative overflow-hidden">
              {/* Subtle background ring */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -left-6 -bottom-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

              {/* Left: identity + perks */}
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Crown size={16} className="text-white" />
                  </div>
                  <span className="text-white font-bold text-base">Picoso Platinum</span>
                  <span className="text-xs bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full">₹99/mo</span>
                </div>
                <p className="text-white/80 text-sm mb-4 max-w-md">
                  Save on every order — 20% off, free delivery and priority dispatch for just ₹99/month.
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {PLATINUM_PERKS.map(p => {
                    const Icon = p.icon;
                    return (
                      <div key={p.title} className="flex items-center gap-1.5">
                        <Icon size={13} className="text-white/80" />
                        <span className="text-xs text-white/90 font-medium">{p.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: CTA */}
              <div className="relative flex-shrink-0 flex flex-col items-start md:items-end gap-1.5">
                <Link href="/profile?tab=platinum"
                  className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 font-bold text-sm rounded-xl hover:bg-orange-50 transition-colors shadow-lg">
                  <Crown size={15} /> Activate Now
                </Link>
                <p className="text-xs text-white/60">Cancel anytime · No hidden fees</p>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
