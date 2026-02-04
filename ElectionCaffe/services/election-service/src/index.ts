import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { electionRoutes } from './routes/elections.js';
import { partRoutes } from './routes/parts.js';
import { sectionRoutes } from './routes/sections.js';
import { masterDataRoutes } from './routes/masterData.js';
import { candidateRoutes } from './routes/candidates.js';
import { surveyRoutes } from './routes/surveys.js';
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
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'election-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api', masterDataRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.ELECTION;

app.listen(PORT, () => {
  logger.info(`🗳️ Election Service running on http://localhost:${PORT}`);
});
