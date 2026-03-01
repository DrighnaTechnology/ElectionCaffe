import { Router, Request, Response } from 'express';
import { coreDb as prisma } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';
import { superAdminAuth } from '../middleware/superAdminAuth.js';
import { auditLog } from '../utils/auditLog.js';

const logger = createLogger('super-admin-service');

const router = Router();

// Apply super admin auth to all routes
router.use(superAdminAuth);

// Get all EC integrations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [integrations, total] = await Promise.all([
      prisma.eCIntegrationConfig.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.eCIntegrationConfig.count(),
    ]);

    // Mask sensitive data
    const data = integrations.map((i) => ({
      ...i,
      apiKey: i.apiKey ? '********' : null,
      apiSecret: i.apiSecret ? '********' : null,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching EC integrations');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch EC integrations',
      message: error.message,
    });
  }
});

// Get EC integration by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const integration = await prisma.eCIntegrationConfig.findUnique({
      where: { id: req.params.id },
      include: {
        syncLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...integration,
        apiKey: integration.apiKey ? '********' : null,
        apiSecret: integration.apiSecret ? '********' : null,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching EC integration');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch EC integration',
      message: error.message,
    });
  }
});

// Create EC integration config
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      configKey,
      state,
      apiEndpoint,
      apiKey,
      apiSecret,
      authMethod,
      settings,
      syncIntervalHours,
      autoSyncEnabled,
    } = req.body;

    if (!configKey) {
      return res.status(400).json({
        success: false,
        error: 'configKey is required',
      });
    }

    const integration = await prisma.eCIntegrationConfig.create({
      data: {
        configKey,
        state,
        apiEndpoint,
        apiKey,
        apiSecret,
        authMethod,
        settings,
        syncIntervalHours: syncIntervalHours ?? 24,
        autoSyncEnabled: autoSyncEnabled ?? false,
      },
    });

    auditLog(req, 'CREATE_EC_INTEGRATION', 'ec_integration', integration.id, null, { configKey });

    res.status(201).json({
      success: true,
      data: {
        ...integration,
        apiKey: integration.apiKey ? '********' : null,
        apiSecret: integration.apiSecret ? '********' : null,
      },
      message: 'EC integration created successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error creating EC integration');
    res.status(500).json({
      success: false,
      error: 'Failed to create EC integration',
      message: error.message,
    });
  }
});

// Update EC integration config
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.eCIntegrationConfig.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not found',
      });
    }

    const {
      state,
      apiEndpoint,
      apiKey,
      apiSecret,
      authMethod,
      settings,
      syncIntervalHours,
      autoSyncEnabled,
      isActive,
    } = req.body;

    const integration = await prisma.eCIntegrationConfig.update({
      where: { id: req.params.id },
      data: {
        state,
        apiEndpoint,
        ...(apiKey && { apiKey }),
        ...(apiSecret && { apiSecret }),
        authMethod,
        settings,
        syncIntervalHours,
        autoSyncEnabled,
        isActive,
      },
    });

    auditLog(req, 'UPDATE_EC_INTEGRATION', 'ec_integration', req.params.id);

    res.json({
      success: true,
      data: {
        ...integration,
        apiKey: integration.apiKey ? '********' : null,
        apiSecret: integration.apiSecret ? '********' : null,
      },
      message: 'EC integration updated successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating EC integration');
    res.status(500).json({
      success: false,
      error: 'Failed to update EC integration',
      message: error.message,
    });
  }
});

// Delete EC integration
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.eCIntegrationConfig.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not found',
      });
    }

    await prisma.eCIntegrationConfig.delete({
      where: { id: req.params.id },
    });

    auditLog(req, 'DELETE_EC_INTEGRATION', 'ec_integration', req.params.id, null, { configKey: existing.configKey });

    res.json({
      success: true,
      message: 'EC integration deleted successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error deleting EC integration');
    res.status(500).json({
      success: false,
      error: 'Failed to delete EC integration',
      message: error.message,
    });
  }
});

// Get sync logs for an integration
router.get('/:id/sync-logs', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [syncLogs, total] = await Promise.all([
      prisma.eCSyncLog.findMany({
        where: { integrationId: req.params.id },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.eCSyncLog.count({ where: { integrationId: req.params.id } }),
    ]);

    res.json({
      success: true,
      data: syncLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching sync logs');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync logs',
      message: error.message,
    });
  }
});

export const ecIntegrationRoutes = router;
