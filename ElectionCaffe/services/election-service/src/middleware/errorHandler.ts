import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown[];
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

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
