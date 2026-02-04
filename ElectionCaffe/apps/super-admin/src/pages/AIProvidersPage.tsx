import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiProvidersAPI } from '../services/api';
import { toast } from 'sonner';
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  ServerIcon,
  EyeIcon,
  EyeOffIcon,
  BrainIcon,
} from 'lucide-react';

type ProviderType = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'XAI' | 'CUSTOM';

interface AIProvider {
  id: string;
  providerName: string;
  displayName: string;
  providerType: ProviderType;
  apiKey?: string;
  apiEndpoint?: string;
  defaultModel?: string;
  maxTokensPerRequest?: number;
  status: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  _count?: {
    features: number;
  };
}

const providerTypeLabels: Record<ProviderType, string> = {
  OPENAI: 'OpenAI',
  ANTHROPIC: 'Anthropic (Claude)',
  GOOGLE: 'Google (Gemini)',
  XAI: 'xAI (Grok)',
  CUSTOM: 'Custom API',
};

const providerTypeColors: Record<ProviderType, string> = {
  OPENAI: 'bg-green-100 text-green-800',
  ANTHROPIC: 'bg-orange-100 text-orange-800',
  GOOGLE: 'bg-blue-100 text-blue-800',
  XAI: 'bg-purple-100 text-purple-800',
  CUSTOM: 'bg-gray-100 text-gray-800',
};

const defaultModels: Record<ProviderType, string> = {
  OPENAI: 'gpt-4o',
  ANTHROPIC: 'claude-sonnet-4-20250514',
  GOOGLE: 'gemini-1.5-pro',
  XAI: 'grok-2',
  CUSTOM: '',
};

export function AIProvidersPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<AIProvider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: providersData, isLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => aiProvidersAPI.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiProvidersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      toast.success('Provider deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete provider');
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => aiProvidersAPI.test(id),
    onSuccess: (response) => {
      const result = response.data?.data;
      if (result?.testPassed) {
        toast.success(`Connection successful! (${result.latencyMs}ms)`);
      } else {
        // Show the actual error message from OpenAI/provider
        toast.error(result?.message || 'Connection failed');
      }
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      setTestingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Connection test failed');
      setTestingId(null);
    },
  });

  const handleTest = (id: string) => {
    setTestingId(id);
    testMutation.mutate(id);
  };

  const providers: AIProvider[] = providersData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Providers</h1>
          <p className="text-gray-500">Configure AI provider connections for AI features</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Provider
        </button>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-8 text-center bg-white rounded-lg shadow">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading providers...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-lg shadow">
            <ServerIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No AI providers configured</p>
            <p className="text-sm text-gray-400 mt-1">Add a provider to start using AI features</p>
          </div>
        ) : (
          providers.map((provider) => (
            <div key={provider.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{provider.displayName}</h3>
                  <p className="text-xs text-gray-500">{provider.providerName}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${providerTypeColors[provider.providerType]}`}>
                    {providerTypeLabels[provider.providerType]}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${provider.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : provider.status === 'TESTING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {provider.status}
                  </div>
                  {provider.isDefault && (
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Default</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {provider.defaultModel && (
                  <div className="flex items-center gap-2">
                    <BrainIcon className="h-4 w-4 text-gray-400" />
                    <span>{provider.defaultModel}</span>
                  </div>
                )}
                {provider.maxTokensPerRequest && (
                  <div>Max Tokens: {provider.maxTokensPerRequest.toLocaleString()}</div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Features:</span>
                  <span className="font-medium">{provider._count?.features || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <button
                  onClick={() => handleTest(provider.id)}
                  disabled={testingId === provider.id}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
                >
                  {testingId === provider.id ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4" />
                      Test
                    </>
                  )}
                </button>
                <button
                  onClick={() => setEditProvider(provider)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this provider?')) {
                      deleteMutation.mutate(provider.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(createModalOpen || editProvider) && (
        <ProviderModal
          provider={editProvider}
          onClose={() => {
            setCreateModalOpen(false);
            setEditProvider(null);
          }}
        />
      )}
    </div>
  );
}

function ProviderModal({ provider, onClose }: { provider: AIProvider | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    providerName: provider?.providerName || '',
    displayName: provider?.displayName || '',
    providerType: provider?.providerType || 'OPENAI' as ProviderType,
    apiKey: provider?.apiKey || '',
    apiEndpoint: provider?.apiEndpoint || '',
    defaultModel: provider?.defaultModel || defaultModels['OPENAI'],
    maxTokensPerRequest: provider?.maxTokensPerRequest || 4096,
    isDefault: provider?.isDefault ?? false,
    isActive: provider?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => provider ? aiProvidersAPI.update(provider.id, data) : aiProvidersAPI.create(data),
    onSuccess: () => {
      toast.success(provider ? 'Provider updated' : 'Provider created');
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save provider');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up form data - remove empty strings that would fail URL validation
    const submitData: any = {
      ...formData,
    };
    // Only include apiEndpoint if it has a value (for CUSTOM providers)
    if (!submitData.apiEndpoint) {
      delete submitData.apiEndpoint;
    }
    // Only include defaultModel if it has a value
    if (!submitData.defaultModel) {
      delete submitData.defaultModel;
    }
    createMutation.mutate(submitData);
  };

  const handleProviderTypeChange = (type: ProviderType) => {
    setFormData({
      ...formData,
      providerType: type,
      defaultModel: defaultModels[type] || formData.defaultModel,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {provider ? 'Edit AI Provider' : 'Add AI Provider'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name (Unique ID) *</label>
            <input
              type="text"
              value={formData.providerName}
              onChange={(e) => setFormData({ ...formData, providerName: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., openai-production"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, no spaces)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., OpenAI Production"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type *</label>
            <select
              value={formData.providerType}
              onChange={(e) => handleProviderTypeChange(e.target.value as ProviderType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {Object.entries(providerTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key *</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="sk-..."
                required={!provider}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {provider && <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing key</p>}
          </div>

          {formData.providerType === 'CUSTOM' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint *</label>
              <input
                type="url"
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://api.example.com/v1/chat"
                required={formData.providerType === 'CUSTOM'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Model</label>
            <input
              type="text"
              value={formData.defaultModel}
              onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., gpt-4o"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.providerType === 'OPENAI' && 'e.g., gpt-4o, gpt-4-turbo, gpt-3.5-turbo'}
              {formData.providerType === 'ANTHROPIC' && 'e.g., claude-sonnet-4-20250514, claude-3-5-sonnet-20241022'}
              {formData.providerType === 'GOOGLE' && 'e.g., gemini-1.5-pro, gemini-1.5-flash'}
              {formData.providerType === 'XAI' && 'e.g., grok-2, grok-2-vision'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens Per Request</label>
            <input
              type="number"
              value={formData.maxTokensPerRequest}
              onChange={(e) => setFormData({ ...formData, maxTokensPerRequest: parseInt(e.target.value) || 4096 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              min={100}
              max={1000000}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as Default Provider</label>
            </div>
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
              {createMutation.isPending ? 'Saving...' : provider ? 'Update Provider' : 'Create Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
