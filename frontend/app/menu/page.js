'use client';
import { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, Leaf, Flame, Star, ChefHat, Lock } from 'lucide-react';
import { bowls } from '@/lib/api';
import ProductCard from '@/components/ProductCard';

const CATEGORIES = [
  { id: 'pf-meals', label: 'PF Meals', active: true },
  { id: 'pf-snacks', label: 'PF Snacks', active: false },
  { id: 'pf-desserts', label: 'PF Desserts', active: false },
  { id: 'pf-beverages', label: 'PF Beverages', active: false },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'veg', label: 'Veg', icon: <Leaf size={12} className="text-green-600" /> },
  { id: 'nonveg', label: 'Non-Veg', icon: <Flame size={12} className="text-red-500" /> },
  { id: 'bestseller', label: 'Bestseller', icon: <Star size={12} className="text-amber-500" /> },
  { id: 'chef', label: "Chef's Special", icon: <ChefHat size={12} className="text-brand-600" /> },
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('pf-meals');
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    bowls.getAll('pf-meals')
      .then(res => setProducts(res.data.bowls || []))
      .catch(() => setError('Failed to load menu. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeFilter === 'veg') list = list.filter(p => p.isVeg);
    if (activeFilter === 'nonveg') list = list.filter(p => !p.isVeg);
    if (activeFilter === 'bestseller') list = list.filter(p => p.isBestseller);
    if (activeFilter === 'chef') list = list.filter(p => p.isChefSpecial);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeFilter, search]);

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-surface-50 border-b border-surface-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Our Menu</h1>
          <p className="text-sm text-gray-500">Nutritionist-crafted meals for your health goals</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => cat.active && setActiveCategory(cat.id)}
              disabled={!cat.active}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm flex-shrink-0 transition-all duration-200
                ${!cat.active
                  ? 'bg-surface-100 text-gray-400 cursor-not-allowed'
                  : activeCategory === cat.id
                    ? 'bg-brand-500 text-white shadow-premium'
                    : 'bg-white text-gray-600 border border-surface-200 hover:border-brand-300 hover:text-brand-600'
                }
              `}
            >
              {cat.label}
              {!cat.active && <Lock size={11} className="opacity-60" />}
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search meals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all duration-150
                  ${activeFilter === f.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-white border border-surface-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'
                  }
                `}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-5">
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'} available
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card">
                <div className="aspect-[4/3] shimmer rounded-t-2xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 shimmer rounded w-3/4" />
                  <div className="h-3 shimmer rounded w-full" />
                  <div className="h-3 shimmer rounded w-2/3" />
                  <div className="flex justify-between pt-1">
                    <div className="h-6 shimmer rounded w-16" />
                    <div className="h-8 shimmer rounded-xl w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flame size={28} className="text-red-400" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">Something went wrong</p>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No items found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or search</p>
            <button
              onClick={() => { setSearch(''); setActiveFilter('all'); }}
              className="btn-secondary mt-4"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
