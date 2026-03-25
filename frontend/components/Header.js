'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, User, LogOut, ChevronDown, Menu, X, MapPin, Settings, Package, Crown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function Header({ onAuthClick }) {
  const { cartCount, setIsOpen: openCart } = useCart();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const userMenuRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch location once on mount
  useEffect(() => {
    const cached = sessionStorage.getItem('picoso_location');
    if (cached) { try { setLocation(JSON.parse(cached)); return; } catch {} }

    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`/api/location?lat=${coords.latitude}&lng=${coords.longitude}`);
          const data = await res.json();
          if (data.area || data.city) {
            const loc = { area: data.area, city: data.city };
            setLocation(loc);
            sessionStorage.setItem('picoso_location', JSON.stringify(loc));
          }
        } catch {}
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { timeout: 6000 }
    );
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  const isActive = (path) => pathname === path;

  return (
    <header className={`sticky top-0 z-30 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-card border-b border-surface-100' : 'border-b border-surface-100'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-bold text-gray-900 text-lg tracking-tight">Picoso</span>
            </Link>

            {/* Location pill */}
            {(location || locLoading) && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-50 border border-surface-200 rounded-xl text-xs text-gray-500 max-w-[160px]">
                <MapPin size={11} className="text-brand-500 flex-shrink-0" />
                {locLoading ? (
                  <span className="w-3 h-3 border border-gray-300 border-t-brand-400 rounded-full animate-spin" />
                ) : (
                  <span className="truncate font-medium text-gray-700">
                    {location?.area || location?.city || 'Detecting…'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className={`nav-link ${isActive('/') ? 'text-brand-600 font-semibold' : ''}`}>Home</Link>
            <Link href="/menu" className={`nav-link ${isActive('/menu') ? 'text-brand-600 font-semibold' : ''}`}>Menu</Link>
            {isAdmin && (
              <Link href="/admin" className={`nav-link ${isActive('/admin') ? 'text-brand-600 font-semibold' : ''}`}>Admin</Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <button
              onClick={() => openCart(true)}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-surface-50 transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart size={20} className="text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* User */}
            {isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-50 transition-colors"
                >
                  <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center">
                    <span className="text-brand-700 text-xs font-bold">
                      {user?.name ? user.name[0].toUpperCase() : user?.phone?.slice(-2)}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[80px] truncate">
                    {user?.name || 'Account'}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 card shadow-modal py-1.5 animate-fade-in">
                    <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 text-sm text-gray-700 transition-colors">
                      <User size={15} className="text-gray-400" />
                      <span>My Profile</span>
                    </Link>
                    <Link href="/profile?tab=orders" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 text-sm text-gray-700 transition-colors">
                      <Package size={15} className="text-gray-400" />
                      <span>My Orders</span>
                    </Link>
                    <Link href="/profile?tab=platinum" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 text-sm text-gray-700 transition-colors">
                      <Crown size={15} className="text-platinum-500" />
                      <span>Platinum Card</span>
                    </Link>
                    {isAdmin && (
                      <>
                        <div className="h-px bg-surface-100 my-1.5 mx-4" />
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 text-sm text-gray-700 transition-colors">
                          <Settings size={15} className="text-gray-400" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </>
                    )}
                    <div className="h-px bg-surface-100 my-1.5 mx-4" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-sm text-red-600 transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={onAuthClick} className="btn-primary text-sm px-4 py-2">
                Sign In
              </button>
            )}

            {/* Mobile Menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-surface-50 transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-surface-100 py-3 space-y-1 animate-fade-in">
            {/* Mobile location */}
            {location && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                <MapPin size={12} className="text-brand-500" />
                <span>Delivering to <strong className="text-gray-700">{location.area || location.city}</strong></span>
              </div>
            )}
            <Link href="/" onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-xl hover:bg-surface-50 text-sm font-medium text-gray-700">
              Home
            </Link>
            <Link href="/menu" onClick={() => setMenuOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-xl hover:bg-surface-50 text-sm font-medium text-gray-700">
              Menu
            </Link>
            {isLoggedIn && (
              <>
                <Link href="/profile" onClick={() => setMenuOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-xl hover:bg-surface-50 text-sm font-medium text-gray-700">
                  Profile
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)}
                    className="flex items-center px-3 py-2.5 rounded-xl hover:bg-surface-50 text-sm font-medium text-gray-700">
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
