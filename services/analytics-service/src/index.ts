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
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
  });
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

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Analytics Service started');
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
