'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { user as userApi } from '@/lib/api';

const CartContext = createContext(null);

// ── Item type helpers ─────────────────────────────────────────────────────────
const IS_CAPPUCCINO    = (item) => item?.name?.toLowerCase().includes('cappuccino');
const IS_OFFER_ITEM    = (item) => item?.isOfferCoffee === true;
const IS_CAMPAIGN_ITEM = (item) => item?.isCampaignCoffee === true;
const IS_BEVERAGE      = (item) => item?.pfCategory === 'pf-beverages';
// "Add-on" items — removed when no real (food) items remain
const IS_ADDON         = (item) => IS_CAPPUCCINO(item) || IS_OFFER_ITEM(item) || IS_CAMPAIGN_ITEM(item);
// Food bowl = any non-beverage, non-addon item
const IS_FOOD_BOWL     = (item) => !IS_ADDON(item) && !IS_BEVERAGE(item);

// Virtual free-coffee item injected for campaign users
const CAMPAIGN_COFFEE_ID = 'campaign-free-coffee';
const makeCampaignCoffee = (label = 'Free Coffee') => ({
  _id:              CAMPAIGN_COFFEE_ID,
  name:             `${label} (Campaign Gift)`,
  price:            0,
  quantity:         1,
  pfCategory:       'pf-beverages',
  isCampaignCoffee: true,
  image:            '',
});

export function CartProvider({ children }) {
  const [items, setItems]   = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const cappRef       = useRef(null); // holds Cappuccino product data
  const campaignRef   = useRef(null); // holds active campaign { code, coffeesRemaining, freeItemLabel }
  const saveTimer     = useRef(null);

  // ── Bootstrap from localStorage ─────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('picoso_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
    try {
      const savedCapp = localStorage.getItem('picoso_cappuccino_product');
      if (savedCapp) cappRef.current = JSON.parse(savedCapp);
    } catch {}
    try {
      const savedCampaign = localStorage.getItem('picoso_campaign');
      if (savedCampaign) campaignRef.current = JSON.parse(savedCampaign);
    } catch {}
  }, []);

  // ── Poll campaign from localStorage (it can be set after mount) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem('picoso_campaign');
        campaignRef.current = raw ? JSON.parse(raw) : null;
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ── Persist cart to localStorage + debounced backend save ───────────────
  useEffect(() => {
    localStorage.setItem('picoso_cart', JSON.stringify(items));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (typeof window !== 'undefined' && localStorage.getItem('picoso_token')) {
        userApi.saveCart(items).catch(() => {});
      }
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [items]);

  // ── Called by ProductCard when it renders the Cappuccino product ──────────
  const registerCapp = useCallback((product) => {
    cappRef.current = product;
    try { localStorage.setItem('picoso_cappuccino_product', JSON.stringify(product)); } catch {}
  }, []);

  // ── Determine what coffee add-on to inject (campaign-free vs ₹79) ────────
  const getCoffeeAddon = useCallback(() => {
    const c = campaignRef.current;
    if (c && c.active && (c.coffeesRemaining == null || c.coffeesRemaining > 0)) {
      return makeCampaignCoffee(c.freeItemLabel || 'Free Coffee');
    }
    // Fall back to regular cappuccino at ₹79
    const capp = cappRef.current;
    if (capp) return { ...capp, price: 79, isOfferCoffee: true, quantity: 1 };
    return null;
  }, []);

  // ── addItem ────────────────────────────────────────────────────────────────
  const addItem = useCallback((product, qty = 1) => {
    setItems(prev => {
      // Adding cappuccino / campaign coffee directly — only if food items exist
      if (IS_CAPPUCCINO(product) || IS_CAMPAIGN_ITEM(product)) {
        const hasFood = prev.some(IS_FOOD_BOWL);
        if (!hasFood) return prev;
        const existing = prev.find(i => i._id === product._id);
        if (existing) return prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + qty } : i);
        return [...prev, { ...product, quantity: qty }];
      }

      // Adding a regular item
      let next;
      const existing = prev.find(i => i._id === product._id);
      if (existing) {
        next = prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + qty } : i);
      } else {
        next = [...prev, { ...product, quantity: qty }];
      }

      // Check if a food bowl is now present and no coffee add-on exists yet
      const hasFood = next.some(IS_FOOD_BOWL);
      const hasCoffeeAddon = next.some(i => IS_CAPPUCCINO(i) || IS_CAMPAIGN_ITEM(i) || IS_OFFER_ITEM(i));
      if (hasFood && !hasCoffeeAddon) {
        const addon = getCoffeeAddon();
        if (addon) next = [...next, addon];
      }

      return next;
    });
    setIsOpen(true);
  }, [getCoffeeAddon]);

  // ── addCombo ─────────────────────────────────────────────────────────────
  // Adds a special combo meal as a single line item WITHOUT triggering the
  // automatic coffee add-on (the combo already includes its own drink).
  const addCombo = useCallback((combo, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i._id === combo._id);
      if (existing) {
        return prev.map(i => i._id === combo._id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...combo, quantity: qty }];
    });
  }, []);

  // ── removeItem ─────────────────────────────────────────────────────────────
  const removeItem = useCallback((id) => {
    setItems(prev => {
      const filtered = prev.filter(i => i._id !== id);
      if (filtered.length > 0 && filtered.every(IS_ADDON)) return [];
      return filtered;
    });
  }, []);

  // ── updateQty ─────────────────────────────────────────────────────────────
  const updateQty = useCallback((id, qty) => {
    setItems(prev => {
      let next;
      if (qty <= 0) {
        next = prev.filter(i => i._id !== id);
      } else {
        next = prev.map(i => i._id === id ? { ...i, quantity: qty } : i);
      }
      if (next.length > 0 && next.every(IS_ADDON)) return [];
      return next;
    });
  }, []);

  // ── clearCart ──────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem('picoso_cart');
  }, []);

  // ── updateCampaign — call this after order placed to refresh coffees left ─
  const updateCampaign = useCallback((coffeesRemaining) => {
    try {
      const raw = localStorage.getItem('picoso_campaign');
      if (!raw) return;
      const c = JSON.parse(raw);
      const updated = { ...c, coffeesRemaining };
      if (coffeesRemaining <= 0) updated.active = false;
      localStorage.setItem('picoso_campaign', JSON.stringify(updated));
      campaignRef.current = updated;
    } catch {}
  }, []);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const activeCampaign = (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('picoso_campaign') : null;
      if (!raw) return null;
      const c = JSON.parse(raw);
      return c?.active ? c : null;
    } catch { return null; }
  })();

  return (
    <CartContext.Provider value={{
      items, addItem, addCombo, removeItem, updateQty, clearCart, registerCapp, updateCampaign,
      cartCount, cartTotal, isOpen, setIsOpen, activeCampaign,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
