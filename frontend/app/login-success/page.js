'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShoppingBag, ArrowRight, Utensils } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function LoginSuccessPage() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const { cartCount } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) router.replace('/');
  }, [isLoggedIn, authLoading, router]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-white flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md w-full animate-slide-up">
        {/* Success icon */}
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mx-auto animate-pulse-green">
            <CheckCircle2 size={48} className="text-brand-500" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 mb-8">
          You're now signed in to Picoso. What would you like to do?
        </p>

        <div className="flex flex-col gap-3">
          {cartCount > 0 ? (
            <Link
              href="/checkout"
              className="btn-primary w-full text-base py-3.5 justify-center"
            >
              <ShoppingBag size={18} />
              Continue to Checkout ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              href="/checkout"
              className="btn-primary w-full text-base py-3.5 justify-center"
            >
              <ShoppingBag size={18} />
              Go to Checkout
              <ArrowRight size={16} />
            </Link>
          )}

          <Link
            href="/menu"
            className="btn-secondary w-full text-base py-3.5 justify-center"
          >
            <Utensils size={18} />
            Browse Menu
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Your cart items are saved and ready for checkout
        </p>
      </div>
    </div>
  );
}
