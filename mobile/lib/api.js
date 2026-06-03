import axios from 'axios';
import Storage from './storage';

// Change this to your production backend URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://picoso.in/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use(async (config) => {
  const token = await Storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await Storage.clearAll();
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  sendOtp: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
};

// ─── Bowls / Menu ────────────────────────────────────────────────────────────
export const bowlsAPI = {
  getAll: (category) =>
    api.get('/bowls', { params: category ? { pfCategory: category } : {} }),
  getById: (id) => api.get(`/bowls/${id}`),
  getIngredients: () => api.get('/ingredients'),
  getCategories: () => api.get('/categories'),
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
};

// ─── Profile ─────────────────────────────────────────────────────────────────
export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  addAddress: (address) => api.post('/profile/addresses', address),
  updateAddresses: (addresses) => api.put('/profile/addresses', { addresses }),
  deleteAddress: (addressId) => api.delete(`/profile/addresses/${addressId}`),
};

// ─── Platinum ────────────────────────────────────────────────────────────────
export const platinumAPI = {
  getStatus: () => api.get('/platinum/status'),
  subscribe: (data) => api.post('/platinum/subscribe', data),
};

// ─── Feedback ────────────────────────────────────────────────────────────────
export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
};

// ─── User Activity ────────────────────────────────────────────────────────────
export const userAPI = {
  saveCart: (cartSnapshot) => api.put('/user/cart', { cartSnapshot }),
  pingActivity: () => api.put('/user/activity'),
};

export default api;
