import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '@electioncaffe/shared';

const logger = createLogger('super-admin-service');

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({ err }, 'Unhandled error');

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'E2001',
        message: 'Validation error',
        details: err.errors,
      },
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'E5001',
      message: err.message || 'Internal server error',
    },
  });
};
