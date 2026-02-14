'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Leaf, LogOut } from 'lucide-react';
import StatsSection from './StatsSection';
import OrdersSection from './OrdersSection';
import BowlsSection from './BowlsSection';
import IngredientsSection from './IngredientsSection';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('stats');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      alert('Access denied. Admin only.');
      router.push('/');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'stats', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'bowls', label: 'Bowls', icon: UtensilsCrossed },
    { id: 'ingredients', label: 'Ingredients', icon: Leaf },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your healthy bowl business</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Admin: {user.phone}</span>
            <button
              onClick={() => {
                localStorage.clear();
                router.push('/');
              }}
              className="btn-secondary py-2 px-4 text-sm"
            >
              <LogOut className="w-4 h-4 inline mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="card p-2 mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-emerald-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        

        {/* Content */}
        <div className="animate-float">
          {activeTab === 'stats' && <StatsSection />}
          {activeTab === 'orders' && <OrdersSection />}
          {activeTab === 'bowls' && <BowlsSection />}
          {activeTab === 'ingredients' && <IngredientsSection />}
        </div>
      </div>
    </div>
  );
}
