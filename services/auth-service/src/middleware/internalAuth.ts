import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@electioncaffe/shared';

const logger = createLogger('internal-auth');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

/**
 * Middleware to guard internal (service-to-service) endpoints.
 * Validates the x-internal-key header against the INTERNAL_API_KEY env var.
 * Only allows calls from other services — blocks external/browser requests.
 */
export function internalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-key'] as string;

  if (!INTERNAL_API_KEY) {
    logger.error('INTERNAL_API_KEY is not configured');
    res.status(500).json({ success: false, error: { code: 'E5001', message: 'Internal auth not configured' } });
    return;
  }

  if (!key || key !== INTERNAL_API_KEY) {
    logger.warn({ path: req.path }, 'Rejected internal API call — invalid key');
    res.status(403).json({ success: false, error: { code: 'E1003', message: 'Forbidden' } });
    return;
  }

  next();
}
