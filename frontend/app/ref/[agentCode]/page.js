'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Phone, ArrowRight, Loader2, CheckCircle2, Coffee, ChevronRight, Sparkles, Leaf, Clock, Shield } from 'lucide-react';
import { agentRef } from '@/lib/api';

export default function LeadCapturePage() {
  const { agentCode } = useParams();
  const router = useRouter();

  const [phase, setPhase] = useState('loading'); // loading | form | submitting | success | invalid
  const [agentName, setAgentName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      if (!agentCode) { setPhase('invalid'); return; }
      try {
        const already = localStorage.getItem('picoso_token');
        if (already) {
          router.replace('/menu');
          return;
        }
        const res = await agentRef.trackScan(agentCode);
        setAgentName(res.data.agentName || '');
        setPhase('form');
        setTimeout(() => inputRef.current?.focus(), 300);
      } catch {
        setPhase('invalid');
      }
    };
    init();
  }, [agentCode, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setPhase('submitting');
    try {
      const res = await agentRef.register(agentCode, cleaned);
      localStorage.setItem('picoso_token', res.data.token);
      localStorage.setItem('picoso_user', JSON.stringify(res.data.user));
      setPhase('success');
      setTimeout(() => router.replace('/menu'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      setPhase('form');
    }
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h1 className="text-white text-xl font-bold mb-2">Invalid Link</h1>
        <p className="text-emerald-200/60 text-sm mb-6">This referral link is no longer active.</p>
        <a href="/" className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-medium text-sm hover:bg-emerald-400 transition-all">
          Visit Picoso
        </a>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-full p-6 mb-6 animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>
        <h1 className="text-white text-2xl font-bold mb-2">You're all set! 🎉</h1>
        <p className="text-emerald-200/70 text-sm mb-1">Taking you to Picoso now…</p>
        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2 mt-4">
          <Coffee className="w-4 h-4 text-amber-400" />
          <span className="text-amber-200 text-sm">Your free coffee is ready to claim!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex flex-col">
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10 max-w-sm mx-auto w-full">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
            <Leaf className="w-4 h-4 text-emerald-400" />
            <span className="text-white text-sm font-medium">Picoso Cloud Kitchen</span>
          </div>
        </div>

        {/* Main Welcome Card */}
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-5 shadow-2xl">
          <div className="text-center mb-5">
            <div className="text-4xl mb-3">👋</div>
            <h1 className="text-white text-xl font-bold leading-snug mb-3">
              Welcome to Picoso!
            </h1>
            <p className="text-emerald-100/80 text-sm leading-relaxed">
              We're your local cloud kitchen, committed to serving{' '}
              <span className="text-emerald-300 font-semibold">fresh, delicious, no-junk meals</span>{' '}
              made with quality ingredients and delivered to your doorstep in around{' '}
              <span className="text-emerald-300 font-semibold">20 minutes</span>.
            </p>
          </div>

          {/* Gift Banner */}
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/30 rounded-xl p-2.5 flex-shrink-0">
                <Coffee className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">
                  Sign up & get a{' '}
                  <span className="bg-amber-400 text-emerald-950 px-1.5 py-0.5 rounded font-bold">FREE</span>{' '}
                  Coffee!
                </div>
                <div className="text-amber-200/70 text-xs mt-0.5">
                  Complimentary with your first order
                </div>
              </div>
            </div>
          </div>

          {/* Phone Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-emerald-200 text-sm font-medium mb-2">
                Enter your mobile number
              </label>
              <div className="flex items-center bg-white/10 border border-white/20 rounded-2xl overflow-hidden focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition-all">
                <div className="flex items-center gap-1.5 px-3 py-4 border-r border-white/20">
                  <span className="text-white/50 text-sm">🇮🇳</span>
                  <span className="text-white/60 text-sm font-medium">+91</span>
                </div>
                <input
                  ref={inputRef}
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  placeholder="10-digit mobile number"
                  className="flex-1 bg-transparent px-4 py-4 text-white placeholder-white/30 text-base focus:outline-none tracking-wide"
                  inputMode="numeric"
                  required
                  disabled={phase === 'submitting'}
                />
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={phase === 'submitting' || phone.replace(/\D/g, '').length !== 10}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/40 text-base"
            >
              {phase === 'submitting' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Getting you in…</>
              ) : (
                <>Claim my free coffee <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            <p className="text-white/30 text-xs text-center">
              By signing up, you agree to receive order updates via WhatsApp/SMS.
            </p>
          </form>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {[
            { icon: <Leaf className="w-4 h-4" />, label: 'No Junk', color: 'emerald' },
            { icon: <Clock className="w-4 h-4" />, label: '~20 min', color: 'blue' },
            { icon: <Shield className="w-4 h-4" />, label: 'Fresh Daily', color: 'violet' },
          ].map(({ icon, label, color }) => {
            const cls = {
              emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
              blue: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
              violet: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
            };
            return (
              <div key={label} className={`${cls[color]} border rounded-xl px-2 py-2.5 flex flex-col items-center gap-1`}>
                {icon}
                <span className="text-xs font-medium">{label}</span>
              </div>
            );
          })}
        </div>

        {agentName && (
          <p className="text-white/20 text-xs mt-5 text-center">
            Introduced by {agentName}
          </p>
        )}
      </div>
    </div>
  );
}
