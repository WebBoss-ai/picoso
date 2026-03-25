'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MapPin, Home, User, Phone, CreditCard, Smartphone, Banknote,
  Copy, CheckCircle2, ArrowLeft, Flame, Crown, Plus, Loader2
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { orders, profile } from '@/lib/api';

const PLATINUM_DISCOUNT = 0.20;
const UPI_ID = '8210823753@ybl';

export default function CheckoutPage() {
  const { items, cartTotal, clearCart, isPlatinum: cartIsPlatinum } = useCart();
  const { user, isLoggedIn, isPlatinum, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1); // 1: address, 2: payment
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [form, setForm] = useState({
    fullAddress: '',
    area: '',
    city: '',
    landmark: '',
    label: 'Home',
    saveAddress: false,
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [upiCopied, setUpiCopied] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.replace('/'); return; }
    if (items.length === 0 && !orderPlaced) { router.replace('/menu'); return; }

    setName(user?.name || '');
    setPhone(user?.phone || '');

    profile.get().then(res => {
      const addrs = res.data.user?.savedAddresses || [];
      setSavedAddresses(addrs);
      const def = addrs.find(a => a.isDefault);
      if (def) { setSelectedAddress(def); }
    }).catch(() => {});
  }, [isLoggedIn, authLoading, user, items.length, orderPlaced, router]);

  const subtotal = isPlatinum ? Math.round(cartTotal * (1 - PLATINUM_DISCOUNT)) : cartTotal;
  const discountAmt = cartTotal - subtotal;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2500);
  };

  const handlePlaceOrder = async () => {
    const deliveryAddress = selectedAddress
      ? { label: selectedAddress.label, fullAddress: selectedAddress.fullAddress, area: selectedAddress.area, city: selectedAddress.city, landmark: selectedAddress.landmark }
      : { label: form.label, fullAddress: form.fullAddress, area: form.area, city: form.city, landmark: form.landmark };

    if (!deliveryAddress.fullAddress.trim()) {
      setError('Please enter your delivery address');
      return;
    }

    setPlacing(true);
    setError('');

    try {
      const orderItems = items.map(item => ({
        type: 'bowl',
        bowlId: item._id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        price: isPlatinum ? Math.round(item.price * (1 - PLATINUM_DISCOUNT)) : item.price,
      }));

      const res = await orders.create({
        items: orderItems,
        deliveryAddress,
        totalPrice: subtotal,
        discountAmount: discountAmt,
        deliveryFee: 0,
        isPlatinumOrder: isPlatinum,
        paymentMethod,
        customerName: name,
      });

      if (form.saveAddress && !selectedAddress) {
        await profile.addAddress({ ...form, isDefault: savedAddresses.length === 0 }).catch(() => {});
      }

      setOrderPlaced(true);
      router.push(`/order-success/${res.data.order._id}`);
      clearCart();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  if (!isLoggedIn || items.length === 0) return null;

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
            <p className="text-xs text-gray-500">{items.length} item{items.length > 1 ? 's' : ''} in order</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-3 space-y-5">

            {/* Step 1: Address */}
            <div className="card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="font-bold text-gray-900">Delivery Address</h2>
              </div>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Saved Addresses</p>
                  <div className="space-y-2">
                    {savedAddresses.map(addr => (
                      <button
                        key={addr._id}
                        onClick={() => setSelectedAddress(addr)}
                        className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all duration-150 ${
                          selectedAddress?._id === addr._id
                            ? 'border-brand-400 bg-brand-50'
                            : 'border-surface-200 hover:border-brand-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selectedAddress?._id === addr._id ? 'bg-brand-100' : 'bg-surface-100'
                        }`}>
                          <Home size={14} className={selectedAddress?._id === addr._id ? 'text-brand-600' : 'text-gray-400'} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{addr.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{addr.fullAddress}{addr.landmark ? `, ${addr.landmark}` : ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setSelectedAddress(null)}
                    className="flex items-center gap-1.5 text-xs text-brand-600 font-medium mt-3 hover:underline"
                  >
                    <Plus size={13} /> Add new address
                  </button>
                </div>
              )}

              {/* New address form */}
              {(!selectedAddress) && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Full Address *</label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                      <input
                        className="input-field pl-10"
                        placeholder="Flat no, building name, street..."
                        value={form.fullAddress}
                        onChange={e => setForm(f => ({ ...f, fullAddress: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Area</label>
                      <input className="input-field" placeholder="Area / Locality"
                        value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">City</label>
                      <input className="input-field" placeholder="City"
                        value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Landmark (optional)</label>
                    <input className="input-field" placeholder="Near hospital, school..."
                      value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Label</label>
                    <div className="flex gap-2">
                      {['Home', 'Work', 'Other'].map(l => (
                        <button
                          key={l}
                          onClick={() => setForm(f => ({ ...f, label: l }))}
                          className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            form.label === l
                              ? 'bg-brand-500 text-white border-brand-500'
                              : 'bg-white text-gray-600 border-surface-200 hover:border-brand-300'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.saveAddress}
                      onChange={e => setForm(f => ({ ...f, saveAddress: e.target.checked }))}
                      className="w-4 h-4 rounded accent-brand-500"
                    />
                    <span className="text-sm text-gray-600">Save this address for future orders</span>
                  </label>
                </div>
              )}
            </div>

            {/* Step 2: Contact */}
            <div className="card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="font-bold text-gray-900">Contact Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input className="input-field pl-10" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Phone</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input className="input-field pl-10" placeholder="Phone" value={phone} readOnly />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Payment */}
            <div className="card p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <h2 className="font-bold text-gray-900">Payment Method</h2>
              </div>

              <div className="space-y-3 mb-4">
                {/* UPI */}
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'upi' ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:border-brand-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'upi' ? 'bg-brand-100' : 'bg-surface-100'}`}>
                    <Smartphone size={18} className={paymentMethod === 'upi' ? 'text-brand-600' : 'text-gray-400'} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900 text-sm">Pay via UPI</p>
                    <p className="text-xs text-gray-500">GPay, PhonePe, Paytm, any UPI app</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'upi' ? 'border-brand-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'upi' && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                  </div>
                </button>

                {/* COD */}
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'cod' ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:border-brand-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'cod' ? 'bg-brand-100' : 'bg-surface-100'}`}>
                    <Banknote size={18} className={paymentMethod === 'cod' ? 'text-brand-600' : 'text-gray-400'} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900 text-sm">Cash on Delivery</p>
                    <p className="text-xs text-gray-500">Pay when your order arrives</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'cod' ? 'border-brand-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                  </div>
                </button>
              </div>

              {/* UPI details */}
              {paymentMethod === 'upi' && (
                <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">UPI Payment Instructions</p>
                  <ol className="text-sm text-gray-600 space-y-2 mb-4">
                    <li className="flex gap-2"><span className="font-bold text-brand-600">1.</span> Open your UPI app (GPay / PhonePe / Paytm)</li>
                    <li className="flex gap-2"><span className="font-bold text-brand-600">2.</span> Pay <strong>₹{subtotal}</strong> to the UPI ID below</li>
                    <li className="flex gap-2"><span className="font-bold text-brand-600">3.</span> Place your order — we'll confirm once payment is verified</li>
                  </ol>
                  <div className="flex items-center gap-3 bg-white rounded-xl border border-brand-200 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-0.5">UPI ID</p>
                      <p className="font-bold text-gray-900 text-lg tracking-wide">{UPI_ID}</p>
                    </div>
                    <button
                      onClick={handleCopyUPI}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        upiCopied ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-gray-600 hover:bg-surface-200'
                      }`}
                    >
                      {upiCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {upiCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-2">
            <div className="card p-5 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto scrollbar-hide">
                {items.map(item => (
                  <div key={item._id} className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-surface-100 overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Flame size={16} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{(isPlatinum ? Math.round(item.price * (1 - PLATINUM_DISCOUNT)) : item.price) * item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-surface-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                {isPlatinum && (
                  <div className="flex justify-between text-sm text-brand-600 font-medium">
                    <span className="flex items-center gap-1"><Crown size={12} /> Platinum 20% off</span>
                    <span>−₹{discountAmt}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-brand-600 font-medium">
                  <span>Delivery</span>
                  <span>FREE</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-surface-100">
                  <span>Total</span>
                  <span>₹{subtotal}</span>
                </div>
              </div>

              {isPlatinum && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-orange-50 rounded-xl">
                  <Crown size={13} className="text-platinum-500" />
                  <p className="text-xs text-orange-700 font-medium">Platinum savings: ₹{discountAmt}</p>
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="btn-primary w-full mt-5 text-base py-3.5"
              >
                {placing ? (
                  <><Loader2 size={18} className="animate-spin" /> Placing Order...</>
                ) : (
                  `Place Order — ₹${subtotal}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
