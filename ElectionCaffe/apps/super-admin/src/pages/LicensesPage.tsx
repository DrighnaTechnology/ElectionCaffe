import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { licensesAPI, tenantsAPI } from '../services/api';
import { formatDateTime } from '../lib/utils';
import { toast } from 'sonner';
import {
  KeyIcon,
  PlusIcon,
  XIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  PauseIcon,
  PlayIcon,
  UsersIcon,
  MonitorIcon,
  DatabaseIcon,
  RefreshCwIcon,
  SettingsIcon,
  CreditCardIcon,
} from 'lucide-react';

type LicenseStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED' | 'PENDING_PAYMENT';

const statusConfig: Record<LicenseStatus, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  TRIAL: { label: 'Trial', color: 'bg-blue-100 text-blue-800', icon: ClockIcon },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-100 text-red-800', icon: PauseIcon },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: AlertTriangleIcon },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XIcon },
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800', icon: CreditCardIcon },
};

export function LicensesPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  // Fetch dashboard stats
  const { data: statsData } = useQuery({
    queryKey: ['license-stats'],
    queryFn: () => licensesAPI.getDashboardStats(),
  });

  // Fetch licenses
  const { data: licensesData, isLoading } = useQuery({
    queryKey: ['licenses', page, selectedStatus],
    queryFn: () => licensesAPI.getAll({
      page,
      limit: 20,
      status: selectedStatus || undefined,
    }),
  });

  // Fetch plans for dropdown
  const { data: plansData } = useQuery({
    queryKey: ['license-plans'],
    queryFn: () => licensesAPI.getPlans({ isActive: true }),
  });

  // Seed default plans mutation
  const seedPlansMutation = useMutation({
    mutationFn: () => licensesAPI.seedDefaultPlans(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['license-plans'] });
      toast.success(response.data.message || 'Default plans created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to seed plans');
    },
  });

  // Suspend license mutation
  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      licensesAPI.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast.success('License suspended');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to suspend license');
    },
  });

  // Activate license mutation
  const activateMutation = useMutation({
    mutationFn: (id: string) => licensesAPI.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast.success('License activated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to activate license');
    },
  });

  const stats = statsData?.data?.data || {
    licenses: { total: 0, active: 0, trial: 0, suspended: 0, expired: 0, expiringWithin7Days: 0 },
    sessions: { active: 0 },
    alerts: { critical: 0 },
    revenue: { thisMonth: 0 },
  };

  const licenses = licensesData?.data?.data || [];
  const meta = licensesData?.data?.meta;
  const plans = plansData?.data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
          <p className="text-gray-500">Manage tenant licenses, sessions, and usage limits</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPlansModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <SettingsIcon className="h-5 w-5" />
            Manage Plans
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <PlusIcon className="h-5 w-5" />
            Assign License
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Licenses"
          value={stats.licenses.total}
          icon={KeyIcon}
          color="blue"
        />
        <StatCard
          title="Active"
          value={stats.licenses.active}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="Trial"
          value={stats.licenses.trial}
          icon={ClockIcon}
          color="blue"
        />
        <StatCard
          title="Suspended"
          value={stats.licenses.suspended}
          icon={PauseIcon}
          color="red"
        />
        <StatCard
          title="Active Sessions"
          value={stats.sessions.active}
          icon={MonitorIcon}
          color="purple"
        />
        <StatCard
          title="Critical Alerts"
          value={stats.alerts.critical}
          icon={AlertTriangleIcon}
          color="orange"
        />
      </div>

      {/* Expiring Soon Warning */}
      {stats.licenses.expiringWithin7Days > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
          <span className="text-yellow-800">
            {stats.licenses.expiringWithin7Days} license(s) expiring within 7 days
          </span>
        </div>
      )}

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
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="EXPIRED">Expired</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
        </select>

        {plans.length === 0 && (
          <button
            onClick={() => seedPlansMutation.mutate()}
            disabled={seedPlansMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 ${seedPlansMutation.isPending ? 'animate-spin' : ''}`} />
            Seed Default Plans
          </button>
        )}
      </div>

      {/* Licenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-12">
            <KeyIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No licenses found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {licenses.map((license: any) => {
                const status = statusConfig[license.status as LicenseStatus] || statusConfig.ACTIVE;
                const StatusIcon = status.icon;
                const activeSessions = license._count?.sessions || 0;
                const maxSessions = license.customMaxSessions || license.licensePlan?.maxConcurrentSessions || 0;

                return (
                  <tr key={license.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{license.tenant?.name}</div>
                        <div className="text-sm text-gray-500">{license.tenant?.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        {license.licensePlan?.planName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded w-fit ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MonitorIcon className="h-4 w-4 text-gray-400" />
                        <span className={activeSessions >= maxSessions ? 'text-red-600 font-medium' : ''}>
                          {activeSessions}/{maxSessions}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {license.expiresAt ? (
                        <span className={
                          new Date(license.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            ? 'text-red-600 font-medium'
                            : ''
                        }>
                          {formatDateTime(license.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {license.status === 'SUSPENDED' || license.status === 'EXPIRED' ? (
                          <button
                            onClick={() => activateMutation.mutate(license.id)}
                            disabled={activateMutation.isPending}
                            className="p-1 text-green-500 hover:text-green-700"
                            title="Activate"
                          >
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        ) : license.status === 'ACTIVE' || license.status === 'TRIAL' ? (
                          <button
                            onClick={() => {
                              const reason = prompt('Enter suspension reason:');
                              if (reason) {
                                suspendMutation.mutate({ id: license.id, reason });
                              }
                            }}
                            disabled={suspendMutation.isPending}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Suspend"
                          >
                            <PauseIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * meta.limit + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total}
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
                disabled={page === meta.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign License Modal */}
      {showAssignModal && (
        <AssignLicenseModal
          plans={plans}
          onClose={() => setShowAssignModal(false)}
        />
      )}

      {/* Plans Management Modal */}
      {showPlansModal && (
        <PlansModal
          plans={plans}
          onClose={() => setShowPlansModal(false)}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

function AssignLicenseModal({
  plans,
  onClose,
}: {
  plans: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    tenantId: '',
    licensePlanId: '',
    status: 'TRIAL',
    customMaxUsers: '',
    customMaxSessions: '',
    customMaxDataGB: '',
    trialDays: '14',
    adminNotes: '',
  });

  // Fetch tenants without licenses
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-without-license'],
    queryFn: () => tenantsAPI.getAll({ limit: 100 }),
  });

  const assignMutation = useMutation({
    mutationFn: () => licensesAPI.assign({
      tenantId: formData.tenantId,
      licensePlanId: formData.licensePlanId,
      status: formData.status,
      customMaxUsers: formData.customMaxUsers ? parseInt(formData.customMaxUsers) : undefined,
      customMaxSessions: formData.customMaxSessions ? parseInt(formData.customMaxSessions) : undefined,
      customMaxDataGB: formData.customMaxDataGB ? parseFloat(formData.customMaxDataGB) : undefined,
      adminNotes: formData.adminNotes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast.success('License assigned successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to assign license');
    },
  });

  const tenants = tenantsData?.data?.data || [];
  const selectedPlan = plans.find((p: any) => p.id === formData.licensePlanId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId || !formData.licensePlanId) {
      toast.error('Please select tenant and plan');
      return;
    }
    assignMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Assign License</h2>
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
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select tenant</option>
              {tenants.map((tenant: any) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Plan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {plans.map((plan: any) => (
                <div
                  key={plan.id}
                  onClick={() => setFormData({ ...formData, licensePlanId: plan.id })}
                  className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    formData.licensePlanId === plan.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold capitalize text-sm">{plan.planName}</span>
                    {formData.licensePlanId === plan.id && (
                      <CheckCircleIcon className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <div className={`text-xs px-1.5 py-0.5 rounded w-fit mb-2 ${
                    plan.planType === 'FREE' ? 'bg-gray-100 text-gray-600' :
                    plan.planType === 'STARTER' ? 'bg-blue-100 text-blue-700' :
                    plan.planType === 'PROFESSIONAL' ? 'bg-purple-100 text-purple-700' :
                    plan.planType === 'ENTERPRISE' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {plan.planType}
                  </div>
                  <div className="text-lg font-bold">
                    {plan.basePrice === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <span>{plan.currency} {plan.basePrice}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div>{plan.maxUsers} users</div>
                    <div>{plan.maxConcurrentSessions} sessions</div>
                    <div>{plan.maxDataProcessingGB} GB data</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Plan Details */}
          {selectedPlan && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-sm text-gray-700 mb-2">
                Selected Plan: <span className="capitalize">{selectedPlan.planName}</span>
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Max Users:</span>
                  <span className="ml-1 font-medium">{selectedPlan.maxUsers}</span>
                </div>
                <div>
                  <span className="text-gray-500">Max Sessions:</span>
                  <span className="ml-1 font-medium">{selectedPlan.maxConcurrentSessions}</span>
                </div>
                <div>
                  <span className="text-gray-500">Sessions/User:</span>
                  <span className="ml-1 font-medium">{selectedPlan.maxSessionsPerUser}</span>
                </div>
                <div>
                  <span className="text-gray-500">Data:</span>
                  <span className="ml-1 font-medium">{selectedPlan.maxDataProcessingGB} GB</span>
                </div>
                <div>
                  <span className="text-gray-500">Voters:</span>
                  <span className="ml-1 font-medium">{selectedPlan.maxVoters?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Elections:</span>
                  <span className="ml-1 font-medium">{selectedPlan.maxElections}</span>
                </div>
                <div>
                  <span className="text-gray-500">API/Day:</span>
                  <span className="ml-1 font-medium">{selectedPlan.maxApiRequestsPerDay?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Trial:</span>
                  <span className="ml-1 font-medium">{selectedPlan.trialDays} days</span>
                </div>
                <div>
                  <span className="text-gray-500">Grace:</span>
                  <span className="ml-1 font-medium">{selectedPlan.gracePeriodDays} days</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
            {formData.status === 'TRIAL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                <input
                  type="number"
                  value={formData.trialDays}
                  onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="14"
                />
              </div>
            )}
          </div>

          {/* Custom Overrides */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Custom Overrides (optional)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Users</label>
                <input
                  type="number"
                  value={formData.customMaxUsers}
                  onChange={(e) => setFormData({ ...formData, customMaxUsers: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder={selectedPlan?.maxUsers || 'Plan default'}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Sessions</label>
                <input
                  type="number"
                  value={formData.customMaxSessions}
                  onChange={(e) => setFormData({ ...formData, customMaxSessions: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder={selectedPlan?.maxConcurrentSessions || 'Plan default'}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Data (GB)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.customMaxDataGB}
                  onChange={(e) => setFormData({ ...formData, customMaxDataGB: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder={selectedPlan?.maxDataProcessingGB || 'Plan default'}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
              placeholder="Internal notes about this license assignment..."
            />
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
              disabled={assignMutation.isPending || !formData.licensePlanId}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlansModal({
  plans,
  onClose,
}: {
  plans: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    planName: '',
    planType: 'STARTER',
    description: '',
    maxUsers: 10,
    maxAdminUsers: 2,
    maxConcurrentSessions: 5,
    maxSessionsPerUser: 2,
    sessionTimeoutMinutes: 30,
    maxDataProcessingGB: 5,
    maxVoters: 10000,
    maxElections: 3,
    maxConstituencies: 1,
    maxStorageMB: 5000,
    maxApiRequestsPerDay: 10000,
    maxApiRequestsPerHour: 1000,
    basePrice: 0,
    pricePerUser: 0,
    pricePerSession: 0,
    pricePerGBProcessed: 0,
    billingCycle: 'MONTHLY',
    currency: 'INR',
    gracePeriodDays: 7,
    trialDays: 14,
    allowOverage: false,
    overagePricePerUser: 0,
    overagePricePerGB: 0,
    overageSessionPrice: 0,
    isActive: true,
    isPublic: true,
  });

  const resetForm = () => {
    setFormData({
      planName: '',
      planType: 'STARTER',
      description: '',
      maxUsers: 10,
      maxAdminUsers: 2,
      maxConcurrentSessions: 5,
      maxSessionsPerUser: 2,
      sessionTimeoutMinutes: 30,
      maxDataProcessingGB: 5,
      maxVoters: 10000,
      maxElections: 3,
      maxConstituencies: 1,
      maxStorageMB: 5000,
      maxApiRequestsPerDay: 10000,
      maxApiRequestsPerHour: 1000,
      basePrice: 0,
      pricePerUser: 0,
      pricePerSession: 0,
      pricePerGBProcessed: 0,
      billingCycle: 'MONTHLY',
      currency: 'INR',
      gracePeriodDays: 7,
      trialDays: 14,
      allowOverage: false,
      overagePricePerUser: 0,
      overagePricePerGB: 0,
      overageSessionPrice: 0,
      isActive: true,
      isPublic: true,
    });
    setEditingPlan(null);
    setShowCreateForm(false);
  };

  const createPlanMutation = useMutation({
    mutationFn: (data: any) => licensesAPI.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-plans'] });
      toast.success('Plan created successfully');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create plan');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => licensesAPI.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-plans'] });
      toast.success('Plan updated successfully');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update plan');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => licensesAPI.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete plan');
    },
  });

  const handleEdit = (plan: any) => {
    setFormData({
      planName: plan.planName,
      planType: plan.planType,
      description: plan.description || '',
      maxUsers: plan.maxUsers,
      maxAdminUsers: plan.maxAdminUsers,
      maxConcurrentSessions: plan.maxConcurrentSessions,
      maxSessionsPerUser: plan.maxSessionsPerUser,
      sessionTimeoutMinutes: plan.sessionTimeoutMinutes,
      maxDataProcessingGB: plan.maxDataProcessingGB,
      maxVoters: plan.maxVoters,
      maxElections: plan.maxElections,
      maxConstituencies: plan.maxConstituencies,
      maxStorageMB: plan.maxStorageMB,
      maxApiRequestsPerDay: plan.maxApiRequestsPerDay,
      maxApiRequestsPerHour: plan.maxApiRequestsPerHour,
      basePrice: plan.basePrice,
      pricePerUser: plan.pricePerUser || 0,
      pricePerSession: plan.pricePerSession || 0,
      pricePerGBProcessed: plan.pricePerGBProcessed || 0,
      billingCycle: plan.billingCycle,
      currency: plan.currency,
      gracePeriodDays: plan.gracePeriodDays,
      trialDays: plan.trialDays,
      allowOverage: plan.allowOverage,
      overagePricePerUser: plan.overagePricePerUser || 0,
      overagePricePerGB: plan.overagePricePerGB || 0,
      overageSessionPrice: plan.overageSessionPrice || 0,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
    });
    setEditingPlan(plan);
    setShowCreateForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleDelete = (plan: any) => {
    if (plan._count?.tenantLicenses > 0) {
      toast.error('Cannot delete plan with active licenses');
      return;
    }
    if (confirm(`Are you sure you want to delete the "${plan.planName}" plan?`)) {
      deletePlanMutation.mutate(plan.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            {showCreateForm ? (editingPlan ? 'Edit Plan' : 'Create New Plan') : 'License Plans'}
          </h2>
          <div className="flex items-center gap-2">
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600"
              >
                <PlusIcon className="h-4 w-4" />
                Add Plan
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showCreateForm ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm text-gray-700">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.planName}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                    placeholder="e.g., starter, professional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                  <select
                    value={formData.planType}
                    onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Plan description"
                  />
                </div>
              </div>
            </div>

            {/* User & Session Limits */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm text-blue-700">User & Session Limits</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                  <input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Admins</label>
                  <input
                    type="number"
                    value={formData.maxAdminUsers}
                    onChange={(e) => setFormData({ ...formData, maxAdminUsers: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Sessions</label>
                  <input
                    type="number"
                    value={formData.maxConcurrentSessions}
                    onChange={(e) => setFormData({ ...formData, maxConcurrentSessions: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sessions/User</label>
                  <input
                    type="number"
                    value={formData.maxSessionsPerUser}
                    onChange={(e) => setFormData({ ...formData, maxSessionsPerUser: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (min)</label>
                  <input
                    type="number"
                    value={formData.sessionTimeoutMinutes}
                    onChange={(e) => setFormData({ ...formData, sessionTimeoutMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Data & Resource Limits */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm text-green-700">Data & Resource Limits</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data (GB/month)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.maxDataProcessingGB}
                    onChange={(e) => setFormData({ ...formData, maxDataProcessingGB: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Voters</label>
                  <input
                    type="number"
                    value={formData.maxVoters}
                    onChange={(e) => setFormData({ ...formData, maxVoters: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Elections</label>
                  <input
                    type="number"
                    value={formData.maxElections}
                    onChange={(e) => setFormData({ ...formData, maxElections: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Constituencies</label>
                  <input
                    type="number"
                    value={formData.maxConstituencies}
                    onChange={(e) => setFormData({ ...formData, maxConstituencies: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage (MB)</label>
                  <input
                    type="number"
                    value={formData.maxStorageMB}
                    onChange={(e) => setFormData({ ...formData, maxStorageMB: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* API Limits */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm text-purple-700">API Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Requests/Day</label>
                  <input
                    type="number"
                    value={formData.maxApiRequestsPerDay}
                    onChange={(e) => setFormData({ ...formData, maxApiRequestsPerDay: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Requests/Hour</label>
                  <input
                    type="number"
                    value={formData.maxApiRequestsPerHour}
                    onChange={(e) => setFormData({ ...formData, maxApiRequestsPerHour: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm text-yellow-700">Pricing</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="ONE_TIME">One Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price/User</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pricePerUser}
                    onChange={(e) => setFormData({ ...formData, pricePerUser: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price/GB</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.pricePerGBProcessed}
                    onChange={(e) => setFormData({ ...formData, pricePerGBProcessed: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Grace & Trial */}
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-sm text-orange-700">Grace Period & Trial</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (days)</label>
                  <input
                    type="number"
                    value={formData.gracePeriodDays}
                    onChange={(e) => setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                  <input
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="allowOverage"
                    checked={formData.allowOverage}
                    onChange={(e) => setFormData({ ...formData, allowOverage: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor="allowOverage" className="text-sm">Allow Overage</label>
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {createPlanMutation.isPending || updatePlanMutation.isPending
                  ? 'Saving...'
                  : editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        ) : plans.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No plans configured. Click "Add Plan" to create one.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan: any) => (
              <div key={plan.id} className={`border rounded-lg p-4 ${!plan.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg capitalize">{plan.planName}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    plan.planType === 'FREE' ? 'bg-gray-100 text-gray-800' :
                    plan.planType === 'STARTER' ? 'bg-blue-100 text-blue-800' :
                    plan.planType === 'PROFESSIONAL' ? 'bg-purple-100 text-purple-800' :
                    plan.planType === 'ENTERPRISE' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.planType}
                  </span>
                </div>
                {plan.description && (
                  <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
                )}

                {/* Limits Summary */}
                <div className="space-y-1.5 text-sm border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5" /> Users
                    </span>
                    <span className="font-medium">{plan.maxUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <MonitorIcon className="h-3.5 w-3.5" /> Sessions
                    </span>
                    <span className="font-medium">{plan.maxConcurrentSessions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <DatabaseIcon className="h-3.5 w-3.5" /> Data
                    </span>
                    <span className="font-medium">{plan.maxDataProcessingGB} GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Voters</span>
                    <span className="font-medium">{plan.maxVoters.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Elections</span>
                    <span className="font-medium">{plan.maxElections}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">API/Day</span>
                    <span className="font-medium">{plan.maxApiRequestsPerDay.toLocaleString()}</span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xl font-bold">
                    {plan.basePrice === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      <>
                        {plan.currency} {plan.basePrice.toLocaleString()}
                        <span className="text-sm font-normal text-gray-500">
                          /{plan.billingCycle.toLowerCase()}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Trial: {plan.trialDays} days | Grace: {plan.gracePeriodDays} days
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {plan._count?.tenantLicenses || 0} tenant(s)
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <SettingsIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      disabled={plan._count?.tenantLicenses > 0}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title={plan._count?.tenantLicenses > 0 ? 'Cannot delete - plan in use' : 'Delete'}
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
