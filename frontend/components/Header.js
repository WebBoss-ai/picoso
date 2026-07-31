'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, Menu, X, MapPin, Activity, Home as HomeIcon, UtensilsCrossed } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function Header({ onAuthClick }) {
  const { cartCount, setIsOpen: openCart } = useCart();
  const { user, isLoggedIn, isAdmin } = useAuth();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [location,     setLocation]     = useState(null);
  const [locLoading,   setLocLoading]   = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Location fetch — calls Nominatim directly from the browser (no proxy dependency)
  useEffect(() => {
    const cached = sessionStorage.getItem('picoso_location');
    if (cached) { try { setLocation(JSON.parse(cached)); return; } catch {} }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { 'Accept': 'application/json', 'User-Agent': 'picoso-app' } }
          );
          if (!res.ok) throw new Error('geocode failed');
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village
                    || data.address?.state_district || null;
          const area = data.address?.neighbourhood || data.address?.suburb
                    || data.address?.road || null;
          if (area || city) {
            const loc = { area, city };
            setLocation(loc);
            sessionStorage.setItem('picoso_location', JSON.stringify(loc));
          }
        } catch {
          // Location is decorative — silently swallow all errors
        }
        setLocLoading(false);
      },
      () => setLocLoading(false),      // user denied or timed out
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, []);

  const isActive = (p) => pathname === p;

  /* ── Green-mode: mobile homepage before scroll ─────────────────────── */
  const isHome   = pathname === '/';
  const greenNav = isHome && !scrolled;  // mobile-only green state

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-200
        ${isHome && !scrolled
          ? 'hidden md:block md:bg-white md:border-b md:border-surface-100'
          : `block bg-white border-b border-surface-100 ${scrolled ? 'shadow-card' : ''}`
        }
      `}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">

          {/* ── Logo ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                ${greenNav ? 'bg-white/20 md:gradient-brand' : 'gradient-brand'}`}>
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className={`font-bold text-lg tracking-tight transition-colors
                ${greenNav ? 'text-white md:text-gray-900' : 'text-gray-900'}`}>
                Picoso
              </span>
            </Link>

            {/* Location pill — desktop only */}
            {(location || locLoading) && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs text-gray-500 max-w-[160px]">
                <MapPin size={11} className="text-brand-500 flex-shrink-0" />
                {locLoading
                  ? <span className="w-3 h-3 border border-gray-300 border-t-brand-400 rounded-full animate-spin" />
                  : <span className="truncate font-medium text-gray-700">{location?.area || location?.city || 'Detecting...'}</span>
                }
              </div>
            )}
          </div>

          {/* ── Desktop Nav — Menu (core browse) ──────────────────── */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/"     className={`nav-link ${isActive('/')     ? 'text-brand-600 font-semibold' : ''}`}>Home</Link>
            <Link href="/menu" className={`nav-link ${isActive('/menu') ? 'text-brand-600 font-semibold' : ''}`}>Menu</Link>
          </nav>

          {/* ── Right Actions — exactly two options: Fitness Circle + Profile ── */}
          <div className="flex items-center gap-1.5">

            {/* Cart */}
            <button onClick={() => openCart(true)}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors
                ${greenNav ? 'hover:bg-white/15 md:hover:bg-surface-50' : 'hover:bg-surface-50'}`}
              aria-label="Cart">
              <ShoppingCart size={19} className={greenNav ? 'text-white md:text-gray-700' : 'text-gray-700'} />
              {cartCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none
                  ${greenNav ? 'bg-amber-400 text-gray-900 md:bg-brand-500 md:text-white' : 'bg-brand-500'}`}>
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {isLoggedIn ? (
              <>
                {/* Option 1 — Fitness Circle (desktop) */}
                <Link href="/my-circle"
                  className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border
                    ${isActive('/my-circle')
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}>
                  <Activity size={15} className={isActive('/my-circle') ? 'text-white' : 'text-emerald-500'} />
                  <span>Fitness Circle</span>
                </Link>

                {/* Option 2 — Profile (desktop) */}
                <Link href="/profile"
                  className={`hidden md:flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl transition-colors
                    ${isActive('/profile') ? 'bg-brand-50' : 'hover:bg-surface-50'}`}>
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-700">
                      {user?.name ? user.name[0].toUpperCase() : user?.phone?.slice(-2)}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold max-w-[90px] truncate ${isActive('/profile') ? 'text-brand-700' : 'text-gray-700'}`}>
                    {user?.name?.split(' ')[0] || 'Profile'}
                  </span>
                </Link>
              </>
            ) : (
              <button onClick={onAuthClick}
                className={`text-sm px-4 py-2 rounded-xl font-semibold transition-colors
                  ${greenNav
                    ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30 md:bg-brand-500 md:text-white md:border-transparent md:hover:bg-brand-600'
                    : 'btn-primary'
                  }`}>
                Sign In
              </button>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-colors
                ${greenNav ? 'hover:bg-white/15' : 'hover:bg-surface-50'}`}>
              {menuOpen
                ? <X    size={20} className={greenNav ? 'text-white md:text-gray-700' : 'text-gray-700'} />
                : <Menu size={20} className={greenNav ? 'text-white md:text-gray-700' : 'text-gray-700'} />
              }
            </button>
          </div>
        </div>

        {/* ── Mobile slide-down nav ──────────────────────────────── */}
        {menuOpen && (
          <div className={`md:hidden border-t py-3 space-y-1.5 animate-fade-in
            ${greenNav ? 'border-white/20 bg-[#0f3d1a]' : 'border-surface-100 bg-white'}`}>
            {location && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs">
                <MapPin size={12} className={greenNav ? 'text-green-400' : 'text-brand-500'} />
                <span className={greenNav ? 'text-green-200' : 'text-gray-500'}>
                  Delivering to <strong className={greenNav ? 'text-white' : 'text-gray-700'}>{location.area || location.city}</strong>
                </span>
              </div>
            )}

            {/* Core browse */}
            {[
              { href: '/',     label: 'Home', Icon: HomeIcon },
              { href: '/menu', label: 'Menu', Icon: UtensilsCrossed },
            ].map(({ href, label, Icon }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${greenNav ? 'text-white/90 hover:bg-white/10' : 'text-gray-700 hover:bg-surface-50'}
                  ${isActive(href) ? (greenNav ? '!text-white !bg-white/15' : 'text-brand-600 bg-brand-50') : ''}`}>
                <Icon size={16} className={greenNav ? '' : 'text-gray-400'} />
                {label}
              </Link>
            ))}

            {isLoggedIn && (
              <>
                <div className={`h-px mx-3 my-1 ${greenNav ? 'bg-white/15' : 'bg-surface-100'}`} />

                {/* Option 1 — Fitness Circle */}
                <Link href="/my-circle" onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors
                    ${isActive('/my-circle')
                      ? 'bg-emerald-500 text-white'
                      : greenNav ? 'text-emerald-200 bg-white/5 hover:bg-white/10' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}>
                  <Activity size={17} className={isActive('/my-circle') ? 'text-white' : 'text-emerald-500'} />
                  Fitness Circle
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
                </Link>

                {/* Option 2 — Profile */}
                <Link href="/profile" onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors
                    ${isActive('/profile')
                      ? 'bg-brand-500 text-white'
                      : greenNav ? 'text-white bg-white/5 hover:bg-white/10' : 'text-gray-800 bg-surface-50 hover:bg-surface-100'}`}>
                  <User size={17} className={isActive('/profile') ? 'text-white' : 'text-gray-400'} />
                  Profile
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
