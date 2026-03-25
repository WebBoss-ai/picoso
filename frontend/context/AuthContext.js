'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('picoso_token');
      const savedUser = localStorage.getItem('picoso_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('picoso_token', newToken);
    localStorage.setItem('picoso_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('picoso_token');
    localStorage.removeItem('picoso_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('picoso_user', JSON.stringify(merged));
    setUser(merged);
  }, [user]);

  const isLoggedIn = !!token;
  const isAdmin = user?.role === 'admin';
  const isPlatinum = user?.isPlatinum || false;

  return (
    <AuthContext.Provider value={{
      user, token, login, logout, updateUser,
      isLoggedIn, isAdmin, isPlatinum, loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
