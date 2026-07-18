'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MapPin, Home, User, Phone, CreditCard, Smartphone, Banknote,
  Copy, CheckCircle2, ArrowLeft, Flame, Crown, Plus, Loader2,
  Moon, Clock, X, Navigation, LocateFixed, AlertCircle,
  CheckCheck, AlertTriangle, Sparkles, Bell, Shield,
  Coffee, Gift,
} from 'lucide-react';

import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { orders, profile, expansion, storeStatus as storeApi } from '@/lib/api';

function parseHour(timeStr, fallback) {
  if (!timeStr) return fallback;
  const [h] = timeStr.split(':').map(Number);
  return isNaN(h) ? fallback : h;
}

function formatTime12h(timeStr, fallback = '') {
  if (!timeStr) return fallback;
  const [h, mm] = timeStr.split(':').map(Number);
  if (isNaN(h)) return fallback;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const mins = mm && mm !== 0 ? `:${String(mm).padStart(2, '0')}` : '';
  return `${hour12}${mins} ${suffix}`;
}

function getISTInfo(openHour = 10, closeHour = 22) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const h = ist.getHours();
  const m = ist.getMinutes();
  const isOpen = h >= openHour && h < closeHour;

  // Minutes until next opening
  let minutesUntilOpen;
  if (h < openHour) {
    minutesUntilOpen = (openHour - h) * 60 - m;
  } else {
    minutesUntilOpen = (24 - h + openHour) * 60 - m;
  }

  return {
    isOpen,
    hoursLeft: Math.floor(minutesUntilOpen / 60),
    minsLeft: minutesUntilOpen % 60,
  };
}

const PLATINUM_DISCOUNT = 0.20;
const DELIVERY_FEE = 15;
const UPI_ID = '8210823753@ybl';
const STORE_LAT = 28.437099;
const STORE_LNG = 77.072771;
const DELIVERY_RADIUS_KM = 3;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Delivery Radius Modal ─────────────────────────────────────────────────────
function DeliveryRadiusModal({ modalState, timer, maxTimer, distance, onConfirm, onClose, placing, orderError }) {
  const progress = maxTimer > 0 ? timer / maxTimer : 0;
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const strokeOffset = circumference * (1 - progress);

  const inRadius = modalState === 'in_radius';
  const outRadius = modalState === 'out_radius';
  const isPlacing = modalState === 'placing';
  const isSuccess = modalState === 'success';
  const isError = modalState === 'error';

  const strokeColor = inRadius ? '#22c55e' : '#94a3b8';
  const secondsLeft = maxTimer - timer;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ backdropFilter: 'blur(24px)', backgroundColor: 'rgba(15,23,42,0.55)' }}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[32px] bg-white overflow-hidden"
        style={{
          boxShadow: '0 40px 80px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        {/* Top pill indicator (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-7 pt-5 pb-7">

          {/* ── Placing State ── */}
          {isPlacing && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-5">
                <Loader2 size={34} className="text-brand-500 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1.5">Placing Your Order</h2>
              <p className="text-sm text-gray-500">Hold tight — confirming your order now...</p>
            </div>
          )}

          {/* ── Success State ── */}
          {isSuccess && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-5">
                <CheckCheck size={34} className="text-brand-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1.5">Order Confirmed!</h2>
              <p className="text-sm text-gray-500">Redirecting to your order...</p>
            </div>
          )}

          {/* ── Error State ── */}
          {isError && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5">
                <AlertTriangle size={34} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1.5">Order Failed</h2>
              <p className="text-sm text-red-500 mb-5">{orderError || 'Something went wrong. Please try again.'}</p>
              <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm font-semibold bg-gray-900 text-white">
                Try Again
              </button>
            </div>
          )}

          {/* ── In Radius State ── */}
          {inRadius && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center">
                    <CheckCircle2 size={15} className="text-brand-600" />
                  </div>
                  <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Area Verified</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">{distance?.toFixed(1)} km away</span>
              </div>

              {/* Circular Timer */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-36 h-36">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)' }} />
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Track */}
                    <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
                    {/* Animated progress */}
                    <circle
                      cx="50" cy="50" r={r}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-gray-900 leading-none tabular-nums">{secondsLeft}</span>
                    <span className="text-[11px] font-semibold text-gray-400 mt-1">seconds</span>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1.5">You're in our zone!</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Your location is within our {DELIVERY_RADIUS_KM} km delivery radius. Your order will be placed automatically in <span className="font-semibold text-gray-700">{secondsLeft}s</span>.
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={onConfirm}
                className="w-full py-3.5 rounded-2xl text-sm font-bold bg-gray-900 text-white flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-[0.98] transition-all"
              >
                <Sparkles size={15} />
                Place Order Now
              </button>
              <button
                onClick={onClose}
                className="w-full mt-2.5 py-2.5 rounded-2xl text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {/* ── Out of Radius State ── */}
          {outRadius && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                    <MapPin size={14} className="text-slate-500" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location Check</span>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X size={13} className="text-gray-500" />
                </button>
              </div>

              {/* Circular Timer */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-36 h-36">
                  <div className="absolute inset-0 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(148,163,184,0.07) 0%, transparent 70%)' }} />
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
                    <circle
                      cx="50" cy="50" r={r}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <MapPin size={22} className="text-slate-400 mb-0.5" />
                    <span className="text-xs font-semibold text-slate-400">{distance?.toFixed(1)} km</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">Auto-closing in {secondsLeft}s</p>
              </div>

              {/* Message */}
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Outside Our Zone Right Now</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  We currently deliver within <span className="font-semibold text-gray-700">{DELIVERY_RADIUS_KM} km</span> of our kitchen to guarantee the freshest, fastest experience.
                </p>
              </div>

              {/* Noted card */}
              <div className="rounded-2xl p-4 mb-5" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bell size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-0.5">We've Noted Your Interest</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Your location has been recorded. As we expand our delivery coverage, you'll be among the <span className="font-medium text-gray-700">first to be notified</span>.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                Got it, I'll Wait
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Campaign Banner ───────────────────────────────────────────────────────────
function CampaignBanner({ campaignData }) {
  const remaining = campaignData?.coffeesRemaining ?? 5;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
        <Coffee size={16} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-800">
          🎉 Free {campaignData?.freeItemLabel || 'Coffee'} Added!
        </p>
        <p className="text-[11px] text-amber-600">
          {remaining} of 5 free coffees remaining on your account
        </p>
      </div>
      <Gift size={16} className="text-amber-500 flex-shrink-0" />
    </div>
  );
}

// ─── Main Checkout Page ────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { items, cartTotal, clearCart, updateCampaign, activeCampaign, isPlatinum: cartIsPlatinum } = useCart();
  const { user, isLoggedIn, isPlatinum, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
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
  const [orderingOpen, setOrderingOpen] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hoursLeft: 0, minsLeft: 0 });
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [storeData, setStoreData] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const pendingOrderRef = useRef(false);

  // Campaign free coffee — auto-added to cart via CartContext
  // activeCampaign comes from CartContext (reads localStorage)
  const hasCampaignCoffeeInCart = items.some(i => i.isCampaignCoffee);
  const hasBowlInCart = items.some(item => item.pfCategory !== 'pf-beverages' && !item.isCampaignCoffee && !item.isOfferCoffee);

  // Location capture
  const [geoCoords, setGeoCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [geoGranted, setGeoGranted] = useState(false);

  // Delivery radius modal
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [radiusModalState, setRadiusModalState] = useState('in_radius');
  const [radiusTimer, setRadiusTimer] = useState(0);
  const [radiusTimerMax, setRadiusTimerMax] = useState(10);
  const [orderDistance, setOrderDistance] = useState(null);
  const [orderError, setOrderError] = useState('');
  const radiusIntervalRef = useRef(null);

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

  // Fetch store status from backend (respects admin-configured hours + manual toggle)
  useEffect(() => {
    storeApi.get()
      .then(res => setStoreData(res.data.status))
      .catch(() => setStoreData(null));
  }, []);

  useEffect(() => {
    const openHour  = parseHour(storeData?.openingTime, 10);
    const closeHour = parseHour(storeData?.closingTime, 22);

    const tick = () => {
      const { isOpen, hoursLeft, minsLeft } = getISTInfo(openHour, closeHour);
      // Respect manual admin override: if admin force-closed, always closed
      const effectivelyOpen = storeData?.isOpen === false ? false : isOpen;
      setOrderingOpen(effectivelyOpen);
      setTimeLeft({ hoursLeft, minsLeft });
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [storeData]);

  // Radius timer countdown
  useEffect(() => {
    if (!showRadiusModal || (radiusModalState !== 'in_radius' && radiusModalState !== 'out_radius')) {
      clearInterval(radiusIntervalRef.current);
      return;
    }

    radiusIntervalRef.current = setInterval(() => {
      setRadiusTimer(prev => {
        if (prev >= radiusTimerMax) {
          clearInterval(radiusIntervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(radiusIntervalRef.current);
  }, [showRadiusModal, radiusModalState, radiusTimerMax]);

  // Auto-trigger on timer complete
  useEffect(() => {
    if (!showRadiusModal) return;
    if (radiusModalState === 'in_radius' && radiusTimer >= radiusTimerMax) {
      executeOrder();
    }
    if (radiusModalState === 'out_radius' && radiusTimer >= radiusTimerMax) {
      setShowRadiusModal(false);
    }
  }, [radiusTimer, radiusModalState, showRadiusModal, radiusTimerMax]);

  // Campaign coffee is already priced at ₹0 in cart — no extra discount needed at checkout
  const subtotal = isPlatinum ? Math.round(cartTotal * (1 - PLATINUM_DISCOUNT)) : cartTotal;
  const platinumDiscount = cartTotal - subtotal;
  const campaignDiscount = 0; // free coffee is already ₹0 in cart
  const discountAmt = platinumDiscount;
  const grandTotal = subtotal + DELIVERY_FEE;

  // Shared radius-check + show-modal logic, accepts fresh coords directly
  const runRadiusOrOrder = useCallback((lat, lng) => {
    const dist = haversineKm(STORE_LAT, STORE_LNG, lat, lng);
    setOrderDistance(dist);
    if (dist <= DELIVERY_RADIUS_KM) {
      setRadiusModalState('in_radius');
      setRadiusTimerMax(10);
      setRadiusTimer(0);
    } else {
      setRadiusModalState('out_radius');
      setRadiusTimerMax(30);
      setRadiusTimer(0);
      const addrObj = selectedAddress || form;
      expansion.saveAttempt({
        lat,
        lng,
        address: addrObj.fullAddress || '',
        area: addrObj.area || '',
        city: addrObj.city || '',
        distanceKm: dist,
      }).catch(() => {});
    }
    setShowRadiusModal(true);
  }, [selectedAddress, form]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setGeoCoords({ lat, lng });
        setGeoGranted(true);

        // If triggered from the location-required modal, auto-proceed with order
        if (pendingOrderRef.current) {
          pendingOrderRef.current = false;
          setShowLocationModal(false);
          setGeoLoading(false);
          runRadiusOrOrder(lat, lng);
          return;
        }

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (data?.address) {
            const a = data.address;
            const road = a.road || a.pedestrian || a.residential || '';
            const houseNo = a.house_number || '';
            const suburb = a.suburb || a.neighbourhood || a.village || '';
            const city = a.city || a.town || a.county || '';
            const fullAddress = [houseNo, road].filter(Boolean).join(', ') ||
              (data.display_name || '').split(',').slice(0, 2).join(',').trim();
            setForm(f => ({
              ...f,
              fullAddress: fullAddress || f.fullAddress,
              area: suburb || f.area,
              city: city || f.city,
            }));
          }
        } catch { /* reverse-geocode best-effort */ }
        setGeoLoading(false);
      },
      (err) => {
        pendingOrderRef.current = false;
        setGeoError(
          err.code === 1
            ? 'Location access denied. Please allow location and try again.'
            : 'Unable to detect your location. Enter address manually.'
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2500);
  };

  // Called when "Place Order" button is clicked — check radius first
  const handlePlaceOrderClick = () => {
    const deliveryAddress = selectedAddress
      ? { fullAddress: selectedAddress.fullAddress }
      : { fullAddress: form.fullAddress };

    if (!deliveryAddress.fullAddress?.trim()) {
      setError('Please enter your delivery address');
      return;
    }
    setError('');

    const lat = selectedAddress?.lat ?? geoCoords?.lat;
    const lng = selectedAddress?.lng ?? geoCoords?.lng;

    if (lat != null && lng != null) {
      runRadiusOrOrder(lat, lng);
    } else {
      // No coordinates — require location before placing order
      setShowLocationModal(true);
    }
  };

  // Actually place the order via API
  const executeOrder = async () => {
    clearInterval(radiusIntervalRef.current);
    setRadiusModalState('placing');
    setPlacing(true);
    setOrderError('');

    const deliveryAddress = selectedAddress
      ? {
          label: selectedAddress.label,
          fullAddress: selectedAddress.fullAddress,
          area: selectedAddress.area,
          city: selectedAddress.city,
          landmark: selectedAddress.landmark,
          // Prefer saved-address coords; fall back to GPS captured via location modal
          lat: selectedAddress.lat ?? geoCoords?.lat,
          lng: selectedAddress.lng ?? geoCoords?.lng,
        }
      : {
          label: form.label,
          fullAddress: form.fullAddress,
          area: form.area,
          city: form.city,
          landmark: form.landmark,
          lat: geoCoords?.lat ?? undefined,
          lng: geoCoords?.lng ?? undefined,
        };

    try {
      const orderItems = items.map(item => ({
        type: 'bowl',
        bowlId: item.isCampaignCoffee || item.isOfferCoffee ? undefined : item._id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        // Campaign & offer coffees are always ₹0 / ₹79 respectively — no platinum discount applied to them
        price: item.isCampaignCoffee ? 0
             : item.isOfferCoffee ? item.price
             : isPlatinum ? Math.round(item.price * (1 - PLATINUM_DISCOUNT)) : item.price,
      }));

      const res = await orders.create({
        items: orderItems,
        deliveryAddress,
        totalPrice: subtotal - campaignDiscount,
        discountAmount: discountAmt,
        deliveryFee: DELIVERY_FEE,
        isPlatinumOrder: isPlatinum,
        paymentMethod,
        customerName: name,
        campaignCode: (activeCampaign && hasCampaignCoffeeInCart && hasBowlInCart) ? activeCampaign.code : undefined,
      });

      if (form.saveAddress && !selectedAddress) {
        await profile.addAddress({ ...form, isDefault: savedAddresses.length === 0 }).catch(() => {});
      }

      // Update campaign coffees remaining from server response
      if (res.data.campaign) {
        updateCampaign(res.data.campaign.coffeesRemaining);
      }

      setRadiusModalState('success');
      setOrderPlaced(true);
      setTimeout(() => {
        setShowRadiusModal(false);
        router.push(`/order-success/${res.data.order._id}`);
        clearCart();
      }, 1200);
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to place order. Please try again.';
      setOrderError(msg);
      setRadiusModalState('error');
      setError(msg);
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

                  {/* ── Location detect button ── */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={geoLoading}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                        geoGranted
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-dashed border-brand-300 bg-brand-50/60 text-brand-600 hover:border-brand-400 hover:bg-brand-50'
                      } disabled:opacity-60`}
                    >
                      {geoLoading ? (
                        <><Loader2 size={15} className="animate-spin" /> Detecting location...</>
                      ) : geoGranted ? (
                        <><CheckCircle2 size={15} /> Location detected</>
                      ) : (
                        <><LocateFixed size={15} /> Use my current location</>
                      )}
                    </button>
                    {geoGranted && geoCoords && (
                      <p className="text-[11px] text-brand-600 flex items-center gap-1">
                        <Navigation size={10} />
                        {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)} — address auto-filled below
                      </p>
                    )}
                    {geoError && (
                      <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {geoError}
                      </div>
                    )}
                  </div>

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
                    <li className="flex gap-2"><span className="font-bold text-brand-600">2.</span> Pay <strong>₹{grandTotal}</strong> to the UPI ID below</li>
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

              {/* Campaign banner */}
              {activeCampaign && hasCampaignCoffeeInCart && (
                <div className="mb-4">
                  <CampaignBanner campaignData={activeCampaign} hasBowl={hasBowlInCart} />
                </div>
              )}

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
                    <span>−₹{platinumDiscount}</span>
                  </div>
                )}
                {hasCampaignCoffeeInCart && (
                  <div className="flex justify-between text-sm text-amber-600 font-medium">
                    <span className="flex items-center gap-1"><Coffee size={12} /> Free Coffee (Campaign)</span>
                    <span className="text-green-600 font-bold">FREE</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery</span>
                  <span>₹{DELIVERY_FEE}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-surface-100">
                  <span>Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>

              {isPlatinum && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-orange-50 rounded-xl">
                  <Crown size={13} className="text-platinum-500" />
                  <p className="text-xs text-orange-700 font-medium">Platinum savings: ₹{discountAmt}</p>
                </div>
              )}

              {orderingOpen ? (
                <button
                  onClick={handlePlaceOrderClick}
                  disabled={placing}
                  className="btn-primary w-full mt-5 text-base py-3.5"
                >
                  {placing ? (
                    <><Loader2 size={18} className="animate-spin" /> Placing Order...</>
                  ) : (
                    `Place Order — ₹${grandTotal}`
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowClosedModal(true)}
                  className="w-full mt-5 py-3.5 rounded-2xl text-base font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer bg-slate-100 text-slate-400 border-2 border-slate-200 hover:bg-slate-200 hover:border-slate-300 hover:text-slate-500"
                >
                  <Moon size={17} />
                  Kitchen is Closed
                </button>
              )}

              {!orderingOpen && (
                <p className="text-center text-xs text-slate-400 mt-2.5 flex items-center justify-center gap-1.5">
                  <Clock size={11} />
                  Open daily {formatTime12h(storeData?.openingTime, '10:00 AM')} – {formatTime12h(storeData?.closingTime, '10:00 PM')} IST
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Radius Modal */}
      {showRadiusModal && (
        <DeliveryRadiusModal
          modalState={radiusModalState}
          timer={radiusTimer}
          maxTimer={radiusTimerMax}
          distance={orderDistance}
          onConfirm={executeOrder}
          onClose={() => {
            if (radiusModalState === 'error' || radiusModalState === 'out_radius') {
              clearInterval(radiusIntervalRef.current);
              setShowRadiusModal(false);
            }
          }}
          placing={placing}
          orderError={orderError}
        />
      )}

      {/* Closed Modal */}
      {showClosedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(15,23,42,0.65)' }}
          onClick={() => setShowClosedModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, #818cf8 0%, transparent 70%)', filter: 'blur(20px)' }} />

            <button
              onClick={() => setShowClosedModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-10"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <X size={15} className="text-slate-300" />
            </button>

            <div className="px-8 pt-10 pb-8 text-center relative">
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #312e81, #1e1b4b)', boxShadow: '0 0 40px rgba(129,140,248,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                <Moon size={34} className="text-indigo-300" strokeWidth={1.5} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Kitchen is Closed</h2>
              <p className="text-indigo-300 text-sm mb-7">We&apos;ll be back at <span className="font-semibold text-indigo-200">{formatTime12h(storeData?.openingTime, '10:00 AM')} IST</span></p>

              <div className="rounded-2xl px-6 py-4 mb-6 mx-auto"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-medium">Time until we open</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-white tabular-nums leading-none"
                      style={{ textShadow: '0 0 20px rgba(129,140,248,0.5)' }}>
                      {String(timeLeft.hoursLeft).padStart(2, '0')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5 font-medium">hours</p>
                  </div>
                  <p className="text-3xl font-light text-indigo-400 mb-4">:</p>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-white tabular-nums leading-none"
                      style={{ textShadow: '0 0 20px rgba(129,140,248,0.5)' }}>
                      {String(timeLeft.minsLeft).padStart(2, '0')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5 font-medium">mins</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="h-px flex-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Clock size={11} className="text-indigo-400" />
                  Open {formatTime12h(storeData?.openingTime, '10 AM')} – {formatTime12h(storeData?.closingTime, '10 PM')} IST · Every day
                </div>
                <div className="h-px flex-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <button
                onClick={() => setShowClosedModal(false)}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-indigo-200 transition-all duration-200 hover:text-white"
                style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.35)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
              >
                Got it, see you soon!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Required Modal */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15,23,42,0.5)' }}
          onClick={() => { if (!geoLoading) setShowLocationModal(false); }}
        >
          <div
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }} />

            {/* Close button */}
            {!geoLoading && (
              <button
                onClick={() => setShowLocationModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
              >
                <X size={14} className="text-gray-500" />
              </button>
            )}

            {/* Illustration */}
            <div className="px-8 pt-8 pb-4 flex justify-center" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)' }}>
              <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-44 h-36">
                {/* Map card background */}
                <rect x="10" y="10" width="180" height="140" rx="16" fill="#f0fdf4" />

                {/* Grid lines */}
                <g stroke="#d1fae5" strokeWidth="0.8">
                  <line x1="50" y1="10" x2="50" y2="150" />
                  <line x1="100" y1="10" x2="100" y2="150" />
                  <line x1="150" y1="10" x2="150" y2="150" />
                  <line x1="10" y1="50" x2="190" y2="50" />
                  <line x1="10" y1="90" x2="190" y2="90" />
                  <line x1="10" y1="130" x2="190" y2="130" />
                </g>

                {/* Roads */}
                <path d="M10,80 Q70,65 100,80 Q130,95 190,80" stroke="#bbf7d0" strokeWidth="9" fill="none" strokeLinecap="round" />
                <path d="M95,10 Q100,55 100,80 Q100,105 92,150" stroke="#bbf7d0" strokeWidth="7" fill="none" strokeLinecap="round" />

                {/* Road center dashes */}
                <path d="M10,80 Q70,65 100,80 Q130,95 190,80" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="8 8" />

                {/* Pulse rings */}
                <circle cx="100" cy="72" r="44" fill="#10b981" opacity="0.07">
                  <animate attributeName="r" values="36;46;36" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.1;0.04;0.1" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="72" r="30" fill="#10b981" opacity="0.11">
                  <animate attributeName="r" values="24;32;24" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.15;0.07;0.15" dur="2.4s" repeatCount="indefinite" />
                </circle>

                {/* Pin shadow */}
                <ellipse cx="100" cy="114" rx="14" ry="4" fill="#10b981" opacity="0.2" />

                {/* Pin body */}
                <path d="M100,36 C85,36 74,47 74,61 C74,79 100,112 100,112 C100,112 126,79 126,61 C126,47 115,36 100,36Z" fill="#10b981" />
                <path d="M100,36 C85,36 74,47 74,61 C74,79 100,112 100,112 C100,112 126,79 126,61 C126,47 115,36 100,36Z" fill="url(#pinGrad)" />

                {/* Pin inner white circle */}
                <circle cx="100" cy="61" r="13" fill="white" />

                {/* Location dot inside pin */}
                <circle cx="100" cy="61" r="5.5" fill="#059669" />

                {/* Small building icons on map */}
                <rect x="28" y="40" width="14" height="12" rx="2" fill="#a7f3d0" />
                <rect x="31" y="36" width="8" height="6" rx="1" fill="#6ee7b7" />
                <rect x="155" y="95" width="12" height="10" rx="2" fill="#a7f3d0" />
                <rect x="158" y="91" width="6" height="6" rx="1" fill="#6ee7b7" />
                <rect x="32" y="100" width="10" height="8" rx="1.5" fill="#bbf7d0" />
                <rect x="158" y="40" width="16" height="14" rx="2" fill="#a7f3d0" />
                <rect x="161" y="35" width="10" height="7" rx="1" fill="#6ee7b7" />

                <defs>
                  <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Text content */}
            <div className="px-8 pb-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Your Spot</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                We need your precise location to route your order accurately and ensure it reaches you on time.
              </p>

              {/* Location error if any */}
              {geoError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-left">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{geoError}</p>
                </div>
              )}

              {/* Allow Location button */}
              <button
                onClick={() => {
                  pendingOrderRef.current = true;
                  setGeoError('');
                  detectLocation();
                }}
                disabled={geoLoading}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 mb-3"
                style={{ background: geoLoading ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #059669)', boxShadow: geoLoading ? 'none' : '0 4px 14px rgba(16,185,129,0.35)' }}
              >
                {geoLoading ? (
                  <><Loader2 size={15} className="animate-spin" /> Detecting location…</>
                ) : (
                  <><LocateFixed size={15} /> Share My Location</>
                )}
              </button>

              {/* Privacy note */}
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                <Shield size={11} className="text-emerald-400" />
                Only used for delivery · Never stored without consent
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
