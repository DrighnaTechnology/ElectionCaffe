import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiFeaturesAPI, aiProvidersAPI, tenantsAPI } from '../services/api';
import { toast } from 'sonner';
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  PlayIcon,
  PauseIcon,
  SparklesIcon,
  BuildingIcon,
  CoinsIcon,
  SendIcon,
} from 'lucide-react';

interface AIFeature {
  id: string;
  featureKey: string;
  displayName: string;
  description?: string;
  category?: string;
  providerId: string;
  provider?: {
    providerName: string;
    displayName: string;
    providerType: string;
  };
  systemPrompt?: string;
  userPromptTemplate?: string;
  outputFormat?: string;
  // Pricing
  creditsPerPage: number;
  creditsPerImage: number;
  creditsPerRequest: number;
  minCreditsRequired: number;
  // Input config
  acceptedFileTypes: string[];
  maxFileSize: number;
  maxPagesPerRequest: number;
  status: 'DRAFT' | 'TESTING' | 'PUBLISHED' | 'DEPRECATED' | 'ARCHIVED';
  createdAt: string;
  _count?: {
    subscriptions: number;
    usageLogs: number;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  TESTING: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  DEPRECATED: 'bg-red-100 text-red-800',
  ARCHIVED: 'bg-slate-100 text-slate-800',
};

const categoryColors: Record<string, string> = {
  OCR: 'bg-blue-100 text-blue-800',
  DOCUMENT_PROCESSING: 'bg-purple-100 text-purple-800',
  DATA_TRANSFORMATION: 'bg-pink-100 text-pink-800',
  ANALYTICS: 'bg-cyan-100 text-cyan-800',
  TRANSLATION: 'bg-teal-100 text-teal-800',
  SUMMARIZATION: 'bg-indigo-100 text-indigo-800',
  CUSTOM: 'bg-orange-100 text-orange-800',
};

export function AIFeaturesPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editFeature, setEditFeature] = useState<AIFeature | null>(null);
  const [assignModalFeature, setAssignModalFeature] = useState<AIFeature | null>(null);
  const [testModalFeature, setTestModalFeature] = useState<AIFeature | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: featuresData, isLoading } = useQuery({
    queryKey: ['ai-features', selectedCategory],
    queryFn: () => aiFeaturesAPI.getAll(selectedCategory ? { category: selectedCategory } : {}),
  });

  const { data: providersData } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => aiProvidersAPI.getAll({ isActive: true }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiFeaturesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-features'] });
      toast.success('Feature deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete feature');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => aiFeaturesAPI.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-features'] });
      toast.success('Feature published');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to publish feature');
    },
  });

  const deprecateMutation = useMutation({
    mutationFn: (id: string) => aiFeaturesAPI.deprecate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-features'] });
      toast.success('Feature deprecated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to deprecate feature');
    },
  });

  const features: AIFeature[] = featuresData?.data?.data || [];
  const providers = providersData?.data?.data || [];
  const categories = [...new Set(features.map(f => f.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Features</h1>
          <p className="text-gray-500">Configure and manage AI-powered features</p>
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
      {categories.length > 0 && (
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
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category || '')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-orange-500 text-white'
                    : categoryColors[category || ''] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Features Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading features...</p>
          </div>
        ) : features.length === 0 ? (
          <div className="p-8 text-center">
            <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No AI features configured</p>
            <p className="text-sm text-gray-400 mt-1">Create a feature to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenants</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {features.map((feature) => (
                <tr key={feature.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{feature.displayName}</p>
                      <p className="text-sm text-gray-500">{feature.featureKey}</p>
                      {feature.category && (
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${categoryColors[feature.category] || 'bg-gray-100 text-gray-600'}`}>
                          {feature.category}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {feature.provider?.displayName || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-sm">
                      <CoinsIcon className="h-4 w-4 text-yellow-500" />
                      {feature.creditsPerPage}/pg
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[feature.status]}`}>
                      {feature.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-gray-600">
                      <BuildingIcon className="h-4 w-4" />
                      {feature._count?.subscriptions || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {feature._count?.usageLogs || 0} uses
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {feature.status === 'DRAFT' && (
                        <button
                          onClick={() => publishMutation.mutate(feature.id)}
                          disabled={publishMutation.isPending}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Publish"
                        >
                          <PlayIcon className="h-5 w-5" />
                        </button>
                      )}
                      {feature.status === 'PUBLISHED' && (
                        <>
                          <button
                            onClick={() => setAssignModalFeature(feature)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Assign to Tenants"
                          >
                            <BuildingIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => deprecateMutation.mutate(feature.id)}
                            disabled={deprecateMutation.isPending}
                            className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                            title="Deprecate"
                          >
                            <PauseIcon className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setTestModalFeature(feature)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                        title="Test"
                      >
                        <SendIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditFeature(feature)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <EditIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this feature?')) {
                            deleteMutation.mutate(feature.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
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

      {/* Create/Edit Modal */}
      {(createModalOpen || editFeature) && (
        <FeatureModal
          feature={editFeature}
          providers={providers}
          onClose={() => {
            setCreateModalOpen(false);
            setEditFeature(null);
          }}
        />
      )}

      {/* Assign Modal */}
      {assignModalFeature && (
        <AssignModal
          feature={assignModalFeature}
          onClose={() => setAssignModalFeature(null)}
        />
      )}

      {/* Test Modal */}
      {testModalFeature && (
        <TestModal
          feature={testModalFeature}
          onClose={() => setTestModalFeature(null)}
        />
      )}
    </div>
  );
}

function FeatureModal({ feature, providers, onClose }: { feature: AIFeature | null; providers: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    featureKey: feature?.featureKey || '',
    displayName: feature?.displayName || '',
    description: feature?.description || '',
    category: feature?.category || 'OCR',
    providerId: feature?.providerId || '',
    systemPrompt: feature?.systemPrompt || '',
    userPromptTemplate: feature?.userPromptTemplate || '',
    outputFormat: feature?.outputFormat || 'text',
    // Pricing
    creditsPerPage: feature?.creditsPerPage || 1,
    creditsPerImage: feature?.creditsPerImage || 1,
    creditsPerRequest: feature?.creditsPerRequest || 0,
    minCreditsRequired: feature?.minCreditsRequired || 1,
    // Input config
    maxFileSize: feature?.maxFileSize || 10,
    maxPagesPerRequest: feature?.maxPagesPerRequest || 50,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => feature ? aiFeaturesAPI.update(feature.id, data) : aiFeaturesAPI.create(data),
    onSuccess: () => {
      toast.success(feature ? 'Feature updated' : 'Feature created');
      queryClient.invalidateQueries({ queryKey: ['ai-features'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save feature');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {feature ? 'Edit AI Feature' : 'Create AI Feature'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., PDF to Excel OCR"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feature Key (Unique) *</label>
              <input
                type="text"
                value={formData.featureKey}
                onChange={(e) => setFormData({ ...formData, featureKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="pdf_to_excel_ocr"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={2}
              placeholder="Describe what this feature does..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider *</label>
              <select
                value={formData.providerId}
                onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Select provider...</option>
                {providers.map((provider: any) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.displayName || provider.providerName} ({provider.providerType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="OCR">OCR</option>
                <option value="DOCUMENT_PROCESSING">Document Processing</option>
                <option value="DATA_TRANSFORMATION">Data Transformation</option>
                <option value="ANALYTICS">Analytics</option>
                <option value="TRANSLATION">Translation</option>
                <option value="SUMMARIZATION">Summarization</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              rows={4}
              placeholder="You are an expert at extracting data from PDF documents..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Prompt Template</label>
            <textarea
              value={formData.userPromptTemplate}
              onChange={(e) => setFormData({ ...formData, userPromptTemplate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              rows={3}
              placeholder="Extract the following data from this document: {{input}}"
            />
            <p className="text-xs text-gray-500 mt-1">Use {"{{input}}"} for user input placeholder</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
              <select
                value={formData.outputFormat}
                onChange={(e) => setFormData({ ...formData, outputFormat: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="text">Plain Text</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                value={formData.maxFileSize}
                onChange={(e) => setFormData({ ...formData, maxFileSize: parseInt(e.target.value) || 10 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                min={1}
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Credits Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credits per Page</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.creditsPerPage}
                  onChange={(e) => setFormData({ ...formData, creditsPerPage: parseFloat(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credits per Image</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.creditsPerImage}
                  onChange={(e) => setFormData({ ...formData, creditsPerImage: parseFloat(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credits per Request</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.creditsPerRequest}
                  onChange={(e) => setFormData({ ...formData, creditsPerRequest: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Credits Required</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.minCreditsRequired}
                  onChange={(e) => setFormData({ ...formData, minCreditsRequired: parseFloat(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min={0}
                />
              </div>
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
              {createMutation.isPending ? 'Saving...' : feature ? 'Update Feature' : 'Create Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignModal({ feature, onClose }: { feature: AIFeature; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState('');

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants-for-assign'],
    queryFn: () => tenantsAPI.getAll({ limit: 100 }),
  });

  const assignMutation = useMutation({
    mutationFn: (tenantId: string) => aiFeaturesAPI.assignToTenant(feature.id, tenantId),
    onSuccess: () => {
      toast.success('Feature assigned to tenant');
      queryClient.invalidateQueries({ queryKey: ['ai-features'] });
      setSelectedTenant('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to assign feature');
    },
  });

  const tenants = tenantsData?.data?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Assign to Tenant</h2>
          <p className="text-sm text-gray-500 mt-1">Assign "{feature.displayName}" to a tenant</p>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Tenant</label>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Choose a tenant...</option>
                  {tenants.map((tenant: any) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => selectedTenant && assignMutation.mutate(selectedTenant)}
                  disabled={!selectedTenant || assignMutation.isPending}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TestModal({ feature, onClose }: { feature: AIFeature; onClose: () => void }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);

  const testMutation = useMutation({
    mutationFn: () => aiFeaturesAPI.test(feature.id, { testInput: input }),
    onSuccess: (response) => {
      setResult(response.data?.data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Test failed');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Test Feature</h2>
          <p className="text-sm text-gray-500 mt-1">Test "{feature.displayName}"</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Input</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={4}
              placeholder="Enter test input..."
            />
          </div>

          <button
            onClick={() => testMutation.mutate()}
            disabled={!input || testMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
          >
            {testMutation.isPending ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : (
              <>
                <SendIcon className="h-4 w-4" />
                Run Test
              </>
            )}
          </button>

          {result && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
              <div className="bg-gray-50 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
                {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
