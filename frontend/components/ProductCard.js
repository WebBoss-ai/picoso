'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, Star, ChefHat, Crown, Clock } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const PLATINUM_DISCOUNT = 0.20;

export default function ProductCard({ product }) {
  const { items, addItem, updateQty } = useCart();
  const { isPlatinum } = useAuth();
  const [imageError, setImageError] = useState(false);

  const cartItem = items.find(i => i._id === product._id);
  const qty = cartItem?.quantity || 0;

  const isUnavailable = product.isAvailableNow === false;

  const originalPrice = product.price;
  const platinumPrice = Math.round(originalPrice * (1 - PLATINUM_DISCOUNT));
  const displayPrice = isPlatinum ? platinumPrice : originalPrice;

  const handleAdd = (e) => {
    e.stopPropagation();
    if (isUnavailable) return;
    addItem(product);
  };
  const handleIncrease = (e) => { e.stopPropagation(); updateQty(product._id, qty + 1); };
  const handleDecrease = (e) => { e.stopPropagation(); updateQty(product._id, qty - 1); };

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border border-surface-100 shadow-card transition-all duration-200 ${!isUnavailable ? 'hover:shadow-card-hover' : 'opacity-70'}`}>
      {/* Image */}
      <div className="relative w-full aspect-square overflow-hidden bg-surface-100">
        {!imageError && product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-300 ${isUnavailable ? 'grayscale' : 'hover:scale-105'}`}
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
              <span className="text-xs font-semibold text-gray-600">
                Available {product.availableFrom}
              </span>
            </div>
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isBestseller && !isUnavailable && (
            <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
              <Star size={9} fill="currentColor" /> Bestseller
            </span>
          )}
          {product.isChefSpecial && !isUnavailable && (
            <span className="flex items-center gap-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
              <ChefHat size={9} /> Chef's Pick
            </span>
          )}
        </div>

        {/* Veg indicator — top right (FSSAI style) */}
        <div className="absolute top-2 right-2">
          <div className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-sm flex items-center justify-center border-2 bg-white ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
            <div className={`w-2 h-2 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
          </div>
        </div>

        {/* Floating ADD / qty control — bottom right of image */}
        {!isUnavailable && (
          <div className="absolute bottom-2 right-2">
            {qty === 0 ? (
              <button
                onClick={handleAdd}
                className="flex items-center gap-0.5 px-3 py-1.5 bg-white border-2 border-brand-500 text-brand-600 font-bold text-xs rounded-xl shadow-md hover:bg-brand-50 active:scale-95 transition-all"
              >
                <Plus size={13} strokeWidth={3} /> ADD
              </button>
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

        {/* Macros */}
        {(product.calories > 0 || product.protein > 0) && (
          <div className="flex items-center gap-2 mb-2">
            {product.calories > 0 && (
              <span className="text-[11px] bg-surface-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">{product.calories} kcal</span>
            )}
            {product.protein > 0 && (
              <span className="text-[11px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md font-medium">{product.protein}g protein</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-end justify-between gap-1">
          <div>
            <span className="font-bold text-gray-900 text-sm">₹{displayPrice}</span>
            {isPlatinum && (
              <span className="text-xs text-gray-400 line-through ml-1.5">₹{originalPrice}</span>
            )}
            {!isPlatinum && (
              <div className="flex items-center gap-0.5 mt-0.5">
                <Crown size={9} className="text-orange-400" />
                <span className="text-[10px] text-orange-500 font-medium">₹{platinumPrice} with Platinum</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
