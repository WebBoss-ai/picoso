'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, MapPin, Star, Users, Check, ChevronRight,
  CalendarDays, KeyRound, Copy, CheckCircle2, Wifi, Flame, Car,
} from 'lucide-react';
import {
  createBooking,
  formatINR,
  getProperty,
  getStayUser,
  nightsBetween,
} from '@/lib/stayStore';
import { StayNav, StayShell, PayAtPropertyBadge } from '@/components/stay/StayChrome';
import StayLoginModal from '@/components/stay/StayLoginModal';

export default function StayDetailPage() {
  const { destination, id } = useParams();
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomsCount, setRoomsCount] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guests, setGuests] = useState(2);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [bookingStep, setBookingStep] = useState(null); // null | form | success
  const [booking, setBooking] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = getProperty(id);
    if (!p) {
      router.replace(`/stay/${destination}`);
      return;
    }
    setProperty(p);
    setSelectedRoom(p.rooms?.[0]?.id || null);
    setUser(getStayUser());
  }, [id, destination, router]);

  const room = useMemo(
    () => property?.rooms?.find((r) => r.id === selectedRoom),
    [property, selectedRoom]
  );

  const nights = nightsBetween(checkIn, checkOut);
  const total = (room?.price || 0) * nights * roomsCount;

  const startBooking = () => {
    setError('');
    if (!room) return setError('Select a room type');
    if (!checkIn || !checkOut) return setError('Choose check-in and check-out dates');
    if (nights < 1) return setError('Check-out must be after check-in');
    if (roomsCount > room.available) return setError(`Only ${room.available} rooms left`);

    if (!getStayUser()) {
      setShowLogin(true);
      return;
    }
    setUser(getStayUser());
    setBookingStep('form');
  };

  const confirmBooking = () => {
    setError('');
    if (!guestName.trim()) return setError('Enter guest name');
    const u = getStayUser();
    if (!u) {
      setShowLogin(true);
      return;
    }

    const bk = createBooking({
      propertyId: property.id,
      roomId: room.id,
      checkIn,
      checkOut,
      roomsCount,
      guests,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      phone: u.phone,
    });
    setBooking(bk);
    setProperty(getProperty(property.id));
    setBookingStep('success');
  };

  const copyOtp = async () => {
    if (!booking?.checkInOtp) return;
    await navigator.clipboard.writeText(booking.checkInOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!property) {
    return (
      <StayShell>
        <StayNav />
        <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-500 text-sm">Loading stay…</div>
      </StayShell>
    );
  }

  return (
    <StayShell>
      <StayNav
        onLoginRequest={() => setShowLogin(true)}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-28 lg:pb-16">
        <div className="pt-5 sm:pt-7 mb-5">
          <Link
            href={`/stay/${destination}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-turtle-700"
          >
            <ArrowLeft size={14} /> Back to {destination}
          </Link>
        </div>

        {/* Gallery */}
        <div className="grid lg:grid-cols-5 gap-3 mb-8">
          <div className="lg:col-span-3 relative aspect-[16/11] rounded-[1.5rem] overflow-hidden border border-gray-200 bg-gray-100">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${property.images[imgIdx]})` }}
            />
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-3">
            {property.images.slice(0, 3).map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setImgIdx(i)}
                className={`relative aspect-[16/10] lg:aspect-auto lg:min-h-[110px] rounded-2xl overflow-hidden border ${
                  imgIdx === i ? 'border-turtle-500' : 'border-gray-200'
                }`}
              >
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: details */}
          <div className="lg:col-span-3 space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <PayAtPropertyBadge />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {property.category}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
                {property.name}
              </h1>
              <p className="text-sm text-gray-500 mt-2">{property.tagline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} className="text-turtle-600" /> {property.location}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                  <Star size={14} className="text-turtle-500 fill-turtle-500" />
                  {property.rating}
                  <span className="font-normal text-gray-400">({property.reviews})</span>
                </span>
              </div>
            </div>

            {/* Pay at property highlight */}
            <div className="rounded-2xl border border-turtle-200 bg-turtle-50/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-turtle-700 mb-1.5">
                How payment works
              </p>
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Pay at property</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Book for free — no online payment required. Settle the full amount when you check in at the stay.
                You&apos;ll receive a 4-digit OTP to share with the property for verified check-in.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">About this stay</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.amenities.map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-600"
                  >
                    <AmenityIcon name={a} />
                    {a}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Room types</h3>
              <div className="space-y-3">
                {property.rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoom(r.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                      selectedRoom === r.id
                        ? 'border-turtle-500 bg-turtle-50/40'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.amenities.map((a) => (
                            <span key={a} className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[10px] text-gray-500">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{formatINR(r.price)}</p>
                        <p className="text-[10px] text-gray-400">/ night</p>
                        <p className={`text-[11px] mt-2 font-medium ${r.available <= 2 ? 'text-amber-600' : 'text-turtle-700'}`}>
                          {r.available} left
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: booking card */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-20 rounded-[1.5rem] border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-2xl font-semibold text-gray-900 tracking-tight">
                  {formatINR(room?.price || 0)}
                </p>
                <span className="text-xs text-gray-400">per night</span>
              </div>
              <PayAtPropertyBadge className="mb-5" />

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Check-in">
                    <input
                      type="date"
                      value={checkIn}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="stay-input"
                    />
                  </Field>
                  <Field label="Check-out">
                    <input
                      type="date"
                      value={checkOut}
                      min={checkIn || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="stay-input"
                    />
                  </Field>
                </div>

                <Field label="Rooms">
                  <select
                    value={roomsCount}
                    onChange={(e) => setRoomsCount(Number(e.target.value))}
                    className="stay-input"
                  >
                    {Array.from({ length: Math.max(1, room?.available || 1) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Guests">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-gray-400" />
                    <input
                      type="number"
                      min={1}
                      max={room?.maxGuests || 4}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="stay-input"
                    />
                  </div>
                </Field>
              </div>

              {nights > 0 && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-1.5 text-sm">
                  <Row label={`${formatINR(room.price)} × ${nights} night${nights > 1 ? 's' : ''} × ${roomsCount}`} value={formatINR(total)} />
                  <Row label="Pay now" value="₹0" accent />
                  <div className="pt-1.5 border-t border-gray-200 flex justify-between font-semibold text-gray-900">
                    <span>Pay at property</span>
                    <span>{formatINR(total)}</span>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

              <button
                type="button"
                onClick={startBooking}
                className="mt-4 w-full h-12 rounded-2xl bg-turtle-600 hover:bg-turtle-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                Book this stay <ChevronRight size={16} />
              </button>
              <p className="text-[11px] text-center text-gray-400 mt-3">
                Login required before booking · No online payment
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Booking form modal */}
      {bookingStep === 'form' && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Guest details</h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              You&apos;ll pay <span className="font-semibold text-turtle-700">{formatINR(total)}</span> at the property.
            </p>

            <div className="space-y-3">
              <Field label="Full name">
                <input
                  className="stay-input"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="As on ID"
                  autoFocus
                />
              </Field>
              <Field label="Email (optional)">
                <input
                  className="stay-input"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </Field>
              <Field label="Phone">
                <input className="stay-input bg-gray-50" value={`+91 ${user?.phone || ''}`} disabled />
              </Field>
            </div>

            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800 text-sm mb-2">Booking summary</p>
              <Row label="Stay" value={property.name} />
              <Row label="Room" value={room?.name} />
              <Row label="Dates" value={`${checkIn} → ${checkOut}`} />
              <Row label="Nights" value={String(nights)} />
              <Row label="Pay at property" value={formatINR(total)} accent />
            </div>

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setBookingStep(null)}
                className="flex-1 h-11 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBooking}
                className="flex-[1.4] h-11 rounded-2xl bg-turtle-600 hover:bg-turtle-700 text-white text-sm font-semibold"
              >
                Confirm booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success + OTP */}
      {bookingStep === 'success' && booking && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl p-7 text-center">
            <div className="w-14 h-14 rounded-full bg-turtle-50 border border-turtle-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-turtle-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Booking confirmed</h2>
            <p className="text-sm text-gray-500 mt-2">
              Share this OTP at check-in. Pay {formatINR(booking.amount)} at the property.
            </p>

            <div className="mt-6 rounded-2xl border border-turtle-200 bg-turtle-50/80 p-5">
              <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-turtle-700 mb-2">
                <KeyRound size={13} /> Check-in OTP
              </div>
              <p className="text-4xl font-semibold tracking-[0.35em] text-turtle-800 pl-[0.35em]">
                {booking.checkInOtp}
              </p>
              <button
                type="button"
                onClick={copyOtp}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-turtle-700 hover:text-turtle-900"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy OTP'}
              </button>
            </div>

            <div className="mt-5 text-left rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <Row label="Booking ID" value={booking.id} />
              <Row label="Stay" value={booking.propertyName} />
              <Row label="Room" value={booking.roomName} />
              <Row label="Dates" value={`${booking.checkIn} → ${booking.checkOut}`} />
            </div>

            <button
              type="button"
              onClick={() => {
                setBookingStep(null);
                setBooking(null);
              }}
              className="mt-6 w-full h-11 rounded-2xl bg-turtle-600 hover:bg-turtle-700 text-white text-sm font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showLogin && (
        <StayLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(u) => {
            setUser(u);
            setShowLogin(false);
            // after login, reopen booking form if they had dates ready
            if (checkIn && checkOut && room) setBookingStep('form');
          }}
        />
      )}

      <style jsx global>{`
        .stay-input {
          width: 100%;
          height: 2.5rem;
          padding: 0 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 0.8125rem;
          color: #111827;
        }
        .stay-input:focus {
          border-color: #14b8a6;
        }
      `}</style>
    </StayShell>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right ${accent ? 'font-semibold text-turtle-700' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

function AmenityIcon({ name }) {
  const n = name.toLowerCase();
  if (n.includes('wifi')) return <Wifi size={13} className="text-turtle-600" />;
  if (n.includes('fire') || n.includes('heat')) return <Flame size={13} className="text-turtle-600" />;
  if (n.includes('park')) return <Car size={13} className="text-turtle-600" />;
  if (n.includes('calendar')) return <CalendarDays size={13} className="text-turtle-600" />;
  return <Check size={13} className="text-turtle-600" />;
}
