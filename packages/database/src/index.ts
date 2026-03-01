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
 */

// Core database client (ElectionCaffeCore) + all core model types + enums
export { coreDb, CorePrismaClient } from './clients/core-client.js';
export {
  TenantType,
  TenantStatus,
  DatabaseType,
  DatabaseStatus,
  LicensePlanType,
  LicenseStatus,
  LicenseBillingCycle,
  UsageAlertLevel,
  AIProviderType,
  AIProviderStatus,
  AIFeatureStatus,
  InvitationStatus,
  InvitationType,
  WebsiteTemplateType,
} from './clients/core-client.js';
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
} from './clients/core-client.js';

// Tenant database client management + types + enums
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
  UserRole,
  UserStatus,
  ElectionType,
  ElectionStatus,
  Gender,
  RelationType,
  PoliticalLeaning,
  InfluenceLevel,
  PartType,
  VulnerabilityType,
  WebsiteStatus,
  TenantWebsiteTemplateType,
  FundTransactionType,
  EventStatus,
  NotificationStatus,
  ConversationType,
  SchemeProvider,
  SchemeValueType,
  NominationStatus,
} from './clients/tenant-client.js';

// Database manager for provisioning
export {
  createTenantDatabase,
  migrateTenantDatabase,
  pushTenantSchema,
  migrateAllTenantDatabases,
  testDatabaseConnection,
  provisionTenantDatabase,
  dropTenantDatabase,
  checkTenantDatabaseHealth,
  getTenantDatabaseStatuses,
  getDefaultDbConfig,
  syncTenantCounts,
} from './clients/db-manager.js';
export type { TenantDbConfig, CreateTenantDbResult, TenantSyncResult } from './clients/db-manager.js';

// Credit signature for tamper detection
export { signCredits, verifyCredits } from './credit-signature.js';
