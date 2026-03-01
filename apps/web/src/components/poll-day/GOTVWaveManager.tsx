import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Spinner } from '../ui/spinner';
import {
  ZapIcon, PhoneIcon, MessageSquareIcon, CarIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon, UserIcon, SparklesIcon,
} from 'lucide-react';

interface GOTVWaveManagerProps {
  electionId: string;
  stats: any;
}

function WaveCard({ wave, label, timeRange, stats, electionId, onGenerate }: {
  wave: number;
  label: string;
  timeRange: string;
  stats: any;
  electionId: string;
  onGenerate: () => void;
}) {
  const total = stats?.total || 0;
  const contacted = stats?.contacted || 0;
  const voted = stats?.voted || 0;
  const pending = stats?.pending || 0;
  const unreachable = stats?.unreachable || 0;
  const progress = total > 0 ? ((voted / total) * 100) : 0;

  const colors = {
    1: { bg: 'bg-blue-50', border: 'border-blue-200', progress: 'bg-blue-500', text: 'text-blue-700' },
    2: { bg: 'bg-orange-50', border: 'border-orange-200', progress: 'bg-orange-500', text: 'text-orange-700' },
    3: { bg: 'bg-red-50', border: 'border-red-200', progress: 'bg-red-500', text: 'text-red-700' },
  }[wave] || { bg: 'bg-gray-50', border: 'border-gray-200', progress: 'bg-gray-500', text: 'text-gray-700' };

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className={`font-bold text-sm ${colors.text}`}>{label}</h3>
          <p className="text-[10px] text-muted-foreground">{timeRange}</p>
        </div>
        <Button variant="outline" size="sm" className="h-6 text-xs" onClick={onGenerate}>
          <ZapIcon className="h-3 w-3 mr-1" />
          Generate
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] mb-1">
          <span>{voted} voted of {total} targets</span>
          <span className="font-bold">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <div className={`h-full ${colors.progress} rounded-full transition-all`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
        <div className="p-1 rounded bg-white/60">
          <div className="font-bold">{pending}</div>
          <div className="text-muted-foreground">Pending</div>
        </div>
        <div className="p-1 rounded bg-white/60">
          <div className="font-bold text-blue-600">{contacted}</div>
          <div className="text-muted-foreground">Contacted</div>
        </div>
        <div className="p-1 rounded bg-white/60">
          <div className="font-bold text-green-600">{voted}</div>
          <div className="text-muted-foreground">Voted</div>
        </div>
        <div className="p-1 rounded bg-white/60">
          <div className="font-bold text-red-600">{unreachable}</div>
          <div className="text-muted-foreground">Failed</div>
        </div>
      </div>
    </div>
  );
}

export function GOTVWaveManager({ electionId, stats }: GOTVWaveManagerProps) {
  const queryClient = useQueryClient();
  const [selectedWave, setSelectedWave] = useState<number | null>(null);

  // Generate wave targets
  const generateMutation = useMutation({
    mutationFn: (wave: number) => api.post(`/poll-day/gotv/${electionId}/generate-wave/${wave}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gotv', electionId] });
    },
  });

  // AI GOTV strategy
  const strategyMutation = useMutation({
    mutationFn: (wave: number) => api.post(`/ai-analytics/${electionId}/poll-day/gotv-strategy/${wave}`),
  });

  // Fetch targets for selected wave
  const { data: targetsData } = useQuery({
    queryKey: ['gotv-targets', electionId, selectedWave],
    queryFn: () => api.get(`/poll-day/gotv/${electionId}/targets`, { params: { wave: selectedWave, limit: 50 } }),
    enabled: !!selectedWave,
  });

  // Update target status
  const updateTargetMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/poll-day/gotv/targets/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gotv', electionId] });
      queryClient.invalidateQueries({ queryKey: ['gotv-targets', electionId] });
    },
  });

  const targets = targetsData?.data?.data || [];
  const strategy = strategyMutation.data?.data?.data;

  const wave1Stats = stats?.wave1 || {};
  const wave2Stats = stats?.wave2 || {};
  const wave3Stats = stats?.wave3 || {};

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Wave cards */}
      <div className="grid grid-cols-3 gap-2 flex-shrink-0">
        <WaveCard
          wave={1} label="Wave 1: Seniors + Sure" timeRange="7:00 AM — 11:00 AM"
          stats={wave1Stats} electionId={electionId}
          onGenerate={() => generateMutation.mutate(1)}
        />
        <WaveCard
          wave={2} label="Wave 2: Working + Swing" timeRange="11:00 AM — 2:00 PM"
          stats={wave2Stats} electionId={electionId}
          onGenerate={() => generateMutation.mutate(2)}
        />
        <WaveCard
          wave={3} label="Wave 3: Final Push" timeRange="2:00 PM — 5:00 PM"
          stats={wave3Stats} electionId={electionId}
          onGenerate={() => generateMutation.mutate(3)}
        />
      </div>

      {/* Targets list + AI strategy */}
      <div className="flex-1 flex gap-2 overflow-hidden">
        {/* Target list */}
        <div className="flex-1 overflow-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold">Voter Targets</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((w) => (
                <Button
                  key={w}
                  variant={selectedWave === w ? 'default' : 'outline'}
                  size="sm"
                  className="h-5 text-[10px] px-2"
                  onClick={() => setSelectedWave(selectedWave === w ? null : w)}
                >
                  Wave {w}
                </Button>
              ))}
            </div>
          </div>

          {selectedWave && targets.length > 0 ? (
            <div className="space-y-1">
              {targets.map((target: any) => (
                <div key={target.id} className="flex items-center justify-between p-1.5 rounded border text-[10px] hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{target.voter?.name || 'Unknown'}</span>
                      <Badge variant="outline" className="text-[8px] flex-shrink-0">
                        {target.voter?.politicalLeaning || '?'}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground ml-4">
                      {target.voter?.mobile || 'No mobile'} | Booth {target.booth?.boothNumber || '?'}
                      {target.needsTransport && <span className="text-orange-500 ml-1"><CarIcon className="h-2.5 w-2.5 inline" /></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {target.status === 'PENDING' && (
                      <>
                        <Button
                          variant="ghost" size="sm" className="h-5 w-5 p-0"
                          onClick={() => updateTargetMutation.mutate({ id: target.id, status: 'CONTACTED' })}
                          title="Mark Contacted"
                        >
                          <PhoneIcon className="h-3 w-3 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-5 w-5 p-0"
                          onClick={() => updateTargetMutation.mutate({ id: target.id, status: 'UNREACHABLE' })}
                          title="Unreachable"
                        >
                          <XCircleIcon className="h-3 w-3 text-red-500" />
                        </Button>
                      </>
                    )}
                    {target.status === 'CONTACTED' && (
                      <Badge className="text-[8px] bg-blue-500">Contacted</Badge>
                    )}
                    {target.status === 'VOTED' && (
                      <Badge className="text-[8px] bg-green-500">Voted</Badge>
                    )}
                    {target.status === 'UNREACHABLE' && (
                      <Badge className="text-[8px] bg-red-500">Failed</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              {selectedWave ? 'No targets generated for this wave yet' : 'Select a wave to view targets'}
            </p>
          )}
        </div>

        {/* AI Strategy */}
        {selectedWave && (
          <div className="w-[250px] flex-shrink-0 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">AI Strategy</span>
              <Button
                variant="outline" size="sm" className="h-5 text-[10px]"
                onClick={() => strategyMutation.mutate(selectedWave)}
                disabled={strategyMutation.isPending}
              >
                {strategyMutation.isPending ? <Spinner className="h-3 w-3" /> : <SparklesIcon className="h-3 w-3 mr-1" />}
                Generate
              </Button>
            </div>
            {strategy ? (
              <div className="space-y-2 text-[10px]">
                {strategy.priorityBooths?.length > 0 && (
                  <div className="p-2 rounded bg-brand/5 border border-brand/20">
                    <div className="font-semibold mb-1">Priority Booths</div>
                    {strategy.priorityBooths.map((b: any, i: number) => (
                      <div key={i}>{typeof b === 'string' ? b : `Booth ${b.boothNumber}: ${b.reason}`}</div>
                    ))}
                  </div>
                )}
                {strategy.messagingStrategy && (
                  <div className="p-2 rounded bg-blue-50 border border-blue-200">
                    <div className="font-semibold mb-1">Messaging</div>
                    <p>{typeof strategy.messagingStrategy === 'string' ? strategy.messagingStrategy : JSON.stringify(strategy.messagingStrategy)}</p>
                  </div>
                )}
                {strategy.estimatedImpact && (
                  <div className="p-2 rounded bg-green-50 border border-green-200">
                    <div className="font-semibold mb-1">Expected Impact</div>
                    <p>{typeof strategy.estimatedImpact === 'string' ? strategy.estimatedImpact : JSON.stringify(strategy.estimatedImpact)}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic">Click Generate for AI-powered wave strategy</p>
            )}
          </div>
        )}
      </div>

      {/* Transport & Assistance summary */}
      {stats && (
        <div className="flex-shrink-0 flex gap-4 text-xs px-1">
          {stats.transportNeeds > 0 && (
            <span className="flex items-center gap-1 text-orange-600">
              <CarIcon className="h-3 w-3" /> {stats.transportNeeds} need transport
            </span>
          )}
          {stats.assistanceNeeds > 0 && (
            <span className="flex items-center gap-1 text-purple-600">
              <UserIcon className="h-3 w-3" /> {stats.assistanceNeeds} need assistance
            </span>
          )}
        </div>
      )}
    </div>
  );
}
