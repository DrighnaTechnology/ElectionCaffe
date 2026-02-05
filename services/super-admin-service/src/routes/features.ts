import { Router } from 'express';
import { z } from 'zod';
import { coreDb as prisma } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';

const router = Router();

// All feature routes require super admin authentication
router.use(superAdminAuthMiddleware);

const createFeatureSchema = z.object({
  featureKey: z.string().min(1).regex(/^[a-z0-9_]+$/),
  featureName: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  isGlobal: z.boolean().default(true),
  defaultEnabled: z.boolean().default(true),
});

// List all feature flags
router.get('/', async (req, res, next) => {
  try {
    const category = req.query.category as string;

    const where: any = {};
    if (category) {
      where.category = category;
    }

    const features = await prisma.featureFlag.findMany({
      where,
      orderBy: [{ category: 'asc' }, { featureName: 'asc' }],
      include: {
        _count: {
          select: { tenantFeatures: true },
        },
      },
    });

    // Get all unique categories
    const categories = [...new Set(features.map(f => f.category).filter(Boolean))];

    res.json({
      success: true,
      data: features,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

// Get feature by ID
router.get('/:id', async (req, res, next) => {
  try {
    const feature = await prisma.featureFlag.findUnique({
      where: { id: req.params.id },
      include: {
        tenantFeatures: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                tenantType: true,
              },
            },
          },
        },
      },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Feature not found',
        },
      });
    }

    res.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    next(error);
  }
});

// Create new feature flag
router.post('/', async (req, res, next) => {
  try {
    const data = createFeatureSchema.parse(req.body);

    // Check if feature key already exists
    const existing = await prisma.featureFlag.findUnique({
      where: { featureKey: data.featureKey },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2004',
          message: 'Feature with this key already exists',
        },
      });
    }

    const feature = await prisma.featureFlag.create({
      data,
    });

    // If default enabled and global, enable for all existing tenants
    if (data.defaultEnabled && data.isGlobal) {
      const tenants = await prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });

      if (tenants.length > 0) {
        await prisma.tenantFeature.createMany({
          data: tenants.map(tenant => ({
            tenantId: tenant.id,
            featureId: feature.id,
            isEnabled: true,
          })),
        });
      }
    }

    res.status(201).json({
      success: true,
      data: feature,
    });
  } catch (error) {
    next(error);
  }
});

// Update feature flag
router.put('/:id', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      featureName: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      isGlobal: z.boolean().optional(),
      defaultEnabled: z.boolean().optional(),
    });

    const data = updateSchema.parse(req.body);

    const feature = await prisma.featureFlag.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    next(error);
  }
});

// Delete feature flag
router.delete('/:id', async (req, res, next) => {
  try {
    // Delete all tenant feature associations first
    await prisma.tenantFeature.deleteMany({
      where: { featureId: req.params.id },
    });

    await prisma.featureFlag.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Feature deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Enable feature for all tenants
router.post('/:id/enable-all', async (req, res, next) => {
  try {
    const feature = await prisma.featureFlag.findUnique({
      where: { id: req.params.id },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Feature not found',
        },
      });
    }

    // Update the feature flag's defaultEnabled to true
    await prisma.featureFlag.update({
      where: { id: req.params.id },
      data: { defaultEnabled: true },
    });

    const tenants = await prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    // Upsert for each tenant
    await Promise.all(
      tenants.map(tenant =>
        prisma.tenantFeature.upsert({
          where: {
            tenantId_featureId: {
              tenantId: tenant.id,
              featureId: feature.id,
            },
          },
          create: {
            tenantId: tenant.id,
            featureId: feature.id,
            isEnabled: true,
          },
          update: {
            isEnabled: true,
          },
        })
      )
    );

    res.json({
      success: true,
      message: `Feature enabled for ${tenants.length} tenants`,
    });
  } catch (error) {
    next(error);
  }
});

// Disable feature for all tenants
router.post('/:id/disable-all', async (req, res, next) => {
  try {
    const feature = await prisma.featureFlag.findUnique({
      where: { id: req.params.id },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Feature not found',
        },
      });
    }

    // Update the feature flag's defaultEnabled to false
    await prisma.featureFlag.update({
      where: { id: req.params.id },
      data: { defaultEnabled: false },
    });

    await prisma.tenantFeature.updateMany({
      where: { featureId: feature.id },
      data: { isEnabled: false },
    });

    res.json({
      success: true,
      message: 'Feature disabled for all tenants',
    });
  } catch (error) {
    next(error);
  }
});

// Enable feature for selected tenants
router.post('/:id/enable-for-tenants', async (req, res, next) => {
  try {
    const schema = z.object({
      tenantIds: z.array(z.string()).min(1, 'At least one tenant must be selected'),
    });

    const { tenantIds } = schema.parse(req.body);

    const feature = await prisma.featureFlag.findUnique({
      where: { id: req.params.id },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Feature not found',
        },
      });
    }

    // Upsert for each selected tenant
    await Promise.all(
      tenantIds.map(tenantId =>
        prisma.tenantFeature.upsert({
          where: {
            tenantId_featureId: {
              tenantId,
              featureId: feature.id,
            },
          },
          create: {
            tenantId,
            featureId: feature.id,
            isEnabled: true,
          },
          update: {
            isEnabled: true,
          },
        })
      )
    );

    res.json({
      success: true,
      message: `Feature enabled for ${tenantIds.length} tenant(s)`,
    });
  } catch (error) {
    next(error);
  }
});

// Disable feature for selected tenants
router.post('/:id/disable-for-tenants', async (req, res, next) => {
  try {
    const schema = z.object({
      tenantIds: z.array(z.string()).min(1, 'At least one tenant must be selected'),
    });

    const { tenantIds } = schema.parse(req.body);

    const feature = await prisma.featureFlag.findUnique({
      where: { id: req.params.id },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Feature not found',
        },
      });
    }

    // Update isEnabled to false for selected tenants
    await Promise.all(
      tenantIds.map(tenantId =>
        prisma.tenantFeature.upsert({
          where: {
            tenantId_featureId: {
              tenantId,
              featureId: feature.id,
            },
          },
          create: {
            tenantId,
            featureId: feature.id,
            isEnabled: false,
          },
          update: {
            isEnabled: false,
          },
        })
      )
    );

    res.json({
      success: true,
      message: `Feature disabled for ${tenantIds.length} tenant(s)`,
    });
  } catch (error) {
    next(error);
  }
});

// Bulk create features (for seeding)
router.post('/bulk', async (req, res, next) => {
  try {
    const schema = z.object({
      features: z.array(createFeatureSchema),
    });

    const { features } = schema.parse(req.body);

    const created: any[] = [];
    const skipped: string[] = [];

    for (const featureData of features) {
      const existing = await prisma.featureFlag.findUnique({
        where: { featureKey: featureData.featureKey },
      });

      if (existing) {
        skipped.push(featureData.featureKey);
        continue;
      }

      const feature = await prisma.featureFlag.create({
        data: featureData,
      });
      created.push(feature);
    }

    res.status(201).json({
      success: true,
      data: {
        created: created.length,
        skipped: skipped.length,
        skippedKeys: skipped,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as featuresRoutes };
