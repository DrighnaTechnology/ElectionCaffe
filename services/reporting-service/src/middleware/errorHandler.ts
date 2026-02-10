import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@electioncaffe/shared';

const logger = createLogger('reporting-service');

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown[];
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err }, 'Unhandled error');

  const statusCode = err.statusCode || 500;
  const code = err.code || 'E5001';
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details && { details: err.details }),
    },
  });
}
