'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Plus, Minus, ShoppingBag, ArrowRight, Trash2, Crown, Flame } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const PLATINUM_DISCOUNT = 0.20;

export default function CartDrawer({ onAuthRequired }) {
  const { items, removeItem, updateQty, cartTotal, cartCount, isOpen, setIsOpen } = useCart();
  const { isPlatinum, isLoggedIn } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const platinumTotal = Math.round(cartTotal * (1 - PLATINUM_DISCOUNT));
  const savings = cartTotal - platinumTotal;

  const handleCheckout = () => {
    if (!isLoggedIn) {
      setIsOpen(false);
      onAuthRequired?.('checkout');
      return;
    }
    setIsOpen(false);
  };

  return (
    <>
      <div className="drawer-overlay" onClick={() => setIsOpen(false)} />
      <div className="drawer">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} className="text-brand-600" />
            <span className="font-bold text-gray-900">Your Cart</span>
            {cartCount > 0 && (
              <span className="w-5 h-5 bg-brand-100 text-brand-700 text-xs font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
              <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center">
                <ShoppingBag size={32} className="text-gray-300" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700 mb-1">Your cart is empty</p>
                <p className="text-sm text-gray-400">Add items from the menu to get started</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="btn-primary mt-2">
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {items.map(item => {
                const itemPlatinumPrice = Math.round(item.price * (1 - PLATINUM_DISCOUNT));
                const displayPrice = isPlatinum ? itemPlatinumPrice : item.price;

                return (
                  <div key={item._id} className="flex gap-3 p-3 rounded-xl bg-surface-50">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-100 flex-shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} width={64} height={64} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Flame size={20} className="text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-sm font-bold text-gray-900">₹{displayPrice}</span>
                        {isPlatinum && (
                          <span className="text-xs text-gray-400 line-through">₹{item.price}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-surface-200 px-1 py-0.5">
                          <button onClick={() => updateQty(item._id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-brand-600 hover:text-brand-800 transition-colors">
                            {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                          </button>
                          <span className="text-sm font-bold text-gray-900 min-w-[16px] text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item._id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-brand-600 hover:text-brand-800 transition-colors">
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-gray-900">₹{displayPrice * item.quantity}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-surface-100 p-4 space-y-3">
            {/* Platinum savings */}
            {isPlatinum ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl">
                <Crown size={14} className="text-platinum-500 flex-shrink-0" />
                <p className="text-xs text-orange-700 font-medium">
                  You save <span className="font-bold">₹{savings}</span> with Platinum!
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl">
                <Crown size={14} className="text-platinum-500 flex-shrink-0" />
                <p className="text-xs text-orange-700">
                  Get <span className="font-bold">Platinum (₹99/mo)</span> — save ₹{savings} on this order!
                </p>
              </div>
            )}

            {/* Price breakdown */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>₹{isPlatinum ? platinumTotal : cartTotal}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery fee</span>
                <span className="text-brand-600 font-medium">FREE</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-surface-100">
                <span>Total</span>
                <span>₹{isPlatinum ? platinumTotal : cartTotal}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={handleCheckout}
              className="btn-primary w-full text-base"
            >
              Proceed to Checkout <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
