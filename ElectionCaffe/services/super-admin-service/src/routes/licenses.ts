import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, LicenseStatus, LicensePlanType, LicenseBillingCycle, UsageAlertLevel } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ==================== LICENSE PLANS ====================

// Get all license plans
router.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive, isPublic, planType } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';
    if (planType) where.planType = planType as LicensePlanType;

    const plans = await prisma.licensePlan.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { tenantLicenses: true },
        },
      },
    });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
});

// Get license plan by ID
router.get('/plans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const plan = await prisma.licensePlan.findUnique({
      where: { id },
      include: {
        tenantLicenses: {
          include: {
            tenant: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: { tenantLicenses: true },
        },
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { message: 'License plan not found' },
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

// Create license plan
router.post('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      planName,
      planType,
      description,
      maxUsers,
      maxAdminUsers,
      maxConcurrentSessions,
      maxSessionsPerUser,
      sessionTimeoutMinutes,
      maxDataProcessingGB,
      maxVoters,
      maxElections,
      maxConstituencies,
      maxStorageMB,
      maxApiRequestsPerDay,
      maxApiRequestsPerHour,
      basePrice,
      pricePerUser,
      pricePerSession,
      pricePerGBProcessed,
      billingCycle,
      currency,
      includedFeatures,
      excludedFeatures,
      gracePeriodDays,
      trialDays,
      allowOverage,
      overagePricePerUser,
      overagePricePerGB,
      overageSessionPrice,
      isActive,
      isPublic,
      displayOrder,
    } = req.body;

    if (!planName || !planType) {
      return res.status(400).json({
        success: false,
        error: { message: 'Plan name and type are required' },
      });
    }

    // Check for duplicate plan name
    const existing = await prisma.licensePlan.findUnique({
      where: { planName },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { message: 'A plan with this name already exists' },
      });
    }

    const plan = await prisma.licensePlan.create({
      data: {
        planName,
        planType: planType as LicensePlanType,
        description,
        maxUsers: maxUsers || 10,
        maxAdminUsers: maxAdminUsers || 2,
        maxConcurrentSessions: maxConcurrentSessions || 5,
        maxSessionsPerUser: maxSessionsPerUser || 2,
        sessionTimeoutMinutes: sessionTimeoutMinutes || 30,
        maxDataProcessingGB: maxDataProcessingGB || 5.0,
        maxVoters: maxVoters || 10000,
        maxElections: maxElections || 3,
        maxConstituencies: maxConstituencies || 1,
        maxStorageMB: maxStorageMB || 5000,
        maxApiRequestsPerDay: maxApiRequestsPerDay || 10000,
        maxApiRequestsPerHour: maxApiRequestsPerHour || 1000,
        basePrice: basePrice || 0,
        pricePerUser: pricePerUser || 0,
        pricePerSession: pricePerSession || 0,
        pricePerGBProcessed: pricePerGBProcessed || 0,
        billingCycle: (billingCycle as LicenseBillingCycle) || 'MONTHLY',
        currency: currency || 'INR',
        includedFeatures: includedFeatures || [],
        excludedFeatures: excludedFeatures || [],
        gracePeriodDays: gracePeriodDays || 7,
        trialDays: trialDays || 14,
        allowOverage: allowOverage || false,
        overagePricePerUser,
        overagePricePerGB,
        overageSessionPrice,
        isActive: isActive !== false,
        isPublic: isPublic !== false,
        displayOrder: displayOrder || 0,
      },
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

// Update license plan
router.put('/plans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.licensePlan.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'License plan not found' },
      });
    }

    // Don't allow changing planName if other tenants are using it
    if (updateData.planName && updateData.planName !== existing.planName) {
      const inUse = await prisma.tenantLicense.count({
        where: { licensePlanId: id },
      });
      if (inUse > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot rename plan that is in use by tenants' },
        });
      }
    }

    const plan = await prisma.licensePlan.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

// Delete license plan
router.delete('/plans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.licensePlan.findUnique({
      where: { id },
      include: {
        _count: { select: { tenantLicenses: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'License plan not found' },
      });
    }

    if (existing._count.tenantLicenses > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete plan that is in use by tenants' },
      });
    }

    await prisma.licensePlan.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'License plan deleted',
    });
  } catch (error) {
    next(error);
  }
});

// Seed default license plans
router.post('/plans/seed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const defaultPlans = [
      {
        planName: 'Free',
        planType: 'FREE' as LicensePlanType,
        description: 'Basic free plan for small organizations',
        maxUsers: 5,
        maxAdminUsers: 1,
        maxConcurrentSessions: 3,
        maxSessionsPerUser: 1,
        sessionTimeoutMinutes: 30,
        maxDataProcessingGB: 1.0,
        maxVoters: 1000,
        maxElections: 1,
        maxConstituencies: 1,
        maxStorageMB: 500,
        maxApiRequestsPerDay: 1000,
        maxApiRequestsPerHour: 100,
        basePrice: 0,
        billingCycle: 'MONTHLY' as LicenseBillingCycle,
        trialDays: 0,
        displayOrder: 1,
      },
      {
        planName: 'Starter',
        planType: 'STARTER' as LicensePlanType,
        description: 'For small to medium campaigns',
        maxUsers: 25,
        maxAdminUsers: 3,
        maxConcurrentSessions: 10,
        maxSessionsPerUser: 2,
        sessionTimeoutMinutes: 60,
        maxDataProcessingGB: 10.0,
        maxVoters: 25000,
        maxElections: 3,
        maxConstituencies: 3,
        maxStorageMB: 5000,
        maxApiRequestsPerDay: 10000,
        maxApiRequestsPerHour: 1000,
        basePrice: 4999,
        pricePerUser: 199,
        billingCycle: 'MONTHLY' as LicenseBillingCycle,
        trialDays: 14,
        displayOrder: 2,
      },
      {
        planName: 'Professional',
        planType: 'PROFESSIONAL' as LicensePlanType,
        description: 'For medium to large campaigns',
        maxUsers: 100,
        maxAdminUsers: 10,
        maxConcurrentSessions: 50,
        maxSessionsPerUser: 3,
        sessionTimeoutMinutes: 120,
        maxDataProcessingGB: 50.0,
        maxVoters: 100000,
        maxElections: 10,
        maxConstituencies: 10,
        maxStorageMB: 25000,
        maxApiRequestsPerDay: 50000,
        maxApiRequestsPerHour: 5000,
        basePrice: 19999,
        pricePerUser: 149,
        pricePerGBProcessed: 99,
        billingCycle: 'MONTHLY' as LicenseBillingCycle,
        allowOverage: true,
        overagePricePerUser: 249,
        overagePricePerGB: 149,
        trialDays: 14,
        displayOrder: 3,
      },
      {
        planName: 'Enterprise',
        planType: 'ENTERPRISE' as LicensePlanType,
        description: 'For large political parties and election management companies',
        maxUsers: 500,
        maxAdminUsers: 50,
        maxConcurrentSessions: 200,
        maxSessionsPerUser: 5,
        sessionTimeoutMinutes: 240,
        maxDataProcessingGB: 500.0,
        maxVoters: 1000000,
        maxElections: 50,
        maxConstituencies: 100,
        maxStorageMB: 100000,
        maxApiRequestsPerDay: 200000,
        maxApiRequestsPerHour: 20000,
        basePrice: 99999,
        pricePerUser: 99,
        pricePerGBProcessed: 49,
        billingCycle: 'YEARLY' as LicenseBillingCycle,
        allowOverage: true,
        overagePricePerUser: 149,
        overagePricePerGB: 79,
        overageSessionPrice: 99,
        gracePeriodDays: 14,
        trialDays: 30,
        displayOrder: 4,
      },
    ];

    const createdPlans = [];
    for (const planData of defaultPlans) {
      const existing = await prisma.licensePlan.findUnique({
        where: { planName: planData.planName },
      });

      if (!existing) {
        const plan = await prisma.licensePlan.create({
          data: planData,
        });
        createdPlans.push(plan);
      }
    }

    res.json({
      success: true,
      message: `Created ${createdPlans.length} license plans`,
      data: createdPlans,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== TENANT LICENSES ====================

// Get all tenant licenses
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, planId, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status as LicenseStatus;
    if (planId) where.licensePlanId = planId as string;

    const [licenses, total] = await Promise.all([
      prisma.tenantLicense.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, tenantType: true, status: true },
          },
          licensePlan: {
            select: { id: true, planName: true, planType: true },
          },
          _count: {
            select: { sessions: { where: { isActive: true } } },
          },
        },
      }),
      prisma.tenantLicense.count({ where }),
    ]);

    res.json({
      success: true,
      data: licenses,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant license by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const license = await prisma.tenantLicense.findUnique({
      where: { id },
      include: {
        tenant: true,
        licensePlan: true,
        sessions: {
          where: { isActive: true },
          orderBy: { lastActivityAt: 'desc' },
        },
        usageAlerts: {
          where: { isResolved: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        billingHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        error: { message: 'License not found' },
      });
    }

    // Get current usage metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUsage = await prisma.tenantUsageMetrics.findFirst({
      where: {
        tenantLicenseId: id,
        metricDate: today,
        metricHour: null,
      },
    });

    // Count active users
    const activeUsers = await prisma.user.count({
      where: {
        tenantId: license.tenantId,
        status: 'ACTIVE',
      },
    });

    res.json({
      success: true,
      data: {
        ...license,
        currentUsage: {
          activeUsers,
          activeSessions: license.sessions.length,
          todayMetrics: todayUsage,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get license by tenant ID
router.get('/tenant/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const license = await prisma.tenantLicense.findUnique({
      where: { tenantId },
      include: {
        tenant: true,
        licensePlan: true,
        sessions: {
          where: { isActive: true },
        },
        usageAlerts: {
          where: { isResolved: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        error: { message: 'No license found for this tenant' },
      });
    }

    res.json({
      success: true,
      data: license,
    });
  } catch (error) {
    next(error);
  }
});

// Assign license to tenant
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tenantId,
      licensePlanId,
      status,
      customMaxUsers,
      customMaxSessions,
      customMaxSessionsPerUser,
      customMaxDataGB,
      customMaxVoters,
      customMaxElections,
      customMaxConstituencies,
      customMaxStorageMB,
      customMaxApiPerDay,
      customMaxApiPerHour,
      customBasePrice,
      discountPercent,
      expiresAt,
      trialEndsAt,
      enforceSessionLimit,
      enforceUserLimit,
      enforceDataLimit,
      enforceApiLimit,
      softLimitMode,
      autoRenew,
      adminNotes,
    } = req.body;

    if (!tenantId || !licensePlanId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tenant ID and License Plan ID are required' },
      });
    }

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { message: 'Tenant not found' },
      });
    }

    // Check if tenant already has a license
    const existingLicense = await prisma.tenantLicense.findUnique({
      where: { tenantId },
    });

    if (existingLicense) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tenant already has a license. Use update endpoint instead.' },
      });
    }

    // Check if plan exists
    const plan = await prisma.licensePlan.findUnique({
      where: { id: licensePlanId },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { message: 'License plan not found' },
      });
    }

    // Calculate trial end date if not provided
    let trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
    if (!trialEnd && plan.trialDays > 0) {
      trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
    }

    const adminId = (req as any).adminId;

    const license = await prisma.tenantLicense.create({
      data: {
        tenantId,
        licensePlanId,
        status: (status as LicenseStatus) || 'TRIAL',
        customMaxUsers,
        customMaxSessions,
        customMaxSessionsPerUser,
        customMaxDataGB,
        customMaxVoters,
        customMaxElections,
        customMaxConstituencies,
        customMaxStorageMB,
        customMaxApiPerDay,
        customMaxApiPerHour,
        customBasePrice,
        discountPercent: discountPercent || 0,
        activatedAt: status === 'ACTIVE' ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        trialEndsAt: trialEnd,
        enforceSessionLimit: enforceSessionLimit !== false,
        enforceUserLimit: enforceUserLimit !== false,
        enforceDataLimit: enforceDataLimit !== false,
        enforceApiLimit: enforceApiLimit !== false,
        softLimitMode: softLimitMode || false,
        autoRenew: autoRenew !== false,
        adminNotes,
        createdBy: adminId,
      },
      include: {
        tenant: true,
        licensePlan: true,
      },
    });

    // Update tenant limits based on license
    const effectiveLimits = {
      maxUsers: customMaxUsers || plan.maxUsers,
      maxVoters: customMaxVoters || plan.maxVoters,
      maxElections: customMaxElections || plan.maxElections,
      maxConstituencies: customMaxConstituencies || plan.maxConstituencies,
      storageQuotaMB: customMaxStorageMB || plan.maxStorageMB,
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: effectiveLimits,
    });

    res.status(201).json({
      success: true,
      data: license,
    });
  } catch (error) {
    next(error);
  }
});

// Update tenant license
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.tenantLicense.findUnique({
      where: { id },
      include: { licensePlan: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'License not found' },
      });
    }

    // If changing plan, get new plan details
    let plan = existing.licensePlan;
    if (updateData.licensePlanId && updateData.licensePlanId !== existing.licensePlanId) {
      const newPlan = await prisma.licensePlan.findUnique({
        where: { id: updateData.licensePlanId },
      });
      if (!newPlan) {
        return res.status(404).json({
          success: false,
          error: { message: 'New license plan not found' },
        });
      }
      plan = newPlan;
    }

    // Handle status changes
    if (updateData.status && updateData.status !== existing.status) {
      if (updateData.status === 'ACTIVE' && !existing.activatedAt) {
        updateData.activatedAt = new Date();
      }
      if (updateData.status === 'SUSPENDED') {
        updateData.suspendedAt = new Date();
      }
      if (updateData.status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
      }
    }

    const license = await prisma.tenantLicense.update({
      where: { id },
      data: updateData,
      include: {
        tenant: true,
        licensePlan: true,
      },
    });

    // Update tenant limits if license or custom limits changed
    const effectiveLimits = {
      maxUsers: license.customMaxUsers || plan.maxUsers,
      maxVoters: license.customMaxVoters || plan.maxVoters,
      maxElections: license.customMaxElections || plan.maxElections,
      maxConstituencies: license.customMaxConstituencies || plan.maxConstituencies,
      storageQuotaMB: license.customMaxStorageMB || plan.maxStorageMB,
    };

    await prisma.tenant.update({
      where: { id: license.tenantId },
      data: effectiveLimits,
    });

    res.json({
      success: true,
      data: license,
    });
  } catch (error) {
    next(error);
  }
});

// Suspend tenant license
router.post('/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const license = await prisma.tenantLicense.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedReason: reason,
      },
      include: {
        tenant: true,
        licensePlan: true,
      },
    });

    // Terminate all active sessions
    await prisma.tenantSession.updateMany({
      where: {
        tenantLicenseId: id,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'license_suspended',
      },
    });

    // Update tenant status
    await prisma.tenant.update({
      where: { id: license.tenantId },
      data: { status: 'SUSPENDED', suspendedAt: new Date(), suspendedReason: reason },
    });

    res.json({
      success: true,
      data: license,
    });
  } catch (error) {
    next(error);
  }
});

// Activate/reactivate tenant license
router.post('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { expiresAt } = req.body;

    const existing = await prisma.tenantLicense.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'License not found' },
      });
    }

    const license = await prisma.tenantLicense.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        activatedAt: existing.activatedAt || new Date(),
        suspendedAt: null,
        suspendedReason: null,
        expiresAt: expiresAt ? new Date(expiresAt) : existing.expiresAt,
      },
      include: {
        tenant: true,
        licensePlan: true,
      },
    });

    // Update tenant status
    await prisma.tenant.update({
      where: { id: license.tenantId },
      data: { status: 'ACTIVE', suspendedAt: null, suspendedReason: null },
    });

    res.json({
      success: true,
      data: license,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== SESSION MANAGEMENT ====================

// Get active sessions for a tenant
router.get('/:id/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.query;

    const where: any = { tenantLicenseId: id };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const sessions = await prisma.tenantSession.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
});

// Terminate a specific session
router.post('/sessions/:sessionId/terminate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = await prisma.tenantSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason || 'admin_terminated',
      },
    });

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

// Terminate all sessions for a tenant
router.post('/:id/sessions/terminate-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await prisma.tenantSession.updateMany({
      where: {
        tenantLicenseId: id,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason || 'admin_terminated_all',
      },
    });

    res.json({
      success: true,
      message: `Terminated ${result.count} sessions`,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== USAGE METRICS ====================

// Get usage metrics for a license
router.get('/:id/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, granularity = 'daily' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const where: any = {
      tenantLicenseId: id,
      metricDate: {
        gte: start,
        lte: end,
      },
    };

    if (granularity === 'daily') {
      where.metricHour = null;
    } else if (granularity === 'hourly') {
      where.metricHour = { not: null };
    }

    const metrics = await prisma.tenantUsageMetrics.findMany({
      where,
      orderBy: [{ metricDate: 'asc' }, { metricHour: 'asc' }],
    });

    // Calculate summary
    const summary = {
      totalDataProcessedMB: metrics.reduce((sum, m) => sum + m.dataProcessedMB, 0),
      totalApiRequests: metrics.reduce((sum, m) => sum + m.apiRequestCount, 0),
      peakConcurrentSessions: Math.max(...metrics.map(m => m.peakConcurrentSessions), 0),
      avgActiveUsers: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.activeUsers, 0) / metrics.length
        : 0,
      totalComputedCost: metrics.reduce((sum, m) => sum + m.computedCost, 0),
    };

    res.json({
      success: true,
      data: {
        metrics,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ALERTS ====================

// Get alerts for a license
router.get('/:id/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isResolved, alertLevel } = req.query;

    const where: any = { tenantLicenseId: id };
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';
    if (alertLevel) where.alertLevel = alertLevel as UsageAlertLevel;

    const alerts = await prisma.usageAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
});

// Mark alert as read/dismissed/resolved
router.patch('/alerts/:alertId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alertId } = req.params;
    const { isRead, isDismissed, isResolved } = req.body;

    const updateData: any = {};
    if (isRead !== undefined) updateData.isRead = isRead;
    if (isDismissed !== undefined) updateData.isDismissed = isDismissed;
    if (isResolved !== undefined) {
      updateData.isResolved = isResolved;
      if (isResolved) updateData.resolvedAt = new Date();
    }

    const alert = await prisma.usageAlert.update({
      where: { id: alertId },
      data: updateData,
    });

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== BILLING ====================

// Get billing history for a license
router.get('/:id/billing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [billing, total] = await Promise.all([
      prisma.billingHistory.findMany({
        where: { tenantLicenseId: id },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.billingHistory.count({ where: { tenantLicenseId: id } }),
    ]);

    res.json({
      success: true,
      data: billing,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create billing record
router.post('/:id/billing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      billingPeriodStart,
      billingPeriodEnd,
      baseAmount,
      userOverageAmount,
      sessionOverageAmount,
      dataOverageAmount,
      discountAmount,
      taxAmount,
      usageSummary,
      notes,
    } = req.body;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const totalAmount = (baseAmount || 0) +
                        (userOverageAmount || 0) +
                        (sessionOverageAmount || 0) +
                        (dataOverageAmount || 0) -
                        (discountAmount || 0) +
                        (taxAmount || 0);

    const billing = await prisma.billingHistory.create({
      data: {
        tenantLicenseId: id,
        invoiceNumber,
        billingPeriodStart: new Date(billingPeriodStart),
        billingPeriodEnd: new Date(billingPeriodEnd),
        baseAmount: baseAmount || 0,
        userOverageAmount: userOverageAmount || 0,
        sessionOverageAmount: sessionOverageAmount || 0,
        dataOverageAmount: dataOverageAmount || 0,
        discountAmount: discountAmount || 0,
        taxAmount: taxAmount || 0,
        totalAmount,
        usageSummary: usageSummary || {},
        notes,
      },
    });

    res.status(201).json({
      success: true,
      data: billing,
    });
  } catch (error) {
    next(error);
  }
});

// Update payment status
router.patch('/billing/:billingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { billingId } = req.params;
    const { paymentStatus, paymentMethod, paymentReference, paidAt } = req.body;

    const updateData: any = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (paymentReference) updateData.paymentReference = paymentReference;
    if (paidAt) updateData.paidAt = new Date(paidAt);
    if (paymentStatus === 'paid' && !paidAt) updateData.paidAt = new Date();

    const billing = await prisma.billingHistory.update({
      where: { id: billingId },
      data: updateData,
    });

    res.json({
      success: true,
      data: billing,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== DASHBOARD STATS ====================

// Get license dashboard stats
router.get('/stats/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalLicenses,
      activeLicenses,
      trialLicenses,
      suspendedLicenses,
      expiredLicenses,
      totalPlans,
      activeSessions,
      recentAlerts,
    ] = await Promise.all([
      prisma.tenantLicense.count(),
      prisma.tenantLicense.count({ where: { status: 'ACTIVE' } }),
      prisma.tenantLicense.count({ where: { status: 'TRIAL' } }),
      prisma.tenantLicense.count({ where: { status: 'SUSPENDED' } }),
      prisma.tenantLicense.count({ where: { status: 'EXPIRED' } }),
      prisma.licensePlan.count({ where: { isActive: true } }),
      prisma.tenantSession.count({ where: { isActive: true } }),
      prisma.usageAlert.count({ where: { isResolved: false, alertLevel: { in: ['CRITICAL', 'EXCEEDED'] } } }),
    ]);

    // Get licenses expiring soon (within 7 days)
    const expiringWithin7Days = await prisma.tenantLicense.count({
      where: {
        expiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: 'ACTIVE',
      },
    });

    // Get revenue stats
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await prisma.billingHistory.aggregate({
      where: {
        createdAt: { gte: thisMonth },
        paymentStatus: 'paid',
      },
      _sum: { totalAmount: true },
    });

    res.json({
      success: true,
      data: {
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          trial: trialLicenses,
          suspended: suspendedLicenses,
          expired: expiredLicenses,
          expiringWithin7Days,
        },
        plans: {
          total: totalPlans,
        },
        sessions: {
          active: activeSessions,
        },
        alerts: {
          critical: recentAlerts,
        },
        revenue: {
          thisMonth: monthlyRevenue._sum.totalAmount || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as licensesRoutes };
