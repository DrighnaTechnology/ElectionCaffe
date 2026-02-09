import { Request, Response, NextFunction } from 'express';
import { prisma } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');

/**
 * Middleware to check if a feature is enabled for the tenant
 * Use this to protect routes that should only be accessible when a feature is enabled
 */
export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = (req as any).user?.tenantId;

    if (!tenantId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this feature',
      });
      return;
    }

    try {
      // Check if feature is enabled for this tenant
      const tenantFeature = await prisma.tenantFeature.findFirst({
        where: {
          tenantId,
          feature: {
            featureKey,
          },
          isEnabled: true,
        },
        include: {
          feature: true,
        },
      });

      if (!tenantFeature) {
        res.status(403).json({
          error: 'Feature not enabled',
          message: `The ${featureKey.replace('_', ' ')} feature is not enabled for your organization. Please contact your administrator.`,
          featureKey,
        });
        return;
      }

      // Attach feature info to request for later use if needed
      (req as any).enabledFeature = tenantFeature.feature;

      next();
    } catch (error) {
      logger.error({ err: error }, 'Error checking feature access');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify feature access',
      });
      return;
    }
  };
};

/**
 * Middleware to check if user's role has access to a specific feature
 * Use this for role-based feature access control
 */
export const requireRoleFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const role = (req as any).user?.role;
    const tenantId = (req as any).user?.tenantId;

    if (!role || !tenantId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this feature',
      });
      return;
    }

    try {
      // First check if feature is enabled for tenant
      const tenantFeature = await prisma.tenantFeature.findFirst({
        where: {
          tenantId,
          feature: { featureKey },
          isEnabled: true,
        },
        include: { feature: true },
      });

      if (!tenantFeature) {
        res.status(403).json({
          error: 'Feature not enabled',
          message: `The ${featureKey.replace('_', ' ')} feature is not enabled for your organization.`,
          featureKey,
        });
        return;
      }

      // Then check if user's role has access to this feature
      const roleFeature = await (prisma as any).organizationRoleFeature.findFirst({
        where: {
          tenantId,
          role,
          feature: { featureKey },
          isEnabled: true,
        },
      });

      if (!roleFeature) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `Your role (${role}) does not have access to the ${featureKey.replace('_', ' ')} feature.`,
          featureKey,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ err: error }, 'Error checking role feature access');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify feature access',
      });
      return;
    }
  };
};
