import express from 'express';
import cors from 'cors';

import { voterRoutes } from './routes/voters.js';
import { familyRoutes } from './routes/families.js';
import { errorHandler } from './middleware/errorHandler.js';
import { SERVICE_PORTS, createLogger } from '@electioncaffe/shared';

export const logger = createLogger('voter-service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'voter-service',
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
app.use('/api/voters', voterRoutes);
app.use('/api/families', familyRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.VOTER;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Voter Service started');
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
