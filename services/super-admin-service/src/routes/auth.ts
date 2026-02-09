import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { coreDb as prisma } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  password: z.string().min(6),
});

// Super Admin Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1002',
          message: 'Invalid credentials',
        },
      });
    }

    if (!superAdmin.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'E1005',
          message: 'Account is disabled',
        },
      });
    }

    const isValidPassword = await bcrypt.compare(password, superAdmin.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1002',
          message: 'Invalid credentials',
        },
      });
    }

    // Update last login
    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      {
        id: superAdmin.id,
        email: superAdmin.email,
        type: 'super_admin',
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        superAdmin: {
          id: superAdmin.id,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          email: superAdmin.email,
          mobile: superAdmin.mobile,
          profilePhotoUrl: superAdmin.profilePhotoUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register first Super Admin (only if none exists)
router.post('/register', async (req, res, next) => {
  try {
    // Check if any super admin exists
    const existingCount = await prisma.superAdmin.count();

    if (existingCount > 0) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'E4004',
          message: 'Super Admin already exists. Use existing admin to create new admins.',
        },
      });
    }

    const data = registerSchema.parse(req.body);

    const passwordHash = await bcrypt.hash(data.password, 12);

    const superAdmin = await prisma.superAdmin.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        mobile: data.mobile,
        passwordHash,
      },
    });

    const token = jwt.sign(
      {
        id: superAdmin.id,
        email: superAdmin.email,
        type: 'super_admin',
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        superAdmin: {
          id: superAdmin.id,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          email: superAdmin.email,
          mobile: superAdmin.mobile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current super admin profile
router.get('/profile', superAdminAuthMiddleware, async (req, res, next) => {
  try {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: req.superAdmin!.id },
    });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Super Admin not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: superAdmin.id,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        email: superAdmin.email,
        mobile: superAdmin.mobile,
        profilePhotoUrl: superAdmin.profilePhotoUrl,
        lastLoginAt: superAdmin.lastLoginAt,
        createdAt: superAdmin.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/change-password', superAdminAuthMiddleware, async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    });

    const { currentPassword, newPassword } = schema.parse(req.body);

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: req.superAdmin!.id },
    });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'Super Admin not found',
        },
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, superAdmin.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1002',
          message: 'Current password is incorrect',
        },
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { passwordHash: newPasswordHash },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };
