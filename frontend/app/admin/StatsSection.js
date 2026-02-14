'use client';

import { useEffect, useState } from 'react';
import { admin } from '@/lib/api';
import { ShoppingBag, Users, IndianRupee, Clock, TrendingUp, Package } from 'lucide-react';

export default function StatsSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await admin.getStats();
      setStats(res.data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12 text-gray-500">Failed to load stats</div>;
  }

  const statCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      label: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card p-6 hover:shadow-xl transition-shadow sparkle-effect">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          Quick Actions
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border-2 border-emerald-200 rounded-xl p-4 hover:border-emerald-400 transition-colors cursor-pointer">
            <h3 className="font-semibold text-gray-800 mb-1">View All Orders</h3>
            <p className="text-sm text-gray-600">Manage and track customer orders</p>
          </div>
          <div className="border-2 border-emerald-200 rounded-xl p-4 hover:border-emerald-400 transition-colors cursor-pointer">
            <h3 className="font-semibold text-gray-800 mb-1">Add New Bowl</h3>
            <p className="text-sm text-gray-600">Create signature bowl offerings</p>
          </div>
          <div className="border-2 border-emerald-200 rounded-xl p-4 hover:border-emerald-400 transition-colors cursor-pointer">
            <h3 className="font-semibold text-gray-800 mb-1">Manage Ingredients</h3>
            <p className="text-sm text-gray-600">Update inventory and pricing</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Business Overview</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <span className="text-gray-700">Average Order Value</span>
            <span className="font-semibold text-emerald-600">
              ₹{stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-gray-700">Orders per User</span>
            <span className="font-semibold text-blue-600">
              {stats.totalUsers > 0 ? (stats.totalOrders / stats.totalUsers).toFixed(1) : 0}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <span className="text-gray-700">Pending Rate</span>
            <span className="font-semibold text-purple-600">
              {stats.totalOrders > 0 ? ((stats.pendingOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
