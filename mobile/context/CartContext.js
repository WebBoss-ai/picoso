import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useAuth } from './AuthContext';
import { userAPI } from '../lib/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const { isAuthenticated } = useAuth();

  // Sync cart to server whenever items change
  useEffect(() => {
    if (isAuthenticated && items.length > 0) {
      const timeout = setTimeout(() => {
        userAPI.saveCart(items).catch(() => {});
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [items, isAuthenticated]);

  const addItem = useCallback((bowl, quantity = 1, customizations = null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => {
      const key = customizations ? `${bowl._id}-${JSON.stringify(customizations)}` : bowl._id;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          key,
          bowl,
          quantity,
          customizations,
          price: bowl.price,
          name: bowl.name,
          image: bowl.image,
          isVeg: bowl.isVeg,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    if (quantity <= 0) {
      removeItem(key);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity } : i))
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = subtotal >= 299 ? 0 : 49;
  const totalAmount = subtotal + deliveryFee;

  const getItemQuantity = useCallback(
    (bowlId) => {
      const item = items.find((i) => i.bowl._id === bowlId);
      return item ? item.quantity : 0;
    },
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        deliveryFee,
        totalAmount,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
        isEmpty: items.length === 0,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export default CartContext;
