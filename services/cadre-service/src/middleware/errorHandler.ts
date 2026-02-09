import { Request, Response, NextFunction } from 'express';
import { errorResponse, createLogger } from '@electioncaffe/shared';

const logger = createLogger('cadre-service');

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, 'Internal server error');
  res.status(500).json(errorResponse('E5001', err.message || 'Internal server error'));
}
