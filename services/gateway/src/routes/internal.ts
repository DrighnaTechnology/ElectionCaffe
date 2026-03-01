import { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { broadcastVoteMarked, broadcastTurnoutUpdate, sendTenantNotification } from '../config/socket.js';
import { WS_EVENTS, createLogger } from '@electioncaffe/shared';

const logger = createLogger('gateway');

export function createInternalRoutes(io: SocketIOServer) {
  const router = Router();

  // Verify internal API key
  router.use((req: Request, res: Response, next) => {
    const apiKey = req.headers['x-internal-key'];
    if (apiKey !== (process.env.INTERNAL_API_KEY || 'ec-internal-dev-key')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  });

  // POST /internal/broadcast - generic broadcast endpoint
  router.post('/broadcast', (req: Request, res: Response) => {
    try {
      const { event, namespace, room, data } = req.body;

      if (!event) {
        res.status(400).json({ error: 'event is required' });
        return;
      }

      logger.info({ event, namespace, room }, 'Internal broadcast received');

      // Use dedicated helpers for known events
      if (event === WS_EVENTS.VOTE_MARKED) {
        broadcastVoteMarked(io, data);
        res.json({ success: true, event, handler: 'broadcastVoteMarked' });
        return;
      }

      if (event === WS_EVENTS.TURNOUT_UPDATE) {
        broadcastTurnoutUpdate(io, data);
        res.json({ success: true, event, handler: 'broadcastTurnoutUpdate' });
        return;
      }

      if (event === WS_EVENTS.NOTIFICATION) {
        const { tenantId } = data;
        if (!tenantId) {
          res.status(400).json({ error: 'tenantId is required for notifications' });
          return;
        }
        sendTenantNotification(io, tenantId, data);
        res.json({ success: true, event, handler: 'sendTenantNotification' });
        return;
      }

      // Generic emit for all other events
      // Supported events: INCIDENT_CREATED, INCIDENT_UPDATED, BATTLE_ORDER_ISSUED,
      // GOTV_WAVE_TRIGGERED, AGENT_CHECK_IN, AGENT_CHECK_OUT, AGENT_MOOD,
      // AGENT_SILENT_ALERT, ANOMALY_DETECTED, VICTORY_CALC_UPDATE, BOOTH_PULSE,
      // SNAPSHOT_COMPLETE, BOOTH_UPDATE, CADRE_LOCATION, CADRE_STATUS, etc.
      const targetNamespace = namespace || '/ws/poll-day';
      const ns = io.of(targetNamespace);

      if (room) {
        ns.to(room).emit(event, data);
      } else {
        ns.emit(event, data);
      }

      logger.info({ event, namespace: targetNamespace, room }, 'Generic broadcast emitted');
      res.json({ success: true, event, namespace: targetNamespace, room: room || null });
    } catch (error) {
      logger.error({ err: error }, 'Internal broadcast error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
