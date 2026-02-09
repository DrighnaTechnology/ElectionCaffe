import { Router } from 'express';
import { z } from 'zod';
import {
  prisma,
  provisionTenantDatabase,
  checkTenantDatabaseHealth,
  testDatabaseConnection,
  generateTenantDbName,
  dropTenantDatabase,
} from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';

const router = Router();

// All database routes require super admin authentication
router.use(superAdminAuthMiddleware);

// Get all tenant database statuses
router.get('/status', async (_req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        databaseType: true,
        databaseStatus: true,
        databaseName: true,
        databaseHost: true,
        databasePort: true,
        databaseLastCheckedAt: true,
        databaseLastError: true,
        databaseManagedBy: true,
        databaseMigrationVersion: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // Group by database status
    const summary = {
      total: tenants.length,
      ready: tenants.filter(t => t.databaseStatus === 'READY').length,
      notConfigured: tenants.filter(t => t.databaseStatus === 'NOT_CONFIGURED').length,
      failed: tenants.filter(t => t.databaseStatus === 'CONNECTION_FAILED').length,
      pending: tenants.filter(t => t.databaseStatus === 'PENDING_SETUP').length,
      migrating: tenants.filter(t => t.databaseStatus === 'MIGRATING').length,
    };

    res.json({
      success: true,
      data: tenants,
      summary,
    });
  } catch (error) {
    next(error);
  }
});

// Provision a new database for a tenant
router.post('/:tenantId/provision', async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    // Get tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Tenant not found',
        },
      });
    }

    // Check if database already exists
    if (tenant.databaseStatus === 'READY' && tenant.databaseConnectionUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2010',
          message: 'Tenant already has a configured database',
          details: {
            databaseName: tenant.databaseName,
            databaseStatus: tenant.databaseStatus,
          },
        },
      });
    }

    // Update status to migrating
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        databaseStatus: 'MIGRATING',
        databaseLastError: null,
      },
    });

    // Provision the database
    const result = await provisionTenantDatabase(
      tenant.id,
      tenant.name,
      tenant.slug
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'E5010',
          message: 'Failed to provision database',
          details: result.error,
        },
      });
    }

    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        databaseName: result.databaseName,
        status: 'READY',
      },
      message: `Database ${result.databaseName} provisioned successfully`,
    });
  } catch (error) {
    next(error);
  }
});

// Test database connection for a tenant
router.post('/:tenantId/test', async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        databaseConnectionUrl: true,
        databaseStatus: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Tenant not found',
        },
      });
    }

    if (!tenant.databaseConnectionUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2011',
          message: 'No database configured for this tenant',
        },
      });
    }

    const result = await testDatabaseConnection(tenant.databaseConnectionUrl);

    // Update tenant with test results
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        databaseLastCheckedAt: new Date(),
        databaseStatus: result.success ? 'READY' : 'CONNECTION_FAILED',
        databaseLastError: result.success ? null : result.error,
      },
    });

    res.json({
      success: result.success,
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        connected: result.success,
        latencyMs: result.latencyMs,
        error: result.error,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Health check for a tenant's database
router.get('/:tenantId/health', async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const result = await checkTenantDatabaseHealth(tenantId);

    res.json({
      success: true,
      data: {
        tenantId,
        ...result,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update tenant database configuration
router.put('/:tenantId/config', async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const updateSchema = z.object({
      databaseType: z.enum(['SHARED', 'DEDICATED_MANAGED', 'DEDICATED_SELF', 'NONE']).optional(),
      databaseHost: z.string().optional(),
      databaseName: z.string().optional(),
      databaseUser: z.string().optional(),
      databasePassword: z.string().optional(),
      databasePort: z.number().optional(),
      databaseSSL: z.boolean().optional(),
      databaseConnectionUrl: z.string().optional(),
      canTenantEditDb: z.boolean().optional(),
    });

    const data = updateSchema.parse(req.body);

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...data,
        databaseStatus: data.databaseConnectionUrl ? 'PENDING_SETUP' : undefined,
        databaseLastCheckedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        databaseType: true,
        databaseStatus: true,
        databaseName: true,
        databaseHost: true,
        databasePort: true,
        databaseSSL: true,
        canTenantEditDb: true,
      },
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Database configuration updated',
    });
  } catch (error) {
    next(error);
  }
});

// Provision databases for all tenants without one
router.post('/provision-all', async (_req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { databaseStatus: 'NOT_CONFIGURED' },
          { databaseStatus: 'PENDING_SETUP' },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (tenants.length === 0) {
      return res.json({
        success: true,
        data: {
          provisioned: 0,
          failed: 0,
          results: [],
        },
        message: 'No tenants need database provisioning',
      });
    }

    const results: Array<{
      tenantId: string;
      tenantName: string;
      success: boolean;
      databaseName?: string;
      error?: string;
    }> = [];

    for (const tenant of tenants) {
      const result = await provisionTenantDatabase(
        tenant.id,
        tenant.name,
        tenant.slug
      );

      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        success: result.success,
        databaseName: result.databaseName,
        error: result.error,
      });
    }

    const provisioned = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        provisioned,
        failed,
        results,
      },
      message: `Provisioned ${provisioned} databases, ${failed} failed`,
    });
  } catch (error) {
    next(error);
  }
});

// Get database name preview for a tenant
router.get('/preview/:tenantName', async (req, res, next) => {
  try {
    const { tenantName } = req.params;
    const databaseName = generateTenantDbName(tenantName);

    res.json({
      success: true,
      data: {
        tenantName,
        databaseName,
        format: 'EC_<TenantName>',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Drop a tenant database (DANGEROUS - requires confirmation)
router.delete('/:tenantId', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { confirm } = req.body;

    if (confirm !== 'DELETE_DATABASE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2012',
          message: 'Confirmation required. Send { "confirm": "DELETE_DATABASE" } in request body',
        },
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        databaseName: true,
        databaseStatus: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Tenant not found',
        },
      });
    }

    if (!tenant.databaseName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2013',
          message: 'Tenant does not have a database configured',
        },
      });
    }

    // Drop the database
    const result = await dropTenantDatabase(tenant.name);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'E5011',
          message: 'Failed to drop database',
          details: result.error,
        },
      });
    }

    // Update tenant record
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        databaseType: 'NONE',
        databaseStatus: 'NOT_CONFIGURED',
        databaseName: null,
        databaseHost: null,
        databaseUser: null,
        databasePassword: null,
        databasePort: null,
        databaseSSL: false,
        databaseConnectionUrl: null,
        databaseLastCheckedAt: new Date(),
        databaseLastError: null,
      },
    });

    res.json({
      success: true,
      message: `Database ${tenant.databaseName} dropped successfully`,
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        droppedDatabase: tenant.databaseName,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as databasesRoutes };
