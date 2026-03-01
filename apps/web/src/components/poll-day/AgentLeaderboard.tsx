import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  TrophyIcon, MapPinIcon, ClockIcon, AlertTriangleIcon,
  SearchIcon, UserPlusIcon, PhoneIcon,
} from 'lucide-react';

interface AgentLeaderboardProps {
  agents: any[];
  electionId: string;
}

const battleRatingColors: Record<string, string> = {
  S: 'bg-yellow-400 text-yellow-900',
  A: 'bg-green-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-orange-500 text-white',
  D: 'bg-red-500 text-white',
};

const moodIndicators: Record<string, { color: string; label: string }> = {
  GREEN: { color: 'bg-green-500', label: 'Winning' },
  YELLOW: { color: 'bg-yellow-500', label: 'Tight' },
  RED: { color: 'bg-red-500', label: 'Losing' },
};

export function AgentLeaderboard({ agents, electionId }: AgentLeaderboardProps) {
  const [search, setSearch] = useState('');
  const [showSilent, setShowSilent] = useState(false);
  const queryClient = useQueryClient();

  // Silent agents
  const { data: silentData } = useQuery({
    queryKey: ['silent-agents', electionId],
    queryFn: () => api.get(`/poll-day/agents/silent/${electionId}`),
    enabled: !!electionId,
    refetchInterval: 60000,
  });

  const silentAgents = silentData?.data?.data || [];

  const filtered = (agents || []).filter((a: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.boothName?.toLowerCase().includes(q);
  });

  const displayList = showSilent ? silentAgents : filtered;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>
        <Button
          variant={showSilent ? 'destructive' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowSilent(!showSilent)}
        >
          <AlertTriangleIcon className="h-3 w-3 mr-1" />
          Silent ({silentAgents.length})
        </Button>
        <span className="text-xs text-muted-foreground">{displayList.length} agents</span>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-auto">
        {showSilent ? (
          // Silent agents view
          <div className="space-y-1">
            {silentAgents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">All agents are active</p>
            ) : (
              silentAgents.map((agent: any, i: number) => (
                <div key={agent.id || i} className="flex items-center justify-between p-2 rounded border border-red-200 bg-red-50 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Booth {agent.boothNumber || '?'} | Silent for {agent.minutesSilent || '?'} min
                      </div>
                    </div>
                  </div>
                  {agent.mobile && (
                    <a href={`tel:${agent.mobile}`} className="text-blue-500 hover:text-blue-700">
                      <PhoneIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          // Leaderboard view
          <div className="space-y-1">
            {displayList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No agents assigned yet</p>
            ) : (
              displayList.map((agent: any, i: number) => (
                <div key={agent.id || i} className="flex items-center gap-3 p-2 rounded border hover:bg-muted/50 text-xs">
                  {/* Rank / Index */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    agent.votesMarked > 0 && agent.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                    agent.votesMarked > 0 && agent.rank === 2 ? 'bg-gray-300 text-gray-700' :
                    agent.votesMarked > 0 && agent.rank === 3 ? 'bg-orange-300 text-orange-800' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {agent.votesMarked > 0 && agent.rank <= 3 ? <TrophyIcon className="h-3 w-3" /> : agent.rank}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.name}</span>
                      {agent.battleRating && (
                        <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${battleRatingColors[agent.battleRating] || 'bg-gray-200'}`}>
                          {agent.battleRating}
                        </span>
                      )}
                      {agent.latestMood && (
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${moodIndicators[agent.latestMood]?.color || 'bg-gray-400'}`} />
                          <span className="text-[10px] text-muted-foreground">{moodIndicators[agent.latestMood]?.label}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <span><MapPinIcon className="h-2.5 w-2.5 inline" /> {agent.boothName || `Booth ${agent.boothNumber}`}</span>
                      {agent.mobile && (
                        <span><PhoneIcon className="h-2.5 w-2.5 inline" /> {agent.mobile}</span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="text-right flex-shrink-0">
                    {agent.votesMarked > 0 ? (
                      <>
                        <div className="font-bold text-brand">{agent.votesMarked}</div>
                        <div className="text-[10px] text-muted-foreground">votes</div>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Standby</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
