import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// Helper to get tenant from user
async function getTenantFromUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });
  return user?.tenant;
}

// Get all actions for tenant
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      actionType,
      assignedTo,
      newsId,
      geographicLevel,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Build where clause
    const where: any = { tenantId: tenant.id };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (actionType) where.actionType = actionType;
    if (assignedTo) where.assignedTo = assignedTo;
    if (newsId) where.newsId = newsId;
    if (geographicLevel) where.geographicLevel = geographicLevel;

    const [actions, total] = await Promise.all([
      prisma.actionItem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }] as any,
        include: {
          news: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        } as any,
      }),
      prisma.actionItem.count({ where }),
    ]);

    res.json(successResponse({
      data: actions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get tenant actions error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single action
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const action = await prisma.actionItem.findFirst({
      where: {
        id,
        tenantId: tenant.id,
      },
      include: {
        news: true,
      },
    });

    if (!action) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    res.json(successResponse(action));
  } catch (error) {
    logger.error({ err: error }, 'Get action detail error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create action
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow certain roles to create actions
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER', 'COORDINATOR'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const {
      newsId,
      title,
      titleLocal,
      description,
      descriptionLocal,
      actionType,
      priority = 'MEDIUM',
      geographicLevel,
      state,
      region,
      district,
      constituency,
      section,
      booth,
      assignedTo,
      assignedToName,
      dueDate,
      estimatedImpact,
      requiredResources,
      targetAudience,
      successMetrics,
    } = req.body;

    if (!title || !actionType) {
      res.status(400).json(errorResponse('E2001', 'Title and action type are required'));
      return;
    }

    const action = await prisma.actionItem.create({
      data: {
        tenantId: tenant.id,
        newsId,
        title,
        titleLocal,
        description,
        descriptionLocal,
        actionType,
        priority,
        status: 'PENDING',
        geographicLevel,
        state,
        region,
        district,
        constituency,
        section,
        booth,
        assignedTo,
        assignedToName,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedImpact,
        requiredResources,
        targetAudience,
        successMetrics,
        createdBy: userId,
      } as any,
      include: {
        news: {
          select: {
            id: true,
            title: true,
          },
        },
      } as any,
    });

    res.status(201).json(successResponse({ ...action, message: 'Action created successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Create action error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update action
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER', 'COORDINATOR'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const existingAction = await prisma.actionItem.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existingAction) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    const {
      title,
      titleLocal,
      description,
      descriptionLocal,
      actionType,
      priority,
      geographicLevel,
      state,
      region,
      district,
      constituency,
      section,
      booth,
      assignedTo,
      assignedToName,
      dueDate,
      estimatedImpact,
      requiredResources,
      targetAudience,
      successMetrics,
    } = req.body;

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleLocal !== undefined && { titleLocal }),
        ...(description !== undefined && { description }),
        ...(descriptionLocal !== undefined && { descriptionLocal }),
        ...(actionType !== undefined && { actionType }),
        ...(priority !== undefined && { priority }),
        ...(geographicLevel !== undefined && { geographicLevel }),
        ...(state !== undefined && { state }),
        ...(region !== undefined && { region }),
        ...(district !== undefined && { district }),
        ...(constituency !== undefined && { constituency }),
        ...(section !== undefined && { section }),
        ...(booth !== undefined && { booth }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(assignedToName !== undefined && { assignedToName }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(estimatedImpact !== undefined && { estimatedImpact }),
        ...(requiredResources !== undefined && { requiredResources }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(successMetrics !== undefined && { successMetrics }),
      } as any,
    });

    res.json(successResponse({ ...action, message: 'Action updated successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Update action error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update action status
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { status, completionNotes, outcome } = req.body;

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const existingAction = await prisma.actionItem.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existingAction) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json(errorResponse('E2001', 'Invalid status'));
      return;
    }

    const updateData: any = { status };

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      if (completionNotes) updateData.completionNotes = completionNotes;
      if (outcome) updateData.outcome = outcome;
    }

    if (status === 'IN_PROGRESS' && (existingAction.status as string) === 'PENDING') {
      updateData.startedAt = new Date();
    }

    const action = await prisma.actionItem.update({
      where: { id },
      data: updateData,
    });

    res.json(successResponse({ ...action, message: `Action status updated to ${status}` }));
  } catch (error) {
    logger.error({ err: error }, 'Update action status error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Assign action to user
router.patch('/:id/assign', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;
    const { assignedTo, assignedToName } = req.body;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER', 'COORDINATOR'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const existingAction = await prisma.actionItem.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existingAction) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        assignedTo,
        assignedToName,
        assignedAt: new Date(),
      },
    });

    res.json(successResponse({ ...action, message: 'Action assigned successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Assign action error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete action
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const existingAction = await prisma.actionItem.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!existingAction) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    await prisma.actionItem.delete({ where: { id } });

    res.json(successResponse({ message: 'Action deleted successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete action error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get actions dashboard/stats
router.get('/stats/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Get counts by status
    const statusCounts = await prisma.actionItem.groupBy({
      by: ['status'],
      where: { tenantId: tenant.id },
      _count: { id: true },
    });

    // Get counts by priority
    const priorityCounts = await prisma.actionItem.groupBy({
      by: ['priority'],
      where: { tenantId: tenant.id },
      _count: { id: true },
    });

    // Get counts by action type
    const typeCounts = await prisma.actionItem.groupBy({
      by: ['actionType'],
      where: { tenantId: tenant.id },
      _count: { id: true },
    });

    // Get overdue actions count
    const overdueCount = await prisma.actionItem.count({
      where: {
        tenantId: tenant.id,
        dueDate: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      } as any,
    });

    // Get recent actions
    const recentActions = await prisma.actionItem.findMany({
      where: { tenantId: tenant.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignedToName: true,
      } as any,
    });

    // Get upcoming due actions
    const upcomingActions = await prisma.actionItem.findMany({
      where: {
        tenantId: tenant.id,
        dueDate: { gte: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      } as any,
      take: 5,
      orderBy: { dueDate: 'asc' } as any,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignedToName: true,
      } as any,
    });

    res.json(successResponse({
      statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count.id })),
      priorityCounts: priorityCounts.map((p) => ({ priority: p.priority, count: p._count.id })),
      typeCounts: typeCounts.map((t) => ({ type: t.actionType, count: t._count.id })),
      overdueCount,
      recentActions,
      upcomingActions,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get actions stats error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get my assigned actions
router.get('/my/assigned', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const where: any = {
      tenantId: tenant.id,
      assignedTo: userId,
    };

    if (status) where.status = status;

    const [actions, total] = await Promise.all([
      prisma.actionItem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }] as any,
        include: {
          news: {
            select: { id: true, title: true },
          },
        } as any,
      }),
      prisma.actionItem.count({ where }),
    ]);

    res.json(successResponse({
      data: actions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get my actions error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate actions from news using AI
router.post('/generate/:newsId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { newsId } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Check if news exists and is accessible
    const news = await prisma.newsInformation.findFirst({
      where: {
        id: newsId,
        OR: [
          { tenantId: tenant.id },
          { tenantId: null },
        ],
      },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    // TODO: Implement AI-based action generation
    // For now, return a placeholder response
    res.json(successResponse({
      message: 'AI action generation request submitted. Actions will be created shortly.',
      newsId,
      newsTitle: news.title,
      requestedAt: new Date().toISOString(),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Generate actions error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as tenantActionsRoutes };
