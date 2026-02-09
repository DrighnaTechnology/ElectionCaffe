import express from 'express';
import cors from 'cors';

import { electionRoutes } from './routes/elections.js';
import { partRoutes } from './routes/parts.js';
import { sectionRoutes } from './routes/sections.js';
import { masterDataRoutes } from './routes/masterData.js';
import { candidateRoutes } from './routes/candidates.js';
import { surveyRoutes } from './routes/surveys.js';
import { errorHandler } from './middleware/errorHandler.js';
import { SERVICE_PORTS, createLogger } from '@electioncaffe/shared';

export const logger = createLogger('election-service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
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
  logger.info({ port: PORT }, 'Election Service running');
});
