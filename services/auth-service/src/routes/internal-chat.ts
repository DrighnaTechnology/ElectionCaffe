import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// ==================== CONVERSATIONS ====================

// Get user's conversations
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { type, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      participants: { some: { userId, leftAt: null } },
    };
    if (type) where.conversationType = type;

    const conversations = await prisma.chatConversation.findMany({
      where,
      include: {
        participants: {
          where: { leftAt: null },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            messageType: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    });

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find(p => p.userId === userId);
        const unreadCount = participant
          ? await prisma.chatMessage.count({
              where: {
                conversationId: conv.id,
                createdAt: { gt: participant.lastReadAt || new Date(0) },
                senderId: { not: userId },
              },
            })
          : 0;
        return { ...conv, unreadCount };
      })
    );

    const total = await prisma.chatConversation.count({ where });

    res.json(successResponse({
      conversations: conversationsWithUnread,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get conversations error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single conversation with messages
router.get('/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { before, limit = '50' } = req.query;

    // Verify user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: { conversationId: id, userId, leftAt: null },
    });

    if (!participant) {
      res.status(403).json(errorResponse('E4001', 'Not a member of this conversation'));
      return;
    }

    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      include: {
        participants: {
          where: { leftAt: null },
        },
      },
    });

    if (!conversation) {
      res.status(404).json(errorResponse('E3001', 'Conversation not found'));
      return;
    }

    // Get messages
    const messageWhere: any = { conversationId: id };
    if (before) {
      messageWhere.createdAt = { lt: new Date(before as string) };
    }

    const messages = await prisma.chatMessage.findMany({
      where: messageWhere,
      include: {
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
          },
        },
        reactions: true,
        readReceipts: true,
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // Update last read
    await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date(), unreadCount: 0 },
    });

    res.json(successResponse({
      conversation,
      messages: messages.reverse(), // Return in chronological order
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get conversation error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Start direct message conversation
router.post('/conversations/direct', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { recipientId } = req.body;

    if (!recipientId) {
      res.status(400).json(errorResponse('E2001', 'Recipient ID is required'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    // Check if conversation already exists
    const existingConversation = await prisma.chatConversation.findFirst({
      where: {
        conversationType: 'DIRECT',
        tenantId: user.tenant.id,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      include: {
        participants: true,
      },
    });

    if (existingConversation) {
      res.json(successResponse(existingConversation));
      return;
    }

    // Create new conversation
    const conversation = await prisma.chatConversation.create({
      data: {
        tenantId: user.tenant.id,
        conversationType: 'DIRECT',
        createdBy: userId,
        participants: {
          create: [
            { userId, role: 'member' },
            { userId: recipientId, role: 'member' },
          ],
        },
      },
      include: {
        participants: true,
      },
    });

    res.status(201).json(successResponse(conversation));
  } catch (error) {
    logger.error({ err: error }, 'Create direct conversation error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create group conversation
router.post('/conversations/group', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { name, description, participantIds, avatarUrl } = req.body;

    if (!name || !participantIds?.length) {
      res.status(400).json(errorResponse('E2001', 'Group name and participants are required'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    // Include creator in participants
    const allParticipantIds = [...new Set([userId, ...participantIds])];

    const conversation = await prisma.chatConversation.create({
      data: {
        tenantId: user.tenant.id,
        conversationType: 'GROUP',
        name,
        description,
        avatarUrl,
        createdBy: userId,
        participants: {
          create: allParticipantIds.map(pId => ({
            userId: pId,
            role: pId === userId ? 'admin' : 'member',
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    res.status(201).json(successResponse(conversation));
  } catch (error) {
    logger.error({ err: error }, 'Create group error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update group conversation
router.put('/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    // Check if user is admin
    const participant = await prisma.chatParticipant.findFirst({
      where: { conversationId: id, userId, role: 'admin', leftAt: null },
    });

    if (!participant) {
      res.status(403).json(errorResponse('E4001', 'Only admins can update group'));
      return;
    }

    const { name, nameLocal, description, avatarUrl } = req.body;

    const conversation = await prisma.chatConversation.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameLocal !== undefined && { nameLocal }),
        ...(description !== undefined && { description }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    res.json(successResponse(conversation));
  } catch (error) {
    logger.error({ err: error }, 'Update group error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Add participants to group
router.post('/conversations/:id/participants', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { participantIds } = req.body;

    // Check if user is admin
    const participant = await prisma.chatParticipant.findFirst({
      where: { conversationId: id, userId, role: 'admin', leftAt: null },
    });

    if (!participant) {
      res.status(403).json(errorResponse('E4001', 'Only admins can add participants'));
      return;
    }

    // Add new participants
    await prisma.chatParticipant.createMany({
      data: participantIds.map((pId: string) => ({
        conversationId: id,
        userId: pId,
        role: 'member',
      })),
      skipDuplicates: true,
    });

    res.json(successResponse(null));
  } catch (error) {
    logger.error({ err: error }, 'Add participants error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Leave conversation
router.post('/conversations/:id/leave', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const participant = await prisma.chatParticipant.findFirst({
      where: { conversationId: id, userId, leftAt: null },
    });

    if (!participant) {
      res.status(404).json(errorResponse('E3001', 'Not in this conversation'));
      return;
    }

    await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date(), isActive: false },
    });

    res.json(successResponse({ message: 'Left conversation' }));
  } catch (error) {
    logger.error({ err: error }, 'Leave conversation error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== MESSAGES ====================

// Send message
router.post('/conversations/:id/messages', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    // Verify user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: { conversationId: id, userId, leftAt: null },
    });

    if (!participant) {
      res.status(403).json(errorResponse('E4001', 'Not a member of this conversation'));
      return;
    }

    const { content, messageType, mediaUrl, mediaType, mediaSize, replyToId } = req.body;

    if (!content && !mediaUrl) {
      res.status(400).json(errorResponse('E2001', 'Message content or media is required'));
      return;
    }

    const message = await prisma.chatMessage.create({
      data: {
        conversation: { connect: { id } },
        senderId: userId,
        content,
        messageType: messageType || 'TEXT',
        mediaUrl,
        mediaType,
        mediaSize,
        replyToId,
      },
      include: {
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
          },
        },
      },
    });

    // Update conversation's last message time
    await prisma.chatConversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    // Update sender's last read
    await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date(), unreadCount: 0 },
    });

    // Increment unread count for other participants
    await prisma.chatParticipant.updateMany({
      where: { conversationId: id, userId: { not: userId }, leftAt: null },
      data: { unreadCount: { increment: 1 } },
    });

    res.status(201).json(successResponse(message));
  } catch (error) {
    logger.error({ err: error }, 'Send message error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Edit message
router.put('/messages/:messageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { messageId } = req.params;

    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, senderId: userId, isDeleted: false },
    });

    if (!message) {
      res.status(404).json(errorResponse('E3001', 'Message not found or not yours'));
      return;
    }

    const { content } = req.body;

    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    res.json(successResponse(updatedMessage));
  } catch (error) {
    logger.error({ err: error }, 'Edit message error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete message
router.delete('/messages/:messageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { messageId } = req.params;

    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, senderId: userId },
    });

    if (!message) {
      res.status(404).json(errorResponse('E3001', 'Message not found or not yours'));
      return;
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date(), content: null },
    });

    res.json(successResponse({ message: 'Message deleted' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete message error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Add reaction
router.post('/messages/:messageId/reactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      res.status(400).json(errorResponse('E2001', 'Emoji is required'));
      return;
    }

    // Check if reaction already exists
    const existingReaction = await prisma.messageReaction.findFirst({
      where: { messageId, userId, emoji },
    });

    if (existingReaction) {
      // Remove reaction (toggle)
      await prisma.messageReaction.delete({ where: { id: existingReaction.id } });
      res.json(successResponse({ message: 'Reaction removed' }));
      return;
    }

    const reaction = await prisma.messageReaction.create({
      data: {
        message: { connect: { id: messageId } },
        userId,
        emoji,
      },
    });

    res.status(201).json(successResponse(reaction));
  } catch (error) {
    logger.error({ err: error }, 'Add reaction error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Mark messages as read
router.post('/conversations/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { lastMessageId } = req.body;

    const participant = await prisma.chatParticipant.findFirst({
      where: { conversationId: id, userId, leftAt: null },
    });

    if (!participant) {
      res.status(403).json(errorResponse('E4001', 'Not a member'));
      return;
    }

    await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: {
        lastReadAt: new Date(),
        unreadCount: 0,
        ...(lastMessageId && { lastReadMessageId: lastMessageId }),
      },
    });

    // Create read receipt if lastMessageId provided
    if (lastMessageId) {
      await prisma.messageReadReceipt.upsert({
        where: {
          messageId_userId: { messageId: lastMessageId, userId },
        },
        create: { messageId: lastMessageId, userId },
        update: { readAt: new Date() },
      });
    }

    res.json(successResponse({ message: 'Marked as read' }));
  } catch (error) {
    logger.error({ err: error }, 'Mark read error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== SUPPORT TICKETS ====================

// Create support ticket conversation
router.post('/support/ticket', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { subject, message, priority } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    if (!subject || !message) {
      res.status(400).json(errorResponse('E2001', 'Subject and message are required'));
      return;
    }

    // Generate ticket number
    const ticketNumber = `TKT-${user.tenant.slug.toUpperCase()}-${Date.now()}`;

    // Create support ticket conversation
    const conversation = await prisma.chatConversation.create({
      data: {
        tenantId: user.tenant.id,
        conversationType: 'SUPPORT',
        subject,
        ticketNumber,
        ticketStatus: 'open',
        ticketPriority: priority || 'normal',
        createdBy: userId,
        participants: {
          create: { userId, role: 'member' },
        },
      },
    });

    // Add initial message
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        content: message,
        messageType: 'TEXT',
      },
    });

    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    res.status(201).json(successResponse(conversation));
  } catch (error) {
    logger.error({ err: error }, 'Create support ticket error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get support tickets (for admins)
router.get('/support/tickets', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { status, page = '1', limit = '20' } = req.query;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN'];
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

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      tenantId: user.tenant.id,
      conversationType: 'SUPPORT',
    };

    if (status) {
      where.ticketStatus = status;
    }

    const [tickets, total] = await Promise.all([
      prisma.chatConversation.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.chatConversation.count({ where }),
    ]);

    res.json(successResponse({
      tickets,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get support tickets error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== UNREAD COUNT ====================

// Get total unread count
router.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const totalUnread = await prisma.chatParticipant.aggregate({
      where: { userId, leftAt: null },
      _sum: { unreadCount: true },
    });

    res.json(successResponse({ unreadCount: totalUnread._sum.unreadCount || 0 }));
  } catch (error) {
    logger.error({ err: error }, 'Get unread count error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as internalChatRoutes };
