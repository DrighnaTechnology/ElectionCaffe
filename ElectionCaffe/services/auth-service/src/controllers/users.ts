import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  paginationSchema,
  successResponse,
  errorResponse,
  createPaginationMeta,
  calculateSkip,
} from '@electioncaffe/shared';

export class UserController {
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const validation = paginationSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const { page, limit, search, sort, order } = validation.data;
      const skip = calculateSkip(page, limit);

      const where: any = {};

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } },
        ];
      }

      const [users, total] = await Promise.all([
        tenantDb.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            profilePhotoUrl: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        }),
        tenantDb.user.count({ where }),
      ]);

      res.json(successResponse(users, createPaginationMeta(total, page, limit)));
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const user = await tenantDb.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          profilePhotoUrl: true,
          role: true,
          permissions: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json(errorResponse('E3001', 'User not found'));
        return;
      }

      res.json(successResponse(user));
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const tenantDb = await getTenantDb(req);
      const { firstName, lastName, email, mobile, password, role } = req.body;

      // Check if user already exists
      const existingUser = await tenantDb.user.findFirst({
        where: { mobile },
      });

      if (existingUser) {
        res.status(409).json(errorResponse('E3002', 'User with this mobile already exists'));
        return;
      }

      const passwordHash = await bcrypt.hash(password || 'password123', 10);

      const user = await tenantDb.user.create({
        data: {
          tenantId,
          firstName,
          lastName,
          email,
          mobile,
          passwordHash,
          role: role || 'VOLUNTEER',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      res.status(201).json(successResponse(user));
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const { firstName, lastName, email, profilePhotoUrl, permissions } = req.body;

      const existingUser = await tenantDb.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        res.status(404).json(errorResponse('E3001', 'User not found'));
        return;
      }

      const user = await tenantDb.user.update({
        where: { id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(email !== undefined && { email }),
          ...(profilePhotoUrl !== undefined && { profilePhotoUrl }),
          ...(permissions !== undefined && { permissions }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
          profilePhotoUrl: true,
          role: true,
          permissions: true,
          status: true,
          updatedAt: true,
        },
      });

      res.json(successResponse(user));
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const requestingUserId = req.headers['x-user-id'] as string;
      const { id } = req.params;

      if (id === requestingUserId) {
        res.status(400).json(errorResponse('E4004', 'Cannot delete your own account'));
        return;
      }

      const existingUser = await tenantDb.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        res.status(404).json(errorResponse('E3001', 'User not found'));
        return;
      }

      await tenantDb.user.delete({ where: { id } });

      res.json(successResponse({ message: 'User deleted successfully' }));
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const requestingUserId = req.headers['x-user-id'] as string;
      const { id } = req.params;
      const { status } = req.body;

      if (id === requestingUserId) {
        res.status(400).json(errorResponse('E4004', 'Cannot change your own status'));
        return;
      }

      if (!['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(status)) {
        res.status(400).json(errorResponse('E2001', 'Invalid status'));
        return;
      }

      const existingUser = await tenantDb.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        res.status(404).json(errorResponse('E3001', 'User not found'));
        return;
      }

      const user = await tenantDb.user.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });

      // Invalidate refresh tokens if blocking user
      if (status === 'BLOCKED' || status === 'INACTIVE') {
        await tenantDb.refreshToken.deleteMany({ where: { userId: id } });
      }

      res.json(successResponse(user));
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const requestingUserId = req.headers['x-user-id'] as string;
      const requestingUserRole = req.headers['x-user-role'] as string;
      const { id } = req.params;
      const { role } = req.body;

      if (id === requestingUserId) {
        res.status(400).json(errorResponse('E4004', 'Cannot change your own role'));
        return;
      }

      const validRoles = ['TENANT_ADMIN', 'CAMPAIGN_MANAGER', 'COORDINATOR', 'BOOTH_INCHARGE', 'VOLUNTEER', 'AGENT'];
      if (!validRoles.includes(role)) {
        res.status(400).json(errorResponse('E2001', 'Invalid role'));
        return;
      }

      // Only tenant admin or super admin can assign admin roles
      if (role === 'TENANT_ADMIN' && !['SUPER_ADMIN', 'TENANT_ADMIN'].includes(requestingUserRole)) {
        res.status(403).json(errorResponse('E1005', 'Insufficient permissions to assign admin role'));
        return;
      }

      const existingUser = await tenantDb.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        res.status(404).json(errorResponse('E3001', 'User not found'));
        return;
      }

      const user = await tenantDb.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      res.json(successResponse(user));
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }
}
