import express from 'express';
import * as controller from '../controllers/controller.js';
import * as agentController from '../controllers/agentController.js';
import { authenticate, isAdmin, authenticateDelivery } from '../middleware/auth.js';
import { authenticateAgent } from '../middleware/agentAuth.js';
import { uploadToS3 } from '../utils/s3.js';

const router = express.Router();

// Categories (public read, admin write)
router.get('/categories', controller.getCategories);
router.post('/admin/categories', authenticate, isAdmin, controller.createCategory);
router.put('/admin/categories/:id', authenticate, isAdmin, controller.updateCategory);
router.delete('/admin/categories/:id', authenticate, isAdmin, controller.deleteCategory);

// Auth
router.post('/auth/send-otp', controller.sendOTPController);
router.post('/auth/verify-otp', controller.verifyOTPController);

// Dev-only: seed test user (phone 9999999999, 5 km away from store)
router.get('/dev/seed-test-user', controller.seedTestUser);
// Dev-only: push a 5 km-away saved address onto the test user
router.get('/dev/add-far-address', controller.addFarAddressToTestUser);

// Products / Bowls
router.get('/bowls', controller.getBowls);
router.get('/bowls/:id', controller.getBowlById);

// Ingredients
router.get('/ingredients', controller.getIngredients);

// Orders (Protected)
router.post('/orders', authenticate, controller.createOrder);
router.get('/orders', authenticate, controller.getOrders);
router.get('/orders/:id', authenticate, controller.getOrderById);

// Profile (Protected)
router.get('/profile', authenticate, controller.getProfile);
router.put('/profile', authenticate, controller.updateProfile);
router.post('/profile/addresses', authenticate, controller.addAddress);
router.put('/profile/addresses', authenticate, controller.updateAddresses);
router.delete('/profile/addresses/:addressId', authenticate, controller.deleteAddress);

// Platinum (Protected)
router.get('/platinum/status', authenticate, controller.getPlatinumStatus);
router.post('/platinum/subscribe', authenticate, controller.subscribePlatinum);

// Feedback (Protected)
router.post('/feedback', authenticate, controller.createFeedback);

// Healthy Subscription (Protected)
router.post('/subscription/healthy',        authenticate, controller.createHealthySubscription);
router.get('/subscription/healthy/status',  authenticate, controller.getHealthySubscription);
router.put('/subscription/healthy/cancel',  authenticate, controller.cancelHealthySubscription);

// Admin — Healthy Subscriptions
router.get('/admin/subscriptions/healthy',                    authenticate, isAdmin, controller.getAllHealthySubscriptions);
router.put('/admin/subscriptions/healthy/:id/approve',        authenticate, isAdmin, controller.approveHealthySubscription);
router.put('/admin/subscriptions/healthy/:id/reject',         authenticate, isAdmin, controller.rejectHealthySubscription);

// Admin — Orders
router.get('/admin/orders', authenticate, isAdmin, controller.getAllOrders);
router.put('/admin/orders/:id', authenticate, isAdmin, controller.updateOrderStatus);
router.put('/admin/orders/:id/approve-payment', authenticate, isAdmin, controller.approveOrderPayment);
router.put('/admin/orders/:id/reject-payment', authenticate, isAdmin, controller.rejectOrderPayment);

// Admin — Platinum
router.get('/admin/platinum', authenticate, isAdmin, controller.getAllPlatinumRequests);
router.put('/admin/platinum/:id/approve', authenticate, isAdmin, controller.approvePlatinumPayment);
router.put('/admin/platinum/:id/reject', authenticate, isAdmin, controller.rejectPlatinumPayment);

// Store status (public read, admin write)
router.get('/store/status',                                        controller.getStoreStatus);
router.post('/store/notify',                                       controller.addNotifyRequest);
router.post('/store/closed-checkout',                              controller.saveClosedCheckout);
router.put('/admin/store/status',           authenticate, isAdmin, controller.updateStoreStatus);
router.get('/admin/store/notify-requests',  authenticate, isAdmin, controller.getNotifyRequests);
router.put('/admin/store/notify-requests/:id/notified', authenticate, isAdmin, controller.markNotified);
router.get('/admin/store/closed-checkouts', authenticate, isAdmin, controller.getClosedCheckouts);
router.put('/admin/store/closed-checkouts/:id/notified', authenticate, isAdmin, controller.markClosedCheckoutNotified);

// Admin — Stats
router.get('/admin/stats', authenticate, isAdmin, controller.getDashboardStats);

// Expansion — out-of-radius interest capture (authenticated user)
router.post('/expansion/attempt', authenticate, controller.saveOutOfRadiusAttempt);

// Admin — Expansion analytics
router.get('/admin/expansion-data', authenticate, isAdmin, controller.getExpansionData);

// Admin — Users
router.get('/admin/users', authenticate, isAdmin, controller.getAllUsers);
router.get('/admin/users/:userId/orders', authenticate, isAdmin, controller.getUserOrders);

// User activity & cart snapshot
router.put('/user/cart', authenticate, controller.saveUserCart);
router.put('/user/activity', authenticate, controller.pingUserActivity);

// Admin — Products
router.post('/admin/bowls', authenticate, isAdmin, uploadToS3.single('image'), controller.createBowl);
router.put('/admin/bowls/:id', authenticate, isAdmin, uploadToS3.single('image'), controller.updateBowl);
router.delete('/admin/bowls/:id', authenticate, isAdmin, controller.deleteBowl);

// Admin — Ingredients
router.post('/admin/ingredients', authenticate, isAdmin, uploadToS3.single('image'), controller.createIngredient);
router.put('/admin/ingredients/:id', authenticate, isAdmin, uploadToS3.single('image'), controller.updateIngredient);
router.delete('/admin/ingredients/:id', authenticate, isAdmin, controller.deleteIngredient);

// ── Delivery Partner ──────────────────────────────────────────────────────
router.post('/delivery/login',                                      controller.deliveryLogin);
router.get('/delivery/orders/available', authenticateDelivery,      controller.getAvailableOrders);
router.get('/delivery/orders/active',    authenticateDelivery,      controller.getActiveDelivery);
router.get('/delivery/orders/history',   authenticateDelivery,      controller.getDeliveryHistory);
router.put('/delivery/orders/:id/pickup',  authenticateDelivery,    controller.pickupOrder);
router.put('/delivery/orders/:id/deliver', authenticateDelivery,    controller.markDelivered);
router.get('/delivery/stats',            authenticateDelivery,      controller.getDeliveryStats);

// ── Advertisement Agents ───────────────────────────────────────────────────
// Public — lead capture
router.post('/agents/auth',                                        agentController.agentLogin);
router.post('/ref/:agentCode/scan',                                agentController.trackAgentScan);
router.post('/ref/:agentCode/register',                            agentController.registerAgentLead);

// Authenticated agent
router.get('/agents/me', authenticateAgent,                        agentController.getAgentProfile);

// Admin — agents management
router.get('/admin/agents',                authenticate, isAdmin,  agentController.adminGetAllAgents);
router.get('/admin/agents/stats',          authenticate, isAdmin,  agentController.adminAgentStats);
router.get('/admin/agents/settings',       authenticate, isAdmin,  agentController.adminGetAgentSettings);
router.put('/admin/agents/settings',       authenticate, isAdmin,  agentController.adminUpdateAgentSettings);
router.get('/admin/agents/:id',            authenticate, isAdmin,  agentController.adminGetAgentDetail);
router.put('/admin/agents/:id',            authenticate, isAdmin,  agentController.adminUpdateAgent);
router.put('/admin/agents/:id/wallet',     authenticate, isAdmin,  agentController.adminAdjustWallet);
router.delete('/admin/agents/:id',         authenticate, isAdmin,  agentController.adminDeleteAgent);

// ── Marketing Campaigns ─────────────────────────────────────────────────────
// Public
router.get('/campaign/:code/info',      controller.getCampaignInfo);
router.post('/campaign/:code/scan',     controller.trackCampaignScan);
router.post('/campaign/:code/lead',     authenticate, controller.registerCampaignLead);

// Admin
router.get('/admin/campaigns',          authenticate, isAdmin, controller.adminGetCampaigns);
router.post('/admin/campaigns',         authenticate, isAdmin, controller.adminCreateCampaign);
router.get('/admin/campaigns/:id',      authenticate, isAdmin, controller.adminGetCampaignDetail);

export default router;
