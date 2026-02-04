import { useQuery } from '@tanstack/react-query';
import { systemAPI } from '../services/api';
import { formatNumber, formatDateTime, getTenantTypeLabel, getTenantTypeColor } from '../lib/utils';
import {
  BuildingIcon,
  UsersIcon,
  VoteIcon,
  UserCheckIcon,
  ActivityIcon,
  TrendingUpIcon,
} from 'lucide-react';

export function DashboardPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => systemAPI.getDashboard(),
  });

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => systemAPI.getHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const stats = dashboardData?.data?.data?.stats || {};
  const tenantsByType = dashboardData?.data?.data?.tenantsByType || {};
  const recentTenants = dashboardData?.data?.data?.recentTenants || [];
  const health = healthData?.data?.data;

  const statCards = [
    {
      title: 'Total Tenants',
      value: formatNumber(stats.totalTenants || 0),
      icon: BuildingIcon,
      color: 'bg-blue-500',
      subtext: `${stats.activeTenants || 0} active`,
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
      subtext: 'All elections',
    },
    {
      title: 'Total Voters',
      value: formatNumber(stats.totalVoters || 0),
      icon: UserCheckIcon,
      color: 'bg-orange-500',
      subtext: 'Registered voters',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of Election Caffe platform</p>
        </div>
        <div className="flex items-center gap-2">
          <ActivityIcon className={`h-5 w-5 ${health?.status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm font-medium ${health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
            System {health?.status || 'Unknown'}
          </span>
        </div>
      </div>

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

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenants by Type */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenants by Type</h2>
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

        {/* Recent Tenants */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tenants</h2>
          <div className="space-y-3">
            {recentTenants.map((tenant: any) => (
              <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{tenant.name}</p>
                  <p className="text-xs text-gray-500">
                    {tenant._count?.users || 0} users, {tenant._count?.elections || 0} elections
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getTenantTypeColor(tenant.tenantType)}`}>
                    {getTenantTypeLabel(tenant.tenantType)}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateTime(tenant.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {recentTenants.length === 0 && (
              <p className="text-gray-500 text-center py-4">No recent tenants</p>
            )}
          </div>
        </div>
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
              <p className="font-medium text-gray-900">Create Tenant</p>
              <p className="text-sm text-gray-500">Add a new organization</p>
            </div>
          </a>
          <a
            href="/features"
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <ActivityIcon className="h-8 w-8 text-orange-500" />
            <div>
              <p className="font-medium text-gray-900">Manage Features</p>
              <p className="text-sm text-gray-500">Configure feature flags</p>
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
