import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import {
  coreDb as prisma,
  provisionTenantDatabase,
  getTenantClient,
  syncTenantCounts,
} from '@electioncaffe/database';
import { createLogger, SERVICE_URLS, buildTenantUrl } from '@electioncaffe/shared';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';
import { createFeatureTables, featureTablesExist } from '../utils/createFeatureTables.js';
import { auditLog } from '../utils/auditLog.js';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

const logger = createLogger('super-admin-service');

const router = Router();

// All tenant routes require super admin authentication
router.use(superAdminAuthMiddleware);

// Database type options:
// - SHARED: Use shared ElectionCaffe platform database with tenant isolation (no new DB)
// - DEDICATED_PLATFORM: Platform creates and manages a dedicated DB on the platform server
// - DEDICATED_EXTERNAL: Platform creates a dedicated DB on tenant's external server using provided credentials

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  tenantType: z.enum(['POLITICAL_PARTY', 'INDIVIDUAL_CANDIDATE', 'ELECTION_MANAGEMENT']),
  // Database configuration
  databaseType: z.enum(['SHARED', 'DEDICATED_PLATFORM', 'DEDICATED_EXTERNAL']).default('SHARED'),
  // For DEDICATED_EXTERNAL - tenant provides external database server credentials
  databaseHost: z.string().optional(),
  databaseName: z.string().optional(),
  databaseUser: z.string().optional(),
  databasePassword: z.string().optional(),
  databasePort: z.number().optional(),
  databaseSSL: z.boolean().optional(),
  databaseConnectionUrl: z.string().optional(),
  // Limits (deprecated - use license plans instead)
  maxVoters: z.number().default(10000),
  maxCadres: z.number().default(100),
  maxElections: z.number().default(5),
  maxUsers: z.number().default(50),
  maxConstituencies: z.number().default(1),
  // Other details
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  // Initial admin user
  adminFirstName: z.string().min(1),
  adminLastName: z.string().optional(),
  adminEmail: z.string().email(),
  adminMobile: z.string().min(10),
  adminPassword: z.string().min(6),
  // Enabled features (array of feature keys)
  enabledFeatures: z.array(z.string()).optional(),
  // License configuration
  licensePlanId: z.string().optional(), // If not provided, creates a TRIAL license with default plan
  trialDays: z.number().optional().default(14), // Trial period in days
});

// Helper function to test database connection
async function testDatabaseConnection(config: {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  connectionUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const client = new Client(
    config.connectionUrl || {
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    }
  );

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// List all tenants
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const tenantType = req.query.tenantType as string;
    const status = req.query.status as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tenantType) {
      where.tenantType = tenantType;
    }

    if (status) {
      where.status = status;
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenantFeatures: {
            include: {
              feature: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    // Add computed fields for frontend
    const tenantsWithActive = tenants.map(t => ({
      ...t,
      tenantUrl: buildTenantUrl(t.slug),
      isActive: t.status === 'ACTIVE' || t.status === 'TRIAL',
    }));

    res.json({
      success: true,
      data: tenantsWithActive,
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

// Get tenant by ID
router.get('/:id', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        tenantFeatures: {
          include: {
            feature: true,
          },
        },
        license: {
          include: {
            plan: { select: { planName: true, planType: true } },
          },
        },
      },
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

    // Use license plan name as the source of truth for subscription plan
    const activePlan = tenant.license?.plan?.planName || tenant.subscriptionPlan || 'free';

    res.json({
      success: true,
      data: {
        ...tenant,
        tenantUrl: buildTenantUrl(tenant.slug),
        subscriptionPlan: activePlan,
        isActive: tenant.status === 'ACTIVE' || tenant.status === 'TRIAL',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create new tenant
router.post('/', async (req, res, next) => {
  try {
    const data = createTenantSchema.parse(req.body);

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: data.slug },
    });

    if (existingTenant) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2004',
          message: 'Tenant with this slug already exists',
        },
      });
    }

    // Note: User uniqueness check cannot be performed here as users exist in tenant databases
    // The admin user will be created in the tenant's database when it's provisioned

    // Determine database status and permissions based on database type
    let databaseStatus: string;
    let canTenantEditDb: boolean;
    let databaseManagedBy: string | null;

    switch (data.databaseType) {
      case 'SHARED':
        // Using shared platform database — no new DB created
        databaseStatus = 'READY';
        canTenantEditDb = false;
        databaseManagedBy = 'super_admin';
        break;
      case 'DEDICATED_PLATFORM':
        // Platform creates and manages a dedicated DB on the platform server
        databaseStatus = 'PENDING_SETUP';
        canTenantEditDb = false;
        databaseManagedBy = 'super_admin';
        break;
      case 'DEDICATED_EXTERNAL':
        // Platform creates a dedicated DB on tenant's external server
        databaseStatus = 'PENDING_SETUP';
        canTenantEditDb = false;
        databaseManagedBy = 'super_admin';
        // Validate that external server credentials are provided
        if (data.databaseHost || data.databaseConnectionUrl) {
          const connectionTest = await testDatabaseConnection({
            host: data.databaseHost,
            port: data.databasePort,
            database: data.databaseName,
            user: data.databaseUser,
            password: data.databasePassword,
            ssl: data.databaseSSL,
            connectionUrl: data.databaseConnectionUrl,
          });
          if (!connectionTest.success) {
            databaseStatus = 'CONNECTION_FAILED';
          }
        }
        break;
      default:
        databaseStatus = 'READY';
        canTenantEditDb = false;
        databaseManagedBy = 'super_admin';
    }

    // All tenants get CENTRAL_ADMIN as the default admin role
    const defaultRole = 'CENTRAL_ADMIN';

    // Tenant URL is derived dynamically from slug — no need to store a hardcoded domain
    const tenantUrl = buildTenantUrl(data.slug);

    // Create tenant with admin user and license in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          tenantType: data.tenantType as any,
          tenantUrl, // Auto-generated or custom tenant URL
          databaseType: data.databaseType as any,
          databaseStatus: databaseStatus as any,
          databaseHost: data.databaseHost,
          databaseName: data.databaseName,
          databaseUser: data.databaseUser,
          databasePassword: data.databasePassword,
          databasePort: data.databasePort,
          databaseSSL: data.databaseSSL ?? true,
          databaseConnectionUrl: data.databaseConnectionUrl,
          canTenantEditDb,
          databaseManagedBy,
          maxVoters: data.maxVoters,
          maxCadres: data.maxCadres,
          maxElections: data.maxElections,
          maxUsers: data.maxUsers,
          maxConstituencies: data.maxConstituencies,
          logoUrl: data.logoUrl,
          primaryColor: data.primaryColor,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          address: data.address,
          state: data.state,
        },
      });

      // Store admin user details for tenant database provisioning
      // Admin user will be created when tenant database is provisioned
      const passwordHash = await bcrypt.hash(data.adminPassword, 12);
      const adminUser = {
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        email: data.adminEmail,
        mobile: data.adminMobile,
        passwordHash, // Will be used when provisioning tenant database
        role: defaultRole,
        note: 'Admin user will be created when tenant database is provisioned',
      };

      // Create license for the tenant
      let licensePlanId = data.licensePlanId;

      // If no license plan specified, find or create the default STARTER plan
      if (!licensePlanId) {
        let defaultPlan = await tx.licensePlan.findFirst({
          where: { planName: 'starter' },
        });

        // If no starter plan exists, find any available plan
        if (!defaultPlan) {
          defaultPlan = await tx.licensePlan.findFirst({
            where: { isActive: true },
            orderBy: { monthlyPrice: 'asc' },
          });
        }

        if (defaultPlan) {
          licensePlanId = defaultPlan.id;
        }
      }

      let tenantLicense = null;
      if (licensePlanId) {
        const trialDays = data.trialDays || 14;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + trialDays);

        tenantLicense = await tx.tenantLicense.create({
          data: {
            tenantId: tenant.id,
            planId: licensePlanId,
            status: 'TRIAL',
            billingCycle: 'MONTHLY',
            startDate,
            endDate,
            autoRenew: false,
          },
          include: {
            plan: true,
          },
        });

        // Update tenant trial dates
        await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            status: 'TRIAL',
            trialEndsAt: endDate,
          },
        });
      }

      // If enabled features are provided, create tenant feature associations
      if (data.enabledFeatures && data.enabledFeatures.length > 0) {
        const features = await tx.featureFlag.findMany({
          where: {
            featureKey: { in: data.enabledFeatures },
          },
        });

        await tx.tenantFeature.createMany({
          data: features.map(feature => ({
            tenantId: tenant.id,
            featureId: feature.id,
            isEnabled: true,
          })),
        });
      }

      return { tenant, adminUser, tenantLicense };
    });

    // Provision tenant database and create admin user based on database type
    let provisionResult: { success: boolean; databaseName?: string; connectionUrl?: string; error?: string } | null = null;
    let adminUserCreated = false;

    if (data.databaseType === 'SHARED') {
      // ── SHARED: use the existing shared platform database ──
      // No new DB creation, no schema push — the shared DB already has the schema.
      // Row-level isolation is handled by tenantId on every model.
      try {
        const sharedDbUrl = process.env.DATABASE_URL;
        if (!sharedDbUrl) {
          throw new Error('DATABASE_URL environment variable is not set — cannot configure shared database');
        }

        logger.info({ tenantId: result.tenant.id, tenantName: data.name }, 'Configuring SHARED tenant database');

        // Update tenant record with shared database connection details
        await prisma.tenant.update({
          where: { id: result.tenant.id },
          data: {
            databaseStatus: 'READY',
            databaseName: 'electioncaffe',
            databaseConnectionUrl: sharedDbUrl,
            databaseManagedBy: 'super_admin',
            databaseLastCheckedAt: new Date(),
            databaseMigrationVersion: 'latest',
          },
        });

        provisionResult = { success: true, databaseName: 'electioncaffe', connectionUrl: sharedDbUrl };

        // Insert tenant reference into the shared DB's tenants table (required for FK constraints)
        try {
          const tenantClient = await getTenantClient(result.tenant.id, sharedDbUrl, data.slug);
          await (tenantClient as any).$executeRawUnsafe(
            `INSERT INTO tenants (id, name, slug, tenant_type, database_type, database_status, status, database_ssl, max_voters, max_cadres, max_elections, max_users, max_constituencies, storage_quota_mb, storage_used_mb, created_at, updated_at)
             VALUES ($1, $2, $3, $4::"TenantType", 'SHARED'::"DatabaseType", 'READY'::"DatabaseStatus", 'TRIAL'::"TenantStatus", false, $5, $6, $7, $8, $9, 0, 0, NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            result.tenant.id, data.name, data.slug, data.tenantType,
            data.maxVoters, data.maxCadres, data.maxElections, data.maxUsers, data.maxConstituencies
          );

          // Create admin user in the shared database
          const createdSharedAdmin = await tenantClient.user.create({
            data: {
              tenantId: result.tenant.id,
              firstName: result.adminUser.firstName,
              lastName: result.adminUser.lastName || '',
              email: result.adminUser.email,
              mobile: result.adminUser.mobile,
              passwordHash: result.adminUser.passwordHash,
              role: result.adminUser.role as any,
              status: 'ACTIVE',
              canAccessAllConstituencies: true,
            },
          });
          // Cache admin identity in core DB
          await prisma.tenant.update({
            where: { id: result.tenant.id },
            data: { adminMobile: result.adminUser.mobile, adminEmail: result.adminUser.email, adminUserId: createdSharedAdmin.id },
          });
          adminUserCreated = true;
          logger.info({ email: result.adminUser.email }, 'Admin user created in shared tenant database');
        } catch (userErr: any) {
          logger.error({ err: userErr }, 'Failed to create tenant reference / admin user in shared tenant database');
        }
      } catch (sharedErr: any) {
        logger.error({ err: sharedErr }, 'Failed to configure shared database for tenant');
        provisionResult = { success: false, error: sharedErr.message };
      }

    } else if (data.databaseType === 'DEDICATED_PLATFORM') {
      // ── DEDICATED_PLATFORM: create a new DB on the platform's own server ──
      try {
        logger.info({ tenantId: result.tenant.id, tenantName: data.name }, 'Auto-provisioning DEDICATED_PLATFORM tenant database');
        provisionResult = await provisionTenantDatabase(
          result.tenant.id,
          data.name,
          data.slug
        );

        if (provisionResult.success && provisionResult.connectionUrl) {
          try {
            const tenantClient = await getTenantClient(result.tenant.id, provisionResult.connectionUrl, data.slug);
            const createdPlatformAdmin = await tenantClient.user.create({
              data: {
                tenantId: result.tenant.id,
                firstName: result.adminUser.firstName,
                lastName: result.adminUser.lastName || '',
                email: result.adminUser.email,
                mobile: result.adminUser.mobile,
                passwordHash: result.adminUser.passwordHash,
                role: result.adminUser.role as any,
                status: 'ACTIVE',
                canAccessAllConstituencies: true,
              },
            });
            // Cache admin identity in core DB
            await prisma.tenant.update({
              where: { id: result.tenant.id },
              data: { adminMobile: result.adminUser.mobile, adminEmail: result.adminUser.email, adminUserId: createdPlatformAdmin.id },
            });
            adminUserCreated = true;
            logger.info({ email: result.adminUser.email }, 'Admin user created in dedicated platform database');
          } catch (userErr: any) {
            logger.error({ err: userErr }, 'Failed to create admin user in dedicated platform database');
          }
        }
      } catch (provErr: any) {
        logger.error({ err: provErr }, 'DEDICATED_PLATFORM provisioning failed (tenant created, DB pending)');
      }

    } else if (data.databaseType === 'DEDICATED_EXTERNAL') {
      // ── DEDICATED_EXTERNAL: create a new DB on the tenant's external server ──
      // Use the credentials provided by the super admin
      try {
        const externalConfig: { host?: string; port?: number; user?: string; password?: string; ssl?: boolean } = {};
        if (data.databaseHost)     externalConfig.host     = data.databaseHost;
        if (data.databasePort)     externalConfig.port     = data.databasePort;
        if (data.databaseUser)     externalConfig.user     = data.databaseUser;
        if (data.databasePassword) externalConfig.password = data.databasePassword;
        if (data.databaseSSL !== undefined) externalConfig.ssl = data.databaseSSL;

        logger.info({ tenantId: result.tenant.id, tenantName: data.name, host: externalConfig.host }, 'Auto-provisioning DEDICATED_EXTERNAL tenant database');
        provisionResult = await provisionTenantDatabase(
          result.tenant.id,
          data.name,
          data.slug,
          externalConfig
        );

        if (provisionResult.success && provisionResult.connectionUrl) {
          try {
            const tenantClient = await getTenantClient(result.tenant.id, provisionResult.connectionUrl, data.slug);
            const createdExternalAdmin = await tenantClient.user.create({
              data: {
                tenantId: result.tenant.id,
                firstName: result.adminUser.firstName,
                lastName: result.adminUser.lastName || '',
                email: result.adminUser.email,
                mobile: result.adminUser.mobile,
                passwordHash: result.adminUser.passwordHash,
                role: result.adminUser.role as any,
                status: 'ACTIVE',
                canAccessAllConstituencies: true,
              },
            });
            // Cache admin identity in core DB
            await prisma.tenant.update({
              where: { id: result.tenant.id },
              data: { adminMobile: result.adminUser.mobile, adminEmail: result.adminUser.email, adminUserId: createdExternalAdmin.id },
            });
            adminUserCreated = true;
            logger.info({ email: result.adminUser.email }, 'Admin user created in dedicated external database');
          } catch (userErr: any) {
            logger.error({ err: userErr }, 'Failed to create admin user in dedicated external database');
          }
        }
      } catch (provErr: any) {
        logger.error({ err: provErr }, 'DEDICATED_EXTERNAL provisioning failed (tenant created, DB pending)');
      }
    }

    auditLog(req, 'CREATE_TENANT', 'tenant', result.tenant.id, result.tenant.id, { name: data.name, slug: data.slug, tenantType: data.tenantType, adminEmail: data.adminEmail });

    res.status(201).json({
      success: true,
      data: {
        tenant: {
          ...result.tenant,
          isActive: result.tenant.status === 'ACTIVE' || result.tenant.status === 'TRIAL',
        },
        adminUser: {
          firstName: result.adminUser.firstName,
          lastName: result.adminUser.lastName,
          email: result.adminUser.email,
          mobile: result.adminUser.mobile,
          role: result.adminUser.role,
          created: adminUserCreated,
        },
        database: provisionResult ? {
          provisioned: provisionResult.success,
          databaseName: provisionResult.databaseName,
          error: provisionResult.error,
        } : null,
        license: result.tenantLicense ? {
          id: result.tenantLicense.id,
          status: result.tenantLicense.status,
          plan: (result.tenantLicense as any).plan?.planName,
          planCode: (result.tenantLicense as any).plan?.planCode,
          startDate: result.tenantLicense.startDate,
          endDate: result.tenantLicense.endDate,
          limits: (result.tenantLicense as any).plan?.limits || {},
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Regenerate tenant URL from slug
router.post('/:id/regenerate-url', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: { code: 'E4004', message: 'Tenant not found' } });
    }

    const tenantUrl = buildTenantUrl(tenant.slug);

    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { tenantUrl },
    });

    auditLog(req, 'REGENERATE_TENANT_URL', 'tenant', req.params.id, req.params.id, { oldUrl: tenant.tenantUrl, newUrl: tenantUrl });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Update tenant
router.put('/:id', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(1).optional(),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
      displayName: z.string().optional().nullable(),
      organizationName: z.string().optional().nullable(),
      tenantType: z.enum(['POLITICAL_PARTY', 'INDIVIDUAL_CANDIDATE', 'ELECTION_MANAGEMENT']).optional(),
      status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING', 'EXPIRED', 'TRIAL']).optional(),
      maxVoters: z.number().optional(),
      maxCadres: z.number().optional(),
      maxElections: z.number().optional(),
      maxUsers: z.number().optional(),
      maxConstituencies: z.number().optional(),
      logoUrl: z.string().optional().nullable(),
      primaryColor: z.string().optional().nullable(),
      secondaryColor: z.string().optional().nullable(),
      faviconUrl: z.string().optional().nullable(),
      contactEmail: z.string().email().optional().nullable(),
      contactPhone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      partyName: z.string().optional().nullable(),
      partySymbolUrl: z.string().optional().nullable(),
      // subscriptionPlan is NOT here — it's managed only via License Management
    });

    const data = updateSchema.parse(req.body);

    // If slug changes, auto-update tenantUrl
    const updateData: any = { ...data };
    if (data.slug) {
      updateData.tenantUrl = buildTenantUrl(data.slug);
    }

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: updateData,
    });

    auditLog(req, 'UPDATE_TENANT', 'tenant', req.params.id, req.params.id, { fields: Object.keys(data) });

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
});

// Delete tenant (soft delete - just deactivate)
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.tenant.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' },
    });

    auditLog(req, 'DELETE_TENANT', 'tenant', req.params.id, req.params.id);

    res.json({
      success: true,
      message: 'Tenant deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update tenant features
router.put('/:id/features', async (req, res, next) => {
  try {
    const schema = z.object({
      features: z.array(z.object({
        featureKey: z.string(),
        isEnabled: z.boolean(),
        settings: z.record(z.any()).optional(),
      })),
    });

    const { features } = schema.parse(req.body);

    // Get all feature flags
    const allFeatures = await prisma.featureFlag.findMany({
      where: {
        featureKey: { in: features.map(f => f.featureKey) },
      },
    });

    const featureKeyToId = new Map(allFeatures.map(f => [f.featureKey, f.id]));

    // Upsert tenant features
    await Promise.all(
      features.map(async (feature) => {
        const featureId = featureKeyToId.get(feature.featureKey);
        if (!featureId) return;

        await prisma.tenantFeature.upsert({
          where: {
            tenantId_featureId: {
              tenantId: req.params.id,
              featureId,
            },
          },
          create: {
            tenantId: req.params.id,
            featureId,
            isEnabled: feature.isEnabled,
            settings: feature.settings || {},
          },
          update: {
            isEnabled: feature.isEnabled,
            settings: feature.settings || {},
          },
        });
      })
    );

    // Fetch updated tenant features
    const updatedTenantFeatures = await prisma.tenantFeature.findMany({
      where: { tenantId: req.params.id },
      include: { feature: true },
    });

    auditLog(req, 'UPDATE_TENANT_FEATURES', 'tenant', req.params.id, req.params.id, { featureCount: features.length });

    res.json({
      success: true,
      data: updatedTenantFeatures,
    });
  } catch (error) {
    next(error);
  }
});

// Add constituency to tenant (for political parties)
// NOTE: This endpoint requires connecting to the tenant's database
// For now, return a message indicating this needs tenant database connection
router.post('/:id/constituencies', async (req, res, next) => {
  try {
    // Check tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Tenant not found' },
      });
    }

    if (tenant.tenantType !== 'POLITICAL_PARTY') {
      return res.status(400).json({
        success: false,
        error: { code: 'E4004', message: 'Constituencies can only be added to Political Party tenants' },
      });
    }

    // TODO: Connect to tenant database to create constituency
    res.status(501).json({
      success: false,
      error: {
        code: 'E5001',
        message: 'Constituency creation requires tenant database connection. Use the tenant application to manage constituencies.'
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant statistics
// NOTE: Usage counts (voters, cadres, elections, etc.) require connecting to tenant database
// This endpoint returns limits from core database only
router.get('/:id/stats', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Tenant not found' },
      });
    }

    res.json({
      success: true,
      data: {
        limits: {
          maxVoters: tenant.maxVoters,
          maxCadres: tenant.maxCadres,
          maxElections: tenant.maxElections,
          maxUsers: tenant.maxUsers,
          maxConstituencies: tenant.maxConstituencies,
        },
        usage: {
          voters: (tenant as any).currentVoterCount || 0,
          cadres: (tenant as any).currentCadreCount || 0,
          elections: (tenant as any).currentElectionCount || 0,
          users: (tenant as any).currentUserCount || 0,
        },
        countsLastSyncedAt: (tenant as any).countsLastSyncedAt || null,
        tenant: {
          databaseStatus: tenant.databaseStatus,
          databaseName: tenant.databaseName,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Sync counts for a specific tenant from its database
router.post('/:id/sync-counts', async (req, res, next) => {
  try {
    const results = await syncTenantCounts(req.params.id);
    const result = results[0];

    if (!result) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Tenant not found or database not READY' },
      });
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'E5001', message: result.error || 'Sync failed' },
      });
    }

    auditLog(req, 'SYNC_TENANT_COUNTS', 'tenant', req.params.id, req.params.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant database configuration
router.get('/:id/database', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        databaseType: true,
        databaseStatus: true,
        databaseHost: true,
        databaseName: true,
        databaseUser: true,
        databasePort: true,
        databaseSSL: true,
        canTenantEditDb: true,
        databaseManagedBy: true,
        databaseLastCheckedAt: true,
        databaseLastError: true,
        databaseMigrationVersion: true,
        // Don't expose password!
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Tenant not found' },
      });
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
});

// Update tenant database configuration
router.put('/:id/database', async (req, res, next) => {
  try {
    const schema = z.object({
      databaseType: z.enum(['SHARED', 'DEDICATED_PLATFORM', 'DEDICATED_EXTERNAL']).optional(),
      databaseHost: z.string().optional(),
      databaseName: z.string().optional(),
      databaseUser: z.string().optional(),
      databasePassword: z.string().optional(),
      databasePort: z.number().optional(),
      databaseSSL: z.boolean().optional(),
      databaseConnectionUrl: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Tenant not found' },
      });
    }

    // Determine new status and permissions based on database type change
    let databaseStatus = tenant.databaseStatus;
    let canTenantEditDb = tenant.canTenantEditDb;
    let databaseManagedBy = tenant.databaseManagedBy;

    if (data.databaseType && data.databaseType !== tenant.databaseType) {
      switch (data.databaseType) {
        case 'SHARED':
          databaseStatus = 'READY';
          canTenantEditDb = false;
          databaseManagedBy = 'super_admin';
          break;
        case 'DEDICATED_PLATFORM':
          databaseStatus = 'PENDING_SETUP';
          canTenantEditDb = false;
          databaseManagedBy = 'super_admin';
          break;
        case 'DEDICATED_EXTERNAL':
          databaseStatus = 'PENDING_SETUP';
          canTenantEditDb = false;
          databaseManagedBy = 'super_admin';
          break;
      }
    }

    // If connection details provided, test the connection
    if (data.databaseHost || data.databaseConnectionUrl) {
      const connectionTest = await testDatabaseConnection({
        host: data.databaseHost || tenant.databaseHost || undefined,
        port: data.databasePort ?? tenant.databasePort ?? 5432,
        database: data.databaseName || tenant.databaseName || undefined,
        user: data.databaseUser || tenant.databaseUser || undefined,
        password: data.databasePassword || tenant.databasePassword || undefined,
        ssl: data.databaseSSL ?? tenant.databaseSSL ?? true,
        connectionUrl: data.databaseConnectionUrl || tenant.databaseConnectionUrl || undefined,
      });

      if (connectionTest.success) {
        databaseStatus = 'READY';
      } else {
        databaseStatus = 'CONNECTION_FAILED';
        await prisma.tenant.update({
          where: { id: req.params.id },
          data: {
            databaseLastError: connectionTest.error,
            databaseLastCheckedAt: new Date(),
          },
        });
      }
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        databaseType: data.databaseType as any,
        databaseStatus: databaseStatus as any,
        databaseHost: data.databaseHost,
        databaseName: data.databaseName,
        databaseUser: data.databaseUser,
        databasePassword: data.databasePassword,
        databasePort: data.databasePort,
        databaseSSL: data.databaseSSL,
        databaseConnectionUrl: data.databaseConnectionUrl,
        canTenantEditDb,
        databaseManagedBy,
        databaseLastCheckedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        databaseType: true,
        databaseStatus: true,
        databaseHost: true,
        databaseName: true,
        databaseUser: true,
        databasePort: true,
        databaseSSL: true,
        canTenantEditDb: true,
        databaseManagedBy: true,
        databaseLastCheckedAt: true,
        databaseLastError: true,
      },
    });

    auditLog(req, 'UPDATE_TENANT_DATABASE', 'tenant', req.params.id, req.params.id, { databaseType: data.databaseType, databaseStatus });

    res.json({
      success: true,
      data: updatedTenant,
    });
  } catch (error) {
    next(error);
  }
});

// Test database connection for tenant
router.post('/:id/database/test', async (req, res, next) => {
  try {
    const schema = z.object({
      host: z.string().optional(),
      port: z.number().optional(),
      database: z.string().optional(),
      user: z.string().optional(),
      password: z.string().optional(),
      ssl: z.boolean().optional(),
      connectionUrl: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Tenant not found' },
      });
    }

    // Use provided config or fall back to stored config
    const testConfig = {
      host: data.host || tenant.databaseHost || undefined,
      port: data.port ?? tenant.databasePort ?? 5432,
      database: data.database || tenant.databaseName || undefined,
      user: data.user || tenant.databaseUser || undefined,
      password: data.password || tenant.databasePassword || undefined,
      ssl: data.ssl ?? tenant.databaseSSL ?? true,
      connectionUrl: data.connectionUrl || tenant.databaseConnectionUrl || undefined,
    };

    const result = await testDatabaseConnection(testConfig);

    // Update tenant with test results
    await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        databaseLastCheckedAt: new Date(),
        databaseLastError: result.success ? null : result.error,
        databaseStatus: result.success ? 'CONNECTED' : 'CONNECTION_FAILED',
      },
    });

    auditLog(req, 'TEST_DATABASE_CONNECTION', 'tenant', req.params.id, req.params.id, { connected: result.success, error: result.error });

    res.json({
      success: true,
      data: {
        connected: result.success,
        error: result.error,
        testedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant features
router.get('/:id/features', async (req, res, next) => {
  try {
    const features = await prisma.tenantFeature.findMany({
      where: { tenantId: req.params.id },
      include: {
        feature: true,
      },
    });

    res.json({
      success: true,
      data: features,
    });
  } catch (error) {
    next(error);
  }
});

// Update single tenant feature
router.put('/:id/features/:featureId', async (req, res, next) => {
  try {
    const { isEnabled } = z.object({ isEnabled: z.boolean() }).parse(req.body);
    const tenantId = req.params.id;
    const featureId = req.params.featureId;

    // Get tenant and feature details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const feature = await prisma.featureFlag.findUnique({
      where: { id: featureId },
    });

    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }

    // Features that require database tables
    const requiresDbTables = ['fund_management', 'inventory_management'].includes(feature.featureKey);

    // If enabling a feature that requires tables, create them
    if (isEnabled && requiresDbTables) {
      logger.info({ featureKey: feature.featureKey, tenantName: tenant.name }, 'Feature requires database tables, creating');

      try {
        // Check if tables already exist
        const tablesExist = await featureTablesExist(tenant, feature.featureKey);

        if (!tablesExist) {
          await createFeatureTables(tenant, feature.featureKey);
          logger.info({ featureKey: feature.featureKey }, 'Tables created successfully for feature');
        } else {
          logger.debug({ featureKey: feature.featureKey }, 'Tables already exist for feature, skipping creation');
        }
      } catch (error: any) {
        logger.error({ err: error, featureKey: feature.featureKey }, 'Failed to create tables for feature');
        return res.status(500).json({
          error: 'Failed to create database tables for this feature',
          details: error.message,
        });
      }
    }

    // If disabling a feature that has tables, optionally drop them (commented out for safety)
    // if (!isEnabled && requiresDbTables) {
    //   try {
    //     await dropFeatureTables(tenant, feature.featureKey);
    //     console.log(`✓ Tables dropped successfully for feature "${feature.featureKey}"`);
    //   } catch (error: any) {
    //     console.error(`Failed to drop tables for feature "${feature.featureKey}":`, error);
    //     // Don't fail the request if dropping tables fails
    //   }
    // }

    // Update or create the tenant feature record
    const updatedFeature = await prisma.tenantFeature.upsert({
      where: {
        tenantId_featureId: {
          tenantId,
          featureId,
        },
      },
      update: { isEnabled },
      create: {
        tenantId,
        featureId,
        isEnabled,
      },
      include: { feature: true },
    });

    auditLog(req, isEnabled ? 'ENABLE_TENANT_FEATURE' : 'DISABLE_TENANT_FEATURE', 'tenant_feature', featureId, tenantId, { featureKey: feature.featureKey });

    res.json({
      success: true,
      data: updatedFeature,
      message: isEnabled
        ? requiresDbTables
          ? `Feature enabled and database tables created successfully`
          : `Feature enabled successfully`
        : `Feature disabled successfully`,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== TENANT ADMIN MANAGEMENT ====================

// Get tenant admin info
router.get('/:id/admin', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        slug: true,
        adminMobile: true,
        adminEmail: true,
        adminUserId: true,
        databaseHost: true,
        databaseName: true,
        databaseUser: true,
        databasePassword: true,
        databasePort: true,
        databaseSSL: true,
        databaseConnectionUrl: true,
        databaseStatus: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ success: false, error: { code: 'E3001', message: 'Tenant not found' } });
    }

    // Fast path: cached admin identity in core DB
    if (tenant.adminMobile || tenant.adminEmail) {
      return res.json({
        success: true,
        data: {
          userId: tenant.adminUserId,
          mobile: tenant.adminMobile,
          email: tenant.adminEmail,
        },
      });
    }

    // Slow path: fetch from tenant DB via Auth Service (for legacy tenants)
    if (tenant.databaseStatus !== 'READY') {
      return res.json({
        success: true,
        data: { userId: null, mobile: null, email: null },
      });
    }

    const authResponse = await fetch(`${SERVICE_URLS.AUTH}/api/internal/admin-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_API_KEY },
      body: JSON.stringify({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        dbConfig: {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
      }),
    });

    const authData = await authResponse.json() as any;
    if (!authResponse.ok || !authData.success) {
      return res.json({
        success: true,
        data: { userId: null, mobile: null, email: null },
      });
    }

    // Backfill core DB cache for future requests
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        adminMobile: authData.data.mobile,
        adminEmail: authData.data.email,
        adminUserId: authData.data.userId,
      },
    });

    res.json({
      success: true,
      data: {
        userId: authData.data.userId,
        mobile: authData.data.mobile,
        email: authData.data.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Generate temp password for tenant admin
router.post('/:id/admin/reset-password', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        slug: true,
        name: true,
        databaseHost: true,
        databaseName: true,
        databaseUser: true,
        databasePassword: true,
        databasePort: true,
        databaseSSL: true,
        databaseConnectionUrl: true,
        databaseStatus: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ success: false, error: { code: 'E3001', message: 'Tenant not found' } });
    }

    if (tenant.databaseStatus !== 'READY') {
      return res.status(400).json({ success: false, error: { code: 'E2005', message: 'Tenant database is not ready' } });
    }

    // Call Auth Service to generate temp password (proper boundary)
    const authResponse = await fetch(`${SERVICE_URLS.AUTH}/api/internal/admin-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_API_KEY },
      body: JSON.stringify({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        dbConfig: {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
      }),
    });

    const authData = await authResponse.json() as any;
    if (!authResponse.ok || !authData.success) {
      return res.status(authResponse.status).json(authData);
    }

    // Cache admin identity in core DB
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        adminMobile: authData.data.adminMobile,
        adminEmail: authData.data.adminEmail,
        adminUserId: authData.data.adminUserId,
      },
    });

    // Audit log (fire-and-forget, no await needed)
    auditLog(req, 'RESET_TENANT_ADMIN_PASSWORD', 'tenant', tenant.id, tenant.id, {
      tenantName: tenant.name,
      adminMobile: authData.data.adminMobile,
    });

    res.setHeader('Cache-Control', 'no-store, no-cache');
    res.json({
      success: true,
      data: {
        tempPassword: authData.data.tempPassword,
        adminMobile: authData.data.adminMobile,
        adminEmail: authData.data.adminEmail,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as tenantsRoutes };
