/**
 * Tenant Database Utility
 *
 * Helper functions for getting the tenant-specific database client
 * based on the tenant ID from request headers.
 */

import { Request } from 'express';
import { coreDb, getTenantClientBySlug, TenantPrismaClient } from '@electioncaffe/database';

/**
 * Gets the tenant database client from request headers
 *
 * Flow:
 * 1. Get tenantId from x-tenant-id header (set by JWT middleware at gateway)
 * 2. Look up tenant config from core database
 * 3. Return tenant-specific Prisma client
 */
export async function getTenantDb(req: Request): Promise<TenantPrismaClient> {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    throw new Error('Tenant ID not found in request headers');
  }

  // Look up tenant from core database
  const tenant = await coreDb.tenant.findUnique({
    where: { id: tenantId },
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

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Get tenant database client
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

  return tenantDb;
}

/**
 * Gets the tenant info from core database
 */
export async function getTenantFromCore(tenantId: string): Promise<any> {
  return coreDb.tenant.findUnique({
    where: { id: tenantId },
  });
}

// Export coreDb for routes that need to access core database
export { coreDb };
