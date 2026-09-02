'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Phone, ArrowRight, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { auth } from '@/lib/api';
import { hashOtp } from '@/lib/stayUtils';
import { useAuth } from '@/context/AuthContext';

const DEV_OTP = '0000';

export default function StayLoginModal({ onClose, onSuccess }) {
  const { login } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [hashed, setHashed] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitLeft, setWaitLeft] = useState(2);
  const refs = useRef([]);

  useEffect(() => {
    if (step !== 'wait') return;
    setWaitLeft(2);
    const tick = setInterval(() => setWaitLeft((w) => Math.max(0, w - 1)), 1000);
    const done = setTimeout(() => {
      setHashed(hashOtp(DEV_OTP));
      setOtp(DEV_OTP.split(''));
      setStep('otp');
    }, 2000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [step]);

  useEffect(() => {
    if (step === 'otp' && otp.join('').length === 4) {
      const t = setTimeout(() => verify(otp.join('')), 400);
      return () => clearTimeout(t);
    }
  }, [step, otp]);

  const startLogin = async () => {
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await auth.sendOTP(phone);
      setStep('wait');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code) => {
    setLoading(true);
    setError('');
    try {
      const res = await auth.verifyOTP(phone, code);
      const { token, user } = res.data;
      login(token, user);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('picoso-stay-auth'));
      }
      setStep('success');
      setTimeout(() => {
        onSuccess?.(user);
        onClose?.();
      }, 900);
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const onOtpChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 3) refs.current[i + 1]?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4 font-stay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full sm:max-w-md bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl p-7 sm:p-8 animate-slide-up">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-turtle-600">Picoso Stay</p>
            <h2 className="text-xl font-semibold text-gray-900 mt-1 tracking-tight">
              {step === 'success' ? "You're in" : 'Login with phone'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'phone' && 'Secure OTP login — hashed & verified.'}
              {step === 'wait' && 'Preparing secure OTP…'}
              {step === 'otp' && 'Confirm the hashed OTP below.'}
              {step === 'success' && 'Continue to book your stay.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        {step === 'phone' && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 mb-1.5 block">Mobile number</span>
              <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-turtle-500 bg-gray-50/50">
                <Phone size={16} className="text-turtle-600" />
                <span className="text-sm text-gray-400">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-300"
                  autoFocus
                />
              </div>
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              onClick={startLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-turtle-600 hover:bg-turtle-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
            </button>
          </div>
        )}

        {step === 'wait' && (
          <div className="py-10 flex flex-col items-center text-center gap-3">
            <Loader2 className="w-6 h-6 text-turtle-600 animate-spin" />
            <p className="text-sm text-gray-600">Secure channel opening…</p>
            <p className="text-3xl font-semibold tabular-nums text-turtle-700">{waitLeft}s</p>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-turtle-100 bg-turtle-50/60 px-4 py-3 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-turtle-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-turtle-700">Hashed OTP</p>
                <p className="text-xs font-mono text-turtle-800/80 break-all mt-0.5">{hashed}</p>
              </div>
            </div>
            <div className="flex gap-2.5 justify-center">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (refs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                  className="w-14 h-14 text-center text-xl font-semibold rounded-2xl border border-gray-200 bg-white text-gray-900 focus:border-turtle-500"
                />
              ))}
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            {loading && <p className="text-center text-xs text-gray-400">Verifying…</p>}
          </div>
        )}

        {step === 'success' && (
          <div className="py-10 flex flex-col items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-turtle-600" />
            <p className="text-sm text-gray-600">Logged in as +91 {phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}
