import { Router } from 'express';
import { AuthController } from '../controllers/auth.js';
import { internalAuthMiddleware } from '../middleware/internalAuth.js';

const router = Router();
const authController = new AuthController();

// All internal routes require x-internal-key header
router.use(internalAuthMiddleware);

// Get tenant admin info (called by super-admin-service)
router.post('/admin-info', authController.internalGetAdminInfo.bind(authController));

// Generate temp password for tenant admin (called by super-admin-service)
router.post('/admin-reset-password', authController.internalResetAdminPassword.bind(authController));

export { router as internalRoutes };
