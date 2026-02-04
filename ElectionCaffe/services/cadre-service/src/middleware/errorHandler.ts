import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '@electioncaffe/shared';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);
  res.status(500).json(errorResponse('E5001', err.message || 'Internal server error'));
}
