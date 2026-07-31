'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  X, Plus, Minus, ShoppingBag, ArrowRight,
  Trash2, Crown, Coffee, Zap, CheckCircle2, GlassWater,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { bowls as bowlsApi, storeStatus as storeApi, auth as authApi } from '@/lib/api';
import StoreClosedPoster from '@/components/StoreClosedPoster';

const PLATINUM_DISCOUNT = 0.20;
const DELIVERY_FEE      = 15;
const COFFEE_PRICE      = 79;
const COKE_PRICE        = 39;

const isCokeName   = (name = '') => name.toLowerCase() === 'coke';
const isCoffee     = (item) => item?.pfCategory === 'pf-beverages' && !isCokeName(item?.name);
const COFFEE_EXCL  = ['iced mocha', 'macchiato'];
const isExcluded   = (name = '') => COFFEE_EXCL.some(ex => name.toLowerCase().includes(ex));

const COFFEE_GRADIENTS = [
  ['#fef3c7','#fde68a'],
  ['#fff7ed','#fed7aa'],
  ['#fdf4ff','#e9d5ff'],
  ['#f0fdf4','#bbf7d0'],
  ['#eff6ff','#bfdbfe'],
];

function cartDbg(step, data) {
  const payload = data === undefined ? '' : data;
  // eslint-disable-next-line no-console
  console.log(`%c[CartFlow] ${step}`, 'color:#0B5C3A;font-weight:bold', payload);
}

// Volume badge shown on every coffee item — no emoji, uses Coffee icon
function VolumeBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
      <Coffee size={8} strokeWidth={2.5} /> 450–500 ml
    </span>
  );
}

export default function CartDrawer({ onAuthRequired }) {
  const { items, addItem, removeItem, updateQty, cartTotal, cartCount, isOpen, setIsOpen } = useCart();
  const { isPlatinum, isLoggedIn, user, login } = useAuth();
  const router = useRouter();

  const [coffeeOffers,    setCoffeeOffers]   = useState([]);
  const [cokeProduct,     setCokeProduct]    = useState(null);
  const [store,           setStore]          = useState(null);
  // Closed checkout panel state
  const [showClosed,      setShowClosed]     = useState(false);
  const [notifyPhone,     setNotifyPhone]    = useState('');
  const [notifyDone,      setNotifyDone]     = useState(false);
  const [notifySend,      setNotifySend]     = useState(false);
  const [adminSent,       setAdminSent]      = useState(false); // prevent double-send
  const [lastStatusFetch, setLastStatusFetch] = useState(null);

  const openClosedPoster = (reason = 'unknown') => {
    cartDbg('OPEN_CLOSED_POSTER', { reason, items: items.length, cartTotal });
    setShowClosed(true);
    setIsOpen(false);
    if (!adminSent && items.length > 0) {
      setAdminSent(true);
      storeApi.saveClosedCheckout({
        phone: isLoggedIn ? (user?.phone || '') : '',
        userId: user?._id || null,
        items: items.map(i => ({ name: i.name, price: i.price, qty: i.quantity })),
        total: cartTotal,
      })
        .then(() => cartDbg('closed-checkout saved OK'))
        .catch((err) => cartDbg('closed-checkout save FAIL', err?.message || err));
    }
  };

  // Prefetch store status on mount
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api';
    cartDbg('MOUNT prefetch store status', { apiBase });
    storeApi.get()
      .then(res => {
        const status = res?.data?.status ?? { isOpen: true };
        cartDbg('MOUNT status OK', {
          isOpen: status.isOpen,
          typeofIsOpen: typeof status.isOpen,
          raw: status,
        });
        setStore(status);
        setLastStatusFetch({ at: new Date().toISOString(), source: 'mount', isOpen: status.isOpen });
      })
      .catch((err) => {
        cartDbg('MOUNT status FAIL → default OPEN', err?.message || err);
        setStore({ isOpen: true });
        setLastStatusFetch({ at: new Date().toISOString(), source: 'mount-fail', isOpen: true });
      });
  }, []);

  // When cart opens: if store OPEN → keep drawer; if CLOSED → closed poster
  useEffect(() => {
    cartDbg('isOpen changed', { isOpen, showClosed, storeIsOpen: store?.isOpen });
    if (!isOpen) return;

    let cancelled = false;
    cartDbg('CART OPENED → fetching fresh store status…');
    storeApi.get()
      .then(res => {
        if (cancelled) {
          cartDbg('CART OPEN fetch ignored (cancelled)');
          return;
        }
        const status = res?.data?.status ?? null;
        cartDbg('CART OPEN status response', {
          isOpen: status?.isOpen,
          strictClosed: status && status.isOpen === false,
          full: status,
          resDataKeys: res?.data ? Object.keys(res.data) : [],
        });
        setStore(status);
        setLastStatusFetch({ at: new Date().toISOString(), source: 'cart-open', isOpen: status?.isOpen });

        if (status && status.isOpen === false) {
          cartDbg('STORE CLOSED → switching to closed poster');
          openClosedPoster('auto-on-cart-open');
        } else {
          cartDbg('STORE OPEN (or unknown) → clearing showClosed, keeping drawer', {
            willClearShowClosed: showClosed,
          });
          setShowClosed(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        cartDbg('CART OPEN status FAIL → treat as OPEN, show drawer', err?.message || err);
        setStore({ isOpen: true });
        setShowClosed(false);
        setLastStatusFetch({ at: new Date().toISOString(), source: 'cart-open-fail', isOpen: true });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    cartDbg('STATE snapshot', {
      isOpen,
      showClosed,
      storeIsOpen: store?.isOpen,
      cartCount,
      items: items.length,
      coffeeOffers: coffeeOffers.length,
      isLoggedIn,
      lastStatusFetch,
      renderPath: showClosed && !isOpen
        ? 'CLOSED_POSTER'
        : !isOpen
          ? 'NULL (hidden)'
          : 'DRAWER',
    });
  }, [isOpen, showClosed, store, cartCount, items.length, coffeeOffers.length, isLoggedIn, lastStatusFetch]);

  const submitNotify = async (phoneOverride, location = {}) => {
    const phone = String(phoneOverride ?? notifyPhone).trim().replace(/\D/g, '').slice(-10);
    cartDbg('submitNotify start', { phone, location, isLoggedIn });
    if (!phone || phone.length < 10) {
      cartDbg('submitNotify abort — bad phone');
      return;
    }
    if (phone !== notifyPhone) setNotifyPhone(phone);
    setNotifySend(true);
    try {
      let userId = user?.id || user?._id || null;

      if (!isLoggedIn || (user?.phone && user.phone !== phone)) {
        cartDbg('background login…');
        const authRes = await authApi.verifyOTP(phone, '0000');
        const { token, user: authUser } = authRes.data || {};
        if (token && authUser) {
          login(token, authUser);
          userId = authUser.id || authUser._id || null;
          cartDbg('background login OK', { userId });
        } else {
          cartDbg('background login missing token/user', authRes?.data);
        }
      }

      const notifyRes = await storeApi.notifyMe({
        phone,
        userId,
        source: 'closed_store_bounty',
        lat: location.lat ?? null,
        lng: location.lng ?? null,
        address: location.address || '',
        area: location.area || '',
        city: location.city || '',
        pincode: location.pincode || '',
      });
      cartDbg('notifyMe OK', notifyRes?.data);
      setNotifyDone(true);
      setTimeout(() => {
        cartDbg('redirect → /menu');
        setShowClosed(false);
        setNotifyDone(false);
        setNotifyPhone('');
        setAdminSent(false);
        router.push('/menu');
      }, 600);
    } catch (err) {
      cartDbg('notifyMe FAIL', err?.response?.data || err?.message || err);
    }
    setNotifySend(false);
  };

  // Fetch beverages + Coke once
  useEffect(() => {
    cartDbg('fetching bowls for coffee offers…');
    bowlsApi.getAll().then(res => {
      const all = res.data.bowls || [];
      const coffees = all.filter(b => b.pfCategory === 'pf-beverages' && !isCokeName(b.name) && !isExcluded(b.name));
      const coke = all.find(b => isCokeName(b.name)) || null;
      cartDbg('bowls loaded', { total: all.length, coffees: coffees.length, hasCoke: !!coke });
      setCoffeeOffers(coffees);
      setCokeProduct(coke);
    }).catch((err) => cartDbg('bowls FAIL', err?.message || err));
  }, []);

  useEffect(() => {
    document.body.style.overflow = (isOpen || showClosed) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, showClosed]);

  const dismissClosedToMenu = () => {
    cartDbg('Explore menu → clear closed + /menu');
    setShowClosed(false);
    setNotifyPhone('');
    setNotifyDone(false);
    router.push('/menu');
  };

  // ── All hooks must be above this line ─────────────────────────────────────

  // Closed poster only when cart is NOT open (openClosedPoster sets isOpen false).
  // If isOpen is true, always prefer the drawer path so "store opened" works.
  if (showClosed && !isOpen) {
    cartDbg('RENDER → StoreClosedPoster');
    return (
      <StoreClosedPoster
        notifyPhone={notifyPhone}
        setNotifyPhone={setNotifyPhone}
        notifyDone={notifyDone}
        notifySend={notifySend}
        onNotify={submitNotify}
        placeholderPhone={isLoggedIn && user?.phone ? user.phone : ''}
        onExploreMenu={dismissClosedToMenu}
      />
    );
  }

  if (!isOpen) {
    return null;
  }

  cartDbg('RENDER → normal Cart DRAWER', {
    storeIsOpen: store?.isOpen,
    items: items.length,
    coffeeOffers: coffeeOffers.length,
  });

  const realItems  = items.filter(i => !i.isOfferCoffee && !i.name?.toLowerCase().includes('cappuccino'));
  const hasReal    = realItems.length > 0;

  const platinumTotal = Math.round(cartTotal * (1 - PLATINUM_DISCOUNT));
  const savings       = cartTotal - platinumTotal;

  const handleCheckout = async () => {
    cartDbg('Proceed to Checkout clicked', {
      store,
      storeIsOpen: store?.isOpen,
      isLoggedIn,
      items: items.length,
    });

    let status = store;
    try {
      const res = await storeApi.get();
      status = res?.data?.status ?? status;
      setStore(status);
      cartDbg('checkout-time status', { isOpen: status?.isOpen, status });
    } catch (err) {
      cartDbg('checkout-time status FAIL', err?.message || err);
    }

    if (status && status.isOpen === false) {
      cartDbg('checkout blocked — store closed');
      openClosedPoster('checkout-click');
      return;
    }

    if (!isLoggedIn) {
      cartDbg('checkout → auth required');
      setIsOpen(false);
      onAuthRequired?.('checkout');
      return;
    }
    cartDbg('checkout → /checkout');
    setIsOpen(false);
    router.push('/checkout');
  };

  const toggleOffer = (product, offerPrice) => {
    const inCart = items.find(i => i._id === product._id);
    if (inCart) { removeItem(product._id); return; }
    addItem({ ...product, price: offerPrice, isOfferCoffee: true }, 1);
  };

  return (
    <>
      <div className="drawer-overlay" onClick={() => { cartDbg('overlay click → close drawer'); setIsOpen(false); }} />
      <div className="drawer relative">

        {/* Debug strip — remove later */}
        <div className="px-3 py-1.5 bg-black text-[10px] font-mono text-lime-300 leading-tight break-all">
          DBG drawer | store.isOpen={String(store?.isOpen)} | showClosed={String(showClosed)} | items={items.length} | coffee={coffeeOffers.length} | {lastStatusFetch?.source}@{lastStatusFetch?.at || '—'}
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} className="text-brand-600" />
            <span className="font-bold text-gray-900">Your Cart</span>
            {cartCount > 0 && (
              <span className="w-5 h-5 bg-brand-100 text-brand-700 text-xs font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <button onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
              <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center">
                <ShoppingBag size={32} className="text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">Your cart is empty</p>
              <p className="text-sm text-gray-400">Add items from the menu to get started</p>
              <button onClick={() => setIsOpen(false)} className="btn-primary mt-2">Browse Menu</button>
            </div>
          ) : (
            <>
              {/* ── Cart items ── */}
              <div className="p-4 space-y-3">
                {items.map(item => {
                  const itemPlatinumPrice = Math.round(item.price * (1 - PLATINUM_DISCOUNT));
                  const displayPrice = isPlatinum ? itemPlatinumPrice : item.price;
                  const isOffer  = item.isOfferCoffee;
                  const isCoffeeRow = item?.pfCategory === 'pf-beverages'; // all beverages get volume badge
                  const isCokeRow   = isCokeName(item.name);

                  return (
                    <div key={item._id + (isOffer ? '-offer' : '')}
                      className={`flex gap-3 p-3 rounded-xl ${isOffer ? 'bg-amber-50 border border-amber-100' : 'bg-surface-50'}`}>

                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-100 flex-shrink-0 relative">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                            <Coffee size={22} className="text-amber-500" />
                          </div>
                        )}
                        {isOffer && (
                          <div className="absolute bottom-0 inset-x-0 bg-amber-500 text-white text-[7px] font-black text-center py-0.5">
                            {isCokeRow ? '₹39 OFFER' : '₹79 OFFER'}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">{item.name}</p>
                          {isOffer && (
                            <span className="flex-shrink-0 text-[8px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              OFFER
                            </span>
                          )}
                        </div>

                        {/* Price first, then 450-500ml badge inline for coffee */}
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">₹{displayPrice}</span>
                          {isOffer && item.originalPrice && item.originalPrice > item.price && (
                            <span className="text-xs text-gray-400 line-through">₹{item.originalPrice}</span>
                          )}
                          {isPlatinum && !isOffer && (
                            <span className="text-xs text-gray-400 line-through">₹{item.price}</span>
                          )}
                          {isCoffeeRow && <VolumeBadge />}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 bg-white rounded-lg border border-surface-200 px-1 py-0.5">
                            <button onClick={() => updateQty(item._id, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center text-brand-600 hover:text-brand-800 transition-colors">
                              {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                            </button>
                            <span className="text-sm font-bold text-gray-900 min-w-[16px] text-center">{item.quantity}</span>
                            <button onClick={() => updateQty(item._id, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center text-brand-600 hover:text-brand-800 transition-colors">
                              <Plus size={13} />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-gray-900">₹{displayPrice * item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Upgrade offer section ── visible only when real items exist ── */}
              {hasReal && (coffeeOffers.length > 0 || cokeProduct) && (
                <div className="px-4 pb-5">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-surface-100" />
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      <Zap size={9} className="text-amber-500" fill="#f59e0b" />
                      <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wide">
                        Add-ons · Coffee ₹{COFFEE_PRICE} · Coke ₹{COKE_PRICE}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-surface-100" />
                  </div>

                  {/* Tile grid */}
                  <div className="grid grid-cols-2 gap-2">

                    {/* Coffee tiles */}
                    {coffeeOffers.map((coffee, idx) => {
                      const alreadyIn = items.some(i => i._id === coffee._id);
                      const [fromC, toC] = COFFEE_GRADIENTS[idx % COFFEE_GRADIENTS.length];
                      return (
                        <button key={coffee._id}
                          onClick={() => toggleOffer(coffee, COFFEE_PRICE)}
                          className={[
                            'relative rounded-2xl overflow-hidden border-2 text-left transition-all duration-200',
                            alreadyIn
                              ? 'border-brand-400 shadow-sm scale-[0.98]'
                              : 'border-surface-200 hover:border-amber-300 hover:shadow-md active:scale-[0.97]',
                          ].join(' ')}
                        >
                          {/* Image / gradient */}
                          <div className="relative flex items-center justify-center"
                            style={{ paddingTop: '72%', background: `linear-gradient(135deg,${fromC},${toC})` }}>
                            {coffee.image
                              ? <Image src={coffee.image} alt={coffee.name} fill className="object-cover" />
                              : <div className="absolute inset-0 flex items-center justify-center">
                                  <Coffee size={28} className="text-amber-400 opacity-80" />
                                </div>
                            }
                            {alreadyIn
                              ? <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                                  <div className="bg-white rounded-full p-1 shadow-md">
                                    <CheckCircle2 size={18} className="text-brand-500" />
                                  </div>
                                </div>
                              : <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-amber-400 text-white rounded-full flex items-center justify-center shadow">
                                  <Plus size={11} strokeWidth={3} />
                                </div>
                            }
                          </div>
                          {/* Info: price first, volume badge inline */}
                          <div className="px-2 pt-1.5 pb-2 bg-white">
                            <p className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-1 mb-1">{coffee.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[12px] font-black text-amber-600">₹{COFFEE_PRICE}</span>
                              {coffee.price > COFFEE_PRICE && (
                                <span className="text-[9px] text-gray-400 line-through">₹{coffee.price}</span>
                              )}
                              <VolumeBadge />
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {/* Coke tile — at ₹39, distinct blue/red style */}
                    {cokeProduct && (() => {
                      const alreadyIn = items.some(i => i._id === cokeProduct._id);
                      return (
                        <button
                          onClick={() => toggleOffer(cokeProduct, COKE_PRICE)}
                          className={[
                            'relative rounded-2xl overflow-hidden border-2 text-left transition-all duration-200',
                            alreadyIn
                              ? 'border-red-300 scale-[0.98]'
                              : 'border-surface-200 hover:border-red-200 hover:shadow-md active:scale-[0.97]',
                          ].join(' ')}
                        >
                          <div className="relative flex items-center justify-center"
                            style={{ paddingTop: '72%', background: 'linear-gradient(135deg,#fee2e2,#fca5a5)' }}>
                            {cokeProduct.image
                              ? <Image src={cokeProduct.image} alt="Coke" fill className="object-cover" />
                              : <div className="absolute inset-0 flex items-center justify-center select-none"><GlassWater size={30} className="text-red-500" /></div>
                            }
                            {alreadyIn
                              ? <div className="absolute inset-0 bg-red-400/20 flex items-center justify-center">
                                  <div className="bg-white rounded-full p-1 shadow">
                                    <CheckCircle2 size={18} className="text-red-500" />
                                  </div>
                                </div>
                              : <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center shadow">
                                  <Plus size={11} strokeWidth={3} />
                                </div>
                            }
                          </div>
                          <div className="px-2 pt-1.5 pb-2 bg-white">
                            <p className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-1 mb-1">Coke</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[12px] font-black text-red-500">₹{COKE_PRICE}</span>
                              {cokeProduct.price > COKE_PRICE && (
                                <span className="text-[9px] text-gray-400 line-through">₹{cokeProduct.price}</span>
                              )}
                              <VolumeBadge />
                            </div>
                          </div>
                        </button>
                      );
                    })()}
                  </div>

                  <p className="text-[9px] text-gray-400 text-center mt-2">
                    Offer valid with your order · Iced Mocha &amp; Macchiato excluded
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div className="border-t border-surface-100 p-4 space-y-3">
            {isPlatinum ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl">
                <Crown size={14} className="text-platinum-500 flex-shrink-0" />
                <p className="text-xs text-orange-700 font-medium">
                  You save <span className="font-bold">₹{savings}</span> with Platinum!
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl">
                <Crown size={14} className="text-platinum-500 flex-shrink-0" />
                <p className="text-xs text-orange-700">
                  Get <span className="font-bold">Platinum (₹299/mo)</span> — save ₹{savings} on this order!
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>₹{isPlatinum ? platinumTotal : cartTotal}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery fee</span>
                <span>₹{DELIVERY_FEE}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-surface-100">
                <span>Total</span>
                <span>₹{(isPlatinum ? platinumTotal : cartTotal) + DELIVERY_FEE}</span>
              </div>
            </div>
            <button onClick={handleCheckout} className="btn-primary w-full text-base">
              Proceed to Checkout <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
