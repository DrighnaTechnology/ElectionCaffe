import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Spinner } from '../ui/spinner';
import { SparklesIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface VictoryCalculatorProps {
  data: any;
  electionId: string;
}

export function VictoryCalculator({ data, electionId }: VictoryCalculatorProps) {
  const simulationMutation = useMutation({
    mutationFn: () => api.post(`/ai-analytics/${electionId}/poll-day/victory-simulation`),
  });

  const aiResult = simulationMutation.data?.data?.data;
  const displayData = aiResult || data;

  if (!displayData) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground mb-2">No victory data available yet</p>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => simulationMutation.mutate()}
          disabled={simulationMutation.isPending}
        >
          {simulationMutation.isPending ? <Spinner className="h-3 w-3 mr-1" /> : <SparklesIcon className="h-3 w-3 mr-1" />}
          Run AI Simulation
        </Button>
      </div>
    );
  }

  // Calculate win probability from estimatedVotes vs estimatedOpposition
  const estVotes = displayData.estimatedVotes || 0;
  const estOpp = displayData.estimatedOpposition || 0;
  const total = estVotes + estOpp;
  const winProb = displayData.winProbability || (total > 0 ? Math.round((estVotes / total) * 1000) / 10 : 50);
  const isWinning = winProb >= 50;
  const margin = displayData.winMargin || 0;

  return (
    <div className="space-y-3 text-xs">
      {/* Win probability bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className={`font-bold ${isWinning ? 'text-green-600' : 'text-red-600'}`}>
            {isWinning ? 'WINNING' : 'TRAILING'}
          </span>
          <span className="font-bold">{winProb.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-red-200 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isWinning ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${winProb}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
            {winProb.toFixed(1)}% — {(100 - winProb).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Estimates */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded bg-green-50 text-center">
          <div className="text-lg font-bold text-green-700">{displayData.estimatedVotes?.toLocaleString() || '—'}</div>
          <div className="text-[10px] text-green-600">Our Estimated Votes</div>
        </div>
        <div className="p-2 rounded bg-red-50 text-center">
          <div className="text-lg font-bold text-red-700">{displayData.estimatedOpposition?.toLocaleString() || '—'}</div>
          <div className="text-[10px] text-red-600">Opposition Estimated</div>
        </div>
      </div>

      {/* Margin */}
      <div className={`p-2 rounded text-center ${margin >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
        <div className="flex items-center justify-center gap-1">
          {margin >= 0 ? <TrendingUpIcon className="h-4 w-4 text-green-600" /> : <TrendingDownIcon className="h-4 w-4 text-red-600" />}
          <span className={`font-bold text-lg ${margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {margin >= 0 ? '+' : ''}{margin.toLocaleString()}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">Estimated Margin</div>
      </div>

      {/* Key swing booths */}
      {displayData.keySwingBooths?.length > 0 && (
        <div>
          <div className="font-semibold mb-1">Key Swing Booths (Can Flip Result)</div>
          <div className="space-y-1">
            {displayData.keySwingBooths.slice(0, 5).map((booth: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded bg-yellow-50 border border-yellow-200">
                <span>Booth {booth.boothNumber || booth.boothId}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{booth.swingVoters || booth.swingCount} swing voters</span>
                  <Badge variant="outline" className="text-[10px]">{booth.turnout?.toFixed(0) || '?'}% turnout</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI interpretation */}
      {aiResult?.interpretation && (
        <div className="p-2 rounded bg-brand/5 border border-brand/20 text-xs">
          <div className="font-semibold text-brand mb-1">AI Analysis</div>
          <p>{aiResult.interpretation}</p>
        </div>
      )}

      {/* Resource focus */}
      {aiResult?.resourceFocus?.length > 0 && (
        <div>
          <div className="font-semibold mb-1">Focus Resources Here</div>
          <ul className="space-y-0.5">
            {aiResult.resourceFocus.map((item: string, i: number) => (
              <li key={i} className="pl-2 border-l-2 border-brand/30">{item}</li>
            ))}
          </ul>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => simulationMutation.mutate()}
        disabled={simulationMutation.isPending}
      >
        {simulationMutation.isPending ? <Spinner className="h-3 w-3 mr-1" /> : <SparklesIcon className="h-3 w-3 mr-1" />}
        Run AI Victory Simulation (3 credits)
      </Button>
    </div>
  );
}
