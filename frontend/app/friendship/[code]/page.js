'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Leaf, Heart, Sparkles, ArrowRight, Phone, CheckCircle2, ShieldCheck } from 'lucide-react';
import { friendReferral, auth } from '@/lib/api';

// Tiny floating leaf decoration
function FloatingLeaf({ style }) {
  return (
    <div className="absolute pointer-events-none select-none opacity-10 animate-pulse" style={style}>
      <Leaf size={18} color="#86efac" />
    </div>
  );
}

export default function FriendshipLandingPage() {
  const { code }  = useParams();
  const router    = useRouter();

  const [phase, setPhase]           = useState('loading'); // loading|invite|login|verify|joined|invalid
  const [referrerName, setReferrer] = useState('');
  const [referrerGender, setGender] = useState('other');
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [error, setError]           = useState('');
  const otpRef = useRef(null);

  useEffect(() => {
    if (!code) { setPhase('invalid'); return; }
    friendReferral.getInfo(code)
      .then(res => {
        setReferrer(res.data.referrerName);
        setGender(res.data.referrerGender || 'other');
        setPhase('invite');
      })
      .catch(() => setPhase('invalid'));
  }, [code]);

  useEffect(() => {
    if (otpSent && otpRef.current) otpRef.current.focus();
  }, [otpSent]);

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

  const handleVerify = async () => {
    if (otp.length < 4) { setError('Enter the OTP'); return; }
    setError('');
    setVerifying(true);
    try {
      const res = await auth.verifyOTP(phone, otp);
      // Store auth token
      if (typeof window !== 'undefined') {
        localStorage.setItem('picoso_token', res.data.token);
      }
      // Join via referral
      await friendReferral.join(code);
      setPhase('joined');
    } catch (e) {
      setError(e?.response?.data?.error || 'Invalid OTP. Try again.');
    } finally { setVerifying(false); }
  };

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

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1a10]">
        <Loader2 className="text-emerald-400 animate-spin" size={32} />
      </div>
    );
  }

  // ── Joined (success) ─────────────────────────────────────────────────────────
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
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">You're in!</p>
          <h1 className="text-white text-3xl font-extrabold leading-tight">Welcome to the<br />Healthy Circle</h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            You and {referrerName} are now eating healthy together. Start your first order and discover why they love it.
          </p>
        </div>

        <a href="/menu" className="w-full max-w-xs flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/25 text-base">
          See what's on the menu <ArrowRight size={16} />
        </a>
        <p className="text-white/20 text-xs mt-6">Picoso · Fresh cloud kitchen</p>
      </div>
    );
  }

  // ── Invite + Login (combined) ─────────────────────────────────────────────────
  const firstName = referrerName.split(' ')[0];
  const pronoun   = referrerGender === 'female' ? 'her' : referrerGender === 'male' ? 'his' : 'their';

  return (
    <div className="min-h-screen bg-[#0a1a10] flex flex-col items-center justify-center px-5 py-8 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 right-0 w-96 h-96 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-teal-400/6 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-xl max-h-xl rounded-full bg-emerald-900/20 blur-3xl" />
      </div>

      {/* Floating leaves */}
      <FloatingLeaf style={{ top: '6%',  left: '7%' }} />
      <FloatingLeaf style={{ top: '12%', right: '10%' }} />
      <FloatingLeaf style={{ bottom: '20%', left: '6%' }} />
      <FloatingLeaf style={{ bottom: '10%', right: '5%' }} />

      <div className="relative w-full max-w-sm flex flex-col gap-6">

        {/* Brand pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
            <Leaf size={13} className="text-emerald-400" />
            <span className="text-white/60 text-xs font-medium tracking-wide">Picoso · Healthy Eating</span>
          </div>
        </div>

        {/* Avatar + invite card */}
        <div className="relative bg-white/5 border border-white/8 rounded-3xl p-6 text-center backdrop-blur-sm">
          {/* Connecting hearts decoration */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-2xl">🥗</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-px bg-emerald-500/40" />
              <Heart size={14} className="text-emerald-400 fill-emerald-400" />
              <div className="w-8 h-px bg-emerald-500/40" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <span className="text-2xl">🌱</span>
            </div>
          </div>

          <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-widest mb-2">
            Healthy Friendship
          </p>
          <h1 className="text-white text-2xl font-extrabold leading-tight mb-3">
            {firstName} wants you<br />to eat healthy too
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-[240px] mx-auto">
            Join {firstName}&apos;s healthy circle on Picoso. Fresh, nourishing food — the kind you feel good eating.
          </p>

          {/* Code badge */}
          <div className="mt-4 inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <ShieldCheck size={11} className="text-emerald-400" />
            <span className="text-emerald-300/70 text-[10px] font-mono font-bold tracking-widest">{code?.toUpperCase()}</span>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white/4 border border-white/8 rounded-3xl p-6 backdrop-blur-sm">
          <div className="mb-5">
            <p className="text-white text-base font-bold mb-1">
              {!otpSent ? 'Accept the invitation' : 'Verify your number'}
            </p>
            <p className="text-white/35 text-xs leading-relaxed">
              {!otpSent
                ? `Enter your phone number to join ${pronoun} healthy circle`
                : `We sent a code to +91 ${phone}`}
            </p>
          </div>

          {!otpSent ? (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  <span className="text-white/30 text-sm font-medium">+91</span>
                  <div className="w-px h-4 bg-white/15" />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder="Phone number"
                  className="w-full bg-white/6 border border-white/10 rounded-2xl pl-16 pr-4 py-4 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
                />
              </div>
              {error && <p className="text-red-400 text-xs px-1">{error}</p>}
              <button
                onClick={handleSendOtp}
                disabled={sending || phone.length !== 10}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 text-sm"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Phone size={15} />}
                {sending ? 'Sending code…' : 'Continue'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={otpRef}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="Enter OTP"
                className="w-full bg-white/6 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 text-center text-xl font-bold tracking-[0.4em] focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              {error && <p className="text-red-400 text-xs px-1 text-center">{error}</p>}
              <button
                onClick={handleVerify}
                disabled={verifying || otp.length < 4}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 text-sm"
              >
                {verifying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {verifying ? 'Joining…' : 'Join the circle'}
              </button>
              <button
                onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                className="w-full text-white/30 text-xs hover:text-white/50 transition-colors py-1"
              >
                Change number
              </button>
            </div>
          )}
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 text-white/20">
          <ShieldCheck size={12} />
          <p className="text-[11px]">Your number is kept private and never shared</p>
        </div>
      </div>
    </div>
  );
}
