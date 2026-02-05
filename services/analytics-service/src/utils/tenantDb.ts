import { Request } from 'express';
import { coreDb, getTenantClientBySlug, TenantPrismaClient } from '@electioncaffe/database';

/**
 * Get tenant database client from request headers
 * The gateway middleware injects x-tenant-id header after JWT verification
 */
export async function getTenantDb(req: Request): Promise<TenantPrismaClient> {
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    throw new Error('Tenant ID not found in request headers');
  }

  // Get tenant from core database
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

  // Get tenant-specific database client
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

export { coreDb };
