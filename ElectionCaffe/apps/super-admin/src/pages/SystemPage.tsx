import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemAPI } from '../services/api';
import { formatDateTime, getInitials } from '../lib/utils';
import { toast } from 'sonner';
import {
  SettingsIcon,
  UsersIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ActivityIcon,
  DatabaseIcon,
} from 'lucide-react';

export function SystemPage() {
  const [activeTab, setActiveTab] = useState<'admins' | 'config' | 'health'>('admins');
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: adminsData, isLoading: adminsLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => systemAPI.getAdmins(),
  });

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['config'],
    queryFn: () => systemAPI.getConfig(),
  });

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => systemAPI.getHealth(),
    refetchInterval: 10000,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => systemAPI.deactivateAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin deactivated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to deactivate admin');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => systemAPI.activateAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin activated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to activate admin');
    },
  });

  const admins = adminsData?.data?.data || [];
  const configs = configData?.data?.data || [];
  const health = healthData?.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500">Manage platform configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'admins'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="h-4 w-4 inline-block mr-2" />
              Super Admins
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'config'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SettingsIcon className="h-4 w-4 inline-block mr-2" />
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'health'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ActivityIcon className="h-4 w-4 inline-block mr-2" />
              System Health
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'admins' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Super Administrators</h2>
                <button
                  onClick={() => setCreateAdminOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Admin
                </button>
              </div>

              {adminsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {admins.map((admin: any) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">
                          {getInitials(`${admin.firstName} ${admin.lastName || ''}`)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {admin.firstName} {admin.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {admin.lastLoginAt && (
                          <span className="text-sm text-gray-500">
                            Last login: {formatDateTime(admin.lastLoginAt)}
                          </span>
                        )}
                        {admin.isActive ? (
                          <>
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircleIcon className="h-4 w-4" />
                              Active
                            </span>
                            <button
                              onClick={() => {
                                if (confirm('Deactivate this admin?')) {
                                  deactivateMutation.mutate(admin.id);
                                }
                              }}
                              className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                            >
                              Deactivate
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircleIcon className="h-4 w-4" />
                              Inactive
                            </span>
                            <button
                              onClick={() => activateMutation.mutate(admin.id)}
                              className="px-3 py-1 text-sm text-green-600 border border-green-200 rounded hover:bg-green-50"
                            >
                              Activate
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h2>
              {configLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : configs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No configuration items</p>
              ) : (
                <div className="space-y-3">
                  {configs.map((config: any) => (
                    <div key={config.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{config.configKey}</p>
                        {config.description && (
                          <p className="text-sm text-gray-500">{config.description}</p>
                        )}
                      </div>
                      <code className="px-2 py-1 bg-gray-200 rounded text-sm">
                        {JSON.stringify(config.configValue)}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'health' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ActivityIcon className={`h-8 w-8 ${health?.status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
                    <div>
                      <p className="font-medium text-gray-900">System Status</p>
                      <p className={`text-sm ${health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                        {health?.status || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DatabaseIcon className={`h-8 w-8 ${health?.database === 'connected' ? 'text-green-500' : 'text-red-500'}`} />
                    <div>
                      <p className="font-medium text-gray-900">Database</p>
                      <p className={`text-sm ${health?.database === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                        {health?.database || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {health?.timestamp && (
                <p className="mt-4 text-sm text-gray-500 text-center">
                  Last checked: {formatDateTime(health.timestamp)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Admin Modal */}
      {createAdminOpen && (
        <CreateAdminModal onClose={() => setCreateAdminOpen(false)} />
      )}
    </div>
  );
}

function CreateAdminModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
  });

  const createMutation = useMutation({
    mutationFn: () => systemAPI.createAdmin(formData),
    onSuccess: () => {
      toast.success('Admin created');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create admin');
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
          <h2 className="text-xl font-bold text-gray-900">Add Super Admin</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
            <input
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
              minLength={6}
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
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
