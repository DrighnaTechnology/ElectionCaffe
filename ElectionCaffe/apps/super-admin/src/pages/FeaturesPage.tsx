import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuresAPI, tenantsAPI } from '../services/api';
import { toast } from 'sonner';
import {
  PlusIcon,
  ToggleLeftIcon,
  TrashIcon,
  CheckCircleIcon,
  BuildingIcon,
} from 'lucide-react';

export function FeaturesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tenantSelectModal, setTenantSelectModal] = useState<{
    open: boolean;
    featureId: string;
    featureName: string;
    action: 'enable' | 'disable';
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: featuresData, isLoading } = useQuery({
    queryKey: ['features', selectedCategory],
    queryFn: () => featuresAPI.getAll(selectedCategory || undefined),
  });

  const enableAllMutation = useMutation({
    mutationFn: (id: string) => featuresAPI.enableAll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature enabled for all tenants');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to enable feature');
    },
  });

  const disableAllMutation = useMutation({
    mutationFn: (id: string) => featuresAPI.disableAll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature disabled for all tenants');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to disable feature');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => featuresAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete feature');
    },
  });

  const features = featuresData?.data?.data || [];
  const categories = featuresData?.data?.categories || [];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      core: 'bg-blue-100 text-blue-800',
      cadre: 'bg-green-100 text-green-800',
      poll_day: 'bg-purple-100 text-purple-800',
      analytics: 'bg-orange-100 text-orange-800',
      reports: 'bg-pink-100 text-pink-800',
      ai: 'bg-indigo-100 text-indigo-800',
      communication: 'bg-cyan-100 text-cyan-800',
      engagement: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800',
      data: 'bg-teal-100 text-teal-800',
      integration: 'bg-emerald-100 text-emerald-800',
      security: 'bg-slate-100 text-slate-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-500">Manage features available to tenants</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Feature
        </button>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === ''
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((category: string) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-orange-500 text-white'
                  : getCategoryColor(category)
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Features List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading features...</p>
          </div>
        ) : features.length === 0 ? (
          <div className="p-8 text-center">
            <ToggleLeftIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No features found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Global</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenants</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {features.map((feature: any) => (
                <tr key={feature.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{feature.featureName}</p>
                      <p className="text-sm text-gray-500">{feature.featureKey}</p>
                      {feature.description && (
                        <p className="text-xs text-gray-400 mt-1">{feature.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(feature.category)}`}>
                      {feature.category || 'uncategorized'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {feature.isGlobal ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {feature.defaultEnabled ? (
                      <span className="text-green-600">Enabled</span>
                    ) : (
                      <span className="text-gray-400">Disabled</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-gray-600">
                      <BuildingIcon className="h-4 w-4" />
                      {feature._count?.tenantFeatures || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Toggle Active/Inactive Button */}
                      <button
                        onClick={() => {
                          setTenantSelectModal({
                            open: true,
                            featureId: feature.id,
                            featureName: feature.featureName,
                            action: feature.defaultEnabled ? 'disable' : 'enable',
                          });
                        }}
                        disabled={enableAllMutation.isPending || disableAllMutation.isPending}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          feature.defaultEnabled
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                        title={feature.defaultEnabled ? 'Click to disable for tenants' : 'Click to enable for tenants'}
                      >
                        {feature.defaultEnabled ? 'Active' : 'Inactive'}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => {
                          if (confirm('Delete this feature?')) {
                            deleteMutation.mutate(feature.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete feature"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <CreateFeatureModal onClose={() => setCreateModalOpen(false)} />
      )}

      {/* Tenant Select Modal */}
      {tenantSelectModal && (
        <TenantSelectModal
          featureId={tenantSelectModal.featureId}
          featureName={tenantSelectModal.featureName}
          action={tenantSelectModal.action}
          onClose={() => setTenantSelectModal(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['features'] });
            setTenantSelectModal(null);
          }}
        />
      )}
    </div>
  );
}

function CreateFeatureModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    featureKey: '',
    featureName: '',
    description: '',
    category: '',
    isGlobal: true,
    defaultEnabled: true,
  });

  const createMutation = useMutation({
    mutationFn: () => featuresAPI.create(formData),
    onSuccess: () => {
      toast.success('Feature created');
      queryClient.invalidateQueries({ queryKey: ['features'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create feature');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create Feature Flag</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feature Key *</label>
            <input
              type="text"
              value={formData.featureKey}
              onChange={(e) => setFormData({ ...formData, featureKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="feature_key"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feature Name *</label>
            <input
              type="text"
              value={formData.featureName}
              onChange={(e) => setFormData({ ...formData, featureName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select category</option>
              <option value="core">Core</option>
              <option value="cadre">Cadre</option>
              <option value="poll_day">Poll Day</option>
              <option value="analytics">Analytics</option>
              <option value="reports">Reports</option>
              <option value="ai">AI</option>
              <option value="communication">Communication</option>
              <option value="engagement">Engagement</option>
              <option value="advanced">Advanced</option>
              <option value="data">Data</option>
              <option value="integration">Integration</option>
              <option value="security">Security</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isGlobal}
                onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Global (applies to all)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.defaultEnabled}
                onChange={(e) => setFormData({ ...formData, defaultEnabled: e.target.checked })}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Enabled by default</span>
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TenantSelectModal({
  featureId,
  featureName,
  action,
  onClose,
  onSuccess,
}: {
  featureId: string;
  featureName: string;
  action: 'enable' | 'disable';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants-for-feature'],
    queryFn: () => tenantsAPI.getAll({ isActive: true, limit: 1000 }),
  });

  const enableMutation = useMutation({
    mutationFn: (tenantIds: string[]) =>
      featuresAPI.enableForTenants(featureId, tenantIds),
    onSuccess: () => {
      toast.success(`Feature ${action === 'enable' ? 'enabled' : 'disabled'} for selected tenants`);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || `Failed to ${action} feature`);
    },
  });

  const disableMutation = useMutation({
    mutationFn: (tenantIds: string[]) =>
      featuresAPI.disableForTenants(featureId, tenantIds),
    onSuccess: () => {
      toast.success(`Feature disabled for selected tenants`);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to disable feature');
    },
  });

  const tenants = tenantsData?.data?.data || [];

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(tenants.map((t: any) => t.id));
    }
    setSelectAll(!selectAll);
  };

  const handleToggleTenant = (tenantId: string) => {
    setSelectedTenants((prev) =>
      prev.includes(tenantId)
        ? prev.filter((id) => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const handleSubmit = () => {
    if (selectedTenants.length === 0) {
      toast.error('Please select at least one tenant');
      return;
    }

    if (action === 'enable') {
      enableMutation.mutate(selectedTenants);
    } else {
      disableMutation.mutate(selectedTenants);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {action === 'enable' ? 'Enable' : 'Disable'} Feature: {featureName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Select the tenants to {action} this feature for
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {tenantsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No active tenants found</p>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md border-2 border-orange-500 bg-orange-50">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Select All Tenants</p>
                  <p className="text-sm text-gray-500">
                    {tenants.length} active tenant{tenants.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                {tenants.map((tenant: any) => (
                  <label
                    key={tenant.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-md border cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTenants.includes(tenant.id)}
                      onChange={() => handleToggleTenant(tenant.id)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.slug}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {selectedTenants.length} tenant{selectedTenants.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={enableMutation.isPending || disableMutation.isPending || selectedTenants.length === 0}
                className={`px-4 py-2 rounded-md text-white disabled:opacity-50 ${
                  action === 'enable'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {enableMutation.isPending || disableMutation.isPending
                  ? `${action === 'enable' ? 'Enabling' : 'Disabling'}...`
                  : `${action === 'enable' ? 'Enable' : 'Disable'} Feature`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
