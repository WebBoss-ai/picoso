'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, Leaf, Heart, Sparkles, ArrowRight, Phone,
  CheckCircle2, ShieldCheck, Salad, Sprout,
} from 'lucide-react';
import { friendReferral, auth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function FloatingLeaf({ style }) {
  return (
    <div className="absolute pointer-events-none select-none opacity-10 animate-pulse" style={style}>
      <Leaf size={18} color="#86efac" />
    </div>
  );
}

export default function FriendshipLandingPage() {
  const { code }    = useParams();
  const router      = useRouter();
  const { login }   = useAuth();   // hydrates auth state (token + user) after login

  const [phase, setPhase]           = useState('loading');
  const [referrerName, setReferrer] = useState('');
  const [referrerGender, setGender] = useState('other');
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [error, setError]           = useState('');
  // Auto-fill state
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillDots, setDots]       = useState(0); // 0-4 progress indicator
  const otpRef   = useRef(null);
  const autoTimer = useRef(null);

  useEffect(() => {
    if (!code) { setPhase('invalid'); return; }
    friendReferral.getInfo(code)
      .then(res => {
        setReferrer(res.data.referrerName || '');
        setGender(res.data.referrerGender || 'other');
        setPhase('invite');
      })
      .catch(() => setPhase('invalid'));
  }, [code]);

  // When OTP screen appears, auto-fill "0000" one digit per 500ms
  useEffect(() => {
    if (!otpSent) return;
    if (otpRef.current) otpRef.current.focus();

    setAutoFilling(true);
    setOtp('');
    setDots(0);
    let filled = '';
    let step = 0;

    autoTimer.current = setInterval(() => {
      step += 1;
      filled += '0';
      setOtp(filled);
      setDots(step);
      if (step >= 4) {
        clearInterval(autoTimer.current);
        setAutoFilling(false);
      }
    }, 500);

    return () => clearInterval(autoTimer.current);
  }, [otpSent]);

  // Auto-submit once all 4 digits are filled
  useEffect(() => {
    if (otp === '0000' && !autoFilling && !verifying) {
      handleVerify('0000');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, autoFilling]);

  const handleSendOtp = async () => {
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    setError('');
    setSending(true);
    try {
      await auth.sendOTP(phone);
      setOtpSent(true);
    } catch { setError('Could not send OTP. Try again.'); }
    finally { setSending(false); }
  };

  const handleVerify = useCallback(async (overrideOtp) => {
    const finalOtp = overrideOtp || otp;
    if (!finalOtp || finalOtp.length < 4) { setError('Enter the OTP'); return; }
    if (verifying) return;
    setError('');
    setVerifying(true);
    try {
      const res = await auth.verifyOTP(phone, finalOtp);
      const { token, user } = res.data || {};
      if (!token) throw new Error('Login failed');
      // Hydrate the whole app's auth state (context + localStorage token & user)
      login(token, user);
      // Small delay so axios interceptor picks up the new token
      await new Promise(r => setTimeout(r, 120));
      await friendReferral.join(code);
      setPhase('joined');
    } catch (e) {
      const msg = e?.response?.data?.error || '';
      if (msg === 'Already joined' || msg.includes('already')) {
        setPhase('joined'); // treat as success
      } else {
        setError(msg || 'Invalid OTP. Try again.');
      }
    } finally { setVerifying(false); }
  }, [otp, phone, code, verifying, login]);

  // ── Invalid ──────────────────────────────────────────────────────────────────
  if (phase === 'invalid') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1a10] px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
          <Heart size={28} className="text-red-400" />
        </div>
        <h1 className="text-white text-xl font-bold mb-2">Link Expired</h1>
        <p className="text-white/40 text-sm mb-8">This healthy friendship link is no longer active.</p>
        <a href="/menu" className="inline-flex items-center gap-2 bg-emerald-500 text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-emerald-400 transition-colors">
          Explore Picoso <ArrowRight size={14} />
        </a>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1a10]">
        <Loader2 className="text-emerald-400 animate-spin" size={32} />
      </div>
    );
  }

  // ── Joined success ────────────────────────────────────────────────────────────
  if (phase === 'joined') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1a10] px-6 text-center overflow-hidden relative">
        <FloatingLeaf style={{ top: '8%', left: '10%' }} />
        <FloatingLeaf style={{ top: '20%', right: '8%' }} />
        <FloatingLeaf style={{ bottom: '15%', left: '5%' }} />
        <FloatingLeaf style={{ bottom: '25%', right: '12%' }} />

        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 size={44} className="text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
            <Sparkles size={14} className="text-amber-900" />
          </div>
        </div>

        <div className="space-y-2 mb-8">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">You&apos;re in!</p>
          <h1 className="text-white text-3xl font-extrabold leading-tight">
            Welcome to the<br />Healthy Circle
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            You and {referrerName} are now eating healthy together.
            Start your first order and discover why they love it.
          </p>
        </div>

        <a href="/menu"
          className="w-full max-w-xs flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/25 text-base">
          See what&apos;s on the menu <ArrowRight size={16} />
        </a>
        <p className="text-white/20 text-xs mt-6">Picoso · Fresh cloud kitchen</p>
      </div>
    );
  }

  const firstName = (referrerName || '').split(' ')[0] || 'Someone';
  const pronoun   = referrerGender === 'female' ? 'her' : referrerGender === 'male' ? 'his' : 'their';

  return (
    <div className="friendship-scope min-h-screen bg-[#0a1a10] flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden">
      {/* Keep inputs readable even when the browser applies its autofill background */}
      <style>{`
        .friendship-scope .fs-input:-webkit-autofill,
        .friendship-scope .fs-input:-webkit-autofill:hover,
        .friendship-scope .fs-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #34d399;
          transition: background-color 9999s ease-in-out 0s;
          box-shadow: 0 0 0 1000px rgba(20, 83, 45, 0.55) inset !important;
        }
        .friendship-scope .fs-input { color: #fff; }
      `}</style>

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-0 w-96 h-96 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-teal-400/6 blur-3xl" />
      </div>

      <FloatingLeaf style={{ top: '6%',  left: '7%' }} />
      <FloatingLeaf style={{ top: '12%', right: '10%' }} />
      <FloatingLeaf style={{ bottom: '20%', left: '6%' }} />
      <FloatingLeaf style={{ bottom: '10%', right: '5%' }} />

      <div className="relative w-full max-w-sm flex flex-col gap-5">

        {/* Brand pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <Leaf size={13} className="text-emerald-400" />
            <span className="text-white/60 text-xs font-medium tracking-wide">Picoso · Healthy Eating</span>
          </div>
        </div>

        {/* Invite card */}
        <div className="bg-white/5 border border-white/8 rounded-3xl p-6 text-center backdrop-blur-sm">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Salad size={22} className="text-emerald-300" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-px bg-emerald-500/40" />
              <Heart size={14} className="text-emerald-400 fill-emerald-400" />
              <div className="w-8 h-px bg-emerald-500/40" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Sprout size={22} className="text-teal-300" />
            </div>
          </div>

          <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest mb-2">Healthy Friendship</p>
          <h1 className="text-white text-2xl font-extrabold leading-tight mb-3">
            {firstName} wants you<br />to eat healthy too
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-[240px] mx-auto">
            Join {firstName}&apos;s healthy circle on Picoso — fresh, nourishing food.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <ShieldCheck size={11} className="text-emerald-400" />
            <span className="text-emerald-300/70 text-[10px] font-mono font-bold tracking-widest">{code?.toUpperCase()}</span>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white/[0.06] border border-white/12 rounded-3xl p-6 backdrop-blur-sm">
          <div className="mb-5">
            <p className="text-white text-lg font-bold mb-1">
              {!otpSent ? 'Accept the invitation' : 'Logging you in…'}
            </p>
            <p className="text-white/55 text-xs leading-relaxed">
              {!otpSent
                ? `Enter your phone number to join ${pronoun} healthy circle`
                : `Verifying +91 ${phone} — you'll be in in a moment`}
            </p>
          </div>

          {!otpSent ? (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10">
                  <span className="text-white/70 text-sm font-semibold">+91</span>
                  <div className="w-px h-4 bg-white/25" />
                </div>
                <input
                  type="tel" inputMode="numeric" maxLength={10}
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder="Phone number"
                  className="fs-input w-full bg-white/10 border border-white/15 rounded-2xl pl-16 pr-4 py-4 text-white placeholder-white/40 text-base font-semibold focus:outline-none focus:border-emerald-400 focus:bg-white/[0.14] transition-all"
                  style={{ WebkitTextFillColor: '#fff', caretColor: '#34d399' }}
                />
              </div>
              {error && <p className="text-red-400 text-xs px-1">{error}</p>}
              <button
                onClick={handleSendOtp}
                disabled={sending || phone.length !== 10}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 text-sm"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Phone size={15} />}
                {sending ? 'Sending…' : 'Continue'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* OTP field with auto-fill animation */}
              <div className="relative">
                <input
                  ref={otpRef}
                  type="password" inputMode="numeric" maxLength={6}
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={e => {
                    if (!autoFilling) {
                      setOtp(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }
                  }}
                  onKeyDown={e => !autoFilling && e.key === 'Enter' && handleVerify()}
                  placeholder="OTP"
                  readOnly={autoFilling}
                  className="fs-input w-full bg-white/10 border border-white/15 rounded-2xl px-5 py-4 text-white placeholder-white/40 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:border-emerald-400 transition-all"
                  style={{ WebkitTextFillColor: '#fff', caretColor: '#34d399' }}
                />
                {autoFilling && (
                  <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < autoFillDots ? 'bg-emerald-400' : 'bg-white/15'}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Status message */}
              <div className="text-center">
                {autoFilling && (
                  <p className="text-emerald-400/70 text-xs">Filling in your access code…</p>
                )}
                {verifying && (
                  <p className="text-emerald-400/70 text-xs flex items-center justify-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> Joining the circle…
                  </p>
                )}
              </div>

              {error && <p className="text-red-400 text-xs px-1 text-center">{error}</p>}

              {!autoFilling && !verifying && (
                <button
                  onClick={() => handleVerify()}
                  disabled={otp.length < 4}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 text-sm"
                >
                  <CheckCircle2 size={15} /> Join the circle
                </button>
              )}
              <button
                onClick={() => { setOtpSent(false); setOtp(''); setError(''); clearInterval(autoTimer.current); }}
                className="w-full text-white/30 text-xs hover:text-white/50 transition-colors py-1"
              >
                Change number
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-white/20">
          <ShieldCheck size={12} />
          <p className="text-[11px]">Your number is never shared with anyone</p>
        </div>
      </div>
    </div>
  );
}
