import { Router, Request, Response } from 'express';
import { coreDb as prisma } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';
import { superAdminAuth } from '../middleware/superAdminAuth.js';

const logger = createLogger('super-admin-service');

const router = Router();

// Apply super admin auth to all routes
router.use(superAdminAuth);

// Get EC integration for a tenant
router.get('/tenants/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const integration = await (prisma as any).eCIntegration.findUnique({
      where: { tenantId },
      include: {
        syncLogs: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!integration) {
      return res.json({
        success: true,
        data: null,
        message: 'EC integration not configured for this tenant',
      });
    }

    res.json({
      success: true,
      data: {
        ...integration,
        apiKey: integration.apiKey ? '********' : null, // Mask sensitive data
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

// Get all EC integrations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [integrations, total] = await Promise.all([
      (prisma as any).eCIntegration.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).eCIntegration.count({ where }),
    ]);

    // Get tenant names
    const tenantIds = integrations.map((i: any) => i.tenantId);
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    });

    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

    const data = integrations.map((i: any) => ({
      ...i,
      apiKey: i.apiKey ? '********' : null,
      apiSecret: i.apiSecret ? '********' : null,
      tenantName: tenantMap.get(i.tenantId) || 'Unknown',
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

// Create or update EC integration for a tenant
router.put('/tenants/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const {
      apiEndpoint,
      apiKey,
      apiSecret,
      stateCode,
      constituencyCode,
      autoSyncEnabled,
      syncIntervalHours,
    } = req.body;

    const superAdminId = (req as any).superAdmin?.id;

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    const integration = await (prisma as any).eCIntegration.upsert({
      where: { tenantId },
      create: {
        tenantId,
        apiEndpoint,
        apiKey,
        apiSecret,
        stateCode,
        constituencyCode,
        autoSyncEnabled: autoSyncEnabled ?? false,
        syncIntervalHours: syncIntervalHours ?? 24,
        status: 'CONFIGURED',
        createdBy: superAdminId,
      },
      update: {
        apiEndpoint,
        ...(apiKey && { apiKey }),
        ...(apiSecret && { apiSecret }),
        stateCode,
        constituencyCode,
        autoSyncEnabled,
        syncIntervalHours,
        status: 'CONFIGURED',
      },
    });

    res.json({
      success: true,
      data: {
        ...integration,
        apiKey: integration.apiKey ? '********' : null,
        apiSecret: integration.apiSecret ? '********' : null,
      },
      message: 'EC integration configured successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error configuring EC integration');
    res.status(500).json({
      success: false,
      error: 'Failed to configure EC integration',
      message: error.message,
    });
  }
});

// Test EC integration connection
router.post('/tenants/:tenantId/test', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const integration = await (prisma as any).eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    // EC API connection test not yet implemented
    // Update status to reflect test was attempted
    await (prisma as any).eCIntegration.update({
      where: { id: integration.id },
      data: {
        status: 'TESTING',
        lastError: 'EC API integration not yet configured',
      },
    });

    res.status(503).json({
      success: false,
      error: 'EC API connection test is not yet implemented. Please configure the EC API endpoint and credentials first.',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error testing EC integration');
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
      message: error.message,
    });
  }
});

// Activate EC integration
router.post('/tenants/:tenantId/activate', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const integration = await (prisma as any).eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    await (prisma as any).eCIntegration.update({
      where: { id: integration.id },
      data: {
        status: 'ACTIVE',
        nextSyncAt: integration.autoSyncEnabled
          ? new Date(Date.now() + integration.syncIntervalHours * 60 * 60 * 1000)
          : null,
      },
    });

    res.json({
      success: true,
      message: 'EC integration activated successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error activating EC integration');
    res.status(500).json({
      success: false,
      error: 'Failed to activate EC integration',
      message: error.message,
    });
  }
});

// Suspend EC integration
router.post('/tenants/:tenantId/suspend', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const integration = await (prisma as any).eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    await (prisma as any).eCIntegration.update({
      where: { id: integration.id },
      data: {
        status: 'SUSPENDED',
        nextSyncAt: null,
      },
    });

    res.json({
      success: true,
      message: 'EC integration suspended successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error suspending EC integration');
    res.status(500).json({
      success: false,
      error: 'Failed to suspend EC integration',
      message: error.message,
    });
  }
});

// Trigger manual sync
router.post('/tenants/:tenantId/sync', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { syncType = 'full' } = req.body;
    const superAdminId = (req as any).superAdmin?.id;

    const integration = await (prisma as any).eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    if (integration.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'EC integration is not active',
      });
    }

    if (integration.syncStatus === 'SYNCING') {
      return res.status(400).json({
        success: false,
        error: 'Sync already in progress',
      });
    }

    // Create sync log
    const syncLog = await (prisma as any).eCSyncLog.create({
      data: {
        integrationId: integration.id,
        syncType,
        triggeredBy: superAdminId || 'manual',
      },
    });

    // Update integration status
    await (prisma as any).eCIntegration.update({
      where: { id: integration.id },
      data: {
        syncStatus: 'SYNCING',
      },
    });

    // EC sync not yet implemented - mark as failed
    await (prisma as any).eCSyncLog.update({
      where: { id: syncLog.id },
      data: {
        completedAt: new Date(),
        status: 'failed',
        errorMessage: 'EC API sync is not yet implemented',
      },
    });

    await (prisma as any).eCIntegration.update({
      where: { id: integration.id },
      data: {
        syncStatus: 'FAILED',
        lastError: 'EC API sync is not yet implemented',
        failureCount: { increment: 1 },
      },
    });

    res.status(503).json({
      success: false,
      data: {
        syncLogId: syncLog.id,
        status: 'failed',
      },
      error: 'EC API sync is not yet implemented. Configure EC API connection before triggering sync.',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error triggering sync');
    res.status(500).json({
      success: false,
      error: 'Failed to trigger sync',
      message: error.message,
    });
  }
});

// Get sync logs for a tenant
router.get('/tenants/:tenantId/sync-logs', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const integration = await (prisma as any).eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    const [syncLogs, total] = await Promise.all([
      (prisma as any).eCSyncLog.findMany({
        where: { integrationId: integration.id },
        skip,
        take: Number(limit),
        orderBy: { startedAt: 'desc' },
      }),
      (prisma as any).eCSyncLog.count({ where: { integrationId: integration.id } }),
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

// Delete EC integration for a tenant
router.delete('/tenants/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const integration = await (prisma as any).eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not found',
      });
    }

    await (prisma as any).eCIntegration.delete({
      where: { id: integration.id },
    });

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

export const ecIntegrationRoutes = router;
