import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { aiAnalyticsAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
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
import {
  AlertTriangleIcon,
  BrainCircuitIcon,
  TrendingUpIcon,
  UsersIcon,
  ShieldAlertIcon,
  PieChartIcon,
  PlusIcon,
  PlayIcon,
  TrashIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber, formatDate } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

const analysisTypes = [
  { value: 'TURNOUT_PREDICTION', label: 'Turnout Prediction' },
  { value: 'SWING_VOTER', label: 'Swing Voter Analysis' },
  { value: 'BOOTH_RISK', label: 'Booth Risk Assessment' },
  { value: 'DEMOGRAPHIC', label: 'Demographic Insights' },
  { value: 'SENTIMENT', label: 'Sentiment Analysis' },
  { value: 'CUSTOM', label: 'Custom Analysis' },
];

export function AIAnalyticsPage() {
  const { selectedElectionId } = useElectionStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    analysisType: 'TURNOUT_PREDICTION',
    analysisName: '',
    description: '',
  });

  const queryClient = useQueryClient();

  const { data: analysesData, isLoading: analysesLoading } = useQuery({
    queryKey: ['ai-analyses', selectedElectionId],
    queryFn: () => aiAnalyticsAPI.getAll(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: turnoutData, isLoading: turnoutLoading } = useQuery({
    queryKey: ['ai-turnout', selectedElectionId],
    queryFn: () => aiAnalyticsAPI.getTurnoutPrediction(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: swingData, isLoading: swingLoading } = useQuery({
    queryKey: ['ai-swing', selectedElectionId],
    queryFn: () => aiAnalyticsAPI.getSwingVoterAnalysis(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ['ai-risk', selectedElectionId],
    queryFn: () => aiAnalyticsAPI.getBoothRiskAssessment(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: demographicData, isLoading: demographicLoading } = useQuery({
    queryKey: ['ai-demographic', selectedElectionId],
    queryFn: () => aiAnalyticsAPI.getDemographicInsights(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      aiAnalyticsAPI.create(selectedElectionId!, {
        analysisType: formData.analysisType,
        analysisName: formData.analysisName,
        description: formData.description || undefined,
      }),
    onSuccess: () => {
      toast.success('Analysis created and queued');
      setCreateOpen(false);
      setFormData({ analysisType: 'TURNOUT_PREDICTION', analysisName: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['ai-analyses'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create analysis');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiAnalyticsAPI.delete(selectedElectionId!, id),
    onSuccess: () => {
      toast.success('Analysis deleted');
      queryClient.invalidateQueries({ queryKey: ['ai-analyses'] });
    },
  });

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Election Selected</h2>
        <p className="text-muted-foreground mt-2">Please select an election from the sidebar to view AI analytics.</p>
      </div>
    );
  }

  const analyses = analysesData?.data?.data || [];
  const turnout = turnoutData?.data?.data;
  const swing = swingData?.data?.data;
  const risk = riskData?.data?.data;
  const demographic = demographicData?.data?.data;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.analysisName) {
      toast.error('Please enter an analysis name');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuitIcon className="h-7 w-7 text-purple-600" />
            AI Analytics
          </h1>
          <p className="text-muted-foreground">Advanced AI-powered election insights</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create AI Analysis</DialogTitle>
              <DialogDescription>Run a new AI-powered analysis on your election data</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Analysis Type</Label>
                  <Select
                    value={formData.analysisType}
                    onValueChange={(value) => setFormData({ ...formData, analysisType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {analysisTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Analysis Name *</Label>
                  <Input
                    value={formData.analysisName}
                    onChange={(e) => setFormData({ ...formData, analysisName: e.target.value })}
                    placeholder="e.g., Q1 2024 Turnout Analysis"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Spinner size="sm" className="mr-2" /> : <PlayIcon className="h-4 w-4 mr-2" />}
                  Run Analysis
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="predictions">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="swing">Swing Voters</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-6">
          {turnoutLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-green-600">{turnout?.overallPrediction || turnout?.predictedTurnout || 0}%</p>
                    <p className="text-sm text-muted-foreground">Predicted Turnout</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-blue-600">{formatNumber(turnout?.totalVoters || 0)}</p>
                    <p className="text-sm text-muted-foreground">Total Voters</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-purple-600">{formatNumber(turnout?.predictedVotes || 0)}</p>
                    <p className="text-sm text-muted-foreground">Predicted Votes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-brand">{turnout?.confidence || 0}%</p>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-xs text-muted-foreground mt-1">Range: {turnout?.confidenceLow || 0}% - {turnout?.confidenceHigh || 0}%</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Booth-level prediction chart */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUpIcon className="h-5 w-5 text-green-600" />
                      Booth-wise Turnout Prediction
                    </CardTitle>
                    <CardDescription>Predicted vs historical turnout by part</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={turnout?.boothPredictions || turnout?.hourlyPrediction || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={turnout?.boothPredictions ? 'partNumber' : 'hour'} />
                        <YAxis />
                        <Tooltip />
                        {turnout?.boothPredictions ? (
                          <>
                            <Bar dataKey="predictedTurnout" fill="#10b981" name="Predicted %" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="historicalTurnout" fill="#94a3b8" name="Historical %" radius={[4, 4, 0, 0]} />
                          </>
                        ) : (
                          <Bar dataKey="percentage" fill="#10b981" name="Turnout %" radius={[4, 4, 0, 0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Hourly prediction */}
                <Card>
                  <CardHeader>
                    <CardTitle>Hourly Prediction</CardTitle>
                    <CardDescription>Expected turnout progression</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(turnout?.hourlyPrediction || []).map((h: any) => (
                        <div key={h.hour} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-12">{h.hour}</span>
                          <div className="flex-1 bg-muted rounded-full h-3">
                            <div className="h-3 rounded-full bg-green-500" style={{ width: `${Math.min(h.percentage, 100)}%` }} />
                          </div>
                          <span className="text-sm text-muted-foreground w-10 text-right">{h.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              {(turnout?.insights || []).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {turnout.insights.map((insight: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <h4 className="font-medium mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-sm text-blue-600 mt-2 font-medium">Recommendation: {insight.recommendation}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="swing" className="space-y-6">
          {swingLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UsersIcon className="h-5 w-5 text-blue-600" />
                      Swing Voter Analysis
                    </CardTitle>
                    <CardDescription>Voters likely to change their voting pattern</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-5xl font-bold text-blue-600">{formatNumber(swing?.totalSwingVoters || 0)}</div>
                        <p className="text-muted-foreground mt-1">Identified Swing Voters</p>
                        <p className="text-sm text-muted-foreground">{swing?.swingPercentage || swing?.percentage || 0}% of total voters</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xl font-bold text-green-600">{swing?.favorableSwing || 0}%</p>
                          <p className="text-xs text-muted-foreground">Favorable</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xl font-bold text-muted-foreground">{swing?.neutralSwing || 0}%</p>
                          <p className="text-xs text-muted-foreground">Neutral</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-xl font-bold text-red-600">{swing?.unfavorableSwing || 0}%</p>
                          <p className="text-xs text-muted-foreground">Unfavorable</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Swing Factors</CardTitle>
                    <CardDescription>Key factors influencing swing voters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={swing?.factors || []}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="factor" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Impact" dataKey="impact" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Swing Voter Hotspots */}
              {(swing?.hotspots || []).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Swing Voter Hotspots</CardTitle>
                    <CardDescription>Parts with highest swing voter concentration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {swing.hotspots.map((h: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Part {h.partNumber} — {h.boothName}</p>
                            <p className="text-sm text-muted-foreground">{h.swingCount} swing voters ({h.percentage}%)</p>
                          </div>
                          <Badge variant="warning">Hotspot</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          {riskLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <>
              {/* Risk KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-foreground">{risk?.totalBooths || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Booths</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-red-600">{risk?.highRiskCount || 0}</p>
                    <p className="text-sm text-muted-foreground">High Risk</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-yellow-600">{risk?.mediumRiskCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Medium Risk</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-green-600">{risk?.lowRiskCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Low Risk</p>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Booths List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlertIcon className="h-5 w-5 text-red-600" />
                    Vulnerable Booths
                  </CardTitle>
                  <CardDescription>
                    {risk?.vulnerableBooths || 0} booths identified with potential risks (Score: {risk?.riskScore || 0}/10)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(risk?.riskBooths || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No vulnerable booths identified. All booths are safe.</div>
                  ) : (
                    <div className="space-y-2">
                      {(risk?.riskBooths || []).map((booth: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Part {booth.partNumber} {booth.boothName ? `— ${booth.boothName}` : ''}</p>
                            <p className="text-sm text-muted-foreground">{booth.reason}</p>
                          </div>
                          <Badge
                            variant={
                              booth.riskLevel === 'HIGH' ? 'destructive'
                                : booth.riskLevel === 'MEDIUM' ? 'warning' : 'success'
                            }
                          >
                            {booth.riskLevel}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Risk Insights */}
              {(risk?.insights || []).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {risk.insights.map((insight: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <h4 className="font-medium mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-sm text-blue-600 mt-2 font-medium">Recommendation: {insight.recommendation}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          {demographicLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-purple-600">{formatNumber(demographic?.totalVoters || 0)}</p>
                    <p className="text-sm text-muted-foreground">Total Voters</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-blue-600">{demographic?.averageAge || 0}</p>
                    <p className="text-sm text-muted-foreground">Average Age</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-green-600">{(demographic?.religionBreakdown || []).length}</p>
                    <p className="text-sm text-muted-foreground">Religious Groups</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-brand">{(demographic?.casteBreakdown || []).length}</p>
                    <p className="text-sm text-muted-foreground">Caste Categories</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gender Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(demographic?.genderRatio || []).map((g: any) => (
                        <div key={g.gender} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{g.gender}</span>
                          <div className="flex items-center gap-3 flex-1 ml-4">
                            <div className="flex-1 bg-muted rounded-full h-3">
                              <div
                                className={`h-3 rounded-full ${g.gender === 'MALE' ? 'bg-blue-500' : g.gender === 'FEMALE' ? 'bg-pink-500' : 'bg-purple-500'}`}
                                style={{ width: `${Math.min(g.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-24 text-right">{formatNumber(g.count)} ({g.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Age Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Age Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={demographic?.ageGroups || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" name="Voters" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Religion Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Religion Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(demographic?.religionBreakdown || []).map((r: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{r.religion}</span>
                          <div className="flex items-center gap-3 flex-1 ml-4">
                            <div className="flex-1 bg-muted rounded-full h-3">
                              <div className="h-3 rounded-full bg-brand" style={{ width: `${Math.min(r.percentage, 100)}%` }} />
                            </div>
                            <span className="text-sm text-muted-foreground w-24 text-right">{formatNumber(r.count)} ({r.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Caste Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Caste Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(demographic?.casteBreakdown || []).map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{c.category}</span>
                          <div className="flex items-center gap-3 flex-1 ml-4">
                            <div className="flex-1 bg-muted rounded-full h-3">
                              <div className="h-3 rounded-full bg-teal-500" style={{ width: `${Math.min(c.percentage, 100)}%` }} />
                            </div>
                            <span className="text-sm text-muted-foreground w-24 text-right">{formatNumber(c.count)} ({c.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-purple-600" />
                    AI Insights & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(demographic?.insights || []).map((insight: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-sm text-blue-600 mt-2 font-medium">
                            Recommendation: {insight.recommendation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analysis History</CardTitle>
              <CardDescription>Previously run AI analyses</CardDescription>
            </CardHeader>
            <CardContent>
              {analysesLoading ? (
                <div className="space-y-4">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
              ) : analyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No analyses run yet. Click "New Analysis" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {analyses.map((analysis: any) => (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{analysis.analysisName || analysis.analysisType}</p>
                        <p className="text-sm text-muted-foreground">
                          {analysis.analysisType} • {formatDate(analysis.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            analysis.status === 'COMPLETED'
                              ? 'success'
                              : analysis.status === 'RUNNING'
                              ? 'info'
                              : analysis.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {analysis.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this analysis?')) {
                              deleteMutation.mutate(analysis.id);
                            }
                          }}
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
