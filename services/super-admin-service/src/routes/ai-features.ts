import { Router } from 'express';
import { z } from 'zod';
import { coreDb as prisma } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';

const router = Router();

// All AI feature routes require super admin authentication
router.use(superAdminAuthMiddleware);

// Validation schemas - matches Prisma AIFeature model
const createFeatureSchema = z.object({
  providerId: z.string().uuid(),
  featureKey: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Feature key must be lowercase letters, numbers, and underscores only'),
  displayName: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['OCR', 'DOCUMENT_PROCESSING', 'DATA_TRANSFORMATION', 'ANALYTICS', 'TRANSLATION', 'SUMMARIZATION', 'CUSTOM']),
  modelName: z.string().optional(),
  systemPrompt: z.string().optional(),
  userPromptTemplate: z.string().optional(),
  outputFormat: z.string().optional(),
  outputSchema: z.record(z.any()).optional(),
  // Input Configuration
  acceptedFileTypes: z.array(z.string()).default([]),
  maxFileSize: z.number().min(0).default(10), // MB
  maxPagesPerRequest: z.number().min(1).default(50),
  // Pricing (credits per usage)
  creditsPerPage: z.number().min(0).default(1),
  creditsPerImage: z.number().min(0).default(1),
  creditsPerRequest: z.number().min(0).default(0),
  minCreditsRequired: z.number().min(0).default(1),
  // Training & Fine-tuning
  isCustomTrained: z.boolean().default(false),
  trainingData: z.record(z.any()).optional(),
  trainingNotes: z.string().optional(),
  // Availability
  isAddon: z.boolean().default(true),
  isPublic: z.boolean().default(false),
  displayOrder: z.number().default(0),
  iconUrl: z.string().optional(),
});

const updateFeatureSchema = createFeatureSchema.partial().extend({
  status: z.enum(['DRAFT', 'TRAINING', 'TESTING', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED']).optional(),
});

// List all AI features
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const providerId = req.query.providerId as string;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (providerId) {
      where.providerId = providerId;
    }

    const [features, total] = await Promise.all([
      prisma.aIFeature.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: {
              id: true,
              providerName: true,
              displayName: true,
              providerType: true,
            } as any,
          },
          _count: {
            select: {
              tenantSubscriptions: true,
              userAccess: true,
            },
          },
        } as any,
      }),
      prisma.aIFeature.count({ where }),
    ]);

    res.json({
      success: true,
      data: features,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get AI feature by ID
router.get('/:id', async (req, res, next) => {
  try {
    const feature = await prisma.aIFeature.findUnique({
      where: { id: req.params.id },
      include: {
        provider: {
          select: {
            id: true,
            providerName: true,
            displayName: true,
            providerType: true,
            status: true,
          } as any,
        },
        subscriptions: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            subscriptions: true,
            usageLogs: true,
          },
        },
      } as any,
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Feature not found',
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

// Create new AI feature
router.post('/', async (req, res, next) => {
  try {
    const data = createFeatureSchema.parse(req.body);

    // Check if provider exists
    const provider = await prisma.aIProvider.findUnique({
      where: { id: data.providerId },
    });

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Provider not found',
        },
      });
    }

    // Check if feature key already exists
    const existingFeature = await prisma.aIFeature.findUnique({
      where: { featureKey: data.featureKey },
    });

    if (existingFeature) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2004',
          message: 'AI Feature with this key already exists',
        },
      });
    }

    const feature = await prisma.aIFeature.create({
      data: {
        ...data,
        featureName: data.displayName, // featureName is a required field in Prisma schema
        status: 'DRAFT',
      } as any,
      include: {
        provider: {
          select: {
            id: true,
            providerName: true,
            displayName: true,
          } as any,
        },
      } as any,
    });

    res.status(201).json({
      success: true,
      data: feature,
    });
  } catch (error) {
    next(error);
  }
});

// Update AI feature
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateFeatureSchema.parse(req.body);

    const existingFeature = await prisma.aIFeature.findUnique({
      where: { id: req.params.id },
    });

    if (!existingFeature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Feature not found',
        },
      });
    }

    // Check if new feature key already exists (if changing key)
    if (data.featureKey && data.featureKey !== existingFeature.featureKey) {
      const keyExists = await prisma.aIFeature.findUnique({
        where: { featureKey: data.featureKey },
      });
      if (keyExists) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'E2004',
            message: 'AI Feature with this name already exists',
          },
        });
      }
    }

    // If provider is changing, verify new provider exists
    if (data.providerId && data.providerId !== existingFeature.providerId) {
      const provider = await prisma.aIProvider.findUnique({
        where: { id: data.providerId },
      });
      if (!provider) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'E3001',
            message: 'AI Provider not found',
          },
        });
      }
    }

    const feature = await prisma.aIFeature.update({
      where: { id: req.params.id },
      data: data as any,
      include: {
        provider: {
          select: {
            id: true,
            providerName: true,
            displayName: true,
          } as any,
        },
      } as any,
    });

    res.json({
      success: true,
      data: feature,
    });
  } catch (error) {
    next(error);
  }
});

// Delete AI feature
router.delete('/:id', async (req, res, next) => {
  try {
    const feature: any = await prisma.aIFeature.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            subscriptions: true,
            usageLogs: true,
          },
        },
      } as any,
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Feature not found',
        },
      });
    }

    // If feature has subscriptions or usage, don't delete, just archive
    if (feature._count.subscriptions > 0 || feature._count.usageLogs > 0) {
      await prisma.aIFeature.update({
        where: { id: req.params.id },
        data: { status: 'ARCHIVED', isActive: false } as any,
      });

      return res.json({
        success: true,
        message: 'AI Feature archived (has associated subscriptions or usage)',
      });
    }

    await prisma.aIFeature.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'AI Feature deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Publish AI feature (make available to tenants)
router.post('/:id/publish', async (req, res, next) => {
  try {
    const feature = await prisma.aIFeature.findUnique({
      where: { id: req.params.id },
      include: {
        provider: true,
      },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Feature not found',
        },
      });
    }

    // Check if provider is active
    if ((feature.provider as any).status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4001',
          message: 'Cannot publish feature: AI Provider is not active',
        },
      });
    }

    // Update feature status to PUBLISHED
    const updatedFeature = await prisma.aIFeature.update({
      where: { id: req.params.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      } as any,
    });

    res.json({
      success: true,
      data: updatedFeature,
      message: 'AI Feature published successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Unpublish/deprecate AI feature
router.post('/:id/deprecate', async (req, res, next) => {
  try {
    const feature = await prisma.aIFeature.findUnique({
      where: { id: req.params.id },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Feature not found',
        },
      });
    }

    const updatedFeature = await prisma.aIFeature.update({
      where: { id: req.params.id },
      data: {
        status: 'DEPRECATED',
        deprecatedAt: new Date(),
      } as any,
    });

    res.json({
      success: true,
      data: updatedFeature,
      message: 'AI Feature deprecated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Assign feature to tenant(s)
router.post('/:id/assign', async (req, res, next) => {
  try {
    const schema = z.object({
      tenantIds: z.array(z.string().uuid()),
      customCreditsPerUse: z.number().min(0).optional(),
      customCreditsPerPage: z.number().min(0).optional(),
      isEnabled: z.boolean().default(true),
      expiresAt: z.string().datetime().optional(),
      maxUsagePerDay: z.number().min(0).optional(),
      maxUsagePerMonth: z.number().min(0).optional(),
    });

    const data = schema.parse(req.body);

    const feature = await prisma.aIFeature.findUnique({
      where: { id: req.params.id },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Feature not found',
        },
      });
    }

    if ((feature as any).status !== 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4001',
          message: 'Can only assign published features to tenants',
        },
      });
    }

    // Verify all tenants exist
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: data.tenantIds } },
    });

    if (tenants.length !== data.tenantIds.length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'One or more tenants not found',
        },
      });
    }

    // Create subscriptions for each tenant
    const subscriptions = await Promise.all(
      data.tenantIds.map(async (tenantId) => {
        return (prisma as any).tenantAISubscription.upsert({
          where: {
            tenantId_featureId: {
              tenantId,
              featureId: req.params.id,
            },
          },
          create: {
            tenantId,
            featureId: req.params.id,
            isEnabled: data.isEnabled,
            customCreditsPerUse: data.customCreditsPerUse,
            customCreditsPerPage: data.customCreditsPerPage,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            maxUsagePerDay: data.maxUsagePerDay,
            maxUsagePerMonth: data.maxUsagePerMonth,
          },
          update: {
            isEnabled: data.isEnabled,
            customCreditsPerUse: data.customCreditsPerUse,
            customCreditsPerPage: data.customCreditsPerPage,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            maxUsagePerDay: data.maxUsagePerDay,
            maxUsagePerMonth: data.maxUsagePerMonth,
          },
        });
      })
    );

    res.json({
      success: true,
      data: subscriptions,
      message: `Feature assigned to ${subscriptions.length} tenant(s)`,
    });
  } catch (error) {
    next(error);
  }
});

// Remove feature from tenant(s)
router.post('/:id/unassign', async (req, res, next) => {
  try {
    const schema = z.object({
      tenantIds: z.array(z.string().uuid()),
    });

    const { tenantIds } = schema.parse(req.body);

    await (prisma as any).tenantAISubscription.deleteMany({
      where: {
        featureId: req.params.id,
        tenantId: { in: tenantIds },
      },
    });

    res.json({
      success: true,
      message: `Feature removed from ${tenantIds.length} tenant(s)`,
    });
  } catch (error) {
    next(error);
  }
});

// Get feature statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const feature = await prisma.aIFeature.findUnique({
      where: { id: req.params.id },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Feature not found',
        },
      });
    }

    // Get usage statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsage, subscriptionCount, topTenants] = await Promise.all([
      (prisma as any).aIUsageLog.aggregate({
        where: {
          featureId: req.params.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          creditsUsed: true,
          inputTokens: true,
          outputTokens: true,
          totalCost: true,
        },
        _count: true,
        _avg: {
          processingTimeMs: true,
        },
      }),
      (prisma as any).tenantAISubscription.count({
        where: { featureId: req.params.id, isEnabled: true },
      }),
      (prisma as any).aIUsageLog.groupBy({
        by: ['tenantId'],
        where: {
          featureId: req.params.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          creditsUsed: true,
        },
        _count: true,
        orderBy: {
          _count: {
            tenantId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Get tenant names for top users
    const tenantIds = topTenants.map((t: any) => t.tenantId);
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    });
    const tenantMap = new Map(tenants.map(t => [t.id, t.name]));

    res.json({
      success: true,
      data: {
        feature: {
          id: feature.id,
          displayName: (feature as any).displayName,
          status: (feature as any).status,
          category: feature.category,
        },
        usage: {
          totalRequests: totalUsage._count,
          totalCreditsUsed: totalUsage._sum.creditsUsed || 0,
          totalInputTokens: totalUsage._sum.inputTokens || 0,
          totalOutputTokens: totalUsage._sum.outputTokens || 0,
          totalCost: totalUsage._sum.totalCost || 0,
          avgProcessingTimeMs: Math.round(totalUsage._avg.processingTimeMs || 0),
        },
        subscriptions: {
          activeCount: subscriptionCount,
        },
        topTenants: topTenants.map((t: any) => ({
          tenantId: t.tenantId,
          tenantName: tenantMap.get(t.tenantId) || 'Unknown',
          requestCount: t._count,
          creditsUsed: t._sum.creditsUsed || 0,
        })),
        period: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Test AI feature with sample input
router.post('/:id/test', async (req, res, next) => {
  try {
    const schema = z.object({
      testInput: z.string().min(1),
      testFile: z.string().optional(), // Base64 encoded file for OCR tests
    });

    schema.parse(req.body);

    const feature = await prisma.aIFeature.findUnique({
      where: { id: req.params.id },
      include: {
        provider: true,
      },
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Feature not found',
        },
      });
    }

    if (!feature.provider.apiKey) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2001',
          message: 'AI Provider API key is not configured',
        },
      });
    }

    // Update feature status to TESTING
    await prisma.aIFeature.update({
      where: { id: req.params.id },
      data: { status: 'TESTING' } as any,
    });

    // AI provider integration not yet implemented
    res.status(503).json({
      success: false,
      error: {
        code: 'E5003',
        message: 'AI provider integration is not yet implemented. The feature has been set to TESTING status.',
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as aiFeaturesRoutes };
