import { Router } from 'express';
import { InvitationController } from '../controllers/invitation.js';

const router = Router();
const invitationController = new InvitationController();

// Public routes (no auth required)
router.get('/validate/:token', invitationController.validateToken);
router.post('/accept', invitationController.acceptInvitation);

// Protected routes (requires auth middleware from gateway)
router.post('/', invitationController.createInvitation);
router.get('/', invitationController.getInvitations);
router.get('/:id', invitationController.getInvitationById);
router.post('/:id/resend', invitationController.resendInvitation);
router.post('/:id/cancel', invitationController.cancelInvitation);

export { router as invitationRoutes };
