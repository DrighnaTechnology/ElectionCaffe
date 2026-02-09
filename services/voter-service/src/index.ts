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
  res.json({ status: 'ok', service: 'voter-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/voters', voterRoutes);
app.use('/api/families', familyRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || SERVICE_PORTS.VOTER;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Voter Service started');
});
