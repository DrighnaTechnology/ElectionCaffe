import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocketIO } from './config/socket.js';
import { SERVICE_PORTS, createLogger } from '@electioncaffe/shared';

export const logger = createLogger('gateway');

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketIO(io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, url: req.url, statusCode: res.statusCode, durationMs: Date.now() - start }, 'request completed');
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { success: false, error: { code: 'E5003', message: 'Too many requests' } },
});
app.use(limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() });
});

// Create proxy - NO body parsing, just forward the raw request
const createServiceProxy = (target: string, pathRewrite?: Record<string, string>) => {
  const options: Options = {
    target,
    changeOrigin: true,
    ...(pathRewrite && { pathRewrite }),
    onError: (err, req, res) => {
      logger.error({ err, path: req.url }, 'Proxy error');
      (res as any).status(503).json({
        success: false,
        error: {
          code: 'E5003',
          message: 'Service temporarily unavailable',
        },
      });
    },
  };
  return createProxyMiddleware(options);
};

// Auth proxy - public routes go directly, others need auth middleware
// Public auth routes (login, register, etc.) - NO auth middleware, NO body parsing
app.use('/api/auth/login', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
app.use('/api/auth/register', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
app.use('/api/auth/refresh', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
app.use('/api/auth/forgot-password', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
app.use('/api/auth/reset-password', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
app.use('/api/auth/verify-otp', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));

// Tenant routes (database settings, etc.) - requires auth
app.use('/api/tenant', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));

// Invitation routes - public routes for accepting/validating invitations
app.use('/api/invitations/validate', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/invitations/accept', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
// Protected invitation routes (creating, managing invitations)
app.use('/api/invitations', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));

// Protected auth routes (profile, change password, logout)
app.use('/api/auth', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));

// Protected service routes - auth middleware first, then proxy
app.use('/api/elections', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ELECTION}`, { '^/api/elections': '/api/elections' }));
app.use('/api/parts', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ELECTION}`, { '^/api/parts': '/api/parts' }));
app.use('/api/sections', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ELECTION}`, { '^/api/sections': '/api/sections' }));
app.use('/api/booths', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ELECTION}`, { '^/api/booths': '/api/booths' }));
app.use('/api/voters', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.VOTER}`, { '^/api/voters': '/api/voters' }));
app.use('/api/families', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.VOTER}`, { '^/api/families': '/api/families' }));
app.use('/api/cadres', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.CADRE}`, { '^/api/cadres': '/api/cadres' }));
app.use('/api/poll-day', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.CADRE}`, { '^/api/poll-day': '/api/poll-day' }));
app.use('/api/analytics', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ANALYTICS}`, { '^/api/analytics': '/api/analytics' }));
app.use('/api/dashboard', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ANALYTICS}`, { '^/api/dashboard': '/api/dashboard' }));
app.use('/api/reports', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.REPORTING}`, { '^/api/reports': '/api/reports' }));
app.use('/api/datacaffe', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.REPORTING}`, { '^/api/datacaffe': '/api/datacaffe' }));
app.use('/api/ai-analytics', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AI_ANALYTICS}`, { '^/api/ai-analytics': '/api/ai-analytics' }));

// EC Data, News, and Actions routes for tenant users (handled by auth-service)
app.use('/api/ec-data', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/news', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/actions', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));

// Super Admin routes - public auth routes
app.use('/api/super-admin/auth/login', createServiceProxy(`http://localhost:${SERVICE_PORTS.SUPER_ADMIN}`));
app.use('/api/super-admin/auth/register', createServiceProxy(`http://localhost:${SERVICE_PORTS.SUPER_ADMIN}`));
// Super Admin routes - protected (no regular auth middleware, handled by service)
app.use('/api/super-admin', createServiceProxy(`http://localhost:${SERVICE_PORTS.SUPER_ADMIN}`));

// Master data routes (handled by election service)
const masterDataRoutes = ['/api/religions', '/api/caste-categories', '/api/castes', '/api/sub-castes', '/api/languages', '/api/parties', '/api/schemes', '/api/voter-categories', '/api/voting-histories', '/api/voter-slips', '/api/banners', '/api/feedback'];
masterDataRoutes.forEach(route => {
  app.use(route, authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ELECTION}`));
});

// Error handler
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'E3001',
      message: 'Route not found',
    },
  });
});

const PORT = process.env.PORT || SERVICE_PORTS.GATEWAY;

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'API Gateway started');
  logger.info({
    routes: {
      auth: `http://localhost:${SERVICE_PORTS.AUTH}`,
      elections: `http://localhost:${SERVICE_PORTS.ELECTION}`,
      voters: `http://localhost:${SERVICE_PORTS.VOTER}`,
      cadres: `http://localhost:${SERVICE_PORTS.CADRE}`,
      analytics: `http://localhost:${SERVICE_PORTS.ANALYTICS}`,
      reports: `http://localhost:${SERVICE_PORTS.REPORTING}`,
      aiAnalytics: `http://localhost:${SERVICE_PORTS.AI_ANALYTICS}`,
      superAdmin: `http://localhost:${SERVICE_PORTS.SUPER_ADMIN}`,
    },
  }, 'Services routing configured');
});

export { io };
