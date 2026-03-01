import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { useQueryClient } from '@tanstack/react-query';

// In development, connect directly to the gateway to avoid Vite proxy issues with Socket.IO polling
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

interface VoteMarkedEvent {
  electionId: string;
  boothId: string;
  voterId: string;
  votedAt: string;
  newTurnout: number;
}

interface TurnoutUpdateEvent {
  electionId: string;
  boothId: string;
  totalVoters: number;
  votedCount: number;
  percentage: number;
}

interface IncidentEvent {
  electionId: string;
  incident: {
    id: string;
    boothId: string;
    incidentType: string;
    severity: string;
    title: string;
    status: string;
  };
}

interface AgentEvent {
  electionId: string;
  agentId: string;
  name: string;
  boothId: string;
  type: string;
  mood?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
}

interface BattleOrderEvent {
  electionId: string;
  order: {
    id: string;
    orderType: string;
    priority: string;
    title: string;
    description: string;
  };
}

type EventCallback = (data: any) => void;

export function usePollDaySocket(electionId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any; time: Date } | null>(null);
  const [eventFeed, setEventFeed] = useState<Array<{ type: string; message: string; time: Date; severity?: string }>>([]);
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());

  const addToFeed = useCallback((type: string, message: string, severity?: string) => {
    setEventFeed((prev) => {
      const newFeed = [{ type, message, time: new Date(), severity }, ...prev];
      return newFeed.slice(0, 100); // keep last 100 events
    });
  }, []);

  const on = useCallback((event: string, callback: EventCallback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);
    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  useEffect(() => {
    if (!electionId || !accessToken) return;

    const socket = io(`${WS_URL}/ws/poll-day`, {
      auth: { token: accessToken },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 50,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_election', electionId);
      addToFeed('system', 'War Room connected — live updates active', 'info');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      addToFeed('system', 'Connection lost — reconnecting...', 'warning');
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      socket.emit('join_election', electionId);
      addToFeed('system', 'Reconnected to War Room', 'info');
    });

    // Vote marked
    socket.on('vote_marked', (data: VoteMarkedEvent) => {
      setLastEvent({ type: 'vote_marked', data, time: new Date() });
      addToFeed('vote', `Vote recorded at Booth ${data.boothId}`, 'info');
      queryClient.invalidateQueries({ queryKey: ['war-room', electionId] });
      queryClient.invalidateQueries({ queryKey: ['war-room-map', electionId] });
      listenersRef.current.get('vote_marked')?.forEach((cb) => cb(data));
    });

    // Turnout update
    socket.on('turnout_update', (data: TurnoutUpdateEvent) => {
      setLastEvent({ type: 'turnout_update', data, time: new Date() });
      queryClient.invalidateQueries({ queryKey: ['war-room', electionId] });
      listenersRef.current.get('turnout_update')?.forEach((cb) => cb(data));
    });

    // Booth pulse (vote frequency)
    socket.on('booth_pulse', (data: any) => {
      listenersRef.current.get('booth_pulse')?.forEach((cb) => cb(data));
    });

    // Incident events
    socket.on('incident_created', (data: IncidentEvent) => {
      addToFeed('incident', `INCIDENT: ${data.incident.title} [${data.incident.severity}]`, data.incident.severity === 'CRITICAL' ? 'critical' : 'warning');
      queryClient.invalidateQueries({ queryKey: ['incidents', electionId] });
      listenersRef.current.get('incident_created')?.forEach((cb) => cb(data));
    });

    socket.on('incident_updated', (data: IncidentEvent) => {
      queryClient.invalidateQueries({ queryKey: ['incidents', electionId] });
      listenersRef.current.get('incident_updated')?.forEach((cb) => cb(data));
    });

    // Agent events
    socket.on('agent_check_in', (data: AgentEvent) => {
      addToFeed('agent', `Agent ${data.name} checked in at Booth`, 'info');
      queryClient.invalidateQueries({ queryKey: ['war-room', electionId] });
      listenersRef.current.get('agent_check_in')?.forEach((cb) => cb(data));
    });

    socket.on('agent_check_out', (data: AgentEvent) => {
      addToFeed('agent', `Agent ${data.name} checked out`, 'warning');
      listenersRef.current.get('agent_check_out')?.forEach((cb) => cb(data));
    });

    socket.on('agent_mood', (data: AgentEvent) => {
      const moodEmoji = data.mood === 'GREEN' ? 'Winning' : data.mood === 'YELLOW' ? 'Tight' : 'Losing';
      addToFeed('mood', `Mood report: ${moodEmoji} at Booth`, data.mood === 'RED' ? 'critical' : 'info');
      listenersRef.current.get('agent_mood')?.forEach((cb) => cb(data));
    });

    socket.on('agent_silent_alert', (data: AgentEvent) => {
      addToFeed('alert', `ALERT: Agent ${data.name} silent for 30+ minutes`, 'critical');
      listenersRef.current.get('agent_silent_alert')?.forEach((cb) => cb(data));
    });

    // Battle orders
    socket.on('battle_order_issued', (data: BattleOrderEvent) => {
      addToFeed('order', `BATTLE ORDER: ${data.order.title} [${data.order.priority}]`, 'warning');
      queryClient.invalidateQueries({ queryKey: ['battle-orders', electionId] });
      listenersRef.current.get('battle_order_issued')?.forEach((cb) => cb(data));
    });

    // GOTV
    socket.on('gotv_wave_triggered', (data: any) => {
      addToFeed('gotv', `GOTV Wave ${data.wave} triggered — ${data.targetCount} targets`, 'info');
      queryClient.invalidateQueries({ queryKey: ['gotv', electionId] });
      listenersRef.current.get('gotv_wave_triggered')?.forEach((cb) => cb(data));
    });

    // Victory calc update
    socket.on('victory_calc_update', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['victory-calc', electionId] });
      listenersRef.current.get('victory_calc_update')?.forEach((cb) => cb(data));
    });

    // Anomaly
    socket.on('anomaly_detected', (data: any) => {
      addToFeed('anomaly', `ANOMALY: ${data.message || 'Unusual pattern detected'}`, 'critical');
      listenersRef.current.get('anomaly_detected')?.forEach((cb) => cb(data));
    });

    // Snapshot
    socket.on('snapshot_complete', (data: any) => {
      addToFeed('system', 'Turnout snapshot captured', 'info');
      queryClient.invalidateQueries({ queryKey: ['war-room', electionId] });
      listenersRef.current.get('snapshot_complete')?.forEach((cb) => cb(data));
    });

    return () => {
      socket.emit('leave_election', electionId);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [electionId, accessToken, queryClient, addToFeed]);

  return {
    isConnected,
    lastEvent,
    eventFeed,
    on,
    socket: socketRef.current,
  };
}
