import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiCreditsAPI, tenantsAPI } from '../services/api';
import { toast } from 'sonner';
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  CoinsIcon,
  PackageIcon,
  AlertTriangleIcon,
  CheckIcon,
  BuildingIcon,
  ArrowUpIcon,
  BellIcon,
} from 'lucide-react';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  description?: string;
  isActive: boolean;
}

interface Alert {
  id: string;
  tenantId: string;
  tenant?: {
    name: string;
  };
  alertType: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
}

export function AICreditsPage() {
  const [activeTab, setActiveTab] = useState<'packages' | 'credits' | 'alerts'>('packages');
  const [createPackageOpen, setCreatePackageOpen] = useState(false);
  const [editPackage, setEditPackage] = useState<CreditPackage | null>(null);
  const [addCreditsOpen, setAddCreditsOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Credits</h1>
          <p className="text-gray-500">Manage credit packages and tenant credits</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('packages')}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'packages'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <PackageIcon className="h-4 w-4" />
              Credit Packages
            </span>
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'credits'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <CoinsIcon className="h-4 w-4" />
              Tenant Credits
            </span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'alerts'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <BellIcon className="h-4 w-4" />
              Alerts
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'packages' && (
        <CreditPackagesTab
          onCreateOpen={() => setCreatePackageOpen(true)}
          onEdit={setEditPackage}
        />
      )}
      {activeTab === 'credits' && (
        <TenantCreditsTab onAddCredits={() => setAddCreditsOpen(true)} />
      )}
      {activeTab === 'alerts' && <AlertsTab />}

      {/* Create/Edit Package Modal */}
      {(createPackageOpen || editPackage) && (
        <PackageModal
          pkg={editPackage}
          onClose={() => {
            setCreatePackageOpen(false);
            setEditPackage(null);
          }}
        />
      )}

      {/* Add Credits Modal */}
      {addCreditsOpen && (
        <AddCreditsModal onClose={() => setAddCreditsOpen(false)} />
      )}
    </div>
  );
}

function CreditPackagesTab({ onCreateOpen, onEdit }: { onCreateOpen: () => void; onEdit: (pkg: CreditPackage) => void }) {
  const queryClient = useQueryClient();

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['credit-packages'],
    queryFn: () => aiCreditsAPI.getPackages(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiCreditsAPI.deletePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-packages'] });
      toast.success('Package deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete package');
    },
  });

  const packages: CreditPackage[] = packagesData?.data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onCreateOpen}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Package
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-8 text-center bg-white rounded-lg shadow">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading packages...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-lg shadow">
            <PackageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No credit packages configured</p>
          </div>
        ) : (
          packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                  {pkg.description && (
                    <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                  )}
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {pkg.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Credits:</span>
                  <span className="flex items-center gap-1 font-semibold text-yellow-600">
                    <CoinsIcon className="h-4 w-4" />
                    {pkg.credits.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Price:</span>
                  <span className="font-semibold text-green-600">
                    {pkg.currency} {pkg.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Per Credit:</span>
                  <span className="text-gray-700">
                    {pkg.currency} {(pkg.price / pkg.credits).toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <button
                  onClick={() => onEdit(pkg)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                >
                  <EditIcon className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this package?')) {
                      deleteMutation.mutate(pkg.id);
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
    </div>
  );
}

function TenantCreditsTab({ onAddCredits }: { onAddCredits: () => void }) {
  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants-with-credits'],
    queryFn: () => tenantsAPI.getAll({ limit: 100 }),
  });

  const tenants = tenantsData?.data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onAddCredits}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Credits
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading tenants...</p>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center">
            <BuildingIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tenants found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map((tenant: any) => (
                <TenantCreditsRow key={tenant.id} tenant={tenant} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TenantCreditsRow({ tenant }: { tenant: any }) {
  const { data: creditsData } = useQuery({
    queryKey: ['tenant-credits', tenant.id],
    queryFn: () => aiCreditsAPI.getTenantCredits(tenant.id),
  });

  const credits = creditsData?.data?.data;
  const balance = credits?.totalCredits || 0;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-gray-900">{tenant.name}</p>
          <p className="text-sm text-gray-500">{tenant.slug}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="flex items-center gap-1 font-semibold text-yellow-600">
          <CoinsIcon className="h-4 w-4" />
          {balance.toLocaleString()}
        </span>
      </td>
      <td className="px-6 py-4">
        {balance <= 0 ? (
          <span className="flex items-center gap-1 text-red-600">
            <AlertTriangleIcon className="h-4 w-4" />
            No Credits
          </span>
        ) : balance < 100 ? (
          <span className="flex items-center gap-1 text-orange-600">
            <AlertTriangleIcon className="h-4 w-4" />
            Low Credits
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green-600">
            <CheckIcon className="h-4 w-4" />
            Active
          </span>
        )}
      </td>
    </tr>
  );
}

function AlertsTab() {
  const queryClient = useQueryClient();

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['credit-alerts'],
    queryFn: () => aiCreditsAPI.getAlerts(),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => aiCreditsAPI.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-alerts'] });
      toast.success('Alert resolved');
    },
  });

  const alerts: Alert[] = alertsData?.data?.data || [];
  const unresolvedAlerts = alerts.filter(a => !a.isResolved);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="p-8 text-center bg-white rounded-lg shadow">
          <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading alerts...</p>
        </div>
      ) : unresolvedAlerts.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg shadow">
          <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No unresolved alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unresolvedAlerts.map((alert) => (
            <div key={alert.id} className="bg-white rounded-lg shadow p-4 flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangleIcon className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{alert.tenant?.name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                  {alert.alertType}
                </span>
              </div>
              <button
                onClick={() => resolveMutation.mutate(alert.id)}
                disabled={resolveMutation.isPending}
                className="flex-shrink-0 px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100"
              >
                Resolve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PackageModal({ pkg, onClose }: { pkg: CreditPackage | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    credits: pkg?.credits || 1000,
    price: pkg?.price || 100,
    currency: pkg?.currency || 'INR',
    description: pkg?.description || '',
    isActive: pkg?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => pkg ? aiCreditsAPI.updatePackage(pkg.id, data) : aiCreditsAPI.createPackage(data),
    onSuccess: () => {
      toast.success(pkg ? 'Package updated' : 'Package created');
      queryClient.invalidateQueries({ queryKey: ['credit-packages'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save package');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {pkg ? 'Edit Package' : 'Create Credit Package'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., Starter Pack"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
              <input
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                min={0}
                step={0.01}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="INR">INR (Indian Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
            </select>
          </div>

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
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : pkg ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCreditsModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState('');
  const [credits, setCredits] = useState(1000);
  const [reason, setReason] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-for-credits'],
    queryFn: () => tenantsAPI.getAll({ limit: 100 }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ['credit-packages-active'],
    queryFn: () => aiCreditsAPI.getPackages({ isActive: true }),
  });

  const addMutation = useMutation({
    mutationFn: () => aiCreditsAPI.addCredits(selectedTenant, {
      credits,
      reason: reason || 'Manual credit addition',
      paymentReference: paymentRef || undefined,
    }),
    onSuccess: () => {
      toast.success('Credits added successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant-credits'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add credits');
    },
  });

  const tenants = tenantsData?.data?.data || [];
  const packages = packagesData?.data?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Add Credits to Tenant</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Tenant *</label>
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

          {packages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quick Select Package</label>
              <div className="flex flex-wrap gap-2">
                {packages.map((pkg: CreditPackage) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setCredits(pkg.credits)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      credits === pkg.credits
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pkg.name} ({pkg.credits.toLocaleString()})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credits *</label>
            <input
              type="number"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              min={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., Payment received"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., TXN12345"
            />
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
              onClick={() => addMutation.mutate()}
              disabled={!selectedTenant || credits <= 0 || addMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              <ArrowUpIcon className="h-4 w-4" />
              {addMutation.isPending ? 'Adding...' : 'Add Credits'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
