import express from 'express';
import cors from 'cors';

import { dashboardRoutes } from './routes/dashboard.js';
import { analyticsRoutes } from './routes/analytics.js';
import { SERVICE_PORTS, createLogger } from '@electioncaffe/shared';

export const logger = createLogger('analytics-service');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'analytics-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Internal server error');
  res.status(500).json({ success: false, error: { code: 'E5001', message: 'Internal server error' } });
});

const PORT = process.env.PORT || SERVICE_PORTS.ANALYTICS;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Analytics Service started');
});
