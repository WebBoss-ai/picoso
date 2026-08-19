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

export const healthySubscription = {
  create:    (data) => api.post('/subscription/healthy', data),
  getStatus: ()     => api.get('/subscription/healthy/status'),
  cancel:    ()     => api.put('/subscription/healthy/cancel'),
};

export const breakfastSubscription = {
  getMenu:          ()     => api.get('/subscription/breakfast/menu'),
  expressInterest:  (data) => api.post('/subscription/breakfast/interest', data),
};

// Admin2 console (breakfast subscription) — PIN via header
const admin2Api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api',
});
admin2Api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const pin = sessionStorage.getItem('picoso_admin2_pin');
    if (pin) config.headers['x-admin2-pin'] = pin;
  }
  return config;
});

export const admin2 = {
  verifyPin:    (pin)  => admin2Api.post('/admin2/verify-pin', {}, { headers: { 'x-admin2-pin': pin } }),
  getStats:     ()     => admin2Api.get('/admin2/subscription/stats'),
  getLeads:     (params) => admin2Api.get('/admin2/subscription/leads', { params }),
  updateLead:   (id, d) => admin2Api.put(`/admin2/subscription/leads/${id}`, d),
  deleteLead:   (id)   => admin2Api.delete(`/admin2/subscription/leads/${id}`),
  getMenu:      ()     => admin2Api.get('/admin2/subscription/menu'),
  createItem:   (data) => admin2Api.post('/admin2/subscription/menu', data),
  updateItem:   (id, d) => admin2Api.put(`/admin2/subscription/menu/${id}`, d),
  deleteItem:   (id)   => admin2Api.delete(`/admin2/subscription/menu/${id}`),
};

export const storeStatus = {
  get:              ()     => api.get('/store/status'),
  notifyMe:         (data) => api.post('/store/notify', data),
  saveClosedCheckout: (data) => api.post('/store/closed-checkout', data),
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
  getAllHealthySubs:  ()   => api.get('/admin/subscriptions/healthy'),
  approveHealthySub: (id) => api.put(`/admin/subscriptions/healthy/${id}/approve`),
  rejectHealthySub:  (id) => api.put(`/admin/subscriptions/healthy/${id}/reject`),
  getStoreStatus:             ()     => api.get('/store/status'),
  updateStoreStatus:          (data) => api.put('/admin/store/status', data),
  getNotifyRequests:          (params) => api.get('/admin/store/notify-requests', { params }),
  markNotified:               (id)   => api.put(`/admin/store/notify-requests/${id}/notified`),
  getClosedCheckouts:         ()     => api.get('/admin/store/closed-checkouts'),
  markClosedCheckoutNotified: (id)   => api.put(`/admin/store/closed-checkouts/${id}/notified`),
  getUsers: () => api.get('/admin/users'),
  getUserOrders: (userId) => api.get(`/admin/users/${userId}/orders`),
  getBowls: () => api.get('/bowls'),
  createBowl: (data) => api.post('/admin/bowls', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateBowl: (id, data) => api.put(`/admin/bowls/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteBowl: (id) => api.delete(`/admin/bowls/${id}`),
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  getExpansionData: () => api.get('/admin/expansion-data'),
};

export const expansion = {
  saveAttempt: (data) => api.post('/expansion/attempt', data),
};

export const user = {
  saveCart:     (cartItems) => api.put('/user/cart', { cartItems }),
  pingActivity: ()          => api.put('/user/activity'),
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

const agentApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api',
});
agentApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('picoso_agent_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const agentAuth = {
  login: (data) => agentApi.post('/agents/auth', data),
  getProfile: () => agentApi.get('/agents/me'),
};

export const agentRef = {
  trackScan:    (agentCode) => api.post(`/ref/${agentCode}/scan`),
  register:     (agentCode, phone) => api.post(`/ref/${agentCode}/register`, { phone }),
};

export const adminAgents = {
  getAll:         ()         => api.get('/admin/agents'),
  getStats:       ()         => api.get('/admin/agents/stats'),
  getSettings:    ()         => api.get('/admin/agents/settings'),
  updateSettings: (data)     => api.put('/admin/agents/settings', data),
  getById:        (id)       => api.get(`/admin/agents/${id}`),
  update:         (id, data) => api.put(`/admin/agents/${id}`, data),
  adjustWallet:   (id, data) => api.put(`/admin/agents/${id}/wallet`, data),
  delete:         (id)       => api.delete(`/admin/agents/${id}`),
};

export const campaign = {
  getInfo:      (code)  => api.get(`/campaign/${code}/info`),
  trackScan:    (code)  => api.post(`/campaign/${code}/scan`),
  registerLead: (code)  => api.post(`/campaign/${code}/lead`),
  myStatus:     (code)  => api.get(`/campaign/${code}/my-status`),
};

export const adminCampaigns = {
  getAll:    ()     => api.get('/admin/campaigns'),
  create:    (data) => api.post('/admin/campaigns', data),
  getDetail: (id)   => api.get(`/admin/campaigns/${id}`),
};

export const friendReferral = {
  getInfo:    (code)   => api.get(`/friendship/${code}`),
  join:       (code)   => api.post(`/friendship/${code}/join`),
  request:    (data)   => api.post('/referral/request', data),
  getMyCircle: ()      => api.get('/my/referrals'),
};

// ── Marketing / WhatsApp Automation ──────────────────────────────────────────
const marketingApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api',
  maxContentLength: 50 * 1024 * 1024,
  maxBodyLength: 50 * 1024 * 1024,
});
marketingApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const pin = sessionStorage.getItem('picoso_marketing_pin');
    if (pin) config.headers['x-marketing-pin'] = pin;
  }
  return config;
});

export const marketing = {
  verifyPin:      (pin)    => marketingApi.post('/marketing/verify-pin', {}, { headers: { 'x-marketing-pin': pin } }),
  // WhatsApp connection
  waStatus:       ()       => marketingApi.get('/marketing/wa/status'),
  waInit:         ()       => marketingApi.post('/marketing/wa/init'),
  waRestart:      ()       => marketingApi.post('/marketing/wa/restart'),
  waLogout:       ()       => marketingApi.post('/marketing/wa/logout'),
  sendSingle:     (data)   => marketingApi.post('/marketing/wa/send', data),
  // Welcome automation
  getWelcome:     ()       => marketingApi.get('/marketing/welcome'),
  updateWelcome:  (data)   => marketingApi.put('/marketing/welcome', data),
  // Bulk campaigns
  createCampaign: (data)   => marketingApi.post('/marketing/campaigns', data),
  listCampaigns:  ()       => marketingApi.get('/marketing/campaigns'),
  getCampaign:    (id)     => marketingApi.get(`/marketing/campaigns/${id}`),
  startCampaign:  (id)     => marketingApi.post(`/marketing/campaigns/${id}/start`),
  pauseCampaign:  (id)     => marketingApi.post(`/marketing/campaigns/${id}/pause`),
  stopCampaign:   (id)     => marketingApi.post(`/marketing/campaigns/${id}/stop`),
  deleteCampaign: (id)     => marketingApi.delete(`/marketing/campaigns/${id}`),
  // Logs & stats
  getLogs:        (type)   => marketingApi.get('/marketing/logs', { params: type ? { type } : {} }),
  getStats:       ()       => marketingApi.get('/marketing/stats'),
};

export const adminReferrals = {
  getAll:           ()       => api.get('/admin/referrals'),
  create:           (data)   => api.post('/admin/referrals', data),
  update:           (id, d)  => api.put(`/admin/referrals/${id}`, d),
  getRequests:      ()       => api.get('/admin/referrals/requests'),
  approveRequest:   (id)     => api.put(`/admin/referrals/requests/${id}/approve`),
  rejectRequest:    (id)     => api.put(`/admin/referrals/requests/${id}/reject`),
  getSettings:      ()       => api.get('/admin/referrals/settings'),
  updateSettings:   (data)   => api.put('/admin/referrals/settings', data),
};

// ── WP Marketing Platform (per-client PIN) ────────────────────────────────
const wpMarketingApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://picoso.in/api',
});
wpMarketingApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const pin = sessionStorage.getItem('picoso_wp_pin');
    if (pin) config.headers['x-wp-pin'] = pin;
  }
  return config;
});

export const wpMarketing = {
  verifyPin:         (pin)     => wpMarketingApi.post('/wp-marketing/verify-pin', {}, { headers: { 'x-wp-pin': pin } }),
  getOverview:       ()        => wpMarketingApi.get('/wp-marketing/overview'),
  getContactLists:   ()        => wpMarketingApi.get('/wp-marketing/contacts'),
  createContactList: (data)    => wpMarketingApi.post('/wp-marketing/contacts', data),
  getContactList:    (id)      => wpMarketingApi.get(`/wp-marketing/contacts/${id}`),
  deleteContactList: (id)      => wpMarketingApi.delete(`/wp-marketing/contacts/${id}`),
  addContacts:       (id, data) => wpMarketingApi.post(`/wp-marketing/contacts/${id}/members`, data),
  getCampaigns:      ()        => wpMarketingApi.get('/wp-marketing/campaigns'),
  createCampaign:    (data)    => wpMarketingApi.post('/wp-marketing/campaigns', data),
  updateCampaign:    (id, data) => wpMarketingApi.put(`/wp-marketing/campaigns/${id}`, data),
  deleteCampaign:    (id)      => wpMarketingApi.delete(`/wp-marketing/campaigns/${id}`),
  analyzeCampaign:   (id, data) => wpMarketingApi.post(`/wp-marketing/campaigns/${id}/analyze`, data),
  // Phase 2 — experiment plan
  generatePlan:      (id)      => wpMarketingApi.post(`/wp-marketing/campaigns/${id}/generate-plan`),
  getPlan:           (id)      => wpMarketingApi.get(`/wp-marketing/campaigns/${id}/plan`),
  approvePlan:       (id)      => wpMarketingApi.post(`/wp-marketing/campaigns/${id}/approve-plan`),
  getExperiment:     (campaignId) => wpMarketingApi.get(`/wp-marketing/campaigns/${campaignId}/experiment`),
  // Phase 3 — WhatsApp
  getWaStatus:       ()        => wpMarketingApi.get('/wp-marketing/wa/status'),
  getTemplates:      (page, limit) => wpMarketingApi.get('/wp-marketing/wa/templates', { params: { page, limit } }),
  sendTestMessage:   (data)    => wpMarketingApi.post('/wp-marketing/wa/test-send', data),
  sendMessage:       (data)    => wpMarketingApi.post('/wp-marketing/wa/send', data),
  sendBulkTemplate:  (data)    => wpMarketingApi.post('/wp-marketing/wa/bulk-send', data),
  uploadMedia:       (formData) => wpMarketingApi.post('/wp-marketing/wa/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    maxContentLength: 50 * 1024 * 1024,
    maxBodyLength:    50 * 1024 * 1024,
  }),
  // Phase 3 — Execution
  getDashboard:      (expId)   => wpMarketingApi.get(`/wp-marketing/experiments/${expId}/dashboard`),
  executeRun:        (expId, data) => wpMarketingApi.post(`/wp-marketing/experiments/${expId}/execute`, data),
  analyzeRun:        (expId, data) => wpMarketingApi.post(`/wp-marketing/experiments/${expId}/analyze`, data),
  advancePhase:      (expId, data) => wpMarketingApi.post(`/wp-marketing/experiments/${expId}/advance`, data),
  approvePhase:      (expId, data) => wpMarketingApi.post(`/wp-marketing/experiments/${expId}/approve-phase`, data),
  // One-click phase scheduling
  startPhase:        (expId, data) => wpMarketingApi.post(`/wp-marketing/experiments/${expId}/start-phase`, data),
  getSchedule:       (expId)   => wpMarketingApi.get(`/wp-marketing/experiments/${expId}/schedule`),
  // Scheduled job management
  cancelJob:         (jobId)   => wpMarketingApi.delete(`/wp-marketing/scheduled-jobs/${jobId}`),
  updateJobTime:     (jobId, data) => wpMarketingApi.put(`/wp-marketing/scheduled-jobs/${jobId}`, data),
  updateVariant:     (expId, variantNum, data) => wpMarketingApi.put(`/wp-marketing/experiments/${expId}/variants/${variantNum}`, data),
  saveTemplateConfig:(expId, data) => wpMarketingApi.put(`/wp-marketing/experiments/${expId}/template-config`, data),
  getHelperStatus:   ()        => wpMarketingApi.get('/wp-marketing/helper/status'),
  helperHeartbeat:   (data)    => wpMarketingApi.post('/wp-marketing/helper/heartbeat', data || {}),
  getEdgeStatus:     ()        => wpMarketingApi.get('/wp-marketing/helper/status'),
  publishTemplates:  (expId, data) => wpMarketingApi.post(`/wp-marketing/experiments/${expId}/publish-templates`, data || {}),
};

export default api;
