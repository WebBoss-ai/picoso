import express from 'express';
import * as controller from '../controllers/controller.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { uploadToS3 } from '../utils/s3.js';

const router = express.Router();

// Auth Routes
router.post('/auth/send-otp', controller.sendOTPController);
router.post('/auth/verify-otp', controller.verifyOTPController);

// Bowl Routes
router.get('/bowls', controller.getBowls);
router.get('/bowls/:id', controller.getBowlById);

// Ingredient Routes
router.get('/ingredients', controller.getIngredients);

// Order Routes (Protected)
router.post('/orders', authenticate, controller.createOrder);
router.get('/orders', authenticate, controller.getOrders);
router.get('/orders/:id', authenticate, controller.getOrderById);

// User Routes (Protected)
router.get('/profile', authenticate, controller.getProfile);
router.put('/profile', authenticate, controller.updateProfile);

// Feedback Routes (Protected)
router.post('/feedback', authenticate, controller.createFeedback);

// Admin Routes (Protected + Admin Only)
router.get('/admin/orders', authenticate, isAdmin, controller.getAllOrders);
router.put('/admin/orders/:id', authenticate, isAdmin, controller.updateOrderStatus);
router.get('/admin/stats', authenticate, isAdmin, controller.getDashboardStats);

router.post('/admin/bowls', authenticate, isAdmin, uploadToS3.single('image'), controller.createBowl);
router.put('/admin/bowls/:id', authenticate, isAdmin, uploadToS3.single('image'), controller.updateBowl);
router.delete('/admin/bowls/:id', authenticate, isAdmin, controller.deleteBowl);

router.post('/admin/ingredients', authenticate, isAdmin, uploadToS3.single('image'), controller.createIngredient);
router.put('/admin/ingredients/:id', authenticate, isAdmin, uploadToS3.single('image'), controller.updateIngredient);
router.delete('/admin/ingredients/:id', authenticate, isAdmin, controller.deleteIngredient);

export default router;
