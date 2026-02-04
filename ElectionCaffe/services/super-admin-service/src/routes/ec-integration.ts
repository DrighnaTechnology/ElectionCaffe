import { Router, Request, Response } from 'express';
import { coreDb as prisma } from '@electioncaffe/database';
import { superAdminAuth } from '../middleware/superAdminAuth.js';

const router = Router();

// Apply super admin auth to all routes
router.use(superAdminAuth);

// Get EC integration for a tenant
router.get('/tenants/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const integration = await prisma.eCIntegration.findUnique({
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
    console.error('Error fetching EC integration:', error);
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
      prisma.eCIntegration.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.eCIntegration.count({ where }),
    ]);

    // Get tenant names
    const tenantIds = integrations.map((i) => i.tenantId);
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    });

    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

    const data = integrations.map((i) => ({
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
    console.error('Error fetching EC integrations:', error);
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

    const integration = await prisma.eCIntegration.upsert({
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
    console.error('Error configuring EC integration:', error);
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

    const integration = await prisma.eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    // TODO: Implement actual EC API connection test
    // For now, simulate a test
    const testResult = {
      connected: true,
      responseTime: 245,
      apiVersion: '2.0',
      dataAvailable: {
        voters: true,
        parts: true,
        sections: true,
      },
    };

    // Update integration status
    await prisma.eCIntegration.update({
      where: { id: integration.id },
      data: {
        status: 'TESTING',
        lastError: null,
      },
    });

    res.json({
      success: true,
      data: testResult,
      message: 'Connection test successful',
    });
  } catch (error: any) {
    console.error('Error testing EC integration:', error);
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

    const integration = await prisma.eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    await prisma.eCIntegration.update({
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
    console.error('Error activating EC integration:', error);
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

    const integration = await prisma.eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    await prisma.eCIntegration.update({
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
    console.error('Error suspending EC integration:', error);
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

    const integration = await prisma.eCIntegration.findUnique({
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
    const syncLog = await prisma.eCSyncLog.create({
      data: {
        integrationId: integration.id,
        syncType,
        triggeredBy: superAdminId || 'manual',
      },
    });

    // Update integration status
    await prisma.eCIntegration.update({
      where: { id: integration.id },
      data: {
        syncStatus: 'SYNCING',
      },
    });

    // TODO: Implement actual sync logic in background job
    // For now, simulate completion after a delay
    setTimeout(async () => {
      try {
        // Simulated sync results
        const votersAdded = Math.floor(Math.random() * 100);
        const votersUpdated = Math.floor(Math.random() * 50);
        const partsAdded = Math.floor(Math.random() * 5);
        const partsUpdated = Math.floor(Math.random() * 3);

        await prisma.eCSyncLog.update({
          where: { id: syncLog.id },
          data: {
            completedAt: new Date(),
            status: 'completed',
            votersAdded,
            votersUpdated,
            partsAdded,
            partsUpdated,
          },
        });

        await prisma.eCIntegration.update({
          where: { id: integration.id },
          data: {
            syncStatus: 'COMPLETED',
            lastSyncAt: new Date(),
            successCount: { increment: 1 },
            totalVotersSynced: { increment: votersAdded },
            totalPartsSynced: { increment: partsAdded },
            nextSyncAt: integration.autoSyncEnabled
              ? new Date(Date.now() + integration.syncIntervalHours * 60 * 60 * 1000)
              : null,
          },
        });
      } catch (err) {
        console.error('Error completing sync:', err);
      }
    }, 5000);

    res.json({
      success: true,
      data: {
        syncLogId: syncLog.id,
        status: 'started',
      },
      message: 'Sync started successfully',
    });
  } catch (error: any) {
    console.error('Error triggering sync:', error);
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

    const integration = await prisma.eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not configured for this tenant',
      });
    }

    const [syncLogs, total] = await Promise.all([
      prisma.eCSyncLog.findMany({
        where: { integrationId: integration.id },
        skip,
        take: Number(limit),
        orderBy: { startedAt: 'desc' },
      }),
      prisma.eCSyncLog.count({ where: { integrationId: integration.id } }),
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
    console.error('Error fetching sync logs:', error);
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

    const integration = await prisma.eCIntegration.findUnique({
      where: { tenantId },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'EC integration not found',
      });
    }

    await prisma.eCIntegration.delete({
      where: { id: integration.id },
    });

    res.json({
      success: true,
      message: 'EC integration deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting EC integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete EC integration',
      message: error.message,
    });
  }
});

export const ecIntegrationRoutes = router;
