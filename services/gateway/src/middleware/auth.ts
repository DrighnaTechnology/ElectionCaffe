import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserPayload } from '@electioncaffe/shared';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      tenantId?: string;
    }
  }
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'E1001',
          message: 'Authorization token required',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'E1001',
          message: 'Invalid authorization header format',
        },
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

    req.user = decoded;
    req.tenantId = decoded.tenantId;

    // Add user info to headers for downstream services
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-tenant-id'] = decoded.tenantId;
    req.headers['x-user-role'] = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'E1003',
          message: 'Token has expired',
        },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'E1004',
          message: 'Invalid token',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'E5001',
        message: 'Authentication error',
      },
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'E1001',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'E1005',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'E1001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const userPermissions = req.user.permissions || [];

    // Super admin has all permissions
    if (userPermissions.includes('*') || req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const hasPermission = permissions.some(perm => {
      // Check exact match
      if (userPermissions.includes(perm)) return true;

      // Check wildcard match (e.g., 'elections:*' matches 'elections:read')
      const [resource] = perm.split(':');
      return userPermissions.includes(`${resource}:*`);
    });

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          code: 'E1005',
          message: 'Permission denied',
        },
      });
      return;
    }

    next();
  };
}
