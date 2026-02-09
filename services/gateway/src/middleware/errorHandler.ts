import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@electioncaffe/shared';

const logger = createLogger('gateway');

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown[];
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Sanitize body to exclude sensitive fields before logging
  const sanitizedBody = req.body ? Object.fromEntries(
    Object.entries(req.body).filter(([key]) => !['password', 'token', 'secret', 'refreshToken'].includes(key))
  ) : undefined;

  logger.error({
    err,
    path: req.path,
    method: req.method,
    body: sanitizedBody,
  });

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

export function createError(
  message: string,
  statusCode: number = 500,
  code: string = 'E5001',
  details?: unknown[]
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}
