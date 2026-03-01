import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { api, electionsAPI } from '../services/api';
import { usePollDaySocket } from '../hooks/usePollDaySocket';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '../components/ui/spinner';
import { BattlefieldMap } from '../components/poll-day/BattlefieldMap';
import { AICommandPanel } from '../components/poll-day/AICommandPanel';
import { BoothGrid } from '../components/poll-day/BoothGrid';
import { GOTVWaveManager } from '../components/poll-day/GOTVWaveManager';
import { AgentLeaderboard } from '../components/poll-day/AgentLeaderboard';
import { IncidentPanel } from '../components/poll-day/IncidentPanel';
import { HourlyTimeline } from '../components/poll-day/HourlyTimeline';
import { EventTicker } from '../components/poll-day/EventTicker';
import {
  WifiIcon, WifiOffIcon, RefreshCwIcon, UsersIcon, MapPinIcon,
  AlertTriangleIcon, TrendingUpIcon, ShieldIcon,
  SwordsIcon, ActivityIcon, TargetIcon,
} from 'lucide-react';

export function PollDayPage() {
  const { selectedElectionId } = useElectionStore();
  const [activeTab, setActiveTab] = useState('booths');
  const [currentTime, setCurrentTime] = useState(new Date());
  const queryClient = useQueryClient();

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // WebSocket connection
  const { isConnected, eventFeed, on } = usePollDaySocket(selectedElectionId);

  // Fetch election details
  const { data: electionData } = useQuery({
    queryKey: ['election', selectedElectionId],
    queryFn: () => electionsAPI.getById(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  // War Room aggregated data
  const { data: warRoomData, isLoading: warRoomLoading, refetch: refetchWarRoom } = useQuery({
    queryKey: ['war-room', selectedElectionId],
    queryFn: () => api.get(`/poll-day/war-room/${selectedElectionId}`),
    enabled: !!selectedElectionId,
    refetchInterval: isConnected ? 60000 : 15000, // slower when WS active
  });

  // Map data
  const { data: mapData } = useQuery({
    queryKey: ['war-room-map', selectedElectionId],
    queryFn: () => api.get(`/poll-day/war-room/${selectedElectionId}/map-data`),
    enabled: !!selectedElectionId,
    refetchInterval: isConnected ? 60000 : 30000,
  });

  // Victory calculator
  const { data: victoryData } = useQuery({
    queryKey: ['victory-calc', selectedElectionId],
    queryFn: () => api.get(`/poll-day/war-room/${selectedElectionId}/victory-calc`),
    enabled: !!selectedElectionId,
    refetchInterval: 120000, // every 2 min
  });

  // Hourly turnout
  const { data: hourlyData } = useQuery({
    queryKey: ['hourly-turnout', selectedElectionId],
    queryFn: () => api.get(`/poll-day/hourly/${selectedElectionId}`),
    enabled: !!selectedElectionId,
    refetchInterval: 60000,
  });

  // Incidents
  const { data: incidentsData } = useQuery({
    queryKey: ['incidents', selectedElectionId],
    queryFn: () => api.get('/poll-day/incidents', { params: { electionId: selectedElectionId } }),
    enabled: !!selectedElectionId,
    refetchInterval: 30000,
  });

  // GOTV stats
  const { data: gotvData } = useQuery({
    queryKey: ['gotv', selectedElectionId],
    queryFn: () => api.get(`/poll-day/gotv/${selectedElectionId}/stats`),
    enabled: !!selectedElectionId,
    refetchInterval: 60000,
  });

  // Agents data
  const { data: agentsData } = useQuery({
    queryKey: ['agents-leaderboard', selectedElectionId],
    queryFn: () => api.get(`/poll-day/agents/leaderboard/${selectedElectionId}`),
    enabled: !!selectedElectionId,
    refetchInterval: 60000,
  });

  // Snapshot trigger
  const snapshotMutation = useMutation({
    mutationFn: () => api.post(`/poll-day/war-room/${selectedElectionId}/snapshot`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['war-room', selectedElectionId] });
    },
  });

  const election = electionData?.data?.data;
  const wr = warRoomData?.data?.data;
  const map = mapData?.data?.data;
  const victory = victoryData?.data?.data;
  const hourly = hourlyData?.data?.data;
  const incidents = incidentsData?.data?.data;
  const gotv = gotvData?.data?.data;
  const agents = agentsData?.data?.data;

  // KPI calculations
  const totalVoters = wr?.overall?.totalVoters || election?.totalVoters || 0;
  const totalVoted = wr?.overall?.totalVoted || 0;
  const turnoutPct = wr?.overall?.turnoutPercentage?.toFixed(1) || (totalVoters > 0 ? ((totalVoted / totalVoters) * 100).toFixed(1) : '0.0');
  const activeAgents = wr?.activeAgents || 0;
  const totalAgents = (wr?.booths || []).filter((b: any) => b.agent).length || activeAgents;
  const openIncidentCount = wr?.openIncidents
    ? Object.values(wr.openIncidents as Record<string, number>).reduce((sum: number, v: number) => sum + v, 0)
    : 0;
  const winMargin = victory?.winMargin ?? null;

  if (!selectedElectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <SwordsIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Select an election to open the War Room</p>
        </CardContent>
      </Card>
    );
  }

  if (warRoomLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Spinner className="h-8 w-8" />
        <span className="ml-3 text-lg text-muted-foreground">Initializing War Room...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* HEADER BAR */}
      <div className="flex-shrink-0 bg-card border-b px-4 py-2 space-y-1.5">
        {/* Row 1: Title + Status + Clock + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <SwordsIcon className="h-5 w-5 text-brand" />
              <h1 className="text-lg font-bold">War Room</h1>
            </div>
            <span className="text-sm text-muted-foreground hidden md:inline">{election?.name}</span>
            <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
              {isConnected ? <WifiIcon className="h-3 w-3 mr-1" /> : <WifiOffIcon className="h-3 w-3 mr-1" />}
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono tabular-nums text-muted-foreground">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Button variant="outline" size="sm" onClick={() => snapshotMutation.mutate()} disabled={snapshotMutation.isPending}>
              <ActivityIcon className="h-4 w-4 mr-1" />
              Snapshot
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchWarRoom()}>
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Row 2: KPI strip */}
        <div className="flex items-center gap-3 flex-wrap">
          <KPIChip icon={<UsersIcon className="h-4 w-4" />} label="Voted" value={`${totalVoted.toLocaleString()} / ${totalVoters.toLocaleString()}`} />
          <KPIChip icon={<TrendingUpIcon className="h-4 w-4" />} label="Turnout" value={`${turnoutPct}%`} highlight />
          <KPIChip icon={<MapPinIcon className="h-4 w-4" />} label="Agents" value={`${activeAgents}/${totalAgents || activeAgents}`} warn={totalAgents > 0 && activeAgents < totalAgents * 0.5} />
          <KPIChip icon={<AlertTriangleIcon className="h-4 w-4" />} label="Incidents" value={String(openIncidentCount)} warn={openIncidentCount > 0} />
          {winMargin !== null && (
            <KPIChip
              icon={<TargetIcon className="h-4 w-4" />}
              label="Margin"
              value={`${winMargin > 0 ? '+' : ''}${winMargin}`}
              highlight={winMargin > 0}
              warn={winMargin < 0}
            />
          )}
        </div>
      </div>

      {/* MAIN CONTENT: Map + AI Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Battlefield Map */}
        <div className="w-3/5 border-r relative">
          <BattlefieldMap
            booths={map?.booths || []}
            agents={map?.agents || []}
            incidents={incidents || []}
            onBoothClick={(boothId) => setActiveTab('booths')}
          />
        </div>

        {/* RIGHT: AI Command Panel */}
        <div className="w-2/5 flex flex-col overflow-hidden">
          <AICommandPanel
            electionId={selectedElectionId}
            warRoomData={wr}
            victory={victory}
            incidents={incidents}
            gotv={gotv}
          />
        </div>
      </div>

      {/* BOTTOM: Tabbed Panels */}
      <div className="flex-shrink-0 border-t bg-card" style={{ height: '320px' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="flex-shrink-0 w-full justify-start rounded-none border-b bg-transparent px-4">
            <TabsTrigger value="booths" className="text-xs">
              <MapPinIcon className="h-3 w-3 mr-1" />Booth Grid
            </TabsTrigger>
            <TabsTrigger value="gotv" className="text-xs">
              <TargetIcon className="h-3 w-3 mr-1" />GOTV Waves
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs">
              <ShieldIcon className="h-3 w-3 mr-1" />Agents
            </TabsTrigger>
            <TabsTrigger value="incidents" className="text-xs">
              <AlertTriangleIcon className="h-3 w-3 mr-1" />Incidents
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">
              <ActivityIcon className="h-3 w-3 mr-1" />Hourly Timeline
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto">
            <TabsContent value="booths" className="h-full m-0 p-2">
              <BoothGrid booths={(wr?.booths || []).map((b: any) => ({
                boothId: b.boothId,
                boothNumber: b.boothNumber,
                boothName: b.boothName,
                totalVoters: b.totalVoters,
                voted: b.voted,
                turnout: b.turnout,
                classification: b.classification,
                agentName: b.agent?.name || null,
                agentCheckedIn: b.agent?.isCheckedIn || false,
                latestMood: b.latestMood,
                hasIncident: false,
              }))} electionId={selectedElectionId} />
            </TabsContent>
            <TabsContent value="gotv" className="h-full m-0 p-2">
              <GOTVWaveManager electionId={selectedElectionId} stats={gotv} />
            </TabsContent>
            <TabsContent value="agents" className="h-full m-0 p-2">
              <AgentLeaderboard agents={agents || []} electionId={selectedElectionId} />
            </TabsContent>
            <TabsContent value="incidents" className="h-full m-0 p-2">
              <IncidentPanel incidents={incidents || []} electionId={selectedElectionId} />
            </TabsContent>
            <TabsContent value="timeline" className="h-full m-0 p-2">
              <HourlyTimeline data={hourly?.hourly || []} totalVoters={totalVoters} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* EVENT TICKER */}
      <EventTicker events={eventFeed} />
    </div>
  );
}

// KPI Chip component for header
function KPIChip({ icon, label, value, highlight, warn }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
      warn ? 'bg-destructive/10 text-destructive' :
      highlight ? 'bg-brand/10 text-brand' :
      'bg-muted text-muted-foreground'
    }`}>
      {icon}
      <span className="font-medium">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
