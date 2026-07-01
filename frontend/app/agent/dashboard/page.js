'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  QrCode, IndianRupee, Users, ScanLine, TrendingUp, LogOut,
  Copy, Check, Loader2, RefreshCw, ChevronRight, Star,
  ShoppingBag, Activity, Calendar, Phone, User, ExternalLink,
  Wallet, BarChart2, Eye, Gift
} from 'lucide-react';
import { agentAuth } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://picoso.in';

function QRCodeDisplay({ url }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=065f46&qzone=2&format=png`;
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white rounded-2xl p-4 shadow-xl shadow-emerald-900/30">
        <img src={qrUrl} alt="Your QR Code" className="w-48 h-48 rounded-lg" />
      </div>
      <p className="text-emerald-200/50 text-xs mt-3 text-center max-w-[200px] break-all">
        {url}
      </p>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = 'emerald', className = '' }) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    blue:    'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    violet:  'from-violet-500/20 to-violet-600/10 border-violet-500/30',
    amber:   'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  };
  const iconColors = {
    emerald: 'text-emerald-400', blue: 'text-blue-400',
    violet: 'text-violet-400', amber: 'text-amber-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-4 ${className}`}>
      <div className={`${iconColors[color]} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-white/60 text-xs mt-0.5">{label}</div>
      {sub && <div className="text-white/40 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function SparkLine({ data }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.slice(-14).map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-emerald-400/60 rounded-sm"
          style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function AgentDashboard() {
  const router = useRouter();
  const [agent, setAgent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [displayEarning, setDisplayEarning] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await agentAuth.getProfile();
      setAgent(res.data.agent);
      setAnalytics(res.data.analytics);
      setDisplayEarning(res.data.displayEarningPerOrder ?? 0);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('picoso_agent_token');
        localStorage.removeItem('picoso_agent');
        router.replace('/agent');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('picoso_agent_token');
    if (!token) { router.replace('/agent'); return; }
    fetchData();
  }, [fetchData, router]);

  const refUrl = agent ? `${BASE_URL}/ref/${agent.agentCode}` : '';

  const copyLink = async () => {
    if (!refUrl) return;
    await navigator.clipboard.writeText(refUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logout = () => {
    localStorage.removeItem('picoso_agent_token');
    localStorage.removeItem('picoso_agent');
    router.replace('/agent');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const conversionRate = agent?.totalScans > 0
    ? ((agent.totalLeads / agent.totalScans) * 100).toFixed(1)
    : '0';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'qr', label: 'My QR', icon: <QrCode className="w-4 h-4" /> },
    { id: 'earnings', label: 'Earnings', icon: <Wallet className="w-4 h-4" /> },
    { id: 'leads', label: 'Leads', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-md mx-auto px-4 pb-24 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-300 text-xs font-medium">Active Agent</span>
            </div>
            <h1 className="text-white text-xl font-bold">{agent?.name}</h1>
            <p className="text-emerald-200/50 text-xs">{agent?.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-emerald-400 hover:bg-white/10 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 mb-6 shadow-2xl shadow-emerald-900/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-emerald-100/70 text-sm mb-1">Wallet Balance</div>
                <div className="text-5xl font-bold text-white">
                  ₹{agent?.wallet?.toLocaleString('en-IN') || '0'}
                </div>
                <div className="text-emerald-100/70 text-sm mt-1">
                  ₹{agent?.totalEarnings?.toLocaleString('en-IN') || '0'} total earned
                </div>
              </div>
              <div className="bg-white/20 rounded-2xl p-3">
                <Wallet className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <span className="text-emerald-100/70 text-xs">Agent Code:</span>
              <span className="text-white font-mono font-bold text-sm">{agent?.agentCode}</span>
            </div>
            {displayEarning > 0 && (
              <div className="mt-2 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                <span className="text-emerald-100/70 text-xs">You earn</span>
                <span className="text-white font-bold text-sm">₹{displayEarning} per delivered order</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={<ScanLine className="w-5 h-5" />}
            label="QR Scans"
            value={agent?.totalScans?.toLocaleString() || '0'}
            sub={`${conversionRate}% conversion`}
            color="blue"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Registered"
            value={agent?.totalLeads?.toLocaleString() || '0'}
            color="violet"
          />
          <StatCard
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Orders Delivered"
            value={agent?.totalOrders?.toLocaleString() || '0'}
            color="amber"
          />
          <StatCard
            icon={<IndianRupee className="w-5 h-5" />}
            label="Total Earned"
            value={`₹${agent?.totalEarnings?.toLocaleString('en-IN') || '0'}`}
            color="emerald"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-semibold">Scan Activity (Last 30 days)</h3>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              {analytics?.scansByDay?.length > 0 ? (
                <SparkLine data={analytics.scansByDay} />
              ) : (
                <div className="h-8 flex items-center">
                  <p className="text-white/30 text-xs">No scans yet — share your QR!</p>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="text-white text-sm font-semibold mb-3">Recent Scans</h3>
              {analytics?.recentScans?.length > 0 ? (
                <div className="space-y-2">
                  {analytics.recentScans.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <ScanLine className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <span className="text-white/60 text-xs">QR Scanned</span>
                      </div>
                      <span className="text-white/40 text-xs">{formatDate(s.scannedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-xs">No scans yet</p>
              )}
            </div>
          </div>
        )}

        {/* Tab: QR Code */}
        {activeTab === 'qr' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center">
              <h3 className="text-white font-semibold mb-5">Your Unique QR Code</h3>
              <QRCodeDisplay url={refUrl} />
              <div className="flex gap-3 mt-6 w-full">
                <button
                  onClick={copyLink}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm transition-all ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 border border-white/20 text-white hover:bg-white/15'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href={refUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-2xl font-medium text-sm hover:bg-emerald-400 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview
                </a>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="text-white text-sm font-semibold mb-3">How to use</h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Show this QR when talking to potential customers' },
                  { step: '2', text: 'They scan it and land on the Picoso signup page' },
                  { step: '3', text: 'They register with their phone number' },
                  { step: '4', text: displayEarning > 0 ? `For every order they get delivered, you earn ₹${displayEarning}` : 'For every order they get delivered, you earn rewards' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-500/30 border border-emerald-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-300 text-xs font-bold">{step}</span>
                    </div>
                    <p className="text-white/60 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Earnings */}
        {activeTab === 'earnings' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-4">
                <IndianRupee className="w-5 h-5 text-emerald-400 mb-2" />
                <div className="text-2xl font-bold text-white">₹{agent?.wallet || 0}</div>
                <div className="text-white/50 text-xs mt-0.5">Available Balance</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-4">
                <TrendingUp className="w-5 h-5 text-amber-400 mb-2" />
                <div className="text-2xl font-bold text-white">₹{agent?.totalEarnings || 0}</div>
                <div className="text-white/50 text-xs mt-0.5">Lifetime Earned</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="text-white text-sm font-semibold mb-3">Commission History</h3>
              {analytics?.recentCommissions?.length > 0 ? (
                <div className="space-y-2">
                  {analytics.recentCommissions.map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{c.userId?.name || c.userId?.phone}</div>
                          <div className="text-white/40 text-xs">{formatDate(c.createdAt)}</div>
                        </div>
                      </div>
                      <div className="text-emerald-400 font-bold text-sm">+₹{c.amount}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Gift className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">No commissions yet</p>
                  <p className="text-white/20 text-xs mt-1">Share your QR to start earning</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Leads */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-semibold">Registered Leads</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full">
                  {agent?.totalLeads || 0} total
                </span>
              </div>
              {analytics?.recentLeads?.length > 0 ? (
                <div className="space-y-2">
                  {analytics.recentLeads.map((l, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-500/20 rounded-xl flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm">
                            {l.userId?.name || 'User'}
                          </div>
                          <div className="text-white/40 text-xs">{l.userId?.phone}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white/40 text-xs">{formatDate(l.registeredAt)}</div>
                        {l.userId?.giftEligible && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${l.userId?.giftRedeemed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                            {l.userId?.giftRedeemed ? '✓ Gift used' : 'Gift pending'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/30 text-sm">No leads yet</p>
                  <p className="text-white/20 text-xs mt-1">Share your QR to capture leads</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
