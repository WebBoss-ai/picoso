'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, User, ArrowRight, ArrowLeft, Loader2, Sparkles, MapPin, ChevronRight, QrCode, Wallet } from 'lucide-react';
import { agentAuth } from '@/lib/api';

export default function AgentLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState('phone'); // 'phone' | 'name'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('picoso_agent_token');
    if (token) {
      router.replace('/agent/dashboard');
    } else {
      setChecking(false);
    }
  }, [router]);

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setStep('name');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your full name'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await agentAuth.login({ phone: phone.replace(/\D/g, ''), name: name.trim() });
      localStorage.setItem('picoso_agent_token', res.data.token);
      localStorage.setItem('picoso_agent', JSON.stringify(res.data.agent));
      router.replace('/agent/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-sm font-medium">Agent Portal</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Join Picoso
          </h1>
          <p className="text-emerald-200/70 text-sm">
            Spread the word, earn ₹20 for every delivery
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl">

          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              <div>
                <label className="block text-emerald-200 text-sm font-medium mb-2">
                  Mobile Number
                </label>
                <div className="flex items-center bg-white/10 border border-white/20 rounded-2xl overflow-hidden focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition-all">
                  <div className="flex items-center gap-2 px-4 py-3.5 border-r border-white/20">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span className="text-white/60 text-sm font-medium">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter your number"
                    className="flex-1 bg-transparent px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none"
                    autoFocus
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/50"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setError(''); }}
                  className="text-emerald-400 text-sm mb-4 flex items-center gap-1 hover:text-emerald-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> {phone}
                </button>
                <label className="block text-emerald-200 text-sm font-medium mb-2">
                  Your Full Name
                </label>
                <div className="flex items-center bg-white/10 border border-white/20 rounded-2xl overflow-hidden focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition-all">
                  <div className="px-4 py-3.5 border-r border-white/20">
                    <User className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="flex-1 bg-transparent px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-emerald-200/50 text-xs mt-2">
                  Already registered? We'll log you in automatically.
                </p>
              </div>
              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Getting you in...</>
                ) : (
                  <><ArrowRight className="w-4 h-4" /> Go to Dashboard</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { Icon: MapPin,  title: 'Door-to-door', desc: 'Walk your area' },
            { Icon: QrCode,  title: 'Your QR', desc: 'Unique link' },
            { Icon: Wallet,  title: 'Earn Rewards', desc: 'Per delivery' },
          ].map((b) => (
            <div key={b.title} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="flex justify-center mb-1.5"><b.Icon className="w-5 h-5 text-emerald-400" /></div>
              <div className="text-white text-xs font-semibold">{b.title}</div>
              <div className="text-emerald-200/50 text-xs">{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
