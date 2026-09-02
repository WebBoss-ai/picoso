'use client';

import { KeyRound, MapPin, CalendarDays, Users, IndianRupee, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { formatINR, bookingStatusLabel, COMMISSION_RATE } from '@/lib/stayUtils';
import { PayAtPropertyBadge } from './StayChrome';

export function GuestBookingCard({ booking, expanded = false }) {
  const [copied, setCopied] = useState(false);
  const copyOtp = async () => {
    await navigator.clipboard.writeText(booking.checkInOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-turtle-600 mb-1">
              {bookingStatusLabel(booking.status)}
            </p>
            <h3 className="text-base font-semibold text-gray-900 tracking-tight">{booking.propertyName}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{booking.roomName}</p>
          </div>
          <PayAtPropertyBadge />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info icon={MapPin} label="Location" value={booking.property?.location || '—'} />
          <Info icon={CalendarDays} label="Dates" value={`${booking.checkIn} → ${booking.checkOut}`} />
          <Info icon={Users} label="Guests / Rooms" value={`${booking.guests} guests · ${booking.roomsCount} room(s)`} />
          <Info icon={IndianRupee} label="Pay at property" value={formatINR(booking.amount)} accent />
        </div>

        {(expanded || booking.status === 'confirmed') && booking.status === 'confirmed' && (
          <div className="mt-4 rounded-xl border border-turtle-200 bg-turtle-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-turtle-700 flex items-center gap-1.5">
                  <KeyRound size={12} /> Check-in OTP
                </p>
                <p className="text-2xl font-semibold tracking-[0.3em] text-turtle-800 mt-1 pl-[0.3em]">{booking.checkInOtp}</p>
                <p className="text-xs text-gray-500 mt-1">Share this at the property during check-in</p>
              </div>
              <button type="button" onClick={copyOtp} className="text-xs font-medium text-turtle-700 flex items-center gap-1">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {booking.invoice && (
          <PaymentSplit invoice={booking.invoice} className="mt-4" />
        )}

        <p className="text-[11px] text-gray-400 mt-4">Booking ID · {booking.id}</p>
      </div>
    </div>
  );
}

export function AdminOwnerBookingCard({ booking, showPayment = true }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <span className="inline-flex px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide bg-gray-50 border-gray-200 text-gray-600">
            {bookingStatusLabel(booking.status)}
          </span>
          <h3 className="text-sm font-semibold text-gray-900 mt-2">{booking.guestName}</h3>
          <p className="text-xs text-gray-400">+91 {booking.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">{formatINR(booking.amount)}</p>
          <p className="text-[11px] text-gray-400">Pay at property</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <Detail label="Property" value={booking.propertyName} />
        <Detail label="Room" value={`${booking.roomName} · ${formatINR(booking.roomPrice)}/night`} />
        <Detail label="Dates" value={`${booking.checkIn} → ${booking.checkOut} (${booking.nights} nights)`} />
        <Detail label="Rooms / Guests" value={`${booking.roomsCount} room(s) · ${booking.guests} guests`} />
        <Detail label="Check-in OTP" value={booking.checkInOtp} mono accent />
        {booking.checkedInAt && (
          <Detail label="Checked in" value={new Date(booking.checkedInAt).toLocaleString()} />
        )}
      </div>

      {showPayment && booking.invoice && (
        <PaymentSplit invoice={booking.invoice} className="mt-4" />
      )}

      {!booking.invoice && booking.status === 'confirmed' && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Pending check-in — enter OTP to verify and generate invoice
        </p>
      )}
    </div>
  );
}

export function PaymentSplit({ invoice, className = '' }) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50/80 p-3 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Payment breakdown</p>
      <div className="space-y-1.5 text-sm">
        <Row label="Total booking amount" value={formatINR(invoice.amount)} />
        <Row label={`Picoso Stay (${(invoice.commissionRate || COMMISSION_RATE) * 100}%)`} value={formatINR(invoice.picosoShare)} accent />
        <Row label="Owner earnings" value={formatINR(invoice.ownerShare)} strong />
      </div>
      <p className="text-[10px] text-gray-400 mt-2">Invoice · {invoice.id}</p>
    </div>
  );
}

function Info({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5">
      <Icon size={14} className="text-turtle-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-gray-400">{label}</p>
        <p className={`text-xs font-medium mt-0.5 ${accent ? 'text-turtle-700' : 'text-gray-800'}`}>{value}</p>
      </div>
    </div>
  );
}

function Detail({ label, value, mono, accent }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={`text-xs font-medium mt-0.5 ${mono ? 'font-mono tracking-widest' : ''} ${accent ? 'text-turtle-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, accent, strong }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? 'font-semibold text-gray-900' : accent ? 'font-medium text-turtle-700' : 'text-gray-800'}>{value}</span>
    </div>
  );
}
