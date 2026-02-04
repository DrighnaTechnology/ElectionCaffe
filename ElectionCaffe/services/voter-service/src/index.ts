import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { voterRoutes } from './routes/voters.js';
import { familyRoutes } from './routes/families.js';
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
  res.json({ status: 'ok', service: 'voter-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/voters', voterRoutes);
app.use('/api/families', familyRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.VOTER;

app.listen(PORT, () => {
  logger.info(`👥 Voter Service running on http://localhost:${PORT}`);
});
