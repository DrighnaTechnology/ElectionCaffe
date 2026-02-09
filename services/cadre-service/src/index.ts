import express from 'express';
import cors from 'cors';

import { cadreRoutes } from './routes/cadres.js';
import { errorHandler } from './middleware/errorHandler.js';
import { SERVICE_PORTS, createLogger } from '@electioncaffe/shared';

export const logger = createLogger('cadre-service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cadre-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/cadres', cadreRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.CADRE;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Cadre Service started');
});
