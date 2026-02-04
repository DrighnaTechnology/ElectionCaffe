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
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election from the sidebar to view AI analytics.</p>
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
          <p className="text-gray-500">Advanced AI-powered election insights</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-green-600" />
                  Turnout Prediction
                </CardTitle>
                <CardDescription>AI-predicted voter turnout by booth</CardDescription>
              </CardHeader>
              <CardContent>
                {turnoutLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={turnout?.boothPredictions || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="partNo" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="predictedTurnout" fill="#10b981" name="Predicted %" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="historicalTurnout" fill="#94a3b8" name="Historical %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall Prediction</CardTitle>
              </CardHeader>
              <CardContent>
                {turnoutLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-bold text-green-600">{turnout?.overallPrediction || 0}%</div>
                    <p className="text-gray-500">Expected Turnout</p>
                    <div className="flex justify-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Low:</span>
                        <span className="font-medium ml-1">{turnout?.confidenceLow || 0}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">High:</span>
                        <span className="font-medium ml-1">{turnout?.confidenceHigh || 0}%</span>
                      </div>
                    </div>
                    <Badge variant="info">Confidence: {turnout?.confidence || 0}%</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="swing" className="space-y-6">
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
                {swingLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="text-5xl font-bold text-blue-600">{formatNumber(swing?.totalSwingVoters || 0)}</div>
                      <p className="text-gray-500 mt-1">Identified Swing Voters</p>
                      <p className="text-sm text-gray-400">{swing?.swingPercentage || 0}% of total voters</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xl font-bold text-green-600">{swing?.favorableSwing || 0}%</p>
                        <p className="text-xs text-gray-500">Favorable</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-gray-600">{swing?.neutralSwing || 0}%</p>
                        <p className="text-xs text-gray-500">Neutral</p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xl font-bold text-red-600">{swing?.unfavorableSwing || 0}%</p>
                        <p className="text-xs text-gray-500">Unfavorable</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Swing Factors</CardTitle>
                <CardDescription>Key factors influencing swing voters</CardDescription>
              </CardHeader>
              <CardContent>
                {swingLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={swing?.factors || []}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="factor" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Impact" dataKey="impact" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlertIcon className="h-5 w-5 text-red-600" />
                Booth Risk Assessment
              </CardTitle>
              <CardDescription>Booths identified with potential risks</CardDescription>
            </CardHeader>
            <CardContent>
              {riskLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-3xl font-bold text-red-600">{risk?.highRiskCount || 0}</p>
                      <p className="text-sm text-gray-500">High Risk</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-3xl font-bold text-yellow-600">{risk?.mediumRiskCount || 0}</p>
                      <p className="text-sm text-gray-500">Medium Risk</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{risk?.lowRiskCount || 0}</p>
                      <p className="text-sm text-gray-500">Low Risk</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(risk?.riskBooths || []).slice(0, 5).map((booth: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">Part {booth.partNo}</p>
                          <p className="text-sm text-gray-500">{booth.reason}</p>
                        </div>
                        <Badge
                          variant={
                            booth.riskLevel === 'HIGH'
                              ? 'destructive'
                              : booth.riskLevel === 'MEDIUM'
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {booth.riskLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-purple-600" />
                Demographic Insights
              </CardTitle>
              <CardDescription>AI-generated demographic analysis and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {demographicLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(demographic?.insights || []).map((insight: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">{insight.title}</h4>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-sm text-blue-600 mt-2">Recommendation: {insight.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
                <div className="text-center py-8 text-gray-500">
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
                        <p className="font-medium">{analysis.analysisName}</p>
                        <p className="text-sm text-gray-500">
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
