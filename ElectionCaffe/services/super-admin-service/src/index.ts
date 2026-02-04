import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

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
  res.json({ status: 'ok', service: 'super-admin-service', timestamp: new Date().toISOString() });
});

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

app.listen(PORT, () => {
  logger.info(`Super Admin Service running on http://localhost:${PORT}`);
});
