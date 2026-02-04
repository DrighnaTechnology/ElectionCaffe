import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { cadreRoutes } from './routes/cadres.js';
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
app.use(express.json({ limit: '50mb' }));
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cadre-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/cadres', cadreRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.CADRE;

app.listen(PORT, () => {
  logger.info(`🎖️ Cadre Service running on http://localhost:${PORT}`);
});
