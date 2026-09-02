'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, MapPin, Star, Users, Check, ChevronRight,
  CalendarDays, KeyRound, Copy, CheckCircle2, Wifi, Flame, Car, Loader2,
} from 'lucide-react';
import { stay } from '@/lib/api';
import { formatINR, nightsBetween } from '@/lib/stayUtils';
import { useAuth } from '@/context/AuthContext';
import { StayNav, StayShell, PayAtPropertyBadge } from '@/components/stay/StayChrome';
import StayLoginModal from '@/components/stay/StayLoginModal';

export default function StayDetailPage() {
  const { destination, id } = useParams();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomsCount, setRoomsCount] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guests, setGuests] = useState(2);
  const [showLogin, setShowLogin] = useState(false);
  const [bookingStep, setBookingStep] = useState(null);
  const [booking, setBooking] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    stay.getProperty(id)
      .then((res) => {
        setProperty(res.data);
        setSelectedRoom(res.data.rooms?.[0]?.roomId || null);
      })
      .catch(() => router.replace(`/stay/${destination}`))
      .finally(() => setLoading(false));
  }, [id, destination, router]);

  useEffect(() => {
    if (user?.name) setGuestName(user.name);
    if (user?.email) setGuestEmail(user.email);
  }, [user]);

  const room = useMemo(() => property?.rooms?.find((r) => r.roomId === selectedRoom), [property, selectedRoom]);
  const nights = nightsBetween(checkIn, checkOut);
  const total = (room?.price || 0) * nights * roomsCount;

  const startBooking = () => {
    setError('');
    if (!room) return setError('Select a room type');
    if (!checkIn || !checkOut) return setError('Choose check-in and check-out dates');
    if (nights < 1) return setError('Check-out must be after check-in');
    if (roomsCount > room.available) return setError(`Only ${room.available} rooms left`);
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setBookingStep('form');
  };

  const confirmBooking = async () => {
    setError('');
    if (!guestName.trim()) return setError('Enter guest name');
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await stay.createBooking({
        propertyId: property.id,
        roomId: room.roomId,
        checkIn,
        checkOut,
        roomsCount,
        guests,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
      });
      setBooking(res.data.booking);
      setProperty((p) => {
        if (!p) return p;
        return {
          ...p,
          rooms: p.rooms.map((r) =>
            r.roomId === room.roomId ? { ...r, available: Math.max(0, r.available - roomsCount) } : r
          ),
        };
      });
      setBookingStep('success');
    } catch (e) {
      setError(e.response?.data?.error || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyOtp = async () => {
    if (!booking?.checkInOtp) return;
    await navigator.clipboard.writeText(booking.checkInOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading || !property) {
    return (
      <StayShell>
        <StayNav />
        <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 text-turtle-600 animate-spin" /></div>
      </StayShell>
    );
  }

  return (
    <StayShell>
      <StayNav onLoginRequest={() => setShowLogin(true)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 lg:pb-16">
        <div className="pt-5 sm:pt-7 mb-5">
          <Link href={`/stay/${destination}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-turtle-700">
            <ArrowLeft size={14} /> Back to {destination}
          </Link>
        </div>

        <div className="grid lg:grid-cols-5 gap-3 mb-8">
          <div className="lg:col-span-3 relative aspect-[16/11] rounded-[1.5rem] overflow-hidden border border-gray-200 bg-gray-100">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${property.images?.[imgIdx]})` }} />
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-3">
            {(property.images || []).slice(0, 3).map((src, i) => (
              <button key={src} type="button" onClick={() => setImgIdx(i)} className={`relative aspect-[16/10] lg:aspect-auto lg:min-h-[110px] rounded-2xl overflow-hidden border ${imgIdx === i ? 'border-turtle-500' : 'border-gray-200'}`}>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <PayAtPropertyBadge />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{property.category}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">{property.name}</h1>
              <p className="text-sm text-gray-500 mt-2">{property.tagline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1"><MapPin size={14} className="text-turtle-600" /> {property.location}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-gray-800"><Star size={14} className="text-turtle-500 fill-turtle-500" /> {property.rating}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-turtle-200 bg-turtle-50/70 p-5">
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Pay at property</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Book for free — no online payment. Settle the full amount at check-in. You&apos;ll receive a 4-digit OTP to share with the property.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">About this stay</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Room types</h3>
              <div className="space-y-3">
                {property.rooms.map((r) => (
                  <button key={r.roomId} type="button" onClick={() => setSelectedRoom(r.roomId)} className={`w-full text-left rounded-2xl border p-4 transition-colors ${selectedRoom === r.roomId ? 'border-turtle-500 bg-turtle-50/40' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{formatINR(r.price)}</p>
                        <p className={`text-[11px] mt-2 font-medium ${r.available <= 2 ? 'text-amber-600' : 'text-turtle-700'}`}>{r.available} left</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-20 rounded-[1.5rem] border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-2xl font-semibold text-gray-900">{formatINR(room?.price || 0)}</p>
                <span className="text-xs text-gray-400">per night</span>
              </div>
              <PayAtPropertyBadge className="mb-5" />

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Check-in"><input type="date" value={checkIn} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setCheckIn(e.target.value)} className="stay-input" /></Field>
                  <Field label="Check-out"><input type="date" value={checkOut} min={checkIn || new Date().toISOString().slice(0, 10)} onChange={(e) => setCheckOut(e.target.value)} className="stay-input" /></Field>
                </div>
                <Field label="Rooms">
                  <select value={roomsCount} onChange={(e) => setRoomsCount(Number(e.target.value))} className="stay-input">
                    {Array.from({ length: Math.max(1, room?.available || 1) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Guests">
                  <input type="number" min={1} max={room?.maxGuests || 4} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="stay-input" />
                </Field>
              </div>

              {nights > 0 && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-1.5 text-sm">
                  <Row label={`${formatINR(room.price)} × ${nights} night(s) × ${roomsCount}`} value={formatINR(total)} />
                  <Row label="Pay now" value="₹0" accent />
                  <div className="pt-1.5 border-t border-gray-200 flex justify-between font-semibold text-gray-900">
                    <span>Pay at property</span><span>{formatINR(total)}</span>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

              <button type="button" onClick={startBooking} className="mt-4 w-full h-12 rounded-2xl bg-turtle-600 hover:bg-turtle-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
                Book this stay <ChevronRight size={16} />
              </button>
              <p className="text-[11px] text-center text-gray-400 mt-3">Login required · View bookings in profile</p>
            </div>
          </div>
        </div>
      </main>

      {bookingStep === 'form' && (
        <Modal onClose={() => setBookingStep(null)} title="Guest details">
          <div className="space-y-3">
            <Field label="Full name"><input className="stay-input" value={guestName} onChange={(e) => setGuestName(e.target.value)} autoFocus /></Field>
            <Field label="Email (optional)"><input className="stay-input" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} /></Field>
            <Field label="Phone"><input className="stay-input bg-gray-50" value={`+91 ${user?.phone || ''}`} disabled /></Field>
          </div>
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setBookingStep(null)} className="flex-1 h-11 rounded-2xl border border-gray-200 text-sm">Cancel</button>
            <button type="button" onClick={confirmBooking} disabled={submitting} className="flex-[1.4] h-11 rounded-2xl bg-turtle-600 text-white text-sm font-semibold disabled:opacity-50">
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </Modal>
      )}

      {bookingStep === 'success' && booking && (
        <Modal onClose={() => setBookingStep(null)} title="">
          <div className="text-center">
            <CheckCircle2 className="w-7 h-7 text-turtle-600 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-gray-900">Booking confirmed</h2>
            <p className="text-sm text-gray-500 mt-2">Pay {formatINR(booking.amount)} at the property</p>
            <div className="mt-6 rounded-2xl border border-turtle-200 bg-turtle-50/80 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-turtle-700 flex items-center justify-center gap-1.5"><KeyRound size={13} /> Check-in OTP</p>
              <p className="text-4xl font-semibold tracking-[0.35em] text-turtle-800 mt-2 pl-[0.35em]">{booking.checkInOtp}</p>
              <button type="button" onClick={copyOtp} className="mt-3 text-xs font-medium text-turtle-700 inline-flex items-center gap-1">{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy OTP'}</button>
            </div>
            <Link href="/stay/profile" className="mt-6 block w-full h-11 leading-[2.75rem] rounded-2xl bg-turtle-600 text-white text-sm font-semibold">View in my profile</Link>
          </div>
        </Modal>
      )}

      {showLogin && (
        <StayLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => {
            setShowLogin(false);
            if (checkIn && checkOut && room) setBookingStep('form');
          }}
        />
      )}

      <style jsx global>{`.stay-input { width:100%; height:2.5rem; padding:0 0.75rem; border-radius:0.75rem; border:1px solid #e5e7eb; font-size:0.8125rem; } .stay-input:focus { border-color:#14b8a6; }`}</style>
    </StayShell>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl p-6 sm:p-7">
        {title && <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="text-[11px] font-medium text-gray-500 mb-1 block">{label}</span>{children}</label>;
}

function Row({ label, value, accent }) {
  return <div className="flex justify-between gap-3"><span className="text-gray-500">{label}</span><span className={accent ? 'font-semibold text-turtle-700' : 'text-gray-800'}>{value}</span></div>;
}

function AmenityIcon({ name }) {
  const n = name.toLowerCase();
  if (n.includes('wifi')) return <Wifi size={13} className="text-turtle-600" />;
  if (n.includes('fire') || n.includes('heat')) return <Flame size={13} className="text-turtle-600" />;
  if (n.includes('park')) return <Car size={13} className="text-turtle-600" />;
  return <Check size={13} className="text-turtle-600" />;
}
