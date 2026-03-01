import { useState } from 'react';
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
  RefreshCwIcon,
  Users2Icon,
  BarChart3Icon,
  LinkIcon,
  ShieldIcon,
  KeyIcon,
  CopyIcon,
  XIcon,
  AlertTriangleIcon,
  PencilIcon,
  SaveIcon,
  CheckIcon,
} from 'lucide-react';

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((used / max) * 100) : 0;
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {formatNumber(used)} / {formatNumber(max)} ({pct}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

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

  const { data: adminData } = useQuery({
    queryKey: ['tenant-admin', id],
    queryFn: () => tenantsAPI.getAdminInfo(id!),
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

  const syncMutation = useMutation({
    mutationFn: () => tenantsAPI.syncCounts(id!),
    onSuccess: (res: any) => {
      const data = res?.data?.data;
      toast.success(
        `Synced: ${formatNumber(data?.voters || 0)} voters, ${formatNumber(data?.users || 0)} users, ${formatNumber(data?.elections || 0)} elections, ${formatNumber(data?.cadres || 0)} cadres`
      );
      queryClient.invalidateQueries({ queryKey: ['tenant-stats', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Sync failed');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => tenantsAPI.resetAdminPassword(id!),
    onSuccess: (res: any) => {
      const data = res?.data?.data;
      setTempPassword(data.tempPassword);
      setShowResetConfirm(false);
      setShowPasswordModal(true);
      queryClient.invalidateQueries({ queryKey: ['tenant-admin', id] });
      toast.success('Temporary password generated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to generate password');
      setShowResetConfirm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => tenantsAPI.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['tenant-stats', id] });
      setIsEditing(false);
      setEditData({});
      toast.success('Tenant updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update tenant');
    },
  });

  const tenant = tenantData?.data?.data;
  const stats = statsData?.data?.data;
  const features = featuresData?.data?.data || [];
  const adminInfo = adminData?.data?.data;
  const usage = stats?.usage || {};
  const limits = stats?.limits || {};

  const startEditing = () => {
    if (!tenant) return;
    setEditData({
      name: tenant.name || '',
      slug: tenant.slug || '',
      displayName: tenant.displayName || '',
      organizationName: tenant.organizationName || '',
      contactEmail: tenant.contactEmail || '',
      contactPhone: tenant.contactPhone || '',
      address: tenant.address || '',
      state: tenant.state || '',
      primaryColor: tenant.primaryColor || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Only send fields that actually changed
    const changes: Record<string, any> = {};
    for (const [key, value] of Object.entries(editData)) {
      const original = (tenant as any)?.[key] || '';
      if (value !== original) {
        changes[key] = value || null;
      }
    }
    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate(changes);
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast.success('Password copied to clipboard');
    }
  };

  const handleClosePasswordModal = () => {
    setTempPassword(null);
    setShowPasswordModal(false);
  };

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
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
              tenant.status === 'TRIAL' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {tenant.status}
            </span>
          </div>
          <p className="text-gray-500">{tenant.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => { setIsEditing(false); setEditData({}); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <SaveIcon className="h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </button>
          )}
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCwIcon className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Counts'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserCheckIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(usage.voters || 0)}</p>
              <p className="text-sm text-gray-500">Voters</p>
              <p className="text-xs text-gray-400">of {formatNumber(limits.maxVoters || 0)} max</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(usage.users || 0)}</p>
              <p className="text-sm text-gray-500">Users</p>
              <p className="text-xs text-gray-400">of {formatNumber(limits.maxUsers || 0)} max</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <VoteIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(usage.elections || 0)}</p>
              <p className="text-sm text-gray-500">Elections</p>
              <p className="text-xs text-gray-400">of {formatNumber(limits.maxElections || 0)} max</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users2Icon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(usage.cadres || 0)}</p>
              <p className="text-sm text-gray-500">Cadres</p>
              <p className="text-xs text-gray-400">of {formatNumber(limits.maxCadres || 0)} max</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Bars */}
      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5 text-orange-500" />
            Usage vs Limits
          </h2>
          {stats?.countsLastSyncedAt && (
            <span className="text-xs text-gray-400">
              Last synced: {formatDateTime(stats.countsLastSyncedAt)}
            </span>
          )}
        </div>
        <div className="space-y-4">
          <UsageBar used={usage.voters || 0} max={limits.maxVoters || 0} label="Voters" />
          <UsageBar used={usage.users || 0} max={limits.maxUsers || 0} label="Users" />
          <UsageBar used={usage.elections || 0} max={limits.maxElections || 0} label="Elections" />
          <UsageBar used={usage.cadres || 0} max={limits.maxCadres || 0} label="Cadres" />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Info */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Information</h2>
          {isEditing ? (
            <div className="space-y-3">
              <EditField label="Name" value={editData.name} onChange={(v) => setEditData({ ...editData, name: v })} />
              <EditField label="Slug" value={editData.slug} onChange={(v) => setEditData({ ...editData, slug: v })} hint="Changes the tenant URL" />
              <EditField label="Display Name" value={editData.displayName} onChange={(v) => setEditData({ ...editData, displayName: v })} />
              <EditField label="Organization" value={editData.organizationName} onChange={(v) => setEditData({ ...editData, organizationName: v })} />
              <EditField label="Contact Email" value={editData.contactEmail} onChange={(v) => setEditData({ ...editData, contactEmail: v })} type="email" />
              <EditField label="Contact Phone" value={editData.contactPhone} onChange={(v) => setEditData({ ...editData, contactPhone: v })} />
              <EditField label="Address" value={editData.address} onChange={(v) => setEditData({ ...editData, address: v })} />
              <EditField label="State" value={editData.state} onChange={(v) => setEditData({ ...editData, state: v })} />
              <EditField label="Primary Color" value={editData.primaryColor} onChange={(v) => setEditData({ ...editData, primaryColor: v })} type="color" />
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-400">Subscription Plan: {tenant.subscriptionPlan || 'free'} (managed via Licenses)</p>
                <p className="text-xs text-gray-400">Database Name: {stats?.tenant?.databaseName || '-'} (immutable)</p>
                <p className="text-xs text-gray-400">Database Type: {tenant.databaseType || 'SHARED'} (immutable)</p>
              </div>
            </div>
          ) : (
            <dl className="space-y-3">
              <InfoRow label="Tenant URL" icon={<LinkIcon className="h-3.5 w-3.5" />}>
                {tenant.tenantUrl ? (
                  <a href={tenant.tenantUrl} target="_blank" rel="noopener noreferrer"
                     className="text-blue-600 hover:underline text-sm">
                    {tenant.tenantUrl}
                  </a>
                ) : <span className="text-gray-400">-</span>}
              </InfoRow>
              {tenant.displayName && <InfoRow label="Display Name">{tenant.displayName}</InfoRow>}
              {tenant.organizationName && <InfoRow label="Organization">{tenant.organizationName}</InfoRow>}
              {tenant.contactEmail && <InfoRow label="Contact Email">{tenant.contactEmail}</InfoRow>}
              {tenant.contactPhone && <InfoRow label="Contact Phone">{tenant.contactPhone}</InfoRow>}
              {tenant.address && <InfoRow label="Address">{tenant.address}</InfoRow>}
              {tenant.state && <InfoRow label="State">{tenant.state}</InfoRow>}
              <InfoRow label="Database Type">{tenant.databaseType || 'SHARED'}</InfoRow>
              <InfoRow label="Database Status">
                <span className={stats?.tenant?.databaseStatus === 'READY' ? 'text-green-600' : 'text-yellow-600'}>
                  {stats?.tenant?.databaseStatus || 'Unknown'}
                </span>
              </InfoRow>
              <InfoRow label="Database Name">{stats?.tenant?.databaseName || '-'}</InfoRow>
              <InfoRow label="Subscription Plan"><span className="capitalize">{tenant.subscriptionPlan || 'free'}</span></InfoRow>
              <InfoRow label="Created">{formatDateTime(tenant.createdAt)}</InfoRow>
            </dl>
          )}
        </div>

        {/* Admin Access */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldIcon className="h-5 w-5 text-orange-500" />
            Admin Access
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Admin Mobile</dt>
              <dd className="font-medium">{adminInfo?.mobile || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Admin Email</dt>
              <dd className="font-medium">{adminInfo?.email || '-'}</dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetPasswordMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <KeyIcon className="h-4 w-4" />
              {resetPasswordMutation.isPending ? 'Generating...' : 'Generate Temp Password'}
            </button>
          </div>
        </div>
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

      {/* Reset Password Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Generate Temporary Password</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                This will generate a new temporary password for the tenant administrator.
                Their current password will be invalidated and all active sessions will be terminated.
              </p>
              <p className="text-sm text-gray-600">
                The admin will be required to change this password on their next login.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Legal Notice:</strong> Using this password to access the tenant's data without
                  authorization may constitute an offense under Section 72A of the IT Act, 2000.
                  This action is audit-logged.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resetPasswordMutation.mutate()}
                disabled={resetPasswordMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {resetPasswordMutation.isPending ? 'Generating...' : 'Confirm & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temp Password Display Modal */}
      {showPasswordModal && tempPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Temporary Password</h3>
              <button onClick={handleClosePasswordModal} className="p-1 hover:bg-gray-100 rounded">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-gray-50 border rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono font-bold text-gray-900 break-all">{tempPassword}</code>
                <button
                  onClick={handleCopyPassword}
                  className="ml-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                  title="Copy to clipboard"
                >
                  <CopyIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
              <p className="text-sm text-orange-800">
                <strong>This password will only be shown once.</strong> Copy it now and share it securely
                with the tenant administrator. They will be forced to change it on their next login.
              </p>
            </div>
            <button
              onClick={handleClosePasswordModal}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500 flex items-center gap-1">{icon}{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function EditField({ label, value, onChange, hint, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
