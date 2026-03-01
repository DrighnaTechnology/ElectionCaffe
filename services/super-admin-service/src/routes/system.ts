import { Router } from 'express';
import { z } from 'zod';
import { coreDb as prisma, syncTenantCounts } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';
import { auditLog } from '../utils/auditLog.js';

const router = Router();

// All system routes require super admin authentication
router.use(superAdminAuthMiddleware);

// Get system configuration
router.get('/config', async (_req, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { configKey: 'asc' },
    });

    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    next(error);
  }
});

// Get specific config by key
router.get('/config/:key', async (req, res, next) => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: req.params.key },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Configuration not found',
        },
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

// Set system configuration
router.put('/config/:key', async (req, res, next) => {
  try {
    const schema = z.object({
      configValue: z.any(),
      description: z.string().optional(),
    });

    const { configValue, description } = schema.parse(req.body);

    const config = await prisma.systemConfig.upsert({
      where: { configKey: req.params.key },
      create: {
        configKey: req.params.key,
        configValue,
        description,
      },
      update: {
        configValue,
        ...(description && { description }),
      },
    });

    auditLog(req, 'UPDATE_CONFIG', 'system_config', req.params.key, null, { configValue });

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

// Get system dashboard stats
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [
      totalTenants,
      activeTenants,
      tenantsByType,
      recentTenants,
      aggregates,
      tenantsByStatus,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.tenant.groupBy({
        by: ['tenantType'],
        _count: { id: true },
      }),
      prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          tenantType: true,
          status: true,
          subscriptionPlan: true,
          maxVoters: true,
          currentVoterCount: true,
          currentUserCount: true,
          currentElectionCount: true,
          currentCadreCount: true,
          countsLastSyncedAt: true,
          createdAt: true,
        },
      }),
      // Aggregate cached counts across all tenants
      prisma.tenant.aggregate({
        _sum: {
          currentVoterCount: true,
          currentUserCount: true,
          currentElectionCount: true,
          currentCadreCount: true,
          maxVoters: true,
        },
      }),
      prisma.tenant.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const totalVoters = aggregates._sum.currentVoterCount || 0;
    const totalUsers = aggregates._sum.currentUserCount || 0;
    const totalElections = aggregates._sum.currentElectionCount || 0;
    const totalCadres = aggregates._sum.currentCadreCount || 0;
    const totalMaxVoters = aggregates._sum.maxVoters || 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalTenants,
          activeTenants,
          inactiveTenants: totalTenants - activeTenants,
          totalUsers,
          totalElections,
          totalVoters,
          totalCadres,
          totalMaxVoters,
          voterUtilization: totalMaxVoters > 0
            ? Math.round((totalVoters / totalMaxVoters) * 100)
            : 0,
        },
        tenantsByType: tenantsByType.reduce((acc: any, item: any) => {
          acc[item.tenantType] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        tenantsByStatus: tenantsByStatus.reduce((acc: any, item: any) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        recentTenants,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Sync tenant usage counts from tenant databases
router.post('/sync-counts', async (req, res, next) => {
  try {
    const tenantId = req.body?.tenantId as string | undefined;
    const results = await syncTenantCounts(tenantId);

    const succeeded = results.filter((r: any) => r.success);
    const failed = results.filter((r: any) => !r.success);

    // Calculate totals from synced data
    const totals = succeeded.reduce(
      (acc: any, r: any) => ({
        voters: acc.voters + r.voters,
        users: acc.users + r.users,
        elections: acc.elections + r.elections,
        cadres: acc.cadres + r.cadres,
      }),
      { voters: 0, users: 0, elections: 0, cadres: 0 }
    );

    auditLog(req, 'SYNC_COUNTS', 'tenant', req.body?.tenantId ?? null, req.body?.tenantId ?? null, { synced: succeeded.length, failed: failed.length });

    res.json({
      success: true,
      data: {
        synced: succeeded.length,
        failed: failed.length,
        total: results.length,
        totals,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get all super admins
router.get('/admins', async (_req, res, next) => {
  try {
    const admins = await prisma.superAdmin.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        profilePhotoUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    next(error);
  }
});

// Create additional super admin
router.post('/admins', async (req, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      email: z.string().email(),
      mobile: z.string().min(10).max(15),
      password: z.string().min(6),
    });

    const data = schema.parse(req.body);

    // Check if email or mobile already exists
    const existing = await prisma.superAdmin.findFirst({
      where: {
        OR: [
          { email: data.email },
          { mobile: data.mobile },
        ],
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2004',
          message: 'Super Admin with this email or mobile already exists',
        },
      });
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(data.password, 12);

    const admin = await prisma.superAdmin.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        mobile: data.mobile,
        passwordHash,
      },
    });

    auditLog(req, 'CREATE_ADMIN', 'super_admin', admin.id, null, { email: admin.email });

    res.status(201).json({
      success: true,
      data: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        mobile: admin.mobile,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Deactivate super admin
router.put('/admins/:id/deactivate', async (req, res, next) => {
  try {
    // Can't deactivate yourself
    if (req.params.id === req.superAdmin?.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4004',
          message: 'Cannot deactivate your own account',
        },
      });
    }

    // Check if this is the last active admin
    const activeCount = await prisma.superAdmin.count({
      where: { isActive: true },
    });

    if (activeCount <= 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4004',
          message: 'Cannot deactivate the last active super admin',
        },
      });
    }

    await prisma.superAdmin.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    auditLog(req, 'DEACTIVATE_ADMIN', 'super_admin', req.params.id);

    res.json({
      success: true,
      message: 'Super Admin deactivated',
    });
  } catch (error) {
    next(error);
  }
});

// Activate super admin
router.put('/admins/:id/activate', async (req, res, next) => {
  try {
    await prisma.superAdmin.update({
      where: { id: req.params.id },
      data: { isActive: true },
    });

    auditLog(req, 'ACTIVATE_ADMIN', 'super_admin', req.params.id);

    res.json({
      success: true,
      message: 'Super Admin activated',
    });
  } catch (error) {
    next(error);
  }
});

// Get system health/status
router.get('/health', async (_req, res, _next) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Check health of all microservices
router.get('/services-health', async (_req, res, _next) => {
  const services = [
    { name: 'Gateway', port: 3000, path: '/health' },
    { name: 'Auth Service', port: 3001, path: '/health' },
    { name: 'Election Service', port: 3002, path: '/health' },
    { name: 'Voter Service', port: 3003, path: '/health' },
    { name: 'Cadre Service', port: 3004, path: '/health' },
    { name: 'Analytics Service', port: 3005, path: '/health' },
    { name: 'Reporting Service', port: 3006, path: '/health' },
    { name: 'AI Analytics Service', port: 3007, path: '/health' },
    { name: 'Super Admin Service', port: 3008, path: '/health' },
  ];

  const results = await Promise.all(
    services.map(async (svc) => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`http://localhost:${svc.port}${svc.path}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const latency = Date.now() - start;
        return {
          name: svc.name,
          port: svc.port,
          status: response.ok ? 'healthy' : 'unhealthy',
          statusCode: response.status,
          latency,
        };
      } catch (err: any) {
        return {
          name: svc.name,
          port: svc.port,
          status: 'down',
          statusCode: 0,
          latency: Date.now() - start,
          error: err.code || err.message || 'Connection failed',
        };
      }
    })
  );

  const healthy = results.filter((r) => r.status === 'healthy').length;

  res.json({
    success: true,
    data: {
      total: results.length,
      healthy,
      unhealthy: results.length - healthy,
      services: results,
      checkedAt: new Date().toISOString(),
    },
  });
});

// Get platform audit logs
router.get('/logs', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 300);
    const page = parseInt(req.query.page as string) || 1;
    const entityType = req.query.entityType as string;
    const action = req.query.action as string;
    const tenantId = req.query.tenantId as string;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (tenantId) where.tenantId = tenantId;

    const [logs, total] = await Promise.all([
      prisma.platformAuditLog.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.platformAuditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

export { router as systemRoutes };
