/**
 * Database Manager
 *
 * Handles:
 * - Creating new tenant databases (EC_<TenantName>)
 * - Running migrations on tenant databases
 * - Testing database connections
 * - Database health checks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { coreDb } from './core-client.js';
import { generateTenantDbName, generateTenantDbUrl } from './tenant-client.js';

const execAsync = promisify(exec);

export interface TenantDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  ssl: boolean;
}

export interface CreateTenantDbResult {
  success: boolean;
  databaseName: string;
  connectionUrl: string;
  error?: string;
}

/**
 * Gets the default database configuration from environment
 */
export function getDefaultDbConfig(): TenantDbConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
  };
}

/**
 * Creates a new database for a tenant
 * Database name format: EC_<TenantName>
 */
export async function createTenantDatabase(
  tenantName: string,
  config?: Partial<TenantDbConfig>
): Promise<CreateTenantDbResult> {
  const dbConfig = { ...getDefaultDbConfig(), ...config };
  const dbName = generateTenantDbName(tenantName);

  try {
    // Use psql to create the database
    const createDbCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "CREATE DATABASE \\"${dbName}\\""`;

    try {
      await execAsync(createDbCommand);
    } catch (error: any) {
      // Check if database already exists (not an error)
      if (error.stderr && error.stderr.includes('already exists')) {
        console.log(`Database ${dbName} already exists, skipping creation`);
      } else {
        throw error;
      }
    }

    // Generate the connection URL for the new database
    const connectionUrl = generateTenantDbUrl(tenantName, dbConfig);

    return {
      success: true,
      databaseName: dbName,
      connectionUrl,
    };
  } catch (error: any) {
    console.error(`Failed to create tenant database ${dbName}:`, error);
    return {
      success: false,
      databaseName: dbName,
      connectionUrl: '',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Runs Prisma migrations on a tenant database
 */
export async function migrateTenantDatabase(
  tenantName: string,
  connectionUrl: string
): Promise<{ success: boolean; error?: string }> {
  const dbName = generateTenantDbName(tenantName);

  try {
    // Set the TENANT_DATABASE_URL for Prisma
    process.env.TENANT_DATABASE_URL = connectionUrl;

    // Run prisma migrate deploy for tenant schema
    const migrateCommand = `cd ${process.cwd()}/packages/database && TENANT_DATABASE_URL="${connectionUrl}" npx prisma migrate deploy --schema=./prisma/tenant/schema.prisma`;

    await execAsync(migrateCommand);

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to migrate tenant database ${dbName}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Pushes schema to a tenant database (for development/testing)
 */
export async function pushTenantSchema(
  connectionUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Run prisma db push for tenant schema
    const pushCommand = `cd ${process.cwd()}/packages/database && TENANT_DATABASE_URL="${connectionUrl}" npx prisma db push --schema=./prisma/tenant/schema.prisma --accept-data-loss`;

    await execAsync(pushCommand);

    return { success: true };
  } catch (error: any) {
    console.error('Failed to push tenant schema:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Tests a database connection
 */
export async function testDatabaseConnection(
  connectionUrl: string
): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  const startTime = Date.now();

  try {
    const { PrismaClient } = await import('@prisma/client');
    const client = new PrismaClient({
      datasources: { db: { url: connectionUrl } },
    });

    await client.$connect();
    await client.$queryRaw`SELECT 1`;
    await client.$disconnect();

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      latencyMs,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection failed',
    };
  }
}

/**
 * Full tenant database provisioning workflow
 */
export async function provisionTenantDatabase(
  tenantId: string,
  tenantName: string,
  tenantSlug: string,
  config?: Partial<TenantDbConfig>
): Promise<{
  success: boolean;
  databaseName?: string;
  connectionUrl?: string;
  error?: string;
}> {
  try {
    // Step 1: Create the database
    const createResult = await createTenantDatabase(tenantName, config);
    if (!createResult.success) {
      throw new Error(createResult.error || 'Failed to create database');
    }

    // Step 2: Push schema to the database (creates tables)
    const pushResult = await pushTenantSchema(createResult.connectionUrl);
    if (!pushResult.success) {
      throw new Error(pushResult.error || 'Failed to push schema');
    }

    // Step 3: Test the connection
    const testResult = await testDatabaseConnection(createResult.connectionUrl);
    if (!testResult.success) {
      throw new Error(testResult.error || 'Connection test failed');
    }

    // Step 4: Update tenant record in core database with database info
    await coreDb.tenant.update({
      where: { id: tenantId },
      data: {
        databaseType: 'DEDICATED_MANAGED',
        databaseStatus: 'READY',
        databaseName: createResult.databaseName,
        databaseHost: config?.host || process.env.DB_HOST || 'localhost',
        databasePort: config?.port || parseInt(process.env.DB_PORT || '5432'),
        databaseUser: config?.user || process.env.DB_USER || 'postgres',
        databasePassword: config?.password || process.env.DB_PASSWORD || 'postgres',
        databaseSSL: config?.ssl ?? false,
        databaseConnectionUrl: createResult.connectionUrl,
        databaseManagedBy: 'super_admin',
        databaseLastCheckedAt: new Date(),
        databaseMigrationVersion: 'latest',
      },
    });

    return {
      success: true,
      databaseName: createResult.databaseName,
      connectionUrl: createResult.connectionUrl,
    };
  } catch (error: any) {
    console.error(`Failed to provision database for tenant ${tenantSlug}:`, error);

    // Update tenant record with error status
    try {
      await coreDb.tenant.update({
        where: { id: tenantId },
        data: {
          databaseStatus: 'CONNECTION_FAILED',
          databaseLastError: error.message,
          databaseLastCheckedAt: new Date(),
        },
      });
    } catch (updateError) {
      console.error('Failed to update tenant status:', updateError);
    }

    return {
      success: false,
      error: error.message || 'Failed to provision database',
    };
  }
}

/**
 * Drops a tenant database
 * WARNING: This is destructive and cannot be undone!
 */
export async function dropTenantDatabase(
  tenantName: string,
  config?: Partial<TenantDbConfig>
): Promise<{ success: boolean; error?: string }> {
  const dbConfig = { ...getDefaultDbConfig(), ...config };
  const dbName = generateTenantDbName(tenantName);

  try {
    // First disconnect any cached connections
    // Note: We need to find the tenant ID to disconnect, but for now we'll skip this

    // Drop the database
    const dropDbCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "DROP DATABASE IF EXISTS \\"${dbName}\\""`;

    await execAsync(dropDbCommand);

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to drop tenant database ${dbName}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Checks database health for a tenant
 */
export async function checkTenantDatabaseHealth(
  tenantId: string
): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  try {
    // Get tenant from core database
    const tenant = await coreDb.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        databaseConnectionUrl: true,
        databaseStatus: true,
      },
    });

    if (!tenant) {
      return { healthy: false, error: 'Tenant not found' };
    }

    if (!tenant.databaseConnectionUrl) {
      return { healthy: false, error: 'No database configured' };
    }

    // Test the connection
    const testResult = await testDatabaseConnection(tenant.databaseConnectionUrl);

    // Update last checked timestamp
    await coreDb.tenant.update({
      where: { id: tenantId },
      data: {
        databaseLastCheckedAt: new Date(),
        databaseStatus: testResult.success ? 'READY' : 'CONNECTION_FAILED',
        databaseLastError: testResult.success ? null : testResult.error,
      },
    });

    return {
      healthy: testResult.success,
      latencyMs: testResult.latencyMs,
      error: testResult.error,
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message || 'Health check failed',
    };
  }
}

/**
 * Gets all tenants with their database status
 */
export async function getTenantDatabaseStatuses(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    databaseName: string | null;
    databaseStatus: string;
    databaseLastCheckedAt: Date | null;
    databaseLastError: string | null;
  }>
> {
  const tenants = await coreDb.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      databaseName: true,
      databaseStatus: true,
      databaseLastCheckedAt: true,
      databaseLastError: true,
    },
  });

  return tenants;
}
