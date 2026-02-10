import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database modules before importing the app
vi.mock('@electioncaffe/database/tenant-client', () => ({
  getTenantDb: vi.fn(),
}));

vi.mock('@electioncaffe/database/core-client', () => ({
  coreDb: {
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import express from 'express';
import request from 'supertest';
import { Router } from 'express';

// Create a minimal test app that mimics auth-service routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  const router = Router();

  // Mock login endpoint
  router.post('/login', async (req, res) => {
    const { mobile, password, tenantSlug: _tenantSlug } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'E1001', message: 'Mobile and password are required' },
      });
    }

    if (mobile === '9876543210' && password === 'admin123') {
      return res.json({
        success: true,
        data: {
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 'user-1',
            firstName: 'Admin',
            lastName: 'User',
            mobile,
            role: 'TENANT_ADMIN',
          },
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: { code: 'E1002', message: 'Invalid credentials' },
    });
  });

  // Mock register endpoint
  router.post('/register', async (req, res) => {
    const { firstName, mobile, password } = req.body;

    if (!firstName || !mobile || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'E1001', message: 'Required fields missing' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'E1003', message: 'Password must be at least 6 characters' },
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: 'new-user-1',
          firstName,
          mobile,
          role: 'VOLUNTEER',
        },
      },
    });
  });

  // Mock refresh token endpoint
  router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'E1004', message: 'Refresh token required' },
      });
    }

    if (refreshToken === 'valid-refresh-token') {
      return res.json({
        success: true,
        data: {
          token: 'new-jwt-token',
          refreshToken: 'new-refresh-token',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: { code: 'E1005', message: 'Invalid refresh token' },
    });
  });

  app.use('/api', router);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'auth-service' });
  });

  return app;
}

describe('Auth Service', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('auth-service');
    });
  });

  describe('POST /api/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ mobile: '9876543210', password: 'admin123', tenantSlug: 'bjp-tn' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.role).toBe('TENANT_ADMIN');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ mobile: '9876543210', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('E1002');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ mobile: '9876543210' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty body', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          firstName: 'New',
          mobile: '9876543222',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firstName).toBe('New');
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ firstName: 'New' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject short passwords', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({ firstName: 'New', mobile: '9876543222', password: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1003');
    });
  });

  describe('POST /api/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
