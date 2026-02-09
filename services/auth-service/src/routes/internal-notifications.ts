import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// ==================== NOTIFICATIONS (Admin) ====================

// Get all notifications (created by tenant)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { status, priority, notificationType, page = '1', limit = '20' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenant.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (notificationType) where.notificationType = notificationType;

    const [notifications, total] = await Promise.all([
      prisma.internalNotification.findMany({
        where,
        include: {
          _count: { select: { recipients: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.internalNotification.count({ where }),
    ]);

    res.json(successResponse({ notifications, total, page: parseInt(page as string), limit: parseInt(limit as string) }));
  } catch (error) {
    logger.error({ err: error }, 'Get notifications error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single notification with recipients
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const notification = await prisma.internalNotification.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: {
        recipients: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!notification) {
      res.status(404).json(errorResponse('E3001', 'Notification not found'));
      return;
    }

    res.json(successResponse(notification));
  } catch (error) {
    logger.error({ err: error }, 'Get notification error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create notification/announcement
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'DISTRICT_ADMIN', 'MANDAL_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const {
      title, titleLocal, message, messageLocal, notificationType, category,
      targetRoles, targetUserIds, targetAll, geographicScope,
      channels, priority, attachments, actionUrl, actionLabel, requiresAck,
      expiresAt, scheduledAt,
    } = req.body;

    if (!title || !message || !notificationType) {
      res.status(400).json(errorResponse('E2001', 'Title, message, and notification type are required'));
      return;
    }

    const notification = await prisma.internalNotification.create({
      data: {
        tenantId: user.tenant.id,
        title,
        titleLocal,
        message,
        messageLocal,
        notificationType,
        category,
        targetRoles: targetRoles || [],
        targetUserIds: targetUserIds || [],
        targetAll: targetAll || false,
        geographicScope: geographicScope || {},
        channels: channels || ['app'],
        priority: priority || 'NORMAL',
        attachments: attachments || [],
        actionUrl,
        actionLabel,
        requiresAck: requiresAck || false,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        createdBy: userId,
      },
    });

    res.status(201).json(successResponse({ notification, message: 'Notification created' }));
  } catch (error) {
    logger.error({ err: error }, 'Create notification error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update notification
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const notification = await prisma.internalNotification.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!notification) {
      res.status(404).json(errorResponse('E3001', 'Notification not found'));
      return;
    }

    if (notification.status === 'SENT') {
      res.status(400).json(errorResponse('E2013', 'Cannot edit sent notification'));
      return;
    }

    const {
      title, titleLocal, message, messageLocal, notificationType, category,
      targetRoles, targetUserIds, targetAll, geographicScope,
      channels, priority, attachments, actionUrl, actionLabel, requiresAck,
      expiresAt, scheduledAt,
    } = req.body;

    const updatedNotification = await prisma.internalNotification.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleLocal !== undefined && { titleLocal }),
        ...(message !== undefined && { message }),
        ...(messageLocal !== undefined && { messageLocal }),
        ...(notificationType !== undefined && { notificationType }),
        ...(category !== undefined && { category }),
        ...(targetRoles !== undefined && { targetRoles }),
        ...(targetUserIds !== undefined && { targetUserIds }),
        ...(targetAll !== undefined && { targetAll }),
        ...(geographicScope !== undefined && { geographicScope }),
        ...(channels !== undefined && { channels }),
        ...(priority !== undefined && { priority }),
        ...(attachments !== undefined && { attachments }),
        ...(actionUrl !== undefined && { actionUrl }),
        ...(actionLabel !== undefined && { actionLabel }),
        ...(requiresAck !== undefined && { requiresAck }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      },
    });

    res.json(successResponse({ notification: updatedNotification, message: 'Notification updated' }));
  } catch (error) {
    logger.error({ err: error }, 'Update notification error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Publish/Send notification
router.post('/:id/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const notification = await prisma.internalNotification.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!notification) {
      res.status(404).json(errorResponse('E3001', 'Notification not found'));
      return;
    }

    if (notification.status === 'SENT') {
      res.status(400).json(errorResponse('E2014', 'Notification already sent'));
      return;
    }

    // Get target users based on targeting settings
    let targetUserIds: string[] = [];

    if (notification.targetAll) {
      const users = await prisma.user.findMany({
        where: { tenantId: user.tenant.id, status: 'ACTIVE' },
        select: { id: true },
      });
      targetUserIds = users.map(u => u.id);
    } else if (Array.isArray(notification.targetRoles) && notification.targetRoles.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          tenantId: user.tenant.id,
          status: 'ACTIVE',
          role: { in: notification.targetRoles as any },
        },
        select: { id: true },
      });
      targetUserIds = users.map(u => u.id);
    } else if (Array.isArray(notification.targetUserIds) && notification.targetUserIds.length > 0) {
      targetUserIds = notification.targetUserIds as string[];
    }

    // Create recipient records for app channel
    const recipientData = targetUserIds.map(recipientUserId => ({
      notificationId: notification.id,
      userId: recipientUserId,
      channel: 'app',
      status: 'delivered',
      deliveredAt: new Date(),
    }));

    await prisma.notificationRecipient.createMany({
      data: recipientData,
      skipDuplicates: true,
    });

    // Update notification status
    await prisma.internalNotification.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalRecipients: targetUserIds.length,
        deliveredCount: targetUserIds.length,
      },
    });

    res.json(successResponse({ recipientCount: targetUserIds.length }));
  } catch (error) {
    logger.error({ err: error }, 'Publish notification error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete notification
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const notification = await prisma.internalNotification.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!notification) {
      res.status(404).json(errorResponse('E3001', 'Notification not found'));
      return;
    }

    // Delete recipients first (cascade should handle this but being explicit)
    await prisma.notificationRecipient.deleteMany({ where: { notificationId: id } });
    await prisma.internalNotification.delete({ where: { id } });

    res.json(successResponse({ message: 'Notification deleted' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete notification error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== USER INBOX ====================

// Get current user's notifications (inbox)
router.get('/inbox/my', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { isRead, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { userId };
    if (isRead !== undefined) {
      if (isRead === 'true') {
        where.readAt = { not: null };
      } else {
        where.readAt = null;
      }
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notificationRecipient.findMany({
        where,
        include: {
          notification: {
            select: {
              id: true,
              title: true,
              titleLocal: true,
              message: true,
              messageLocal: true,
              notificationType: true,
              priority: true,
              channels: true,
              actionUrl: true,
              actionLabel: true,
              attachments: true,
              sentAt: true,
              expiresAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.notificationRecipient.count({ where }),
      prisma.notificationRecipient.count({ where: { userId, readAt: null } }),
    ]);

    res.json(successResponse({
      notifications,
      total,
      unreadCount,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get inbox error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Mark notification as read
router.patch('/inbox/:recipientId/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { recipientId } = req.params;

    const recipient = await prisma.notificationRecipient.findFirst({
      where: { id: recipientId, userId },
    });

    if (!recipient) {
      res.status(404).json(errorResponse('E3001', 'Notification not found'));
      return;
    }

    await prisma.notificationRecipient.update({
      where: { id: recipientId },
      data: { readAt: new Date(), status: 'read' },
    });

    // Update read count on notification
    await prisma.internalNotification.update({
      where: { id: recipient.notificationId },
      data: { readCount: { increment: 1 } },
    });

    res.json(successResponse({ message: 'Marked as read' }));
  } catch (error) {
    logger.error({ err: error }, 'Mark read error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Mark all as read
router.patch('/inbox/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const unreadRecipients = await prisma.notificationRecipient.findMany({
      where: { userId, readAt: null },
      select: { id: true, notificationId: true },
    });

    if (unreadRecipients.length > 0) {
      await prisma.notificationRecipient.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date(), status: 'read' },
      });

      // Update read counts (group by notification)
      const notificationIds = [...new Set(unreadRecipients.map(r => r.notificationId))];
      for (const notifId of notificationIds) {
        const count = unreadRecipients.filter(r => r.notificationId === notifId).length;
        await prisma.internalNotification.update({
          where: { id: notifId },
          data: { readCount: { increment: count } },
        });
      }
    }

    res.json(successResponse({ message: 'All notifications marked as read' }));
  } catch (error) {
    logger.error({ err: error }, 'Mark all read error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete notification from inbox
router.delete('/inbox/:recipientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { recipientId } = req.params;

    const recipient = await prisma.notificationRecipient.findFirst({
      where: { id: recipientId, userId },
    });

    if (!recipient) {
      res.status(404).json(errorResponse('E3001', 'Notification not found'));
      return;
    }

    await prisma.notificationRecipient.delete({ where: { id: recipientId } });

    res.json(successResponse({ message: 'Notification removed from inbox' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete from inbox error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as internalNotificationsRoutes };
