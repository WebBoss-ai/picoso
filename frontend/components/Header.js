'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  User,
  LogOut,
  Phone,
  Sparkles
} from 'lucide-react';
import AuthModal from './AuthModal';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);

  // theme state (optional)
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) setUser(JSON.parse(userData));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  const toggleTheme = () => setIsDark(!isDark);

  const borderColor = isDark ? '#3a2430' : '#f1d5e2';
  const textMain = isDark ? '#fff' : '#111';
  const textMuted = isDark ? '#c7a5b6' : '#6b7280';
  const pinkDeep = '#E91E63';
  const pinkPale = '#ffe4ef';

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(16px)',
          backgroundColor: isDark
            ? 'rgba(26,10,20,0.9)'
            : 'rgba(255,251,252,0.92)',
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0.9rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* BRAND */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '12px',
                  background:
                    'conic-gradient(from 140deg, #C41E73, #E91E63, #FF1493, #C41E73)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                T
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 600,
                    letterSpacing: '0.16em',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    color: textMain,
                  }}
                >
                  Picoso
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: textMuted,
                    marginTop: 2,
                  }}
                >
                  Nutrition, productised.
                </div>
              </div>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.7rem',
              fontSize: '0.85rem',
              color: textMuted,
              fontWeight: 500,
            }}
            className="hidden md:flex"
          >
            <Link href="/bowls">Menu</Link>
            <Link href="/custom">Custom</Link>

            {user && (
              <>
                <Link href="/orders">Orders</Link>
                <Link href="/profile">Profile</Link>
                {user.role === 'admin' && <Link href="/admin">Admin</Link>}
              </>
            )}
          </nav>

          {/* RIGHT SIDE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            {/* theme */}
            <button
              onClick={toggleTheme}
              style={{
                width: 34,
                height: 34,
                borderRadius: '12px',
                border: `1px solid ${borderColor}`,
                backgroundColor: isDark ? '#2A1520' : pinkPale,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isDark ? '☀' : '☾'}
            </button>

            {/* phone */}
            <a
              href="tel:8167080111"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                color: textMuted,
                textDecoration: 'none',
              }}
              className="hidden md:flex"
            >
              <Phone size={14} />
              8167080111
            </a>

            {/* AUTH */}
            {user ? (
              <button
                onClick={handleLogout}
                style={{
                  borderRadius: '12px',
                  padding: '0.55rem 1.3rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: 'transparent',
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={14} style={{ marginRight: 6 }} />
                Logout
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  padding: '0.55rem 1.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background:
                    'linear-gradient(135deg, #C41E73, #E91E63, #FF1493)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(196,30,115,0.3)',
                }}
              >
                <Sparkles size={14} />
                Sign in
              </button>
            )}

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden"
              style={{
                padding: 6,
                borderRadius: 10,
                border: `1px solid ${borderColor}`,
              }}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isOpen && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: `1px solid ${borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}
            className="md:hidden"
          >
            <Link href="/bowls">Menu</Link>
            <Link href="/custom">Custom</Link>

            {user && (
              <>
                <Link href="/orders">Orders</Link>
                <Link href="/profile">Profile</Link>
                {user.role === 'admin' && <Link href="/admin">Admin</Link>}
              </>
            )}

            {user ? (
              <button onClick={handleLogout}>Logout</button>
            ) : (
              <button onClick={() => setShowAuth(true)}>Login</button>
            )}
          </div>
        )}
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
