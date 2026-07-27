'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Plus, Minus, Star, ChefHat, Crown, Clock, ChevronDown,
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
    { label: 'Cal',     value: product.calories, unit: 'kcal', icon: Flame,    color: 'text-orange-500', bg: 'bg-orange-50',  border: 'border-orange-100' },
    { label: 'Protein', value: product.protein,  unit: 'g',    icon: Zap,      color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Carbs',   value: product.carbs,    unit: 'g',    icon: Wheat,    color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100' },
    { label: 'Fats',    value: product.fats,     unit: 'g',    icon: Droplets, color: 'text-blue-500',   bg: 'bg-blue-50',    border: 'border-blue-100' },
  ].filter(m => m.value > 0) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl max-h-[94vh] flex flex-col"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative w-full flex-shrink-0" style={{ aspectRatio: '4/3' }}>
          {!imageError && product.image ? (
            <Image src={product.image} alt={product.name} fill
              className="object-cover" onError={() => setImageError(true)}
              sizes="(max-width: 640px) 100vw, 448px" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
              <ChefHat size={56} className="text-emerald-200" />
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.9)' }}>
            <X size={17} className="text-gray-700" />
          </button>
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            {product.isBestseller && !isUnavailable && (
              <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                <Star size={9} fill="currentColor" /> Bestseller
              </span>
            )}
            {product.isChefSpecial && !isUnavailable && (
              <span className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                <ChefHat size={9} /> Chef&apos;s Pick
              </span>
            )}
          </div>
          <div className="absolute bottom-4 left-5 flex items-center gap-2">
            <div className={`w-5 h-5 rounded-sm flex items-center justify-center border-2 bg-white shadow-sm ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
            </div>
            <span className="text-white text-xs font-semibold drop-shadow">{product.isVeg ? 'Pure Veg' : 'Non-Veg'}</span>
          </div>
          {isUnavailable && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white/95 px-4 py-2.5 rounded-2xl shadow border border-gray-200">
                <Clock size={14} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-600">Available from {product.availableFrom}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <div className="px-5 pt-5 pb-2">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight tracking-tight">{product.name}</h2>
                {isCoffee && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Coffee size={9} strokeWidth={2} /> 450–500 ml
                  </span>
                )}
              </div>
              <div className="text-right flex-shrink-0 mt-0.5">
                <div className="text-[22px] font-extrabold text-gray-900">₹{displayPrice}</div>
                {isPlatinum && originalPrice !== displayPrice && (
                  <div className="text-xs text-gray-400 line-through">₹{originalPrice}</div>
                )}
              </div>
            </div>

            {!isPlatinum && (
              <div className="flex items-center gap-1.5 mb-3">
                <Crown size={11} className="text-orange-400" />
                <span className="text-xs text-orange-500 font-semibold">₹{platinumPrice} with Platinum — save ₹{originalPrice - platinumPrice}</span>
              </div>
            )}

            {product.description && (
              <p className="text-[14px] text-gray-500 leading-relaxed mb-4">{product.description}</p>
            )}

            {showMacros && macros.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Nutrition per serving</p>
                <div className="grid grid-cols-4 gap-2">
                  {macros.map(m => (
                    <div key={m.label} className={`${m.bg} ${m.border} border rounded-2xl p-2.5 text-center`}>
                      <m.icon size={14} className={`${m.color} mx-auto mb-1`} />
                      <p className={`text-sm font-extrabold ${m.color}`}>{m.value}</p>
                      <p className="text-[9px] text-gray-400 font-medium leading-tight">{m.unit}</p>
                      <p className="text-[9px] text-gray-400 leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>
                {product.fiber > 0 && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Leaf size={11} className="text-green-500" /> {product.fiber}g fiber
                  </p>
                )}
              </div>
            )}

            {product.howItsMade && (
              <div className="mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <ChefHat size={12} className="text-emerald-500" /> How it&apos;s Made
                </p>
                <p className="text-[13px] text-gray-600 leading-relaxed">{product.howItsMade}</p>
              </div>
            )}

            {product.ingredients?.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Info size={11} /> Ingredients
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.ingredients.map((ing, i) => (
                    <span key={i} className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0">
          {isUnavailable ? (
            <div className="flex items-center justify-center gap-2 py-3 text-gray-400 text-sm font-semibold">
              <Clock size={15} /> Available from {product.availableFrom}
            </div>
          ) : isCappItem && !hasNonCapp ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 w-full py-3.5 rounded-2xl bg-gray-100 border border-gray-200 justify-center cursor-not-allowed">
                <ShoppingBag size={16} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-400">Add a bowl first to order this</span>
              </div>
            </div>
          ) : qty === 0 ? (
            <button onClick={handleAdd}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-[15px] transition-all shadow-lg shadow-emerald-500/20">
              <Plus size={17} strokeWidth={2.5} /> Add to Cart — ₹{displayPrice}
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-emerald-600 rounded-2xl px-5 py-3 shadow-sm">
                <button onClick={handleDecrease} className="text-white active:scale-90 transition-transform">
                  <Minus size={16} strokeWidth={3} />
                </button>
                <span className="text-white font-extrabold text-base min-w-[20px] text-center">{qty}</span>
                <button onClick={handleIncrease} className="text-white active:scale-90 transition-transform">
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[11px] text-gray-400 font-medium">Subtotal</p>
                <p className="text-xl font-extrabold text-gray-900">₹{displayPrice * qty}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 640px) {
          @keyframes slideUp {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        }
      `}</style>
    </div>
  );
}

// ─── Product Card — luxury horizontal on mobile, vertical on desktop ──────────
export default function ProductCard({ product, variant = 'list' }) {
  const { items, addItem, updateQty, registerCapp } = useCart();
  const { isPlatinum } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [showModal, setShowModal]   = useState(false);

  const isCappItem = IS_CAPPUCCINO(product);
  const hasNonCapp = items.some(i => !IS_CAPPUCCINO(i));
  const canAdd     = !isCappItem || hasNonCapp;
  const isCoffee   = isCoffeeDrink(product);

  useEffect(() => {
    if (isCappItem) registerCapp(product);
  }, [isCappItem, product, registerCapp]);

  const cartItem    = items.find(i => i._id === product._id);
  const qty         = cartItem?.quantity || 0;
  const isUnavailable = product.isAvailableNow === false;
  const originalPrice = product.price;
  const platinumPrice = Math.round(originalPrice * (1 - PLATINUM_DISCOUNT));
  const displayPrice  = isPlatinum ? platinumPrice : originalPrice;
  const showMacros    = !isBeverage(product);

  const handleAdd      = (e) => { e.stopPropagation(); if (!isUnavailable && canAdd) addItem(product); };
  const handleIncrease = (e) => { e.stopPropagation(); updateQty(product._id, qty + 1); };
  const handleDecrease = (e) => { e.stopPropagation(); updateQty(product._id, qty - 1); };

  // ── PREMIUM variant — sleek, borderless, one thin image per row (bowls) ──
  if (variant === 'premium') {
    return (
      <>
        <div
          onClick={() => setShowModal(true)}
          className={`group cursor-pointer ${isUnavailable ? 'opacity-75' : ''}`}
        >
          {/* Thin, wide image — borderless, sits on page background */}
          <div className="relative">
            <div className="relative w-full overflow-hidden rounded-[20px] bg-gray-50" style={{ aspectRatio: '2 / 1' }}>
              {!imageError && product.image ? (
                <Image src={product.image} alt={product.name} fill
                  className={`object-cover transition-transform duration-700 ${!isUnavailable ? 'group-hover:scale-[1.04]' : 'grayscale'}`}
                  onError={() => setImageError(true)}
                  sizes="(max-width: 768px) 100vw, 640px" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
                  <ChefHat size={40} className="text-emerald-200" />
                </div>
              )}

              {/* Badge — subtle white pill */}
              {!isUnavailable && (product.isBestseller || product.isChefSpecial) && (
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    {product.isBestseller
                      ? <><Star size={9} fill="currentColor" /> Bestseller</>
                      : <><ChefHat size={9} /> Chef&apos;s Special</>}
                  </span>
                </div>
              )}

              {isUnavailable && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <div className="flex items-center gap-1.5 bg-white/95 px-3 py-1.5 rounded-full shadow-sm">
                    <Clock size={12} className="text-gray-500" />
                    <span className="text-[11px] font-semibold text-gray-600">From {product.availableFrom}</span>
                  </div>
                </div>
              )}

              {/* Veg / non-veg dot */}
              <div className="absolute bottom-3 left-3">
                <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center border-2 bg-white shadow-sm ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
                </div>
              </div>
            </div>

            {/* Compact Add control — straddles the image bottom-right */}
            {!isUnavailable && (
              <div className="absolute right-3 -bottom-3.5" onClick={e => e.stopPropagation()}>
                {qty === 0 ? (
                  canAdd ? (
                    <button onClick={handleAdd}
                      className="h-8 px-3.5 flex items-center gap-1 bg-white text-emerald-600 font-bold text-[12px] rounded-lg border border-emerald-200 shadow-sm active:scale-95 transition-transform">
                      Add <ChevronDown size={13} strokeWidth={2.5} />
                    </button>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setShowModal(true); }}
                      className="h-8 px-3 flex items-center gap-1 bg-white text-gray-400 font-bold text-[10px] rounded-lg border border-gray-200 shadow-sm">
                      <ShoppingBag size={10} /> Bowl
                    </button>
                  )
                ) : (
                  <div className="h-8 px-3 flex items-center gap-3 bg-white rounded-lg border border-emerald-200 shadow-sm">
                    <button onClick={handleDecrease} className="text-emerald-600 active:scale-90 transition-transform"><Minus size={13} strokeWidth={3} /></button>
                    <span className="text-emerald-700 font-bold text-[13px] min-w-[12px] text-center">{qty}</span>
                    <button onClick={handleIncrease} className="text-emerald-600 active:scale-90 transition-transform"><Plus size={13} strokeWidth={3} /></button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details — borderless, refined, small premium type */}
          <div className="pt-5 px-0.5">
            {showMacros && product.protein > 0 && (
              <span className="inline-block text-[10px] text-gray-500 font-semibold tracking-wide mb-1">{product.protein}g protein</span>
            )}
            <h3 className="font-semibold text-gray-900 text-[16px] leading-snug tracking-tight line-clamp-1">{product.name}</h3>
            {product.description && (
              <p className="text-[12.5px] text-gray-400 leading-snug mt-0.5 line-clamp-1">{product.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-bold text-gray-900 text-[15px]">₹{displayPrice}</span>
              {isPlatinum && originalPrice !== displayPrice && (
                <span className="text-[11px] text-gray-400 line-through">₹{originalPrice}</span>
              )}
              {!isPlatinum && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-500 font-medium">
                  <Crown size={9} className="text-orange-400" /> ₹{platinumPrice} Platinum
                </span>
              )}
            </div>
          </div>
        </div>

        {showModal && <ProductModal product={product} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // ── LARGE variant — big hero-image card (premium showcase view) ──
  if (variant === 'large') {
    return (
      <>
        <div
          onClick={() => setShowModal(true)}
          className={`group bg-white rounded-[1.5rem] overflow-hidden cursor-pointer transition-all duration-300 ${!isUnavailable ? 'hover:-translate-y-1' : 'opacity-80'}`}
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}
        >
          {/* Big image */}
          <div className="relative w-full overflow-hidden bg-gray-50" style={{ aspectRatio: '16/10' }}>
            {!imageError && product.image ? (
              <Image src={product.image} alt={product.name} fill
                className={`object-cover transition-transform duration-700 ${!isUnavailable ? 'group-hover:scale-105' : 'grayscale'}`}
                onError={() => setImageError(true)}
                sizes="(max-width: 640px) 100vw, 50vw" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
                <ChefHat size={56} className="text-emerald-200" />
              </div>
            )}

            {/* soft bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {product.isBestseller && !isUnavailable && (
                <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                  <Star size={9} fill="currentColor" /> Bestseller
                </span>
              )}
              {product.isChefSpecial && !isUnavailable && (
                <span className="flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                  <ChefHat size={9} /> Chef&apos;s Pick
                </span>
              )}
            </div>

            {/* Veg / non-veg */}
            <div className="absolute top-3 right-3">
              <div className={`w-[19px] h-[19px] rounded-[5px] flex items-center justify-center border-2 bg-white shadow-sm ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
                <div className={`w-[9px] h-[9px] rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
              </div>
            </div>

            {isUnavailable && (
              <div className="absolute inset-0 bg-white/55 flex items-center justify-center">
                <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3.5 py-2 rounded-full shadow border border-gray-200">
                  <Clock size={13} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600">Available {product.availableFrom}</span>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-4 pt-3.5 pb-4">
            <h3 className="font-extrabold text-gray-900 text-[18px] leading-tight tracking-tight line-clamp-1">{product.name}</h3>
            {product.description && (
              <p className="text-[13px] text-gray-400 leading-snug mt-1 line-clamp-2">{product.description}</p>
            )}

            {showMacros && (product.calories > 0 || product.protein > 0) && (
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                {product.calories > 0 && (
                  <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-semibold border border-orange-100">{product.calories} kcal</span>
                )}
                {product.protein > 0 && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100">{product.protein}g protein</span>
                )}
                {product.carbs > 0 && (
                  <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-semibold border border-amber-100">{product.carbs}g carbs</span>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gray-100 my-3.5" />

            {/* Price + Add */}
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-gray-900 text-[19px]">₹{displayPrice}</span>
                  {isPlatinum && originalPrice !== displayPrice && (
                    <span className="text-sm text-gray-400 line-through">₹{originalPrice}</span>
                  )}
                  {isCoffee && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full leading-none">
                      <Coffee size={8} strokeWidth={2.5} /> 450–500ml
                    </span>
                  )}
                </div>
                {!isPlatinum && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Crown size={9} className="text-orange-400" />
                    <span className="text-[11px] text-orange-500 font-medium">₹{platinumPrice} with Platinum</span>
                  </div>
                )}
              </div>

              {!isUnavailable ? (
                qty === 0 ? (
                  canAdd ? (
                    <button onClick={handleAdd}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[13px] rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex-shrink-0">
                      <Plus size={15} strokeWidth={3} /> Add
                    </button>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setShowModal(true); }}
                      className="flex items-center gap-1 px-3 py-2.5 bg-gray-100 border border-gray-200 text-gray-400 font-bold text-[11px] rounded-2xl flex-shrink-0 cursor-not-allowed">
                      <ShoppingBag size={12} /> Bowl first
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-3 bg-emerald-600 rounded-2xl px-4 py-2.5 shadow-lg shadow-emerald-500/20 flex-shrink-0">
                    <button onClick={handleDecrease} className="text-white active:scale-90 transition-transform">
                      <Minus size={15} strokeWidth={3} />
                    </button>
                    <span className="text-white font-extrabold text-sm min-w-[16px] text-center">{qty}</span>
                    <button onClick={handleIncrease} className="text-white active:scale-90 transition-transform">
                      <Plus size={15} strokeWidth={3} />
                    </button>
                  </div>
                )
              ) : (
                <span className="text-[11px] text-gray-400 font-medium bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl flex-shrink-0">
                  From {product.availableFrom}
                </span>
              )}
            </div>
          </div>
        </div>

        {showModal && <ProductModal product={product} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return (
    <>
      {/* ── Mobile: borderless image-led tile (app style) ── */}
      <div
        onClick={() => setShowModal(true)}
        className={`sm:hidden group cursor-pointer ${isUnavailable ? 'opacity-75' : ''}`}
      >
        {/* Image area (controls that straddle live OUTSIDE the clipped image) */}
        <div className="relative">
          {/* Clipped rounded image */}
          <div className="relative w-full overflow-hidden rounded-[18px] bg-gray-50" style={{ aspectRatio: '1 / 1' }}>
            {!imageError && product.image ? (
              <Image src={product.image} alt={product.name} fill
                className={`object-cover ${isUnavailable ? 'grayscale' : ''}`}
                onError={() => setImageError(true)}
                sizes="50vw" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
                <ChefHat size={34} className="text-emerald-200" />
              </div>
            )}

            {/* Badge top-left */}
            {!isUnavailable && (product.isBestseller || product.isChefSpecial) && (
              <div className="absolute top-2 left-2">
                {product.isBestseller ? (
                  <span className="inline-flex items-center gap-1 bg-white text-emerald-600 text-[9px] font-extrabold px-2 py-1 rounded-full shadow-sm">
                    <Star size={8} fill="currentColor" /> Bestseller
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-white text-emerald-600 text-[9px] font-extrabold px-2 py-1 rounded-full shadow-sm">
                    <ChefHat size={8} /> Chef&apos;s Pick
                  </span>
                )}
              </div>
            )}

            {/* Unavailable overlay */}
            {isUnavailable && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <div className="flex items-center gap-1.5 bg-white/95 px-3 py-1.5 rounded-full shadow">
                  <Clock size={12} className="text-gray-500" />
                  <span className="text-[11px] font-semibold text-gray-600">From {product.availableFrom}</span>
                </div>
              </div>
            )}

            {/* Veg/non-veg dot (inside image, bottom-left) */}
            <div className="absolute bottom-2 left-2">
              <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center border-2 bg-white shadow-sm ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
                <div className={`w-2 h-2 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
              </div>
            </div>
          </div>

          {/* Add control — straddles the image bottom-right (outside the clip) */}
          {!isUnavailable && (
            <div className="absolute right-3 -bottom-4" onClick={e => e.stopPropagation()}>
              {qty === 0 ? (
                canAdd ? (
                  <button onClick={handleAdd}
                    className="w-[84px] h-9 flex items-center justify-center gap-1 bg-white text-emerald-600 font-extrabold text-[13px] rounded-xl border border-emerald-300 shadow-md active:scale-95 transition-transform">
                    Add <ChevronDown size={14} strokeWidth={2.75} />
                  </button>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setShowModal(true); }}
                    className="w-[84px] h-9 flex items-center justify-center gap-1 bg-white text-gray-400 font-bold text-[10px] rounded-xl border border-gray-200 shadow-md">
                    <ShoppingBag size={11} /> Bowl
                  </button>
                )
              ) : (
                <div className="w-[84px] h-9 flex items-center justify-between px-2.5 bg-white rounded-xl border border-emerald-300 shadow-md">
                  <button onClick={handleDecrease} className="text-emerald-600 active:scale-90 transition-transform">
                    <Minus size={14} strokeWidth={3} />
                  </button>
                  <span className="text-emerald-700 font-extrabold text-sm text-center">{qty}</span>
                  <button onClick={handleIncrease} className="text-emerald-600 active:scale-90 transition-transform">
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content — sits directly on page background, no card box */}
        <div className="pt-7 px-0.5">
          {/* Serving / macro chip */}
          {showMacros && (product.protein > 0 || product.calories > 0) ? (
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {product.protein > 0 && (
                <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-md font-semibold border border-gray-200">{product.protein}g protein</span>
              )}
            </div>
          ) : isCoffee ? (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-white px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                <Coffee size={9} strokeWidth={2.5} /> 450–500ml
              </span>
            </div>
          ) : null}

          {/* Name */}
          <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1">
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p className="text-[13px] text-gray-400 line-clamp-2 leading-snug mt-1">
              {product.description}
            </p>
          )}

          {/* Price */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="font-extrabold text-gray-900 text-[15px]">₹{displayPrice}</span>
            {isPlatinum && originalPrice !== displayPrice && (
              <span className="text-[11px] text-gray-400 line-through">₹{originalPrice}</span>
            )}
          </div>
          {!isPlatinum && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <Crown size={8} className="text-orange-400" />
              <span className="text-[10px] text-orange-500 font-medium">₹{platinumPrice} with Platinum</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop: borderless image-led tile (sm+) ── */}
      <div
        onClick={() => setShowModal(true)}
        className={`hidden sm:block group cursor-pointer ${isUnavailable ? 'opacity-75' : ''}`}
      >
        {/* Image area (controls that straddle live OUTSIDE the clipped image) */}
        <div className="relative">
          {/* Clipped rounded image */}
          <div className="relative w-full overflow-hidden rounded-[18px] bg-gray-50" style={{ aspectRatio: '1 / 1' }}>
            {!imageError && product.image ? (
              <Image src={product.image} alt={product.name} fill
                className={`object-cover transition-transform duration-500 ${!isUnavailable ? 'group-hover:scale-105' : 'grayscale'}`}
                onError={() => setImageError(true)}
                sizes="(max-width: 1024px) 33vw, 25vw" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
                <ChefHat size={40} className="text-emerald-200" />
              </div>
            )}

            {isUnavailable && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow">
                  <Clock size={12} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600">Available {product.availableFrom}</span>
                </div>
              </div>
            )}

            {/* Badge top-left */}
            {!isUnavailable && (product.isBestseller || product.isChefSpecial) && (
              <div className="absolute top-2.5 left-2.5">
                {product.isBestseller ? (
                  <span className="inline-flex items-center gap-1 bg-white text-emerald-600 text-[10px] font-extrabold px-2 py-1 rounded-full shadow-sm">
                    <Star size={9} fill="currentColor" /> Bestseller
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-white text-emerald-600 text-[10px] font-extrabold px-2 py-1 rounded-full shadow-sm">
                    <ChefHat size={9} /> Chef&apos;s Pick
                  </span>
                )}
              </div>
            )}

            {/* Veg/non-veg dot (inside image, bottom-left) */}
            <div className="absolute bottom-2.5 left-2.5">
              <div className={`w-[19px] h-[19px] rounded-[5px] flex items-center justify-center border-2 bg-white shadow-sm ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
                <div className={`w-[9px] h-[9px] rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
              </div>
            </div>
          </div>

          {/* Add control — straddles the image bottom-right (outside the clip) */}
          {!isUnavailable && (
            <div className="absolute right-3 -bottom-4" onClick={e => e.stopPropagation()}>
              {qty === 0 ? (
                canAdd ? (
                  <button onClick={handleAdd}
                    className="w-[92px] h-9 flex items-center justify-center gap-1 bg-white text-emerald-600 font-extrabold text-[13px] rounded-xl border border-emerald-300 shadow-md hover:bg-emerald-50 active:scale-95 transition-all">
                    Add <ChevronDown size={14} strokeWidth={2.75} />
                  </button>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setShowModal(true); }}
                    className="w-[92px] h-9 flex items-center justify-center gap-1 bg-white text-gray-400 font-bold text-[11px] rounded-xl border border-gray-200 shadow-md cursor-not-allowed">
                    <ShoppingBag size={11} /> Bowl
                  </button>
                )
              ) : (
                <div className="w-[92px] h-9 flex items-center justify-between px-3 bg-white rounded-xl border border-emerald-300 shadow-md">
                  <button onClick={handleDecrease} className="text-emerald-600 active:scale-90 transition-transform">
                    <Minus size={14} strokeWidth={3} />
                  </button>
                  <span className="text-emerald-700 font-extrabold text-sm text-center">{qty}</span>
                  <button onClick={handleIncrease} className="text-emerald-600 active:scale-90 transition-transform">
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info — sits directly on page background, no card box */}
        <div className="pt-7 px-0.5">
          {showMacros && product.protein > 0 ? (
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-md font-semibold border border-gray-200">{product.protein}g protein</span>
            </div>
          ) : isCoffee ? (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-white px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                <Coffee size={9} strokeWidth={2.5} /> 450–500ml
              </span>
            </div>
          ) : null}

          <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1">{product.name}</h3>

          {product.description && (
            <p className="text-[13px] text-gray-400 line-clamp-2 leading-snug mt-1">{product.description}</p>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            <span className="font-extrabold text-gray-900 text-[15px]">₹{displayPrice}</span>
            {isPlatinum && originalPrice !== displayPrice && (
              <span className="text-xs text-gray-400 line-through">₹{originalPrice}</span>
            )}
          </div>
          {!isPlatinum && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <Crown size={8} className="text-orange-400" />
              <span className="text-[10px] text-orange-500 font-medium">₹{platinumPrice} with Platinum</span>
            </div>
          )}
        </div>
      </div>

      {showModal && <ProductModal product={product} onClose={() => setShowModal(false)} />}
    </>
  );
}
