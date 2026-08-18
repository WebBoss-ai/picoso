import express from 'express';
import * as controller from '../controllers/controller.js';
import * as agentController from '../controllers/agentController.js';
import * as breakfast from '../controllers/breakfastController.js';
import { authenticate, isAdmin, authenticateDelivery } from '../middleware/auth.js';
import { authenticateAgent } from '../middleware/agentAuth.js';
import { requireMarketingPin } from '../middleware/marketingAuth.js';
import { requireAdmin2Pin } from '../middleware/admin2Auth.js';
import * as marketing from '../controllers/marketingController.js';
import { uploadToS3 } from '../utils/s3.js';
import llmRouter from '../llm/routes.js';
import platformRouter from '../llm/routes/platform.js';
import * as wpMarketing  from '../controllers/wpMarketingController.js';
import * as wpExecution  from '../controllers/wpExecutionController.js';
import * as wpWebhook    from '../controllers/wpWebhookController.js';
import { requireWpPin } from '../middleware/wpMarketingAuth.js';

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
// Authenticated
router.post('/campaign/:code/lead',     authenticate, controller.registerCampaignLead);
router.get('/campaign/:code/my-status', authenticate, controller.getCampaignMyStatus);

// Admin
router.get('/admin/campaigns',          authenticate, isAdmin, controller.adminGetCampaigns);
router.post('/admin/campaigns',         authenticate, isAdmin, controller.adminCreateCampaign);
router.get('/admin/campaigns/:id',      authenticate, isAdmin, controller.adminGetCampaignDetail);

// ── Friend Referral System ───────────────────────────────────────────────────
// Public
router.get('/friendship/:code',                                       controller.getReferralInfo);
router.post('/referral/request',                                      controller.requestReferralLink);
// Authenticated
router.post('/friendship/:code/join',   authenticate,                 controller.joinViaReferral);
router.get('/my/referrals',             authenticate,                 controller.getMyReferrals);
// Admin
router.get('/admin/referrals',          authenticate, isAdmin,        controller.adminGetReferrals);
router.post('/admin/referrals',         authenticate, isAdmin,        controller.adminCreateReferral);
router.put('/admin/referrals/:id',      authenticate, isAdmin,        controller.adminUpdateReferral);
router.get('/admin/referrals/requests', authenticate, isAdmin,        controller.adminGetReferralRequests);
router.put('/admin/referrals/requests/:id/approve', authenticate, isAdmin, controller.adminApproveReferralRequest);
router.put('/admin/referrals/requests/:id/reject',  authenticate, isAdmin, controller.adminRejectReferralRequest);
router.get('/admin/referrals/settings', authenticate, isAdmin,        controller.adminGetReferralSettings);
router.put('/admin/referrals/settings', authenticate, isAdmin,        controller.adminUpdateReferralSettings);

// ── Breakfast subscription (public) ─────────────────────────────────────────
router.get('/subscription/breakfast/menu', breakfast.getBreakfastMenu);
router.post('/subscription/breakfast/interest', breakfast.expressBreakfastInterest);

// ── Admin2: Breakfast subscription console (PIN 0095) ───────────────────────
router.post('/admin2/verify-pin', requireAdmin2Pin, breakfast.verifyAdmin2Pin);
router.get('/admin2/subscription/stats', requireAdmin2Pin, breakfast.admin2GetStats);
router.get('/admin2/subscription/leads', requireAdmin2Pin, breakfast.admin2GetLeads);
router.put('/admin2/subscription/leads/:id', requireAdmin2Pin, breakfast.admin2UpdateLead);
router.delete('/admin2/subscription/leads/:id', requireAdmin2Pin, breakfast.admin2DeleteLead);
router.get('/admin2/subscription/menu', requireAdmin2Pin, breakfast.admin2GetMenu);
router.post('/admin2/subscription/menu', requireAdmin2Pin, breakfast.admin2CreateMenuItem);
router.put('/admin2/subscription/menu/:id', requireAdmin2Pin, breakfast.admin2UpdateMenuItem);
router.delete('/admin2/subscription/menu/:id', requireAdmin2Pin, breakfast.admin2DeleteMenuItem);

// ── Marketing / WhatsApp Automation (6-digit PIN protected) ──────────────────
router.post('/marketing/verify-pin',        requireMarketingPin, marketing.verifyPin);
// WhatsApp Web connection
router.get('/marketing/wa/status',          requireMarketingPin, marketing.getWaStatus);
router.post('/marketing/wa/init',           requireMarketingPin, marketing.initWa);
router.post('/marketing/wa/restart',        requireMarketingPin, marketing.restartWa);
router.post('/marketing/wa/logout',         requireMarketingPin, marketing.logoutWa);
router.post('/marketing/wa/send',           requireMarketingPin, marketing.sendSingle);
// Welcome automation
router.get('/marketing/welcome',            requireMarketingPin, marketing.getWelcome);
router.put('/marketing/welcome',            requireMarketingPin, marketing.updateWelcome);
// Bulk campaigns
router.post('/marketing/campaigns',         requireMarketingPin, marketing.createCampaign);
router.get('/marketing/campaigns',          requireMarketingPin, marketing.listCampaigns);
router.get('/marketing/campaigns/:id',      requireMarketingPin, marketing.getCampaign);
router.post('/marketing/campaigns/:id/start', requireMarketingPin, marketing.startCampaignCtrl);
router.post('/marketing/campaigns/:id/pause', requireMarketingPin, marketing.pauseCampaignCtrl);
router.post('/marketing/campaigns/:id/stop',  requireMarketingPin, marketing.stopCampaignCtrl);
router.delete('/marketing/campaigns/:id',   requireMarketingPin, marketing.deleteCampaign);
// Logs & stats
router.get('/marketing/logs',               requireMarketingPin, marketing.getLogs);
router.get('/marketing/stats',              requireMarketingPin, marketing.getStats);

// ── WP Marketing Platform (per-client PIN) ────────────────────────────────
router.post('/wp-marketing/verify-pin',            requireWpPin, wpMarketing.verifyPin);
router.get('/wp-marketing/overview',               requireWpPin, wpMarketing.getOverview);
// Contact lists
router.get('/wp-marketing/contacts',               requireWpPin, wpMarketing.getContactLists);
router.post('/wp-marketing/contacts',              requireWpPin, wpMarketing.createContactList);
router.get('/wp-marketing/contacts/:id',           requireWpPin, wpMarketing.getContactList);
router.delete('/wp-marketing/contacts/:id',        requireWpPin, wpMarketing.deleteContactList);
router.post('/wp-marketing/contacts/:id/members',  requireWpPin, wpMarketing.addContactsToList);
// Campaign drafts
router.get('/wp-marketing/campaigns',                      requireWpPin, wpMarketing.getCampaigns);
router.post('/wp-marketing/campaigns',                     requireWpPin, wpMarketing.createCampaign);
router.put('/wp-marketing/campaigns/:id',                  requireWpPin, wpMarketing.updateCampaign);
router.delete('/wp-marketing/campaigns/:id',               requireWpPin, wpMarketing.deleteCampaign);
router.post('/wp-marketing/campaigns/:id/analyze',         requireWpPin, wpMarketing.analyzeCampaign);
// Experiment plan (Phase 2)
router.post('/wp-marketing/campaigns/:id/generate-plan',   requireWpPin, wpMarketing.generatePlan);
router.get('/wp-marketing/campaigns/:id/plan',             requireWpPin, wpMarketing.getPlan);
router.post('/wp-marketing/campaigns/:id/approve-plan',    requireWpPin, wpMarketing.approvePlan);
// Tracking links
router.post('/wp-marketing/tracking-links',                requireWpPin, wpMarketing.createTrackingLink);
// Public click tracking — no PIN, used by WhatsApp link recipients
router.get('/t/:code',                                     wpMarketing.handleTrackClick);

// ── WP Marketing — WhatsApp / Templates ───────────────────────────────────
router.get('/wp-marketing/wa/status',                      requireWpPin, wpExecution.getWaStatus);
router.get('/wp-marketing/wa/templates',                   requireWpPin, wpExecution.getTemplates);
router.post('/wp-marketing/wa/test-send',                  requireWpPin, wpExecution.sendTestMessage);

// ── WP Marketing — Experiments (Phase 3 execution) ───────────────────────
router.get('/wp-marketing/experiments/:id/dashboard',      requireWpPin, wpExecution.getDashboard);
router.post('/wp-marketing/experiments/:id/execute',       requireWpPin, wpExecution.executeRun);
router.post('/wp-marketing/experiments/:id/analyze',       requireWpPin, wpExecution.analyzeRun);
router.post('/wp-marketing/experiments/:id/advance',       requireWpPin, wpExecution.advancePhase);
router.get('/wp-marketing/campaigns/:id/experiment',       requireWpPin, wpExecution.getExperimentByCampaign);

// ── CampaignBot Webhooks — public, HMAC-secured ───────────────────────────
router.post('/webhooks/campaignbot',                       wpWebhook.handleWebhook);

// ── Picoso Intelligence (/llm console) — self-contained module ───────────────
router.use('/llm', llmRouter);
router.use('/llm', platformRouter);

export default router;
