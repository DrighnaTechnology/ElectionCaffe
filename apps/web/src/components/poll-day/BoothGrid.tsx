import { useState, useMemo } from 'react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SearchIcon, ArrowUpDownIcon } from 'lucide-react';

interface BoothData {
  boothId: string;
  boothNumber: string;
  boothName: string;
  totalVoters: number;
  voted: number;
  turnout: number;
  classification?: string;
  agentName?: string;
  agentCheckedIn?: boolean;
  latestMood?: string;
  hasIncident?: boolean;
}

interface BoothGridProps {
  booths: BoothData[];
  electionId: string;
}

const classColors: Record<string, string> = {
  SAFE: 'bg-green-100 text-green-800 border-green-300',
  FAVORABLE: 'bg-blue-100 text-blue-800 border-blue-300',
  BATTLEGROUND: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  DIFFICULT: 'bg-orange-100 text-orange-800 border-orange-300',
  HOSTILE: 'bg-red-100 text-red-800 border-red-300',
  UNKNOWN: 'bg-gray-100 text-gray-600 border-gray-300',
};

const moodColors: Record<string, string> = {
  GREEN: 'bg-green-500',
  YELLOW: 'bg-yellow-500',
  RED: 'bg-red-500',
};

type SortField = 'turnout-asc' | 'turnout-desc' | 'number' | 'voters';

export function BoothGrid({ booths, electionId }: BoothGridProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('turnout-asc');
  const [filterClass, setFilterClass] = useState<string>('all');

  const filtered = useMemo(() => {
    let result = [...booths];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) => b.boothNumber.toString().includes(q) || b.boothName?.toLowerCase().includes(q)
      );
    }

    if (filterClass !== 'all') {
      result = result.filter((b) => b.classification === filterClass);
    }

    switch (sortBy) {
      case 'turnout-asc':
        result.sort((a, b) => a.turnout - b.turnout); // worst first = needs attention
        break;
      case 'turnout-desc':
        result.sort((a, b) => b.turnout - a.turnout);
        break;
      case 'number':
        result.sort((a, b) => Number(a.boothNumber) - Number(b.boothNumber));
        break;
      case 'voters':
        result.sort((a, b) => b.totalVoters - a.totalVoters);
        break;
    }

    return result;
  }, [booths, search, sortBy, filterClass]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search booth..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
          <SelectTrigger className="h-7 text-xs w-[150px]">
            <ArrowUpDownIcon className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="turnout-asc">Turnout (Low first)</SelectItem>
            <SelectItem value="turnout-desc">Turnout (High first)</SelectItem>
            <SelectItem value="number">Booth Number</SelectItem>
            <SelectItem value="voters">Total Voters</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="h-7 text-xs w-[140px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="SAFE">Safe</SelectItem>
            <SelectItem value="FAVORABLE">Favorable</SelectItem>
            <SelectItem value="BATTLEGROUND">Battleground</SelectItem>
            <SelectItem value="DIFFICULT">Difficult</SelectItem>
            <SelectItem value="HOSTILE">Hostile</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} booths</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {filtered.map((booth) => (
            <div
              key={booth.boothId}
              className={`rounded-lg border p-2 text-xs transition-all hover:shadow-md cursor-pointer ${
                booth.hasIncident ? 'border-red-400 bg-red-50/50' :
                booth.turnout < 20 ? 'border-red-200 bg-red-50/30' :
                booth.turnout < 40 ? 'border-orange-200 bg-orange-50/30' :
                'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">#{booth.boothNumber}</span>
                <div className="flex items-center gap-1">
                  {booth.latestMood && (
                    <div className={`w-2 h-2 rounded-full ${moodColors[booth.latestMood] || 'bg-gray-400'}`} />
                  )}
                  {booth.classification && booth.classification !== 'UNKNOWN' && (
                    <span className={`px-1 py-0.5 rounded text-[9px] font-medium border ${classColors[booth.classification]}`}>
                      {booth.classification.slice(0, 3)}
                    </span>
                  )}
                </div>
              </div>

              {/* Booth name */}
              <p className="text-[10px] text-muted-foreground truncate mb-1.5">{booth.boothName}</p>

              {/* Turnout */}
              <div className="mb-1">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span>{booth.voted}/{booth.totalVoters}</span>
                  <span className="font-bold">{booth.turnout.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      booth.turnout >= 60 ? 'bg-green-500' :
                      booth.turnout >= 40 ? 'bg-yellow-500' :
                      booth.turnout >= 20 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, booth.turnout)}%` }}
                  />
                </div>
              </div>

              {/* Agent */}
              <div className="flex items-center justify-between text-[10px]">
                <span className={booth.agentCheckedIn ? 'text-green-600' : 'text-gray-400'}>
                  {booth.agentName ? (booth.agentCheckedIn ? 'Active' : 'Offline') : 'No Agent'}
                </span>
                {booth.hasIncident && (
                  <span className="text-red-600 font-medium">INCIDENT</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
