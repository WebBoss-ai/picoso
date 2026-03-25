import express from 'express';
import * as controller from '../controllers/controller.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { uploadToS3 } from '../utils/s3.js';

const router = express.Router();

// Auth
router.post('/auth/send-otp', controller.sendOTPController);
router.post('/auth/verify-otp', controller.verifyOTPController);

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

// Admin — Orders
router.get('/admin/orders', authenticate, isAdmin, controller.getAllOrders);
router.put('/admin/orders/:id', authenticate, isAdmin, controller.updateOrderStatus);
router.put('/admin/orders/:id/approve-payment', authenticate, isAdmin, controller.approveOrderPayment);
router.put('/admin/orders/:id/reject-payment', authenticate, isAdmin, controller.rejectOrderPayment);

// Admin — Platinum
router.get('/admin/platinum', authenticate, isAdmin, controller.getAllPlatinumRequests);
router.put('/admin/platinum/:id/approve', authenticate, isAdmin, controller.approvePlatinumPayment);
router.put('/admin/platinum/:id/reject', authenticate, isAdmin, controller.rejectPlatinumPayment);

// Admin — Stats
router.get('/admin/stats', authenticate, isAdmin, controller.getDashboardStats);

// Admin — Users
router.get('/admin/users', authenticate, isAdmin, controller.getAllUsers);

// Admin — Products
router.post('/admin/bowls', authenticate, isAdmin, uploadToS3.single('image'), controller.createBowl);
router.put('/admin/bowls/:id', authenticate, isAdmin, uploadToS3.single('image'), controller.updateBowl);
router.delete('/admin/bowls/:id', authenticate, isAdmin, controller.deleteBowl);

// Admin — Ingredients
router.post('/admin/ingredients', authenticate, isAdmin, uploadToS3.single('image'), controller.createIngredient);
router.put('/admin/ingredients/:id', authenticate, isAdmin, uploadToS3.single('image'), controller.updateIngredient);
router.delete('/admin/ingredients/:id', authenticate, isAdmin, controller.deleteIngredient);

export default router;
