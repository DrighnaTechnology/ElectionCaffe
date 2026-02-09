import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ecIntegrationAPI, tenantsAPI } from '../services/api';
import { formatDateTime } from '../lib/utils';
import { toast } from 'sonner';
import {
  DatabaseIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  SettingsIcon,
  XIcon,
  LinkIcon,
  ClockIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react';

type IntegrationStatus = 'CONFIGURED' | 'TESTING' | 'ACTIVE' | 'SUSPENDED' | 'ERROR';

const statusConfig: Record<IntegrationStatus, { label: string; color: string; icon: any }> = {
  CONFIGURED: { label: 'Configured', color: 'bg-blue-100 text-blue-800', icon: SettingsIcon },
  TESTING: { label: 'Testing', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCwIcon },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-100 text-red-800', icon: PauseIcon },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
};

export function ECIntegrationPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Fetch all integrations
  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ['ec-integrations', page, selectedStatus],
    queryFn: () => ecIntegrationAPI.getAll({
      page,
      limit: 20,
      status: selectedStatus || undefined,
    }),
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: (tenantId: string) => ecIntegrationAPI.test(tenantId),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Connection test successful');
      queryClient.invalidateQueries({ queryKey: ['ec-integrations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Connection test failed');
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: (tenantId: string) => ecIntegrationAPI.activate(tenantId),
    onSuccess: () => {
      toast.success('Integration activated');
      queryClient.invalidateQueries({ queryKey: ['ec-integrations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to activate');
    },
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: (tenantId: string) => ecIntegrationAPI.suspend(tenantId),
    onSuccess: () => {
      toast.success('Integration suspended');
      queryClient.invalidateQueries({ queryKey: ['ec-integrations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to suspend');
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: (tenantId: string) => ecIntegrationAPI.sync(tenantId, 'full'),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Sync started');
      queryClient.invalidateQueries({ queryKey: ['ec-integrations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start sync');
    },
  });

  const integrations = integrationsData?.data?.data || [];
  const pagination = integrationsData?.data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EC Integration</h1>
          <p className="text-gray-500">Manage Election Commission API integrations for tenants</p>
        </div>
        <button
          onClick={() => {
            setSelectedTenantId(null);
            setShowConfigModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <LinkIcon className="h-5 w-5" />
          Configure Integration
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <DatabaseIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{integrations.length}</p>
              <p className="text-xs text-gray-500">Total Integrations</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <WifiIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {integrations.filter((i: any) => i.status === 'ACTIVE').length}
              </p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
              <ClockIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {integrations.filter((i: any) => i.syncStatus === 'SYNCING').length}
              </p>
              <p className="text-xs text-gray-500">Syncing</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <WifiOffIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {integrations.filter((i: any) => i.status === 'ERROR' || i.status === 'SUSPENDED').length}
              </p>
              <p className="text-xs text-gray-500">Issues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="CONFIGURED">Configured</option>
          <option value="TESTING">Testing</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      {/* Integrations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-12">
            <DatabaseIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No EC integrations configured</p>
            <button
              onClick={() => setShowConfigModal(true)}
              className="mt-4 text-orange-500 hover:text-orange-600"
            >
              Configure your first integration
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State/Constituency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sync Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {integrations.map((integration: any) => {
                const status = statusConfig[integration.status as IntegrationStatus] || statusConfig.CONFIGURED;
                const StatusIcon = status.icon;

                return (
                  <tr key={integration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{integration.tenantName}</div>
                        <div className="text-sm text-gray-500">{integration.tenantId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded w-fit ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div>{integration.stateCode || '-'}</div>
                        <div className="text-gray-500">{integration.constituencyCode || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        integration.syncStatus === 'SYNCING' ? 'bg-blue-100 text-blue-800' :
                        integration.syncStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        integration.syncStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {integration.syncStatus || 'IDLE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {integration.lastSyncAt ? formatDateTime(integration.lastSyncAt) : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => testMutation.mutate(integration.tenantId)}
                          disabled={testMutation.isPending}
                          className="p-1 text-blue-500 hover:text-blue-700"
                          title="Test Connection"
                        >
                          <WifiIcon className="h-4 w-4" />
                        </button>
                        {integration.status === 'ACTIVE' ? (
                          <>
                            <button
                              onClick={() => syncMutation.mutate(integration.tenantId)}
                              disabled={syncMutation.isPending || integration.syncStatus === 'SYNCING'}
                              className="p-1 text-green-500 hover:text-green-700 disabled:opacity-50"
                              title="Sync Now"
                            >
                              <RefreshCwIcon className={`h-4 w-4 ${integration.syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => suspendMutation.mutate(integration.tenantId)}
                              disabled={suspendMutation.isPending}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Suspend"
                            >
                              <PauseIcon className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => activateMutation.mutate(integration.tenantId)}
                            disabled={activateMutation.isPending}
                            className="p-1 text-green-500 hover:text-green-700"
                            title="Activate"
                          >
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTenantId(integration.tenantId);
                            setShowConfigModal(true);
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title="Configure"
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Configure Modal */}
      {showConfigModal && (
        <ConfigureIntegrationModal
          tenantId={selectedTenantId}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedTenantId(null);
          }}
        />
      )}
    </div>
  );
}

function ConfigureIntegrationModal({
  tenantId,
  onClose,
}: {
  tenantId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState(tenantId || '');
  const [formData, setFormData] = useState({
    apiEndpoint: '',
    apiKey: '',
    apiSecret: '',
    stateCode: '',
    constituencyCode: '',
    autoSyncEnabled: false,
    syncIntervalHours: 24,
  });

  // Fetch tenants
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-for-ec'],
    queryFn: () => tenantsAPI.getAll({ limit: 100 }),
  });

  // Fetch existing integration if editing
  const { data: existingData } = useQuery({
    queryKey: ['ec-integration', selectedTenant],
    queryFn: () => ecIntegrationAPI.getByTenant(selectedTenant),
    enabled: !!selectedTenant,
  });

  // Update form when existing data loads
  useState(() => {
    if (existingData?.data?.data) {
      const data = existingData.data.data;
      setFormData({
        apiEndpoint: data.apiEndpoint || '',
        apiKey: '',
        apiSecret: '',
        stateCode: data.stateCode || '',
        constituencyCode: data.constituencyCode || '',
        autoSyncEnabled: data.autoSyncEnabled || false,
        syncIntervalHours: data.syncIntervalHours || 24,
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: () => ecIntegrationAPI.upsert(selectedTenant, formData),
    onSuccess: () => {
      toast.success('Integration configured successfully');
      queryClient.invalidateQueries({ queryKey: ['ec-integrations'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save configuration');
    },
  });

  const tenants = tenantsData?.data?.data || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) {
      toast.error('Please select a tenant');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Configure EC Integration</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              disabled={!!tenantId}
            >
              <option value="">Select tenant</option>
              {tenants.map((tenant: any) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Endpoint
            </label>
            <input
              type="url"
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="https://eci.gov.in/api/v1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Secret
              </label>
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter API secret"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State Code
              </label>
              <input
                type="text"
                value={formData.stateCode}
                onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., S01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Constituency Code
              </label>
              <input
                type="text"
                value={formData.constituencyCode}
                onChange={(e) => setFormData({ ...formData, constituencyCode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., 123"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoSyncEnabled}
                onChange={(e) => setFormData({ ...formData, autoSyncEnabled: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm">Enable Auto Sync</span>
            </label>
            {formData.autoSyncEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Every</span>
                <input
                  type="number"
                  value={formData.syncIntervalHours}
                  onChange={(e) => setFormData({ ...formData, syncIntervalHours: parseInt(e.target.value) || 24 })}
                  className="w-16 px-2 py-1 border rounded text-sm"
                  min={1}
                />
                <span className="text-sm text-gray-500">hours</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
