import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tenantsAPI, type DatabaseType } from '../services/api';
import { formatNumber, formatDateTime, getTenantTypeLabel, getTenantTypeColor } from '../lib/utils';
import { toast } from 'sonner';
import {
  PlusIcon,
  SearchIcon,
  BuildingIcon,
  UsersIcon,
  VoteIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react';

export function TenantsPage() {
  const [search, setSearch] = useState('');
  const [tenantType, setTenantType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants', search, tenantType, page],
    queryFn: () =>
      tenantsAPI.getAll({
        page,
        limit: 10,
        search: search || undefined,
        tenantType: tenantType || undefined,
      }),
  });

  const tenants = tenantsData?.data?.data || [];
  const meta = tenantsData?.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500">Manage organizations on the platform</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <select
          value={tenantType}
          onChange={(e) => {
            setTenantType(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Types</option>
          <option value="POLITICAL_PARTY">Political Party</option>
          <option value="INDIVIDUAL_CANDIDATE">Individual Candidate</option>
          <option value="ELECTION_MANAGEMENT">Election Management</option>
        </select>
      </div>

      {/* Tenants List */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Elections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map((tenant: any) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-sm text-gray-500">{tenant.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTenantTypeColor(tenant.tenantType)}`}>
                      {getTenantTypeLabel(tenant.tenantType)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tenant.isActive ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircleIcon className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircleIcon className="h-4 w-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-gray-600">
                      <UsersIcon className="h-4 w-4" />
                      {formatNumber(tenant._count?.users || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-gray-600">
                      <VoteIcon className="h-4 w-4" />
                      {formatNumber(tenant._count?.elections || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDateTime(tenant.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/tenants/${tenant.id}`}
                      className="text-orange-500 hover:text-orange-600"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === meta.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <CreateTenantModal onClose={() => setCreateModalOpen(false)} />
      )}
    </div>
  );
}

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tenantType: 'POLITICAL_PARTY' as const,
    databaseType: 'NONE' as DatabaseType,
    // Database config for DEDICATED_MANAGED
    databaseHost: '',
    databaseName: '',
    databaseUser: '',
    databasePassword: '',
    databasePort: 5432,
    databaseSSL: true,
    databaseConnectionUrl: '',
    // Admin user
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminMobile: '',
    adminPassword: '',
  });

  const createMutation = useMutation({
    mutationFn: () =>
      tenantsAPI.create({
        name: formData.name,
        slug: formData.slug,
        tenantType: formData.tenantType,
        databaseType: formData.databaseType,
        // Only include database config for DEDICATED_MANAGED
        ...(formData.databaseType === 'DEDICATED_MANAGED' && {
          databaseHost: formData.databaseHost || undefined,
          databaseName: formData.databaseName || undefined,
          databaseUser: formData.databaseUser || undefined,
          databasePassword: formData.databasePassword || undefined,
          databasePort: formData.databasePort || undefined,
          databaseSSL: formData.databaseSSL,
          databaseConnectionUrl: formData.databaseConnectionUrl || undefined,
        }),
        adminFirstName: formData.adminFirstName,
        adminLastName: formData.adminLastName || undefined,
        adminEmail: formData.adminEmail,
        adminMobile: formData.adminMobile,
        adminPassword: formData.adminPassword,
      }),
    onSuccess: () => {
      toast.success('Tenant created successfully');
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create tenant');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const getDatabaseTypeDescription = (type: DatabaseType) => {
    switch (type) {
      case 'NONE':
        return 'No database configured. Tenant admin will set up database from their settings.';
      case 'SHARED':
        return 'Use the shared ElectionCaffe platform database with tenant data isolation.';
      case 'DEDICATED_MANAGED':
        return 'You (Super Admin) will create and manage a dedicated database for this tenant.';
      case 'DEDICATED_SELF':
        return 'Tenant admin will provide their own database connection details.';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create New Tenant</h2>
          <p className="text-gray-500 text-sm">Add a new organization to the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Organization Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="organization-slug"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.tenantType}
                  onChange={(e) => setFormData({ ...formData, tenantType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="POLITICAL_PARTY">Political Party</option>
                  <option value="INDIVIDUAL_CANDIDATE">Individual Candidate</option>
                  <option value="ELECTION_MANAGEMENT">Election Management</option>
                </select>
              </div>
            </div>
          </div>

          {/* Database Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Database Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Database Type *</label>
                <select
                  value={formData.databaseType}
                  onChange={(e) => setFormData({ ...formData, databaseType: e.target.value as DatabaseType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="NONE">No Database (Tenant sets up later)</option>
                  <option value="SHARED">Shared Database</option>
                  <option value="DEDICATED_MANAGED">Dedicated Database (Super Admin Managed)</option>
                  <option value="DEDICATED_SELF">Dedicated Database (Tenant Managed)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">{getDatabaseTypeDescription(formData.databaseType)}</p>
              </div>

              {/* Show database config fields for DEDICATED_MANAGED */}
              {formData.databaseType === 'DEDICATED_MANAGED' && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <p className="text-sm text-gray-600 font-medium">Database Connection Details</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Connection URL (optional)</label>
                    <input
                      type="text"
                      value={formData.databaseConnectionUrl}
                      onChange={(e) => setFormData({ ...formData, databaseConnectionUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="postgresql://user:password@host:5432/database"
                    />
                    <p className="mt-1 text-xs text-gray-500">If provided, will override individual fields below</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                      <input
                        type="text"
                        value={formData.databaseHost}
                        onChange={(e) => setFormData({ ...formData, databaseHost: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input
                        type="number"
                        value={formData.databasePort}
                        onChange={(e) => setFormData({ ...formData, databasePort: parseInt(e.target.value) || 5432 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                      <input
                        type="text"
                        value={formData.databaseName}
                        onChange={(e) => setFormData({ ...formData, databaseName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="tenant_db"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input
                        type="text"
                        value={formData.databaseUser}
                        onChange={(e) => setFormData({ ...formData, databaseUser: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="postgres"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={formData.databasePassword}
                        onChange={(e) => setFormData({ ...formData, databasePassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.databaseSSL}
                          onChange={(e) => setFormData({ ...formData, databaseSSL: e.target.checked })}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Use SSL</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin User */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin User</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData.adminFirstName}
                  onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.adminLastName}
                  onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
                <input
                  type="tel"
                  value={formData.adminMobile}
                  onChange={(e) => setFormData({ ...formData, adminMobile: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                  minLength={6}
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
              {createMutation.isPending ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
