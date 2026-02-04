import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { coreDb, getTenantClientBySlug } from '@electioncaffe/database';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  successResponse,
  errorResponse,
  generateOTP,
} from '@electioncaffe/shared';
import type { UserPayload, LoginResponse } from '@electioncaffe/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 [AUTH] Login attempt received:', { body: req.body });

      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        console.log('❌ [AUTH] Validation failed:', validation.error.errors);
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const { mobile, email, password, tenantSlug } = validation.data;
      console.log('✅ [AUTH] Validation passed:', { mobile, email, tenantSlug });

      // Step 1: Find tenant in core database
      console.log('🔧 [AUTH] Environment check:', {
        CORE_DATABASE_URL: process.env.CORE_DATABASE_URL ? 'SET' : 'NOT SET',
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      });

      let tenant;
      if (tenantSlug) {
        console.log(`🔍 [AUTH] Looking up tenant by slug: "${tenantSlug}"`);
        try {
          tenant = await coreDb.tenant.findUnique({ where: { slug: tenantSlug } });
        } catch (dbError) {
          console.error('💥 [AUTH] Database error during tenant lookup:', dbError);
          throw dbError;
        }
      } else {
        console.log('🔍 [AUTH] No tenant slug provided, getting first active tenant');
        // Get first active tenant as default
        tenant = await coreDb.tenant.findFirst({ where: { status: 'ACTIVE' } });
      }

      console.log('📋 [AUTH] Tenant lookup result:', tenant ? { id: tenant.id, slug: tenant.slug, name: tenant.name, status: tenant.status } : 'null');

      if (!tenant) {
        console.log('❌ [AUTH] Tenant not found - returning 404');
        res.status(404).json(errorResponse('E3001', 'Tenant not found'));
        return;
      }

      // Check if tenant database is ready
      if (tenant.databaseStatus !== 'READY') {
        res.status(503).json(errorResponse('E5003', 'Tenant database not available'));
        return;
      }

      // Step 2: Connect to tenant database
      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      // Step 3: Find user in tenant database
      const whereClause: any = {};
      if (mobile) {
        whereClause.mobile = mobile;
      } else if (email) {
        whereClause.email = email;
      }
      whereClause.tenantId = tenant.id;

      const user = await tenantDb.user.findFirst({
        where: whereClause,
      });

      if (!user) {
        res.status(401).json(errorResponse('E1002', 'Invalid credentials'));
        return;
      }

      if (user.status !== 'ACTIVE') {
        res.status(403).json(errorResponse('E1005', 'Account is not active'));
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json(errorResponse('E1002', 'Invalid credentials'));
        return;
      }

      // Generate tokens
      const userPayload: UserPayload = {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email || undefined,
        mobile: user.mobile,
        role: user.role as UserPayload['role'],
        permissions: user.permissions as string[] || [],
      };

      const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
      const refreshToken = jwt.sign({ id: user.id, tenantId: tenant.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

      // Save refresh token in tenant database
      await tenantDb.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Update last login
      await tenantDb.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const response: LoginResponse = {
        accessToken,
        refreshToken,
        user: userPayload,
        expiresIn: 15 * 60, // 15 minutes in seconds
      };

      res.json(successResponse(response));
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const { firstName, lastName, mobile, email, password, tenantSlug } = validation.data;

      // Find tenant in core database
      let tenant;
      if (tenantSlug) {
        tenant = await coreDb.tenant.findUnique({ where: { slug: tenantSlug } });
      } else {
        tenant = await coreDb.tenant.findFirst({ where: { status: 'ACTIVE' } });
      }

      if (!tenant) {
        res.status(404).json(errorResponse('E3001', 'Tenant not found'));
        return;
      }

      if (tenant.databaseStatus !== 'READY') {
        res.status(503).json(errorResponse('E5003', 'Tenant database not available'));
        return;
      }

      // Connect to tenant database
      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      // Check if user already exists
      const existingUser = await tenantDb.user.findFirst({
        where: { tenantId: tenant.id, mobile },
      });

      if (existingUser) {
        res.status(409).json(errorResponse('E3002', 'User with this mobile already exists'));
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user in tenant database
      const user = await tenantDb.user.create({
        data: {
          tenantId: tenant.id,
          firstName,
          lastName,
          mobile,
          email,
          passwordHash,
          role: 'VOLUNTEER',
          status: 'ACTIVE',
        },
      });

      res.status(201).json(successResponse({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
      }));
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json(errorResponse('E2003', 'Refresh token is required'));
        return;
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; tenantId: string };

      // Get tenant from core database
      const tenant = await coreDb.tenant.findUnique({ where: { id: decoded.tenantId } });
      if (!tenant || tenant.databaseStatus !== 'READY') {
        res.status(401).json(errorResponse('E1004', 'Invalid refresh token'));
        return;
      }

      // Connect to tenant database
      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      // Check if token exists in tenant database
      const storedToken = await tenantDb.refreshToken.findFirst({
        where: {
          userId: decoded.id,
          token: refreshToken,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        res.status(401).json(errorResponse('E1004', 'Invalid refresh token'));
        return;
      }

      // Get user from tenant database
      const user = await tenantDb.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || user.status !== 'ACTIVE') {
        res.status(401).json(errorResponse('E1004', 'User not found or inactive'));
        return;
      }

      // Generate new access token
      const userPayload: UserPayload = {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email || undefined,
        mobile: user.mobile,
        role: user.role as UserPayload['role'],
        permissions: user.permissions as string[] || [],
      };

      const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

      res.json(successResponse({
        accessToken,
        expiresIn: 15 * 60,
      }));
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json(errorResponse('E1003', 'Refresh token expired'));
        return;
      }
      console.error('Refresh token error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      const tenantId = req.headers['x-tenant-id'] as string;
      const { refreshToken } = req.body;

      if (!tenantId) {
        res.status(400).json(errorResponse('E2003', 'Tenant ID is required'));
        return;
      }

      // Get tenant and connect to tenant database
      const tenant = await coreDb.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant || tenant.databaseStatus !== 'READY') {
        res.json(successResponse({ message: 'Logged out successfully' }));
        return;
      }

      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      if (refreshToken) {
        await tenantDb.refreshToken.deleteMany({
          where: { userId, token: refreshToken },
        });
      } else {
        // Delete all refresh tokens for user
        await tenantDb.refreshToken.deleteMany({
          where: { userId },
        });
      }

      res.json(successResponse({ message: 'Logged out successfully' }));
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      const tenantId = req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        res.status(400).json(errorResponse('E2003', 'Tenant ID is required'));
        return;
      }

      // Get tenant from core database
      const tenant = await coreDb.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant || tenant.databaseStatus !== 'READY') {
        res.status(404).json(errorResponse('E3001', 'Tenant not found'));
        return;
      }

      // Connect to tenant database
      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      const user = await tenantDb.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json(errorResponse('E3001', 'User not found'));
        return;
      }

      res.json(successResponse({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
        profilePhotoUrl: user.profilePhotoUrl,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logoUrl: tenant.logoUrl,
        },
      }));
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      const tenantId = req.headers['x-tenant-id'] as string;
      const { firstName, lastName, email, profilePhotoUrl } = req.body;

      if (!tenantId) {
        res.status(400).json(errorResponse('E2003', 'Tenant ID is required'));
        return;
      }

      const tenant = await coreDb.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant || tenant.databaseStatus !== 'READY') {
        res.status(404).json(errorResponse('E3001', 'Tenant not found'));
        return;
      }

      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      const user = await tenantDb.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && { email }),
          ...(profilePhotoUrl && { profilePhotoUrl }),
        },
      });

      res.json(successResponse({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
        profilePhotoUrl: user.profilePhotoUrl,
      }));
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string;
      const tenantId = req.headers['x-tenant-id'] as string;

      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      if (!tenantId) {
        res.status(400).json(errorResponse('E2003', 'Tenant ID is required'));
        return;
      }

      const tenant = await coreDb.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant || tenant.databaseStatus !== 'READY') {
        res.status(404).json(errorResponse('E3001', 'Tenant not found'));
        return;
      }

      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      const { currentPassword, newPassword } = validation.data;

      const user = await tenantDb.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json(errorResponse('E3001', 'User not found'));
        return;
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json(errorResponse('E1002', 'Current password is incorrect'));
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await tenantDb.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Invalidate all refresh tokens
      await tenantDb.refreshToken.deleteMany({ where: { userId } });

      res.json(successResponse({ message: 'Password changed successfully' }));
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { mobile, tenantSlug } = req.body;

      if (!mobile) {
        res.status(400).json(errorResponse('E2003', 'Mobile number is required'));
        return;
      }

      // Find tenant
      let tenant;
      if (tenantSlug) {
        tenant = await coreDb.tenant.findUnique({ where: { slug: tenantSlug } });
      } else {
        tenant = await coreDb.tenant.findFirst({ where: { status: 'ACTIVE' } });
      }

      if (!tenant || tenant.databaseStatus !== 'READY') {
        res.json(successResponse({ message: 'If the mobile number exists, an OTP has been sent' }));
        return;
      }

      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      const user = await tenantDb.user.findFirst({ where: { mobile, tenantId: tenant.id } });

      if (!user) {
        // Don't reveal if user exists
        res.json(successResponse({ message: 'If the mobile number exists, an OTP has been sent' }));
        return;
      }

      // Generate OTP
      const otp = generateOTP(6);

      // Store OTP
      await tenantDb.oTP.create({
        data: {
          userId: user.id,
          code: otp,
          type: 'password_reset',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      });

      // In production, send OTP via SMS
      console.log(`OTP for ${mobile}: ${otp}`);

      res.json(successResponse({
        message: 'OTP has been sent to your mobile number',
        // Only for development
        ...(process.env.NODE_ENV === 'development' && { otp }),
      }));
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { mobile, otp, tenantSlug } = req.body;

      if (!mobile || !otp) {
        res.status(400).json(errorResponse('E2003', 'Mobile and OTP are required'));
        return;
      }

      // Find tenant
      let tenant;
      if (tenantSlug) {
        tenant = await coreDb.tenant.findUnique({ where: { slug: tenantSlug } });
      } else {
        tenant = await coreDb.tenant.findFirst({ where: { status: 'ACTIVE' } });
      }

      if (!tenant || tenant.databaseStatus !== 'READY') {
        res.status(400).json(errorResponse('E1007', 'Invalid OTP'));
        return;
      }

      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      const user = await tenantDb.user.findFirst({ where: { mobile, tenantId: tenant.id } });

      if (!user) {
        res.status(400).json(errorResponse('E1007', 'Invalid OTP'));
        return;
      }

      const validOTP = await tenantDb.oTP.findFirst({
        where: {
          userId: user.id,
          code: otp,
          type: 'password_reset',
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
      });

      if (!validOTP) {
        res.status(400).json(errorResponse('E1007', 'Invalid or expired OTP'));
        return;
      }

      // Generate a temporary token for password reset
      const resetToken = jwt.sign(
        { userId: user.id, otpId: validOTP.id, tenantId: tenant.id },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      res.json(successResponse({
        message: 'OTP verified successfully',
        resetToken,
      }));
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        res.status(400).json(errorResponse('E2003', 'Reset token and new password are required'));
        return;
      }

      // Verify reset token
      const decoded = jwt.verify(resetToken, JWT_SECRET) as { userId: string; otpId: string; tenantId: string };

      // Get tenant
      const tenant = await coreDb.tenant.findUnique({ where: { id: decoded.tenantId } });
      if (!tenant || tenant.databaseStatus !== 'READY') {
        res.status(400).json(errorResponse('E1006', 'Invalid reset token'));
        return;
      }

      const tenantDb = await getTenantClientBySlug(
        tenant.slug,
        {
          databaseHost: tenant.databaseHost,
          databaseName: tenant.databaseName,
          databaseUser: tenant.databaseUser,
          databasePassword: tenant.databasePassword,
          databasePort: tenant.databasePort,
          databaseSSL: tenant.databaseSSL,
          databaseConnectionUrl: tenant.databaseConnectionUrl,
        },
        tenant.id
      );

      // Mark OTP as used
      await tenantDb.oTP.update({
        where: { id: decoded.otpId },
        data: { usedAt: new Date() },
      });

      // Update password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await tenantDb.user.update({
        where: { id: decoded.userId },
        data: { passwordHash },
      });

      // Invalidate all refresh tokens
      await tenantDb.refreshToken.deleteMany({ where: { userId: decoded.userId } });

      res.json(successResponse({ message: 'Password reset successfully' }));
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(400).json(errorResponse('E1006', 'Reset token expired'));
        return;
      }
      console.error('Reset password error:', error);
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }
}
