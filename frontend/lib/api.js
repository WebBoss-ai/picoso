import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const auth = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
};

export const bowls = {
  getAll: () => api.get('/bowls'),
  getById: (id) => api.get(`/bowls/${id}`),
};

export const ingredients = {
  getAll: () => api.get('/ingredients'),
};

export const orders = {
  create: (orderData) => api.post('/orders', orderData),
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
};

export const profile = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
};

export const feedback = {
  create: (data) => api.post('/feedback', data),
};

export const admin = {
  getOrders: () => api.get('/admin/orders'),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}`, { status }),
  getStats: () => api.get('/admin/stats'),
  createBowl: (formData) => api.post('/admin/bowls', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateBowl: (id, formData) => api.put(`/admin/bowls/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteBowl: (id) => api.delete(`/admin/bowls/${id}`),
  createIngredient: (formData) => api.post('/admin/ingredients', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateIngredient: (id, formData) => api.put(`/admin/ingredients/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteIngredient: (id) => api.delete(`/admin/ingredients/${id}`),
};

export default api;
