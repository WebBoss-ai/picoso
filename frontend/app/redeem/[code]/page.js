'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Coffee, Gift, CheckCircle2, ArrowRight, Loader2, Phone,
  Sparkles, Star, ChefHat, Zap, Shield, X, RefreshCw,
} from 'lucide-react';
import { campaign as campaignApi, auth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/* ─── Floating particle animation ─────────────────────────────────────────── */
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20 animate-pulse"
          style={{
            width: `${4 + (i % 5) * 3}px`,
            height: `${4 + (i % 5) * 3}px`,
            left: `${(i * 17 + 5) % 95}%`,
            top: `${(i * 23 + 10) % 90}%`,
            background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f97316' : '#fef08a',
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Coffee counter ring ──────────────────────────────────────────────────── */
function CoffeeRing({ left, total }) {
  const pct = total > 0 ? left / total : 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white leading-none">{left}</span>
        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mt-0.5">left</span>
      </div>
    </div>
  );
}

/* ─── Step indicator ───────────────────────────────────────────────────────── */
function StepDots({ step }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className="rounded-full transition-all duration-300"
          style={{
            width: s === step ? 24 : 8,
            height: 8,
            background: s === step ? '#fbbf24' : 'rgba(255,255,255,0.25)',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────────── */
export default function RedeemPage() {
  const { code } = useParams();
  const router = useRouter();
  const { login, isLoggedIn } = useAuth();

  const [campaignData, setCampaignData] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [campaignError, setCampaignError] = useState('');

  const [step, setStep] = useState(1); // 1=phone, 2=otp, 3=success
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpRefs = [useRef(), useRef(), useRef(), useRef()];
  const hasTrackedScan = useRef(false);

  // Load campaign info
  useEffect(() => {
    if (!code) return;
    campaignApi.getInfo(code)
      .then(res => setCampaignData(res.data.campaign))
      .catch(() => setCampaignError('Campaign not found or expired.'))
      .finally(() => setLoadingInfo(false));

    // Track scan (once per page load)
    if (!hasTrackedScan.current) {
      hasTrackedScan.current = true;
      campaignApi.trackScan(code).catch(() => {});
    }
  }, [code]);

  // If already logged in → store campaign code and go to menu
  useEffect(() => {
    if (isLoggedIn && step === 1) {
      if (campaignData?.active) {
        localStorage.setItem('picoso_campaign', JSON.stringify({ code, ...campaignData }));
      }
      router.push('/menu');
    }
  }, [isLoggedIn, campaignData]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleSendOTP = async () => {
    setError('');
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone number'); return; }
    setLoadingSend(true);
    try {
      await auth.sendOTP(clean);
      setStep(2);
      setResendCountdown(30);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally { setLoadingSend(false); }
  };

  const handleOTPChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 3) otpRefs[idx + 1].current?.focus();
    if (next.every(d => d !== '')) handleVerify(next.join(''));
  };

  const handleOTPKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  const handleVerify = async (otpStr) => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    setError('');
    setLoadingVerify(true);
    try {
      const res = await auth.verifyOTP(clean, otpStr || otp.join(''));
      const { token, user: userObj } = res.data;
      login(token, userObj);
      // Store campaign code in localStorage
      if (campaignData?.active) {
        localStorage.setItem('picoso_campaign', JSON.stringify({ code, ...campaignData }));
      }
      // Register as lead
      try { await campaignApi.registerLead(code); } catch {}
      setStep(3);
      setTimeout(() => router.push('/menu'), 1800);
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '']);
      otpRefs[0].current?.focus();
    } finally { setLoadingVerify(false); }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg,#1a0a00,#3d1c00,#7c2d12)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-amber-200/70 text-sm font-medium">Loading your offer...</p>
        </div>
      </div>
    );
  }

  // ── Campaign not found ─────────────────────────────────────────────────────
  if (campaignError || !campaignData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(160deg,#1a0a00,#3d1c00,#7c2d12)' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
            <X size={32} className="text-white/60" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Offer Not Found</h2>
          <p className="text-white/60 text-sm mb-6">This campaign link is invalid or has expired.</p>
          <button onClick={() => router.push('/')}
            className="px-6 py-3 rounded-2xl text-sm font-semibold text-amber-900 bg-amber-400 hover:bg-amber-300 transition-colors">
            Go to Menu
          </button>
        </div>
      </div>
    );
  }

  const coffeesLeft = campaignData.coffeesLeft ?? 0;
  const isExpired = !campaignData.active || coffeesLeft <= 0;

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg,#1a0a00 0%,#3d1400 30%,#7c2d12 65%,#92400e 100%)' }}>
      <Particles />

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col items-center justify-start pt-14 pb-6 px-5 max-w-md mx-auto w-full">

        {/* Brand chip */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
          <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white font-black text-[10px]">P</span>
          </div>
          <span className="text-white/90 text-xs font-bold tracking-wide">Picoso × Free Coffee</span>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            {/* Glow */}
            <div className="absolute inset-0 rounded-full blur-2xl opacity-40"
              style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }} />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', boxShadow: '0 12px 40px rgba(251,191,36,0.35)' }}>
              <Coffee size={40} className="text-white" strokeWidth={1.8} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
            Free Coffee<br />
            <span className="text-amber-300">On Us!</span>
          </h1>
          <p className="text-white/65 text-sm mt-3 leading-relaxed max-w-xs mx-auto">
            Order any bowl and get one coffee absolutely free — our launch gift to you.
          </p>
        </div>

        {/* Offer highlights row */}
        <div className="grid grid-cols-3 gap-2 w-full mb-6">
          {[
            { icon: Gift, label: '1 Free Coffee', sub: 'Per order' },
            { icon: ChefHat, label: 'Add a Bowl', sub: 'Required' },
            { icon: Zap, label: 'Instant', sub: 'Auto-applied' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center">
                <Icon size={14} className="text-amber-300" />
              </div>
              <span className="text-white text-[11px] font-bold leading-tight">{label}</span>
              <span className="text-white/45 text-[9px] font-semibold uppercase tracking-wide">{sub}</span>
            </div>
          ))}
        </div>

        {/* Coffee counter */}
        <div className="flex items-center gap-5 mb-8 py-5 px-6 rounded-3xl w-full"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <CoffeeRing left={coffeesLeft} total={campaignData.totalBudget} />
          <div className="flex-1">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Campaign Status</p>
            <p className="text-white font-extrabold text-lg leading-tight">
              {isExpired ? 'All claimed!' : `${coffeesLeft} of ${campaignData.totalBudget} coffees`}
            </p>
            <p className="text-amber-300/80 text-xs font-semibold mt-1">
              {isExpired ? 'Offer has ended' : coffeesLeft === 1 ? '⚡ Last one! Grab it now' : '🔥 Grab yours before it\'s gone'}
            </p>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${campaignData.totalBudget > 0 ? (coffeesLeft / campaignData.totalBudget) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        {/* ── Form Card ──────────────────────────────────────────────────────── */}
        <div className="w-full rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}>

          {isExpired ? (
            /* Campaign ended */
            <div className="p-7 text-center">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Coffee size={24} className="text-white/40" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Offer Ended</h3>
              <p className="text-white/55 text-sm mb-5 leading-relaxed">
                All free coffees have been claimed. But you can still enjoy our delicious menu!
              </p>
              <button onClick={() => router.push('/menu')}
                className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', color: '#1a0a00' }}>
                Browse Menu <ArrowRight size={15} />
              </button>
            </div>
          ) : step === 3 ? (
            /* Success */
            <div className="p-7 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
                <CheckCircle2 size={28} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">You're In!</h3>
              <p className="text-white/65 text-sm mb-4 leading-relaxed">
                Your free coffee is locked in. Add a bowl at checkout to redeem it.
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-300 text-xs font-semibold">
                <Loader2 size={13} className="animate-spin" />
                Redirecting to menu...
              </div>
            </div>
          ) : (
            <div className="p-6">
              <StepDots step={step} />

              {step === 1 && (
                /* Phone step */
                <div>
                  <h3 className="text-white font-extrabold text-xl text-center mb-1">
                    Claim Your Free Coffee
                  </h3>
                  <p className="text-white/50 text-xs text-center mb-6">
                    Enter your phone number to get started
                  </p>

                  {/* Code field (read-only) */}
                  <div className="mb-4">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 block">
                      Campaign Code
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                      style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
                      <Gift size={16} className="text-amber-400 flex-shrink-0" />
                      <span className="text-amber-300 font-extrabold text-lg tracking-[0.2em] flex-1">{code}</span>
                      <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-amber-400" />
                      </div>
                    </div>
                  </div>

                  {/* Phone field */}
                  <div className="mb-5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 block">
                      Phone Number
                    </label>
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-white/40 text-sm">🇮🇳</span>
                        <span className="text-white/50 text-sm font-semibold">+91</span>
                        <div className="w-px h-4 bg-white/20 ml-1" />
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                        className="flex-1 bg-transparent text-white placeholder-white/30 text-sm font-semibold outline-none"
                        autoFocus
                      />
                      {phone.length === 10 && (
                        <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 px-3 py-2.5 rounded-xl text-xs text-red-300 flex items-center gap-2"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <X size={13} className="flex-shrink-0" /> {error}
                    </div>
                  )}

                  <button
                    onClick={handleSendOTP}
                    disabled={loadingSend || phone.replace(/\D/g, '').length !== 10}
                    className="w-full py-4 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', color: '#1a0a00', boxShadow: '0 8px 28px rgba(251,191,36,0.3)' }}
                  >
                    {loadingSend ? (
                      <><Loader2 size={18} className="animate-spin" /> Sending OTP...</>
                    ) : (
                      <>Order Now <ArrowRight size={18} /></>
                    )}
                  </button>

                  <p className="text-white/35 text-[10px] text-center mt-4 flex items-center justify-center gap-1.5">
                    <Shield size={10} /> OTP verification · No spam ever
                  </p>
                </div>
              )}

              {step === 2 && (
                /* OTP step */
                <div>
                  <h3 className="text-white font-extrabold text-xl text-center mb-1">
                    Enter OTP
                  </h3>
                  <p className="text-white/50 text-xs text-center mb-6">
                    Sent to +91 {phone}
                    <button onClick={() => { setStep(1); setOtp(['','','','']); setError(''); }}
                      className="text-amber-400 font-semibold ml-2 hover:underline">
                      Change
                    </button>
                  </p>

                  {/* 4-digit OTP boxes */}
                  <div className="flex gap-3 justify-center mb-5">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={otpRefs[i]}
                        type="tel"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleOTPChange(i, e.target.value)}
                        onKeyDown={e => handleOTPKeyDown(i, e)}
                        className="w-14 h-14 text-center text-2xl font-black rounded-2xl outline-none transition-all"
                        style={{
                          background: d ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.07)',
                          border: d ? '2px solid rgba(251,191,36,0.6)' : '2px solid rgba(255,255,255,0.15)',
                          color: '#fbbf24',
                        }}
                      />
                    ))}
                  </div>

                  {error && (
                    <div className="mb-4 px-3 py-2.5 rounded-xl text-xs text-red-300 flex items-center gap-2"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <X size={13} className="flex-shrink-0" /> {error}
                    </div>
                  )}

                  <button
                    onClick={() => handleVerify()}
                    disabled={loadingVerify || otp.some(d => !d)}
                    className="w-full py-4 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', color: '#1a0a00', boxShadow: '0 8px 28px rgba(251,191,36,0.3)' }}
                  >
                    {loadingVerify ? (
                      <><Loader2 size={18} className="animate-spin" /> Verifying...</>
                    ) : (
                      <>Verify & Claim <Sparkles size={16} /></>
                    )}
                  </button>

                  <div className="mt-4 text-center">
                    {resendCountdown > 0 ? (
                      <p className="text-white/40 text-xs font-medium">
                        Resend in {resendCountdown}s
                      </p>
                    ) : (
                      <button onClick={handleSendOTP} disabled={loadingSend}
                        className="text-amber-400 text-xs font-semibold flex items-center gap-1.5 mx-auto hover:text-amber-300 transition-colors disabled:opacity-50">
                        <RefreshCw size={12} /> Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom trust row */}
        <div className="flex items-center gap-4 mt-6 justify-center">
          {[
            { Icon: Star, text: '4.9 Rated' },
            { Icon: Shield, text: 'FSSAI Certified' },
            { Icon: Zap, text: '30-Min Delivery' },
          ].map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-white/40 text-[11px] font-semibold">
              <Icon size={11} className="text-amber-400/60" /> {text}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-white/25 text-[10px] text-center mt-4 px-4 leading-relaxed">
          One free coffee per order · Valid with any bowl purchase · Limited to {campaignData.totalBudget} total redemptions
        </p>
      </div>
    </div>
  );
}
