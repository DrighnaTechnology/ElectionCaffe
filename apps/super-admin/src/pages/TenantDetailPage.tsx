import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsAPI } from '../services/api';
import { formatNumber, formatDateTime, getTenantTypeLabel, getTenantTypeColor } from '../lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  BuildingIcon,
  UsersIcon,
  VoteIcon,
  UserCheckIcon,
  ToggleLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react';

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsAPI.getById(id!),
    enabled: !!id,
  });

  const { data: statsData } = useQuery({
    queryKey: ['tenant-stats', id],
    queryFn: () => tenantsAPI.getStats(id!),
    enabled: !!id,
  });

  const { data: featuresData } = useQuery({
    queryKey: ['tenant-features', id],
    queryFn: () => tenantsAPI.getFeatures(id!),
    enabled: !!id,
  });

  const toggleFeatureMutation = useMutation({
    mutationFn: ({ featureId, isEnabled }: { featureId: string; isEnabled: boolean }) =>
      tenantsAPI.updateFeature(id!, featureId, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-features', id] });
      toast.success('Feature updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update feature');
    },
  });

  const tenant = tenantData?.data?.data;
  const stats = statsData?.data?.data;
  const features = featuresData?.data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <BuildingIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Tenant not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tenants')}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <span className={`px-2 py-1 text-xs font-medium rounded ${getTenantTypeColor(tenant.tenantType)}`}>
              {getTenantTypeLabel(tenant.tenantType)}
            </span>
            {tenant.isActive ? (
              <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircleIcon className="h-4 w-4" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-sm">
                <XCircleIcon className="h-4 w-4" />
                Inactive
              </span>
            )}
          </div>
          <p className="text-gray-500">{tenant.slug}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.totalUsers || tenant._count?.users || 0)}</p>
              <p className="text-sm text-gray-500">Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <VoteIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.totalElections || tenant._count?.elections || 0)}</p>
              <p className="text-sm text-gray-500">Elections</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UserCheckIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats?.totalVoters || 0)}</p>
              <p className="text-sm text-gray-500">Voters</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ToggleLeftIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{features.filter((f: any) => f.isEnabled).length}</p>
              <p className="text-sm text-gray-500">Features Enabled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Info */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Database Type</dt>
              <dd className="font-medium">{tenant.databaseType || 'SHARED'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium">{formatDateTime(tenant.createdAt)}</dd>
            </div>
            {tenant.limits && (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Max Users</dt>
                  <dd className="font-medium">{tenant.limits.maxUsers || 'Unlimited'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Max Elections</dt>
                  <dd className="font-medium">{tenant.limits.maxElections || 'Unlimited'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Max Voters</dt>
                  <dd className="font-medium">{tenant.limits.maxVoters ? formatNumber(tenant.limits.maxVoters) : 'Unlimited'}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Feature Flags */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Flags</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {features.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No features configured</p>
            ) : (
              features.map((feature: any) => (
                <div key={feature.featureId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{feature.feature?.featureName}</p>
                    <p className="text-xs text-gray-500">{feature.feature?.category}</p>
                  </div>
                  <button
                    onClick={() => toggleFeatureMutation.mutate({
                      featureId: feature.featureId,
                      isEnabled: !feature.isEnabled,
                    })}
                    disabled={toggleFeatureMutation.isPending}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      feature.isEnabled ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        feature.isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
