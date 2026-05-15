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

export const categories = {
  getAll: () => api.get('/categories'),
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
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
};

const deliveryApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api',
});
deliveryApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('picoso_delivery_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const delivery = {
  login:          (data)  => deliveryApi.post('/delivery/login', data),
  getAvailable:   ()      => deliveryApi.get('/delivery/orders/available'),
  getActive:      ()      => deliveryApi.get('/delivery/orders/active'),
  getHistory:     ()      => deliveryApi.get('/delivery/orders/history'),
  getStats:       ()      => deliveryApi.get('/delivery/stats'),
  pickup:         (id)    => deliveryApi.put(`/delivery/orders/${id}/pickup`),
  deliver:        (id)    => deliveryApi.put(`/delivery/orders/${id}/deliver`),
};

export default api;
