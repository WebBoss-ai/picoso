'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { clearStayUser, getStayUser } from '@/lib/stayStore';
import StayLoginModal from './StayLoginModal';

export function StayNav({ onLoginRequest }) {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getStayUser());
    sync();
    window.addEventListener('picoso-stay-auth', sync);
    return () => window.removeEventListener('picoso-stay-auth', sync);
  }, []);

  const openLogin = () => {
    if (onLoginRequest) onLoginRequest();
    else setShowLogin(true);
  };

  const logout = () => {
    clearStayUser();
    setUser(null);
    window.dispatchEvent(new CustomEvent('picoso-stay-auth'));
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 font-stay">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/stay" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-xl bg-turtle-600 text-white text-sm font-bold flex items-center justify-center tracking-tight">
              P
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-gray-900 tracking-tight">Picoso Stay</p>
              <p className="text-[10px] text-gray-400 hidden sm:block">Nature, discovered</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-600">
                  <User size={13} className="text-turtle-600" />
                  +91 {user.phone}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className="h-9 px-4 rounded-xl bg-turtle-600 hover:bg-turtle-700 text-white text-xs font-semibold transition-colors"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {showLogin && (
        <StayLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(u) => setUser(u)}
        />
      )}
    </>
  );
}

export function PayAtPropertyBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-turtle-50 border border-turtle-100 text-[11px] font-semibold text-turtle-700 tracking-wide ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-turtle-500" />
      Pay at property
    </span>
  );
}

export function StayShell({ children, className = '' }) {
  return (
    <div className={`min-h-screen bg-[#fafbfb] text-gray-900 font-stay ${className}`}>
      {/* subtle grid atmosphere — no shadows */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(#0f766e 1px, transparent 1px), linear-gradient(90deg, #0f766e 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
