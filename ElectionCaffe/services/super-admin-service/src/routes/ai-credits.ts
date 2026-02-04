import { Router } from 'express';
import { z } from 'zod';
import { coreDb as prisma } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';

const router = Router();

// All AI credits routes require super admin authentication
router.use(superAdminAuthMiddleware);

// ==================== CREDIT PACKAGES ====================

// List all credit packages
router.get('/packages', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [packages, total] = await Promise.all([
      prisma.aICreditPackage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isPopular: 'desc' }, { credits: 'asc' }],
      }),
      prisma.aICreditPackage.count({ where }),
    ]);

    res.json({
      success: true,
      data: packages,
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

// Create credit package
router.post('/packages', async (req, res, next) => {
  try {
    const schema = z.object({
      packageName: z.string().min(1).max(50),
      displayName: z.string().min(1).max(100),
      description: z.string().optional(),
      credits: z.number().min(1),
      price: z.number().min(0),
      currency: z.string().default('USD'),
      validityDays: z.number().min(1).default(365),
      bonusCredits: z.number().min(0).default(0),
      discountPercent: z.number().min(0).max(100).default(0),
      isPopular: z.boolean().default(false),
      isActive: z.boolean().default(true),
    });

    const data = schema.parse(req.body);

    // Check if package name already exists
    const existingPackage = await prisma.aICreditPackage.findUnique({
      where: { packageName: data.packageName },
    });

    if (existingPackage) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2004',
          message: 'Credit package with this name already exists',
        },
      });
    }

    const pkg = await prisma.aICreditPackage.create({
      data,
    });

    res.status(201).json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    next(error);
  }
});

// Update credit package
router.put('/packages/:id', async (req, res, next) => {
  try {
    const schema = z.object({
      packageName: z.string().min(1).max(50).optional(),
      displayName: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      credits: z.number().min(1).optional(),
      price: z.number().min(0).optional(),
      currency: z.string().optional(),
      validityDays: z.number().min(1).optional(),
      bonusCredits: z.number().min(0).optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      isPopular: z.boolean().optional(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const existingPackage = await prisma.aICreditPackage.findUnique({
      where: { id: req.params.id },
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Credit package not found',
        },
      });
    }

    const pkg = await prisma.aICreditPackage.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    next(error);
  }
});

// Delete credit package
router.delete('/packages/:id', async (req, res, next) => {
  try {
    await prisma.aICreditPackage.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Credit package deactivated',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== TENANT CREDITS ====================

// List all tenant credits
router.get('/tenants', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const lowBalance = req.query.lowBalance === 'true';
    const search = req.query.search as string;

    const where: any = {};

    if (lowBalance) {
      // Find tenants where balance is below alert threshold
      where.balance = { lte: prisma.tenantAICredits.fields.lowBalanceAlert };
    }

    const [credits, total] = await Promise.all([
      prisma.tenantAICredits.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { balance: 'asc' },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              contactEmail: true,
            },
          },
        },
      }),
      prisma.tenantAICredits.count({ where }),
    ]);

    // Filter by search if needed (tenant name)
    let filteredCredits = credits;
    if (search) {
      filteredCredits = credits.filter(c =>
        c.tenant.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tenant.slug.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      data: filteredCredits,
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

// Get tenant credits by tenant ID
router.get('/tenants/:tenantId', async (req, res, next) => {
  try {
    const credits = await prisma.tenantAICredits.findUnique({
      where: { tenantId: req.params.tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            contactEmail: true,
          },
        },
      },
    });

    if (!credits) {
      // If no credits record exists, check if tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.params.tenantId },
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

      // Return empty credits info
      return res.json({
        success: true,
        data: {
          tenantId: tenant.id,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            contactEmail: tenant.contactEmail,
          },
          balance: 0,
          totalPurchased: 0,
          totalUsed: 0,
          hasCredits: false,
        },
      });
    }

    res.json({
      success: true,
      data: credits,
    });
  } catch (error) {
    next(error);
  }
});

// Add credits to tenant (manual or from payment)
router.post('/tenants/:tenantId/add', async (req, res, next) => {
  try {
    const schema = z.object({
      credits: z.number().min(1),
      transactionType: z.enum(['PURCHASE', 'BONUS', 'ADJUSTMENT', 'REFUND']).default('PURCHASE'),
      packageId: z.string().uuid().optional(),
      paymentReference: z.string().optional(),
      paymentAmount: z.number().min(0).optional(),
      paymentCurrency: z.string().default('USD'),
      notes: z.string().optional(),
      expiresAt: z.string().datetime().optional(),
    });

    const data = schema.parse(req.body);

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.tenantId },
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

    // Get package details if provided
    let bonusCredits = 0;
    let validityDays = 365;
    if (data.packageId) {
      const pkg = await prisma.aICreditPackage.findUnique({
        where: { id: data.packageId },
      });
      if (pkg) {
        bonusCredits = pkg.bonusCredits;
        validityDays = pkg.validityDays;
      }
    }

    const totalCredits = data.credits + bonusCredits;
    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt)
      : new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    // Create or update tenant credits
    const result = await prisma.$transaction(async (tx) => {
      // Upsert tenant credits record
      const tenantCredits = await tx.tenantAICredits.upsert({
        where: { tenantId: req.params.tenantId },
        create: {
          tenantId: req.params.tenantId,
          balance: totalCredits,
          totalPurchased: totalCredits,
          lifetimeCredits: totalCredits,
          lastPurchaseAt: new Date(),
        },
        update: {
          balance: { increment: totalCredits },
          totalPurchased: { increment: totalCredits },
          lifetimeCredits: { increment: totalCredits },
          lastPurchaseAt: new Date(),
          isActive: true,
        },
      });

      // Create transaction record
      const transaction = await tx.aICreditTransaction.create({
        data: {
          tenantId: req.params.tenantId,
          transactionType: data.transactionType,
          creditsAmount: totalCredits,
          creditsBalance: tenantCredits.balance,
          packageId: data.packageId,
          paymentReference: data.paymentReference,
          paymentAmount: data.paymentAmount,
          paymentCurrency: data.paymentCurrency,
          notes: data.notes || `Added ${totalCredits} credits (${data.credits} + ${bonusCredits} bonus)`,
          expiresAt,
          processedBy: 'super_admin',
        },
      });

      // Clear any low balance alerts
      await tx.aIAdminAlert.updateMany({
        where: {
          tenantId: req.params.tenantId,
          alertType: 'LOW_BALANCE',
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: 'super_admin',
          resolutionNotes: `Credits added: ${totalCredits}`,
        },
      });

      return { tenantCredits, transaction };
    });

    res.json({
      success: true,
      data: {
        tenantCredits: result.tenantCredits,
        transaction: result.transaction,
      },
      message: `Added ${totalCredits} credits to tenant`,
    });
  } catch (error) {
    next(error);
  }
});

// Deduct credits from tenant (manual adjustment)
router.post('/tenants/:tenantId/deduct', async (req, res, next) => {
  try {
    const schema = z.object({
      credits: z.number().min(1),
      reason: z.string().min(1),
    });

    const data = schema.parse(req.body);

    const tenantCredits = await prisma.tenantAICredits.findUnique({
      where: { tenantId: req.params.tenantId },
    });

    if (!tenantCredits) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Tenant credits not found',
        },
      });
    }

    if (tenantCredits.balance < data.credits) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4003',
          message: 'Insufficient credits for deduction',
        },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedCredits = await tx.tenantAICredits.update({
        where: { tenantId: req.params.tenantId },
        data: {
          balance: { decrement: data.credits },
          totalUsed: { increment: data.credits },
        },
      });

      const transaction = await tx.aICreditTransaction.create({
        data: {
          tenantId: req.params.tenantId,
          transactionType: 'ADJUSTMENT',
          creditsAmount: -data.credits,
          creditsBalance: updatedCredits.balance,
          notes: `Manual deduction: ${data.reason}`,
          processedBy: 'super_admin',
        },
      });

      return { updatedCredits, transaction };
    });

    res.json({
      success: true,
      data: result,
      message: `Deducted ${data.credits} credits from tenant`,
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant credit transaction history
router.get('/tenants/:tenantId/transactions', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const transactionType = req.query.type as string;

    const where: any = { tenantId: req.params.tenantId };
    if (transactionType) {
      where.transactionType = transactionType;
    }

    const [transactions, total] = await Promise.all([
      prisma.aICreditTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          package: {
            select: {
              displayName: true,
              credits: true,
              price: true,
            },
          },
        },
      }),
      prisma.aICreditTransaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: transactions,
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

// Set tenant credit settings
router.put('/tenants/:tenantId/settings', async (req, res, next) => {
  try {
    const schema = z.object({
      lowBalanceAlert: z.number().min(0).optional(),
      autoRechargeEnabled: z.boolean().optional(),
      autoRechargeThreshold: z.number().min(0).optional(),
      autoRechargeAmount: z.number().min(0).optional(),
      monthlyLimit: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const tenantCredits = await prisma.tenantAICredits.upsert({
      where: { tenantId: req.params.tenantId },
      create: {
        tenantId: req.params.tenantId,
        balance: 0,
        ...data,
      },
      update: data,
    });

    res.json({
      success: true,
      data: tenantCredits,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ALERTS ====================

// List all admin alerts
router.get('/alerts', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const isResolved = req.query.isResolved === 'true' ? true : req.query.isResolved === 'false' ? false : undefined;
    const alertType = req.query.alertType as string;
    const severity = req.query.severity as string;

    const where: any = {};
    if (isResolved !== undefined) {
      where.isResolved = isResolved;
    }
    if (alertType) {
      where.alertType = alertType;
    }
    if (severity) {
      where.severity = severity;
    }

    const [alerts, total] = await Promise.all([
      prisma.aIAdminAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isResolved: 'asc' }, { severity: 'asc' }, { createdAt: 'desc' }],
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              contactEmail: true,
            },
          },
        },
      }),
      prisma.aIAdminAlert.count({ where }),
    ]);

    res.json({
      success: true,
      data: alerts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unresolvedCount: await prisma.aIAdminAlert.count({ where: { isResolved: false } }),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Resolve alert
router.post('/alerts/:id/resolve', async (req, res, next) => {
  try {
    const schema = z.object({
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const alert = await prisma.aIAdminAlert.update({
      where: { id: req.params.id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'super_admin',
        resolutionNotes: data.notes,
      },
    });

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

// Get credits summary/dashboard
router.get('/summary', async (req, res, next) => {
  try {
    const [
      totalTenantsWithCredits,
      totalCreditsInCirculation,
      lowBalanceTenants,
      unresolvedAlerts,
      recentTransactions,
      topUsageTenants,
    ] = await Promise.all([
      prisma.tenantAICredits.count({ where: { balance: { gt: 0 } } }),
      prisma.tenantAICredits.aggregate({
        _sum: { balance: true, totalPurchased: true, totalUsed: true },
      }),
      prisma.tenantAICredits.count({
        where: {
          balance: { lte: 100 }, // Low balance threshold
          isActive: true,
        },
      }),
      prisma.aIAdminAlert.count({ where: { isResolved: false } }),
      prisma.aICreditTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { name: true } },
        },
      }),
      prisma.tenantAICredits.findMany({
        take: 5,
        orderBy: { totalUsed: 'desc' },
        include: {
          tenant: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Get revenue for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueData = await prisma.aICreditTransaction.aggregate({
      where: {
        transactionType: 'PURCHASE',
        createdAt: { gte: thirtyDaysAgo },
        paymentAmount: { not: null },
      },
      _sum: { paymentAmount: true, creditsAmount: true },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalTenantsWithCredits,
          totalCreditsBalance: totalCreditsInCirculation._sum.balance || 0,
          totalCreditsPurchased: totalCreditsInCirculation._sum.totalPurchased || 0,
          totalCreditsUsed: totalCreditsInCirculation._sum.totalUsed || 0,
          lowBalanceTenants,
          unresolvedAlerts,
        },
        revenue: {
          last30Days: {
            amount: revenueData._sum.paymentAmount || 0,
            creditsSold: revenueData._sum.creditsAmount || 0,
            transactions: revenueData._count,
          },
        },
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          tenantName: t.tenant.name,
          type: t.transactionType,
          amount: t.creditsAmount,
          createdAt: t.createdAt,
        })),
        topUsageTenants: topUsageTenants.map(t => ({
          tenantId: t.tenant.id,
          tenantName: t.tenant.name,
          totalUsed: t.totalUsed,
          currentBalance: t.balance,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as aiCreditsRoutes };
