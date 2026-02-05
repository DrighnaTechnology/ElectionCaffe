import { Request, Response, NextFunction } from 'express';
import { PrismaClient, LicenseStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface LicenseCheckResult {
  valid: boolean;
  message?: string;
  license?: any;
  limits?: {
    maxUsers: number;
    maxVoters: number;
    maxElections: number;
    maxConstituencies: number;
    maxStorageMB: number;
    maxApiPerDay: number;
    maxApiPerHour: number;
  };
  warning?: {
    type: string;
    message: string;
  };
}

/**
 * License Enforcement Middleware
 * Checks if tenant has valid license and enforces limits
 */
export async function licenseEnforcementMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = (req as any).tenantId;

    // Skip if no tenant context (public routes)
    if (!tenantId) {
      return next();
    }

    const result = await checkTenantLicense(tenantId);

    if (!result.valid) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'LICENSE_INVALID',
          message: result.message || 'License is invalid or expired',
        },
      });
    }

    // Add license info to request
    (req as any).license = result.license;
    (req as any).licenseLimits = result.limits;

    // Add warning header if approaching limits
    if (result.warning) {
      res.setHeader('X-License-Warning', result.warning.message);
    }

    next();
  } catch (error) {
    console.error('License enforcement error:', error);
    // Don't block on errors - just log and continue
    next();
  }
}

/**
 * Check if tenant has a valid license
 */
async function checkTenantLicense(tenantId: string): Promise<LicenseCheckResult> {
  const license = await prisma.tenantLicense.findUnique({
    where: { tenantId },
    include: {
      licensePlan: true,
    },
  });

  // No license - allow with default limits (free tier)
  if (!license) {
    return {
      valid: true,
      limits: {
        maxUsers: 5,
        maxVoters: 1000,
        maxElections: 1,
        maxConstituencies: 1,
        maxStorageMB: 500,
        maxApiPerDay: 1000,
        maxApiPerHour: 100,
      },
    };
  }

  const plan = license.licensePlan;

  // Check license status
  if (!['ACTIVE', 'TRIAL'].includes(license.status)) {
    const statusMessages: Record<string, string> = {
      'SUSPENDED': 'Your license has been suspended. Please contact support.',
      'EXPIRED': 'Your license has expired. Please renew to continue.',
      'CANCELLED': 'Your license has been cancelled.',
      'PENDING_PAYMENT': 'Your payment is pending. Please complete payment to continue.',
    };

    return {
      valid: false,
      message: statusMessages[license.status] || 'License is not active',
      license,
    };
  }

  // Check expiry
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    // Update license status to expired
    await prisma.tenantLicense.update({
      where: { id: license.id },
      data: { status: 'EXPIRED' },
    });

    // Check grace period
    const gracePeriodDays = plan.gracePeriodDays || 7;
    const graceEndDate = new Date(license.expiresAt);
    graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

    if (new Date() < graceEndDate) {
      return {
        valid: true,
        license,
        limits: getEffectiveLimits(license, plan),
        warning: {
          type: 'expiry',
          message: `License expired. You are in grace period until ${graceEndDate.toISOString().split('T')[0]}`,
        },
      };
    }

    return {
      valid: false,
      message: 'Your license has expired and grace period has ended. Please renew.',
      license,
    };
  }

  // Check trial expiry
  if (license.status === 'TRIAL' && license.trialEndsAt && new Date(license.trialEndsAt) < new Date()) {
    return {
      valid: false,
      message: 'Your trial period has ended. Please upgrade to continue.',
      license,
    };
  }

  // License is valid
  const limits = getEffectiveLimits(license, plan);

  // Check if approaching any limits and add warnings
  const warning = await checkLimitWarnings(tenantId, license, limits);

  return {
    valid: true,
    license,
    limits,
    warning,
  };
}

/**
 * Get effective limits considering custom overrides
 */
function getEffectiveLimits(license: any, plan: any) {
  return {
    maxUsers: license.customMaxUsers ?? plan.maxUsers,
    maxVoters: license.customMaxVoters ?? plan.maxVoters,
    maxElections: license.customMaxElections ?? plan.maxElections,
    maxConstituencies: license.customMaxConstituencies ?? plan.maxConstituencies,
    maxStorageMB: license.customMaxStorageMB ?? plan.maxStorageMB,
    maxApiPerDay: license.customMaxApiPerDay ?? plan.maxApiRequestsPerDay,
    maxApiPerHour: license.customMaxApiPerHour ?? plan.maxApiRequestsPerHour,
  };
}

/**
 * Check if tenant is approaching any limits
 */
async function checkLimitWarnings(
  tenantId: string,
  license: any,
  limits: any
): Promise<{ type: string; message: string } | undefined> {
  // Check user count
  const userCount = await prisma.user.count({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'PENDING'] },
    },
  });

  const userPercent = (userCount / limits.maxUsers) * 100;
  if (userPercent >= 90) {
    return {
      type: 'users',
      message: `User limit at ${userPercent.toFixed(0)}% (${userCount}/${limits.maxUsers})`,
    };
  }

  // Check if license is expiring soon (within 7 days)
  if (license.expiresAt) {
    const daysUntilExpiry = Math.ceil(
      (new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      return {
        type: 'expiry',
        message: `License expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
      };
    }
  }

  // Check trial ending soon
  if (license.status === 'TRIAL' && license.trialEndsAt) {
    const daysUntilTrialEnd = Math.ceil(
      (new Date(license.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilTrialEnd <= 3 && daysUntilTrialEnd > 0) {
      return {
        type: 'trial',
        message: `Trial ends in ${daysUntilTrialEnd} day${daysUntilTrialEnd !== 1 ? 's' : ''}`,
      };
    }
  }

  return undefined;
}

/**
 * API Rate Limiting Middleware based on license
 */
export async function apiRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return next();
    }

    const license = await prisma.tenantLicense.findUnique({
      where: { tenantId },
      include: { licensePlan: true },
    });

    if (!license || !license.enforceApiLimit) {
      return next();
    }

    const plan = license.licensePlan;
    const maxPerHour = license.customMaxApiPerHour ?? plan.maxApiRequestsPerHour;
    const maxPerDay = license.customMaxApiPerDay ?? plan.maxApiRequestsPerDay;

    // Get current hour and day metrics
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const currentHour = now.getHours();

    // Get today's metrics
    const todayMetrics = await prisma.tenantUsageMetrics.findFirst({
      where: {
        tenantLicenseId: license.id,
        metricDate: today,
        metricHour: null,
      },
    });

    // Get current hour metrics
    const hourMetrics = await prisma.tenantUsageMetrics.findFirst({
      where: {
        tenantLicenseId: license.id,
        metricDate: today,
        metricHour: currentHour,
      },
    });

    const dailyCount = todayMetrics?.apiRequestCount || 0;
    const hourlyCount = hourMetrics?.apiRequestCount || 0;

    // Check limits
    if (dailyCount >= maxPerDay) {
      if (license.softLimitMode) {
        res.setHeader('X-RateLimit-Warning', 'Daily API limit exceeded');
      } else {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Daily API request limit exceeded. Please try again tomorrow.',
            limit: maxPerDay,
            current: dailyCount,
          },
        });
      }
    }

    if (hourlyCount >= maxPerHour) {
      if (license.softLimitMode) {
        res.setHeader('X-RateLimit-Warning', 'Hourly API limit exceeded');
      } else {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Hourly API request limit exceeded. Please try again later.',
            limit: maxPerHour,
            current: hourlyCount,
          },
        });
      }
    }

    // Increment counters
    await incrementApiCounters(license.id, today, currentHour);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit-Day', maxPerDay);
    res.setHeader('X-RateLimit-Remaining-Day', Math.max(0, maxPerDay - dailyCount - 1));
    res.setHeader('X-RateLimit-Limit-Hour', maxPerHour);
    res.setHeader('X-RateLimit-Remaining-Hour', Math.max(0, maxPerHour - hourlyCount - 1));

    next();
  } catch (error) {
    console.error('API rate limit error:', error);
    // Don't block on errors
    next();
  }
}

/**
 * Increment API request counters
 */
async function incrementApiCounters(
  tenantLicenseId: string,
  today: Date,
  currentHour: number
) {
  try {
    // Update daily metrics
    await prisma.tenantUsageMetrics.upsert({
      where: {
        tenantLicenseId_metricDate_metricHour: {
          tenantLicenseId,
          metricDate: today,
          metricHour: null as any,
        },
      },
      update: {
        apiRequestCount: { increment: 1 },
      },
      create: {
        tenantLicenseId,
        metricDate: today,
        metricHour: null,
        apiRequestCount: 1,
      },
    });

    // Update hourly metrics
    await prisma.tenantUsageMetrics.upsert({
      where: {
        tenantLicenseId_metricDate_metricHour: {
          tenantLicenseId,
          metricDate: today,
          metricHour: currentHour,
        },
      },
      update: {
        apiRequestCount: { increment: 1 },
      },
      create: {
        tenantLicenseId,
        metricDate: today,
        metricHour: currentHour,
        apiRequestCount: 1,
      },
    });
  } catch (error) {
    // Ignore counter errors - don't block requests
    console.error('Failed to increment API counters:', error);
  }
}

/**
 * User Limit Check - Call before creating new users
 */
export async function checkUserLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  message?: string;
}> {
  const license = await prisma.tenantLicense.findUnique({
    where: { tenantId },
    include: { licensePlan: true },
  });

  let maxUsers = 5; // Default free tier

  if (license && license.enforceUserLimit) {
    maxUsers = license.customMaxUsers ?? license.licensePlan.maxUsers;
  } else if (license) {
    maxUsers = license.customMaxUsers ?? license.licensePlan.maxUsers;
  }

  const currentUsers = await prisma.user.count({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'PENDING'] },
    },
  });

  if (currentUsers >= maxUsers) {
    // Check if soft limit mode
    if (license?.softLimitMode) {
      return {
        allowed: true,
        current: currentUsers,
        max: maxUsers,
        message: `User limit exceeded (${currentUsers}/${maxUsers}). Running in soft limit mode.`,
      };
    }

    return {
      allowed: false,
      current: currentUsers,
      max: maxUsers,
      message: `User limit reached (${currentUsers}/${maxUsers}). Please upgrade your plan.`,
    };
  }

  return {
    allowed: true,
    current: currentUsers,
    max: maxUsers,
  };
}

/**
 * Data Processing Limit Check
 */
export async function checkDataProcessingLimit(
  tenantId: string,
  dataSizeMB: number
): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  message?: string;
}> {
  const license = await prisma.tenantLicense.findUnique({
    where: { tenantId },
    include: { licensePlan: true },
  });

  if (!license || !license.enforceDataLimit) {
    return { allowed: true, current: 0, max: Infinity };
  }

  const maxDataGB = license.customMaxDataGB ?? license.licensePlan.maxDataProcessingGB;
  const maxDataMB = maxDataGB * 1024;

  // Get current month's data processing
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyMetrics = await prisma.tenantUsageMetrics.aggregate({
    where: {
      tenantLicenseId: license.id,
      metricDate: { gte: startOfMonth },
      metricHour: null,
    },
    _sum: {
      dataProcessedMB: true,
    },
  });

  const currentDataMB = monthlyMetrics._sum.dataProcessedMB || 0;
  const projectedUsage = currentDataMB + dataSizeMB;

  if (projectedUsage > maxDataMB) {
    if (license.softLimitMode) {
      return {
        allowed: true,
        current: currentDataMB,
        max: maxDataMB,
        message: `Data processing limit would be exceeded. Running in soft limit mode.`,
      };
    }

    return {
      allowed: false,
      current: currentDataMB,
      max: maxDataMB,
      message: `Data processing limit would be exceeded (${currentDataMB.toFixed(0)}MB + ${dataSizeMB}MB > ${maxDataMB}MB).`,
    };
  }

  return {
    allowed: true,
    current: currentDataMB,
    max: maxDataMB,
  };
}
