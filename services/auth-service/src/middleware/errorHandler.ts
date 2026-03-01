import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');

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
  // Client disconnected before we could respond — swallow silently
  if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET' || (err as any).type === 'request.aborted') {
    logger.warn({ code: err.code, message: err.message }, 'Client disconnected, skipping response');
    return;
  }

  logger.error({ err }, 'Unhandled error');

  // Headers already sent (e.g. streaming response that errored mid-flight)
  if (res.headersSent) {
    return;
  }

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
