import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { aiAnalyticsRoutes } from './routes/ai-analytics.js';
import { aiFeaturesRoutes } from './routes/ai-features.js';
import { SERVICE_PORTS } from '@electioncaffe/shared';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-analytics-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/ai-analytics', aiAnalyticsRoutes);
app.use('/api/ai/features', aiFeaturesRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: { code: 'E5001', message: 'Internal server error' } });
});

const PORT = process.env.PORT || SERVICE_PORTS.AI_ANALYTICS;

app.listen(PORT, () => {
  logger.info(`🤖 AI Analytics Service running on http://localhost:${PORT}`);
});
