import { useQuery } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { dashboardAPI, analyticsAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import {
  UsersIcon,
  MapPinIcon,
  UserCogIcon,
  Users2Icon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
} from 'lucide-react';
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
} from 'recharts';
import { formatNumber } from '../lib/utils';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

export function DashboardPage() {
  const { selectedElectionId } = useElectionStore();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', selectedElectionId],
    queryFn: () => dashboardAPI.getElectionDashboard(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-overview', selectedElectionId],
    queryFn: () => analyticsAPI.getOverview(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election from the sidebar to view the dashboard.</p>
      </div>
    );
  }

  const dashboard = dashboardData?.data?.data;
  const analytics = analyticsData?.data?.data;

  const stats = [
    {
      title: 'Total Voters',
      value: dashboard?.totalVoters || 0,
      icon: UsersIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Total Parts',
      value: dashboard?.totalParts || 0,
      icon: MapPinIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Total Cadres',
      value: dashboard?.totalCadres || 0,
      icon: UserCogIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Total Families',
      value: dashboard?.totalFamilies || 0,
      icon: Users2Icon,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  const genderData = dashboard?.genderDistribution
    ? Object.entries(dashboard.genderDistribution).map(([name, value]) => ({
        name: name === 'M' || name === 'MALE' ? 'Male' : name === 'F' || name === 'FEMALE' ? 'Female' : 'Other',
        value,
      }))
    : [];

  const ageGroupData = analytics?.ageDistribution || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Overview of your election data</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardLoading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
          : stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{formatNumber(stat.value)}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>Breakdown of voters by gender</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
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

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
            <CardDescription>Voters by age group</CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageGroupData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageGroup" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity / Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5 text-green-500" />
              Data Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Mobile Numbers</span>
                <Badge variant="success">{dashboard?.dataCompleteness?.mobilePercent || 0}%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Age Data</span>
                <Badge variant="info">{dashboard?.dataCompleteness?.agePercent || 0}%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Caste Data</span>
                <Badge variant="warning">{dashboard?.dataCompleteness?.castePercent || 0}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="h-5 w-5 text-blue-500" />
              Cadre Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Assigned</span>
                <span className="font-semibold">{formatNumber(dashboard?.assignedCadres || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Unassigned</span>
                <span className="font-semibold">{formatNumber(dashboard?.unassignedCadres || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Today</span>
                <span className="font-semibold">{formatNumber(dashboard?.activeCadres || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-purple-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a href="/voters" className="block p-2 rounded-md hover:bg-gray-50 text-sm text-gray-700">
                Import Voters
              </a>
              <a href="/parts" className="block p-2 rounded-md hover:bg-gray-50 text-sm text-gray-700">
                Manage Booths
              </a>
              <a href="/reports" className="block p-2 rounded-md hover:bg-gray-50 text-sm text-gray-700">
                Generate Report
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
