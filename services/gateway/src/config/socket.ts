import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { UserPayload } from '@electioncaffe/shared';
import { WS_EVENTS, createLogger } from '@electioncaffe/shared';

const logger = createLogger('gateway');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

interface AuthenticatedSocket extends Socket {
  user?: UserPayload;
}

export function setupSocketIO(io: SocketIOServer): void {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as UserPayload;
      socket.user = decoded;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  // Poll Day namespace for real-time vote tracking
  const pollDayNs = io.of('/ws/poll-day');

  pollDayNs.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.user?.id }, 'User connected to poll-day namespace');

    // Join election room
    socket.on('join_election', (electionId: string) => {
      socket.join(`election:${electionId}`);
      logger.info({ userId: socket.user?.id, electionId }, 'User joined election room');
    });

    // Leave election room
    socket.on('leave_election', (electionId: string) => {
      socket.leave(`election:${electionId}`);
    });

    socket.on('disconnect', () => {
      logger.info({ userId: socket.user?.id }, 'User disconnected from poll-day namespace');
    });
  });

  // Cadre tracking namespace
  const cadreNs = io.of('/ws/cadres');

  cadreNs.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.user?.id }, 'User connected to cadres namespace');

    // Track cadre location
    socket.on('location_update', (data: { latitude: number; longitude: number }) => {
      socket.broadcast.emit(WS_EVENTS.CADRE_LOCATION, {
        cadreId: socket.user?.id,
        ...data,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      logger.info({ userId: socket.user?.id }, 'User disconnected from cadres namespace');
    });
  });

  // General notifications namespace
  const notificationsNs = io.of('/ws/notifications');

  notificationsNs.on('connection', (socket: AuthenticatedSocket) => {
    const tenantId = socket.user?.tenantId;
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }

    socket.on('disconnect', () => {
      logger.info({ userId: socket.user?.id }, 'User disconnected from notifications');
    });
  });

  logger.info('WebSocket namespaces configured: /ws/poll-day, /ws/cadres, /ws/notifications');
}

// Helper function to broadcast vote marked event
export function broadcastVoteMarked(io: SocketIOServer, data: {
  electionId: string;
  boothId: string;
  voterId: string;
  votedAt: Date;
  newTurnout: number;
}): void {
  io.of('/ws/poll-day')
    .to(`election:${data.electionId}`)
    .emit(WS_EVENTS.VOTE_MARKED, data);
}

// Helper function to broadcast turnout update
export function broadcastTurnoutUpdate(io: SocketIOServer, data: {
  electionId: string;
  boothId: string;
  totalVoters: number;
  votedCount: number;
  percentage: number;
}): void {
  io.of('/ws/poll-day')
    .to(`election:${data.electionId}`)
    .emit(WS_EVENTS.TURNOUT_UPDATE, data);
}

// Helper function to send notification to tenant
export function sendTenantNotification(io: SocketIOServer, tenantId: string, notification: {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}): void {
  io.of('/ws/notifications')
    .to(`tenant:${tenantId}`)
    .emit(WS_EVENTS.NOTIFICATION, {
      ...notification,
      timestamp: new Date(),
    });
}
