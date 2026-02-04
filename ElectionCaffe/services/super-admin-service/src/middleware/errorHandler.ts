import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

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
