'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Plus, Minus, Star, ChefHat, Crown, Clock,
  X, Flame, Zap, Wheat, Droplets, Leaf, Info, ShoppingBag, Coffee,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const PLATINUM_DISCOUNT = 0.20;
const isBeverage    = (p) => p?.pfCategory === 'pf-beverages';
const IS_CAPPUCCINO = (p) => p?.name?.toLowerCase().includes('cappuccino');
const isCoffeeDrink = (p) => isBeverage(p) && p?.name?.toLowerCase() !== 'coke';

// ─── Product Detail Modal ────────────────────────────────────────────────────
function ProductModal({ product, onClose }) {
  const { items, addItem, updateQty } = useCart();
  const { isPlatinum } = useAuth();
  const [imageError, setImageError] = useState(false);

  const cartItem = items.find(i => i._id === product._id);
  const qty = cartItem?.quantity || 0;
  const isUnavailable = product.isAvailableNow === false;
  const originalPrice = product.price;
  const platinumPrice = Math.round(originalPrice * (1 - PLATINUM_DISCOUNT));
  const displayPrice = isPlatinum ? platinumPrice : originalPrice;
  const showMacros = !isBeverage(product);
  const isCappItem = IS_CAPPUCCINO(product);
  const hasNonCapp = items.some(i => !IS_CAPPUCCINO(i));
  const canAdd = !isCappItem || hasNonCapp;
  const isCoffee = isCoffeeDrink(product);

  const handleAdd = () => { if (!isUnavailable && canAdd) addItem(product); };
  const handleIncrease = () => updateQty(product._id, qty + 1);
  const handleDecrease = () => updateQty(product._id, qty - 1);

  const macros = showMacros ? [
    { label: 'Calories', value: product.calories, unit: 'kcal', icon: Flame,   color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-100' },
    { label: 'Protein',  value: product.protein,  unit: 'g',    icon: Zap,     color: 'text-brand-600',  bg: 'bg-brand-50',   border: 'border-brand-100' },
    { label: 'Carbs',    value: product.carbs,    unit: 'g',    icon: Wheat,   color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100' },
    { label: 'Fats',     value: product.fats,     unit: 'g',    icon: Droplets,color: 'text-blue-500',   bg: 'bg-blue-50',    border: 'border-blue-100' },
  ].filter(m => m.value > 0) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Image ──────────────────────────────────────── */}
        <div className="relative w-full flex-shrink-0" style={{ aspectRatio: '4/3' }}>
          {!imageError && product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              sizes="(max-width: 640px) 100vw, 448px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
              <ChefHat size={48} className="text-brand-300" />
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.92)' }}
          >
            <X size={17} className="text-gray-700" />
          </button>

          {/* Badges top-left */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isBestseller && !isUnavailable && (
              <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                <Star size={9} fill="currentColor" /> Bestseller
              </span>
            )}
            {product.isChefSpecial && !isUnavailable && (
              <span className="flex items-center gap-1 bg-brand-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                <ChefHat size={9} /> Chef&apos;s Pick
              </span>
            )}
          </div>

          {/* Veg/non-veg bottom-left */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <div className={`w-5 h-5 rounded-sm flex items-center justify-center border-2 bg-white shadow-sm ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
            </div>
            <span className="text-white text-xs font-semibold drop-shadow">{product.isVeg ? 'Veg' : 'Non-Veg'}</span>
          </div>

          {/* Unavailable badge */}
          {isUnavailable && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white/95 px-4 py-2 rounded-2xl shadow border border-surface-200">
                <Clock size={14} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-600">Available from {product.availableFrom}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Content ────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          <div className="px-5 pt-4 pb-2">

            {/* Name + Price */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{product.name}</h2>
                {isCoffee && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full leading-none">
                    <Coffee size={9} strokeWidth={2} /> 450–500 ml
                  </span>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-extrabold text-gray-900">₹{displayPrice}</div>
                {isPlatinum && originalPrice !== displayPrice && (
                  <div className="text-xs text-gray-400 line-through">₹{originalPrice}</div>
                )}
              </div>
            </div>

            {/* Platinum saving */}
            {!isPlatinum && (
              <div className="flex items-center gap-1.5 mb-3">
                <Crown size={11} className="text-orange-400" />
                <span className="text-xs text-orange-500 font-semibold">₹{platinumPrice} with Platinum — save ₹{originalPrice - platinumPrice}</span>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{product.description}</p>
            )}

            {/* Macros (hidden for beverages) */}
            {showMacros && macros.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Nutrition per serving</p>
                <div className="grid grid-cols-4 gap-2">
                  {macros.map(m => (
                    <div key={m.label} className={`${m.bg} ${m.border} border rounded-2xl p-2.5 text-center`}>
                      <m.icon size={14} className={`${m.color} mx-auto mb-1`} />
                      <p className={`text-sm font-extrabold ${m.color}`}>{m.value}</p>
                      <p className="text-[9px] text-gray-400 font-semibold leading-tight">{m.unit}</p>
                      <p className="text-[9px] text-gray-400 leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>
                {product.fiber > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Leaf size={11} className="text-green-500" /> {product.fiber}g fiber
                  </p>
                )}
              </div>
            )}

            {/* How it's made */}
            {product.howItsMade && (
              <div className="mb-4 p-3.5 bg-surface-50 rounded-2xl border border-surface-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <ChefHat size={12} className="text-brand-500" /> How it&apos;s Made
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">{product.howItsMade}</p>
              </div>
            )}

            {/* Ingredients */}
            {product.ingredients?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Info size={11} /> Ingredients
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.ingredients.map((ing, i) => (
                    <span key={i} className="text-xs text-gray-600 bg-surface-100 px-2.5 py-1 rounded-full border border-surface-200 font-medium">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {product.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] text-gray-400 bg-surface-50 border border-surface-100 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Add to cart footer ──────────────────────────── */}
        <div className="px-5 py-4 border-t border-surface-100 bg-white flex-shrink-0">
          {isUnavailable ? (
            <div className="flex items-center justify-center gap-2 py-3 text-gray-400 text-sm font-semibold">
              <Clock size={15} /> Available from {product.availableFrom}
            </div>
          ) : isCappItem && !hasNonCapp ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 w-full py-3.5 rounded-2xl bg-surface-100 border border-surface-200 justify-center cursor-not-allowed">
                <ShoppingBag size={16} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-400">Add a bowl first to order Cappuccino</span>
              </div>
              <p className="text-xs text-gray-400 text-center">Cappuccino can&apos;t be ordered alone — add any meal or bowl first.</p>
            </div>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              className="btn-primary w-full py-3.5 text-base"
            >
              <Plus size={17} strokeWidth={2.5} /> Add to Cart — ₹{displayPrice}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-brand-500 rounded-2xl px-4 py-3 shadow-sm">
                <button onClick={handleDecrease} className="text-white active:scale-90 transition-transform">
                  <Minus size={16} strokeWidth={3} />
                </button>
                <span className="text-white font-extrabold text-base min-w-[20px] text-center">{qty}</span>
                <button onClick={handleIncrease} className="text-white active:scale-90 transition-transform">
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-400 font-medium">Subtotal</p>
                <p className="text-lg font-extrabold text-gray-900">₹{displayPrice * qty}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 640px) {
          @keyframes slideUp {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        }
      `}</style>
    </div>
  );
}

// ─── Product Card ────────────────────────────────────────────────────────────
export default function ProductCard({ product }) {
  const { items, addItem, updateQty, registerCapp } = useCart();
  const { isPlatinum } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isCappItem = IS_CAPPUCCINO(product);
  const hasNonCapp = items.some(i => !IS_CAPPUCCINO(i));
  const canAdd = !isCappItem || hasNonCapp;
  const isCoffee = isCoffeeDrink(product);

  // Register Cappuccino data so CartContext can auto-add it
  useEffect(() => {
    if (isCappItem) registerCapp(product);
  }, [isCappItem, product, registerCapp]);

  const cartItem = items.find(i => i._id === product._id);
  const qty = cartItem?.quantity || 0;
  const isUnavailable = product.isAvailableNow === false;
  const originalPrice = product.price;
  const platinumPrice = Math.round(originalPrice * (1 - PLATINUM_DISCOUNT));
  const displayPrice = isPlatinum ? platinumPrice : originalPrice;
  const showMacros = !isBeverage(product);

  const handleAdd = (e) => { e.stopPropagation(); if (!isUnavailable && canAdd) addItem(product); };
  const handleIncrease = (e) => { e.stopPropagation(); updateQty(product._id, qty + 1); };
  const handleDecrease = (e) => { e.stopPropagation(); updateQty(product._id, qty - 1); };

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className={`bg-white rounded-2xl overflow-hidden border border-surface-100 shadow-card transition-all duration-200 cursor-pointer ${!isUnavailable ? 'hover:shadow-card-hover hover:-translate-y-0.5' : 'opacity-70'}`}
      >
        {/* Image */}
        <div className="relative w-full aspect-square overflow-hidden bg-surface-100">
          {!imageError && product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-300 ${isUnavailable ? 'grayscale' : 'group-hover:scale-105'}`}
              onError={() => setImageError(true)}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
              <ChefHat size={36} className="text-brand-300" />
            </div>
          )}

          {/* Unavailable overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-surface-200">
                <Clock size={12} className="text-gray-500" />
                <span className="text-xs font-semibold text-gray-600">Available {product.availableFrom}</span>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isBestseller && !isUnavailable && (
              <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                <Star size={9} fill="currentColor" /> Bestseller
              </span>
            )}
            {product.isChefSpecial && !isUnavailable && (
              <span className="flex items-center gap-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                <ChefHat size={9} /> Chef&apos;s Pick
              </span>
            )}
          </div>

          {/* Veg dot */}
          <div className="absolute top-2 right-2">
            <div className={`w-[18px] h-[18px] rounded-sm flex items-center justify-center border-2 bg-white ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
              <div className={`w-2 h-2 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
            </div>
          </div>

          {/* Add button */}
          {!isUnavailable && (
            <div className="absolute bottom-2 right-2">
              {qty === 0 ? (
                canAdd ? (
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-0.5 px-3 py-1.5 bg-white border-2 border-brand-500 text-brand-600 font-bold text-xs rounded-xl shadow-md hover:bg-brand-50 active:scale-95 transition-all"
                  >
                    <Plus size={13} strokeWidth={3} /> ADD
                  </button>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setShowModal(true); }}
                    className="flex items-center gap-0.5 px-2.5 py-1.5 bg-white/90 border-2 border-gray-300 text-gray-400 font-bold text-[10px] rounded-xl shadow-sm cursor-not-allowed"
                    title="Add a bowl first to order Cappuccino"
                  >
                    <ShoppingBag size={11} /> Bowl first
                  </button>
                )
              ) : (
                <div className="flex items-center gap-1.5 bg-brand-500 rounded-xl px-2 py-1 shadow-md">
                  <button onClick={handleDecrease} className="text-white active:scale-90 transition-transform">
                    <Minus size={13} strokeWidth={3} />
                  </button>
                  <span className="text-white font-bold text-xs min-w-[14px] text-center">{qty}</span>
                  <button onClick={handleIncrease} className="text-white active:scale-90 transition-transform">
                    <Plus size={13} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-3 pt-2.5 pb-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 mb-0.5">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-gray-400 line-clamp-1 leading-snug mb-2">{product.description}</p>
          )}

          {/* Macros — hidden for beverages */}
          {showMacros && (product.calories > 0 || product.protein > 0) && (
            <div className="flex items-center gap-2 mb-2">
              {product.calories > 0 && (
                <span className="text-[11px] bg-surface-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">{product.calories} kcal</span>
              )}
              {product.protein > 0 && (
                <span className="text-[11px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md font-medium">{product.protein}g protein</span>
              )}
            </div>
          )}

          {/* Price row — price first, then 450-500ml badge inline for coffee */}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-gray-900 text-sm">₹{displayPrice}</span>
              {isPlatinum && (
                <span className="text-xs text-gray-400 line-through">₹{originalPrice}</span>
              )}
              {isCoffee && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full leading-none">
                  <Coffee size={8} strokeWidth={2.5} /> 450–500 ml
                </span>
              )}
            </div>
            {!isPlatinum && (
              <div className="flex items-center gap-0.5 mt-0.5">
                <Crown size={9} className="text-orange-400" />
                <span className="text-[10px] text-orange-500 font-medium">₹{platinumPrice} with Platinum</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ProductModal product={product} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
