import { Router } from 'express';
import { AuthController } from '../controllers/auth.js';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.post('/verify-otp', authController.verifyOTP.bind(authController));

// Protected routes (requires auth middleware from gateway)
router.post('/logout', authController.logout.bind(authController));
router.get('/me', authController.getProfile.bind(authController));
router.put('/me', authController.updateProfile.bind(authController));
router.put('/change-password', authController.changePassword.bind(authController));

export { router as authRoutes };
