/**
 * Tenant Database Client Manager
 *
 * Manages dynamic connections to tenant-specific databases (EC_<TenantName>)
 * Each tenant has their own database with all tenant-specific data:
 * - Users, Elections, Voters
 * - News & Broadcast, Events
 * - Fund Management, Inventory
 * - Internal Communications
 */

import { PrismaClient as TenantPrismaClient } from '../../node_modules/.prisma/tenant-client/index.js';

// Connection pool for tenant databases
const tenantClientCache = new Map<string, {
  client: TenantPrismaClient;
  lastAccessed: Date;
  tenantSlug: string;
}>();

// Configuration
const MAX_CACHED_CONNECTIONS = 50;
const CONNECTION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generates the database name for a tenant
 * Format: EC_<TenantName> (spaces replaced with underscores, uppercase)
 */
export function generateTenantDbName(tenantName: string): string {
  // Remove special characters, replace spaces with underscores
  const sanitized = tenantName
    .replace(/[^a-zA-Z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();

  return `EC_${sanitized}`;
}

/**
 * Generates the connection URL for a tenant database
 */
export function generateTenantDbUrl(tenantName: string, options?: {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  ssl?: boolean;
}): string {
  const dbName = generateTenantDbName(tenantName);
  const host = options?.host || process.env.DB_HOST || 'localhost';
  const port = options?.port || parseInt(process.env.DB_PORT || '5432');
  const user = options?.user || process.env.DB_USER || 'postgres';
  const password = options?.password || process.env.DB_PASSWORD || 'postgres';
  const ssl = options?.ssl ?? (process.env.DB_SSL === 'true');

  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${user}:${password}@${host}:${port}/${dbName}${sslParam}`;
}

/**
 * Creates a new Prisma client for a specific tenant database
 */
function createTenantClient(databaseUrl: string): TenantPrismaClient {
  return new TenantPrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
  });
}

/**
 * Gets or creates a Prisma client for a tenant
 * Uses caching to avoid creating new connections for every request
 */
export async function getTenantClient(tenantId: string, databaseUrl: string, tenantSlug?: string): Promise<TenantPrismaClient> {
  // Check if we have a cached connection
  const cached = tenantClientCache.get(tenantId);
  if (cached) {
    cached.lastAccessed = new Date();
    return cached.client;
  }

  // Clean up old connections if we're at capacity
  if (tenantClientCache.size >= MAX_CACHED_CONNECTIONS) {
    await cleanupOldConnections();
  }

  // Create new client
  const client = createTenantClient(databaseUrl);

  // Test the connection
  try {
    await client.$connect();
  } catch (error) {
    console.error(`Failed to connect to tenant database for tenant ${tenantId}:`, error);
    throw new Error(`Database connection failed for tenant: ${tenantId}`);
  }

  // Cache the connection
  tenantClientCache.set(tenantId, {
    client,
    lastAccessed: new Date(),
    tenantSlug: tenantSlug || tenantId,
  });

  return client;
}

/**
 * Gets a tenant client using tenant metadata from the core database
 */
export async function getTenantClientBySlug(
  tenantSlug: string,
  tenantDbConfig: {
    databaseHost?: string | null;
    databaseName?: string | null;
    databaseUser?: string | null;
    databasePassword?: string | null;
    databasePort?: number | null;
    databaseSSL?: boolean;
    databaseConnectionUrl?: string | null;
  },
  tenantId: string
): Promise<TenantPrismaClient> {
  // If a full connection URL is provided, use it
  if (tenantDbConfig.databaseConnectionUrl) {
    return getTenantClient(tenantId, tenantDbConfig.databaseConnectionUrl, tenantSlug);
  }

  // Otherwise, construct the URL from individual parts
  const databaseUrl = generateTenantDbUrl(tenantSlug, {
    host: tenantDbConfig.databaseHost || undefined,
    port: tenantDbConfig.databasePort || undefined,
    user: tenantDbConfig.databaseUser || undefined,
    password: tenantDbConfig.databasePassword || undefined,
    ssl: tenantDbConfig.databaseSSL,
  });

  return getTenantClient(tenantId, databaseUrl, tenantSlug);
}

/**
 * Cleans up old/stale connections from the cache
 */
async function cleanupOldConnections(): Promise<void> {
  const now = new Date().getTime();
  const connectionsToRemove: string[] = [];

  for (const [tenantId, cached] of tenantClientCache.entries()) {
    if (now - cached.lastAccessed.getTime() > CONNECTION_TTL_MS) {
      connectionsToRemove.push(tenantId);
    }
  }

  // Sort by last accessed (oldest first) and remove if still over capacity
  if (connectionsToRemove.length === 0 && tenantClientCache.size >= MAX_CACHED_CONNECTIONS) {
    const sortedEntries = Array.from(tenantClientCache.entries())
      .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());

    // Remove oldest 10% of connections
    const removeCount = Math.ceil(MAX_CACHED_CONNECTIONS * 0.1);
    for (let i = 0; i < removeCount && i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      if (entry) {
        connectionsToRemove.push(entry[0]);
      }
    }
  }

  // Disconnect and remove from cache
  for (const tenantId of connectionsToRemove) {
    const cached = tenantClientCache.get(tenantId);
    if (cached) {
      try {
        await cached.client.$disconnect();
      } catch (error) {
        console.error(`Error disconnecting tenant client for ${tenantId}:`, error);
      }
      tenantClientCache.delete(tenantId);
    }
  }
}

/**
 * Disconnects a specific tenant client from the cache
 */
export async function disconnectTenantClient(tenantId: string): Promise<void> {
  const cached = tenantClientCache.get(tenantId);
  if (cached) {
    try {
      await cached.client.$disconnect();
    } catch (error) {
      console.error(`Error disconnecting tenant client for ${tenantId}:`, error);
    }
    tenantClientCache.delete(tenantId);
  }
}

/**
 * Disconnects all cached tenant clients
 * Useful during application shutdown
 */
export async function disconnectAllTenantClients(): Promise<void> {
  const disconnectPromises: Promise<void>[] = [];

  for (const [tenantId, cached] of tenantClientCache.entries()) {
    disconnectPromises.push(
      cached.client.$disconnect()
        .catch((error) => {
          console.error(`Error disconnecting tenant client for ${tenantId}:`, error);
        })
    );
  }

  await Promise.all(disconnectPromises);
  tenantClientCache.clear();
}

/**
 * Gets the count of cached connections
 */
export function getCachedConnectionCount(): number {
  return tenantClientCache.size;
}

/**
 * Gets a list of currently cached tenant IDs
 */
export function getCachedTenantIds(): string[] {
  return Array.from(tenantClientCache.keys());
}

// Export the tenant Prisma client class for type usage
export { TenantPrismaClient };

// Export all types from tenant schema
export type {
  User,
  RefreshToken,
  OTP,
  Constituency,
  Election,
  Part,
  Section,
  Booth,
  Voter,
  Family,
  Religion,
  CasteCategory,
  Caste,
  SubCaste,
  Language,
  VoterCategory,
  VoterScheme,
  Party,
  Scheme,
  Cadre,
  CadreAssignment,
  CadreLocation,
  VotingHistory,
  VoterVotingHistory,
  Survey,
  SurveyResponse,
  PollDayVote,
  BoothAgent,
  FeedbackIssue,
  Report,
  AIAnalyticsResult,
  VoterSlipTemplate,
  AppBanner,
  ECIntegration,
  ECSyncLog,
  DataCaffeEmbed,
  AuditLog,
  NBParsedNews,
  NBNewsAnalysis,
  NBPartyLine,
  NBSpeechPoint,
  NBActionPlan,
  NBActionExecution,
  NBCampaignSpeech,
  NBBroadcast,
  TenantWebsite,
  WebsitePage,
  WebsiteMedia,
  FundAccount,
  FundDonation,
  FundExpense,
  FundTransaction,
  InventoryCategory,
  InventoryItem,
  InventoryMovement,
  InventoryAllocation,
  PartyEvent,
  EventAttendee,
  EventTask,
  InternalNotification,
  NotificationRecipient,
  ChatConversation,
  ChatParticipant,
  ChatMessage,
  MessageReaction,
  MessageReadReceipt,
  TenantAICredits,
  AICreditTransaction,
  AIUsageLog,
  TenantConfig,
} from '../../node_modules/.prisma/tenant-client/index.js';
