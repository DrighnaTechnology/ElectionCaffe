import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Spinner } from '../components/ui/spinner';
import {
  DatabaseIcon,
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  SaveIcon,
  LockIcon,
  ShieldIcon,
  InfoIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { tenantAPI } from '../services/api';

type DatabaseType = 'NONE' | 'SHARED' | 'DEDICATED_MANAGED' | 'DEDICATED_SELF';
type DatabaseStatus = 'NOT_CONFIGURED' | 'PENDING_SETUP' | 'CONNECTING' | 'CONNECTED' | 'CONNECTION_FAILED' | 'MIGRATING' | 'READY' | 'SUSPENDED';

interface DatabaseSettings {
  databaseType: DatabaseType;
  databaseStatus: DatabaseStatus;
  databaseHost: string | null;
  databaseName: string | null;
  databaseUser: string | null;
  databasePort: number | null;
  databaseSSL: boolean;
  canTenantEditDb: boolean;
  databaseManagedBy: string | null;
  databaseLastCheckedAt: string | null;
  databaseLastError: string | null;
  databaseMigrationVersion: string | null;
  hasPassword: boolean;
}

const statusConfig: Record<DatabaseStatus, { color: string; label: string; icon: React.ElementType }> = {
  NOT_CONFIGURED: { color: 'bg-gray-100 text-gray-700', label: 'Not Configured', icon: InfoIcon },
  PENDING_SETUP: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending Setup', icon: AlertTriangleIcon },
  CONNECTING: { color: 'bg-blue-100 text-blue-700', label: 'Connecting...', icon: RefreshCwIcon },
  CONNECTED: { color: 'bg-green-100 text-green-700', label: 'Connected', icon: CheckCircleIcon },
  CONNECTION_FAILED: { color: 'bg-red-100 text-red-700', label: 'Connection Failed', icon: XCircleIcon },
  MIGRATING: { color: 'bg-purple-100 text-purple-700', label: 'Migrating...', icon: RefreshCwIcon },
  READY: { color: 'bg-green-100 text-green-700', label: 'Ready', icon: CheckCircleIcon },
  SUSPENDED: { color: 'bg-orange-100 text-orange-700', label: 'Suspended', icon: AlertTriangleIcon },
};

const databaseTypeLabels: Record<DatabaseType, string> = {
  NONE: 'Not Configured',
  SHARED: 'Shared Platform Database',
  DEDICATED_MANAGED: 'Dedicated Database (Managed by Platform)',
  DEDICATED_SELF: 'Dedicated Database (Self-Managed)',
};

export function DatabaseSettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    databaseHost: '',
    databaseName: '',
    databaseUser: '',
    databasePassword: '',
    databasePort: 5432,
    databaseSSL: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  const { data: settingsResponse, isLoading, error } = useQuery({
    queryKey: ['tenant-database-settings'],
    queryFn: () => tenantAPI.getDatabaseSettings(),
  });

  const settings: DatabaseSettings | null = settingsResponse?.data?.data || null;

  useEffect(() => {
    if (settings) {
      setFormData({
        databaseHost: settings.databaseHost || '',
        databaseName: settings.databaseName || '',
        databaseUser: settings.databaseUser || '',
        databasePassword: '',
        databasePort: settings.databasePort || 5432,
        databaseSSL: settings.databaseSSL ?? true,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => tenantAPI.updateDatabaseSettings(data),
    onSuccess: () => {
      toast.success('Database settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant-database-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update database settings');
    },
  });

  const testMutation = useMutation({
    mutationFn: (data: typeof formData) => tenantAPI.testDatabaseConnection(data),
    onSuccess: (response) => {
      const data = response.data?.data;
      toast.success(`Connection successful! Server time: ${new Date(data.serverTime).toLocaleString()}`);
      queryClient.invalidateQueries({ queryKey: ['tenant-database-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Database connection failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.databaseHost || !formData.databaseName || !formData.databaseUser) {
      toast.error('Please fill in all required fields');
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleTestConnection = () => {
    if (!formData.databaseHost || !formData.databaseName || !formData.databaseUser) {
      toast.error('Please fill in all required fields before testing');
      return;
    }
    testMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <XCircleIcon className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold">Failed to load database settings</h2>
        <p className="text-gray-500">Please try again later or contact support.</p>
      </div>
    );
  }

  const canEdit = settings?.canTenantEditDb;
  const statusInfo = settings?.databaseStatus ? statusConfig[settings.databaseStatus] : statusConfig.NOT_CONFIGURED;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DatabaseIcon className="h-7 w-7" />
          Database Settings
        </h1>
        <p className="text-gray-500">Configure and manage your organization's database connection</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${statusInfo.color}`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Connection Status</p>
                <p className="font-semibold">{statusInfo.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <ServerIcon className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Database Type</p>
                <p className="font-semibold">{settings?.databaseType ? databaseTypeLabels[settings.databaseType] : 'Not Set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${canEdit ? 'bg-green-100' : 'bg-orange-100'}`}>
                {canEdit ? (
                  <ShieldIcon className="h-5 w-5 text-green-700" />
                ) : (
                  <LockIcon className="h-5 w-5 text-orange-700" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Management</p>
                <p className="font-semibold">{canEdit ? 'Self-Managed' : 'Managed by Platform'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {settings?.databaseLastError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Connection Error</p>
                <p className="text-sm text-red-600">{settings.databaseLastError}</p>
                {settings.databaseLastCheckedAt && (
                  <p className="text-xs text-red-500 mt-1">
                    Last checked: {new Date(settings.databaseLastCheckedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Read-only notice for managed databases */}
      {!canEdit && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <LockIcon className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-700">Database Managed by Platform</p>
                <p className="text-sm text-orange-600">
                  Your database is managed by the platform administrator. Contact support if you need to make changes to your database configuration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ServerIcon className="h-5 w-5" />
            Database Configuration
          </CardTitle>
          <CardDescription>
            {canEdit
              ? 'Configure your PostgreSQL database connection settings'
              : 'View your database connection settings (read-only)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="databaseHost">Database Host *</Label>
                <Input
                  id="databaseHost"
                  placeholder="localhost or db.example.com"
                  value={formData.databaseHost}
                  onChange={(e) => setFormData({ ...formData, databaseHost: e.target.value })}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="databasePort">Port</Label>
                <Input
                  id="databasePort"
                  type="number"
                  placeholder="5432"
                  value={formData.databasePort}
                  onChange={(e) => setFormData({ ...formData, databasePort: parseInt(e.target.value) || 5432 })}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="databaseName">Database Name *</Label>
                <Input
                  id="databaseName"
                  placeholder="my_election_db"
                  value={formData.databaseName}
                  onChange={(e) => setFormData({ ...formData, databaseName: e.target.value })}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="databaseUser">Username *</Label>
                <Input
                  id="databaseUser"
                  placeholder="postgres"
                  value={formData.databaseUser}
                  onChange={(e) => setFormData({ ...formData, databaseUser: e.target.value })}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="databasePassword">
                  Password {settings?.hasPassword && !formData.databasePassword && '(unchanged)'}
                </Label>
                <div className="relative">
                  <Input
                    id="databasePassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={settings?.hasPassword ? 'Leave blank to keep current password' : 'Enter password'}
                    value={formData.databasePassword}
                    onChange={(e) => setFormData({ ...formData, databasePassword: e.target.value })}
                    disabled={!canEdit}
                  />
                  {canEdit && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">SSL Connection</p>
                <p className="text-sm text-gray-500">Use encrypted connection to the database</p>
              </div>
              <Switch
                checked={formData.databaseSSL}
                onCheckedChange={(checked) => setFormData({ ...formData, databaseSSL: checked })}
                disabled={!canEdit}
              />
            </div>

            {canEdit && (
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <SaveIcon className="h-4 w-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            Database Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Database Type</p>
              <p className="font-medium">{settings?.databaseType ? databaseTypeLabels[settings.databaseType] : 'Not Set'}</p>
            </div>
            <div>
              <p className="text-gray-500">Managed By</p>
              <p className="font-medium capitalize">{settings?.databaseManagedBy || 'Not Assigned'}</p>
            </div>
            <div>
              <p className="text-gray-500">Last Connection Check</p>
              <p className="font-medium">
                {settings?.databaseLastCheckedAt
                  ? new Date(settings.databaseLastCheckedAt).toLocaleString()
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Migration Version</p>
              <p className="font-medium">{settings?.databaseMigrationVersion || 'Not Migrated'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
