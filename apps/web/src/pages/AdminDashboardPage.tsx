import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { organizationAPI, electionsAPI, dashboardAPI, aiAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { formatDate, formatNumber, getInitials } from '../lib/utils';
import { toast } from 'sonner';
import { Label } from '../components/ui/label';
import {
  UsersIcon,
  VoteIcon,
  MapPinIcon,
  UserCogIcon,
  Users2Icon,
  ShieldCheckIcon,
  SearchIcon,
  UserPlusIcon,
  ExternalLinkIcon,
  LayoutDashboardIcon,
  ClockIcon,
  ActivityIcon,
  BarChart3Icon,
  DatabaseIcon,
  SparklesIcon,
  CreditCardIcon,
  GiftIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  XIcon,
  PencilIcon,
  Trash2Icon,
  MoreHorizontalIcon,
  BanIcon,
  UserCheckIcon,
  ShieldIcon,
  SaveIcon,
  LoaderIcon,
  ChevronDownIcon,
  PlusIcon,
  CopyIcon,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
};

export function AdminDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [roleFeaturesPending, setRoleFeaturesPending] = useState<
    Map<string, { role: string; featureKey: string; isEnabled: boolean }>
  >(new Map());
  const [showRoleFeatures, setShowRoleFeatures] = useState(false);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [deletingCustomRole, setDeletingCustomRole] = useState<{ id: string; name: string } | null>(null);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [createdUserResult, setCreatedUserResult] = useState<{
    user: any;
    tempPassword: string;
    loginUrl: string;
  } | null>(null);

  // Mutations for custom roles
  const createCustomRoleMutation = useMutation({
    mutationFn: (name: string) => organizationAPI.createCustomRole({ name }),
    onSuccess: () => {
      toast.success('Custom role created');
      queryClient.invalidateQueries({ queryKey: ['role-features'] });
      setShowAddRoleDialog(false);
      setNewRoleName('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create role');
    },
  });

  const deleteCustomRoleMutation = useMutation({
    mutationFn: (roleId: string) => organizationAPI.deleteCustomRole(roleId),
    onSuccess: () => {
      toast.success('Custom role deleted');
      queryClient.invalidateQueries({ queryKey: ['role-features'] });
      setDeletingCustomRole(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete role');
    },
  });

  const updateCustomRoleFeaturesMutation = useMutation({
    mutationFn: ({ roleId, updates }: { roleId: string; updates: { featureKey: string; isEnabled: boolean }[] }) =>
      organizationAPI.updateCustomRoleFeatures(roleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-features'] });
    },
    onError: () => {
      toast.error('Failed to save custom role feature access');
    },
  });

  // Mutations for user management
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      organizationAPI.updateUser(userId, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update user');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      organizationAPI.updateUserStatus(userId, status),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update status');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => organizationAPI.deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeletingUser(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete user');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (userIds: string[]) => organizationAPI.bulkDeleteUsers(userIds),
    onSuccess: (res) => {
      const count = res?.data?.data?.deletedCount ?? selectedUserIds.size;
      toast.success(`${count} user(s) deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUserIds(new Set());
      setShowBulkDeleteConfirm(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete users');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName?: string; email?: string; mobile: string; customRoleId?: string }) =>
      organizationAPI.createUser(data),
    onSuccess: (res) => {
      const result = res?.data?.data;
      setCreatedUserResult(result);
      setShowCreateUserDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create user');
    },
  });

  // Always fetch custom roles (for create/edit user dropdowns)
  const { data: customRolesData } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: () => organizationAPI.getCustomRoles(),
  });
  const allCustomRoles: { id: string; slug: string; name: string; description?: string }[] =
    (customRolesData as any)?.data?.data?.customRoles || [];

  // Role features bulk update
  // Fetch role-feature matrix
  const { data: roleFeaturesData, isLoading: roleFeaturesLoading } = useQuery({
    queryKey: ['role-features'],
    queryFn: () => organizationAPI.getRoleFeatures(),
    enabled: showRoleFeatures,
  });

  const rfMatrix = (roleFeaturesData as any)?.data?.data?.matrix || {};
  const rfFeatures: { key: string; label: string; category: string }[] = (roleFeaturesData as any)?.data?.data?.features || [];
  const rfRoles: string[] = (roleFeaturesData as any)?.data?.data?.roles || [];
  const rfCustomRoles: { id: string; slug: string; name: string; description?: string; isCustom: boolean }[] =
    (roleFeaturesData as any)?.data?.data?.customRoles || [];

  // Lookup: slug → custom role metadata
  const customRoleMap = new Map(rfCustomRoles.map(cr => [cr.slug, cr]));

  const featuresByCategory = rfFeatures.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, { key: string; label: string; category: string }[]>);

  const getRfValue = (role: string, featureKey: string): boolean => {
    const key = `${role}-${featureKey}`;
    if (roleFeaturesPending.has(key)) return roleFeaturesPending.get(key)!.isEnabled;
    return rfMatrix[role]?.[featureKey] ?? false;
  };

  const toggleRfValue = (role: string, featureKey: string, current: boolean) => {
    const key = `${role}-${featureKey}`;
    setRoleFeaturesPending((prev) => {
      const next = new Map(prev);
      next.set(key, { role, featureKey, isEnabled: !current });
      return next;
    });
  };

  const saveAllRfChanges = () => {
    const allPending = Array.from(roleFeaturesPending.values());

    // Group updates by role slug → roleId
    const byRole = new Map<string, { featureKey: string; isEnabled: boolean }[]>();
    for (const u of allPending) {
      if (!byRole.has(u.role)) byRole.set(u.role, []);
      byRole.get(u.role)!.push({ featureKey: u.featureKey, isEnabled: u.isEnabled });
    }

    for (const [slug, updates] of byRole) {
      const cr = customRoleMap.get(slug);
      if (cr) {
        updateCustomRoleFeaturesMutation.mutate({ roleId: cr.id, updates });
      }
    }

    setRoleFeaturesPending(new Map());
    toast.success('Feature access saved successfully');
  };

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', searchQuery, roleFilter, page],
    queryFn: () =>
      organizationAPI.getUsers({
        page,
        limit: 20,
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      }),
  });

  // Fetch elections
  const { data: electionsData, isLoading: electionsLoading } = useQuery({
    queryKey: ['admin-elections'],
    queryFn: () => electionsAPI.getAll({ page: 1, limit: 100 }),
  });

  // Fetch AI credits
  const { data: creditsData, isLoading: creditsLoading } = useQuery({
    queryKey: ['admin-ai-credits'],
    queryFn: () => aiAPI.getCredits(),
    refetchInterval: 30000,
  });

  const credits = creditsData?.data?.data;
  const creditBalance = credits?.balance ?? 0;
  const totalCredits = credits?.totalCredits ?? 0;
  const usedCredits = credits?.usedCredits ?? 0;
  const bonusCredits = credits?.bonusCredits ?? 0;

  const users = usersData?.data?.data?.data || [];
  const pagination = usersData?.data?.data?.pagination;
  const elections = electionsData?.data?.data || [];
  const totalElections = elections.length;

  // Selectable users = all users except self
  const selectableUsers = users.filter((u: any) => u.id !== user?.id);
  const allSelectableSelected = selectableUsers.length > 0 && selectableUsers.every((u: any) => selectedUserIds.has(u.id));
  const someSelected = selectedUserIds.size > 0;

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUsers.map((u: any) => u.id)));
    }
  };

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

  // User metrics
  const totalUsers = pagination?.total ?? users.length;
  const adminCount = users.filter((u: any) => u.role === 'CENTRAL_ADMIN').length;
  const activeCount = users.filter((u: any) => u.status === 'ACTIVE').length;

  const metricsLoading = usersLoading || electionsLoading || dashLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and view platform metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            Open Election Caffe
          </a>
          <Button className="gap-2" onClick={() => setShowCreateUserDialog(true)}>
            <UserPlusIcon className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* AI Credits Card */}
      <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-background">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <SparklesIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">CaffeAI Credits</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-amber-700">{formatNumber(creditBalance)}</span>
                  <span className="text-sm text-muted-foreground">available</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Credit breakdown */}
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-bold">{formatNumber(totalCredits)}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Used</p>
                  <p className="font-bold text-red-600">{formatNumber(usedCredits)}</p>
                </div>
                {bonusCredits > 0 && (
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Bonus</p>
                    <p className="font-bold text-emerald-600">{formatNumber(bonusCredits)}</p>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setShowPurchaseModal(true)}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CreditCardIcon className="h-4 w-4" />
                Buy Credits
              </Button>
            </div>
          </div>

          {/* Usage bar */}
          {totalCredits > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{Math.round((usedCredits / (totalCredits + bonusCredits)) * 100)}% used</span>
                <span>{formatNumber(totalCredits + bonusCredits - usedCredits)} remaining</span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min((usedCredits / (totalCredits + bonusCredits)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Metric Cards — Users & Elections */}
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

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Users & Access
              </CardTitle>
              <CardDescription className="text-xs">
                All users and their roles in the system
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or mobile..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="FULL_ADMIN">Full Admin</SelectItem>
                {allCustomRoles.map((cr) => (
                  <SelectItem key={cr.id} value={`customrole:${cr.id}`}>{cr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {usersLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <>
              {/* Bulk Action Bar */}
              {someSelected && (
                <div className="flex items-center justify-between p-3 mb-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUserIds(new Set())}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-3 w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-muted-foreground/30 cursor-pointer accent-brand"
                          checked={allSelectableSelected}
                          onChange={toggleSelectAll}
                          title="Select all"
                        />
                      </th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Login</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((u: any) => {
                      const isSelf = u.id === user?.id;
                      return (
                      <tr key={u.id} className={`group transition-colors cursor-pointer ${selectedUserIds.has(u.id) ? 'bg-destructive/5' : 'hover:bg-muted/30'}`} onClick={() => navigate(`/admin-dashboard/users/${u.id}`)}>
                        <td className="py-3 pr-3 w-10" onClick={(e) => e.stopPropagation()}>
                          {!isSelf ? (
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-muted-foreground/30 cursor-pointer accent-brand"
                              checked={selectedUserIds.has(u.id)}
                              onChange={() => toggleSelectUser(u.id)}
                            />
                          ) : <div className="h-4 w-4" />}
                        </td>
                        <td className="py-3 pr-4">
                          <div
                            className="flex items-center gap-3"
                          >
                            <div className="h-9 w-9 rounded-full bg-brand-muted flex items-center justify-center text-xs font-bold text-brand flex-shrink-0">
                              {u.profilePhotoUrl ? (
                                <img src={u.profilePhotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                              ) : (
                                getInitials(`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'U')
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-brand hover:underline">
                                {u.firstName} {u.lastName || ''}
                                {isSelf && (
                                  <span className="text-xs text-muted-foreground ml-1">(You)</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm">{u.mobile}</p>
                          {u.email && (
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={u.customRole ? 'secondary' : 'destructive'}>
                            {u.customRole ? u.customRole.name : 'Full Admin'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={STATUS_VARIANT[u.status] || 'secondary'}>{u.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {u.lastLoginAt ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ClockIcon className="h-3 w-3" />
                              {formatDate(u.lastLoginAt)}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Never</span>
                          )}
                        </td>
                        <td className="py-3" onClick={(e) => e.stopPropagation()}>
                          {!isSelf && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Edit user"
                                onClick={() => setEditingUser(u)}
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </Button>
                              {u.status === 'ACTIVE' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                                  title="Block user"
                                  onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'BLOCKED' })}
                                >
                                  <BanIcon className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                                  title="Activate user"
                                  onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'ACTIVE' })}
                                >
                                  <UserCheckIcon className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Delete user"
                                onClick={() => setDeletingUser(u)}
                              >
                                <Trash2Icon className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * (pagination.limit || 20) + 1} -{' '}
                    {Math.min(page * (pagination.limit || 20), pagination.total)} of{' '}
                    {pagination.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Role Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <LayoutDashboardIcon className="h-4 w-4" />
            Role Distribution
          </CardTitle>
          <CardDescription className="text-xs">
            Breakdown of users by their assigned roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoleDistributionSection />
        </CardContent>
      </Card>

      {/* Role-Based Feature Access */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldIcon className="h-4 w-4" />
                Role-Based Feature Access
              </CardTitle>
              <CardDescription className="text-xs">
                Control which features each role can see in the application
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {showRoleFeatures && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowAddRoleDialog(true)}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Role
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowRoleFeatures((v) => !v)}
              >
                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${showRoleFeatures ? 'rotate-180' : ''}`} />
                {showRoleFeatures ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showRoleFeatures && (
          <CardContent>
            {roleFeaturesPending.size > 0 && (
              <div className="flex items-center justify-between p-3 mb-4 bg-brand-muted border border-brand/20 rounded-lg">
                <p className="text-sm text-orange-800">
                  {roleFeaturesPending.size} unsaved change{roleFeaturesPending.size > 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setRoleFeaturesPending(new Map())}>
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={saveAllRfChanges}
                    disabled={updateCustomRoleFeaturesMutation.isPending}
                  >
                    {updateCustomRoleFeaturesMutation.isPending ? (
                      <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <SaveIcon className="h-3.5 w-3.5" />
                    )}
                    Save All
                  </Button>
                </div>
              </div>
            )}

            {roleFeaturesLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : rfFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No feature configuration available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="sticky left-0 bg-background text-left pb-2 pl-3 pr-4 min-w-[180px] w-[180px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Role
                      </th>
                      {Object.entries(featuresByCategory).map(([cat, catFeatures]) => (
                        <th key={cat} colSpan={catFeatures.length} className="text-center pb-1 border-l text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                          {cat}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <th className="sticky left-0 bg-background" />
                      {rfFeatures.map((f) => (
                        <th key={f.key} className="text-center text-[11px] px-1.5 pb-2 text-muted-foreground font-medium min-w-[70px]">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rfRoles.map((role) => {
                      const isCustom = customRoleMap.has(role);
                      const crMeta = customRoleMap.get(role);
                      return (
                        <tr key={role} className={`hover:bg-muted/30 transition-colors ${isCustom ? 'bg-blue-50/40' : ''}`}>
                          <td className="sticky left-0 bg-background py-2.5 pl-3 pr-2 font-medium text-xs">
                            <div className="flex items-center justify-between whitespace-nowrap">
                              <span>{crMeta?.name || role}</span>
                              {isCustom && (
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 ml-2"
                                  title="Delete custom role"
                                  onClick={() => setDeletingCustomRole({ id: crMeta!.id, name: crMeta!.name })}
                                >
                                  <Trash2Icon className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          {rfFeatures.map((f) => {
                            const enabled = getRfValue(role, f.key);
                            const key = `${role}-${f.key}`;
                            const hasChange = roleFeaturesPending.has(key);
                            return (
                              <td key={f.key} className={`text-center py-2.5 ${hasChange ? 'bg-brand-muted' : ''}`}>
                                <Checkbox
                                  checked={enabled}
                                  onCheckedChange={() => toggleRfValue(role, f.key, enabled)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Add Custom Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Add Custom Role
            </DialogTitle>
            <DialogDescription>
              Create a new role. You can then assign menu access in the matrix.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newRoleName.trim()) createCustomRoleMutation.mutate(newRoleName.trim());
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="custom-role-name">Role Name</Label>
              <Input
                id="custom-role-name"
                placeholder="e.g. District Officer"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setShowAddRoleDialog(false); setNewRoleName(''); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newRoleName.trim() || createCustomRoleMutation.isPending}>
                {createCustomRoleMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Create Role
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Custom Role Confirmation */}
      {deletingCustomRole && (
        <Dialog open={!!deletingCustomRole} onOpenChange={(open) => !open && setDeletingCustomRole(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2Icon className="h-5 w-5" />
                Delete Custom Role
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the role <strong>{deletingCustomRole.name}</strong>?
                All feature access settings for this role will be removed.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDeletingCustomRole(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteCustomRoleMutation.isPending}
                onClick={() => deleteCustomRoleMutation.mutate(deletingCustomRole.id)}
              >
                {deleteCustomRoleMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Purchase Credits Modal */}
      <PurchaseCreditsModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-ai-credits'] });
          queryClient.invalidateQueries({ queryKey: ['ai-credits-header'] });
        }}
      />

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onSave={(data) => updateUserMutation.mutate({ userId: editingUser.id, data })}
          isPending={updateUserMutation.isPending}
          customRoles={allCustomRoles}
        />
      )}

      {/* Create User Dialog */}
      <CreateUserDialog
        open={showCreateUserDialog}
        onOpenChange={setShowCreateUserDialog}
        onSubmit={(data) => createUserMutation.mutate(data)}
        isPending={createUserMutation.isPending}
        customRoles={allCustomRoles}
      />

      {/* Created User Success Dialog */}
      {createdUserResult && (
        <CreatedUserSuccessDialog
          open={!!createdUserResult}
          onOpenChange={(open) => !open && setCreatedUserResult(null)}
          result={createdUserResult}
          onViewUser={(id) => navigate(`/admin-dashboard/users/${id}`)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingUser && (
        <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2Icon className="h-5 w-5" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingUser.firstName} {deletingUser.lastName || ''}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDeletingUser(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteUserMutation.isPending}
                onClick={() => deleteUserMutation.mutate(deletingUser.id)}
              >
                {deleteUserMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2Icon className="h-5 w-5" />
              Delete {selectedUserIds.size} User{selectedUserIds.size > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedUserIds.size}</strong> selected user{selectedUserIds.size > 1 ? 's' : ''}?
              This action cannot be undone and all their data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedUserIds))}
            >
              {bulkDeleteMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Delete {selectedUserIds.size} User{selectedUserIds.size > 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Purchase Credits Modal ====================

function PurchaseCreditsModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { user } = useAuthStore();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ['credit-packages'],
    queryFn: () => aiAPI.getCreditPackages(),
    enabled: open,
  });

  const packages = packagesData?.data?.data || [];

  const createOrderMutation = useMutation({
    mutationFn: (packageId: string) => aiAPI.createPurchaseOrder(packageId),
  });

  const verifyMutation = useMutation({
    mutationFn: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      packageId: string;
    }) => aiAPI.verifyPurchase(data),
  });

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (pkg: any) => {
    setPurchasing(pkg.id);

    try {
      // Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Please try again.');
        setPurchasing(null);
        return;
      }

      // Create order
      const orderRes = await createOrderMutation.mutateAsync(pkg.id);
      const order = orderRes.data?.data;

      if (!order?.orderId || !order?.keyId) {
        toast.error('Failed to create payment order. Payment gateway may not be configured.');
        setPurchasing(null);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'ElectionCaffe',
        description: `${order.packageName} — ${order.credits} credits${order.bonusCredits ? ` + ${order.bonusCredits} bonus` : ''}`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            await verifyMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              packageId: pkg.id,
            });
            toast.success('Credits purchased successfully!');
            onSuccess();
            onOpenChange(false);
          } catch {
            toast.error('Payment verification failed. Please contact support.');
          }
          setPurchasing(null);
        },
        modal: {
          ondismiss: () => {
            setPurchasing(null);
          },
        },
        prefill: {
          name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
          contact: user?.mobile || '',
        },
        theme: {
          color: '#d97706',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to initiate payment');
      setPurchasing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-amber-600" />
            Purchase AI Credits
          </DialogTitle>
          <DialogDescription>
            Choose a credit package to power your CaffeAI features
          </DialogDescription>
        </DialogHeader>

        {packagesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCardIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No credit packages available at the moment</p>
            <p className="text-xs text-muted-foreground mt-1">Please contact your administrator</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {packages.map((pkg: any) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  pkg.isPopular ? 'border-amber-400 border-2 shadow-amber-100' : ''
                }`}
              >
                {pkg.isPopular && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    POPULAR
                  </div>
                )}

                <CardContent className="p-5">
                  <h3 className="font-bold text-lg">{pkg.displayName || pkg.packageName}</h3>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold">{formatNumber(pkg.credits)} credits</span>
                    </div>

                    {pkg.bonusCredits > 0 && (
                      <div className="flex items-center gap-2">
                        <GiftIcon className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-emerald-600 font-medium">+{formatNumber(pkg.bonusCredits)} bonus</span>
                      </div>
                    )}

                    {pkg.discountPercent > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-blue-600 font-medium">{pkg.discountPercent}% off</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Valid for {pkg.validityDays} days</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-black">
                        {pkg.currency === 'INR' ? '₹' : '$'}{Number(pkg.price).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      className="w-full gap-2"
                      variant={pkg.isPopular ? 'default' : 'outline'}
                      disabled={purchasing !== null}
                      onClick={() => handlePurchase(pkg)}
                    >
                      {purchasing === pkg.id ? (
                        <>
                          <Spinner size="sm" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCardIcon className="h-4 w-4" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==================== Edit User Dialog ====================

function EditUserDialog({
  user: editUser,
  open,
  onOpenChange,
  onSave,
  isPending,
  customRoles,
}: {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  isPending: boolean;
  customRoles: { id: string; slug: string; name: string }[];
}) {
  const [firstName, setFirstName] = useState(editUser.firstName || '');
  const [lastName, setLastName] = useState(editUser.lastName || '');
  const [email, setEmail] = useState(editUser.email || '');
  const [mobile, setMobile] = useState(editUser.mobile || '');
  const [customRoleId, setCustomRoleId] = useState(editUser.customRoleId || '__none__');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!mobile.trim()) {
      toast.error('Mobile is required');
      return;
    }
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      customRoleId: customRoleId === '__none__' ? null : customRoleId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilIcon className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update details for {editUser.firstName} {editUser.lastName || ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input id="edit-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input id="edit-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-mobile">Mobile</Label>
            <Input id="edit-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <Select value={customRoleId} onValueChange={setCustomRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Full Admin Access</SelectItem>
                {customRoles.map((cr) => (
                  <SelectItem key={cr.id} value={cr.id}>{cr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Create User Dialog ====================

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  customRoles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { firstName: string; lastName?: string; email?: string; mobile: string; customRoleId?: string }) => void;
  isPending: boolean;
  customRoles: { id: string; slug: string; name: string }[];
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [customRoleId, setCustomRoleId] = useState('__none__');

  useEffect(() => {
    if (open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setMobile('');
      setCustomRoleId('__none__');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!mobile.trim()) {
      toast.error('Mobile number is required');
      return;
    }
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      mobile: mobile.trim(),
      customRoleId: customRoleId === '__none__' ? undefined : customRoleId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            A temporary password will be generated. Share the login URL and password with the user.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter first name" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter last name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mobile Number *</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="e.g. 9876543210" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={customRoleId} onValueChange={setCustomRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Full Admin Access</SelectItem>
                {customRoles.map((cr) => (
                  <SelectItem key={cr.id} value={cr.id}>{cr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Users without a custom role get full admin access. Assign a role to restrict features.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Create User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Created User Success Dialog ====================

function CreatedUserSuccessDialog({
  open,
  onOpenChange,
  result,
  onViewUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: { user: any; tempPassword: string; loginUrl: string };
  onViewUser?: (userId: string) => void;
}) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircleIcon className="h-5 w-5" />
            User Created Successfully
          </DialogTitle>
          <DialogDescription>
            Share the following credentials with <strong>{result.user.firstName}</strong>.
            The temporary password will NOT be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-900">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1.5">Login URL</p>
            <div className="flex items-center gap-2">
              <code className="text-sm flex-1 break-all">{result.loginUrl}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.loginUrl, 'Login URL')}>
                <CopyIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-900">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5">Mobile / Username</p>
            <div className="flex items-center gap-2">
              <code className="text-sm flex-1">{result.user.mobile}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.user.mobile, 'Mobile')}>
                <CopyIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/30 dark:border-red-900">
            <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1.5">Temporary Password (shown once)</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono flex-1 break-all">{result.tempPassword}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.tempPassword, 'Password')}>
                <CopyIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              const text = `Login URL: ${result.loginUrl}\nMobile: ${result.user.mobile}\nTemporary Password: ${result.tempPassword}\n\nPlease change your password on first login.`;
              copyToClipboard(text, 'All credentials');
            }}
          >
            <CopyIcon className="h-4 w-4 mr-2" />
            Copy All Credentials
          </Button>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          {onViewUser && (
            <Button variant="outline" onClick={() => { onOpenChange(false); onViewUser(result.user.id); }}>
              View User
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Role Distribution ====================

function RoleDistributionSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-role-distribution'],
    queryFn: () => organizationAPI.getRoleDistribution(),
  });

  const distribution: { role: string; count: number }[] = data?.data?.data?.distribution || [];

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (distribution.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No user data</p>;
  }

  const max = distribution[0]?.count || 1;

  const barColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-brand',
    'bg-red-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
  ];

  return (
    <div className="space-y-2.5">
      {distribution.map(({ role, count }, i) => (
        <div key={role}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-foreground">{role}</span>
            <span className="text-xs font-bold text-muted-foreground">{count}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${barColors[i % barColors.length]}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
