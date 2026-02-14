'use client';

import { useEffect, useState } from 'react';
import { admin } from '@/lib/api';
import { Clock, CheckCircle2, Truck, Package, XCircle, MapPin, Phone } from 'lucide-react';

export default function OrdersSection() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await admin.getOrders();
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await admin.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? res.data.order : o))
      );
    } catch (error) {
      console.error('Failed to update order:', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'confirmed':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'preparing':
        return <Package className="w-4 h-4 text-purple-500" />;
      case 'out-for-delivery':
        return <Truck className="w-4 h-4 text-indigo-500" />;
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="card p-3 flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'pending', label: 'Pending' },
          { id: 'confirmed', label: 'Confirmed' },
          { id: 'preparing', label: 'Preparing' },
          { id: 'out-for-delivery', label: 'Out for Delivery' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === tab.id
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-emerald-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No orders found for this filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="card p-6 hover:shadow-xl transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Order Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Order ID</p>
                      <p className="font-mono text-sm font-semibold text-gray-800">
                        {order._id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className="text-sm font-semibold capitalize text-gray-800">
                        {order.status.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-emerald-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-500">Customer</p>
                        <p className="text-sm font-medium text-gray-800">
                          {order.userId?.name || 'Guest'}
                        </p>
                        <p className="text-sm text-gray-600">{order.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-500">Delivery Address</p>
                        <p className="text-sm text-gray-700">
                          {order.deliveryAddress?.area || order.deliveryAddress?.city || 'Address not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-emerald-100 pt-3">
                    <p className="text-xs text-gray-500 mb-2">Items</p>
                    <ul className="space-y-1">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {item.type === 'bowl'
                              ? item.bowlId?.name || 'Signature Bowl'
                              : 'Custom Bowl'}{' '}
                            <span className="text-gray-500">x{item.quantity}</span>
                          </span>
                          <span className="font-medium text-gray-800">₹{item.price}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                    <span className="text-sm text-gray-600">
                      Ordered: {new Date(order.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span className="text-xl font-bold text-emerald-600">
                      ₹{order.totalPrice}
                    </span>
                  </div>
                </div>

                {/* Status Update */}
                <div className="lg:w-64">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Update Status
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order._id, e.target.value)}
                    disabled={updatingId === order._id}
                    className="w-full input-field text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="out-for-delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {updatingId === order._id && (
                    <p className="text-xs text-emerald-600 mt-2">Updating...</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
