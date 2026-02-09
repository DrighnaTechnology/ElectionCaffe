import express from 'express';
import cors from 'cors';

import { aiAnalyticsRoutes } from './routes/ai-analytics.js';
import { aiFeaturesRoutes } from './routes/ai-features.js';
import { SERVICE_PORTS, createLogger } from '@electioncaffe/shared';

export const logger = createLogger('ai-analytics-service');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-analytics-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/ai-analytics', aiAnalyticsRoutes);
app.use('/api/ai/features', aiFeaturesRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Internal server error');
  res.status(500).json({ success: false, error: { code: 'E5001', message: 'Internal server error' } });
});

const PORT = process.env.PORT || SERVICE_PORTS.AI_ANALYTICS;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'AI Analytics Service started');
});
