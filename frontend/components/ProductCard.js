'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, Star, Flame, Zap, Crown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const PLATINUM_DISCOUNT = 0.20;

export default function ProductCard({ product, onAuthRequired }) {
  const { items, addItem, updateQty } = useCart();
  const { isPlatinum } = useAuth();
  const [imageError, setImageError] = useState(false);

  const cartItem = items.find(i => i._id === product._id);
  const qty = cartItem?.quantity || 0;

  const originalPrice = product.price;
  const platinumPrice = Math.round(originalPrice * (1 - PLATINUM_DISCOUNT));

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(product);
  };

  const handleIncrease = (e) => {
    e.stopPropagation();
    updateQty(product._id, qty + 1);
  };

  const handleDecrease = (e) => {
    e.stopPropagation();
    updateQty(product._id, qty - 1);
  };

  return (
    <div className="card group hover:shadow-card-hover transition-all duration-200">
      {/* Image */}
      <div className="relative w-full aspect-[4/3] rounded-t-2xl overflow-hidden bg-surface-100">
        {!imageError && product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <Flame size={40} className="text-brand-300" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {product.isBestseller && (
            <span className="tag-chip bg-amber-400 text-amber-900">
              <Star size={10} fill="currentColor" /> Bestseller
            </span>
          )}
          {product.isChefSpecial && (
            <span className="tag-chip bg-brand-500 text-white">
              <Zap size={10} /> Chef's Special
            </span>
          )}
        </div>

        {/* Veg badge */}
        <div className="absolute top-2 right-2">
          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 bg-white ${product.isVeg ? 'border-green-600' : 'border-red-500'}`}>
            <div className={`w-2 h-2 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{product.description}</p>
        )}

        {/* Macros */}
        <div className="flex items-center gap-3 mb-3">
          {product.calories > 0 && (
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{product.calories}</span> kcal
            </span>
          )}
          {product.protein > 0 && (
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{product.protein}g</span> protein
            </span>
          )}
        </div>

        {/* Price + Add */}
        <div className="flex items-center justify-between">
          <div>
            {isPlatinum ? (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-900 text-base">₹{platinumPrice}</span>
                  <span className="text-xs text-gray-400 line-through">₹{originalPrice}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Crown size={10} className="text-platinum-500" />
                  <span className="text-xs text-platinum-500 font-medium">Platinum price</span>
                </div>
              </div>
            ) : (
              <div>
                <span className="font-bold text-gray-900 text-base">₹{originalPrice}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Crown size={10} className="text-gray-400" />
                  <span className="text-xs text-gray-400">₹{platinumPrice} with Platinum</span>
                </div>
              </div>
            )}
          </div>

          <div>
            {qty === 0 ? (
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-4 py-2 border-2 border-brand-500 text-brand-600 font-semibold text-sm rounded-xl hover:bg-brand-50 transition-all duration-150 active:scale-95"
              >
                <Plus size={15} strokeWidth={2.5} /> ADD
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-brand-500 rounded-xl px-2 py-1.5">
                <button onClick={handleDecrease} className="text-white hover:text-brand-100 transition-colors">
                  <Minus size={15} strokeWidth={2.5} />
                </button>
                <span className="text-white font-bold text-sm min-w-[16px] text-center">{qty}</span>
                <button onClick={handleIncrease} className="text-white hover:text-brand-100 transition-colors">
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
