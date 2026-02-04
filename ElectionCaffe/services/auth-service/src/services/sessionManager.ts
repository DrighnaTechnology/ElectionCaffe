import { PrismaClient, LicenseStatus } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface SessionInfo {
  sessionToken: string;
  deviceId?: string;
  deviceType?: string;
  deviceName?: string;
  browserInfo?: string;
  osInfo?: string;
  ipAddress?: string;
}

export interface LicenseLimits {
  maxConcurrentSessions: number;
  maxSessionsPerUser: number;
  sessionTimeoutMinutes: number;
  enforceSessionLimit: boolean;
  softLimitMode: boolean;
}

export interface SessionCheckResult {
  allowed: boolean;
  message?: string;
  sessionToken?: string;
  terminatedSessionIds?: string[];
  currentSessionCount?: number;
  maxSessions?: number;
  warning?: boolean;
}

export class SessionManager {
  /**
   * Get tenant license and limits
   */
  async getTenantLicense(tenantId: string) {
    const license = await prisma.tenantLicense.findUnique({
      where: { tenantId },
      include: {
        licensePlan: true,
      },
    });

    return license;
  }

  /**
   * Get effective session limits for a tenant
   */
  async getEffectiveLimits(tenantId: string): Promise<LicenseLimits | null> {
    const license = await this.getTenantLicense(tenantId);

    if (!license) {
      // No license - use default free limits
      return {
        maxConcurrentSessions: 3,
        maxSessionsPerUser: 1,
        sessionTimeoutMinutes: 30,
        enforceSessionLimit: true,
        softLimitMode: false,
      };
    }

    // Check if license is active
    if (!['ACTIVE', 'TRIAL'].includes(license.status)) {
      return null; // License not active
    }

    // Check if license is expired
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return null;
    }

    // Check trial expiry
    if (license.status === 'TRIAL' && license.trialEndsAt && new Date(license.trialEndsAt) < new Date()) {
      return null;
    }

    const plan = license.licensePlan;

    return {
      maxConcurrentSessions: license.customMaxSessions ?? plan.maxConcurrentSessions,
      maxSessionsPerUser: license.customMaxSessionsPerUser ?? plan.maxSessionsPerUser,
      sessionTimeoutMinutes: plan.sessionTimeoutMinutes,
      enforceSessionLimit: license.enforceSessionLimit,
      softLimitMode: license.softLimitMode,
    };
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    tenantId: string,
    userId: string,
    sessionInfo: Partial<SessionInfo>
  ): Promise<SessionCheckResult> {
    const limits = await this.getEffectiveLimits(tenantId);

    if (!limits) {
      return {
        allowed: false,
        message: 'License is not active or has expired. Please contact your administrator.',
      };
    }

    // Get the tenant's license
    const license = await this.getTenantLicense(tenantId);
    if (!license) {
      // No license - still allow but with basic session
      return this.createBasicSession(userId, sessionInfo);
    }

    // Clean up expired sessions first
    await this.cleanupExpiredSessions(license.id);

    // Count current active sessions for the tenant
    const tenantSessionCount = await prisma.tenantSession.count({
      where: {
        tenantLicenseId: license.id,
        isActive: true,
      },
    });

    // Count current active sessions for this specific user
    const userSessionCount = await prisma.tenantSession.count({
      where: {
        tenantLicenseId: license.id,
        userId,
        isActive: true,
      },
    });

    const terminatedSessionIds: string[] = [];

    // Check tenant-wide session limit
    if (limits.enforceSessionLimit && tenantSessionCount >= limits.maxConcurrentSessions) {
      if (limits.softLimitMode) {
        // Soft limit - just warn
        return {
          allowed: true,
          warning: true,
          message: `Organization session limit reached (${tenantSessionCount}/${limits.maxConcurrentSessions}). Performance may be affected.`,
          sessionToken: await this.doCreateSession(license.id, userId, sessionInfo, limits.sessionTimeoutMinutes),
          currentSessionCount: tenantSessionCount + 1,
          maxSessions: limits.maxConcurrentSessions,
        };
      } else {
        // Hard limit - need to terminate oldest sessions or deny
        // For now, terminate oldest session
        const oldestSession = await prisma.tenantSession.findFirst({
          where: {
            tenantLicenseId: license.id,
            isActive: true,
          },
          orderBy: { lastActivityAt: 'asc' },
        });

        if (oldestSession) {
          await prisma.tenantSession.update({
            where: { id: oldestSession.id },
            data: {
              isActive: false,
              terminatedAt: new Date(),
              terminationReason: 'session_limit_exceeded',
            },
          });
          terminatedSessionIds.push(oldestSession.id);
        }
      }
    }

    // Check per-user session limit
    if (limits.enforceSessionLimit && userSessionCount >= limits.maxSessionsPerUser) {
      // Terminate oldest session for this user
      const oldestUserSession = await prisma.tenantSession.findFirst({
        where: {
          tenantLicenseId: license.id,
          userId,
          isActive: true,
        },
        orderBy: { lastActivityAt: 'asc' },
      });

      if (oldestUserSession) {
        await prisma.tenantSession.update({
          where: { id: oldestUserSession.id },
          data: {
            isActive: false,
            terminatedAt: new Date(),
            terminationReason: 'user_session_limit_exceeded',
          },
        });
        terminatedSessionIds.push(oldestUserSession.id);
      }
    }

    // Create new session
    const sessionToken = await this.doCreateSession(
      license.id,
      userId,
      sessionInfo,
      limits.sessionTimeoutMinutes
    );

    // Update usage metrics
    await this.updateUsageMetrics(license.id, tenantSessionCount + 1);

    return {
      allowed: true,
      sessionToken,
      terminatedSessionIds: terminatedSessionIds.length > 0 ? terminatedSessionIds : undefined,
      currentSessionCount: tenantSessionCount + 1 - terminatedSessionIds.length,
      maxSessions: limits.maxConcurrentSessions,
    };
  }

  /**
   * Create a basic session (no license tracking)
   */
  private async createBasicSession(
    userId: string,
    sessionInfo: Partial<SessionInfo>
  ): Promise<SessionCheckResult> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    return {
      allowed: true,
      sessionToken,
    };
  }

  /**
   * Actually create the session in database
   */
  private async doCreateSession(
    tenantLicenseId: string,
    userId: string,
    sessionInfo: Partial<SessionInfo>,
    timeoutMinutes: number
  ): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    await prisma.tenantSession.create({
      data: {
        tenantLicenseId,
        userId,
        sessionToken,
        deviceId: sessionInfo.deviceId,
        deviceType: sessionInfo.deviceType,
        deviceName: sessionInfo.deviceName,
        browserInfo: sessionInfo.browserInfo,
        osInfo: sessionInfo.osInfo,
        ipAddress: sessionInfo.ipAddress,
        expiresAt,
        isActive: true,
        lastActivityAt: new Date(),
      },
    });

    return sessionToken;
  }

  /**
   * Validate and refresh a session
   */
  async validateSession(sessionToken: string): Promise<{
    valid: boolean;
    userId?: string;
    tenantId?: string;
    message?: string;
  }> {
    const session = await prisma.tenantSession.findUnique({
      where: { sessionToken },
      include: {
        tenantLicense: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!session) {
      return { valid: false, message: 'Session not found' };
    }

    if (!session.isActive) {
      return { valid: false, message: 'Session has been terminated' };
    }

    if (new Date(session.expiresAt) < new Date()) {
      // Expire the session
      await prisma.tenantSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: 'expired',
        },
      });
      return { valid: false, message: 'Session has expired' };
    }

    // Refresh last activity
    await prisma.tenantSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
        requestCount: { increment: 1 },
      },
    });

    return {
      valid: true,
      userId: session.userId,
      tenantId: session.tenantLicense.tenantId,
    };
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionToken: string, reason: string = 'logged_out'): Promise<boolean> {
    try {
      await prisma.tenantSession.update({
        where: { sessionToken },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: reason,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateUserSessions(
    tenantId: string,
    userId: string,
    reason: string = 'logout_all'
  ): Promise<number> {
    const license = await this.getTenantLicense(tenantId);
    if (!license) return 0;

    const result = await prisma.tenantSession.updateMany({
      where: {
        tenantLicenseId: license.id,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason,
      },
    });

    return result.count;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(tenantLicenseId: string): Promise<number> {
    const result = await prisma.tenantSession.updateMany({
      where: {
        tenantLicenseId,
        isActive: true,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'expired',
      },
    });

    return result.count;
  }

  /**
   * Get active sessions for a tenant
   */
  async getTenantSessions(tenantId: string) {
    const license = await this.getTenantLicense(tenantId);
    if (!license) return [];

    return prisma.tenantSession.findMany({
      where: {
        tenantLicenseId: license.id,
        isActive: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(tenantId: string, userId: string) {
    const license = await this.getTenantLicense(tenantId);
    if (!license) return [];

    return prisma.tenantSession.findMany({
      where: {
        tenantLicenseId: license.id,
        userId,
        isActive: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /**
   * Update usage metrics
   */
  private async updateUsageMetrics(tenantLicenseId: string, currentSessionCount: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Try to update existing metrics or create new one
      const existing = await prisma.tenantUsageMetrics.findFirst({
        where: {
          tenantLicenseId,
          metricDate: today,
          metricHour: null,
        },
      });

      if (existing) {
        await prisma.tenantUsageMetrics.update({
          where: { id: existing.id },
          data: {
            peakConcurrentSessions: Math.max(existing.peakConcurrentSessions, currentSessionCount),
            totalSessions: { increment: 1 },
          },
        });
      } else {
        await prisma.tenantUsageMetrics.create({
          data: {
            tenantLicenseId,
            metricDate: today,
            peakConcurrentSessions: currentSessionCount,
            totalSessions: 1,
          },
        });
      }
    } catch (error) {
      // Ignore metrics errors - don't block session creation
      console.error('Failed to update usage metrics:', error);
    }
  }

  /**
   * Check and create usage alert if needed
   */
  async checkUsageAlerts(tenantId: string) {
    const license = await this.getTenantLicense(tenantId);
    if (!license) return;

    const limits = await this.getEffectiveLimits(tenantId);
    if (!limits) return;

    // Count active sessions
    const sessionCount = await prisma.tenantSession.count({
      where: {
        tenantLicenseId: license.id,
        isActive: true,
      },
    });

    const usagePercent = (sessionCount / limits.maxConcurrentSessions) * 100;

    // Determine alert level
    let alertLevel: 'INFO' | 'WARNING' | 'CRITICAL' | 'EXCEEDED' | null = null;
    if (usagePercent >= 100) {
      alertLevel = 'EXCEEDED';
    } else if (usagePercent >= 90) {
      alertLevel = 'CRITICAL';
    } else if (usagePercent >= 75) {
      alertLevel = 'WARNING';
    } else if (usagePercent >= 50) {
      alertLevel = 'INFO';
    }

    if (alertLevel) {
      // Check if we already have an unresolved alert of this type and level
      const existingAlert = await prisma.usageAlert.findFirst({
        where: {
          tenantLicenseId: license.id,
          alertType: 'sessions',
          alertLevel,
          isResolved: false,
        },
      });

      if (!existingAlert) {
        await prisma.usageAlert.create({
          data: {
            tenantLicenseId: license.id,
            alertType: 'sessions',
            alertLevel,
            message: `Session usage at ${usagePercent.toFixed(1)}% (${sessionCount}/${limits.maxConcurrentSessions})`,
            currentValue: sessionCount,
            limitValue: limits.maxConcurrentSessions,
            usagePercent,
          },
        });
      }
    }
  }
}

export const sessionManager = new SessionManager();
