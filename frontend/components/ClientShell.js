'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import AuthModal from './AuthModal';
import { useAuth } from '@/context/AuthContext';

export default function ClientShell({ children }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authIntent, setAuthIntent] = useState(null);
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdminPage = pathname?.startsWith('/admin');

  const handleAuthRequired = (intent) => {
    setAuthIntent(intent);
    setShowAuth(true);
  };

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

      <CartDrawer onAuthRequired={handleAuthRequired} />

      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); setAuthIntent(null); }}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
