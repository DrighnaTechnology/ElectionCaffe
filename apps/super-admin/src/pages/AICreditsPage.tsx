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
  SettingsIcon,
  TrendingUpIcon,
  DollarSignIcon,
  PercentIcon,
  ActivityIcon,
} from 'lucide-react';

interface CreditPackage {
  id: string;
  packageName: string;
  displayName: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  description?: string;
  bonusCredits: number;
  validityDays: number;
  discountPercent: number;
  isPopular: boolean;
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'packages' | 'credits' | 'alerts' | 'settings'>('dashboard');
  const [createPackageOpen, setCreatePackageOpen] = useState(false);
  const [editPackage, setEditPackage] = useState<CreditPackage | null>(null);
  const [addCreditsOpen, setAddCreditsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Credits</h1>
          <p className="text-gray-500">Manage credit packages, tenant credits, and commission settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: ActivityIcon },
            { key: 'packages', label: 'Credit Packages', icon: PackageIcon },
            { key: 'credits', label: 'Tenant Credits', icon: CoinsIcon },
            { key: 'alerts', label: 'Alerts', icon: BellIcon },
            { key: 'settings', label: 'Commission', icon: SettingsIcon },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
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
      {activeTab === 'settings' && <CommissionSettingsTab />}

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

// ==================== DASHBOARD TAB ====================
function DashboardTab() {
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['credits-summary'],
    queryFn: () => aiCreditsAPI.getSummary(),
  });

  const summary = summaryData?.data?.data;

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!summary) return null;

  const overview = summary.overview || {};
  const financials = summary.financials || {};
  const last30 = financials.last30Days || {};
  const allTime = financials.allTime || {};

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Credits in Circulation"
          value={(overview.totalCreditsBalance || 0).toLocaleString()}
          icon={<CoinsIcon className="h-5 w-5 text-yellow-600" />}
          subtitle={`${overview.totalTenantsWithCredits || 0} tenants with credits`}
        />
        <StatCard
          title="Total Purchased"
          value={(overview.totalCreditsPurchased || 0).toLocaleString()}
          icon={<ArrowUpIcon className="h-5 w-5 text-green-600" />}
          subtitle={`${overview.totalCreditsUsed || 0} credits used`}
        />
        <StatCard
          title="Low Balance"
          value={overview.lowBalanceTenants || 0}
          icon={<AlertTriangleIcon className="h-5 w-5 text-orange-600" />}
          subtitle={`${overview.unresolvedAlerts || 0} unresolved alerts`}
          alert={overview.lowBalanceTenants > 0}
        />
        <StatCard
          title="Commission Rate"
          value={`${overview.commissionPercent || 40}%`}
          icon={<PercentIcon className="h-5 w-5 text-blue-600" />}
          subtitle="Platform markup on AI costs"
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last 30 Days */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-green-600" />
            Last 30 Days
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Revenue (from purchases)</span>
              <span className="font-semibold text-green-600">${(last30.revenue || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Provider Cost (actual)</span>
              <span className="font-semibold text-red-600">-${(last30.providerCost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600 font-medium">Profit</span>
              <span className={`font-bold text-lg ${(last30.profit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${(last30.profit || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm text-gray-500">
              <span>AI Calls</span>
              <span>{(last30.aiCalls || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm text-gray-500">
              <span>Credits Sold</span>
              <span>{(last30.creditsSold || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm text-gray-500">
              <span>Credits Used by Tenants</span>
              <span>{(last30.creditsUsed || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* All Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSignIcon className="h-5 w-5 text-blue-600" />
            All Time
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold text-green-600">${(allTime.revenue || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total Provider Cost</span>
              <span className="font-semibold text-red-600">-${(allTime.providerCost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600 font-medium">Total Profit</span>
              <span className={`font-bold text-lg ${(allTime.profit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${(allTime.profit || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm text-gray-500">
              <span>Profit Margin</span>
              <span className="font-medium">{allTime.marginPercent || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions & Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          {(summary.recentTransactions || []).length === 0 ? (
            <p className="text-gray-500 text-sm">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {summary.recentTransactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{t.tenantName}</span>
                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                      t.type === 'PURCHASE' ? 'bg-green-100 text-green-700' :
                      t.type === 'USAGE' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {t.type}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Usage Tenants */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top AI Users</h3>
          {(summary.topUsageTenants || []).length === 0 ? (
            <p className="text-gray-500 text-sm">No usage data yet</p>
          ) : (
            <div className="space-y-2">
              {summary.topUsageTenants.map((t: any, i: number) => (
                <div key={t.tenantId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{t.tenantName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{t.totalUsed.toLocaleString()} used</div>
                    <div className="text-xs text-gray-500">{t.currentBalance.toLocaleString()} remaining</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle, alert }: { title: string; value: string | number; icon: React.ReactNode; subtitle: string; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-lg shadow p-5 ${alert ? 'ring-2 ring-orange-300' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

// ==================== COMMISSION SETTINGS TAB ====================
function CommissionSettingsTab() {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [newPercent, setNewPercent] = useState(40);

  const { data: commissionData, isLoading } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: () => aiCreditsAPI.getCommission(),
  });

  const updateMutation = useMutation({
    mutationFn: (percent: number) => aiCreditsAPI.updateCommission(percent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-settings'] });
      queryClient.invalidateQueries({ queryKey: ['credits-summary'] });
      toast.success('Commission rate updated');
      setEditMode(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update');
    },
  });

  const commission = commissionData?.data?.data;
  const currentPercent = commission?.commissionPercent ?? 40;

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Commission Rate Card */}
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Platform Commission Rate</h3>
        <p className="text-sm text-gray-500 mb-6">
          This percentage is added on top of the actual AI provider costs.
          When a tenant uses AI credits, the platform earns this commission on every call.
        </p>

        {!editMode ? (
          <div className="flex items-center gap-6">
            <div className="bg-orange-50 rounded-xl p-6 flex-1">
              <div className="text-sm text-orange-700 mb-1">Current Commission</div>
              <div className="text-4xl font-bold text-orange-600">{currentPercent}%</div>
              <div className="text-xs text-orange-500 mt-2">
                If provider costs $1.00, tenant pays ${(1 * (1 + currentPercent / 100)).toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => { setNewPercent(currentPercent); setEditMode(true); }}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
            >
              Change Rate
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Commission Percentage
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={newPercent}
                  onChange={(e) => setNewPercent(parseFloat(e.target.value) || 0)}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min={0}
                  max={200}
                  step={1}
                />
                <span className="text-gray-500">%</span>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="font-medium text-gray-700 mb-2">Preview:</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-gray-500">Provider Cost</div>
                  <div className="font-semibold">$1.00</div>
                </div>
                <div>
                  <div className="text-gray-500">Commission ({newPercent}%)</div>
                  <div className="font-semibold text-orange-600">${(newPercent / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Tenant Pays</div>
                  <div className="font-semibold text-green-600">${(1 + newPercent / 100).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => updateMutation.mutate(newPercent)}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How Credits Work */}
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How the Credit System Works</h3>
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <div className="font-medium text-gray-900">Configure AI Providers</div>
              <p>Set up providers (OpenAI, Anthropic, Google, etc.) with their actual per-token costs.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <div className="font-medium text-gray-900">Create Credit Packages</div>
              <p>Define packages with pricing that includes the {currentPercent}% commission. Each credit maps to actual provider usage.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <div className="font-medium text-gray-900">Assign Credits to Tenants</div>
              <p>After payment, add credits to tenant accounts. Credits are deducted per AI feature usage.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">4</div>
            <div>
              <div className="font-medium text-gray-900">Automatic Enforcement</div>
              <p>When credits reach 0, all AI features are blocked. Low balance alerts notify you to contact the tenant.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold flex-shrink-0">$</div>
            <div>
              <div className="font-medium text-gray-900">Revenue Tracking</div>
              <p>Every AI call tracks actual provider cost. Your profit = revenue - provider cost ({currentPercent}% margin).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CREDIT PACKAGES TAB ====================
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
            <div key={pkg.id} className={`bg-white rounded-lg shadow p-6 ${pkg.isPopular ? 'ring-2 ring-orange-400' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{pkg.displayName || pkg.packageName || pkg.name}</h3>
                  {pkg.description && (
                    <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {pkg.isPopular && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">Popular</span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Credits:</span>
                  <span className="flex items-center gap-1 font-semibold text-yellow-600">
                    <CoinsIcon className="h-4 w-4" />
                    {pkg.credits.toLocaleString()}
                    {pkg.bonusCredits > 0 && (
                      <span className="text-xs text-green-600"> +{pkg.bonusCredits} bonus</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Selling Price:</span>
                  <span className="font-semibold text-green-600">
                    {pkg.currency} {Number(pkg.price).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Per Credit:</span>
                  <span className="text-gray-700">
                    {pkg.currency} {(Number(pkg.price) / (pkg.credits + (pkg.bonusCredits || 0))).toFixed(4)}
                  </span>
                </div>
                {pkg.validityDays > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Validity:</span>
                    <span className="text-gray-700">{pkg.validityDays} days</span>
                  </div>
                )}
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

// ==================== TENANT CREDITS TAB ====================
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
  const balance = credits?.balance || credits?.totalCredits || 0;

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

// ==================== ALERTS TAB ====================
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

// ==================== MODALS ====================
function PackageModal({ pkg, onClose }: { pkg: CreditPackage | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    packageName: pkg?.packageName || pkg?.name || '',
    displayName: pkg?.displayName || pkg?.name || '',
    credits: pkg?.credits || 1000,
    price: Number(pkg?.price) || 100,
    currency: pkg?.currency || 'INR',
    description: pkg?.description || '',
    bonusCredits: pkg?.bonusCredits || 0,
    validityDays: pkg?.validityDays || 365,
    discountPercent: pkg?.discountPercent || 0,
    isPopular: pkg?.isPopular || false,
    isActive: pkg?.isActive ?? true,
  });

  const { data: commissionData } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: () => aiCreditsAPI.getCommission(),
  });

  const commissionPercent = commissionData?.data?.data?.commissionPercent ?? 40;
  const totalCredits = formData.credits + formData.bonusCredits;
  const pricePerCredit = totalCredits > 0 ? formData.price / totalCredits : 0;
  const estimatedProviderCost = formData.price / (1 + commissionPercent / 100);
  const estimatedCommission = formData.price - estimatedProviderCost;

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
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {pkg ? 'Edit Package' : 'Create Credit Package'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Key *</label>
              <input
                type="text"
                value={formData.packageName}
                onChange={(e) => setFormData({ ...formData, packageName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., starter_1000"
                required
                disabled={!!pkg}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., Starter Pack"
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
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Credits</label>
              <input
                type="number"
                value={formData.bonusCredits}
                onChange={(e) => setFormData({ ...formData, bonusCredits: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validity (days)</label>
              <input
                type="number"
                value={formData.validityDays}
                onChange={(e) => setFormData({ ...formData, validityDays: parseInt(e.target.value) || 365 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
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
          </div>

          {/* Commission Breakdown */}
          <div className="bg-orange-50 rounded-lg p-4 text-sm">
            <div className="font-medium text-orange-800 mb-2">Commission Breakdown ({commissionPercent}%)</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-orange-600 text-xs">Provider Cost</div>
                <div className="font-semibold">{formData.currency} {estimatedProviderCost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-orange-600 text-xs">Your Commission</div>
                <div className="font-semibold text-green-700">{formData.currency} {estimatedCommission.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-orange-600 text-xs">Per Credit</div>
                <div className="font-semibold">{formData.currency} {pricePerCredit.toFixed(4)}</div>
              </div>
            </div>
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
                id="isPopular"
                checked={formData.isPopular}
                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="isPopular" className="text-sm text-gray-700">Featured / Popular</label>
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
      queryClient.invalidateQueries({ queryKey: ['credits-summary'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add credits');
    },
  });

  const tenants = tenantsData?.data?.data || [];
  const packages: CreditPackage[] = packagesData?.data?.data || [];

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
                {packages.map((pkg) => (
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
                    {pkg.displayName || pkg.packageName || pkg.name} ({pkg.credits.toLocaleString()})
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
