// CRITICAL: Load environment variables FIRST, before ANY other imports
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root directory - MUST happen before any database imports
dotenv.config({ path: resolve(__dirname, '../../../.env') });

// Verify environment variables are loaded
console.log('🔧 [STARTUP] Environment variables loaded:', {
  CORE_DATABASE_URL: process.env.CORE_DATABASE_URL ? 'SET' : 'NOT SET',
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
});

// CRITICAL: Clear any cached database clients to force re-initialization with correct env vars
// This is necessary because tsx watch mode caches the globalThis singleton
if (globalThis.coreDbClient) {
  console.log('🔄 [STARTUP] Clearing cached coreDb singleton...');
  try {
    globalThis.coreDbClient.$disconnect().catch(() => {});
  } catch (e) {
    console.log('⚠️  [STARTUP] Error disconnecting cached client:', e);
  }
  globalThis.coreDbClient = undefined;
  console.log('✅ [STARTUP] Cached singleton cleared');
}

// NOW import everything else
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { tenantRoutes } from './routes/tenant.js';
import { invitationRoutes } from './routes/invitations.js';
import { organizationRoutes } from './routes/organization.js';
import { ecDataRoutes } from './routes/ec-data.js';
import { tenantNewsRoutes } from './routes/tenant-news.js';
import { tenantActionsRoutes } from './routes/tenant-actions.js';
import { nbBroadcastRoutes } from './routes/nb-broadcast.js';
import { websiteBuilderRoutes } from './routes/website-builder.js';
import { fundManagementRoutes } from './routes/fund-management.js';
import { inventoryManagementRoutes } from './routes/inventory-management.js';
import { eventManagementRoutes } from './routes/event-management.js';
import { internalNotificationsRoutes } from './routes/internal-notifications.js';
import { internalChatRoutes } from './routes/internal-chat.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireFeature } from './middleware/requireFeature.js';
import { SERVICE_PORTS } from '@electioncaffe/shared';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/ec-data', ecDataRoutes);
app.use('/api/news', tenantNewsRoutes);
app.use('/api/actions', tenantActionsRoutes);
app.use('/api/nb', nbBroadcastRoutes);
app.use('/api/website', websiteBuilderRoutes);
app.use('/api/funds', requireFeature('fund_management'), fundManagementRoutes);
app.use('/api/inventory', requireFeature('inventory_management'), inventoryManagementRoutes);
app.use('/api/events', eventManagementRoutes);
app.use('/api/notifications', internalNotificationsRoutes);
app.use('/api/chat', internalChatRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.AUTH;

app.listen(PORT, () => {
  logger.info(`🔐 Auth Service running on http://localhost:${PORT}`);
});
