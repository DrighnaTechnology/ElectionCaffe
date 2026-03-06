/**
 * Database Manager
 *
 * Handles:
 * - Creating new tenant databases (EC_<TenantName>)
 * - Running migrations on tenant databases
 * - Testing database connections
 * - Database health checks
 *
 * Uses pg Client directly (cross-platform, no psql dependency)
 */

import { Client } from 'pg';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve, join } from 'path';
import { coreDb } from './core-client.js';
import { generateTenantDbName, generateTenantDbUrl, getTenantClientBySlug } from './tenant-client.js';

const execFileAsync = promisify(execFile);

// Derive the database package root from this file's location (works regardless of cwd)
// __dirname is available in CJS (this package has no "type": "module")
const dbPkgRoot = resolve(__dirname, '..', '..');

// Resolve prisma CLI path and node binary (absolute paths, cross-platform)
const prismaCli = require.resolve('prisma/build/index.js');
const nodeBin = process.execPath;

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
  // Parse from CORE_DATABASE_URL if available
  const coreUrl = process.env.CORE_DATABASE_URL || '';
  let host = process.env.DB_HOST || 'localhost';
  let port = parseInt(process.env.DB_PORT || '5432');
  let user = process.env.DB_USER || 'postgres';
  let password = process.env.DB_PASSWORD || 'postgres';

  if (coreUrl) {
    try {
      const url = new URL(coreUrl);
      host = url.hostname || host;
      port = parseInt(url.port) || port;
      user = url.username || user;
      password = decodeURIComponent(url.password) || password;
    } catch {
      // Fall back to env vars
    }
  }

  return {
    host,
    port,
    user,
    password,
    ssl: process.env.DB_SSL === 'true',
  };
}

/**
 * Creates a new database for a tenant using pg Client
 */
export async function createTenantDatabase(
  tenantName: string,
  config?: Partial<TenantDbConfig>
): Promise<CreateTenantDbResult> {
  const dbConfig = { ...getDefaultDbConfig(), ...config };
  const dbName = generateTenantDbName(tenantName);

  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres', // Connect to default db to create new one
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();

    // Check if database already exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Database ${dbName} already exists, skipping creation`);
    } else {
      // CREATE DATABASE cannot use parameterized queries, but dbName is sanitized by generateTenantDbName
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully`);
    }

    await client.end();

    // Generate the connection URL for the new database
    const connectionUrl = generateTenantDbUrl(tenantName, dbConfig);

    return {
      success: true,
      databaseName: dbName,
      connectionUrl,
    };
  } catch (error: any) {
    console.error(`Failed to create tenant database ${dbName}:`, error.message);
    try { await client.end(); } catch {}
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
    const dbPkgDir = dbPkgRoot;
    const env = { ...process.env, TENANT_DATABASE_URL: connectionUrl };
    const schemaPath = join(dbPkgDir, 'prisma', 'tenant', 'schema.prisma');

    await execFileAsync(nodeBin, [prismaCli, 'migrate', 'deploy', `--schema=${schemaPath}`], { env, cwd: dbPkgDir });

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to migrate tenant database ${dbName}:`, error.message);
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
    const dbPkgDir = dbPkgRoot;
    const env = { ...process.env, TENANT_DATABASE_URL: connectionUrl };
    const schemaPath = join(dbPkgDir, 'prisma', 'tenant', 'schema.prisma');

    await execFileAsync(nodeBin, [prismaCli, 'db', 'push', `--schema=${schemaPath}`, '--accept-data-loss'], { env, cwd: dbPkgDir, timeout: 60000 });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to push tenant schema:', error.message);
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

  const client = new Client({ connectionString: connectionUrl });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();

    return {
      success: true,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    try { await client.end(); } catch {}
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

    // Step 4: Update tenant record in core database with connection details
    // Note: databaseType is NOT overwritten — it was set correctly during tenant creation
    const dbConfig = { ...getDefaultDbConfig(), ...config };
    await coreDb.tenant.update({
      where: { id: tenantId },
      data: {
        databaseStatus: 'READY',
        databaseName: createResult.databaseName,
        databaseHost: dbConfig.host,
        databasePort: dbConfig.port,
        databaseUser: dbConfig.user,
        databasePassword: dbConfig.password,
        databaseSSL: dbConfig.ssl,
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
    console.error(`Failed to provision database for tenant ${tenantSlug}:`, error.message);

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
 * Drops a tenant database using pg Client
 */
export async function dropTenantDatabase(
  tenantName: string,
  config?: Partial<TenantDbConfig>
): Promise<{ success: boolean; error?: string }> {
  const dbConfig = { ...getDefaultDbConfig(), ...config };
  const dbName = generateTenantDbName(tenantName);

  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres',
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    // Terminate existing connections first
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid()
    `, [dbName]);
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await client.end();

    return { success: true };
  } catch (error: any) {
    console.error(`Failed to drop tenant database ${dbName}:`, error.message);
    try { await client.end(); } catch {}
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

    const testResult = await testDatabaseConnection(tenant.databaseConnectionUrl);

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
 * Pushes the latest tenant schema to ALL existing tenant databases.
 * Run on startup to ensure every tenant DB has the current schema.
 * New tenants are handled automatically by provisionTenantDatabase().
 */
export async function migrateAllTenantDatabases(): Promise<void> {
  const tenants = await coreDb.tenant.findMany({
    where: { databaseStatus: 'READY', databaseConnectionUrl: { not: null } },
    select: { id: true, slug: true, databaseConnectionUrl: true },
  });

  if (tenants.length === 0) {
    console.log('[migrate-tenants] No READY tenant databases found, skipping.');
    return;
  }

  console.log(`[migrate-tenants] Pushing schema to ${tenants.length} tenant database(s)...`);

  for (const tenant of tenants) {
    const result = await pushTenantSchema(tenant.databaseConnectionUrl!);
    if (result.success) {
      console.log(`[migrate-tenants] ✓ ${tenant.slug}`);
    } else {
      console.error(`[migrate-tenants] ✗ ${tenant.slug}: ${result.error}`);
    }
  }

  console.log('[migrate-tenants] Done.');
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

/**
 * Syncs usage counts (voters, users, elections, cadres) from all READY tenant
 * databases back into the core Tenant model.
 *
 * This is the only reliable way to get cross-tenant aggregate numbers because
 * each tenant has its own isolated database.
 *
 * Can optionally sync a single tenant by passing its ID.
 */
export interface TenantSyncResult {
  tenantId: string;
  slug: string;
  voters: number;
  users: number;
  elections: number;
  cadres: number;
  success: boolean;
  error?: string;
}

export async function syncTenantCounts(tenantId?: string): Promise<TenantSyncResult[]> {
  const whereClause: any = {
    databaseStatus: 'READY',
  };
  if (tenantId) {
    whereClause.id = tenantId;
  }

  const tenants = await coreDb.tenant.findMany({
    where: whereClause,
    select: {
      id: true,
      slug: true,
      databaseHost: true,
      databaseName: true,
      databaseUser: true,
      databasePassword: true,
      databasePort: true,
      databaseSSL: true,
      databaseConnectionUrl: true,
    },
  });

  if (tenants.length === 0) {
    console.log('[sync-counts] No READY tenant databases found.');
    return [];
  }

  console.log(`[sync-counts] Syncing counts for ${tenants.length} tenant(s)...`);

  const results: TenantSyncResult[] = [];

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      const db = tenantDb as any;

      // Run all counts in parallel for this tenant
      const [voterCount, userCount, electionCount, cadreCount] = await Promise.all([
        db.voter.count().catch(() => 0),
        db.user.count().catch(() => 0),
        db.election.count().catch(() => 0),
        db.cadre.count().catch(() => 0),
      ]);

      // Update the core Tenant record with cached counts
      await coreDb.tenant.update({
        where: { id: tenant.id },
        data: {
          currentVoterCount: voterCount,
          currentUserCount: userCount,
          currentElectionCount: electionCount,
          currentCadreCount: cadreCount,
          countsLastSyncedAt: new Date(),
        },
      });

      const result: TenantSyncResult = {
        tenantId: tenant.id,
        slug: tenant.slug,
        voters: voterCount,
        users: userCount,
        elections: electionCount,
        cadres: cadreCount,
        success: true,
      };

      results.push(result);
      console.log(`[sync-counts] ✓ ${tenant.slug}: ${voterCount} voters, ${userCount} users, ${electionCount} elections, ${cadreCount} cadres`);
    } catch (error: any) {
      results.push({
        tenantId: tenant.id,
        slug: tenant.slug,
        voters: 0,
        users: 0,
        elections: 0,
        cadres: 0,
        success: false,
        error: error.message || 'Unknown error',
      });
      console.error(`[sync-counts] ✗ ${tenant.slug}: ${error.message}`);
    }
  }

  console.log(`[sync-counts] Done. ${results.filter(r => r.success).length}/${results.length} succeeded.`);
  return results;
}
