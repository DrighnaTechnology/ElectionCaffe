import { Router } from 'express';
import { z } from 'zod';
import { coreDb as prisma, prisma as legacyDb } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';

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
      totalUsers,
      totalElections,
      tenantsByType,
      recentTenants,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      legacyDb.user.count().catch(() => 0),
      legacyDb.election.count().catch(() => 0),
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
          createdAt: true,
        },
      }),
    ]);

    // Get total voters across all elections
    const voterCount = await legacyDb.voter.count().catch(() => 0);

    res.json({
      success: true,
      data: {
        stats: {
          totalTenants,
          activeTenants,
          inactiveTenants: totalTenants - activeTenants,
          totalUsers,
          totalElections,
          totalVoters: voterCount,
        },
        tenantsByType: tenantsByType.reduce((acc: any, item: any) => {
          acc[item.tenantType] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        recentTenants,
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

export { router as systemRoutes };
