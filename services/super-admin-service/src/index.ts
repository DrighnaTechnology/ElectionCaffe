import express from 'express';
import cors from 'cors';

import { authRoutes } from './routes/auth.js';
import { tenantsRoutes } from './routes/tenants.js';
import { featuresRoutes } from './routes/features.js';
import { systemRoutes } from './routes/system.js';
import { invitationsRoutes } from './routes/invitations.js';
import { licensesRoutes } from './routes/licenses.js';
import { aiProvidersRoutes } from './routes/ai-providers.js';
import { aiFeaturesRoutes } from './routes/ai-features.js';
import { aiCreditsRoutes } from './routes/ai-credits.js';
import { ecIntegrationRoutes } from './routes/ec-integration.js';
import { newsRoutes } from './routes/news.js';
import { actionsRoutes } from './routes/actions.js';
import { databasesRoutes } from './routes/databases.js';
import { errorHandler } from './middleware/errorHandler.js';
import { SERVICE_PORTS, createLogger, validateEnv, metricsMiddleware, metricsEndpoint } from '@electioncaffe/shared';

validateEnv('super-admin-service');

export const logger = createLogger('super-admin-service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// Health check
app.get('/health', (_req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'super-admin-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
  });
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// Routes
app.use('/api/super-admin/auth', authRoutes);
app.use('/api/super-admin/tenants', tenantsRoutes);
app.use('/api/super-admin/features', featuresRoutes);
app.use('/api/super-admin/system', systemRoutes);
app.use('/api/super-admin/invitations', invitationsRoutes);
app.use('/api/super-admin/licenses', licensesRoutes);
app.use('/api/super-admin/ai/providers', aiProvidersRoutes);
app.use('/api/super-admin/ai/features', aiFeaturesRoutes);
app.use('/api/super-admin/ai/credits', aiCreditsRoutes);
app.use('/api/super-admin/ec-integration', ecIntegrationRoutes);
app.use('/api/super-admin/news', newsRoutes);
app.use('/api/super-admin/actions', actionsRoutes);
app.use('/api/super-admin/databases', databasesRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.SUPER_ADMIN;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Super Admin Service started');
});

function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
