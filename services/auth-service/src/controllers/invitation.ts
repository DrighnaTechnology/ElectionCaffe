import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, getNotificationProvider, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');

const INVITATION_EXPIRY_DAYS = 7;

export class InvitationController {
  // Create invitation (for Tenant Admin inviting users)
  async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      const tenantId = req.headers['x-tenant-id'] as string;

      const {
        mobile,
        email,
        firstName,
        lastName,
        role,
        electionId,
        message
      } = req.body;

      if (!mobile || !firstName || !role) {
        res.status(400).json(errorResponse('E2001', 'Mobile, first name, and role are required'));
        return;
      }

      // Get inviter info
      const inviter = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, role: true }
      });

      if (!inviter) {
        res.status(404).json(errorResponse('E3001', 'Inviter not found'));
        return;
      }

      // Check if user already exists in this tenant
      const existingUser = await prisma.user.findFirst({
        where: { tenantId, mobile }
      });

      if (existingUser) {
        res.status(409).json(errorResponse('E3002', 'User with this mobile already exists in this tenant'));
        return;
      }

      // Check for existing pending invitation
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          invitedByTenantId: tenantId,
          mobile,
          status: 'PENDING'
        }
      });

      if (existingInvitation) {
        res.status(409).json(errorResponse('E3002', 'A pending invitation already exists for this mobile'));
        return;
      }

      // Generate unique token
      const token = crypto.randomBytes(32).toString('hex');

      // Create invitation
      const invitation = await prisma.invitation.create({
        data: {
          invitationType: 'TENANT_USER',
          invitedByTenantId: tenantId,
          electionId,
          mobile,
          email,
          firstName,
          lastName,
          role,
          token,
          status: 'PENDING',
          message,
          invitedBy: userId,
          invitedByName: `${inviter.firstName} ${inviter.lastName || ''}`.trim(),
          invitedByType: 'user',
          expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        }
      });

      // Send invitation notification
      const notifier = getNotificationProvider();
      const inviteLink = `${process.env.APP_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`;
      if (invitation.mobile) {
        await notifier.sendSMS(invitation.mobile, `You've been invited to join ElectionCaffe. Accept here: ${inviteLink}`);
      }
      if (invitation.email) {
        await notifier.sendEmail(invitation.email, 'You have been invited to ElectionCaffe', `Hi ${invitation.firstName || ''},\n\nYou've been invited to join ElectionCaffe.\n\nAccept your invitation: ${inviteLink}`);
      }

      res.status(201).json(successResponse({
        id: invitation.id,
        mobile: invitation.mobile,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        inviteLink: `${process.env.APP_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`,
      }));
    } catch (error) {
      logger.error({ err: error }, 'Create invitation error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // Get all invitations for tenant
  async getInvitations(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { status, page = 1, limit = 20 } = req.query;

      const where: any = { invitedByTenantId: tenantId };
      if (status) {
        where.status = status;
      }

      const [invitations, total] = await Promise.all([
        prisma.invitation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          select: {
            id: true,
            mobile: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            invitedByName: true,
            expiresAt: true,
            acceptedAt: true,
            resentCount: true,
            createdAt: true,
          }
        }),
        prisma.invitation.count({ where })
      ]);

      res.json(successResponse({
        invitations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }));
    } catch (error) {
      logger.error({ err: error }, 'Get invitations error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // Get invitation by ID
  async getInvitationById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const invitation = await prisma.invitation.findFirst({
        where: { id, invitedByTenantId: tenantId }
      });

      if (!invitation) {
        res.status(404).json(errorResponse('E3001', 'Invitation not found'));
        return;
      }

      res.json(successResponse(invitation));
    } catch (error) {
      logger.error({ err: error }, 'Get invitation error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // Resend invitation
  async resendInvitation(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const invitation = await prisma.invitation.findFirst({
        where: { id, invitedByTenantId: tenantId }
      });

      if (!invitation) {
        res.status(404).json(errorResponse('E3001', 'Invitation not found'));
        return;
      }

      if (invitation.status !== 'PENDING') {
        res.status(400).json(errorResponse('E2004', 'Can only resend pending invitations'));
        return;
      }

      // Generate new token and extend expiry
      const token = crypto.randomBytes(32).toString('hex');

      const updated = await prisma.invitation.update({
        where: { id },
        data: {
          token,
          status: 'RESENT',
          expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          lastResentAt: new Date(),
          resentCount: invitation.resentCount + 1,
        }
      });

      // Reset status back to PENDING after recording resent
      await prisma.invitation.update({
        where: { id },
        data: { status: 'PENDING' }
      });

      // Send resend notification
      const notifier = getNotificationProvider();
      const inviteLink = `${process.env.APP_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`;
      if (invitation.mobile) {
        await notifier.sendSMS(invitation.mobile, `Reminder: You've been invited to join ElectionCaffe. Accept here: ${inviteLink}`);
      }
      if (invitation.email) {
        await notifier.sendEmail(invitation.email, 'Invitation Reminder - ElectionCaffe', `Hi ${invitation.firstName || ''},\n\nThis is a reminder that you've been invited to join ElectionCaffe.\n\nAccept your invitation: ${inviteLink}`);
      }

      res.json(successResponse({
        message: 'Invitation resent successfully',
        expiresAt: updated.expiresAt,
        resentCount: updated.resentCount,
      }));
    } catch (error) {
      logger.error({ err: error }, 'Resend invitation error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // Cancel invitation
  async cancelInvitation(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const invitation = await prisma.invitation.findFirst({
        where: { id, invitedByTenantId: tenantId }
      });

      if (!invitation) {
        res.status(404).json(errorResponse('E3001', 'Invitation not found'));
        return;
      }

      if (invitation.status === 'ACCEPTED') {
        res.status(400).json(errorResponse('E2004', 'Cannot cancel an accepted invitation'));
        return;
      }

      await prisma.invitation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        }
      });

      res.json(successResponse({ message: 'Invitation cancelled successfully' }));
    } catch (error) {
      logger.error({ err: error }, 'Cancel invitation error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // Accept invitation (public endpoint)
  async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json(errorResponse('E2001', 'Token and password are required'));
        return;
      }

      // Find invitation by token
      const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
          invitedByTenant: true,
          tenant: true,
        }
      });

      if (!invitation) {
        res.status(404).json(errorResponse('E3001', 'Invitation not found or invalid token'));
        return;
      }

      if (invitation.status !== 'PENDING') {
        res.status(400).json(errorResponse('E2004', `Invitation is ${invitation.status.toLowerCase()}`));
        return;
      }

      if (invitation.expiresAt < new Date()) {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' }
        });
        res.status(400).json(errorResponse('E2004', 'Invitation has expired'));
        return;
      }

      // Determine tenant ID based on invitation type
      const targetTenantId = invitation.invitationType === 'TENANT_ADMIN'
        ? invitation.tenantId
        : invitation.invitedByTenantId;

      if (!targetTenantId) {
        res.status(400).json(errorResponse('E2004', 'Invalid invitation configuration'));
        return;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: { tenantId: targetTenantId, mobile: invitation.mobile }
      });

      if (existingUser) {
        res.status(409).json(errorResponse('E3002', 'User with this mobile already exists'));
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          tenantId: targetTenantId,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          mobile: invitation.mobile,
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          status: 'ACTIVE',
        }
      });

      // Update invitation
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          createdUserId: user.id,
        }
      });

      res.status(201).json(successResponse({
        message: 'Invitation accepted successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          mobile: user.mobile,
          email: user.email,
          role: user.role,
        }
      }));
    } catch (error) {
      logger.error({ err: error }, 'Accept invitation error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  // Validate invitation token (public endpoint)
  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
          invitedByTenant: {
            select: { name: true, slug: true, logoUrl: true }
          },
          tenant: {
            select: { name: true, slug: true, logoUrl: true }
          }
        }
      });

      if (!invitation) {
        res.status(404).json(errorResponse('E3001', 'Invalid invitation token'));
        return;
      }

      if (invitation.status !== 'PENDING') {
        res.status(400).json(errorResponse('E2004', `Invitation is ${invitation.status.toLowerCase()}`));
        return;
      }

      if (invitation.expiresAt < new Date()) {
        res.status(400).json(errorResponse('E2004', 'Invitation has expired'));
        return;
      }

      const tenant = invitation.invitationType === 'TENANT_ADMIN'
        ? invitation.tenant
        : invitation.invitedByTenant;

      res.json(successResponse({
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        mobile: invitation.mobile,
        email: invitation.email,
        role: invitation.role,
        invitedByName: invitation.invitedByName,
        message: invitation.message,
        expiresAt: invitation.expiresAt,
        tenant,
      }));
    } catch (error) {
      logger.error({ err: error }, 'Validate token error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }
}
