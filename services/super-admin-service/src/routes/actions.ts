import { Router, Request, Response } from 'express';
import { coreDb as prisma } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';
import { z } from 'zod';
import { superAdminAuth } from '../middleware/superAdminAuth.js';
import { auditLog } from '../utils/auditLog.js';

const logger = createLogger('super-admin-service');

const createActionSchema = z.object({
  tenantId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional().nullable(),
  actionType: z.string().default('OTHER'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

const router = Router();

// Apply super admin auth to all routes
router.use(superAdminAuth);

// Get all actions with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      tenantId,
      status,
      priority,
      actionType,
      assignedTo,
      search,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (actionType) where.actionType = actionType;
    if (assignedTo) where.assignedTo = assignedTo;

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [actions, total] = await Promise.all([
      prisma.actionItem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.actionItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: actions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching actions');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch actions',
      message: error.message,
    });
  }
});

// Get action by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const action = await prisma.actionItem.findUnique({
      where: { id },
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    res.json({
      success: true,
      data: action,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching action');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch action',
      message: error.message,
    });
  }
});

// Create action
router.post('/', async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).superAdmin?.id;
    const parsed = createActionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const data = parsed.data;

    const action = await prisma.actionItem.create({
      data: {
        tenantId: data.tenantId || null,
        title: data.title,
        description: data.description,
        actionType: data.actionType,
        priority: data.priority,
        status: 'pending',
        assignedTo: data.assignedTo,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        metadata: data.metadata,
        aiGenerated: false,
        createdBy: superAdminId,
      },
    });

    auditLog(req, 'CREATE_ACTION', 'action_item', action.id, data.tenantId, { title: data.title, priority: data.priority });

    res.status(201).json({
      success: true,
      data: action,
      message: 'Action created successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error creating action');
    res.status(500).json({
      success: false,
      error: 'Failed to create action',
      message: error.message,
    });
  }
});

// Update action
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.actionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    const {
      title,
      description,
      actionType,
      priority,
      status,
      assignedTo,
      dueDate,
      metadata,
    } = req.body;

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        title,
        description,
        actionType,
        priority,
        status,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        metadata,
      },
    });

    auditLog(req, 'UPDATE_ACTION', 'action_item', id);

    res.json({
      success: true,
      data: action,
      message: 'Action updated successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating action');
    res.status(500).json({
      success: false,
      error: 'Failed to update action',
      message: error.message,
    });
  }
});

// Complete action
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.actionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    auditLog(req, 'COMPLETE_ACTION', 'action_item', id);

    res.json({
      success: true,
      data: action,
      message: 'Action completed successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error completing action');
    res.status(500).json({
      success: false,
      error: 'Failed to complete action',
      message: error.message,
    });
  }
});

// Delete action
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const action = await prisma.actionItem.findUnique({
      where: { id },
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    await prisma.actionItem.delete({
      where: { id },
    });

    auditLog(req, 'DELETE_ACTION', 'action_item', id, null, { title: action.title });

    res.json({
      success: true,
      message: 'Action deleted successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error deleting action');
    res.status(500).json({
      success: false,
      error: 'Failed to delete action',
      message: error.message,
    });
  }
});

// Get action statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    const [totalActions, pendingCount, completedCount] = await Promise.all([
      prisma.actionItem.count({ where }),
      prisma.actionItem.count({ where: { ...where, status: 'pending' } }),
      prisma.actionItem.count({ where: { ...where, status: 'completed' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalActions,
        pending: pendingCount,
        completed: completedCount,
        inProgress: totalActions - pendingCount - completedCount,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching action stats');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch action statistics',
      message: error.message,
    });
  }
});

export const actionsRoutes = router;
