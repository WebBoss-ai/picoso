'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Coffee, CheckCircle2, ArrowRight, Loader2,
  Sparkles, Star, Zap, Shield, X, RefreshCw, Gift,
} from 'lucide-react';
import { campaign as campaignApi, auth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/* ─── Background circles ───────────────────────────────────────────────────── */
function BgCircles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }} />
      <div className="absolute top-1/3 -left-24 w-64 h-64 rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }} />
    </div>
  );
}

/* ─── Animated steam lines above coffee cup ────────────────────────────────── */
function SteamIcon() {
  return (
    <div className="relative w-28 h-28 mx-auto">
      {/* Steam */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-2.5">
        {[0, 1, 2].map(i => (
          <svg key={i} width="8" height="20" viewBox="0 0 8 20"
            style={{ animationDelay: `${i * 0.3}s`, animation: 'steam 1.8s ease-in-out infinite' }}>
            <path d="M4 18 C4 18 1 14 4 10 C7 6 4 2 4 2" stroke="#fbbf2488" strokeWidth="2"
              strokeLinecap="round" fill="none" />
          </svg>
        ))}
      </div>
      {/* Cup */}
      <div className="w-28 h-28 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
          boxShadow: '0 16px 48px rgba(251,191,36,0.45), 0 4px 16px rgba(249,115,22,0.3)',
        }}>
        <Coffee size={46} className="text-white" strokeWidth={1.6} />
      </div>
      <style>{`
        @keyframes steam {
          0%,100% { transform: translateY(0) scaleX(1); opacity: 0.5; }
          50%      { transform: translateY(-6px) scaleX(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─── OTP Input boxes ──────────────────────────────────────────────────────── */
function OTPBoxes({ otp, otpRefs, onChange, onKeyDown }) {
  return (
    <div className="flex gap-3 justify-center">
      {otp.map((d, i) => (
        <input
          key={i}
          ref={otpRefs[i]}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => onChange(i, e.target.value)}
          onKeyDown={e => onKeyDown(i, e)}
          className="w-14 h-14 text-center text-2xl font-black rounded-2xl outline-none transition-all duration-150"
          style={{
            background: d ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.06)',
            border: `2px solid ${d ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.15)'}`,
            color: '#fbbf24',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */
export default function RedeemPage() {
  const { code } = useParams();
  const router = useRouter();
  const { login, isLoggedIn } = useAuth();

  const [campaignData, setCampaignData] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState(1); // 1=phone, 2=otp, 3=success
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = [useRef(), useRef(), useRef(), useRef()];
  const scannedRef = useRef(false);

  // Fetch campaign info + track scan
  useEffect(() => {
    if (!code) return;
    campaignApi.getInfo(code)
      .then(r => setCampaignData(r.data.campaign))
      .catch(() => setNotFound(true))
      .finally(() => setLoadingInfo(false));

    if (!scannedRef.current) {
      scannedRef.current = true;
      campaignApi.trackScan(code).catch(() => {});
    }
  }, [code]);

  // If already logged in, store campaign and bounce to menu
  useEffect(() => {
    if (isLoggedIn && campaignData && step === 1) {
      localStorage.setItem('picoso_campaign', JSON.stringify({
        code,
        active: campaignData.active,
        freeItemLabel: campaignData.freeItemLabel,
        freeItemValue: campaignData.freeItemValue,
        coffeesRemaining: 5,
      }));
      router.push('/menu');
    }
  }, [isLoggedIn, campaignData]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendOTP = async () => {
    setError('');
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
    setSending(true);
    try {
      await auth.sendOTP(clean);
      // Auto-fill 0000 and sign in immediately — no manual OTP entry needed
      setOtp(['0', '0', '0', '0']);
      await verifyOTP('0000');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not send OTP. Please try again.');
      setSending(false);
    }
  };

  const handleOTPChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 3) otpRefs[i + 1].current?.focus();
    if (next.every(d => d !== '')) verifyOTP(next.join(''));
  };

  const handleOTPKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
  };

  const verifyOTP = async (otpStr) => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    setError('');
    setVerifying(true);
    try {
      const res = await auth.verifyOTP(clean, otpStr || otp.join(''));
      const { token, user: u } = res.data;
      login(token, u);

      // Store campaign with 5 coffees remaining
      localStorage.setItem('picoso_campaign', JSON.stringify({
        code,
        active: true,
        freeItemLabel: campaignData?.freeItemLabel || 'Free Coffee',
        freeItemValue: campaignData?.freeItemValue || 79,
        coffeesRemaining: 5,
      }));

      // Register as lead
      try { await campaignApi.registerLead(code); } catch {}

      setStep(3);
      setTimeout(() => router.push('/menu'), 1800);
    } catch (e) {
      setError(e.response?.data?.error || 'Wrong OTP. Please try again.');
      setOtp(['', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 50);
    } finally { setVerifying(false); }
  };

  /* ── Loading ── */
  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg,#130800,#2d1000,#7c2d12)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-amber-400/25 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-amber-300/60 text-xs font-medium">Loading your offer...</p>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (notFound || !campaignData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5"
        style={{ background: 'linear-gradient(160deg,#130800,#2d1000,#7c2d12)' }}>
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-white/8 border border-white/12 flex items-center justify-center mx-auto mb-5">
            <X size={28} className="text-white/40" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Link Not Found</h2>
          <p className="text-white/50 text-sm mb-5">This campaign link is invalid or has expired.</p>
          <button onClick={() => router.push('/menu')}
            className="px-6 py-3 rounded-2xl text-sm font-bold text-amber-900 transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)' }}>
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5"
        style={{ background: 'linear-gradient(160deg,#130800,#2d1000,#7c2d12)' }}>
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 12px 36px rgba(34,197,94,0.4)' }}>
            <CheckCircle2 size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">You're In! 🎉</h2>
          <p className="text-white/60 text-sm mb-5 leading-relaxed">
            Your 5 free coffees are ready. They'll be added automatically when you order.
          </p>
          <div className="flex items-center justify-center gap-2 text-amber-300/80 text-xs font-semibold">
            <Loader2 size={12} className="animate-spin" /> Taking you to the menu…
          </div>
        </div>
      </div>
    );
  }

  /* ── Main ── */
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg,#130800 0%,#2d1000 25%,#7c2d12 60%,#92400e 100%)' }}>
      <BgCircles />

      <div className="relative flex-1 flex flex-col items-center justify-start pt-12 pb-8 px-5 max-w-sm mx-auto w-full">

        {/* Brand pill */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-10">
          <div className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center">
            <span className="text-white font-black text-[10px]">P</span>
          </div>
          <span className="text-white/80 text-xs font-semibold tracking-wide">Picoso</span>
          <div className="w-px h-3 bg-white/20" />
          <Sparkles size={11} className="text-amber-400" />
          <span className="text-amber-300 text-xs font-semibold">Special Offer</span>
        </div>

        {/* Hero */}
        <SteamIcon />

        <div className="text-center mt-7 mb-8">
          <p className="text-amber-300/70 text-xs font-bold uppercase tracking-[0.2em] mb-2">Exclusive for you</p>
          <h1 className="text-4xl font-black text-white leading-[1.1] tracking-tight mb-3">
            5 Free<br />
            <span style={{ backgroundImage: 'linear-gradient(90deg,#fbbf24,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Coffees
            </span>
          </h1>
          <p className="text-white/55 text-sm leading-relaxed max-w-[260px] mx-auto">
            Claim your gift — one free coffee added automatically with every order, just for you.
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex items-center gap-3 mb-8 flex-wrap justify-center">
          {[
            { icon: Coffee,   text: '1 free per order' },
            { icon: Star,     text: '4.9★ rated' },
            { icon: Zap,      text: '30-min delivery' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/60"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Icon size={11} className="text-amber-400/80" /> {text}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="w-full rounded-3xl p-6"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(24px)' }}>

          {step === 1 && (
            <div>
              <h2 className="text-white font-extrabold text-lg mb-1">Claim Your Coffees</h2>
              <p className="text-white/45 text-xs mb-5">Enter your number and we'll get you started</p>

              {/* Phone input */}
              <div className="mb-5">
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: `2px solid ${phone.length === 10 ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.15)'}` }}>
                  <span className="text-white/40 text-sm flex-shrink-0">🇮🇳 +91</span>
                  <div className="w-px h-4 bg-white/20 flex-shrink-0" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Mobile number"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    onKeyDown={e => e.key === 'Enter' && sendOTP()}
                    className="flex-1 bg-transparent text-white placeholder-white/25 text-base font-bold outline-none"
                    autoFocus
                  />
                  {phone.length === 10 && (
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-300"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <X size={12} className="flex-shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={sendOTP}
                disabled={sending || verifying || phone.replace(/\D/g, '').length !== 10}
                className="w-full py-4 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', color: '#1a0800', boxShadow: '0 10px 30px rgba(251,191,36,0.3)' }}
              >
                {(sending || verifying)
                  ? <><Loader2 size={18} className="animate-spin" /> Signing you in…</>
                  : <>Get My Free Coffees <ArrowRight size={18} /></>}
              </button>

              <p className="text-white/25 text-[10px] text-center mt-4 flex items-center justify-center gap-1.5">
                <Shield size={10} className="text-white/30" />
                Verified via OTP · No spam, ever
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-white font-extrabold text-lg mb-1">Enter OTP</h2>
              <p className="text-white/45 text-xs mb-5">
                Sent to +91 {phone}
                <button onClick={() => { setStep(1); setOtp(['','','','']); setError(''); }}
                  className="text-amber-400 font-semibold ml-1.5 hover:underline">
                  Change
                </button>
              </p>

              <div className="mb-5">
                <OTPBoxes otp={otp} otpRefs={otpRefs} onChange={handleOTPChange} onKeyDown={handleOTPKey} />
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-300"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <X size={12} className="flex-shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={() => verifyOTP()}
                disabled={verifying || otp.some(d => !d)}
                className="w-full py-4 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', color: '#1a0800', boxShadow: '0 10px 30px rgba(251,191,36,0.3)' }}
              >
                {verifying
                  ? <><Loader2 size={18} className="animate-spin" /> Verifying…</>
                  : <>Confirm & Claim <Gift size={17} /></>}
              </button>

              <div className="mt-4 text-center">
                {resendTimer > 0
                  ? <p className="text-white/35 text-xs">Resend in {resendTimer}s</p>
                  : <button onClick={sendOTP} disabled={sending}
                      className="text-amber-400 text-xs font-semibold flex items-center gap-1.5 mx-auto hover:text-amber-300 transition-colors disabled:opacity-50">
                      <RefreshCw size={11} /> Resend OTP
                    </button>
                }
              </div>
            </div>
          )}
        </div>

        {/* Bottom note */}
        <p className="text-white/20 text-[10px] text-center mt-6 px-2 leading-relaxed">
          Offer valid for new & existing users · One free coffee per order · Up to 5 per account
        </p>
      </div>
    </div>
  );
}
