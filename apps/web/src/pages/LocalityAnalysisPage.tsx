import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { localityAnalysisAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  BrainCircuitIcon,
  MapPinIcon,
  UsersIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  BarChart3Icon,
  TargetIcon,
  ShieldIcon,
  MessageSquareIcon,
  ZapIcon,
} from 'lucide-react';

export function LocalityAnalysisPage() {
  const { selectedElectionId } = useElectionStore();
  const [selectedTab, setSelectedTab] = useState('insights');

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['constituency-insights', selectedElectionId],
    queryFn: () => localityAnalysisAPI.getConstituencyInsights(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: demographicsData, isLoading: demographicsLoading } = useQuery({
    queryKey: ['demographic-analysis', selectedElectionId],
    queryFn: () => localityAnalysisAPI.getDemographicAnalysis(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: votingPatternsData, isLoading: votingPatternsLoading } = useQuery({
    queryKey: ['voting-patterns', selectedElectionId],
    queryFn: () => localityAnalysisAPI.getVotingPatterns(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: localIssuesData, isLoading: localIssuesLoading } = useQuery({
    queryKey: ['local-issues', selectedElectionId],
    queryFn: () => localityAnalysisAPI.getLocalIssues(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['recommendations', selectedElectionId],
    queryFn: () => localityAnalysisAPI.getRecommendations(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const insights = insightsData?.data?.data || {};
  const demographics = demographicsData?.data?.data || {};
  const votingPatterns = votingPatternsData?.data?.data || {};
  const localIssues = localIssuesData?.data?.data || [];
  const recommendations = recommendationsData?.data?.data || [];

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <BrainCircuitIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Select an Election</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please select an election from the sidebar to view locality-based AI analysis and insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locality Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered insights and analysis for your constituency and election
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <BrainCircuitIcon className="h-3 w-3" />
            AI Powered
          </Badge>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights">
            <LightbulbIcon className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="demographics">
            <UsersIcon className="h-4 w-4 mr-2" />
            Demographics
          </TabsTrigger>
          <TabsTrigger value="voting">
            <TrendingUpIcon className="h-4 w-4 mr-2" />
            Voting Patterns
          </TabsTrigger>
          <TabsTrigger value="issues">
            <AlertTriangleIcon className="h-4 w-4 mr-2" />
            Local Issues
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <TargetIcon className="h-4 w-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {insightsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{insights.overallScore || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Overall Score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUpIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{insights.predictedTurnout || 'N/A'}%</p>
                        <p className="text-sm text-muted-foreground">Predicted Turnout</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TargetIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{insights.swingVoterPercentage || 'N/A'}%</p>
                        <p className="text-sm text-muted-foreground">Swing Voters</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <ShieldIcon className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{insights.competitiveBooths || 0}</p>
                        <p className="text-sm text-muted-foreground">Competitive Booths</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LightbulbIcon className="h-5 w-5 text-yellow-600" />
                    Key Insights
                  </CardTitle>
                  <CardDescription>
                    AI-generated insights based on your constituency data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.keyInsights && insights.keyInsights.length > 0 ? (
                    <div className="space-y-4">
                      {insights.keyInsights.map((insight: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              insight.type === 'opportunity' ? 'bg-green-100' :
                              insight.type === 'risk' ? 'bg-red-100' :
                              insight.type === 'trend' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              {insight.type === 'opportunity' ? <TrendingUpIcon className="h-4 w-4 text-green-600" /> :
                               insight.type === 'risk' ? <AlertTriangleIcon className="h-4 w-4 text-red-600" /> :
                               insight.type === 'trend' ? <BarChart3Icon className="h-4 w-4 text-blue-600" /> :
                               <LightbulbIcon className="h-4 w-4 text-gray-600" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{insight.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                              {insight.actionable && (
                                <Badge className="mt-2" variant="outline">Actionable</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No insights available yet. Add more voter data to generate insights.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-4">
          {demographicsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Age Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Age Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {demographics.ageGroups ? (
                      <div className="space-y-3">
                        {Object.entries(demographics.ageGroups).map(([group, percentage]: [string, any]) => (
                          <div key={group} className="flex items-center gap-3">
                            <span className="text-sm w-20">{group}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Gender Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Gender Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {demographics.genderDistribution ? (
                      <div className="space-y-3">
                        {Object.entries(demographics.genderDistribution).map(([gender, percentage]: [string, any]) => (
                          <div key={gender} className="flex items-center gap-3">
                            <span className="text-sm w-20 capitalize">{gender}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  gender === 'male' ? 'bg-blue-600' :
                                  gender === 'female' ? 'bg-pink-600' : 'bg-purple-600'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Caste/Community Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Community Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {demographics.communityDistribution ? (
                      <div className="space-y-3">
                        {Object.entries(demographics.communityDistribution).slice(0, 6).map(([community, percentage]: [string, any]) => (
                          <div key={community} className="flex items-center gap-3">
                            <span className="text-sm w-24 truncate">{community}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Voter Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Voter Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {demographics.voterCategories ? (
                      <div className="space-y-3">
                        {Object.entries(demographics.voterCategories).map(([category, count]: [string, any]) => (
                          <div key={category} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{category}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Voting Patterns Tab */}
        <TabsContent value="voting" className="space-y-4">
          {votingPatternsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-60 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Historical Turnout</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {votingPatterns.historicalTurnout ? (
                      <div className="space-y-3">
                        {votingPatterns.historicalTurnout.map((election: any) => (
                          <div key={election.year} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <p className="font-medium">{election.year}</p>
                              <p className="text-sm text-muted-foreground">{election.type}</p>
                            </div>
                            <Badge variant={election.turnout > 70 ? 'default' : 'secondary'}>
                              {election.turnout}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No historical data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Predicted Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {votingPatterns.predictions ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="font-medium text-green-800">Expected Turnout</p>
                          <p className="text-2xl font-bold text-green-600">{votingPatterns.predictions.expectedTurnout}%</p>
                        </div>
                        {votingPatterns.predictions.riskAreas && (
                          <div>
                            <p className="font-medium mb-2">Areas Needing Attention</p>
                            <div className="space-y-2">
                              {votingPatterns.predictions.riskAreas.map((area: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <AlertTriangleIcon className="h-4 w-4 text-orange-500" />
                                  <span>{area.name}: {area.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No predictions available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Local Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          {localIssuesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : localIssues.length > 0 ? (
            <div className="space-y-4">
              {localIssues.map((issue: any, index: number) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        issue.priority === 'HIGH' ? 'bg-red-100' :
                        issue.priority === 'MEDIUM' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        <MessageSquareIcon className={`h-5 w-5 ${
                          issue.priority === 'HIGH' ? 'text-red-600' :
                          issue.priority === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{issue.title}</h3>
                          <Badge variant={
                            issue.priority === 'HIGH' ? 'destructive' :
                            issue.priority === 'MEDIUM' ? 'default' : 'secondary'
                          }>
                            {issue.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                        {issue.affectedAreas && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {issue.affectedAreas.map((area: string) => (
                              <Badge key={area} variant="outline" className="text-xs">
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                {area}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {issue.suggestedResponse && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">Suggested Response:</p>
                            <p className="text-sm text-blue-700">{issue.suggestedResponse}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <MessageSquareIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Local Issues Identified</h3>
                <p className="text-muted-foreground">
                  AI will analyze news and feedback to identify local issues relevant to your campaign.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendationsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec: any, index: number) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <ZapIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{rec.title}</h3>
                          <Badge>{rec.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                        {rec.expectedImpact && (
                          <div className="flex items-center gap-2 mt-2">
                            <TrendingUpIcon className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">Expected Impact: {rec.expectedImpact}</span>
                          </div>
                        )}
                        {rec.steps && rec.steps.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">Action Steps:</p>
                            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                              {rec.steps.map((step: string, i: number) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                        <Button size="sm" className="mt-4">
                          Create Action
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <TargetIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recommendations Yet</h3>
                <p className="text-muted-foreground">
                  AI-powered recommendations will appear here once enough data is analyzed.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
