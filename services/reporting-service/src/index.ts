import express from 'express';
import cors from 'cors';

import { reportRoutes } from './routes/reports.js';
import { dataCaffeRoutes } from './routes/datacaffe.js';
import { errorHandler } from './middleware/errorHandler.js';
import { SERVICE_PORTS, createLogger, validateEnv, metricsMiddleware, metricsEndpoint } from '@electioncaffe/shared';

validateEnv('reporting-service');

export const logger = createLogger('reporting-service');

const app = express();

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// Health check
app.get('/health', (_req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'reporting-service',
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
app.use('/api/reports', reportRoutes);
app.use('/api/datacaffe', dataCaffeRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.REPORTING;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Reporting Service started');
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
