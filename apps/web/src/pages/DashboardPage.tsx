import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useElectionStore } from '../store/election';
import { dashboardAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import {
  UsersIcon,
  MapPinIcon,
  UserCogIcon,
  Users2Icon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CalendarIcon,
  FlagIcon,
  HomeIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
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
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { formatNumber } from '../lib/utils';

// Distinct palettes for different chart types
const GENDER_COLORS = ['#3b82f6', '#f97316', '#8b5cf6'];
const RELIGION_COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444'];
const CASTE_COLORS = ['#8b5cf6', '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444'];
const PARTY_COLORS: Record<string, string> = {
  BJP: '#f97316', INC: '#3b82f6', DMK: '#ef4444', AIADMK: '#10b981', PMK: '#f59e0b',
  TMC: '#22c55e', AAP: '#06b6d4', BSP: '#8b5cf6', SP: '#dc2626', JDU: '#16a34a',
};
const AGE_GRADIENT = ['#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c'];

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-2.5">
      <div className={`h-2.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// Horizontal bar chart for ranked categorical data (religion, caste, etc.)
function HorizontalBarList({ data, colors, maxItems = 6 }: { data: { name: string; value: number }[]; colors: string[]; maxItems?: number }) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, maxItems);
  const maxValue = sorted[0]?.value || 1;

  return (
    <div className="space-y-2.5">
      {sorted.map((item, i) => (
        <div key={item.name}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-foreground truncate max-w-[60%]">{item.name}</span>
            <span className="text-xs font-bold" style={{ color: colors[i % colors.length] }}>{formatNumber(item.value)}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: colors[i % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { selectedElectionId } = useElectionStore();
  const navigate = useNavigate();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', selectedElectionId],
    queryFn: () => dashboardAPI.getElectionDashboard(selectedElectionId!),
    enabled: !!selectedElectionId,
  });


  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Election Selected</h2>
        <p className="text-muted-foreground mt-2">Please select an election from the sidebar to view the dashboard.</p>
      </div>
    );
  }

  const dashboard = dashboardData?.data?.data;
  const kpis = dashboard?.kpis;
  const election = dashboard?.election;
  const cadreMetrics = dashboard?.cadreMetrics;
  const dataCompleteness = dashboard?.dataCompleteness;
  const familyMetrics = dashboard?.familyMetrics;
  const boothOps = dashboard?.boothOperations;

  // Poll date countdown
  const pollDate = election?.pollDate ? new Date(election.pollDate) : null;
  const today = new Date();
  const daysUntilPoll = pollDate ? Math.ceil((pollDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // KPI stats
  const totalVoters = kpis?.totalVoters?.value ?? 0;
  const stats = [
    { title: 'Total Voters', value: totalVoters, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-l-blue-500' },
    { title: 'Parts / Booths', value: kpis?.totalBooths?.value ?? 0, icon: MapPinIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-500' },
    { title: 'Total Cadres', value: kpis?.totalCadres?.value ?? 0, icon: UserCogIcon, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-l-purple-500' },
    { title: 'Total Families', value: kpis?.totalFamilies?.value ?? 0, icon: Users2Icon, color: 'text-brand', bg: 'bg-brand-muted', border: 'border-l-orange-500' },
  ];

  // Demographics data
  const genderData = (dashboard?.demographics?.gender || []).map((g: any) => ({
    name: g.label === 'MALE' ? 'Male' : g.label === 'FEMALE' ? 'Female' : 'Other',
    value: g.value,
  }));

  const religionData = (dashboard?.demographics?.religion || []).map((r: any) => ({
    name: r.label || 'Unknown',
    value: r.value,
  })).filter((r: any) => r.value > 0);

  const casteData = (dashboard?.demographics?.caste || []).map((c: any) => ({
    name: c.label || 'Unknown',
    value: c.value,
  })).filter((c: any) => c.value > 0);

  const partyData = (dashboard?.demographics?.party || []).map((p: any) => ({
    name: p.label || 'Unknown',
    value: p.value,
  })).filter((p: any) => p.value > 0);

  const languageData = (dashboard?.demographics?.language || []).map((l: any) => ({
    name: l.label || 'Unknown',
    value: l.value,
  })).filter((l: any) => l.value > 0);

  const voterCategoryData = (dashboard?.demographics?.voterCategory || []).map((vc: any) => ({
    name: vc.label || 'Unknown',
    value: vc.value,
  })).filter((vc: any) => vc.value > 0);

  const ageGroupData = dashboard?.ageDistribution || [];

  // Data coverage
  const mobilePct = dataCompleteness?.mobilePercent ?? kpis?.mobileUpdated?.percentage ?? 0;
  const agePct = dataCompleteness?.agePercent ?? kpis?.dobUpdated?.percentage ?? 0;
  const castePct = dataCompleteness?.castePercent ?? 0;

  // Party data with custom colors
  const partyBarData = [...partyData].sort((a: any, b: any) => b.value - a.value).slice(0, 8);

  // Radial data for data coverage
  const radialData = [
    { name: 'Caste', value: castePct, fill: '#f97316' },
    { name: 'Age/DOB', value: agePct, fill: '#3b82f6' },
    { name: 'Mobile', value: mobilePct, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Election Info + Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">{election?.name || 'Overview of your election data'}</p>
        </div>
        {pollDate && daysUntilPoll !== null && (
          <Card className={`sm:w-auto ${daysUntilPoll <= 7 && daysUntilPoll > 0 ? 'border-red-300 bg-red-50/50' : ''}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-full ${daysUntilPoll <= 7 && daysUntilPoll > 0 ? 'bg-red-100' : 'bg-muted'}`}>
                <CalendarIcon className={`h-5 w-5 ${daysUntilPoll <= 7 && daysUntilPoll > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Poll Day</p>
                {daysUntilPoll > 0 ? (
                  <p className="text-lg font-black text-red-600">{daysUntilPoll} <span className="text-sm font-medium">days left</span></p>
                ) : daysUntilPoll === 0 ? (
                  <p className="text-lg font-black text-red-600 animate-pulse">TODAY!</p>
                ) : (
                  <p className="text-lg font-semibold text-muted-foreground">{Math.abs(daysUntilPoll)} days ago</p>
                )}
                <p className="text-xs text-muted-foreground">{pollDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* KPI Stat Cards — with colored left border accent */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardLoading
          ? Array(4).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          : stats.map((stat, index) => (
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

      {/* Row 2: Gender Donut (compact) + Age Bar + Data Coverage Radial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gender — Donut Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Gender Split</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : genderData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {genderData.map((_: any, i: number) => <Cell key={i} fill={GENDER_COLORS[i]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {genderData.map((g: any, i: number) => (
                    <div key={g.name} className="text-center">
                      <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ backgroundColor: GENDER_COLORS[i] }} />
                      <p className="text-xs text-muted-foreground">{g.name}</p>
                      <p className="text-sm font-bold">{formatNumber(g.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Age Distribution — Gradient Bar Chart */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Age Distribution</CardTitle>
            <CardDescription className="text-xs">Voter count by age bracket</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : ageGroupData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ageGroupData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="ageGroup" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Voters']} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {ageGroupData.map((_: any, i: number) => (
                      <Cell key={i} fill={AGE_GRADIENT[i % AGE_GRADIENT.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">No age data</div>
            )}
          </CardContent>
        </Card>

        {/* Data Coverage — Radial progress */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4 text-green-500" />
              Data Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" data={radialData} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f3f4f6' }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {[
                { label: 'Mobile Numbers', value: mobilePct, color: 'bg-emerald-500' },
                { label: 'Age / DOB', value: agePct, color: 'bg-blue-500' },
                { label: 'Caste Data', value: castePct, color: 'bg-brand' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-bold">{item.value}%</span>
                  </div>
                  <ProgressBar value={item.value} color={item.color} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Religion + Caste + Party — Horizontal bar charts (not pie!) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Religion</CardTitle>
            <CardDescription className="text-xs">Voter distribution by religion</CardDescription>
          </CardHeader>
          <CardContent>
            {religionData.length > 0 ? (
              <HorizontalBarList data={religionData} colors={RELIGION_COLORS} />
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Caste</CardTitle>
            <CardDescription className="text-xs">Voter distribution by caste</CardDescription>
          </CardHeader>
          <CardContent>
            {casteData.length > 0 ? (
              <HorizontalBarList data={casteData} colors={CASTE_COLORS} />
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Party — Horizontal bar with party-specific colors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Party Affiliation</CardTitle>
            <CardDescription className="text-xs">Political leaning of voters</CardDescription>
          </CardHeader>
          <CardContent>
            {partyBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={partyBarData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Voters']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                    {partyBarData.map((entry: any, i: number) => (
                      <Cell key={i} fill={PARTY_COLORS[entry.name] || RELIGION_COLORS[i % RELIGION_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Booth Operations — BLA-2 Coverage + Committee Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BLA-2 Coverage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-indigo-500" />
              BLA-2 Agent Coverage
            </CardTitle>
            <CardDescription className="text-xs">Booth Level Agent (outside booth) assignment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-black text-indigo-600">{boothOps?.bla2?.coveragePercent ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">Coverage</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{boothOps?.bla2?.assigned ?? 0}</span> / {boothOps?.bla2?.totalBooths ?? 0} booths
                </p>
              </div>
              <ProgressBar value={boothOps?.bla2?.coveragePercent ?? 0} color="bg-indigo-500" />
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Assigned', value: boothOps?.bla2?.assigned ?? 0, bg: 'bg-indigo-50', text: 'text-indigo-700' },
                  { label: 'Confirmed', value: boothOps?.bla2?.confirmed ?? 0, bg: 'bg-green-50', text: 'text-green-700' },
                  { label: 'Trained', value: boothOps?.bla2?.trained ?? 0, bg: 'bg-amber-50', text: 'text-amber-700' },
                ].map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-lg p-2 text-center`}>
                    <p className={`text-lg font-bold ${item.text}`}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booth Committee Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users2Icon className="h-3.5 w-3.5 text-teal-500" />
              Booth Committee Status
            </CardTitle>
            <CardDescription className="text-xs">Committee formation progress across booths</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-black text-teal-600">{boothOps?.committee?.coveragePercent ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">Booths with Committee</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{boothOps?.committee?.boothsWithCommittee ?? 0}</span> / {boothOps?.committee?.totalBooths ?? 0} booths
                </p>
              </div>
              <ProgressBar value={boothOps?.committee?.coveragePercent ?? 0} color="bg-teal-500" />
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'With Committee', value: boothOps?.committee?.boothsWithCommittee ?? 0, bg: 'bg-teal-50', text: 'text-teal-700' },
                  { label: 'Complete (3+)', value: boothOps?.committee?.completeCommittees ?? 0, bg: 'bg-green-50', text: 'text-green-700' },
                  { label: 'Total Members', value: boothOps?.committee?.totalMembers ?? 0, bg: 'bg-blue-50', text: 'text-blue-700' },
                ].map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-lg p-2 text-center`}>
                    <p className={`text-lg font-bold ${item.text}`}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Language (donut) + Voter Category (stacked) + Cadre + Family */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Language — Compact donut */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Languages</CardTitle>
          </CardHeader>
          <CardContent>
            {languageData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={languageData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                      {languageData.map((_: any, i: number) => <Cell key={i} fill={RELIGION_COLORS[i % RELIGION_COLORS.length]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                  {languageData.slice(0, 6).map((l: any, i: number) => (
                    <div key={l.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: RELIGION_COLORS[i % RELIGION_COLORS.length] }} />
                      <span className="text-[10px] text-muted-foreground truncate">{l.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Voter Category — colored cards grid */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Voter Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {voterCategoryData.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {voterCategoryData.slice(0, 4).map((vc: any, i: number) => {
                  const bgColors = ['bg-brand-muted', 'bg-blue-50', 'bg-emerald-50', 'bg-purple-50'];
                  const textColors = ['text-orange-700', 'text-blue-700', 'text-emerald-700', 'text-purple-700'];
                  return (
                    <div key={vc.name} className={`${bgColors[i % 4]} rounded-lg p-3 text-center`}>
                      <p className={`text-lg font-black ${textColors[i % 4]}`}>{formatNumber(vc.value)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{vc.name}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Cadre Status — compact */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2Icon className="h-3.5 w-3.5 text-blue-500" />
              Cadre Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'Total', value: kpis?.totalCadres?.value ?? 0, bg: 'bg-blue-50', text: 'text-blue-700' },
                { label: 'Assigned', value: cadreMetrics?.assigned ?? 0, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                { label: 'Unassigned', value: cadreMetrics?.unassigned ?? 0, bg: 'bg-brand-muted', text: 'text-orange-700' },
                { label: 'Active Today', value: cadreMetrics?.activeToday ?? 0, bg: 'bg-purple-50', text: 'text-purple-700' },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between items-center p-2 ${row.bg} rounded-lg`}>
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={`text-sm font-bold ${row.text}`}>{formatNumber(row.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Family Metrics — compact */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HomeIcon className="h-3.5 w-3.5 text-brand" />
              Family Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'Total', value: familyMetrics?.total ?? 0, bg: 'bg-brand-muted', text: 'text-orange-700' },
                { label: 'Cross-Booth', value: familyMetrics?.crossBooth ?? 0, bg: 'bg-red-50', text: 'text-red-700' },
                { label: 'Single Member', value: familyMetrics?.singleMember ?? 0, bg: 'bg-muted/50', text: 'text-foreground' },
                {
                  label: 'Avg Size',
                  value: (familyMetrics?.total ?? 0) > 0
                    ? ((totalVoters) / (familyMetrics?.total ?? 1)).toFixed(1)
                    : '0',
                  bg: 'bg-blue-50',
                  text: 'text-blue-700',
                },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between items-center p-2 ${row.bg} rounded-lg`}>
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={`text-sm font-bold ${row.text}`}>{typeof row.value === 'number' ? formatNumber(row.value) : row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Voters', desc: `${formatNumber(totalVoters)} registered`, href: '/voters', icon: UsersIcon, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Parts/Booths', desc: `${formatNumber(kpis?.totalBooths?.value ?? 0)} booths`, href: '/parts', icon: MapPinIcon, gradient: 'from-emerald-500 to-emerald-600' },
          { label: 'Cadres', desc: `${formatNumber(kpis?.totalCadres?.value ?? 0)} members`, href: '/cadres', icon: UserCogIcon, gradient: 'from-purple-500 to-purple-600' },
          { label: 'Reports', desc: 'View analytics', href: '/reports', icon: FlagIcon, gradient: 'from-brand to-brand' },
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => navigate(action.href)}
            className={`bg-gradient-to-r ${action.gradient} text-white rounded-xl p-4 flex items-center gap-3 shadow-md hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out text-left w-full group`}
          >
            <action.icon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-xs opacity-80">{action.desc}</p>
            </div>
            <ArrowRightIcon className="h-4 w-4 ml-auto flex-shrink-0 opacity-60 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        ))}
      </div>
    </div>
  );
}
