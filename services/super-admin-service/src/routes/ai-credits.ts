import { Router } from 'express';
import { z } from 'zod';
import { coreDb as prisma, getTenantClientBySlug, signCredits } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';
import { auditLog } from '../utils/auditLog.js';

/**
 * Helper: Get a tenant's database connection and write credits there.
 * Super Admin assigns credits → must be written to TENANT DB so the
 * credit-gate in each service can read it locally (tenant isolation).
 */
/**
 * Helper: Connect to a tenant's database.
 * Returns the tenantDb client or null if DB not ready.
 */
async function getTenantDbClient(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true, slug: true,
      databaseHost: true, databaseName: true, databaseUser: true,
      databasePassword: true, databasePort: true, databaseSSL: true,
      databaseConnectionUrl: true, databaseStatus: true,
    },
  });

  if (!tenant || tenant.databaseStatus !== 'READY') {
    console.warn(`[ai-credits] Cannot connect to tenant ${tenantId}: DB not ready`);
    return null;
  }

  const tenantDb = await getTenantClientBySlug(
    tenant.slug,
    {
      databaseHost: tenant.databaseHost,
      databaseName: tenant.databaseName,
      databaseUser: tenant.databaseUser,
      databasePassword: tenant.databasePassword,
      databasePort: tenant.databasePort,
      databaseSSL: tenant.databaseSSL,
      databaseConnectionUrl: tenant.databaseConnectionUrl,
    },
    tenant.id
  );

  return tenantDb;
}

/**
 * Sync credits to tenant DB, then read back actual balance and update coreDb to match.
 * Tenant DB is the source of truth for credit balance.
 */
async function syncCreditsToTenantDb(tenantId: string, creditData: {
  totalCredits: number;
  bonusCredits: number;
  expiresAt: Date | null;
}): Promise<void> {
  const tenantDb = await getTenantDbClient(tenantId);
  if (!tenantDb) return;

  // Upsert into tenant's own TenantAICredits table
  await (tenantDb as any).tenantAICredits.upsert({
    where: { tenantId },
    create: {
      tenantId,
      totalCredits: creditData.totalCredits,
      usedCredits: 0,
      bonusCredits: creditData.bonusCredits,
      expiresAt: creditData.expiresAt,
      lastPurchasedAt: new Date(),
    },
    update: {
      totalCredits: { increment: creditData.totalCredits },
      bonusCredits: { increment: creditData.bonusCredits },
      ...(creditData.expiresAt ? { expiresAt: creditData.expiresAt } : {}),
      lastPurchasedAt: new Date(),
    },
  });

  // Read back actual balance, compute HMAC signature, and update both DBs
  const actual = await (tenantDb as any).tenantAICredits.findUnique({
    where: { tenantId },
  });

  if (actual) {
    // Compute HMAC signature over the credit fields
    const signature = signCredits({
      tenantId,
      totalCredits: actual.totalCredits,
      bonusCredits: actual.bonusCredits || 0,
      expiresAt: actual.expiresAt ? actual.expiresAt.toISOString() : null,
    });

    // Store signature in tenant DB
    await (tenantDb as any).tenantAICredits.update({
      where: { tenantId },
      data: { creditSignature: signature },
    });

    // Sync coreDb balance to match tenant DB
    const realBalance = actual.totalCredits - actual.usedCredits + (actual.bonusCredits || 0);
    await prisma.tenantAICredits.update({
      where: { tenantId },
      data: {
        balance: realBalance,
        totalPurchased: actual.totalCredits,
        totalUsed: actual.usedCredits,
      },
    });
    console.log(`[ai-credits] Synced to tenant DB, signed credits, coreDb balance=${realBalance} for tenant ${tenantId}`);
  }
}

const router = Router();

// All AI credits routes require super admin authentication
router.use(superAdminAuthMiddleware);

// Default platform commission: 40%
const DEFAULT_COMMISSION_PERCENT = 40;

// Get platform commission percentage from SystemConfig
async function getCommissionPercent(): Promise<number> {
  const config = await prisma.systemConfig.findUnique({
    where: { configKey: 'ai_credit_commission_percent' },
  });
  if (config?.configValue && typeof (config.configValue as any) === 'object') {
    return (config.configValue as any).value ?? DEFAULT_COMMISSION_PERCENT;
  }
  return DEFAULT_COMMISSION_PERCENT;
}

// ==================== COMMISSION SETTINGS ====================

// Get commission settings
router.get('/commission', async (_req, res, next) => {
  try {
    const commissionPercent = await getCommissionPercent();
    res.json({
      success: true,
      data: {
        commissionPercent,
        description: `Platform takes ${commissionPercent}% commission on all AI credit usage. Tenants pay provider cost + ${commissionPercent}% markup.`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update commission percentage
router.put('/commission', async (req, res, next) => {
  try {
    const schema = z.object({
      commissionPercent: z.number().min(0).max(200),
    });
    const { commissionPercent } = schema.parse(req.body);

    await prisma.systemConfig.upsert({
      where: { configKey: 'ai_credit_commission_percent' },
      create: {
        configKey: 'ai_credit_commission_percent',
        configValue: { value: commissionPercent },
        description: 'Platform commission percentage on AI credit usage',
        isSystem: true,
      },
      update: {
        configValue: { value: commissionPercent },
      },
    });

    auditLog(req, 'UPDATE_COMMISSION', 'system_config', 'ai_credit_commission_percent', null, { commissionPercent });

    res.json({
      success: true,
      data: { commissionPercent },
      message: `Commission updated to ${commissionPercent}%`,
    });
  } catch (error) {
    next(error);
  }
});

// Credit pricing calculator — given provider costs, calculate recommended selling price
router.post('/calculate-pricing', async (req, res, next) => {
  try {
    const schema = z.object({
      providerCostPerCredit: z.number().min(0),
      credits: z.number().min(1),
    });
    const { providerCostPerCredit, credits } = schema.parse(req.body);
    const commissionPercent = await getCommissionPercent();

    const baseCost = providerCostPerCredit * credits;
    const commission = baseCost * (commissionPercent / 100);
    const sellingPrice = baseCost + commission;
    const pricePerCredit = sellingPrice / credits;

    res.json({
      success: true,
      data: {
        credits,
        providerCostPerCredit,
        baseCost: parseFloat(baseCost.toFixed(2)),
        commissionPercent,
        commissionAmount: parseFloat(commission.toFixed(2)),
        sellingPrice: parseFloat(sellingPrice.toFixed(2)),
        pricePerCredit: parseFloat(pricePerCredit.toFixed(4)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Root endpoint - overview
router.get('/', async (_req, res, next) => {
  try {
    const [packageCount, tenantCreditsCount, alertCount, commissionPercent] = await Promise.all([
      prisma.aICreditPackage.count(),
      prisma.tenantAICredits.count(),
      prisma.aIAdminAlert.count({ where: { isResolved: false } }),
      getCommissionPercent(),
    ]);

    res.json({
      success: true,
      data: {
        packages: packageCount,
        tenantsWithCredits: tenantCreditsCount,
        unresolvedAlerts: alertCount,
        commissionPercent,
      },
    });
  } catch (error) {
    next(error);
  }
});

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

    auditLog(req, 'CREATE_CREDIT_PACKAGE', 'ai_credit_package', pkg.id, null, { packageName: data.packageName, credits: data.credits });

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

    auditLog(req, 'UPDATE_CREDIT_PACKAGE', 'ai_credit_package', req.params.id);

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

    auditLog(req, 'DELETE_CREDIT_PACKAGE', 'ai_credit_package', req.params.id);

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
      // Find tenants where balance is below a low threshold
      where.balance = { lte: 100 };
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
      filteredCredits = credits.filter((c: any) =>
        c.tenant.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tenant.slug.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Enrich with real balance from each tenant's own DB
    const enriched = await Promise.all(
      filteredCredits.map(async (c: any) => {
        try {
          const tenantDb = await getTenantDbClient(c.tenantId);
          if (tenantDb) {
            const actual = await (tenantDb as any).tenantAICredits.findUnique({
              where: { tenantId: c.tenantId },
            });
            if (actual) {
              const realBalance = actual.totalCredits - actual.usedCredits + (actual.bonusCredits || 0);
              return { ...c, balance: realBalance };
            }
          }
        } catch {
          // Fall back to coreDb balance
        }
        return c;
      })
    );

    res.json({
      success: true,
      data: enriched,
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

    // Sync credits to the tenant's own isolated database
    try {
      await syncCreditsToTenantDb(req.params.tenantId, {
        totalCredits: data.credits,
        bonusCredits: bonusCredits,
        expiresAt,
      });
    } catch (syncError) {
      console.error(`[ai-credits] Failed to sync credits to tenant DB for ${req.params.tenantId}:`, syncError);
      // Don't fail the request — core DB is updated. Log for manual resolution.
    }

    auditLog(req, 'ADD_CREDITS', 'tenant_ai_credits', req.params.tenantId, req.params.tenantId, { credits: totalCredits, transactionType: data.transactionType });

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

    // Sync deduction to tenant's own database, then sync coreDb balance
    try {
      const tenantDb = await getTenantDbClient(req.params.tenantId);
      if (tenantDb) {
        await (tenantDb as any).tenantAICredits.updateMany({
          where: { tenantId: req.params.tenantId },
          data: { totalCredits: { decrement: data.credits } },
        });

        // Read back actual balance, re-sign, and sync coreDb
        const actual = await (tenantDb as any).tenantAICredits.findUnique({
          where: { tenantId: req.params.tenantId },
        });
        if (actual) {
          // Re-compute signature after deduction
          const signature = signCredits({
            tenantId: req.params.tenantId,
            totalCredits: actual.totalCredits,
            bonusCredits: actual.bonusCredits || 0,
            expiresAt: actual.expiresAt ? actual.expiresAt.toISOString() : null,
          });
          await (tenantDb as any).tenantAICredits.update({
            where: { tenantId: req.params.tenantId },
            data: { creditSignature: signature },
          });

          const realBalance = actual.totalCredits - actual.usedCredits + (actual.bonusCredits || 0);
          await prisma.tenantAICredits.update({
            where: { tenantId: req.params.tenantId },
            data: { balance: realBalance, totalPurchased: actual.totalCredits, totalUsed: actual.usedCredits },
          });
        }
      }
    } catch (syncError) {
      console.error(`[ai-credits] Failed to sync deduction to tenant DB for ${req.params.tenantId}:`, syncError);
    }

    auditLog(req, 'DEDUCT_CREDITS', 'tenant_ai_credits', req.params.tenantId, req.params.tenantId, { credits: data.credits, reason: data.reason });

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

    auditLog(req, 'UPDATE_CREDIT_SETTINGS', 'tenant_ai_credits', req.params.tenantId, req.params.tenantId);

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

    const [alerts, total, unresolvedCount] = await Promise.all([
      prisma.aIAdminAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
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
      prisma.aIAdminAlert.count({ where: { isResolved: false } }),
    ]);

    res.json({
      success: true,
      data: alerts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unresolvedCount,
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

    auditLog(req, 'RESOLVE_ALERT', 'ai_admin_alert', req.params.id);

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

// Get credits summary/dashboard with profit tracking
router.get('/summary', async (_req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalTenantsWithCredits,
      totalCreditsInCirculation,
      lowBalanceTenants,
      unresolvedAlerts,
      recentTransactions,
      topUsageTenants,
      commissionPercent,
      usageCostData,
    ] = await Promise.all([
      prisma.tenantAICredits.count({ where: { balance: { gt: 0 } } }),
      prisma.tenantAICredits.aggregate({
        _sum: { balance: true, totalPurchased: true, totalUsed: true },
      }),
      prisma.tenantAICredits.count({
        where: {
          balance: { lte: 100 },
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
      getCommissionPercent(),
      // Get actual provider costs from usage logs (last 30 days)
      prisma.aIUsageLog.aggregate({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: 'success',
        },
        _sum: { totalCost: true, creditsUsed: true },
        _count: true,
      }),
    ]);

    // Get revenue for last 30 days
    const revenueData = await prisma.aICreditTransaction.aggregate({
      where: {
        transactionType: 'PURCHASE',
        createdAt: { gte: thirtyDaysAgo },
        paymentAmount: { not: null },
      },
      _sum: { paymentAmount: true, creditsAmount: true },
      _count: true,
    });

    // All-time provider cost
    const allTimeCost = await prisma.aIUsageLog.aggregate({
      where: { status: 'success' },
      _sum: { totalCost: true },
    });

    // All-time revenue from purchases
    const allTimeRevenue = await prisma.aICreditTransaction.aggregate({
      where: {
        transactionType: 'PURCHASE',
        paymentAmount: { not: null },
      },
      _sum: { paymentAmount: true },
    });

    const totalProviderCost = allTimeCost._sum.totalCost || 0;
    const totalRevenue = allTimeRevenue._sum.paymentAmount || 0;
    const totalProfit = totalRevenue - totalProviderCost;

    const last30ProviderCost = usageCostData._sum.totalCost || 0;
    const last30Revenue = revenueData._sum.paymentAmount || 0;
    const last30Profit = last30Revenue - last30ProviderCost;

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
          commissionPercent,
        },
        financials: {
          allTime: {
            revenue: parseFloat(totalRevenue.toFixed(2)),
            providerCost: parseFloat(totalProviderCost.toFixed(2)),
            profit: parseFloat(totalProfit.toFixed(2)),
            marginPercent: totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0,
          },
          last30Days: {
            revenue: parseFloat(last30Revenue.toFixed(2)),
            providerCost: parseFloat(last30ProviderCost.toFixed(2)),
            profit: parseFloat(last30Profit.toFixed(2)),
            creditsSold: revenueData._sum.creditsAmount || 0,
            creditsUsed: usageCostData._sum.creditsUsed || 0,
            aiCalls: usageCostData._count,
            transactions: revenueData._count,
          },
        },
        recentTransactions: recentTransactions.map((t: any) => ({
          id: t.id,
          tenantName: t.tenant.name,
          type: t.transactionType,
          amount: t.creditsAmount,
          createdAt: t.createdAt,
        })),
        topUsageTenants: topUsageTenants.map((t: any) => ({
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
