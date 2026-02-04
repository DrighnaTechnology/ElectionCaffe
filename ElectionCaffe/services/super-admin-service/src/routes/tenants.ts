import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Client } from 'pg';
import { coreDb as prisma } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';
import { createFeatureTables, featureTablesExist } from '../utils/createFeatureTables.js';

const router = Router();

// All tenant routes require super admin authentication
router.use(superAdminAuthMiddleware);

// Base domain for tenant URLs
const TENANT_BASE_DOMAIN = 'election.datacaffe.ai';

// Helper function to generate unique tenant URL prefix
async function generateUniqueTenantUrlPrefix(): Promise<string> {
  // Get the count of tenants to generate a sequential prefix
  const tenantCount = await prisma.tenant.count();
  let prefix = String(tenantCount + 1).padStart(4, '0'); // e.g., "0001", "0002", etc.

  // Make sure it's unique
  let attempts = 0;
  while (attempts < 100) {
    const existingTenant = await prisma.tenant.findFirst({
      where: { tenantUrl: `${prefix}.${TENANT_BASE_DOMAIN}` },
    });
    if (!existingTenant) {
      return prefix;
    }
    // Increment the prefix and try again
    prefix = String(parseInt(prefix) + 1).padStart(4, '0');
    attempts++;
  }

  // If all sequential attempts fail, use timestamp + random
  return `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
}

// Database type options:
// - NONE: No database configured yet (tenant admin will set up later)
// - SHARED: Use shared ElectionCaffe platform database with tenant isolation
// - DEDICATED_MANAGED: Super Admin creates and manages the dedicated database
// - DEDICATED_SELF: Tenant admin provides their own database connection

const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  tenantType: z.enum(['POLITICAL_PARTY', 'INDIVIDUAL_CANDIDATE', 'ELECTION_MANAGEMENT']),
  // Tenant URL configuration (optional - auto-generated if not provided)
  tenantUrlPrefix: z.string().regex(/^[a-z0-9-]+$/).optional(), // Custom prefix for tenant URL (e.g., "acme" -> "acme.election.datacaffe.ai")
  // Database configuration
  databaseType: z.enum(['NONE', 'SHARED', 'DEDICATED_MANAGED', 'DEDICATED_SELF']).default('NONE'),
  // For DEDICATED_MANAGED - Super Admin provides the database config
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
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

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

    if (isActive !== undefined) {
      where.isActive = isActive;
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

    res.json({
      success: true,
      data: tenants,
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

    res.json({
      success: true,
      data: tenant,
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
      case 'NONE':
        // Tenant will set up their own database later
        databaseStatus = 'NOT_CONFIGURED';
        canTenantEditDb = true;
        databaseManagedBy = null;
        break;
      case 'SHARED':
        // Using shared platform database
        databaseStatus = 'READY';
        canTenantEditDb = false;
        databaseManagedBy = 'super_admin';
        break;
      case 'DEDICATED_MANAGED':
        // Super admin manages the dedicated database
        databaseStatus = 'PENDING_SETUP';
        canTenantEditDb = false;
        databaseManagedBy = 'super_admin';
        // If database config is provided, test the connection
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
          if (connectionTest.success) {
            databaseStatus = 'READY';
          } else {
            databaseStatus = 'CONNECTION_FAILED';
          }
        }
        break;
      case 'DEDICATED_SELF':
        // Tenant manages their own database (they will provide config later)
        databaseStatus = 'PENDING_SETUP';
        canTenantEditDb = true;
        databaseManagedBy = 'tenant';
        break;
      default:
        databaseStatus = 'NOT_CONFIGURED';
        canTenantEditDb = true;
        databaseManagedBy = null;
    }

    // Get default role based on tenant type
    const defaultRole = data.tenantType === 'POLITICAL_PARTY'
      ? 'CENTRAL_ADMIN'
      : data.tenantType === 'ELECTION_MANAGEMENT'
        ? 'EMC_ADMIN'
        : 'CANDIDATE_ADMIN';

    // Generate tenant URL
    let tenantUrlPrefix = data.tenantUrlPrefix;
    if (!tenantUrlPrefix) {
      tenantUrlPrefix = await generateUniqueTenantUrlPrefix();
    }
    const tenantUrl = `${tenantUrlPrefix}.${TENANT_BASE_DOMAIN}`;

    // Check if custom URL prefix is already taken
    if (data.tenantUrlPrefix) {
      const existingWithUrl = await prisma.tenant.findFirst({
        where: { tenantUrl },
      });
      if (existingWithUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'E2005',
            message: 'Tenant URL prefix is already in use',
          },
        });
      }
    }

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
            orderBy: { basePrice: 'asc' },
          });
        }

        if (defaultPlan) {
          licensePlanId = defaultPlan.id;
        }
      }

      let tenantLicense = null;
      if (licensePlanId) {
        const trialDays = data.trialDays || 14;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        tenantLicense = await tx.tenantLicense.create({
          data: {
            tenantId: tenant.id,
            licensePlanId: licensePlanId,
            status: 'TRIAL',
            trialEndsAt,
            activatedAt: new Date(),
            enforceSessionLimit: true,
            enforceUserLimit: true,
            enforceApiLimit: false,
            enforceDataLimit: false,
            softLimitMode: true, // Start in soft limit mode for trials
            adminNotes: `Auto-created trial license for ${trialDays} days`,
          },
          include: {
            licensePlan: true,
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

    res.status(201).json({
      success: true,
      data: {
        tenant: result.tenant,
        adminUser: {
          firstName: result.adminUser.firstName,
          lastName: result.adminUser.lastName,
          email: result.adminUser.email,
          mobile: result.adminUser.mobile,
          role: result.adminUser.role,
          note: 'Admin user will be created when tenant database is provisioned',
        },
        license: result.tenantLicense ? {
          id: result.tenantLicense.id,
          status: result.tenantLicense.status,
          plan: result.tenantLicense.licensePlan.planName,
          planType: result.tenantLicense.licensePlan.planType,
          trialEndsAt: result.tenantLicense.trialEndsAt,
          limits: {
            maxUsers: result.tenantLicense.licensePlan.maxUsers,
            maxSessions: result.tenantLicense.licensePlan.maxConcurrentSessions,
            maxSessionsPerUser: result.tenantLicense.licensePlan.maxSessionsPerUser,
          },
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update tenant
router.put('/:id', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      maxVoters: z.number().optional(),
      maxCadres: z.number().optional(),
      maxElections: z.number().optional(),
      maxUsers: z.number().optional(),
      maxConstituencies: z.number().optional(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      state: z.string().optional(),
      subscriptionPlan: z.string().optional(),
      subscriptionEndsAt: z.string().datetime().optional(),
    });

    const data = updateSchema.parse(req.body);

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        ...data,
        subscriptionEndsAt: data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt) : undefined,
      },
    });

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
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

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

    // Return limits from core database
    // Actual usage counts require tenant database connection
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
        // Usage data requires tenant database connection
        // These would be populated by connecting to the tenant's dedicated database
        usage: {
          voters: 0,
          cadres: 0,
          elections: 0,
          users: 0,
          constituencies: 0,
          note: 'Usage data requires tenant database connection',
        },
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

// Update tenant database configuration (Super Admin only for DEDICATED_MANAGED)
router.put('/:id/database', async (req, res, next) => {
  try {
    const schema = z.object({
      databaseType: z.enum(['NONE', 'SHARED', 'DEDICATED_MANAGED', 'DEDICATED_SELF']).optional(),
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
        case 'NONE':
          databaseStatus = 'NOT_CONFIGURED';
          canTenantEditDb = true;
          databaseManagedBy = null;
          break;
        case 'SHARED':
          databaseStatus = 'READY';
          canTenantEditDb = false;
          databaseManagedBy = 'super_admin';
          break;
        case 'DEDICATED_MANAGED':
          databaseStatus = 'PENDING_SETUP';
          canTenantEditDb = false;
          databaseManagedBy = 'super_admin';
          break;
        case 'DEDICATED_SELF':
          databaseStatus = 'PENDING_SETUP';
          canTenantEditDb = true;
          databaseManagedBy = 'tenant';
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
      console.log(`Feature "${feature.featureKey}" requires database tables. Creating for tenant "${tenant.name}"...`);

      try {
        // Check if tables already exist
        const tablesExist = await featureTablesExist(tenant, feature.featureKey);

        if (!tablesExist) {
          await createFeatureTables(tenant, feature.featureKey);
          console.log(`✓ Tables created successfully for feature "${feature.featureKey}"`);
        } else {
          console.log(`ℹ Tables already exist for feature "${feature.featureKey}", skipping creation`);
        }
      } catch (error: any) {
        console.error(`Failed to create tables for feature "${feature.featureKey}":`, error);
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

export { router as tenantsRoutes };
