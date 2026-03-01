import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { candidatesAPI, masterDataAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import {
  SearchIcon,
  UserIcon,
  ShieldIcon,
  SwordsIcon,
  CheckCircleIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  SparklesIcon,
} from 'lucide-react';
import { toast } from 'sonner';

const nominationStatuses = [
  { value: 'FILED', label: 'Filed', color: 'bg-blue-500' },
  { value: 'ACCEPTED', label: 'Accepted', color: 'bg-green-500' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-500' },
  { value: 'WITHDRAWN', label: 'Withdrawn', color: 'bg-muted/500' },
];

const socialMediaPlatforms = [
  { value: 'FACEBOOK', label: 'FB', color: 'text-blue-600' },
  { value: 'TWITTER', label: 'X', color: 'text-sky-500' },
  { value: 'INSTAGRAM', label: 'IG', color: 'text-pink-600' },
  { value: 'YOUTUBE', label: 'YT', color: 'text-red-600' },
  { value: 'LINKEDIN', label: 'LI', color: 'text-blue-700' },
];

export function NominationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [battleCardDialogOpen, setBattleCardDialogOpen] = useState(false);
  const [selectedOurCandidate, setSelectedOurCandidate] = useState<any>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<any>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectedElectionId } = useElectionStore();

  // Fetch candidates
  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ['candidates', selectedElectionId, search, statusFilter],
    queryFn: () => candidatesAPI.getAll(selectedElectionId!, {
      search: search || undefined,
      nominationStatus: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    enabled: !!selectedElectionId,
  });

  // Fetch parties for filter
  const { data: partiesData } = useQuery({
    queryKey: ['parties', selectedElectionId],
    queryFn: () => masterDataAPI.getParties(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  // AI Generate battle card mutation
  const generateBattleCardMutation = useMutation({
    mutationFn: () => candidatesAPI.generateBattleCard(selectedOurCandidate!.id, selectedOpponent!.id),
    onSuccess: () => {
      toast.success('AI Battle Card generated successfully!');
      setBattleCardDialogOpen(false);
      setSelectedOurCandidate(null);
      setSelectedOpponent(null);
      queryClient.invalidateQueries({ queryKey: ['candidate-battle-cards'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to generate battle card');
    },
  });

  const candidates = candidatesData?.data?.data || [];
  const parties = partiesData?.data?.data || [];

  // Filter candidates by party
  const filteredCandidates = partyFilter === 'all'
    ? candidates
    : candidates.filter((c: any) => c.partyId === partyFilter);

  // Get our candidates and opponents
  const ourCandidates = candidates.filter((c: any) => c.isOurCandidate);
  const opponents = candidates.filter((c: any) => !c.isOurCandidate);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = nominationStatuses.find(s => s.value === status);
    if (!statusConfig) return <Badge variant="outline">{status || 'N/A'}</Badge>;

    return (
      <Badge className={`${statusConfig.color} text-white`}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getTotalSocialFollowers = (socialMedia: any[]) => {
    if (!socialMedia || !Array.isArray(socialMedia)) return 0;
    return socialMedia.reduce((sum, sm) => sum + (sm.followers || 0), 0);
  };

  if (!selectedElectionId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Please select an election to view nominations</p>
        <Button className="mt-4" onClick={() => navigate('/elections')}>
          Go to Elections
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Nominations</h1>
          <p className="text-muted-foreground">View all nominated candidates and manage battle cards</p>
        </div>
        <Dialog open={battleCardDialogOpen} onOpenChange={(open) => {
          if (!generateBattleCardMutation.isPending) setBattleCardDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button disabled={ourCandidates.length === 0} className="bg-purple-600 hover:bg-purple-700">
              <SparklesIcon className="h-4 w-4 mr-2" />
              EC AI Battle Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-purple-600" />
                ElectionCaffe AI Battle Card
              </DialogTitle>
              <DialogDescription>
                Select candidates and our AI will analyze their profiles, strengths, weaknesses, and generate a comprehensive battle card.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Our Candidate *</Label>
                <Select
                  value={selectedOurCandidate?.id || ''}
                  onValueChange={(v) => setSelectedOurCandidate(ourCandidates.find((c: any) => c.id === v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select our candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {ourCandidates.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.party?.partyShortName || 'Ind'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Opponent *</Label>
                <Select
                  value={selectedOpponent?.id || ''}
                  onValueChange={(v) => setSelectedOpponent(opponents.find((c: any) => c.id === v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select opponent" />
                  </SelectTrigger>
                  <SelectContent>
                    {opponents.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.party?.partyShortName || 'Ind'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOurCandidate && selectedOpponent && (
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="h-12 w-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-1">
                        {selectedOurCandidate.photoUrl ? (
                          <img src={selectedOurCandidate.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <UserIcon className="h-6 w-6 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm font-medium">{selectedOurCandidate.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedOurCandidate.party?.partyShortName || 'Ind'}</p>
                    </div>
                    <div className="px-4">
                      <SwordsIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center flex-1">
                      <div className="h-12 w-12 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-1">
                        {selectedOpponent.photoUrl ? (
                          <img src={selectedOpponent.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <UserIcon className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      <p className="text-sm font-medium">{selectedOpponent.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedOpponent.party?.partyShortName || 'Ind'}</p>
                    </div>
                  </div>
                </div>
              )}

              {generateBattleCardMutation.isPending && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <Spinner size="lg" className="mx-auto mb-3" />
                  <p className="font-medium text-purple-800">AI is analyzing candidates...</p>
                  <p className="text-sm text-purple-600 mt-1">Comparing profiles, strengths, weaknesses, and generating strategy. This may take 15-30 seconds.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBattleCardDialogOpen(false)}
                disabled={generateBattleCardMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => generateBattleCardMutation.mutate()}
                disabled={generateBattleCardMutation.isPending || !selectedOurCandidate || !selectedOpponent}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generateBattleCardMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Generate Battle Card
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{candidates.length}</p>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {candidates.filter((c: any) => c.nominationStatus === 'ACCEPTED').length}
                </p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-muted">
                <ShieldIcon className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ourCandidates.length}</p>
                <p className="text-sm text-muted-foreground">Our Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <SwordsIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{opponents.length}</p>
                <p className="text-sm text-muted-foreground">Opponents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {nominationStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={partyFilter} onValueChange={setPartyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by party" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parties</SelectItem>
                {parties.map((party: any) => (
                  <SelectItem key={party.id} value={party.id}>
                    {party.shortName || party.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Candidates</TabsTrigger>
          <TabsTrigger value="our">Our Candidates</TabsTrigger>
          <TabsTrigger value="opponents">Opponents</TabsTrigger>
        </TabsList>

        {/* All Candidates Tab */}
        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No candidates found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredCandidates.map((candidate: any) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      expanded={expandedCandidate === candidate.id}
                      onToggle={() => setExpandedCandidate(
                        expandedCandidate === candidate.id ? null : candidate.id
                      )}
                      getStatusBadge={getStatusBadge}
                      formatNumber={formatNumber}
                      getTotalSocialFollowers={getTotalSocialFollowers}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Our Candidates Tab */}
        <TabsContent value="our">
          <Card>
            <CardContent className="p-0">
              {ourCandidates.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No candidates marked as ours</p>
                </div>
              ) : (
                <div className="divide-y">
                  {ourCandidates.map((candidate: any) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      expanded={expandedCandidate === candidate.id}
                      onToggle={() => setExpandedCandidate(
                        expandedCandidate === candidate.id ? null : candidate.id
                      )}
                      getStatusBadge={getStatusBadge}
                      formatNumber={formatNumber}
                      getTotalSocialFollowers={getTotalSocialFollowers}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opponents Tab */}
        <TabsContent value="opponents">
          <Card>
            <CardContent className="p-0">
              {opponents.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No opponent candidates found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {opponents.map((candidate: any) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      expanded={expandedCandidate === candidate.id}
                      onToggle={() => setExpandedCandidate(
                        expandedCandidate === candidate.id ? null : candidate.id
                      )}
                      getStatusBadge={getStatusBadge}
                      formatNumber={formatNumber}
                      getTotalSocialFollowers={getTotalSocialFollowers}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Battle Cards Section */}
      {ourCandidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SwordsIcon className="h-5 w-5" />
              Battle Cards
            </CardTitle>
            <CardDescription>
              Comparison cards for our candidates against opponents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ourCandidates.map((candidate: any) => (
                <BattleCardsList
                  key={candidate.id}
                  candidate={candidate}
                  opponents={opponents}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Candidate Row Component
function CandidateRow({
  candidate,
  expanded,
  onToggle,
  getStatusBadge,
  formatNumber,
  getTotalSocialFollowers,
}: {
  candidate: any;
  expanded: boolean;
  onToggle: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatNumber: (num: number) => string;
  getTotalSocialFollowers: (socialMedia: any[]) => number;
}) {
  const navigate = useNavigate();

  return (
    <div>
      <div
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {candidate.photoUrl ? (
              <img
                src={candidate.photoUrl}
                alt={candidate.name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <UserIcon className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{candidate.name}</p>
              {candidate.isOurCandidate && (
                <Badge variant="success" className="shrink-0">Our</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              {candidate.party && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">{candidate.party.shortName || candidate.party.name}</span>
                </span>
              )}
              {candidate.nominationNumber && (
                <span>#{candidate.nominationNumber}</span>
              )}
              {candidate.age && <span>{candidate.age} yrs</span>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center hidden sm:block">
              <p className="text-lg font-bold">{formatNumber(getTotalSocialFollowers(candidate.socialMedia))}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            {getStatusBadge(candidate.nominationStatus)}
            {expanded ? (
              <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 bg-muted/50 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            {/* Background */}
            <div>
              <h4 className="font-medium text-sm text-foreground mb-2">Background</h4>
              <div className="space-y-1 text-sm">
                {candidate.education && (
                  <p><span className="text-muted-foreground">Education:</span> {candidate.education}</p>
                )}
                {candidate.profession && (
                  <p><span className="text-muted-foreground">Profession:</span> {candidate.profession}</p>
                )}
                {candidate.experience && (
                  <p className="text-muted-foreground line-clamp-2">{candidate.experience}</p>
                )}
              </div>
            </div>

            {/* Social Media Stats */}
            <div>
              <h4 className="font-medium text-sm text-foreground mb-2">Social Media</h4>
              {candidate.socialMedia && candidate.socialMedia.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.socialMedia.map((sm: any) => {
                    const platform = socialMediaPlatforms.find(p => p.value === sm.platform);
                    return (
                      <div
                        key={sm.id}
                        className="flex items-center gap-1 px-2 py-1 bg-card rounded border text-sm"
                      >
                        <span className={`font-medium ${platform?.color || ''}`}>
                          {platform?.label || sm.platform}
                        </span>
                        <span className="text-muted-foreground">{formatNumber(sm.followers || 0)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No social media profiles</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:items-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/candidates');
                }}
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                View Profile
              </Button>
              {candidate.mobile && (
                <p className="text-sm text-muted-foreground">{candidate.mobile}</p>
              )}
              {candidate.email && (
                <p className="text-sm text-muted-foreground truncate">{candidate.email}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Battle Cards List Component
function BattleCardsList({ candidate, opponents }: { candidate: any; opponents: any[] }) {
  const navigate = useNavigate();
  const { data: battleCardsData } = useQuery({
    queryKey: ['candidate-battle-cards', candidate.id],
    queryFn: () => candidatesAPI.getBattleCards(candidate.id),
    enabled: !!candidate.id,
  });

  const battleCards = battleCardsData?.data?.data || [];

  // Handle both old format (string[]) and new format (object[])
  const getLabel = (item: any): string =>
    typeof item === 'string' ? item : item?.strength || item?.weakness || item?.detail || '';

  if (battleCards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">{candidate.name}</p>
          <p className="text-xs text-muted-foreground mt-1">No battle cards yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">{candidate.name}</h4>
      {battleCards.map((bc: any) => {
        const opponent = opponents.find((o: any) => o.id === bc.opponentId);
        return (
          <Card
            key={bc.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/battle-cards/${candidate.id}/${bc.id}`)}
          >
            <div className="h-1 bg-gradient-to-r from-green-500 to-red-500" />
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{bc.title}</p>
                <Badge variant="outline" className="text-xs">
                  vs {opponent?.name || 'Opponent'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{bc.summary}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-green-600 font-medium mb-1">Our Strengths</p>
                  <ul className="space-y-0.5">
                    {(bc.ourStrengths || []).slice(0, 2).map((s: any, i: number) => (
                      <li key={i} className="text-muted-foreground truncate">+ {getLabel(s)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-red-600 font-medium mb-1">Their Weaknesses</p>
                  <ul className="space-y-0.5">
                    {(bc.opponentWeaknesses || []).slice(0, 2).map((w: any, i: number) => (
                      <li key={i} className="text-muted-foreground truncate">- {getLabel(w)}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-brand font-medium mt-2 text-right">View Full Analysis →</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
