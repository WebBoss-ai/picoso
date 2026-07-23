'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Leaf, Heart, Users, Copy, CheckCheck, Gift, Sparkles,
  ArrowLeft, Clock, ChevronRight, Link2,
} from 'lucide-react';
import { friendReferral } from '@/lib/api';

const BASE_URL = 'https://picoso.in';

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)  return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// Social-media style notification card for a friend's order
function OrderNotification({ item, referrerGender }) {
  const pronoun = referrerGender === 'female' ? 'girl' : 'man';
  const lines = [
    `You should try it too, ${pronoun} 🙌`,
    `Looks like someone's eating smart, ${pronoun}! 🥗`,
    `Great pick, ${pronoun}! That one's a favourite here.`,
    `Your taste is rubbing off — ${pronoun}, that's a solid choice!`,
  ];
  const funLine = lines[Math.abs(item.friendName.charCodeAt(0) + (item.itemName?.charCodeAt(0) || 0)) % lines.length];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300" />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-100">
            <span className="text-white font-extrabold text-sm">
              {(item.friendName || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-sm">{item.friendName}</span>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                ordered
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <Clock size={9} />
              {timeAgo(item.orderedAt)}
            </p>
          </div>
        </div>

        {/* Order item */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl px-4 py-3 mb-3 border border-emerald-100/60">
          <p className="text-[11px] font-semibold text-emerald-600/70 uppercase tracking-widest mb-0.5">Ordered</p>
          <p className="font-bold text-gray-900 text-sm">🥗 {item.itemName}</p>
        </div>

        {/* Fun line */}
        <p className="text-gray-500 text-sm leading-relaxed mb-3 italic">&ldquo;{funLine}&rdquo;</p>

        {/* Reward banner */}
        {item.rewardEarned && (
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl px-4 py-3">
            <Gift size={16} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800">Your free wrap is waiting too! 🎁</p>
              <p className="text-[10px] text-amber-600/70 mt-0.5">Redeem it on your next order</p>
            </div>
          </div>
        )}

        {/* Date footer */}
        <p className="text-[10px] text-gray-300 text-right mt-3">{fmtDate(item.orderedAt)}</p>
      </div>
    </div>
  );
}

function CopyLink({ code, referrerGender }) {
  const [copied, setCopied] = useState(false);
  const url = `${BASE_URL}/friendship/${code}`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your friendship link</p>
      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
        <Link2 size={13} className="text-emerald-500 flex-shrink-0" />
        <span className="flex-1 text-xs text-gray-600 font-mono truncate">{url}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function MyCirclePage() {
  const router = useRouter();
  const [loading, setLoading]     = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [feed, setFeed]           = useState([]);
  const [error, setError]         = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('picoso_token') : null;
    if (!token) { router.replace('/'); return; }

    friendReferral.getMyCircle()
      .then(res => {
        setReferrals(res.data.referrals || []);
        setFeed(res.data.feed || []);
      })
      .catch(() => setError('Could not load your circle. Try again later.'))
      .finally(() => setLoading(false));
  }, [router]);

  const totalFriends  = referrals.reduce((s, r) => s + (r.totalJoined || 0), 0);
  const totalOrdered  = referrals.reduce((s, r) => s + (r.totalOrdered || 0), 0);
  const totalRewards  = referrals.reduce((s, r) => s + (r.totalRewardsEarned || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8f9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your circle…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f8f9] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-gray-600">{error}</p>
        <button onClick={() => window.location.reload()} className="text-emerald-600 text-sm font-semibold">Try again</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f9]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="text-[15px] font-bold text-gray-900 leading-none">My Healthy Circle</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Friends you brought to healthy eating</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Leaf size={15} className="text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 pb-24 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Users size={16} className="text-emerald-500" />, val: totalFriends,  label: 'Friends joined', bg: 'bg-emerald-50' },
            { icon: <Heart size={16} className="text-pink-500" />,    val: totalOrdered,  label: 'Orders placed',  bg: 'bg-pink-50' },
            { icon: <Gift size={16} className="text-amber-500" />,    val: totalRewards,  label: 'Wraps earned',   bg: 'bg-amber-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
              <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>{s.icon}</div>
              <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.val}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* No referrals yet */}
        {referrals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-emerald-400" />
            </div>
            <h2 className="font-bold text-gray-900 mb-2">No links yet</h2>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              Your referral link isn&apos;t ready yet. Request one from the menu page and we&apos;ll set it up for you.
            </p>
            <a href="/menu" className="inline-flex items-center gap-1.5 mt-5 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-400 transition-colors">
              Go to Menu <ChevronRight size={13} />
            </a>
          </div>
        ) : (
          <>
            {/* Link cards */}
            {referrals.map(ref => (
              <div key={ref._id} className="space-y-3">
                {/* Link copy */}
                <CopyLink code={ref.code} referrerGender={ref.referrerGender} />

                {/* Mini stats for this link */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                    <p className="text-xl font-extrabold text-gray-900">{ref.totalJoined}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Friends joined</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                    <p className="text-xl font-extrabold text-emerald-600">{ref.totalRewardsEarned}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Rewards earned</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Activity feed */}
            {feed.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Sparkles size={11} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Friend activity</span>
                  </div>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {feed.map((item, i) => (
                  <OrderNotification
                    key={i}
                    item={item}
                    referrerGender={referrals[0]?.referrerGender || 'other'}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Clock size={20} className="text-emerald-400" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">Waiting for your friends</p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Once your friends join and place their first order, you&apos;ll see their activity here — and earn your reward.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
