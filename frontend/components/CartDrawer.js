'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  X, Plus, Minus, ShoppingBag, ArrowRight,
  Trash2, Crown, Coffee, Zap, CheckCircle2,
  AlertTriangle, BellRing, PhoneCall, ChevronLeft, Package, GlassWater,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { bowls as bowlsApi, storeStatus as storeApi } from '@/lib/api';

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
  const { isPlatinum, isLoggedIn, user } = useAuth();
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

  // Fetch store status
  useEffect(() => {
    storeApi.get().then(res => setStore(res.data.status)).catch(() => setStore({ isOpen: true }));
  }, []);

  const submitNotify = async () => {
    if (!notifyPhone.trim()) return;
    setNotifySend(true);
    try { await storeApi.notifyMe({ phone: notifyPhone.trim() }); setNotifyDone(true); } catch {}
    setNotifySend(false);
  };

  // Fetch beverages + Coke once
  useEffect(() => {
    bowlsApi.getAll().then(res => {
      const all = res.data.bowls || [];
      setCoffeeOffers(
        all.filter(b => b.pfCategory === 'pf-beverages' && !isCokeName(b.name) && !isExcluded(b.name))
      );
      setCokeProduct(all.find(b => isCokeName(b.name)) || null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset closed panel when drawer is closed/reopened — MUST be before early return
  useEffect(() => {
    if (!isOpen) { setShowClosed(false); setNotifyDone(false); setNotifyPhone(''); setAdminSent(false); }
  }, [isOpen]);

  // ── All hooks must be above this line ─────────────────────────────────────
  if (!isOpen) return null;

  const realItems  = items.filter(i => !i.isOfferCoffee && !i.name?.toLowerCase().includes('cappuccino'));
  const hasReal    = realItems.length > 0;

  const platinumTotal = Math.round(cartTotal * (1 - PLATINUM_DISCOUNT));
  const savings       = cartTotal - platinumTotal;

  const handleCheckout = async () => {
    if (store && !store.isOpen) {
      setShowClosed(true);
      if (!adminSent) {
        setAdminSent(true);
        storeApi.saveClosedCheckout({
          phone: isLoggedIn ? (user?.phone || '') : '',
          userId: user?._id || null,
          items: items.map(i => ({ name: i.name, price: i.price, qty: i.quantity })),
          total: cartTotal,
        }).catch(() => {});
      }
      return;
    }
    if (!isLoggedIn) { setIsOpen(false); onAuthRequired?.('checkout'); return; }
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
      <div className="drawer-overlay" onClick={() => setIsOpen(false)} />
      <div className="drawer">

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

        {/* ── Closed checkout panel (full-drawer overlay) ── */}
        {showClosed && store && !store.isOpen && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col" style={{ top: 60 }}>
            {/* Back bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-100">
              <button onClick={() => setShowClosed(false)}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
                <ChevronLeft size={16} /> Back to cart
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Closed header */}
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-red-800">We&apos;re currently closed</p>
                  <p className="text-xs text-red-600 leading-snug mt-1">{store.closedReason}</p>
                  <p className="text-xs text-red-400 mt-1">Operating hours: {store.openingTime} – {store.closingTime}</p>
                </div>
              </div>

              {/* Cart snapshot */}
              <div className="rounded-2xl border border-surface-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-50 border-b border-surface-100">
                  <Package size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Your order ({items.length} item{items.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="divide-y divide-surface-50">
                  {items.map(item => (
                    <div key={item._id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 bg-surface-100 text-gray-500 text-[10px] font-bold rounded-md flex items-center justify-center flex-shrink-0">
                          {item.quantity}
                        </span>
                        <span className="text-sm text-gray-700 font-medium line-clamp-1">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 ml-3 flex-shrink-0">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-t border-surface-100">
                  <span className="text-sm font-bold text-gray-700">Total</span>
                  <span className="text-base font-extrabold text-gray-900">₹{cartTotal}</span>
                </div>
              </div>

              {/* Notify me */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BellRing size={15} className="text-amber-600" />
                  <span className="text-sm font-bold text-amber-800">Get notified when we reopen</span>
                </div>
                {notifyDone ? (
                  <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2.5">
                    <CheckCircle2 size={15} className="text-brand-500 flex-shrink-0" />
                    <p className="text-sm font-semibold text-brand-700">
                      We&apos;ll notify you the moment we&apos;re back!
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-amber-700">
                      Your cart has been saved. Enter your number and we&apos;ll reach out as soon as we reopen.
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <PhoneCall size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={notifyPhone}
                          onChange={e => setNotifyPhone(e.target.value)}
                          placeholder={isLoggedIn && user?.phone ? user.phone : 'Your phone number'}
                          className="w-full pl-8 pr-3 py-2.5 text-sm border border-amber-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      </div>
                      <button
                        onClick={submitNotify}
                        disabled={notifySend || !notifyPhone.trim()}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors whitespace-nowrap"
                      >
                        {notifySend
                          ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          : <BellRing size={13} />}
                        Notify me
                      </button>
                    </div>
                  </>
                )}
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Your cart items are saved — they&apos;ll be here when we reopen.
              </p>
            </div>
          </div>
        )}

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
