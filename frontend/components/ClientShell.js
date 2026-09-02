'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import CartBar from './CartBar';
import AuthModal from './AuthModal';
import { useAuth } from '@/context/AuthContext';

export default function ClientShell({ children }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authIntent, setAuthIntent] = useState(null);
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Full-screen standalone pages that must render WITHOUT the global header/footer
  const STANDALONE_PREFIXES = ['/admin', '/admin2', '/subscription', '/friendship', '/redeem', '/ref', '/agent', '/delivery-partner', '/marketing', '/llm', '/wp-marketing', '/stay', '/stay-owner', '/stay-admin'];
  const isAdminPage = STANDALONE_PREFIXES.some(p => pathname?.startsWith(p));

  const handleAuthRequired = (intent) => {
    setAuthIntent(intent);
    setShowAuth(true);
  };

  // Allow any component (e.g. the menu combo billboard) to request auth globally
  useEffect(() => {
    const handler = (e) => handleAuthRequired(e?.detail ?? null);
    window.addEventListener('picoso:require-auth', handler);
    return () => window.removeEventListener('picoso:require-auth', handler);
  }, []);

  const handleAuthSuccess = (user) => {
    setShowAuth(false);
    if (authIntent === 'checkout') {
      router.push('/login-success');
    }
    setAuthIntent(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdminPage && (
        <Header onAuthClick={() => setShowAuth(true)} />
      )}

      <main className="flex-1">
        {children}
      </main>

      {!isAdminPage && <Footer />}

      {!isAdminPage && (
        <>
          <CartDrawer onAuthRequired={handleAuthRequired} />
          <CartBar onAuthRequired={handleAuthRequired} />
        </>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); setAuthIntent(null); }}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
