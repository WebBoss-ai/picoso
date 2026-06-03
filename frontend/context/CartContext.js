'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { user as userApi } from '@/lib/api';

const CartContext = createContext(null);

// Auto-companion: Cappuccino is auto-added when any non-cappuccino item enters the cart.
// It is also cleaned up if all real items are removed.
const IS_CAPPUCCINO = (item) => item?.name?.toLowerCase().includes('cappuccino');

// Items added via the cart-drawer offer (₹79 coffees / ₹39 Coke)
const IS_OFFER_ITEM = (item) => item?.isOfferCoffee === true;

// "Add-on" items — should be removed when no real items remain
const IS_ADDON = (item) => IS_CAPPUCCINO(item) || IS_OFFER_ITEM(item);

export function CartProvider({ children }) {
  const [items, setItems]   = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const cappRef   = useRef(null); // holds Cappuccino product data
  const saveTimer = useRef(null);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('picoso_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
    try {
      const savedCapp = localStorage.getItem('picoso_cappuccino_product');
      if (savedCapp) cappRef.current = JSON.parse(savedCapp);
    } catch {}
  }, []);

  // Persist cart to localStorage + debounced backend save
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

  // Called by ProductCard when it renders the Cappuccino product
  const registerCapp = useCallback((product) => {
    cappRef.current = product;
    try { localStorage.setItem('picoso_cappuccino_product', JSON.stringify(product)); } catch {}
  }, []);

  const addItem = useCallback((product, qty = 1) => {
    setItems(prev => {
      // ── Trying to add Cappuccino directly ──
      if (IS_CAPPUCCINO(product)) {
        const hasNonCapp = prev.some(i => !IS_CAPPUCCINO(i));
        if (!hasNonCapp) return prev; // block: no other items in cart
        const existing = prev.find(i => i._id === product._id);
        if (existing) return prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + qty } : i);
        return [...prev, { ...product, quantity: qty }];
      }

      // ── Adding any other item ──
      let next;
      const existing = prev.find(i => i._id === product._id);
      if (existing) {
        next = prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + qty } : i);
      } else {
        next = [...prev, { ...product, quantity: qty }];
      }

      // Auto-add Cappuccino at ₹79 offer price if not already in cart
      const capp = cappRef.current;
      if (capp && !next.find(i => IS_CAPPUCCINO(i))) {
        next = [...next, { ...capp, price: 79, isOfferCoffee: true, quantity: 1 }];
      }

      return next;
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => {
      const filtered = prev.filter(i => i._id !== id);
      // If only add-ons remain, clear them all
      if (filtered.length > 0 && filtered.every(IS_ADDON)) return [];
      return filtered;
    });
  }, []);

  const updateQty = useCallback((id, qty) => {
    setItems(prev => {
      let next;
      if (qty <= 0) {
        next = prev.filter(i => i._id !== id);
      } else {
        next = prev.map(i => i._id === id ? { ...i, quantity: qty } : i);
      }
      // If only add-ons remain, clear them all
      if (next.length > 0 && next.every(IS_ADDON)) return [];
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem('picoso_cart');
  }, []);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart, registerCapp,
      cartCount, cartTotal, isOpen, setIsOpen
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
