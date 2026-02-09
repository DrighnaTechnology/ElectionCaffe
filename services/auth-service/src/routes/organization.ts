import { Router, Request, Response } from 'express';
import { prisma, UserRole } from '@electioncaffe/database';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// Available features that can be controlled via organization setup
const AVAILABLE_FEATURES = [
  { key: 'dashboard', label: 'Dashboard', category: 'Core' },
  { key: 'elections', label: 'Elections', category: 'Core' },
  { key: 'master-data', label: 'Master Data', category: 'Core' },
  { key: 'voters', label: 'Voters', category: 'Core' },
  { key: 'parts', label: 'Parts/Booths', category: 'Core' },
  { key: 'sections', label: 'Sections', category: 'Core' },
  { key: 'cadres', label: 'Cadres', category: 'Field' },
  { key: 'families', label: 'Families', category: 'Field' },
  { key: 'surveys', label: 'Surveys', category: 'Campaign' },
  { key: 'campaigns', label: 'Campaigns', category: 'Campaign' },
  { key: 'poll-day', label: 'Poll Day', category: 'Operations' },
  { key: 'analytics', label: 'Analytics', category: 'Analytics' },
  { key: 'ai-analytics', label: 'AI Analytics', category: 'Analytics' },
  { key: 'ai-tools', label: 'AI Tools', category: 'Analytics' },
  { key: 'reports', label: 'Reports', category: 'Analytics' },
  { key: 'datacaffe', label: 'DataCaffe', category: 'Analytics' },
  { key: 'settings', label: 'Settings', category: 'Admin' },
];

// Available roles that can be configured (exclude super admin roles)
const CONFIGURABLE_ROLES: UserRole[] = [
  'TENANT_ADMIN',
  'CENTRAL_ADMIN',
  'CENTRAL_CAMPAIGN_TEAM',
  'CONSTITUENCY_ADMIN',
  'CAMPAIGN_MANAGER',
  'COORDINATOR',
  'SECTOR_OFFICER',
  'BOOTH_INCHARGE',
  'VOLUNTEER',
  'AGENT',
  'POLLING_AGENT',
  'COUNTING_AGENT',
  'CANDIDATE',
  'CANDIDATE_ADMIN',
  'EMC_ADMIN',
  'EMC_MANAGER',
  'EMC_OPERATOR',
];

// Get available features list
router.get('/features', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(successResponse({
      features: AVAILABLE_FEATURES,
      roles: CONFIGURABLE_ROLES,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get features error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get role-feature access matrix for the tenant
router.get('/role-features', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow admin roles
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can manage organization settings.'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Get all role-feature access records for this tenant
    const roleFeatureAccess = await prisma.roleFeatureAccess.findMany({
      where: { tenantId: user.tenant.id },
    });

    // Build a matrix of role -> feature -> isEnabled
    const matrix: Record<string, Record<string, boolean>> = {};

    // Initialize with defaults (all enabled)
    for (const role of CONFIGURABLE_ROLES) {
      matrix[role] = {};
      for (const feature of AVAILABLE_FEATURES) {
        matrix[role][feature.key] = true; // Default: all features enabled
      }
    }

    // Apply saved configurations
    for (const access of roleFeatureAccess) {
      if (matrix[access.role]) {
        matrix[access.role]![access.featureKey] = access.isEnabled;
      }
    }

    res.json(successResponse({
      tenantId: user.tenant.id,
      matrix,
      features: AVAILABLE_FEATURES,
      roles: CONFIGURABLE_ROLES,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get role features error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update role-feature access
router.put('/role-features', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow admin roles
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can manage organization settings.'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { role, featureKey, isEnabled } = req.body;

    if (!role || !featureKey || typeof isEnabled !== 'boolean') {
      res.status(400).json(errorResponse('E2001', 'role, featureKey, and isEnabled are required'));
      return;
    }

    // Validate role
    if (!CONFIGURABLE_ROLES.includes(role as UserRole)) {
      res.status(400).json(errorResponse('E2002', 'Invalid role'));
      return;
    }

    // Validate feature
    if (!AVAILABLE_FEATURES.find(f => f.key === featureKey)) {
      res.status(400).json(errorResponse('E2003', 'Invalid feature key'));
      return;
    }

    // Upsert the role-feature access
    const access = await prisma.roleFeatureAccess.upsert({
      where: {
        tenantId_role_featureKey: {
          tenantId: user.tenant.id,
          role: role as UserRole,
          featureKey,
        },
      },
      create: {
        tenantId: user.tenant.id,
        role: role as UserRole,
        featureKey,
        isEnabled,
        createdBy: userId,
      },
      update: {
        isEnabled,
      },
    });

    res.json(successResponse({
      message: 'Role feature access updated successfully',
      access,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Update role features error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Bulk update role-feature access
router.put('/role-features/bulk', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow admin roles
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can manage organization settings.'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      res.status(400).json(errorResponse('E2001', 'updates must be an array'));
      return;
    }

    // Process all updates in a transaction
    const results = await prisma.$transaction(
      updates.map((update: { role: UserRole; featureKey: string; isEnabled: boolean }) =>
        prisma.roleFeatureAccess.upsert({
          where: {
            tenantId_role_featureKey: {
              tenantId: user.tenant!.id,
              role: update.role,
              featureKey: update.featureKey,
            },
          },
          create: {
            tenantId: user.tenant!.id,
            role: update.role,
            featureKey: update.featureKey,
            isEnabled: update.isEnabled,
            createdBy: userId,
          },
          update: {
            isEnabled: update.isEnabled,
          },
        })
      )
    );

    res.json(successResponse({
      message: 'Role feature access updated successfully',
      updatedCount: results.length,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Bulk update role features error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get users with their roles (for user management tab)
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow admin roles
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can manage users.'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { search, role, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      tenantId: user.tenant.id,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { mobile: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          role: true,
          status: true,
          profilePhotoUrl: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json(successResponse({
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get users error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update user role
router.put('/users/:userId/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { userId: targetUserId } = req.params;

    // Only allow admin roles
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can update user roles.'));
      return;
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      include: { tenant: true },
    });

    if (!adminUser || !adminUser.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { role } = req.body;

    if (!role || !CONFIGURABLE_ROLES.includes(role as UserRole)) {
      res.status(400).json(errorResponse('E2001', 'Valid role is required'));
      return;
    }

    // Verify target user belongs to same tenant
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.tenantId !== adminUser.tenant.id) {
      res.status(404).json(errorResponse('E3002', 'User not found'));
      return;
    }

    // Prevent changing own role
    if (targetUserId === adminUserId) {
      res.status(400).json(errorResponse('E4003', 'Cannot change your own role'));
      return;
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: role as UserRole },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
      },
    });

    res.json(successResponse({
      message: 'User role updated successfully',
      user: updatedUser,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Update user role error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get feature access for current user (used by frontend to filter navigation)
router.get('/my-features', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Get tenant-level feature enablement
    const tenantFeatures = await prisma.tenantFeature.findMany({
      where: {
        tenantId: user.tenant.id,
        isEnabled: true,
      },
      include: {
        feature: true,
      },
    });

    // Get role-feature access for this user's role
    const roleFeatureAccess = await prisma.roleFeatureAccess.findMany({
      where: {
        tenantId: user.tenant.id,
        role: userRole as UserRole,
      },
    });

    // Build features array with both tenant and role-level checks
    const featuresArray = tenantFeatures.map(tf => ({
      id: tf.feature.id,
      featureKey: tf.feature.featureKey,
      featureName: tf.feature.featureName,
      category: tf.feature.category,
      description: tf.feature.description,
      isEnabled: tf.isEnabled,
    }));

    // Also include legacy features from AVAILABLE_FEATURES for backward compatibility
    const enabledFeatures: Record<string, boolean> = {};
    for (const feature of AVAILABLE_FEATURES) {
      const tenantFeature = tenantFeatures.find(tf => tf.feature.featureKey === feature.key);
      const access = roleFeatureAccess.find(a => a.featureKey === feature.key);

      // Feature is enabled if:
      // 1. It exists in tenantFeatures with isEnabled=true, OR
      // 2. It's in AVAILABLE_FEATURES and role has access (default true)
      enabledFeatures[feature.key] = tenantFeature ? tenantFeature.isEnabled : (access ? access.isEnabled : true);
    }

    res.json(successResponse({
      role: userRole,
      features: featuresArray, // New format: array of feature objects
      enabledFeatures, // Legacy format: map of feature keys to boolean
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get my features error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as organizationRoutes };
