import express from 'express';
import cors from 'cors';

import { reportRoutes } from './routes/reports.js';
import { dataCaffeRoutes } from './routes/datacaffe.js';
import { SERVICE_PORTS, createLogger } from '@electioncaffe/shared';

export const logger = createLogger('reporting-service');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'reporting-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/reports', reportRoutes);
app.use('/api/datacaffe', dataCaffeRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Internal server error');
  res.status(500).json({ success: false, error: { code: 'E5001', message: 'Internal server error' } });
});

const PORT = process.env.PORT || SERVICE_PORTS.REPORTING;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Reporting Service started');
});
