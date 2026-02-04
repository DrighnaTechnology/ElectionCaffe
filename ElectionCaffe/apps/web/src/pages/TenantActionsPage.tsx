import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsAPI, nbAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import {
  CheckCircleIcon,
  ListTodoIcon,
  NewspaperIcon,
  BrainCircuitIcon,
  MegaphoneIcon,
  MicIcon,
  SendIcon,
  SparklesIcon,
  FileTextIcon,
  MessageSquareIcon,
  RadioIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
  ZapIcon,
  TrendingUpIcon,
  LayoutDashboardIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PARTY_LINE_LEVELS = [
  { value: 'CENTRAL_COMMITTEE', label: 'Central Committee', icon: '🏛️' },
  { value: 'CONSTITUENCY_HEAD', label: 'Constituency Head', icon: '👔' },
  { value: 'SECTOR_OFFICER', label: 'Sector Officer', icon: '📋' },
  { value: 'BOOTH_INCHARGE', label: 'Booth Incharge', icon: '🏠' },
  { value: 'VOLUNTEER', label: 'Volunteer', icon: '🙋' },
];

const SPEECH_POINT_TYPES = [
  { value: 'KEY_MESSAGE', label: 'Key Message', color: 'bg-blue-100 text-blue-800' },
  { value: 'COUNTER_NARRATIVE', label: 'Counter Narrative', color: 'bg-red-100 text-red-800' },
  { value: 'LOCAL_ISSUE', label: 'Local Issue', color: 'bg-green-100 text-green-800' },
  { value: 'SCHEME_HIGHLIGHT', label: 'Scheme Highlight', color: 'bg-purple-100 text-purple-800' },
  { value: 'EMOTIONAL_APPEAL', label: 'Emotional Appeal', color: 'bg-pink-100 text-pink-800' },
  { value: 'FACT_STAT', label: 'Fact & Stats', color: 'bg-yellow-100 text-yellow-800' },
];

export function TenantActionsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Queries
  const { data: nbDashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['nb-dashboard'],
    queryFn: () => nbAPI.getDashboard(),
  });

  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['tenant-news-for-actions'],
    queryFn: () => newsAPI.getAll({ limit: 50 }),
  });

  const { data: parsedNewsData, isLoading: parsedNewsLoading } = useQuery({
    queryKey: ['nb-parsed-news'],
    queryFn: () => nbAPI.getParsedNews({ limit: 50 }),
  });

  const { data: analysesData } = useQuery({
    queryKey: ['nb-analyses'],
    queryFn: () => nbAPI.getAnalyses({ limit: 50 }),
  });

  const { data: actionPlansData } = useQuery({
    queryKey: ['nb-action-plans'],
    queryFn: () => nbAPI.getActionPlans({ limit: 50 }),
  });

  const { data: partyLinesData } = useQuery({
    queryKey: ['nb-party-lines'],
    queryFn: () => nbAPI.getPartyLines({ limit: 50 }),
  });

  const { data: speechPointsData } = useQuery({
    queryKey: ['nb-speech-points'],
    queryFn: () => nbAPI.getSpeechPoints({ limit: 50 }),
  });

  const { data: broadcastsData } = useQuery({
    queryKey: ['nb-broadcasts'],
    queryFn: () => nbAPI.getBroadcasts({ limit: 50 }),
  });

  // Mutations
  const parseNewsMutation = useMutation({
    mutationFn: (newsId: string) => nbAPI.parseNews(newsId),
    onSuccess: () => {
      toast.success('News queued for parsing');
      queryClient.invalidateQueries({ queryKey: ['nb-parsed-news'] });
      queryClient.invalidateQueries({ queryKey: ['nb-dashboard'] });
    },
    onError: () => toast.error('Failed to parse news'),
  });

  const triggerAnalysisMutation = useMutation({
    mutationFn: (parsedNewsId: string) => nbAPI.triggerAnalysis(parsedNewsId),
    onSuccess: () => {
      toast.success('AI analysis started');
      queryClient.invalidateQueries({ queryKey: ['nb-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['nb-dashboard'] });
    },
    onError: () => toast.error('Failed to start analysis'),
  });

  const generateActionPlansMutation = useMutation({
    mutationFn: (analysisId: string) => nbAPI.generateActionPlans(analysisId),
    onSuccess: () => {
      toast.success('Action plans generated for all roles');
      queryClient.invalidateQueries({ queryKey: ['nb-action-plans'] });
      queryClient.invalidateQueries({ queryKey: ['nb-dashboard'] });
    },
    onError: () => toast.error('Failed to generate action plans'),
  });

  const generatePartyLinesMutation = useMutation({
    mutationFn: (analysisId: string) => nbAPI.generatePartyLines(analysisId),
    onSuccess: () => {
      toast.success('Party line guidelines generated');
      queryClient.invalidateQueries({ queryKey: ['nb-party-lines'] });
      queryClient.invalidateQueries({ queryKey: ['nb-dashboard'] });
    },
    onError: () => toast.error('Failed to generate party lines'),
  });

  const generateSpeechPointsMutation = useMutation({
    mutationFn: (analysisId: string) => nbAPI.generateSpeechPoints(analysisId),
    onSuccess: () => {
      toast.success('Speech points generated for candidate');
      queryClient.invalidateQueries({ queryKey: ['nb-speech-points'] });
      queryClient.invalidateQueries({ queryKey: ['nb-dashboard'] });
    },
    onError: () => toast.error('Failed to generate speech points'),
  });

  const approveActionPlanMutation = useMutation({
    mutationFn: (id: string) => nbAPI.approveActionPlan(id),
    onSuccess: () => {
      toast.success('Action plan approved');
      queryClient.invalidateQueries({ queryKey: ['nb-action-plans'] });
    },
    onError: () => toast.error('Failed to approve'),
  });

  const publishPartyLineMutation = useMutation({
    mutationFn: (id: string) => nbAPI.publishPartyLine(id),
    onSuccess: () => {
      toast.success('Party line published');
      queryClient.invalidateQueries({ queryKey: ['nb-party-lines'] });
    },
    onError: () => toast.error('Failed to publish'),
  });

  const approveSpeechPointMutation = useMutation({
    mutationFn: (id: string) => nbAPI.approveSpeechPoint(id),
    onSuccess: () => {
      toast.success('Speech point approved');
      queryClient.invalidateQueries({ queryKey: ['nb-speech-points'] });
    },
    onError: () => toast.error('Failed to approve'),
  });

  const sendBroadcastMutation = useMutation({
    mutationFn: (id: string) => nbAPI.sendBroadcast(id),
    onSuccess: () => {
      toast.success('Broadcast sent successfully');
      queryClient.invalidateQueries({ queryKey: ['nb-broadcasts'] });
    },
    onError: () => toast.error('Failed to send broadcast'),
  });

  // Data extraction
  const dashboard = nbDashboard?.data?.data || { stats: {}, recent: {} };
  const news = newsData?.data?.data?.data || [];
  const parsedNews = parsedNewsData?.data?.data?.data || [];
  const analyses = analysesData?.data?.data?.data || [];
  const actionPlans = actionPlansData?.data?.data?.data || [];
  const partyLines = partyLinesData?.data?.data?.data || [];
  const speechPoints = speechPointsData?.data?.data?.data || [];
  const broadcasts = broadcastsData?.data?.data?.data || [];

  // Helper functions
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      DRAFT: 'bg-gray-100 text-gray-800',
      APPROVED: 'bg-green-100 text-green-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      SENT: 'bg-green-100 text-green-800',
      SCHEDULED: 'bg-purple-100 text-purple-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getSentimentBadge = (sentiment: string) => {
    const styles: Record<string, string> = {
      POSITIVE: 'bg-green-100 text-green-800',
      NEGATIVE: 'bg-red-100 text-red-800',
      NEUTRAL: 'bg-gray-100 text-gray-800',
      MIXED: 'bg-yellow-100 text-yellow-800',
    };
    return styles[sentiment] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return styles[priority] || 'bg-gray-100 text-gray-800';
  };

  const getLevelIcon = (level: string) => {
    const levelInfo = PARTY_LINE_LEVELS.find((l) => l.value === level);
    return levelInfo?.icon || '📋';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BrainCircuitIcon className="h-7 w-7 text-primary" />
            AI-Powered Actions & Campaign Management
          </h1>
          <p className="text-muted-foreground">
            Analyze news, generate action plans, create party guidelines, and manage campaign speeches
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['nb-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['nb-parsed-news'] });
            queryClient.invalidateQueries({ queryKey: ['nb-analyses'] });
            queryClient.invalidateQueries({ queryKey: ['nb-action-plans'] });
            queryClient.invalidateQueries({ queryKey: ['nb-party-lines'] });
            queryClient.invalidateQueries({ queryKey: ['nb-speech-points'] });
          }}
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard" className="flex items-center gap-1">
            <LayoutDashboardIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-1">
            <NewspaperIcon className="h-4 w-4" />
            <span className="hidden sm:inline">News</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-1">
            <BrainCircuitIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-1">
            <ListTodoIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Actions</span>
          </TabsTrigger>
          <TabsTrigger value="party-line" className="flex items-center gap-1">
            <MessageSquareIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Party Line</span>
          </TabsTrigger>
          <TabsTrigger value="speeches" className="flex items-center gap-1">
            <MicIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Speeches</span>
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="flex items-center gap-1">
            <RadioIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Broadcast</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashboardLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <NewspaperIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard.stats?.parsedNews?.total || 0}</p>
                        <p className="text-sm text-muted-foreground">Parsed News</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <BrainCircuitIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard.stats?.analyses?.completed || 0}</p>
                        <p className="text-sm text-muted-foreground">AI Analyses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <ListTodoIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard.stats?.actionPlans?.approved || 0}</p>
                        <p className="text-sm text-muted-foreground">Approved Plans</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <RadioIcon className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard.stats?.broadcasts?.sent || 0}</p>
                        <p className="text-sm text-muted-foreground">Broadcasts Sent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Workflow Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-primary" />
                    AI Campaign Workflow
                  </CardTitle>
                  <CardDescription>
                    Follow these steps to leverage AI for your campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">1</div>
                      <div>
                        <p className="font-medium">Parse News</p>
                        <p className="text-xs text-muted-foreground">Extract key information</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground hidden md:block" />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">2</div>
                      <div>
                        <p className="font-medium">AI Analysis</p>
                        <p className="text-xs text-muted-foreground">Analyze with local context</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground hidden md:block" />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold">3</div>
                      <div>
                        <p className="font-medium">Generate Plans</p>
                        <p className="text-xs text-muted-foreground">Role-based action plans</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground hidden md:block" />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 font-bold">4</div>
                      <div>
                        <p className="font-medium">Party Line</p>
                        <p className="text-xs text-muted-foreground">Create messaging guidelines</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground hidden md:block" />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold">5</div>
                      <div>
                        <p className="font-medium">Broadcast</p>
                        <p className="text-xs text-muted-foreground">Send to team members</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Parsed News</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(dashboard.recent?.parsedNews || []).slice(0, 5).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.parsedTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.category} • {format(new Date(item.parsedAt), 'PP')}
                            </p>
                          </div>
                          <Badge className={getSentimentBadge(item.sentiment)}>{item.sentiment}</Badge>
                        </div>
                      ))}
                      {(!dashboard.recent?.parsedNews || dashboard.recent?.parsedNews.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">No parsed news yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Action Plans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(dashboard.recent?.actionPlans || []).slice(0, 5).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {getLevelIcon(item.targetRole)} {item.targetRole?.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <Badge className={getStatusBadge(item.status)}>{item.status}</Badge>
                        </div>
                      ))}
                      {(!dashboard.recent?.actionPlans || dashboard.recent?.actionPlans.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">No action plans yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NewspaperIcon className="h-5 w-5" />
                News Feed - Parse for Analysis
              </CardTitle>
              <CardDescription>
                Select news items to parse and prepare for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {newsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {news.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.summary}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{item.category}</Badge>
                          <Badge className={getPriorityBadge(item.priority)}>{item.priority}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.publishedAt ? format(new Date(item.publishedAt), 'PP') : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => parseNewsMutation.mutate(item.id)}
                        disabled={parseNewsMutation.isPending}
                      >
                        <ZapIcon className="h-4 w-4 mr-2" />
                        Parse
                      </Button>
                    </div>
                  ))}
                  {news.length === 0 && (
                    <div className="text-center py-12">
                      <NewspaperIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No news available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parsed News */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5" />
                Parsed News - Ready for Analysis
              </CardTitle>
              <CardDescription>
                News items that have been parsed and are ready for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedNewsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Relevance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedNews.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.parsedTitle}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.parsedSummary}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSentimentBadge(item.sentiment)}>{item.sentiment}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{item.relevanceScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(item.status)}>{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => triggerAnalysisMutation.mutate(item.id)}
                            disabled={item.status !== 'PENDING' && item.status !== 'COMPLETED' || triggerAnalysisMutation.isPending}
                          >
                            <BrainCircuitIcon className="h-4 w-4 mr-1" />
                            Analyze
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {parsedNews.length === 0 && !parsedNewsLoading && (
                <div className="text-center py-12">
                  <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No parsed news yet. Parse news items from the feed above.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuitIcon className="h-5 w-5" />
                AI News Analysis
              </CardTitle>
              <CardDescription>
                AI-powered analysis combining news with local demographics, party context, and historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>News</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Analyzed At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.map((analysis: any) => (
                    <TableRow key={analysis.id}>
                      <TableCell>
                        <p className="font-medium">{analysis.parsedNews?.parsedTitle || 'N/A'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(analysis.status)}>{analysis.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {analysis.analyzedAt ? format(new Date(analysis.analyzedAt), 'PPp') : 'Pending'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Generate <ChevronRightIcon className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => generateActionPlansMutation.mutate(analysis.id)}
                              disabled={analysis.status !== 'COMPLETED'}
                            >
                              <ListTodoIcon className="h-4 w-4 mr-2" />
                              Generate Action Plans
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => generatePartyLinesMutation.mutate(analysis.id)}
                              disabled={analysis.status !== 'COMPLETED'}
                            >
                              <MessageSquareIcon className="h-4 w-4 mr-2" />
                              Generate Party Lines
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => generateSpeechPointsMutation.mutate(analysis.id)}
                              disabled={analysis.status !== 'COMPLETED'}
                            >
                              <MicIcon className="h-4 w-4 mr-2" />
                              Generate Speech Points
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {analyses.length === 0 && (
                <div className="text-center py-12">
                  <BrainCircuitIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No analyses yet. Trigger analysis from parsed news.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodoIcon className="h-5 w-5" />
                AI-Generated Action Plans by Role
              </CardTitle>
              <CardDescription>
                Role-specific action plans generated from AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {PARTY_LINE_LEVELS.map((level) => {
                  const levelPlans = actionPlans.filter((p: any) => p.targetRole === level.value);
                  return (
                    <AccordionItem key={level.value} value={level.value}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{level.icon}</span>
                          <span>{level.label}</span>
                          <Badge variant="outline">{levelPlans.length} plans</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {levelPlans.map((plan: any) => (
                            <div key={plan.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{plan.title}</p>
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getPriorityBadge(plan.priority)}>{plan.priority}</Badge>
                                  <Badge className={getStatusBadge(plan.status)}>{plan.status}</Badge>
                                </div>
                              </div>
                              {plan.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  onClick={() => approveActionPlanMutation.mutate(plan.id)}
                                >
                                  <ThumbsUpIcon className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                            </div>
                          ))}
                          {levelPlans.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                              No action plans for this role yet
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Party Line Tab */}
        <TabsContent value="party-line" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareIcon className="h-5 w-5" />
                Party Line Guidelines
              </CardTitle>
              <CardDescription>
                What to say, how to say it, and what NOT to say - guidelines for each hierarchy level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {PARTY_LINE_LEVELS.map((level) => {
                  const levelLines = partyLines.filter((l: any) => l.level === level.value);
                  return (
                    <AccordionItem key={level.value} value={level.value}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{level.icon}</span>
                          <span>{level.label}</span>
                          <Badge variant="outline">{levelLines.length} guidelines</Badge>
                          {levelLines.some((l: any) => l.isActive) && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {levelLines.map((line: any) => (
                            <div key={line.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-medium">{line.topic}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Target: {line.targetAudience?.join(', ') || 'All'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={line.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                    {line.isActive ? 'Published' : 'Draft'}
                                  </Badge>
                                  {!line.isActive && (
                                    <Button
                                      size="sm"
                                      onClick={() => publishPartyLineMutation.mutate(line.id)}
                                    >
                                      <SendIcon className="h-4 w-4 mr-1" />
                                      Publish
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="grid md:grid-cols-3 gap-4 text-sm">
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <p className="font-medium text-green-800 mb-2">✅ What to Say</p>
                                  <ul className="space-y-1 text-green-700">
                                    {(line.whatToSay || []).map((item: string, i: number) => (
                                      <li key={i}>• {item}</li>
                                    ))}
                                    {(!line.whatToSay || line.whatToSay.length === 0) && (
                                      <li className="text-muted-foreground italic">AI will generate content</li>
                                    )}
                                  </ul>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg">
                                  <p className="font-medium text-blue-800 mb-2">💬 How to Say</p>
                                  <p className="text-blue-700">{line.toneGuidance || 'Professional and clear'}</p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg">
                                  <p className="font-medium text-red-800 mb-2">❌ What NOT to Say</p>
                                  <ul className="space-y-1 text-red-700">
                                    {(line.whatNotToSay || []).map((item: string, i: number) => (
                                      <li key={i}>• {item}</li>
                                    ))}
                                    {(!line.whatNotToSay || line.whatNotToSay.length === 0) && (
                                      <li className="text-muted-foreground italic">AI will generate content</li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))}
                          {levelLines.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                              No party lines for this level yet
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Speeches Tab */}
        <TabsContent value="speeches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MicIcon className="h-5 w-5" />
                Speech Points for Candidate
              </CardTitle>
              <CardDescription>
                AI-generated talking points based on news, locality data, and campaign context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {SPEECH_POINT_TYPES.map((type) => {
                  const typePoints = speechPoints.filter((p: any) => p.pointType === type.value);
                  return (
                    <Card key={type.value}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <Badge className={type.color}>{type.label}</Badge>
                          <span className="text-muted-foreground">{typePoints.length}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {typePoints.slice(0, 3).map((point: any) => (
                            <div key={point.id} className="p-2 border rounded text-sm">
                              <p className="font-medium line-clamp-2">{point.title}</p>
                              <div className="flex items-center justify-between mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {point.priority}
                                </Badge>
                                {!point.isApproved && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => approveSpeechPointMutation.mutate(point.id)}
                                  >
                                    <ThumbsUpIcon className="h-3 w-3" />
                                  </Button>
                                )}
                                {point.isApproved && (
                                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </div>
                          ))}
                          {typePoints.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No points yet
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Approved Speech Points */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                Approved Speech Points - Ready for Campaign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Used In</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {speechPoints.filter((p: any) => p.isApproved).map((point: any) => {
                    const typeInfo = SPEECH_POINT_TYPES.find((t) => t.value === point.pointType);
                    return (
                      <TableRow key={point.id}>
                        <TableCell>
                          <p className="font-medium">{point.title}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={typeInfo?.color || 'bg-gray-100'}>
                            {typeInfo?.label || point.pointType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{point.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                            {point.impactScore}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{point.usedInCampaigns || 0} campaigns</span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <MegaphoneIcon className="h-4 w-4 mr-1" />
                            Add to Speech
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {speechPoints.filter((p: any) => p.isApproved).length === 0 && (
                <div className="text-center py-8">
                  <MicIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No approved speech points yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RadioIcon className="h-5 w-5" />
                Broadcast Guidelines to Workers
              </CardTitle>
              <CardDescription>
                Push party line guidelines to field workers via App, SMS, or WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Target Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.map((broadcast: any) => (
                    <TableRow key={broadcast.id}>
                      <TableCell>
                        <p className="font-medium line-clamp-2">{broadcast.message?.substring(0, 100)}...</p>
                        <p className="text-xs text-muted-foreground">
                          From: {broadcast.partyLine?.topic || 'N/A'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{broadcast.channel}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getLevelIcon(broadcast.targetLevel)}
                          <span className="text-sm">{broadcast.targetLevel?.replace(/_/g, ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(broadcast.status)}>{broadcast.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {broadcast.scheduledAt ? format(new Date(broadcast.scheduledAt), 'PPp') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {broadcast.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => sendBroadcastMutation.mutate(broadcast.id)}
                          >
                            <SendIcon className="h-4 w-4 mr-1" />
                            Send Now
                          </Button>
                        )}
                        {broadcast.status === 'SENT' && (
                          <span className="text-green-600 text-sm">Sent</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {broadcasts.length === 0 && (
                <div className="text-center py-12">
                  <RadioIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No broadcasts yet</h3>
                  <p className="text-muted-foreground">
                    Create broadcasts from published party lines to push guidelines to your team
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Broadcast from Active Party Lines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MegaphoneIcon className="h-5 w-5" />
                Quick Broadcast from Active Party Lines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {partyLines.filter((l: any) => l.isActive).map((line: any) => (
                  <div key={line.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getLevelIcon(line.level)}</span>
                        <div>
                          <p className="font-medium">{line.topic}</p>
                          <p className="text-xs text-muted-foreground">{line.level?.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <SendIcon className="h-4 w-4 mr-1" />
                        App
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <MessageSquareIcon className="h-4 w-4 mr-1" />
                        SMS
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <SendIcon className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                ))}
                {partyLines.filter((l: any) => l.isActive).length === 0 && (
                  <div className="col-span-2 text-center py-8">
                    <MessageSquareIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No active party lines. Publish party lines to enable broadcasting.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
