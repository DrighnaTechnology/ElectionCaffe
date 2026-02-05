/**
 * ElectionCaffe Database Package
 *
 * Multi-database architecture:
 * - Core Database (ElectionCaffeCore): Super Admin, system config, tenant metadata
 * - Tenant Databases (EC_<TenantName>): All tenant-specific data
 *
 * Usage:
 * - For Super Admin operations: import { coreDb } from '@electioncaffe/database'
 * - For Tenant operations: import { getTenantClient } from '@electioncaffe/database'
 * - Legacy (single database): import { prisma } from '@electioncaffe/database'
 */

// Legacy client (for backward compatibility during migration)
export * from './client.js';

// Core database client (ElectionCaffeCore)
export { coreDb, CorePrismaClient } from './clients/core-client.js';

// Tenant database client management
export {
  getTenantClient,
  getTenantClientBySlug,
  generateTenantDbName,
  generateTenantDbUrl,
  disconnectTenantClient,
  disconnectAllTenantClients,
  getCachedConnectionCount,
  getCachedTenantIds,
  TenantPrismaClient,
} from './clients/tenant-client.js';

// Database manager for provisioning
export {
  createTenantDatabase,
  migrateTenantDatabase,
  pushTenantSchema,
  testDatabaseConnection,
  provisionTenantDatabase,
  dropTenantDatabase,
  checkTenantDatabaseHealth,
  getTenantDatabaseStatuses,
  getDefaultDbConfig,
} from './clients/db-manager.js';
export type { TenantDbConfig, CreateTenantDbResult } from './clients/db-manager.js';

// Re-export all Prisma types from the main client (legacy)
export * from '@prisma/client';
