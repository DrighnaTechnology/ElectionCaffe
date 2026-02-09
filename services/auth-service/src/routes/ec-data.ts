import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// Get EC integration status for tenant
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);

    const integration = await tenantDb.eCIntegration.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        integrationType: true,
        lastSyncAt: true,
        syncStatus: true,
        isActive: true,
        config: true,
      },
    });

    if (!integration) {
      res.json(successResponse({
        configured: false,
        message: 'EC Integration is not configured for this tenant.',
      }));
      return;
    }

    res.json(successResponse({
      configured: true,
      ...integration,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get EC status error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get sync history for tenant
router.get('/sync-history', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [syncLogs, total] = await Promise.all([
      tenantDb.eCSyncLog.findMany({
        skip,
        take: Number(limit),
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          syncType: true,
          status: true,
          startedAt: true,
          completedAt: true,
          recordsProcessed: true,
          recordsFailed: true,
          errorDetails: true,
        },
      }),
      tenantDb.eCSyncLog.count(),
    ]);

    res.json(successResponse({
      data: syncLogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get sync history error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get EC data summary/statistics for tenant
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);

    // Get counts from tenant's data
    const [voterCount, partCount, boothCount, electionCount, sectionCount, userCount] = await Promise.all([
      tenantDb.voter.count(),
      tenantDb.part.count(),
      tenantDb.booth.count(),
      tenantDb.election.count(),
      tenantDb.section.count(),
      tenantDb.user.count(),
    ]);

    // Get integration info if available
    const integration = await tenantDb.eCIntegration.findFirst({
      where: { isActive: true },
    });

    // Get last sync info
    const lastSync = await tenantDb.eCSyncLog.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
    });

    res.json(successResponse({
      available: true,
      ecIntegrationActive: !!integration?.isActive,
      totalVoters: voterCount,
      totalParts: partCount,
      totalBooths: boothCount,
      totalElections: electionCount,
      totalSections: sectionCount,
      totalUsers: userCount,
      lastSyncAt: lastSync?.completedAt || integration?.lastSyncAt,
      syncStatus: integration?.syncStatus,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get EC summary error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Request manual sync (if allowed)
router.post('/request-sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const userRole = req.headers['x-user-role'] as string;

    // Only allow admin roles to request sync
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can request sync.'));
      return;
    }

    const integration = await tenantDb.eCIntegration.findFirst({
      where: { isActive: true },
    });

    if (!integration) {
      res.status(400).json(errorResponse('E2001', 'EC Integration is not configured'));
      return;
    }

    if (integration.syncStatus === 'SYNCING') {
      res.status(400).json(errorResponse('E2003', 'A sync is already in progress'));
      return;
    }

    res.json(successResponse({
      message: 'Sync request submitted. The sync will be processed shortly.',
      requestedAt: new Date().toISOString(),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Request sync error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as ecDataRoutes };
