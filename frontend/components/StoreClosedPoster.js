'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, CheckCircle2, Phone, Heart, Clock, Leaf, MapPin, Navigation, X, Loader2 } from 'lucide-react';

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
    <svg className={className} width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
      <path d="M2 3h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M1 7h12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M2 11h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Cloud({ className, style }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className || ''}`}
      style={{ background: C.cloud, ...style }}
      aria-hidden
    />
  );
}

function PicosoLogo() {
  return (
    <div className="relative inline-flex flex-col items-center">
      <div className="relative">
        <span
          className="text-[42px] leading-none font-bold tracking-tight"
          style={{
            color: C.ink,
            fontFamily: 'var(--font-closed-display), Georgia, serif',
          }}
        >
          Picos<span className="relative">
            o
            <svg
              className="absolute -top-2 left-1/2 -translate-x-1/2"
              width="14"
              height="12"
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
      </div>
      <p
        className="mt-1 text-[10px] font-bold tracking-[0.22em] uppercase"
        style={{ color: C.ink }}
      >
        Eat Good. Feel Good.
      </p>
    </div>
  );
}

function ClosedSign() {
  return (
    <div className="relative mx-auto w-[210px] scp-swing" style={{ transformOrigin: 'top center' }}>
      {/* peg + strings */}
      <div className="absolute left-1/2 -top-3 -translate-x-1/2 z-10">
        <div className="w-3.5 h-3.5 rounded-full mx-auto" style={{ background: C.ink }} />
      </div>
      <svg className="absolute left-1/2 -top-1 -translate-x-1/2" width="120" height="28" viewBox="0 0 120 28" aria-hidden>
        <line x1="60" y1="2" x2="28" y2="26" stroke={C.ink} strokeWidth="2" />
        <line x1="60" y1="2" x2="92" y2="26" stroke={C.ink} strokeWidth="2" />
      </svg>

      <div
        className="relative mt-6 rounded-2xl px-5 pt-4 pb-3.5 text-center shadow-lg"
        style={{
          background: `linear-gradient(160deg, ${C.inkDeep} 0%, ${C.ink} 55%, #0E6B44 100%)`,
          boxShadow: '0 14px 28px rgba(8,74,47,0.28)',
        }}
      >
        <p className="text-white/90 text-[11px] font-semibold tracking-[0.2em]">WE&apos;RE</p>
        <p className="text-white text-[34px] font-black leading-none tracking-wide mt-0.5">CLOSED</p>
        <div className="mt-2.5 flex items-center justify-center gap-2">
          <MotionLines color="#fff" />
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide"
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
    <div className="relative mx-auto w-[200px] h-[168px] scp-bob">
      {/* shadow */}
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-3 rounded-full blur-sm opacity-30"
        style={{ background: C.ink }}
      />

      {/* left arm (hip) */}
      <svg className="absolute left-2 top-[78px] z-0" width="40" height="50" viewBox="0 0 40 50" aria-hidden>
        <path d="M28 4 C10 14 6 28 10 42" stroke={C.ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="10" cy="44" r="5" fill="#fff" stroke={C.ink} strokeWidth="2" />
      </svg>

      {/* right arm (wave) */}
      <svg className="absolute right-0 top-[52px] z-20 scp-wave" width="48" height="56" viewBox="0 0 48 56" aria-hidden>
        <path d="M8 40 C18 28 28 18 38 10" stroke={C.ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="40" cy="8" r="5.5" fill="#fff" stroke={C.ink} strokeWidth="2" />
      </svg>

      {/* bowl body */}
      <div
        className="absolute left-1/2 top-[58px] -translate-x-1/2 w-[150px] h-[100px] rounded-b-[75px] rounded-t-[18px] z-10 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, #1A7A4C 0%, ${C.ink} 45%, ${C.inkDeep} 100%)`,
          boxShadow: 'inset 0 8px 0 rgba(255,255,255,0.12), 0 8px 18px rgba(8,74,47,0.25)',
        }}
      >
        {/* face */}
        <div className="absolute left-1/2 top-[38px] -translate-x-1/2 flex flex-col items-center">
          <div className="flex gap-5 mb-1">
            <svg width="14" height="8" viewBox="0 0 14 8"><path d="M1 6 Q7 0 13 6" stroke="#083822" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
            <svg width="14" height="8" viewBox="0 0 14 8"><path d="M1 6 Q7 0 13 6" stroke="#083822" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
          </div>
          <svg width="16" height="10" viewBox="0 0 16 10"><path d="M2 2 Q8 10 14 2" stroke="#083822" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </div>
        <p
          className="absolute bottom-3 inset-x-0 text-center text-white/90 text-[11px] font-semibold"
          style={{ fontFamily: 'var(--font-closed-display), Georgia, serif' }}
        >
          Picoso
        </p>
      </div>

      {/* food mound */}
      <div className="absolute left-1/2 top-[28px] -translate-x-1/2 w-[138px] h-[48px] z-20 pointer-events-none">
        <div className="absolute inset-x-2 bottom-0 h-8 rounded-full" style={{ background: '#F5E6C8' }} />
        <div className="absolute left-4 top-2 w-7 h-7 rounded-full" style={{ background: '#C4783A' }} />
        <div className="absolute left-12 top-0 w-8 h-8 rounded-full" style={{ background: '#D4924A' }} />
        <div className="absolute right-10 top-1 w-6 h-6 rounded-full" style={{ background: '#7CB342' }} />
        <div className="absolute right-4 top-3 w-5 h-5 rounded-full" style={{ background: '#F2C94C' }} />
        <div className="absolute left-[58px] top-3 w-4 h-4 rounded-full" style={{ background: '#B23A4A' }} />
        <div className="absolute left-8 bottom-1 w-3 h-3 rounded-full bg-white/90" />
        <div className="absolute right-14 bottom-0 w-2.5 h-2.5 rounded-full bg-white/90" />
      </div>
    </div>
  );
}

function CappuccinoCup() {
  return (
    <div className="relative w-[72px] h-[96px] flex-shrink-0">
      <MotionLines className="absolute -left-4 top-8 opacity-70" color={C.ink} />
      {/* foam */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[58px] h-[28px] rounded-full z-20"
        style={{ background: 'linear-gradient(180deg,#FFF9F0,#F0E2D0)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
      >
        <div className="absolute inset-2 rounded-full opacity-40" style={{ background: 'radial-gradient(circle at 40% 40%, #C4A484, transparent 60%)' }} />
      </div>
      {/* cup */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[18px] w-[52px] h-[70px] rounded-b-[14px] rounded-t-[6px] z-10 overflow-hidden"
        style={{ background: `linear-gradient(160deg, #1A7A4C, ${C.inkDeep})` }}
      >
        <div className="absolute top-3 inset-x-0 text-center">
          <span
            className="text-white text-[9px] font-semibold"
            style={{ fontFamily: 'var(--font-closed-display), Georgia, serif' }}
          >
            Picoso
          </span>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-5 opacity-30" style={{ background: 'linear-gradient(transparent, #000)' }} />
      </div>
      {/* sleeve / band */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[48px] w-[56px] h-[18px] rounded-sm z-20"
        style={{ background: 'rgba(255,255,255,0.18)' }}
      />
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
      style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(8, 40, 28, 0.55)' }}
      onClick={() => { if (!loading) onClose?.(); }}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #0B5C3A, #22c55e)' }} />

        {!loading && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center z-10"
          >
            <X size={14} className="text-gray-500" />
          </button>
        )}

        <div className="px-7 pt-8 pb-3 flex justify-center" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #fff 100%)' }}>
          <div className="relative w-28 h-28 rounded-full flex items-center justify-center" style={{ background: '#E8F5E9' }}>
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#22c55e' }} />
            <MapPin size={42} className="relative z-10" style={{ color: '#0B5C3A' }} strokeWidth={1.8} />
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
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={onAllow}
            disabled={loading}
            className="w-full rounded-2xl py-3.5 font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/25"
            style={{ background: 'linear-gradient(135deg, #0B5C3A, #159A5A)' }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Navigation size={16} />
            )}
            {loading ? 'Getting your pin…' : 'Allow location access'}
          </button>

          <p className="mt-3 text-[11px] text-gray-400">
            Used only to deliver your free coffee bounty.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StoreClosedPoster({
  onBack,
  notifyPhone,
  setNotifyPhone,
  notifyDone,
  notifySend,
  onNotify,
  placeholderPhone = '',
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
    console.log('[StoreClosed] coded UI mounted');
    return () => console.log('[StoreClosed] unmounted');
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
      const location = { lat, lng, ...geo };
      console.log('[StoreClosed] location captured', location);
      setShowLocModal(false);
      setLocLoading(false);
      return location;
    } catch (err) {
      console.warn('[StoreClosed] location failed', err);
      const msg =
        err?.code === 1
          ? 'Location access denied. Please allow location in your browser settings and try again.'
          : 'Unable to detect your location. Please try again.';
      setLocError(msg);
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
    console.log('[StoreClosed] submit notify', phone);
    if (!phone || phone.length < 10) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    if (phone !== notifyPhone) setNotifyPhone(phone);
    setPendingPhone(phone);

    // Try silently first — if already granted, no modal
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
      console.log('[StoreClosed] need location permission → modal');
      setShowLocModal(true);
    }
  };

  const handleAllowLocation = async () => {
    const location = await captureLocation();
    if (location) {
      await finishNotify(pendingPhone || notifyPhone, location);
    }
  };

  if (!mounted) return null;

  const ui = (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: C.bg, fontFamily: 'var(--font-closed-sans), system-ui, sans-serif' }}
      role="dialog"
      aria-modal="true"
      aria-label="Store is closed"
      data-testid="store-closed-coded"
    >
      <LocationNeededModal
        open={showLocModal}
        loading={locLoading}
        error={locError}
        onAllow={handleAllowLocation}
        onClose={() => { if (!locLoading) setShowLocModal(false); }}
      />

      <button
        type="button"
        onClick={() => {
          console.log('[StoreClosed] back');
          onBack?.();
        }}
        className="absolute top-3 left-3 z-40 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-md border"
        style={{ color: C.ink, borderColor: `${C.ink}22` }}
      >
        <ChevronLeft size={14} strokeWidth={2.5} />
        Back
      </button>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="relative mx-auto w-full max-w-[430px] px-5 pt-10 pb-0 min-h-full flex flex-col">
          <Cloud className="w-24 h-10 -left-4 top-16 opacity-80" />
          <Cloud className="w-16 h-8 right-2 top-28 opacity-70" />
          <Cloud className="w-20 h-9 left-6 top-[210px] opacity-60" />
          <Cloud className="w-14 h-7 right-8 top-[250px] opacity-70" />

          <span className="absolute right-10 top-20 text-lg opacity-40" style={{ color: C.ink }} aria-hidden>✦</span>
          <span className="absolute left-8 top-[300px] text-sm opacity-30" style={{ color: C.ink }} aria-hidden>✦</span>

          <div className="relative z-10 flex justify-center mb-5">
            <PicosoLogo />
          </div>

          <div className="relative z-10 flex flex-col items-center mb-5">
            <ClosedSign />
            <div className="-mt-1">
              <BowlMascot />
            </div>
          </div>

          <div className="relative z-10 text-center mb-5 px-2">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <MotionLines color={C.ink} />
              <h1 className="text-[32px] font-black leading-none" style={{ color: C.ink }}>
                Oops!
              </h1>
              <MotionLines color={C.ink} className="scale-x-[-1]" />
            </div>
            <p className="text-[14px] font-semibold leading-snug max-w-[280px] mx-auto" style={{ color: C.ink }}>
              Due to high demand we are unable to serve you at this moment.
            </p>
          </div>

          <div
            className="relative z-10 flex items-center gap-3 rounded-2xl px-3 py-3.5 mb-5"
            style={{ border: `2px dashed ${C.ink}`, background: 'rgba(255,255,255,0.45)' }}
          >
            <CappuccinoCup />
            <div className="flex-1 min-w-0 text-center pr-1">
              <p className="text-[12px] font-medium" style={{ color: C.ink }}>We&apos;ll send you a</p>
              <div className="flex items-center justify-center gap-1.5 my-0.5">
                <span className="inline-flex opacity-80" style={{ transform: 'scale(0.75)' }}>
                  <MotionLines color={C.ink} />
                </span>
                <span className="text-[26px] font-black leading-none tracking-wide" style={{ color: C.ink }}>
                  FREE
                </span>
                <span className="inline-flex opacity-80" style={{ transform: 'scale(0.75) scaleX(-1)' }}>
                  <MotionLines color={C.ink} />
                </span>
              </div>
              <p
                className="text-[20px] leading-tight"
                style={{
                  color: C.ink,
                  fontFamily: 'var(--font-closed-script), Georgia, serif',
                  fontStyle: 'italic',
                }}
              >
                Tall Cappuccino
              </p>
              <p className="text-[12px] font-medium mt-0.5" style={{ color: C.ink }}>
                with your next order. <span style={{ color: '#C23B4A' }}>❤</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-1 mb-6">
            {[
              { Icon: Heart, label: 'Made with Real Ingredients' },
              { Icon: Clock, label: 'Delivered in 20 Minutes' },
              { Icon: Leaf, label: 'Clean. Fresh. Delicious.' },
            ].map(({ Icon, label }, i) => (
              <div
                key={label}
                className="flex flex-col items-center text-center px-1"
                style={{ borderLeft: i > 0 ? `1px solid ${C.soft}` : undefined }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5"
                  style={{ background: C.mint, color: C.ink }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <p className="text-[10px] font-semibold leading-tight" style={{ color: C.ink }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div
            className="relative z-10 -mx-5 mt-auto px-5 pt-8 pb-6"
            style={{
              background: `
                radial-gradient(80% 60% at 0% 100%, rgba(0,60,35,0.35) 0%, transparent 55%),
                radial-gradient(80% 60% at 100% 100%, rgba(0,60,35,0.35) 0%, transparent 55%),
                ${C.footer}
              `,
              borderTopLeftRadius: '50% 28px',
              borderTopRightRadius: '50% 28px',
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
                You&apos;re on the list — we&apos;ll ping you!
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
                    className="w-full rounded-full pl-10 pr-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-white/50"
                    style={{ background: C.bg, color: C.ink }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={notifySend || locLoading}
                  className="w-full rounded-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] transition-transform"
                  style={{ background: C.mintBtn, color: C.ink }}
                >
                  {(notifySend || locLoading) ? (
                    <span
                      className="w-4 h-4 rounded-full animate-spin"
                      style={{ border: '2px solid rgba(11,92,58,0.25)', borderTopColor: C.ink }}
                    />
                  ) : null}
                  {notifySend || locLoading ? 'Saving…' : "Notify me when we're back"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full text-center text-[11px] font-medium text-white/70 hover:text-white py-1"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  console.log('[StoreClosed] open notify form');
                  setShowForm(true);
                }}
                className="w-full rounded-full py-3.5 font-bold text-sm active:scale-[0.99] transition-transform shadow-sm"
                style={{ background: C.mintBtn, color: C.ink }}
              >
                Notify me when we&apos;re back
              </button>
            )}

            <p className="mt-4 text-center text-[10px] font-semibold tracking-[0.14em] text-white/90 uppercase">
              ❤ Thank you for your love &amp; support
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scpBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes scpWave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(14deg); }
        }
        @keyframes scpSwing {
          0%, 100% { transform: rotate(-1.2deg); }
          50% { transform: rotate(1.2deg); }
        }
        .scp-bob { animation: scpBob 3s ease-in-out infinite; }
        .scp-wave { transform-origin: 8px 40px; animation: scpWave 1.4s ease-in-out infinite; }
        .scp-swing { animation: scpSwing 3.5s ease-in-out infinite; }
      `}</style>
    </div>
  );

  return createPortal(ui, document.body);
}
