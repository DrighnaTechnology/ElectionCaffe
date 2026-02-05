import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { api, electionsAPI, partsAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '../components/ui/spinner';
// Progress import removed - not currently used
import {
  SearchIcon,
  UsersIcon,
  MapPinIcon,
  ClockIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  UserIcon,
  ActivityIcon,
  FilterIcon,
} from 'lucide-react';

interface BoothTurnout {
  boothId: string;
  boothNumber: number;
  boothName: string;
  totalVoters: number;
  votedCount: number;
  turnoutPercent: number;
  lastVotedAt?: string;
  agentName?: string;
}

interface TurnoutByTime {
  time: string;
  count: number;
  cumulative: number;
  percent: number;
}

// Progress Component (simple implementation)
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-orange-500 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PollDayPage() {
  const { selectedElectionId } = useElectionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch election details
  const { data: electionData } = useQuery({
    queryKey: ['election', selectedElectionId],
    queryFn: () => electionsAPI.getById(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  // Fetch parts for filter
  const { data: partsData } = useQuery({
    queryKey: ['parts', selectedElectionId],
    queryFn: () => partsAPI.getAll(selectedElectionId!, { limit: 1000 }),
    enabled: !!selectedElectionId,
  });

  // Fetch poll day statistics
  const { data: pollDayData, isLoading, refetch } = useQuery({
    queryKey: ['pollDay', selectedElectionId, selectedPart],
    queryFn: () => api.get('/poll-day/turnout', {
      params: {
        electionId: selectedElectionId,
        ...(selectedPart !== 'all' && { partId: selectedPart })
      }
    }),
    enabled: !!selectedElectionId,
    refetchInterval: autoRefresh ? 30000 : false, // Auto refresh every 30 seconds
  });

  // Fetch booth agents
  const { data: agentsData } = useQuery({
    queryKey: ['boothAgents', selectedElectionId],
    queryFn: () => api.get('/poll-day/agents', { params: { electionId: selectedElectionId } }),
    enabled: !!selectedElectionId,
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const election = electionData?.data?.data;
  const parts = partsData?.data?.data || [];
  const pollDay = pollDayData?.data?.data || {};
  const boothTurnouts: BoothTurnout[] = pollDay.booths || [];
  const agents = agentsData?.data?.data || [];

  // Calculate summary stats
  const totalVoters = election?.totalVoters || boothTurnouts.reduce((sum, b) => sum + b.totalVoters, 0);
  const totalVoted = boothTurnouts.reduce((sum, b) => sum + b.votedCount, 0);
  const overallTurnout = totalVoters > 0 ? ((totalVoted / totalVoters) * 100).toFixed(1) : '0.0';
  const activeAgents = agents.filter((a: any) => a.isActive).length;

  // Filter booths by search
  const filteredBooths = boothTurnouts.filter((booth) =>
    booth.boothName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booth.boothNumber.toString().includes(searchTerm)
  );

  // Time-based turnout for chart (mock data - would come from API)
  const hourlyTurnout: TurnoutByTime[] = [
    { time: '7:00', count: 0, cumulative: 0, percent: 0 },
    { time: '8:00', count: Math.floor(totalVoted * 0.05), cumulative: Math.floor(totalVoted * 0.05), percent: parseFloat(overallTurnout) * 0.05 },
    { time: '9:00', count: Math.floor(totalVoted * 0.1), cumulative: Math.floor(totalVoted * 0.15), percent: parseFloat(overallTurnout) * 0.15 },
    { time: '10:00', count: Math.floor(totalVoted * 0.15), cumulative: Math.floor(totalVoted * 0.3), percent: parseFloat(overallTurnout) * 0.3 },
    { time: '11:00', count: Math.floor(totalVoted * 0.15), cumulative: Math.floor(totalVoted * 0.45), percent: parseFloat(overallTurnout) * 0.45 },
    { time: '12:00', count: Math.floor(totalVoted * 0.1), cumulative: Math.floor(totalVoted * 0.55), percent: parseFloat(overallTurnout) * 0.55 },
    { time: '13:00', count: Math.floor(totalVoted * 0.08), cumulative: Math.floor(totalVoted * 0.63), percent: parseFloat(overallTurnout) * 0.63 },
    { time: '14:00', count: Math.floor(totalVoted * 0.1), cumulative: Math.floor(totalVoted * 0.73), percent: parseFloat(overallTurnout) * 0.73 },
    { time: '15:00', count: Math.floor(totalVoted * 0.1), cumulative: Math.floor(totalVoted * 0.83), percent: parseFloat(overallTurnout) * 0.83 },
    { time: '16:00', count: Math.floor(totalVoted * 0.1), cumulative: Math.floor(totalVoted * 0.93), percent: parseFloat(overallTurnout) * 0.93 },
    { time: '17:00', count: Math.floor(totalVoted * 0.07), cumulative: totalVoted, percent: parseFloat(overallTurnout) },
  ];

  if (!selectedElectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircleIcon className="h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Election Selected</h2>
          <p className="text-gray-500">Please select an election from the sidebar to view poll day data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Poll Day Manager</h1>
          <p className="text-gray-500">Real-time voter turnout tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <ActivityIcon className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Voters</p>
                <p className="text-2xl font-bold">{totalVoters.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Voted</p>
                <p className="text-2xl font-bold">{totalVoted.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUpIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Turnout</p>
                <p className="text-2xl font-bold">{overallTurnout}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MapPinIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Booths</p>
                <p className="text-2xl font-bold">{boothTurnouts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-100 rounded-lg">
                <UserIcon className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Agents</p>
                <p className="text-2xl font-bold">{activeAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Turnout Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">{overallTurnout}%</span>
            </div>
            <ProgressBar value={parseFloat(overallTurnout)} />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{totalVoted.toLocaleString()} voted</span>
              <span>{(totalVoters - totalVoted).toLocaleString()} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="booths" className="space-y-4">
        <TabsList>
          <TabsTrigger value="booths" className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4" />Booth-wise Turnout
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />Hourly Timeline
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />Booth Agents
          </TabsTrigger>
        </TabsList>

        {/* Booth-wise Turnout */}
        <TabsContent value="booths" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search booths..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedPart} onValueChange={setSelectedPart}>
              <SelectTrigger className="w-full md:w-[250px]">
                <FilterIcon className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by Part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parts</SelectItem>
                {parts.map((part: any) => (
                  <SelectItem key={part.id} value={part.id}>
                    Part {part.partNumber || part.partNo} - {part.partName || part.boothName || part.partNameEn || '-'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booth #</TableHead>
                      <TableHead>Booth Name</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Voted</TableHead>
                      <TableHead>Turnout</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Last Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBooths.map((booth) => (
                      <TableRow key={booth.boothId}>
                        <TableCell className="font-medium">{booth.boothNumber}</TableCell>
                        <TableCell>{booth.boothName}</TableCell>
                        <TableCell className="text-right">{booth.totalVoters.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{booth.votedCount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <ProgressBar value={booth.turnoutPercent} className="flex-1" />
                            <span className="text-sm font-medium w-12 text-right">
                              {booth.turnoutPercent.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {booth.agentName ? (
                            <Badge variant="outline">{booth.agentName}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {booth.lastVotedAt ? (
                            <span className="text-sm text-gray-500">
                              {new Date(booth.lastVotedAt).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredBooths.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No booth data available yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hourly Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hourly Voter Turnout</CardTitle>
              <CardDescription>Voting pattern throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hourlyTurnout.map((hour) => (
                  <div key={hour.time} className="flex items-center gap-4">
                    <span className="w-16 text-sm font-medium">{hour.time}</span>
                    <div className="flex-1">
                      <ProgressBar value={hour.percent} />
                    </div>
                    <span className="w-20 text-sm text-right">{hour.cumulative.toLocaleString()}</span>
                    <span className="w-16 text-sm text-right font-medium">{hour.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booth Agents */}
        <TabsContent value="agents">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Booth</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Votes Marked</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent: any) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.cadre?.voterName || agent.cadre?.name || agent.name || '-'}</TableCell>
                      <TableCell>{agent.cadre?.mobile || agent.mobile || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Booth {agent.booth?.boothNumber || agent.booth?.partNumber || agent.booth?.partNo || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={agent.isActive ? 'default' : 'secondary'}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{agent.cadre?.votesMarked || 0}</TableCell>
                      <TableCell>
                        {agent.cadre?.lastActiveAt ? (
                          <span className="text-sm text-gray-500">
                            {new Date(agent.cadre.lastActiveAt).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {agents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No booth agents assigned yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
