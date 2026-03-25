import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('picoso_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
};

export const bowls = {
  getAll: (pfCategory) => api.get('/bowls', { params: pfCategory ? { pfCategory } : {} }),
  getById: (id) => api.get(`/bowls/${id}`),
};

export const orders = {
  create: (data) => api.post('/orders', data),
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
};

export const profile = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  addAddress: (data) => api.post('/profile/addresses', data),
  updateAddresses: (addresses) => api.put('/profile/addresses', { addresses }),
  deleteAddress: (addressId) => api.delete(`/profile/addresses/${addressId}`),
};

export const platinum = {
  getStatus: () => api.get('/platinum/status'),
  subscribe: (data) => api.post('/platinum/subscribe', data),
};

export const feedback = {
  create: (data) => api.post('/feedback', data),
};

export const admin = {
  getStats: () => api.get('/admin/stats'),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}`, { status }),
  approvePayment: (id) => api.put(`/admin/orders/${id}/approve-payment`),
  rejectPayment: (id) => api.put(`/admin/orders/${id}/reject-payment`),
  getPlatinumRequests: () => api.get('/admin/platinum'),
  approvePlatinum: (id) => api.put(`/admin/platinum/${id}/approve`),
  rejectPlatinum: (id) => api.put(`/admin/platinum/${id}/reject`),
  getUsers: () => api.get('/admin/users'),
  getBowls: () => api.get('/bowls'),
  createBowl: (data) => api.post('/admin/bowls', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateBowl: (id, data) => api.put(`/admin/bowls/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteBowl: (id) => api.delete(`/admin/bowls/${id}`),
};

export default api;
