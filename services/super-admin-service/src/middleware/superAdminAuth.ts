import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { coreDb as prisma } from '@electioncaffe/database';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

export interface SuperAdminPayload {
  id: string;
  email: string;
  type: 'super_admin';
}

declare global {
  namespace Express {
    interface Request {
      superAdmin?: SuperAdminPayload;
    }
  }
}

export const superAdminAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1001',
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as SuperAdminPayload;

    if (decoded.type !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'E1005',
          message: 'Access denied. Super Admin only.',
        },
      });
    }

    // Verify super admin still exists and is active
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: decoded.id },
    });

    if (!superAdmin || !superAdmin.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1001',
          message: 'Invalid or inactive super admin',
        },
      });
    }

    req.superAdmin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1003',
          message: 'Token expired',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'E1004',
        message: 'Invalid token',
      },
    });
  }
};

// Alias for backward compatibility
export const superAdminAuth = superAdminAuthMiddleware;
