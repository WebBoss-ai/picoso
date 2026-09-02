'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, User, Phone, Mail } from 'lucide-react';
import { stay } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { StayNav, StayShell } from '@/components/stay/StayChrome';
import { GuestBookingCard } from '@/components/stay/BookingCards';
import StayLoginModal from '@/components/stay/StayLoginModal';

export default function StayProfilePage() {
  const { isLoggedIn, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await stay.getProfile();
      setProfile(res.data);
      setName(res.data.user.name || '');
      setEmail(res.data.user.email || '');
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) load();
  }, [isLoggedIn, authLoading]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await stay.updateProfile({ name, email });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <StayShell>
        <StayNav />
        <div className="flex justify-center py-24">
          <Loader2 className="w-6 h-6 text-turtle-600 animate-spin" />
        </div>
      </StayShell>
    );
  }

  if (!isLoggedIn) {
    return (
      <StayShell>
        <StayNav />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Your stay profile</h1>
          <p className="text-sm text-gray-500 mt-2 mb-6">Login to view bookings, OTPs, and payment details.</p>
          <button type="button" onClick={() => setShowLogin(true)} className="h-11 px-6 rounded-2xl bg-turtle-600 text-white text-sm font-semibold">
            Login with phone
          </button>
        </div>
        {showLogin && <StayLoginModal onClose={() => setShowLogin(false)} onSuccess={load} />}
      </StayShell>
    );
  }

  const bookings = profile?.bookings || [];

  return (
    <StayShell>
      <StayNav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <div className="pt-6 mb-8">
          <Link href="/stay" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-turtle-700 mb-5">
            <ArrowLeft size={14} /> Back to stays
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">My profile</h1>
          <p className="text-sm text-gray-500 mt-1">Bookings, check-in OTPs & pay-at-property details</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Guest details</h2>
          <div className="space-y-3">
            <Field icon={Phone} label="Phone" value={`+91 ${user?.phone || profile?.user?.phone}`} readOnly />
            <label className="block">
              <span className="text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1"><User size={12} /> Name</span>
              <input className="stay-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1"><Mail size={12} /> Email</span>
              <input className="stay-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </label>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="mt-4 h-10 px-5 rounded-xl bg-turtle-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My bookings</h2>
          {profile?.stats && (
            <p className="text-xs text-gray-400">
              {profile.stats.total} total · {profile.stats.upcoming} upcoming
            </p>
          )}
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">No bookings yet.</p>
            <Link href="/stay" className="inline-block mt-4 text-sm font-semibold text-turtle-700 hover:text-turtle-800">
              Explore stays →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <GuestBookingCard key={b.id} booking={b} expanded />
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        .stay-input {
          width: 100%;
          height: 2.5rem;
          padding: 0 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 0.8125rem;
        }
        .stay-input:focus { border-color: #14b8a6; }
      `}</style>
    </StayShell>
  );
}

function Field({ icon: Icon, label, value, readOnly }) {
  return (
    <div>
      <span className="text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1"><Icon size={12} /> {label}</span>
      <input className="stay-input bg-gray-50" value={value} readOnly={readOnly} />
    </div>
  );
}
