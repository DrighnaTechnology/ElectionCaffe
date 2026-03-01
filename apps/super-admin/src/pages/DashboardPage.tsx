import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemAPI } from '../services/api';
import { formatNumber, formatDateTime, getTenantTypeLabel, getTenantTypeColor } from '../lib/utils';
import {
  BuildingIcon,
  UsersIcon,
  VoteIcon,
  UserCheckIcon,
  ActivityIcon,
  TrendingUpIcon,
  RefreshCwIcon,
  ShieldIcon,
  BarChart3Icon,
  Users2Icon,
  ServerIcon,
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [syncingMessage, setSyncingMessage] = useState('');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => systemAPI.getDashboard(),
  });

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => systemAPI.getHealth(),
    refetchInterval: 30000,
  });

  const { data: servicesHealthData, refetch: refetchServicesHealth, isFetching: isCheckingHealth } = useQuery({
    queryKey: ['services-health'],
    queryFn: () => systemAPI.getServicesHealth(),
    enabled: false, // only fetch on button click
  });

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => systemAPI.getLogs({ limit: 300 }),
  });

  const syncMutation = useMutation({
    mutationFn: () => systemAPI.syncCounts(),
    onMutate: () => setSyncingMessage('Syncing counts from all tenant databases...'),
    onSuccess: (res: any) => {
      const data = res?.data?.data;
      setSyncingMessage(
        `Synced ${data?.synced || 0}/${data?.total || 0} tenants. Total: ${formatNumber(data?.totals?.voters || 0)} voters.`
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setSyncingMessage(''), 5000);
    },
    onError: () => {
      setSyncingMessage('Sync failed. Check server logs.');
      setTimeout(() => setSyncingMessage(''), 5000);
    },
  });

  const stats = dashboardData?.data?.data?.stats || {};
  const tenantsByType = dashboardData?.data?.data?.tenantsByType || {};
  const tenantsByStatus = dashboardData?.data?.data?.tenantsByStatus || {};
  const recentTenants = dashboardData?.data?.data?.recentTenants || [];
  const health = healthData?.data?.data;
  const servicesHealth = servicesHealthData?.data?.data;
  const logs = logsData?.data?.data || [];

  const statCards = [
    {
      title: 'Total Tenants',
      value: formatNumber(stats.totalTenants || 0),
      icon: BuildingIcon,
      color: 'bg-blue-500',
      subtext: `${stats.activeTenants || 0} active, ${stats.inactiveTenants || 0} inactive`,
    },
    {
      title: 'Total Voters',
      value: formatNumber(stats.totalVoters || 0),
      icon: UserCheckIcon,
      color: 'bg-orange-500',
      subtext: `of ${formatNumber(stats.totalMaxVoters || 0)} capacity (${stats.voterUtilization || 0}%)`,
    },
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers || 0),
      icon: UsersIcon,
      color: 'bg-green-500',
      subtext: 'Across all tenants',
    },
    {
      title: 'Total Elections',
      value: formatNumber(stats.totalElections || 0),
      icon: VoteIcon,
      color: 'bg-purple-500',
      subtext: `${formatNumber(stats.totalCadres || 0)} cadres deployed`,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of Election Caffe platform</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCwIcon className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Counts'}
          </button>
          <div className="flex items-center gap-2">
            <ActivityIcon className={`h-5 w-5 ${health?.status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm font-medium ${health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
              System {health?.status || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Sync Message */}
      {syncingMessage && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
          {syncingMessage}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <TrendingUpIcon className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
            <p className="text-sm text-gray-500">{card.title}</p>
            <p className="text-xs text-gray-400 mt-1">{card.subtext}</p>
          </div>
        ))}
      </div>

      {/* Voter Utilization Bar */}
      {stats.totalMaxVoters > 0 && (
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5 text-orange-500" />
              Platform Voter Capacity
            </h2>
            <span className="text-sm text-gray-500">
              {formatNumber(stats.totalVoters || 0)} / {formatNumber(stats.totalMaxVoters || 0)} voters
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                (stats.voterUtilization || 0) > 90
                  ? 'bg-red-500'
                  : (stats.voterUtilization || 0) > 70
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(stats.voterUtilization || 0, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.voterUtilization || 0}% of total voter capacity used across all tenants.
            Billing is based on per-voter usage.
          </p>
        </div>
      )}

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenants by Type */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingIcon className="h-5 w-5 text-blue-500" />
            Tenants by Type
          </h2>
          <div className="space-y-4">
            {Object.entries(tenantsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getTenantTypeColor(type)}`}>
                    {getTenantTypeLabel(type)}
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{formatNumber(count as number)}</span>
              </div>
            ))}
            {Object.keys(tenantsByType).length === 0 && (
              <p className="text-gray-500 text-center py-4">No tenants yet</p>
            )}
          </div>
        </div>

        {/* Tenants by Status */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldIcon className="h-5 w-5 text-green-500" />
            Tenants by Status
          </h2>
          <div className="space-y-4">
            {Object.entries(tenantsByStatus).map(([status, count]) => {
              const statusColors: Record<string, string> = {
                ACTIVE: 'bg-green-100 text-green-800',
                SUSPENDED: 'bg-red-100 text-red-800',
                PENDING: 'bg-yellow-100 text-yellow-800',
                EXPIRED: 'bg-gray-100 text-gray-800',
                TRIAL: 'bg-blue-100 text-blue-800',
              };
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                    {status}
                  </span>
                  <span className="text-lg font-semibold text-gray-900">{formatNumber(count as number)}</span>
                </div>
              );
            })}
            {Object.keys(tenantsByStatus).length === 0 && (
              <p className="text-gray-500 text-center py-4">No tenants yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tenants with Usage Data */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users2Icon className="h-5 w-5 text-purple-500" />
          Recent Tenants
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Tenant</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Type</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Plan</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Voters</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Users</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Elections</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Cadres</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Last Synced</th>
              </tr>
            </thead>
            <tbody>
              {recentTenants.map((tenant: any) => {
                const voterPct = tenant.maxVoters > 0
                  ? Math.round((tenant.currentVoterCount / tenant.maxVoters) * 100)
                  : 0;
                return (
                  <tr key={tenant.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <p className="text-xs text-gray-400">{tenant.slug}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getTenantTypeColor(tenant.tenantType)}`}>
                        {getTenantTypeLabel(tenant.tenantType)}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-xs text-gray-500 capitalize">{tenant.subscriptionPlan || 'free'}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div>
                        <span className="font-medium">{formatNumber(tenant.currentVoterCount || 0)}</span>
                        <span className="text-xs text-gray-400"> / {formatNumber(tenant.maxVoters || 0)}</span>
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1 ml-auto">
                        <div
                          className={`h-1.5 rounded-full ${voterPct > 90 ? 'bg-red-500' : voterPct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(voterPct, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium">{formatNumber(tenant.currentUserCount || 0)}</td>
                    <td className="py-3 px-2 text-right font-medium">{formatNumber(tenant.currentElectionCount || 0)}</td>
                    <td className="py-3 px-2 text-right font-medium">{formatNumber(tenant.currentCadreCount || 0)}</td>
                    <td className="py-3 px-2 text-right text-xs text-gray-400">
                      {tenant.countsLastSyncedAt ? formatDateTime(tenant.countsLastSyncedAt) : 'Never'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recentTenants.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent tenants</p>
          )}
        </div>
      </div>

      {/* Service Health Check */}
      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ServerIcon className="h-5 w-5 text-blue-500" />
            Service Health
          </h2>
          <div className="flex items-center gap-3">
            {servicesHealth && (
              <span className="text-xs text-gray-400">
                Checked: {formatDateTime(servicesHealth.checkedAt)}
              </span>
            )}
            <button
              onClick={() => refetchServicesHealth()}
              disabled={isCheckingHealth}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCwIcon className={`h-3.5 w-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              {isCheckingHealth ? 'Checking...' : 'Check Health'}
            </button>
          </div>
        </div>

        {servicesHealth ? (
          <>
            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="text-green-600 font-medium">{servicesHealth.healthy} Healthy</span>
              <span className="text-red-600 font-medium">{servicesHealth.unhealthy} Down</span>
              <span className="text-gray-500">of {servicesHealth.total} services</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {servicesHealth.services.map((svc: any) => (
                <div
                  key={svc.name}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    svc.status === 'healthy'
                      ? 'bg-green-50 border-green-200'
                      : svc.status === 'unhealthy'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {svc.status === 'healthy' ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    ) : svc.status === 'unhealthy' ? (
                      <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                      <p className="text-xs text-gray-400">Port {svc.port}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      svc.status === 'healthy'
                        ? 'bg-green-100 text-green-700'
                        : svc.status === 'unhealthy'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {svc.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{svc.latency}ms</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-6">Click "Check Health" to verify all microservices</p>
        )}
      </div>

      {/* Platform Audit Logs */}
      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileTextIcon className="h-5 w-5 text-gray-500" />
            Audit Logs
          </h2>
          <span className="text-xs text-gray-400">Last 300 entries</span>
        </div>

        {isLoadingLogs ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-3 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Timestamp</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Action</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Entity</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Actor</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-2 text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        log.action?.includes('CREATE') || log.action?.includes('create')
                          ? 'bg-green-100 text-green-700'
                          : log.action?.includes('DELETE') || log.action?.includes('delete')
                          ? 'bg-red-100 text-red-700'
                          : log.action?.includes('UPDATE') || log.action?.includes('update')
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-700">
                      <span className="font-medium">{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-gray-400 ml-1">({log.entityId.slice(0, 8)}...)</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-500">
                      {log.actorType || 'system'}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-400 max-w-[200px] truncate">
                      {log.metadata ? (typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6">No audit logs found</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/tenants"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <BuildingIcon className="h-8 w-8 text-orange-500" />
            <div>
              <p className="font-medium text-gray-900">Manage Tenants</p>
              <p className="text-sm text-gray-500">View & manage organizations</p>
            </div>
          </a>
          <a
            href="/features"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <ActivityIcon className="h-8 w-8 text-orange-500" />
            <div>
              <p className="font-medium text-gray-900">Feature Flags</p>
              <p className="text-sm text-gray-500">Configure features per tenant</p>
            </div>
          </a>
          <a
            href="/system"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <UsersIcon className="h-8 w-8 text-orange-500" />
            <div>
              <p className="font-medium text-gray-900">System Settings</p>
              <p className="text-sm text-gray-500">Configure platform</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
