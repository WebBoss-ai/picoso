import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'picoso_token';
const USER_KEY = 'picoso_user';
const ONBOARDED_KEY = 'picoso_onboarded';

export const Storage = {
  async getToken() {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to save token', e);
    }
  },

  async removeToken() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {}
  },

  async getUser() {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setUser(user) {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save user', e);
    }
  },

  async removeUser() {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {}
  },

  async isOnboarded() {
    try {
      const val = await SecureStore.getItemAsync(ONBOARDED_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setOnboarded() {
    try {
      await SecureStore.setItemAsync(ONBOARDED_KEY, 'true');
    } catch {}
  },

  async clearAll() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {}
  },
};

export default Storage;
