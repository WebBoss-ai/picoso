'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { user as userApi } from '@/lib/api';

const CartContext = createContext(null);

const IS_COKE = (item) => item?.name === 'Coke';

export function CartProvider({ children }) {
  const [items, setItems]   = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const cokeRef   = useRef(null); // holds Coke product data without causing re-renders
  const saveTimer = useRef(null); // debounce timer for cart persistence to backend

  // Load cart + saved Coke product data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('picoso_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
    try {
      const savedCoke = localStorage.getItem('picoso_coke_product');
      if (savedCoke) cokeRef.current = JSON.parse(savedCoke);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('picoso_cart', JSON.stringify(items));
    // Debounced save to backend (only when user is logged in)
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (typeof window !== 'undefined' && localStorage.getItem('picoso_token')) {
        userApi.saveCart(items).catch(() => {});
      }
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [items]);

  // Called by ProductCard when it renders the Coke product
  const registerCoke = useCallback((product) => {
    cokeRef.current = product;
    try { localStorage.setItem('picoso_coke_product', JSON.stringify(product)); } catch {}
  }, []);

  const addItem = useCallback((product, qty = 1) => {
    setItems(prev => {
      // ── Trying to add Coke directly ──
      if (IS_COKE(product)) {
        const hasNonCoke = prev.some(i => !IS_COKE(i));
        if (!hasNonCoke) return prev; // block: no other items in cart
        const existing = prev.find(i => i._id === product._id);
        if (existing) return prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + qty } : i);
        return [...prev, { ...product, quantity: qty }];
      }

      // ── Adding a non-Coke item ──
      let next;
      const existing = prev.find(i => i._id === product._id);
      if (existing) {
        next = prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + qty } : i);
      } else {
        next = [...prev, { ...product, quantity: qty }];
      }

      // Auto-add Coke if it's not already in cart and we have its data
      const coke = cokeRef.current;
      if (coke && !next.find(i => IS_COKE(i))) {
        next = [...next, { ...coke, quantity: 1 }];
      }

      return next;
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => {
      const filtered = prev.filter(i => i._id !== id);
      // If only Coke remains after removal, remove it too
      if (filtered.length > 0 && filtered.every(i => IS_COKE(i))) return [];
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
      // If only Coke remains, remove it too
      if (next.length > 0 && next.every(i => IS_COKE(i))) return [];
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
      items, addItem, removeItem, updateQty, clearCart, registerCoke,
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
