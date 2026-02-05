import { Request, Response, NextFunction } from 'express';
import { prisma } from '@electioncaffe/database';

/**
 * Middleware to check if a feature is enabled for the tenant
 * Use this to protect routes that should only be accessible when a feature is enabled
 */
export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this feature',
      });
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
        return res.status(403).json({
          error: 'Feature not enabled',
          message: `The ${featureKey.replace('_', ' ')} feature is not enabled for your organization. Please contact your administrator.`,
          featureKey,
        });
      }

      // Attach feature info to request for later use if needed
      (req as any).enabledFeature = tenantFeature.feature;

      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify feature access',
      });
    }
  };
};

/**
 * Middleware to check if user's role has access to a specific feature
 * Use this for role-based feature access control
 */
export const requireRoleFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    const tenantId = req.user?.tenantId;

    if (!role || !tenantId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this feature',
      });
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
        return res.status(403).json({
          error: 'Feature not enabled',
          message: `The ${featureKey.replace('_', ' ')} feature is not enabled for your organization.`,
          featureKey,
        });
      }

      // Then check if user's role has access to this feature
      const roleFeature = await prisma.organizationRoleFeature.findFirst({
        where: {
          tenantId,
          role,
          feature: { featureKey },
          isEnabled: true,
        },
      });

      if (!roleFeature) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Your role (${role}) does not have access to the ${featureKey.replace('_', ' ')} feature.`,
          featureKey,
        });
      }

      next();
    } catch (error) {
      console.error('Error checking role feature access:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify feature access',
      });
    }
  };
};
