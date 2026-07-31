'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Phone, Heart, Clock, Leaf, MapPin, Navigation, X, Loader2 } from 'lucide-react';

const C = {
  bg: '#F7F8F2',
  ink: '#0B5C3A',
  inkDeep: '#084A2F',
  mint: '#DCE9DC',
  mintBtn: '#E2EADC',
  cloud: '#E4EFE4',
  footer: '#06784A',
  soft: '#9BC4A8',
};

function MotionLines({ className = '', color = C.ink }) {
  return (
    <svg className={className} width="16" height="12" viewBox="0 0 18 14" fill="none" aria-hidden>
      <path d="M2 3h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M1 7h12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M2 11h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PicosoLogo() {
  return (
    <div className="relative inline-flex flex-col items-center">
      <span
        className="leading-none font-bold tracking-tight"
        style={{
          color: C.ink,
          fontFamily: 'var(--font-closed-display), Georgia, serif',
          fontSize: 'clamp(1.75rem, 6vw, 2.5rem)',
        }}
      >
        Picos
        <span className="relative">
          o
          <svg
            className="absolute -top-1.5 left-1/2 -translate-x-1/2"
            width="12"
            height="10"
            viewBox="0 0 14 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M7 11C7 11 2 7.5 2 4.2C2 2.4 3.4 1 5.2 1C6.2 1 7 1.5 7 1.5C7 1.5 7.8 1 8.8 1C10.6 1 12 2.4 12 4.2C12 7.5 7 11 7 11Z"
              fill={C.ink}
            />
          </svg>
        </span>
      </span>
      <p
        className="mt-1 font-bold tracking-[0.2em] uppercase"
        style={{ color: C.ink, fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}
      >
        Eat Good. Feel Good.
      </p>
    </div>
  );
}

function ClosedSign() {
  return (
    <div className="relative mx-auto w-[min(52vw,200px)]" style={{ transformOrigin: 'top center' }}>
      <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 z-10">
        <div className="w-3 h-3 rounded-full mx-auto" style={{ background: C.ink }} />
      </div>
      <svg className="absolute left-1/2 -top-0.5 -translate-x-1/2" width="100" height="22" viewBox="0 0 120 28" aria-hidden>
        <line x1="60" y1="2" x2="28" y2="26" stroke={C.ink} strokeWidth="2" />
        <line x1="60" y1="2" x2="92" y2="26" stroke={C.ink} strokeWidth="2" />
      </svg>
      <div
        className="relative mt-5 rounded-2xl px-4 pt-3 pb-3 text-center"
        style={{
          background: `linear-gradient(160deg, ${C.inkDeep} 0%, ${C.ink} 55%, #0E6B44 100%)`,
          boxShadow: '0 10px 22px rgba(8,74,47,0.22)',
        }}
      >
        <p className="text-white/90 text-[10px] font-semibold tracking-[0.2em]">WE&apos;RE</p>
        <p className="text-white font-black leading-none tracking-wide mt-0.5" style={{ fontSize: 'clamp(1.5rem, 7vw, 2rem)' }}>
          CLOSED
        </p>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <MotionLines color="#fff" />
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide"
            style={{ background: '#fff', color: C.ink }}
          >
            FOR NOW
          </span>
          <MotionLines color="#fff" className="scale-x-[-1]" />
        </div>
      </div>
    </div>
  );
}

function BowlMascot() {
  return (
    <div className="relative mx-auto w-[min(48vw,170px)] h-[min(40vw,140px)]">
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-2.5 rounded-full opacity-25"
        style={{ background: C.ink }}
      />
      <svg className="absolute left-0 top-[45%] z-0 w-[20%] h-[30%]" viewBox="0 0 40 50" aria-hidden>
        <path d="M28 4 C10 14 6 28 10 42" stroke={C.ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="10" cy="44" r="5" fill="#fff" stroke={C.ink} strokeWidth="2" />
      </svg>
      <svg className="absolute right-0 top-[30%] z-20 w-[24%] h-[34%]" viewBox="0 0 48 56" aria-hidden>
        <path d="M8 40 C18 28 28 18 38 10" stroke={C.ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="40" cy="8" r="5.5" fill="#fff" stroke={C.ink} strokeWidth="2" />
      </svg>
      <div
        className="absolute left-1/2 top-[36%] -translate-x-1/2 w-[78%] h-[60%] rounded-b-[999px] rounded-t-[14px] z-10 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, #1A7A4C 0%, ${C.ink} 45%, ${C.inkDeep} 100%)`,
          boxShadow: 'inset 0 6px 0 rgba(255,255,255,0.12)',
        }}
      >
        <div className="absolute left-1/2 top-[36%] -translate-x-1/2 flex flex-col items-center scale-90">
          <div className="flex gap-4 mb-0.5">
            <svg width="12" height="7" viewBox="0 0 14 8"><path d="M1 6 Q7 0 13 6" stroke="#083822" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            <svg width="12" height="7" viewBox="0 0 14 8"><path d="M1 6 Q7 0 13 6" stroke="#083822" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
          </div>
          <svg width="14" height="8" viewBox="0 0 16 10"><path d="M2 2 Q8 10 14 2" stroke="#083822" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </div>
      </div>
      <div className="absolute left-1/2 top-[16%] -translate-x-1/2 w-[72%] h-[28%] z-20 pointer-events-none">
        <div className="absolute inset-x-1 bottom-0 h-5 rounded-full" style={{ background: '#F5E6C8' }} />
        <div className="absolute left-[12%] top-[20%] w-[18%] aspect-square rounded-full" style={{ background: '#C4783A' }} />
        <div className="absolute left-[32%] top-0 w-[20%] aspect-square rounded-full" style={{ background: '#D4924A' }} />
        <div className="absolute right-[28%] top-[10%] w-[16%] aspect-square rounded-full" style={{ background: '#7CB342' }} />
        <div className="absolute right-[10%] top-[25%] w-[14%] aspect-square rounded-full" style={{ background: '#F2C94C' }} />
        <div className="absolute left-[48%] top-[30%] w-[10%] aspect-square rounded-full" style={{ background: '#B23A4A' }} />
      </div>
    </div>
  );
}

function CappuccinoCup() {
  return (
    <div className="relative w-14 h-[4.5rem] sm:w-[72px] sm:h-24 flex-shrink-0">
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[80%] h-[28%] rounded-full z-20"
        style={{ background: 'linear-gradient(180deg,#FFF9F0,#F0E2D0)' }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[18%] w-[72%] h-[72%] rounded-b-[12px] rounded-t-[5px] z-10"
        style={{ background: `linear-gradient(160deg, #1A7A4C, ${C.inkDeep})` }}
      >
        <div className="absolute top-2 inset-x-0 text-center">
          <span className="text-white text-[8px] font-semibold" style={{ fontFamily: 'var(--font-closed-display), Georgia, serif' }}>
            Picoso
          </span>
        </div>
      </div>
    </div>
  );
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data?.address || {};
    const road = a.road || a.pedestrian || a.residential || '';
    const houseNo = a.house_number || '';
    const suburb = a.suburb || a.neighbourhood || a.village || a.county || '';
    const city = a.city || a.town || a.state_district || a.state || '';
    const pincode = a.postcode || '';
    const address =
      [houseNo, road].filter(Boolean).join(', ') ||
      (data.display_name || '').split(',').slice(0, 2).join(',').trim();
    return { address, area: suburb, city, pincode };
  } catch {
    return { address: '', area: '', city: '', pincode: '' };
  }
}

function getCurrentPositionAsync(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
      ...options,
    });
  });
}

function LocationNeededModal({ open, loading, error, onAllow, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(8, 40, 28, 0.55)' }}
      onClick={() => { if (!loading) onClose?.(); }}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #0B5C3A, #22c55e)' }} />
        {!loading && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center z-10"
          >
            <X size={14} className="text-gray-500" />
          </button>
        )}
        <div className="px-7 pt-8 pb-3 flex justify-center" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #fff 100%)' }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: '#E8F5E9' }}>
            <MapPin size={36} style={{ color: '#0B5C3A' }} strokeWidth={1.8} />
          </div>
        </div>
        <div className="px-7 pb-7 text-center">
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight mb-1.5">
            We need your location to serve you!
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            Share your pin so we can reach you with your free Tall Cappuccino when we reopen nearby.
          </p>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">{error}</p>
          )}
          <button
            type="button"
            onClick={onAllow}
            disabled={loading}
            className="w-full rounded-2xl py-3.5 font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #0B5C3A, #159A5A)' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            {loading ? 'Getting your pin…' : 'Allow location access'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-viewport closed store screen — not tied to cart drawer width/animation.
 */
export default function StoreClosedPoster({
  notifyPhone,
  setNotifyPhone,
  notifyDone,
  notifySend,
  onNotify,
  placeholderPhone = '',
  onExploreMenu,
}) {
  const [showForm, setShowForm] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (notifyDone) {
      setShowForm(false);
      setShowLocModal(false);
    }
  }, [notifyDone]);

  useEffect(() => {
    if (!showForm) return;
    if (placeholderPhone && !notifyPhone) setNotifyPhone(placeholderPhone);
  }, [showForm, placeholderPhone, notifyPhone, setNotifyPhone]);

  const captureLocation = async () => {
    setLocLoading(true);
    setLocError('');
    try {
      const pos = await getCurrentPositionAsync();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const geo = await reverseGeocode(lat, lng);
      setShowLocModal(false);
      setLocLoading(false);
      return { lat, lng, ...geo };
    } catch (err) {
      setLocError(
        err?.code === 1
          ? 'Location access denied. Please allow location and try again.'
          : 'Unable to detect your location. Please try again.'
      );
      setLocLoading(false);
      return null;
    }
  };

  const finishNotify = async (phone, location) => {
    await onNotify(phone, location || {});
  };

  const submit = async (e) => {
    e?.preventDefault();
    const phone = (notifyPhone || placeholderPhone || '').trim().replace(/\D/g, '').slice(-10);
    if (!phone || phone.length < 10) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    if (phone !== notifyPhone) setNotifyPhone(phone);
    setPendingPhone(phone);

    setLocLoading(true);
    try {
      const pos = await getCurrentPositionAsync({ timeout: 5000 });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const geo = await reverseGeocode(lat, lng);
      setLocLoading(false);
      await finishNotify(phone, { lat, lng, ...geo });
    } catch {
      setLocLoading(false);
      setShowLocModal(true);
    }
  };

  const handleAllowLocation = async () => {
    const location = await captureLocation();
    if (location) await finishNotify(pendingPhone || notifyPhone, location);
  };

  if (!mounted) return null;

  const ui = (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        background: C.bg,
        fontFamily: 'var(--font-closed-sans), system-ui, sans-serif',
        width: '100vw',
        height: '100dvh',
        maxHeight: '100dvh',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Store is closed"
    >
      <LocationNeededModal
        open={showLocModal}
        loading={locLoading}
        error={locError}
        onAllow={handleAllowLocation}
        onClose={() => { if (!locLoading) setShowLocModal(false); }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="relative mx-auto w-full max-w-md min-h-full flex flex-col px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {/* soft clouds — static, no animation */}
          <div className="absolute w-20 h-8 -left-2 top-12 rounded-full opacity-70 pointer-events-none" style={{ background: C.cloud }} />
          <div className="absolute w-14 h-6 right-1 top-24 rounded-full opacity-60 pointer-events-none" style={{ background: C.cloud }} />

          <div className="relative z-10 flex justify-center pt-2 mb-3 sm:mb-4">
            <PicosoLogo />
          </div>

          <div className="relative z-10 flex flex-col items-center mb-3 sm:mb-4">
            <ClosedSign />
            <div className="-mt-0.5">
              <BowlMascot />
            </div>
          </div>

          <div className="relative z-10 text-center mb-3 sm:mb-4 px-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <MotionLines color={C.ink} />
              <h1 className="font-black leading-none" style={{ color: C.ink, fontSize: 'clamp(1.5rem, 6vw, 2rem)' }}>
                Oops!
              </h1>
              <MotionLines color={C.ink} className="scale-x-[-1]" />
            </div>
            <p className="font-semibold leading-snug max-w-[18rem] mx-auto" style={{ color: C.ink, fontSize: 'clamp(0.8rem, 3.2vw, 0.9rem)' }}>
              Due to high demand we are unable to serve you at this moment.
            </p>
          </div>

          <div
            className="relative z-10 flex items-center gap-2.5 sm:gap-3 rounded-2xl px-2.5 sm:px-3 py-2.5 sm:py-3 mb-3 sm:mb-4"
            style={{ border: `2px dashed ${C.ink}`, background: 'rgba(255,255,255,0.45)' }}
          >
            <CappuccinoCup />
            <div className="flex-1 min-w-0 text-center">
              <p className="text-[11px] sm:text-xs font-medium" style={{ color: C.ink }}>We&apos;ll send you a</p>
              <div className="flex items-center justify-center gap-1 my-0.5">
                <MotionLines color={C.ink} />
                <span className="font-black leading-none tracking-wide" style={{ color: C.ink, fontSize: 'clamp(1.25rem, 5vw, 1.6rem)' }}>
                  FREE
                </span>
                <span style={{ transform: 'scaleX(-1)', display: 'inline-flex' }}><MotionLines color={C.ink} /></span>
              </div>
              <p
                className="leading-tight"
                style={{
                  color: C.ink,
                  fontFamily: 'var(--font-closed-script), Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 'clamp(1rem, 4.5vw, 1.25rem)',
                }}
              >
                Tall Cappuccino
              </p>
              <p className="text-[11px] sm:text-xs font-medium mt-0.5" style={{ color: C.ink }}>
                with your next order. <span style={{ color: '#C23B4A' }}>❤</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-0.5 mb-4">
            {[
              { Icon: Heart, label: 'Made with Real Ingredients' },
              { Icon: Clock, label: 'Delivered in 20 Minutes' },
              { Icon: Leaf, label: 'Clean. Fresh. Delicious.' },
            ].map(({ Icon, label }, i) => (
              <div
                key={label}
                className="flex flex-col items-center text-center px-0.5"
                style={{ borderLeft: i > 0 ? `1px solid ${C.soft}` : undefined }}
              >
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1"
                  style={{ background: C.mint, color: C.ink }}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </div>
                <p className="text-[9px] sm:text-[10px] font-semibold leading-tight" style={{ color: C.ink }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Footer CTA — grows to fill remaining */}
          <div
            className="relative z-10 -mx-4 sm:-mx-5 mt-auto px-4 sm:px-5 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
            style={{
              background: C.footer,
              borderTopLeftRadius: '40% 22px',
              borderTopRightRadius: '40% 22px',
            }}
          >
            <p className="text-center text-white text-sm font-semibold mb-3">
              We can&apos;t wait to serve you better!
            </p>

            {notifyDone ? (
              <div
                className="w-full rounded-full py-3.5 px-4 flex items-center justify-center gap-2 font-bold text-sm"
                style={{ background: C.mintBtn, color: C.ink }}
              >
                <CheckCircle2 size={16} strokeWidth={2.5} />
                Redirecting to menu…
              </div>
            ) : showForm ? (
              <form onSubmit={submit} className="space-y-2.5">
                <div className="relative" style={shake ? { animation: 'scpShake 0.4s ease' } : undefined}>
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: `${C.ink}88` }} />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoFocus
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value)}
                    placeholder={placeholderPhone || 'Your phone number'}
                    className="w-full rounded-full pl-10 pr-4 py-3 text-sm font-semibold outline-none"
                    style={{ background: C.bg, color: C.ink }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={notifySend || locLoading}
                  className="w-full rounded-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: C.mintBtn, color: C.ink }}
                >
                  {(notifySend || locLoading) && (
                    <span
                      className="w-4 h-4 rounded-full animate-spin"
                      style={{ border: '2px solid rgba(11,92,58,0.25)', borderTopColor: C.ink }}
                    />
                  )}
                  {notifySend || locLoading ? 'Saving…' : "Notify me when we're back"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full text-center text-[11px] font-medium text-white/70 py-1"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full rounded-full py-3.5 font-bold text-sm"
                style={{ background: C.mintBtn, color: C.ink }}
              >
                Notify me when we&apos;re back
              </button>
            )}

            {onExploreMenu && !notifyDone && (
              <button
                type="button"
                onClick={onExploreMenu}
                className="w-full mt-2 text-center text-[12px] font-semibold text-white/80 py-1.5"
              >
                Explore menu instead
              </button>
            )}

            <p className="mt-3 text-center text-[10px] font-semibold tracking-[0.12em] text-white/90 uppercase">
              ❤ Thank you for your love &amp; support
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
