import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { coreDb as prisma } from '@electioncaffe/database';
import { getNotificationProvider } from '@electioncaffe/shared';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';

const router = Router();

const INVITATION_EXPIRY_DAYS = 7;

// All invitation routes require super admin authentication
router.use(superAdminAuthMiddleware);

// Schema for creating tenant admin invitation
const createInvitationSchema = z.object({
  mobile: z.string().min(10),
  email: z.string().email().optional(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  tenantId: z.string().uuid(),
  message: z.string().optional(),
});

// Create invitation for a Tenant Admin
router.post('/', async (req, res, next) => {
  try {
    const superAdminId = req.headers['x-super-admin-id'] as string;
    const data = createInvitationSchema.parse(req.body);

    // Get Super Admin info
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId },
      select: { email: true },
    });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Super Admin not found' },
      });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { id: true, name: true, tenantType: true },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Tenant not found' },
      });
    }

    // Check if user already exists in this tenant
    const existingUser = await (prisma as any).user.findFirst({
      where: { tenantId: data.tenantId, mobile: data.mobile },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'E3002', message: 'User with this mobile already exists in this tenant' },
      });
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        tenantId: data.tenantId,
        mobile: data.mobile,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        error: { code: 'E3002', message: 'A pending invitation already exists for this mobile' },
      });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Determine role based on tenant type
    const role = tenant.tenantType === 'POLITICAL_PARTY'
      ? 'CENTRAL_ADMIN'
      : tenant.tenantType === 'ELECTION_MANAGEMENT'
        ? 'EMC_ADMIN'
        : 'CANDIDATE_ADMIN';

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        invitationType: 'TENANT_ADMIN',
        tenantId: data.tenantId,
        mobile: data.mobile,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role,
        token,
        status: 'PENDING',
        message: data.message,
        invitedBy: superAdminId,
        invitedByName: 'Super Admin',
        invitedByType: 'super_admin',
        expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Send invitation notification
    const notifier = getNotificationProvider();
    const inviteLink = `${process.env.APP_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`;
    if (invitation.mobile) {
      await notifier.sendSMS(invitation.mobile, `You've been invited as admin for ${invitation.tenant?.name || 'a tenant'} on ElectionCaffe. Accept here: ${inviteLink}`);
    }
    if (invitation.email) {
      await notifier.sendEmail(invitation.email, 'Admin Invitation - ElectionCaffe', `Hi ${invitation.firstName || ''},\n\nYou've been invited as an admin for ${invitation.tenant?.name || 'a tenant'} on ElectionCaffe.\n\nAccept your invitation: ${inviteLink}`);
    }

    res.status(201).json({
      success: true,
      data: {
        id: invitation.id,
        mobile: invitation.mobile,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        tenant: invitation.tenant,
        inviteLink: `${process.env.APP_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get all invitations (Super Admin view)
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const tenantId = req.query.tenantId as string;

    const where: any = {
      invitationType: 'TENANT_ADMIN',
    };

    if (status) {
      where.status = status;
    }

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.invitation.count({ where }),
    ]);

    res.json({
      success: true,
      data: invitations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get invitation by ID
router.get('/:id', async (req, res, next) => {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Invitation not found' },
      });
    }

    res.json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
});

// Resend invitation
router.post('/:id/resend', async (req, res, next) => {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: req.params.id },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Invitation not found' },
      });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: { code: 'E2004', message: 'Can only resend pending invitations' },
      });
    }

    // Generate new token and extend expiry
    const token = crypto.randomBytes(32).toString('hex');

    const updated = await prisma.invitation.update({
      where: { id: req.params.id },
      data: {
        token,
        expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        lastResentAt: new Date(),
        resentCount: invitation.resentCount + 1,
      },
    });

    // Send resend notification
    const notifier = getNotificationProvider();
    const inviteLink = `${process.env.APP_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`;
    if (invitation.mobile) {
      await notifier.sendSMS(invitation.mobile, `Reminder: You've been invited to ElectionCaffe. Accept here: ${inviteLink}`);
    }
    if (invitation.email) {
      await notifier.sendEmail(invitation.email, 'Invitation Reminder - ElectionCaffe', `Hi ${invitation.firstName || ''},\n\nThis is a reminder that you've been invited to ElectionCaffe.\n\nAccept your invitation: ${inviteLink}`);
    }

    res.json({
      success: true,
      data: {
        message: 'Invitation resent successfully',
        expiresAt: updated.expiresAt,
        resentCount: updated.resentCount,
        inviteLink,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cancel invitation
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: req.params.id },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Invitation not found' },
      });
    }

    if (invitation.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        error: { code: 'E2004', message: 'Cannot cancel an accepted invitation' },
      });
    }

    await prisma.invitation.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get invitations for a specific tenant
router.get('/tenant/:tenantId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = {
      tenantId: req.params.tenantId,
      invitationType: 'TENANT_ADMIN',
    };

    if (status) {
      where.status = status;
    }

    const [invitations, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invitation.count({ where }),
    ]);

    res.json({
      success: true,
      data: invitations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as invitationsRoutes };
