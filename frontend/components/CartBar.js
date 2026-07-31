'use client';
import { usePathname } from 'next/navigation';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const PLATINUM_DISCOUNT = 0.20;
const HIDE_ON = ['/checkout', '/order-success'];

export default function CartBar({ onAuthRequired }) {
  const { items, cartTotal, cartCount, setIsOpen } = useCart();
  const { isPlatinum, isLoggedIn } = useAuth();
  const pathname = usePathname();

  const shouldHide = HIDE_ON.some(p => pathname?.startsWith(p));

  if (cartCount === 0 || shouldHide) return null;

  const displayTotal = isPlatinum
    ? Math.round(cartTotal * (1 - PLATINUM_DISCOUNT))
    : cartTotal;

  const handleClick = () => {
    console.log('%c[CartFlow] CartBar View Cart clicked', 'color:#0B5C3A;font-weight:bold', {
      isLoggedIn,
      cartCount,
      pathname,
    });
    if (!isLoggedIn) {
      console.log('%c[CartFlow] CartBar → auth required (not logged in)', 'color:#b45309;font-weight:bold');
      onAuthRequired?.('checkout');
      return;
    }
    console.log('%c[CartFlow] CartBar → setIsOpen(true)', 'color:#0B5C3A;font-weight:bold');
    setIsOpen(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none md:hidden">
      <button
        onClick={handleClick}
        className="pointer-events-auto w-full flex items-center justify-between gap-3 bg-brand-500 text-white px-4 py-3.5 rounded-2xl shadow-premium active:scale-[0.98] transition-transform"
      >
        {/* Left: count badge + label */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={15} />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-none opacity-80">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </p>
            <p className="text-sm font-bold leading-tight mt-0.5">View Cart</p>
          </div>
        </div>

        {/* Right: price + arrow */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">₹{displayTotal}</span>
          <ArrowRight size={16} />
        </div>
      </button>
    </div>
  );
}
