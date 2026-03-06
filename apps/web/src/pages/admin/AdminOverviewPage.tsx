import { useQuery } from '@tanstack/react-query';
import { organizationAPI, electionsAPI, dashboardAPI } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { formatNumber } from '../../lib/utils';
import {
  UsersIcon,
  VoteIcon,
  MapPinIcon,
  UserCogIcon,
  Users2Icon,
  ShieldCheckIcon,
  ActivityIcon,
  BarChart3Icon,
  DatabaseIcon,
} from 'lucide-react';

export function AdminOverviewPage() {
  // Fetch users (for counts)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', '', 'all', 1],
    queryFn: () => organizationAPI.getUsers({ page: 1, limit: 1 }),
  });

  // Fetch elections
  const { data: electionsData, isLoading: electionsLoading } = useQuery({
    queryKey: ['admin-elections'],
    queryFn: () => electionsAPI.getAll({ page: 1, limit: 100 }),
  });

  const pagination = usersData?.data?.data?.pagination;
  const users = usersData?.data?.data?.data || [];
  const totalUsers = pagination?.total ?? 0;
  const elections = electionsData?.data?.data || [];
  const totalElections = elections.length;

  // Approximate admin/active counts from first page
  const adminCount = users.filter((u: any) => u.role === 'CENTRAL_ADMIN').length;
  const activeCount = users.filter((u: any) => u.status === 'ACTIVE').length;

  // Pick first election for dashboard metrics
  const firstElectionId = elections[0]?.id;

  // Fetch election dashboard data
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['admin-election-dash', firstElectionId],
    queryFn: () => dashboardAPI.getElectionDashboard(firstElectionId!),
    enabled: !!firstElectionId,
  });

  const dashboard = dashData?.data?.data;
  const kpis = dashboard?.kpis;
  const dataCompleteness = dashboard?.dataCompleteness;
  const cadreMetrics = dashboard?.cadreMetrics;
  const familyMetrics = dashboard?.familyMetrics;
  const boothOps = dashboard?.boothOperations;

  const metricsLoading = usersLoading || electionsLoading || dashLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview and key metrics
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsLoading
          ? Array(4).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          : [
              { title: 'Total Users', value: totalUsers, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-l-blue-500' },
              { title: 'Elections', value: totalElections, icon: VoteIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-500' },
              { title: 'Admin Users', value: adminCount, icon: ShieldCheckIcon, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-l-purple-500' },
              { title: 'Active Users', value: activeCount, icon: ActivityIcon, color: 'text-brand', bg: 'bg-brand-muted', border: 'border-l-orange-500' },
            ].map((stat, index) => (
              <Card key={stat.title} className={`border-l-4 ${stat.border} group cursor-default`} style={{ animationDelay: `${index * 80}ms` }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                      <p className="text-2xl font-black mt-1">{formatNumber(stat.value)}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Election Data Matrix */}
      {firstElectionId && (
        <>
          <div className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Election Metrics</h2>
            <Badge variant="secondary" className="ml-1">{elections[0]?.name}</Badge>
          </div>

          {/* Core KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {dashLoading
              ? Array(6).fill(0).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
                ))
              : [
                  { label: 'Total Voters', value: kpis?.totalVoters?.value ?? 0, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Parts / Booths', value: kpis?.totalBooths?.value ?? 0, icon: MapPinIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Total Cadres', value: kpis?.totalCadres?.value ?? 0, icon: UserCogIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Total Families', value: kpis?.totalFamilies?.value ?? 0, icon: Users2Icon, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'Mobile Updated', value: kpis?.mobileUpdated?.value ?? 0, icon: DatabaseIcon, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                  { label: 'DOB Updated', value: kpis?.dobUpdated?.value ?? 0, icon: DatabaseIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.bg} flex-shrink-0`}>
                          <item.icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider leading-tight">{item.label}</p>
                          <p className="text-xl font-black">{formatNumber(item.value)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>

          {/* Detailed Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Data Completeness */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Data Completeness</CardTitle>
                <CardDescription className="text-xs">Coverage of key voter data fields</CardDescription>
              </CardHeader>
              <CardContent>
                {dashLoading ? <Skeleton className="h-32 w-full" /> : (
                  <div className="space-y-3">
                    {[
                      { label: 'Mobile Numbers', value: dataCompleteness?.mobilePercent ?? kpis?.mobileUpdated?.percentage ?? 0, color: 'bg-emerald-500' },
                      { label: 'Age / DOB', value: dataCompleteness?.agePercent ?? kpis?.dobUpdated?.percentage ?? 0, color: 'bg-blue-500' },
                      { label: 'Caste Data', value: dataCompleteness?.castePercent ?? 0, color: 'bg-purple-500' },
                      { label: 'Religion', value: dataCompleteness?.religionPercent ?? 0, color: 'bg-amber-500' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                          <span className="text-xs font-bold">{item.value}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all duration-500 ${item.color}`} style={{ width: `${Math.min(item.value, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cadre Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Cadre Status</CardTitle>
                <CardDescription className="text-xs">Field team overview</CardDescription>
              </CardHeader>
              <CardContent>
                {dashLoading ? <Skeleton className="h-32 w-full" /> : (
                  <div className="space-y-2">
                    {[
                      { label: 'Total Cadres', value: kpis?.totalCadres?.value ?? 0, bg: 'bg-blue-50', text: 'text-blue-700' },
                      { label: 'Assigned', value: cadreMetrics?.assigned ?? 0, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                      { label: 'Unassigned', value: cadreMetrics?.unassigned ?? 0, bg: 'bg-orange-50', text: 'text-orange-700' },
                      { label: 'Active Today', value: cadreMetrics?.activeToday ?? 0, bg: 'bg-purple-50', text: 'text-purple-700' },
                    ].map((row) => (
                      <div key={row.label} className={`flex justify-between items-center p-2.5 ${row.bg} rounded-lg`}>
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className={`text-sm font-bold ${row.text}`}>{formatNumber(row.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Family & Booth Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Family & Booth Ops</CardTitle>
                <CardDescription className="text-xs">Families and booth operations</CardDescription>
              </CardHeader>
              <CardContent>
                {dashLoading ? <Skeleton className="h-32 w-full" /> : (
                  <div className="space-y-2">
                    {[
                      { label: 'Total Families', value: familyMetrics?.total ?? 0, bg: 'bg-orange-50', text: 'text-orange-700' },
                      { label: 'Cross-Booth Families', value: familyMetrics?.crossBooth ?? 0, bg: 'bg-red-50', text: 'text-red-700' },
                      { label: 'Single Member', value: familyMetrics?.singleMember ?? 0, bg: 'bg-muted/50', text: 'text-foreground' },
                      { label: 'BLA-2 Coverage', value: `${boothOps?.bla2?.coveragePercent ?? 0}%`, bg: 'bg-indigo-50', text: 'text-indigo-700' },
                      { label: 'Committee Coverage', value: `${boothOps?.committee?.coveragePercent ?? 0}%`, bg: 'bg-teal-50', text: 'text-teal-700' },
                    ].map((row) => (
                      <div key={row.label} className={`flex justify-between items-center p-2.5 ${row.bg} rounded-lg`}>
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className={`text-sm font-bold ${row.text}`}>{typeof row.value === 'number' ? formatNumber(row.value) : row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

    </div>
  );
}
