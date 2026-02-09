import { Tenant } from '@prisma/client';

/**
 * Creates feature-specific database tables for a tenant.
 * Feature tables are managed via Prisma migrations, so this is intentionally a no-op.
 * When a new feature requires tenant-specific tables, add them to the tenant Prisma schema
 * and run migrations instead of using raw SQL here.
 */
export async function createFeatureTables(_tenant: Tenant, _featureKey: string): Promise<void> {
  // No-op: feature tables are managed via Prisma migrations
}

/**
 * Drops feature-specific database tables for a tenant.
 * Feature tables are managed via Prisma migrations, so this is intentionally a no-op.
 */
export async function dropFeatureTables(_tenant: Tenant, _featureKey: string): Promise<void> {
  // No-op: feature tables are managed via Prisma migrations
}

/**
 * Checks if feature tables exist for a tenant.
 * Returns false since feature tables are managed via Prisma migrations
 * and existence is tracked through the migration history.
 */
export async function featureTablesExist(_tenant: Tenant, _featureKey: string): Promise<boolean> {
  return false;
}
