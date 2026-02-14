'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, Truck, Utensils } from 'lucide-react';

const statusIcon = (status) => {
  switch (status) {
    case 'pending':
    case 'confirmed':
    case 'preparing':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'out-for-delivery':
      return <Truck className="w-4 h-4 text-blue-500" />;
    case 'delivered':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    default:
      return <Utensils className="w-4 h-4 text-gray-400" />;
  }
};

export default function OrdersPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔒 MOCK DATA (no backend required)
    const mockOrders = [
      {
        _id: 'ORD-10231',
        status: 'delivered',
        createdAt: new Date().toISOString(),
        totalPrice: 420,
        deliveryAddress: { area: 'Indiranagar', city: 'Bangalore' },
        items: [
          {
            type: 'bowl',
            quantity: 1,
            price: 280,
            bowlId: { name: 'High Protein Chicken Bowl' },
          },
          {
            type: 'custom',
            quantity: 1,
            price: 140,
          },
        ],
      },
      {
        _id: 'ORD-10232',
        status: 'preparing',
        createdAt: new Date().toISOString(),
        totalPrice: 310,
        deliveryAddress: { city: 'Bangalore' },
        items: [
          {
            type: 'bowl',
            quantity: 1,
            price: 310,
            bowlId: { name: 'Vegan Macro Bowl' },
          },
        ],
      },
    ];

    setTimeout(() => {
      setData(mockOrders);
      setLoading(false);
    }, 600);
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">Your Orders</h1>
      <p className="text-gray-600 mb-8">
        Track your current orders and revisit your macro-perfect bowl history.
      </p>

      {data.length === 0 ? (
        <p className="text-gray-500">You haven’t placed any orders yet.</p>
      ) : (
        <div className="space-y-4">
          {data.map((order) => (
            <div
              key={order._id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500">
                    Order ID: <span className="font-mono">{order._id}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Placed on:{' '}
                    {new Date(order.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon(order.status)}
                  <span className="text-sm font-semibold capitalize text-gray-800">
                    {order.status.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="border-t border-emerald-100 pt-3 mt-3">
                <ul className="text-sm text-gray-700 space-y-1">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>
                        {item.type === 'bowl'
                          ? item.bowlId?.name
                          : 'Custom bowl'}
                      </span>
                      <span className="text-gray-500">
                        x{item.quantity} • ₹{item.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-500">
                  To:{' '}
                  {order.deliveryAddress?.area ||
                    order.deliveryAddress?.city ||
                    'Your address'}
                </span>
                <span className="text-lg font-bold text-emerald-600">
                  ₹{order.totalPrice}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
