import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getTenantDb, coreDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createLogger, buildTenantUrl } from '@electioncaffe/shared';

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
  { key: 'candidates', label: 'Candidates', category: 'Field' },
  { key: 'surveys', label: 'Surveys', category: 'Campaign' },
  { key: 'campaigns', label: 'Campaigns', category: 'Campaign' },
  { key: 'poll-day', label: 'Poll Day', category: 'Operations' },
  { key: 'funds', label: 'Funds', category: 'Operations' },
  { key: 'analytics', label: 'Analytics', category: 'Analytics' },
  { key: 'ai-analytics', label: 'AI Analytics', category: 'Analytics' },
  { key: 'ai-tools', label: 'AI Tools', category: 'Analytics' },
  { key: 'reports', label: 'Reports', category: 'Analytics' },
  { key: 'datacaffe', label: 'DataCaffe', category: 'Analytics' },
  { key: 'ec-data', label: 'EC Data', category: 'Data' },
  { key: 'news', label: 'News & Info', category: 'Data' },
  { key: 'actions', label: 'Actions', category: 'Data' },
];

// Admin role check — only CENTRAL_ADMIN has admin access
const ADMIN_ROLE = 'CENTRAL_ADMIN';

// Get available features list
router.get('/features', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(successResponse({
      features: AVAILABLE_FEATURES,
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

    // Only allow CENTRAL_ADMIN
    if (userRole !== ADMIN_ROLE) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can manage organization settings.'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    // Auto-sync: find all distinct cadreType values and create CustomRole entries for any missing ones
    const tenantElections = await tenantDb.election.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });
    const electionIds = tenantElections.map((e: any) => e.id);

    const distinctCadreTypes: { cadreType: string }[] = electionIds.length > 0
      ? await tenantDb.cadre.groupBy({
          by: ['cadreType'],
          where: { electionId: { in: electionIds } },
        })
      : [];

    const existingSlugs = new Set(
      (await tenantDb.customRole.findMany({
        where: { tenantId: user.tenantId },
        select: { slug: true },
      })).map((r: any) => r.slug)
    );

    for (const { cadreType } of distinctCadreTypes) {
      const slug = cadreType.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (slug && !existingSlugs.has(slug) && !['SUPER_ADMIN', 'CENTRAL_ADMIN'].includes(slug)) {
        await tenantDb.customRole.create({
          data: {
            tenantId: user.tenantId,
            name: cadreType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            slug,
            description: `Auto-created from cadre role: ${cadreType}`,
          },
        });
        existingSlugs.add(slug);
      }
    }

    // Get all custom roles for this tenant (including newly auto-created ones)
    const customRoles = await tenantDb.customRole.findMany({
      where: { tenantId: user.tenantId },
      include: { featureAccess: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build a matrix of role -> feature -> isEnabled (only custom roles)
    const matrix: Record<string, Record<string, boolean>> = {};

    for (const cr of customRoles) {
      matrix[cr.slug] = {};
      for (const feature of AVAILABLE_FEATURES) {
        matrix[cr.slug][feature.key] = false; // Default: disabled
      }
      // Apply saved feature access
      for (const fa of cr.featureAccess) {
        matrix[cr.slug][fa.featureKey] = fa.isEnabled;
      }
    }

    const roles = customRoles.map(cr => cr.slug);

    const customRolesMeta = customRoles.map(cr => ({
      id: cr.id,
      slug: cr.slug,
      name: cr.name,
      description: cr.description,
      isCustom: true,
    }));

    res.json(successResponse({
      tenantId: user.tenantId,
      matrix,
      features: AVAILABLE_FEATURES,
      roles,
      customRoles: customRolesMeta,
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

    // Only allow CENTRAL_ADMIN
    if (userRole !== ADMIN_ROLE) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can manage organization settings.'));
      return;
    }

    // This endpoint is deprecated — use custom role feature updates instead
    res.status(400).json(errorResponse('E2001', 'System role feature updates are no longer supported. Use custom roles.'));
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

    // Only allow CENTRAL_ADMIN
    if (userRole !== ADMIN_ROLE) {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can manage organization settings.'));
      return;
    }

    // This endpoint is deprecated — use custom role feature updates instead
    res.status(400).json(errorResponse('E2001', 'System role feature updates are no longer supported. Use custom roles.'));
  } catch (error) {
    logger.error({ err: error }, 'Bulk update role features error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== Custom Roles CRUD ====================

// Get all custom roles for the tenant
router.get('/custom-roles', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== ADMIN_ROLE) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json(errorResponse('E3001', 'Tenant not found')); return; }

    const customRoles = await (await getTenantDb(req)).customRole.findMany({
      where: { tenantId: user.tenantId },
      include: { featureAccess: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json(successResponse({ customRoles }));
  } catch (error) {
    logger.error({ err: error }, 'Get custom roles error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create a custom role
router.post('/custom-roles', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== ADMIN_ROLE) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json(errorResponse('E3001', 'Tenant not found')); return; }

    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json(errorResponse('E2001', 'Role name is required'));
      return;
    }

    // Generate slug from name: "District Officer" → "DISTRICT_OFFICER"
    const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

    if (!slug) {
      res.status(400).json(errorResponse('E2002', 'Invalid role name'));
      return;
    }

    // Check if slug conflicts with system roles
    if (['SUPER_ADMIN', 'CENTRAL_ADMIN'].includes(slug)) {
      res.status(400).json(errorResponse('E2003', 'This role name conflicts with a system role'));
      return;
    }

    // Check uniqueness within tenant
    const existing = await (await getTenantDb(req)).customRole.findUnique({
      where: { tenantId_slug: { tenantId: user.tenantId, slug } },
    });

    if (existing) {
      res.status(400).json(errorResponse('E2004', 'A custom role with this name already exists'));
      return;
    }

    const customRole = await (await getTenantDb(req)).customRole.create({
      data: {
        tenantId: user.tenantId,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        createdBy: userId,
      },
    });

    res.json(successResponse({ customRole }));
  } catch (error) {
    logger.error({ err: error }, 'Create custom role error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete a custom role
router.delete('/custom-roles/:roleId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== ADMIN_ROLE) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json(errorResponse('E3001', 'Tenant not found')); return; }

    const { roleId } = req.params;

    const customRole = await (await getTenantDb(req)).customRole.findFirst({
      where: { id: roleId, tenantId: user.tenantId },
    });

    if (!customRole) {
      res.status(404).json(errorResponse('E3002', 'Custom role not found'));
      return;
    }

    // Cascade delete handles feature access rows
    await (await getTenantDb(req)).customRole.delete({ where: { id: roleId } });

    res.json(successResponse({ message: 'Custom role deleted' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete custom role error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Bulk update custom role feature access
router.put('/custom-roles/:roleId/features', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== ADMIN_ROLE) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json(errorResponse('E3001', 'Tenant not found')); return; }

    const { roleId } = req.params;
    const { updates } = req.body; // [{ featureKey, isEnabled }]

    if (!Array.isArray(updates)) {
      res.status(400).json(errorResponse('E2001', 'updates must be an array'));
      return;
    }

    const customRole = await (await getTenantDb(req)).customRole.findFirst({
      where: { id: roleId, tenantId: user.tenantId },
    });

    if (!customRole) {
      res.status(404).json(errorResponse('E3002', 'Custom role not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const results = await tenantDb.$transaction(
      updates.map((u: { featureKey: string; isEnabled: boolean }) =>
        tenantDb.customRoleFeatureAccess.upsert({
          where: {
            customRoleId_featureKey: {
              customRoleId: roleId,
              featureKey: u.featureKey,
            },
          },
          create: {
            tenantId: user.tenantId,
            customRoleId: roleId,
            featureKey: u.featureKey,
            isEnabled: u.isEnabled,
            createdBy: userId,
          },
          update: {
            isEnabled: u.isEnabled,
          },
        })
      )
    );

    res.json(successResponse({ updatedCount: results.length }));
  } catch (error) {
    logger.error({ err: error }, 'Update custom role features error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create user with temp password (admin only)
router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can create users.'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const adminUser = await tenantDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
      res.status(404).json(errorResponse('E3001', 'Admin user not found'));
      return;
    }

    const { firstName, lastName, email, mobile, customRoleId } = req.body;

    if (!firstName || !mobile) {
      res.status(400).json(errorResponse('E2001', 'First name and mobile number are required'));
      return;
    }

    // Check duplicate mobile within tenant
    const existing = await tenantDb.user.findFirst({
      where: { mobile, tenantId: adminUser.tenantId },
    });
    if (existing) {
      res.status(409).json(errorResponse('E3002', 'A user with this mobile number already exists'));
      return;
    }

    // Validate customRoleId if provided
    if (customRoleId) {
      const customRole = await tenantDb.customRole.findFirst({
        where: { id: customRoleId, tenantId: adminUser.tenantId },
      });
      if (!customRole) {
        res.status(400).json(errorResponse('E2001', 'Invalid custom role'));
        return;
      }
    }

    // Generate temp password that satisfies password validation (uppercase + lowercase + number)
    const randomPart = crypto.randomBytes(8).toString('base64url');
    const tempPassword = 'Ec' + randomPart + '1x';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const newUser = await tenantDb.user.create({
      data: {
        tenantId: adminUser.tenantId,
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        email: email?.trim() || null,
        mobile: mobile.trim(),
        passwordHash,
        role: 'CENTRAL_ADMIN',
        status: 'ACTIVE',
        isTempPassword: true,
        ...(customRoleId && { customRoleId }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        customRoleId: true,
        createdAt: true,
      },
    });

    // Get tenant slug for login URL
    const tenant = await coreDb.tenant.findUnique({ where: { id: adminUser.tenantId } });
    const tenantSlug = tenant?.slug || '';
    const loginUrl = `${buildTenantUrl(tenantSlug)}/login`;

    res.setHeader('Cache-Control', 'no-store, no-cache');
    res.status(201).json(successResponse({
      user: newUser,
      tempPassword,
      loginUrl,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Create user error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get users with their roles (for user management tab)
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow admin roles
    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can manage users.'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { search, role, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      tenantId: user.tenantId,
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
      if ((role as string).startsWith('customrole:')) {
        // Filter by custom role ID
        where.customRoleId = (role as string).replace('customrole:', '');
      } else if (role === 'FULL_ADMIN') {
        // Users without any custom role (full admin access)
        where.customRoleId = null;
      } else {
        where.role = role;
      }
    }

    const [users, total] = await Promise.all([
      (await getTenantDb(req)).user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          role: true,
          status: true,
          customRoleId: true,
          customRole: { select: { id: true, name: true, slug: true } },
          profilePhotoUrl: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      (await getTenantDb(req)).user.count({ where }),
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

// Get role distribution (aggregate counts, not paginated)
router.get('/role-distribution', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied.'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    // Group users by customRoleId
    const groupedByRole = await tenantDb.user.groupBy({
      by: ['customRoleId'],
      where: { tenantId: user.tenantId },
      _count: { id: true },
    });

    // Fetch custom role names for the IDs
    const roleIds = groupedByRole
      .map((g: any) => g.customRoleId)
      .filter((id: string | null) => id !== null) as string[];

    const customRoles = roleIds.length > 0
      ? await tenantDb.customRole.findMany({
          where: { id: { in: roleIds } },
          select: { id: true, name: true },
        })
      : [];

    const roleMap = new Map(customRoles.map((r: any) => [r.id, r.name]));

    const distribution = groupedByRole.map((g: any) => ({
      role: g.customRoleId ? (roleMap.get(g.customRoleId) || 'Unknown Role') : 'Full Admin',
      count: g._count.id,
    }));

    // Sort by count descending
    distribution.sort((a: any, b: any) => b.count - a.count);

    res.json(successResponse({ distribution }));
  } catch (error) {
    logger.error({ err: error }, 'Get role distribution error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single user detail
router.get('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { userId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const adminUser = await tenantDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
      res.status(404).json(errorResponse('E3001', 'Admin user not found'));
      return;
    }

    const targetUser = await tenantDb.user.findFirst({
      where: { id: userId, tenantId: adminUser.tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        customRoleId: true,
        customRole: { select: { id: true, name: true, slug: true } },
        profilePhotoUrl: true,
        isTempPassword: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        passwordChangedAt: true,
      },
    });

    if (!targetUser) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    // Build login URL
    const tenant = await coreDb.tenant.findUnique({ where: { id: adminUser.tenantId } });
    const tenantSlug = tenant?.slug || '';
    const loginUrl = `${buildTenantUrl(tenantSlug)}/login`;

    // Get feature access if user has a custom role
    let enabledFeatures: Record<string, boolean> = {};
    if (targetUser.customRoleId) {
      const featureAccess = await tenantDb.customRoleFeatureAccess.findMany({
        where: { customRoleId: targetUser.customRoleId },
      });
      for (const feat of AVAILABLE_FEATURES) {
        const access = featureAccess.find((fa: any) => fa.featureKey === feat.key);
        enabledFeatures[feat.key] = access?.isEnabled ?? false;
      }
    } else {
      // Full admin — all features enabled
      for (const feat of AVAILABLE_FEATURES) {
        enabledFeatures[feat.key] = true;
      }
    }

    res.json(successResponse({
      user: targetUser,
      loginUrl,
      tenantSlug,
      enabledFeatures,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get user detail error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Regenerate password for a user (admin action)
router.post('/users/:userId/regenerate-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { userId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const adminUser = await tenantDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
      res.status(404).json(errorResponse('E3001', 'Admin user not found'));
      return;
    }

    const targetUser = await tenantDb.user.findFirst({
      where: { id: userId, tenantId: adminUser.tenantId },
    });

    if (!targetUser) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    // Prevent regenerating own password via this endpoint
    if (userId === adminUserId) {
      res.status(400).json(errorResponse('E2001', 'Cannot regenerate your own password. Use the change password feature instead.'));
      return;
    }

    // Generate new temp password that satisfies password validation (uppercase + lowercase + number)
    const randomPart = crypto.randomBytes(8).toString('base64url');
    const tempPassword = 'Ec' + randomPart + '1x';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Update user password and mark as temp
    await tenantDb.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        isTempPassword: true,
        passwordChangedAt: new Date(),
      },
    });

    // Delete all refresh tokens for this user (invalidate all sessions)
    await tenantDb.refreshToken.deleteMany({
      where: { userId },
    });

    // Build login URL
    const tenant = await coreDb.tenant.findUnique({ where: { id: adminUser.tenantId } });
    const tenantSlug = tenant?.slug || '';
    const loginUrl = `${buildTenantUrl(tenantSlug)}/login`;

    res.setHeader('Cache-Control', 'no-store, no-cache');
    res.json(successResponse({
      tempPassword,
      loginUrl,
      message: 'Password regenerated. All existing sessions have been invalidated.',
    }));
  } catch (error) {
    logger.error({ err: error }, 'Regenerate password error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update user role (assign/change custom role)
router.put('/users/:userId/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { userId: targetUserId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can update user roles.'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const adminUser = await tenantDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
      res.status(404).json(errorResponse('E3001', 'Admin user not found'));
      return;
    }

    const { customRoleId } = req.body;

    // Verify target user belongs to same tenant
    const targetUser = await tenantDb.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser || targetUser.tenantId !== adminUser.tenantId) {
      res.status(404).json(errorResponse('E3002', 'User not found'));
      return;
    }

    // Prevent changing own role
    if (targetUserId === adminUserId) {
      res.status(400).json(errorResponse('E4003', 'Cannot change your own role'));
      return;
    }

    // Validate customRoleId if provided (null/undefined clears it)
    if (customRoleId) {
      const customRole = await tenantDb.customRole.findFirst({
        where: { id: customRoleId, tenantId: adminUser.tenantId },
      });
      if (!customRole) {
        res.status(400).json(errorResponse('E2001', 'Invalid custom role'));
        return;
      }
    }

    const updatedUser = await tenantDb.user.update({
      where: { id: targetUserId },
      data: { customRoleId: customRoleId || null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        customRoleId: true,
        customRole: { select: { id: true, name: true, slug: true } },
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

// Update user details (name, email, etc.)
router.put('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { userId: targetUserId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can edit users.'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const adminUser = await tenantDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
      res.status(404).json(errorResponse('E3001', 'Admin user not found'));
      return;
    }

    const targetUser = await tenantDb.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser || targetUser.tenantId !== adminUser.tenantId) {
      res.status(404).json(errorResponse('E3002', 'User not found'));
      return;
    }

    const { firstName, lastName, email, mobile, customRoleId } = req.body;

    // Check mobile uniqueness if being changed
    if (mobile && mobile !== targetUser.mobile) {
      const existing = await tenantDb.user.findFirst({
        where: { mobile, id: { not: targetUserId } },
      });
      if (existing) {
        res.status(409).json(errorResponse('E3002', 'A user with this mobile already exists'));
        return;
      }
    }

    // Validate customRoleId if provided
    if (customRoleId) {
      const customRole = await tenantDb.customRole.findFirst({
        where: { id: customRoleId, tenantId: adminUser.tenantId },
      });
      if (!customRole) {
        res.status(400).json(errorResponse('E2001', 'Invalid custom role'));
        return;
      }
    }

    const updatedUser = await tenantDb.user.update({
      where: { id: targetUserId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(mobile !== undefined && { mobile }),
        ...(customRoleId !== undefined && { customRoleId: customRoleId || null }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        role: true,
        customRoleId: true,
        customRole: { select: { id: true, name: true, slug: true } },
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    res.json(successResponse({ message: 'User updated successfully', user: updatedUser }));
  } catch (error) {
    logger.error({ err: error }, 'Update user error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update user status (ACTIVE, INACTIVE, BLOCKED)
router.put('/users/:userId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { userId: targetUserId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can change user status.'));
      return;
    }

    if (targetUserId === adminUserId) {
      res.status(400).json(errorResponse('E4004', 'Cannot change your own status'));
      return;
    }

    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(status)) {
      res.status(400).json(errorResponse('E2001', 'Invalid status. Must be ACTIVE, INACTIVE, or BLOCKED'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const adminUser = await tenantDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
      res.status(404).json(errorResponse('E3001', 'Admin user not found'));
      return;
    }

    const targetUser = await tenantDb.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser || targetUser.tenantId !== adminUser.tenantId) {
      res.status(404).json(errorResponse('E3002', 'User not found'));
      return;
    }

    const updatedUser = await tenantDb.user.update({
      where: { id: targetUserId },
      data: { status },
      select: { id: true, firstName: true, lastName: true, status: true },
    });

    // Invalidate refresh tokens if blocking/deactivating
    if (status === 'BLOCKED' || status === 'INACTIVE') {
      await tenantDb.refreshToken.deleteMany({ where: { userId: targetUserId } });
    }

    res.json(successResponse({ message: 'User status updated successfully', user: updatedUser }));
  } catch (error) {
    logger.error({ err: error }, 'Update user status error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete user
router.delete('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { userId: targetUserId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can delete users.'));
      return;
    }

    if (targetUserId === adminUserId) {
      res.status(400).json(errorResponse('E4004', 'Cannot delete your own account'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const adminUser = await tenantDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
      res.status(404).json(errorResponse('E3001', 'Admin user not found'));
      return;
    }

    const targetUser = await tenantDb.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser || targetUser.tenantId !== adminUser.tenantId) {
      res.status(404).json(errorResponse('E3002', 'User not found'));
      return;
    }

    // Delete refresh tokens first
    await tenantDb.refreshToken.deleteMany({ where: { userId: targetUserId } });
    // Delete user
    await tenantDb.user.delete({ where: { id: targetUserId } });

    res.json(successResponse({ message: 'User deleted successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete user error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Bulk delete users
router.post('/users/bulk-delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied. Only administrators can delete users.'));
      return;
    }

    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json(errorResponse('E2001', 'userIds must be a non-empty array'));
      return;
    }

    // Prevent self-deletion
    if (userIds.includes(adminUserId)) {
      res.status(400).json(errorResponse('E4004', 'Cannot delete your own account'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const adminUser = await tenantDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
      res.status(404).json(errorResponse('E3001', 'Admin user not found'));
      return;
    }

    // Verify all target users belong to the same tenant
    const targetUsers = await tenantDb.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, tenantId: true },
    });

    const validIds = targetUsers
      .filter((u: any) => u.tenantId === adminUser.tenantId)
      .map((u: any) => u.id);

    if (validIds.length === 0) {
      res.status(404).json(errorResponse('E3002', 'No valid users found to delete'));
      return;
    }

    // Delete refresh tokens first, then users
    await tenantDb.refreshToken.deleteMany({ where: { userId: { in: validIds } } });
    const result = await tenantDb.user.deleteMany({ where: { id: { in: validIds } } });

    res.json(successResponse({
      message: `${result.count} user(s) deleted successfully`,
      deletedCount: result.count,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Bulk delete users error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get feature access for current user (used by frontend to filter navigation)
router.get('/my-features', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    const tenantDb = await getTenantDb(req);
    const user = await tenantDb.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    // Build enabledFeatures map based on custom role or full admin access
    const enabledFeatures: Record<string, boolean> = {};

    if (user.customRoleId) {
      // User has a custom role — check CustomRoleFeatureAccess
      const customRoleAccess = await tenantDb.customRoleFeatureAccess.findMany({
        where: { customRoleId: user.customRoleId },
      });

      for (const feature of AVAILABLE_FEATURES) {
        const access = customRoleAccess.find(a => a.featureKey === feature.key);
        enabledFeatures[feature.key] = access ? access.isEnabled : false;
      }
    } else {
      // No custom role — CENTRAL_ADMIN gets full access to all features
      for (const feature of AVAILABLE_FEATURES) {
        enabledFeatures[feature.key] = true;
      }
    }

    res.json(successResponse({
      role: userRole,
      customRoleId: user.customRoleId,
      enabledFeatures,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get my features error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as organizationRoutes };
