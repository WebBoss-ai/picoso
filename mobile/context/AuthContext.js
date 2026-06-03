import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Storage from '../lib/storage';
import { profileAPI } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      const [storedToken, storedUser, onboarded] = await Promise.all([
        Storage.getToken(),
        Storage.getUser(),
        Storage.isOnboarded(),
      ]);
      setIsOnboarded(onboarded);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        // Refresh profile from server silently
        refreshProfile(storedToken);
      }
    } catch (e) {
      console.warn('Auth bootstrap error:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await profileAPI.get();
      const freshUser = res.data;
      setUser(freshUser);
      await Storage.setUser(freshUser);
    } catch (e) {
      // Silently fail — user stays logged in
    }
  };

  const login = useCallback(async (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    await Promise.all([
      Storage.setToken(authToken),
      Storage.setUser(userData),
    ]);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Storage.clearAll();
  }, []);

  const updateUser = useCallback(async (updatedUser) => {
    setUser(updatedUser);
    await Storage.setUser(updatedUser);
  }, []);

  const completeOnboarding = useCallback(async () => {
    setIsOnboarded(true);
    await Storage.setOnboarded();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isOnboarded,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser,
        refreshProfile,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
