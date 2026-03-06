import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { aiAnalyticsAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DashboardRenderer } from '../components/ai-dashboard/DashboardRenderer';
import { exportDashboardAsPdf } from '../components/ai-dashboard/export-dashboard-html';
import {
  SparklesIcon,
  SaveIcon,
  LayoutDashboardIcon,
  TrashIcon,
  Loader2Icon,
  SendIcon,
  LibraryIcon,
  ArrowLeftIcon,
  CalendarIcon,
  RefreshCwIcon,
  WandIcon,
  BarChart3Icon,
  UsersIcon,
  MapPinIcon,
  TrendingUpIcon,
  FileDownIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../lib/utils';

interface DashboardConfig {
  title: string;
  description?: string;
  widgets: any[];
}

interface SavedDashboard {
  id: string;
  title: string;
  description?: string;
  prompt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: UsersIcon,
    label: 'Voter Demographics',
    prompt: 'Show me voter demographics by gender, religion and caste category breakdown',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: TrendingUpIcon,
    label: 'Political Analysis',
    prompt: 'Political leaning analysis — loyal vs swing vs opposition voters with booth-wise distribution',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: MapPinIcon,
    label: 'Booth Analysis',
    prompt: 'Booth-wise voter distribution with vulnerability levels and male/female ratio',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    icon: BarChart3Icon,
    label: 'Age Analysis',
    prompt: 'Age-wise voter distribution grouped by age with gender and political leaning breakdown',
    gradient: 'from-orange-500 to-orange-600',
  },
];

export function AIDashboardBuilderPage() {
  const { selectedElectionId } = useElectionStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('builder');
  const [prompt, setPrompt] = useState('');
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, any>>({});
  const [editableTitle, setEditableTitle] = useState('');
  const [viewingDashboardId, setViewingDashboardId] = useState<string | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<string | null>(null);

  // ── Library query ──────────────────────────────────────────────────────────
  const libraryQuery = useQuery({
    queryKey: ['ai-dashboard-library', selectedElectionId],
    queryFn: async () => {
      if (!selectedElectionId) return [];
      const res = await aiAnalyticsAPI.getDashboardLibrary(selectedElectionId);
      return res.data?.data || [];
    },
    enabled: !!selectedElectionId,
  });

  // ── Generate mutation ──────────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async (userPrompt: string) => {
      if (!selectedElectionId) throw new Error('No election selected');
      const res = await aiAnalyticsAPI.generateDashboard(selectedElectionId, userPrompt);
      return res.data?.data;
    },
    onSuccess: async (data) => {
      if (data?.dashboardConfig) {
        const config = data.dashboardConfig;
        setDashboardConfig(config);
        setEditableTitle(config.title || 'Untitled Dashboard');
        await executeWidgets(config.widgets);
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to generate dashboard';
      toast.error(msg);
    },
  });

  // ── Execute widgets ────────────────────────────────────────────────────────
  const [executingWidgets, setExecutingWidgets] = useState(false);

  async function executeWidgets(widgets: any[]) {
    if (!selectedElectionId || !widgets?.length) return;
    setExecutingWidgets(true);
    try {
      const res = await aiAnalyticsAPI.executeDashboard(selectedElectionId, widgets);
      setWidgetData(res.data?.data || {});
    } catch {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setExecutingWidgets(false);
    }
  }

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedElectionId || !dashboardConfig) throw new Error('No dashboard to save');
      const res = await aiAnalyticsAPI.saveDashboard(selectedElectionId, {
        title: editableTitle || dashboardConfig.title,
        description: dashboardConfig.description,
        prompt,
        dashboardConfig,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Dashboard saved to library');
      queryClient.invalidateQueries({ queryKey: ['ai-dashboard-library'] });
    },
    onError: () => {
      toast.error('Failed to save dashboard');
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!selectedElectionId) throw new Error('No election selected');
      await aiAnalyticsAPI.deleteDashboard(selectedElectionId, id);
    },
    onSuccess: () => {
      toast.success('Dashboard deleted');
      queryClient.invalidateQueries({ queryKey: ['ai-dashboard-library'] });
      if (viewingDashboardId) {
        setViewingDashboardId(null);
        setDashboardConfig(null);
        setWidgetData({});
      }
    },
    onError: () => {
      toast.error('Failed to delete dashboard');
    },
  });

  // ── Load saved dashboard ───────────────────────────────────────────────────
  async function loadDashboard(id: string) {
    if (!selectedElectionId) return;
    setLoadingDashboard(id);
    try {
      const res = await aiAnalyticsAPI.getDashboard(selectedElectionId, id);
      const dashboard = res.data?.data;
      if (dashboard?.dashboardConfig) {
        setDashboardConfig(dashboard.dashboardConfig);
        setEditableTitle(dashboard.title);
        setPrompt(dashboard.prompt || '');
        setViewingDashboardId(id);
        setActiveTab('builder');
        await executeWidgets(dashboard.dashboardConfig.widgets);
      }
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoadingDashboard(null);
    }
  }

  function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    setViewingDashboardId(null);
    setWidgetData({});
    generateMutation.mutate(prompt.trim());
  }

  function handleReset() {
    setDashboardConfig(null);
    setWidgetData({});
    setPrompt('');
    setEditableTitle('');
    setViewingDashboardId(null);
  }

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <LayoutDashboardIcon className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Select an election to get started</p>
        <p className="text-sm mt-1">AI Dashboards require an active election context</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          AI Dashboard Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1 ml-11">
          Describe what you want to see — AI creates a live dashboard instantly
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="builder" className="gap-2 data-[state=active]:shadow-sm">
            <WandIcon className="h-4 w-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2 data-[state=active]:shadow-sm">
            <LibraryIcon className="h-4 w-4" />
            Library
            {(libraryQuery.data as any[])?.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-[10px] px-1.5">
                {(libraryQuery.data as any[]).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Builder Tab ──────────────────────────────────────────────── */}
        <TabsContent value="builder" className="space-y-5 mt-5">
          {/* Prompt Input Area */}
          <div className="relative bg-card border rounded-2xl p-5 shadow-card">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Describe the dashboard you want..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[56px] max-h-[120px] resize-none border-0 bg-muted/40 rounded-xl px-4 py-3 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-2 self-end">
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !prompt.trim()}
                  className="rounded-xl h-11 px-5 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  {generateMutation.isPending ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendIcon className="h-4 w-4" />
                  )}
                  <span className="ml-2 font-medium">Generate</span>
                </Button>
              </div>
            </div>

            {/* Generating State */}
            {generateMutation.isPending && (
              <div className="mt-4 flex items-center gap-3 px-1">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing your request and designing the dashboard...
                </p>
              </div>
            )}
          </div>

          {/* ── Dashboard Preview ──────────────────────────────────────── */}
          {dashboardConfig && !generateMutation.isPending && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-400">
              {/* Toolbar */}
              <div className="flex items-center gap-3 flex-wrap bg-card border rounded-xl px-4 py-3 shadow-card">
                {viewingDashboardId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="rounded-lg"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
                    Back
                  </Button>
                )}
                <Input
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="text-base font-semibold max-w-sm border-0 bg-transparent px-2 h-9 focus-visible:ring-1 focus-visible:ring-primary/50"
                />
                <div className="flex-1" />
                {dashboardConfig.description && (
                  <p className="text-xs text-muted-foreground hidden md:block max-w-xs truncate">
                    {dashboardConfig.description}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dashboardConfig && executeWidgets(dashboardConfig.widgets)}
                  disabled={executingWidgets}
                  className="rounded-lg"
                >
                  <RefreshCwIcon className={`h-3.5 w-3.5 mr-1.5 ${executingWidgets ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dashboardConfig && exportDashboardAsPdf(dashboardConfig, widgetData)}
                  className="rounded-lg"
                >
                  <FileDownIcon className="h-3.5 w-3.5 mr-1.5" />
                  Download PDF
                </Button>
                {!viewingDashboardId && (
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    size="sm"
                    className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md"
                  >
                    {saveMutation.isPending ? (
                      <Loader2Icon className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <SaveIcon className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Save to Library
                  </Button>
                )}
                {viewingDashboardId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this dashboard from library?')) {
                        deleteMutation.mutate(viewingDashboardId);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2Icon className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <TrashIcon className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Delete
                  </Button>
                )}
              </div>

              {/* Rendered Dashboard */}
              {executingWidgets ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
                    <SparklesIcon className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">Fetching live data...</p>
                </div>
              ) : (
                <DashboardRenderer
                  dashboardConfig={dashboardConfig}
                  widgetData={widgetData}
                />
              )}
            </div>
          )}

          {/* ── Empty State with Suggestions ──────────────────────────── */}
          {!dashboardConfig && !generateMutation.isPending && (
            <div className="flex flex-col items-center pt-8 pb-12">
              {/* Hero illustration */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl" />
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-100 dark:border-purple-900/30">
                  <SparklesIcon className="h-10 w-10 text-purple-500" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-foreground mb-1">What dashboard do you need?</h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-md text-center">
                Describe your data needs in plain language. AI will design a complete dashboard with charts, stats, and insights.
              </p>

              {/* Quick Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {PROMPT_SUGGESTIONS.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.label}
                      onClick={() => {
                        setPrompt(suggestion.prompt);
                        generateMutation.mutate(suggestion.prompt);
                      }}
                      className="group relative text-left p-4 rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${suggestion.gradient} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-0.5">
                            {suggestion.label}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {suggestion.prompt}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Library Tab ──────────────────────────────────────────────── */}
        <TabsContent value="library" className="mt-5">
          {libraryQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground mt-4">Loading library...</p>
            </div>
          ) : !(libraryQuery.data as any[])?.length ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="p-5 rounded-2xl bg-muted/50 mb-5">
                <LibraryIcon className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">Your library is empty</p>
              <p className="text-sm text-muted-foreground mb-5">
                Dashboards you save will appear here for quick access
              </p>
              <Button
                onClick={() => setActiveTab('builder')}
                className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-md"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Create Your First Dashboard
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(libraryQuery.data as SavedDashboard[]).map((dashboard) => (
                <div
                  key={dashboard.id}
                  onClick={() => loadDashboard(dashboard.id)}
                  className="group relative bg-card border rounded-xl p-5 shadow-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out"
                >
                  {/* Loading overlay */}
                  {loadingDashboard === dashboard.id && (
                    <div className="absolute inset-0 bg-card/80 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    </div>
                  )}

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this dashboard?')) {
                        deleteMutation.mutate(dashboard.id);
                      }
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>

                  {/* Color accent bar */}
                  <div className="h-1 w-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 mb-4" />

                  <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-2 pr-8">
                    {dashboard.title}
                  </h3>

                  {dashboard.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {dashboard.description}
                    </p>
                  )}

                  {dashboard.prompt && (
                    <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-muted/50">
                      <SparklesIcon className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        {dashboard.prompt}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      {formatDate(dashboard.createdAt)}
                    </div>
                    {Array.isArray(dashboard.tags) && dashboard.tags.length > 0 && (
                      <div className="flex gap-1">
                        {dashboard.tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
