import { useQuery } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { analyticsAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { AlertTriangleIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { formatNumber } from '../lib/utils';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

export function AnalyticsPage() {
  const { selectedElectionId } = useElectionStore();

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', selectedElectionId],
    queryFn: () => analyticsAPI.getOverview(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: voterData, isLoading: voterLoading } = useQuery({
    queryKey: ['analytics-voters', selectedElectionId],
    queryFn: () => analyticsAPI.getVoterAnalytics(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: ageGroupData, isLoading: ageLoading } = useQuery({
    queryKey: ['analytics-age', selectedElectionId],
    queryFn: () => analyticsAPI.getAgeGroups(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: politicalData, isLoading: politicalLoading } = useQuery({
    queryKey: ['analytics-political', selectedElectionId],
    queryFn: () => analyticsAPI.getPoliticalLeaning(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: dataQualityData, isLoading: qualityLoading } = useQuery({
    queryKey: ['analytics-quality', selectedElectionId],
    queryFn: () => analyticsAPI.getDataQuality(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election from the sidebar to view analytics.</p>
      </div>
    );
  }

  const overview = overviewData?.data?.data;
  const voterAnalytics = voterData?.data?.data;
  const ageGroups = ageGroupData?.data?.data || [];
  const political = politicalData?.data?.data || [];
  const dataQuality = dataQualityData?.data?.data;

  const genderData = voterAnalytics?.genderDistribution
    ? Object.entries(voterAnalytics.genderDistribution).map(([name, value]) => ({
        name: name === 'M' || name === 'MALE' ? 'Male' : name === 'F' || name === 'FEMALE' ? 'Female' : 'Other',
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-500">Comprehensive data analysis and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">Total Voters</p>
                <p className="text-3xl font-bold text-orange-600">{formatNumber(overview?.totalVoters || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">Total Parts</p>
                <p className="text-3xl font-bold text-blue-600">{formatNumber(overview?.totalParts || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">Data Coverage</p>
                <p className="text-3xl font-bold text-green-600">{overview?.dataCoverage || 0}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">Average Age</p>
                <p className="text-3xl font-bold text-purple-600">{overview?.averageAge || 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="demographics">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="age">Age Analysis</TabsTrigger>
          <TabsTrigger value="political">Political</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Breakdown of voters by gender</CardDescription>
              </CardHeader>
              <CardContent>
                {voterLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Caste Distribution</CardTitle>
                <CardDescription>Voters by caste category</CardDescription>
              </CardHeader>
              <CardContent>
                {voterLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={voterAnalytics?.casteDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Voters per Booth</CardTitle>
              <CardDescription>Distribution of voters across polling booths</CardDescription>
            </CardHeader>
            <CardContent>
              {voterLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={voterAnalytics?.boothDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="partNo" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="voters" stroke="#3b82f6" fill="#93c5fd" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="age" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Age Group Distribution</CardTitle>
              <CardDescription>Voters segmented by age groups</CardDescription>
            </CardHeader>
            <CardContent>
              {ageLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={ageGroups} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="ageGroup" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>First-Time Voters</CardTitle>
                <CardDescription>Voters aged 18-21</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-5xl font-bold text-orange-600">
                    {formatNumber(ageGroups.find((g: any) => g.ageGroup === '18-25')?.count || 0)}
                  </p>
                  <p className="text-gray-500 mt-2">Young voters (18-25)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Senior Citizens</CardTitle>
                <CardDescription>Voters aged 60+</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-5xl font-bold text-blue-600">
                    {formatNumber(ageGroups.find((g: any) => g.ageGroup === '60+')?.count || 0)}
                  </p>
                  <p className="text-gray-500 mt-2">Senior citizens (60+)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="political" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Political Leaning</CardTitle>
              <CardDescription>Voter sentiment distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {politicalLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={political}
                      cx="50%"
                      cy="50%"
                      labelLine
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="leaning"
                    >
                      {political.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qualityLoading ? (
              Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))
            ) : (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">Mobile Numbers</p>
                      <span className="text-2xl font-bold text-green-600">{dataQuality?.mobilePercent || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${dataQuality?.mobilePercent || 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">Age Data</p>
                      <span className="text-2xl font-bold text-blue-600">{dataQuality?.agePercent || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${dataQuality?.agePercent || 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">Caste Data</p>
                      <span className="text-2xl font-bold text-orange-600">{dataQuality?.castePercent || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: `${dataQuality?.castePercent || 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">Religion Data</p>
                      <span className="text-2xl font-bold text-purple-600">{dataQuality?.religionPercent || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${dataQuality?.religionPercent || 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">Voter ID</p>
                      <span className="text-2xl font-bold text-cyan-600">{dataQuality?.voterIdPercent || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-cyan-600 h-2 rounded-full"
                        style={{ width: `${dataQuality?.voterIdPercent || 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-500">Overall Quality</p>
                      <span className="text-2xl font-bold text-pink-600">{dataQuality?.overallPercent || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-pink-600 h-2 rounded-full"
                        style={{ width: `${dataQuality?.overallPercent || 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
