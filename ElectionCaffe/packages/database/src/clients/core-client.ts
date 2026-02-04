/**
 * Core Database Client - ElectionCaffeCore
 *
 * This client connects to the core database containing:
 * - Super Admin data
 * - System configuration
 * - Feature flags
 * - Tenant metadata (not tenant data)
 * - License plans
 * - AI configuration
 * - Website templates
 */

import { PrismaClient as CorePrismaClient } from '../../node_modules/.prisma/core-client/index.js';

declare global {
  var coreDbClient: CorePrismaClient | undefined;
}

const coreClientSingleton = () => {
  const databaseUrl = process.env.CORE_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('CORE_DATABASE_URL or DATABASE_URL environment variable is required');
  }

  // Log the actual database name being used
  const dbName = databaseUrl.split('/').pop()?.split('?')[0];
  console.log('🔧 [DATABASE] Creating new CorePrismaClient');
  console.log('   Database: ' + dbName);
  console.log('   Full URL:', databaseUrl);

  return new CorePrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn', 'query']
      : ['error'],
  });
};

// Lazy initialization - get or create singleton
const getCoreDb = () => {
  if (!globalThis.coreDbClient) {
    globalThis.coreDbClient = coreClientSingleton();
  }
  return globalThis.coreDbClient;
};

// Export a proxy that lazily initializes the client
export const coreDb = new Proxy({} as CorePrismaClient, {
  get: (_target, prop) => {
    const client = getCoreDb();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Export types from core client
export { CorePrismaClient };
export type {
  Tenant,
  SuperAdmin,
  FeatureFlag,
  TenantFeature,
  LicensePlan,
  TenantLicense,
  Invitation,
  SystemConfig,
  AIProvider,
  AIFeature,
  AICreditPackage,
  WebsiteTemplate,
  TenantSession,
  PlatformAuditLog,
  AIAdminAlert,
  ECIntegrationConfig,
} from '../../node_modules/.prisma/core-client/index.js';
