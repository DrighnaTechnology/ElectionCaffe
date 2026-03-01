import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';

import { cadreRoutes } from './routes/cadres.js';
import { pollDayRoutes } from './routes/pollDay.js';
import { warRoomRoutes } from './routes/warRoom.js';
import { gotvRoutes } from './routes/gotv.js';
import { incidentRoutes } from './routes/incidents.js';
import { agentOpsRoutes } from './routes/agentOps.js';

import { startSnapshotWorker } from './workers/snapshotWorker.js';
import { errorHandler } from './middleware/errorHandler.js';
import { SERVICE_PORTS, createLogger, validateEnv, metricsMiddleware, metricsEndpoint } from '@electioncaffe/shared';

validateEnv('cadre-service');

export const logger = createLogger('cadre-service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(metricsMiddleware);

// Health check
app.get('/health', (_req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'cadre-service',
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
app.use('/api/cadres', cadreRoutes);
app.use('/api/poll-day', pollDayRoutes);
app.use('/api/poll-day/war-room', warRoomRoutes);
app.use('/api/poll-day/gotv', gotvRoutes);
app.use('/api/poll-day/incidents', incidentRoutes);
app.use('/api/poll-day/agents', agentOpsRoutes);


// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.CADRE;

let stopSnapshotWorker: (() => void) | null = null;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Cadre Service started');

  // Start the snapshot worker for periodic turnout captures
  stopSnapshotWorker = startSnapshotWorker();
});

function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, closing server...');
  if (stopSnapshotWorker) stopSnapshotWorker();
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
