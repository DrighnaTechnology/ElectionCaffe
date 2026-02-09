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
import { SERVICE_PORTS, createLogger, requestIdMiddleware, validateEnv } from '@electioncaffe/shared';

export const logger = createLogger('gateway');

validateEnv('gateway');

const app = express();
const httpServer = createServer(app);

// CORS origin whitelist
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5000,http://localhost:5174').split(',').map(s => s.trim());

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketIO(io);

// Middleware
app.use(helmet());
app.use(requestIdMiddleware);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));

// Body size limit
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'];
  res.on('finish', () => {
    logger.info({ method: req.method, url: req.url, statusCode: res.statusCode, durationMs: Date.now() - start, requestId }, 'request completed');
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: { success: false, error: { code: 'E5003', message: 'Too many requests' } },
});
app.use(limiter);

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: { code: 'E4029', message: 'Too many attempts. Please try again later.' } },
});

// Health check
app.get('/health', (_req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
  });
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
app.use('/api/auth/login', authLimiter, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
app.use('/api/auth/register', authLimiter, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
app.use('/api/auth/refresh', createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
app.use('/api/auth/forgot-password', authLimiter, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`, { '^/api/auth': '/api' }));
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
app.use('/api/ai/features', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AI_ANALYTICS}`, { '^/api/ai/features': '/api/ai/features' }));
app.use('/api/candidates', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ELECTION}`, { '^/api/candidates': '/api/candidates' }));
app.use('/api/surveys', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.ELECTION}`, { '^/api/surveys': '/api/surveys' }));

// EC Data, News, and Actions routes for tenant users (handled by auth-service)
app.use('/api/ec-data', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/news', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/actions', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));

// Additional auth-service module routes
app.use('/api/nb-broadcast', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/website-builder', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/funds', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/inventory', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/events', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/notifications', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/chat', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));
app.use('/api/organization', authMiddleware, createServiceProxy(`http://localhost:${SERVICE_PORTS.AUTH}`));

// Super Admin routes - public auth routes (apply auth rate limiter)
app.use('/api/super-admin/auth/login', authLimiter, createServiceProxy(`http://localhost:${SERVICE_PORTS.SUPER_ADMIN}`));
app.use('/api/super-admin/auth/register', authLimiter, createServiceProxy(`http://localhost:${SERVICE_PORTS.SUPER_ADMIN}`));
// Super Admin routes - protected (no regular auth middleware, handled by service)
// Strip x-super-admin-id header to prevent client injection - only super-admin-service should set it
app.use('/api/super-admin', (req, _res, next) => {
  delete req.headers['x-super-admin-id'];
  next();
}, createServiceProxy(`http://localhost:${SERVICE_PORTS.SUPER_ADMIN}`));

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

function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, closing server...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { io };
