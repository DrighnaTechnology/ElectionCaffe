import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@electioncaffe/shared';

const logger = createLogger('voter-service');

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err }, 'Internal server error');
  res.status(500).json({
    success: false,
    error: { code: 'E5001', message: 'Internal server error' },
  });
}
