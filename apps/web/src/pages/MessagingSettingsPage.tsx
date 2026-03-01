import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagingSettingsAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Spinner } from '../components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  MessageSquareIcon,
  SendIcon,
  MailIcon,
  MicIcon,
  PlusIcon,
  TrashIcon,
  TestTubeIcon,
  Loader2Icon,
  SaveIcon,
  WifiIcon,
  WifiOffIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// Channel icon helper
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  SMS: <SendIcon className="h-5 w-5" />,
  WHATSAPP: <MessageSquareIcon className="h-5 w-5" />,
  EMAIL: <MailIcon className="h-5 w-5" />,
  VOICE: <MicIcon className="h-5 w-5" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  SMS: 'text-blue-600 bg-blue-50',
  WHATSAPP: 'text-green-600 bg-green-50',
  EMAIL: 'text-purple-600 bg-purple-50',
  VOICE: 'text-orange-600 bg-orange-50',
};

const CHANNEL_LABELS: Record<string, string> = {
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  VOICE: 'Voice Call',
};

export function MessagingSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin-dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Admin
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquareIcon className="h-6 w-6 text-brand" />
          Messaging Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure SMS, WhatsApp, Email, and Voice providers for campaign messaging.
        </p>
      </div>

      <MessagingSettingsContent />
    </div>
  );
}

// Exported so SettingsPage can also use this component in its Messaging tab
export function MessagingSettingsContent() {
  const queryClient = useQueryClient();
  const [addingChannel, setAddingChannel] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState<{ provider: string; config: Record<string, string>; providerName: string }>({
    provider: '',
    config: {},
    providerName: '',
  });
  const [testDestination, setTestDestination] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});

  // Fetch all configured providers
  const { data: providersResponse, isLoading: providersLoading } = useQuery({
    queryKey: ['messaging-providers'],
    queryFn: () => messagingSettingsAPI.getAll(),
  });

  // Fetch supported providers per channel
  const { data: supportedResponse, isLoading: supportedLoading } = useQuery({
    queryKey: ['messaging-supported'],
    queryFn: () => messagingSettingsAPI.getSupported(),
  });

  const providers: any[] = providersResponse?.data?.data || [];
  const supported: Record<string, any[]> = supportedResponse?.data?.data || {};

  // Create provider mutation
  const createMutation = useMutation({
    mutationFn: (data: { channel: string; provider: string; config: any; providerName: string }) =>
      messagingSettingsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-providers'] });
      toast.success('Messaging provider added');
      setAddingChannel(null);
      setNewProvider({ provider: '', config: {}, providerName: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add provider');
    },
  });

  // Update provider mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      messagingSettingsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-providers'] });
      toast.success('Provider updated');
      setEditingId(null);
      setEditConfig({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update provider');
    },
  });

  // Delete provider mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => messagingSettingsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-providers'] });
      toast.success('Provider removed');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to remove provider');
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => messagingSettingsAPI.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-providers'] });
      toast.success('Default provider updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to set default');
    },
  });

  // Test provider mutation
  const testMutation = useMutation({
    mutationFn: ({ id, testDestination }: { id: string; testDestination: string }) =>
      messagingSettingsAPI.test(id, testDestination),
    onSuccess: () => {
      toast.success('Test message sent successfully!');
      setTestingId(null);
      setTestDestination('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Test failed');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      messagingSettingsAPI.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-providers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update provider');
    },
  });

  const isLoading = providersLoading || supportedLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  const channels = ['SMS', 'WHATSAPP', 'EMAIL', 'VOICE'];

  const getProvidersForChannel = (channel: string) =>
    providers.filter((p: any) => p.channel === channel);

  const handleAddProvider = (channel: string) => {
    if (!newProvider.provider) {
      toast.error('Please select a provider');
      return;
    }
    const channelProviders = supported[channel] || [];
    const providerDef = channelProviders.find((p: any) => p.value === newProvider.provider);
    const requiredFields = providerDef?.fields?.filter((f: any) => f.required) || [];
    const missingFields = requiredFields.filter((f: any) => !newProvider.config[f.key]);
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.map((f: any) => f.label).join(', ')}`);
      return;
    }
    createMutation.mutate({
      channel,
      provider: newProvider.provider,
      config: newProvider.config,
      providerName: newProvider.providerName || newProvider.provider,
    });
  };

  const handleStartEdit = (provider: any) => {
    setEditingId(provider.id);
    setEditConfig({ ...provider.config });
  };

  const handleSaveEdit = (id: string) => {
    updateMutation.mutate({ id, data: { config: editConfig } });
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareIcon className="h-5 w-5 text-brand" />
            Messaging Providers
          </CardTitle>
          <CardDescription>
            Configure SMS, WhatsApp, Email, and Voice providers for campaign messaging.
            Add your API keys to start sending real messages to voters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {channels.map((channel) => {
              const channelProviders = getProvidersForChannel(channel);
              const hasActive = channelProviders.some((p: any) => p.isActive);
              return (
                <div
                  key={channel}
                  className={cn(
                    'p-4 rounded-lg border text-center',
                    hasActive ? 'border-green-200 bg-green-50/50' : 'border-dashed border-muted-foreground/30'
                  )}
                >
                  <div className={cn('inline-flex p-2 rounded-full mb-2', CHANNEL_COLORS[channel])}>
                    {CHANNEL_ICONS[channel]}
                  </div>
                  <div className="font-medium text-sm">{CHANNEL_LABELS[channel]}</div>
                  <div className="mt-1">
                    {hasActive ? (
                      <Badge variant="success" className="text-xs">
                        <WifiIcon className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <WifiOffIcon className="h-3 w-3 mr-1" />
                        Mock Mode
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {channelProviders.length} provider{channelProviders.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-Channel Configuration */}
      {channels.map((channel) => {
        const channelProviders = getProvidersForChannel(channel);
        const channelSupported = supported[channel] || [];

        return (
          <Card key={channel}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-full', CHANNEL_COLORS[channel])}>
                    {CHANNEL_ICONS[channel]}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{CHANNEL_LABELS[channel]}</CardTitle>
                    <CardDescription>
                      {channelProviders.length === 0
                        ? `No ${CHANNEL_LABELS[channel]} provider configured. Messages will be logged to console (mock mode).`
                        : `${channelProviders.length} provider${channelProviders.length !== 1 ? 's' : ''} configured`}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddingChannel(addingChannel === channel ? null : channel);
                    setNewProvider({ provider: '', config: {}, providerName: '' });
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Provider
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Existing Providers */}
              {channelProviders.map((prov: any) => (
                <div
                  key={prov.id}
                  className={cn(
                    'border rounded-lg p-4',
                    prov.isDefault && 'border-brand/50 bg-brand-muted/10'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{prov.providerName || prov.provider}</span>
                        {prov.isDefault && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                        <Badge
                          variant={prov.isActive ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {prov.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Provider: {prov.provider}
                      </p>

                      {/* Config display (masked) */}
                      {editingId === prov.id ? (
                        <div className="mt-3 space-y-3">
                          {Object.keys(prov.config).map((key: string) => (
                            <div key={key} className="space-y-1">
                              <Label className="text-xs">{key}</Label>
                              <Input
                                size={1}
                                placeholder={`Enter ${key}`}
                                value={editConfig[key] || ''}
                                onChange={(e) => setEditConfig({ ...editConfig, [key]: e.target.value })}
                                className="text-sm"
                              />
                            </div>
                          ))}
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(prov.id)}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-1" /> : <SaveIcon className="h-4 w-4 mr-1" />}
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          {Object.entries(prov.config).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center gap-1">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-mono truncate max-w-[150px]">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={prov.isActive}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: prov.id, isActive: checked })
                        }
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  {editingId !== prov.id && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      {!prov.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(prov.id)}
                          disabled={setDefaultMutation.isPending}
                        >
                          Set as Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(prov)}
                      >
                        Edit Config
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTestingId(testingId === prov.id ? null : prov.id);
                          setTestDestination('');
                        }}
                      >
                        <TestTubeIcon className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Remove ${prov.providerName || prov.provider} provider?`)) {
                            deleteMutation.mutate(prov.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Test message form */}
                  {testingId === prov.id && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">
                            {channel === 'EMAIL' ? 'Test Email Address' : 'Test Phone Number'}
                          </Label>
                          <Input
                            placeholder={channel === 'EMAIL' ? 'test@example.com' : '+91XXXXXXXXXX'}
                            value={testDestination}
                            onChange={(e) => setTestDestination(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => testMutation.mutate({ id: prov.id, testDestination })}
                          disabled={testMutation.isPending || !testDestination}
                        >
                          {testMutation.isPending ? (
                            <Loader2Icon className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <SendIcon className="h-4 w-4 mr-1" />
                          )}
                          Send Test
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* No providers message */}
              {channelProviders.length === 0 && addingChannel !== channel && (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                  <WifiOffIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm">No provider configured</p>
                  <p className="text-xs mt-1">Messages will be logged to console (mock mode)</p>
                </div>
              )}

              {/* Add New Provider Form */}
              {addingChannel === channel && (
                <div className="border-2 border-dashed border-brand/30 rounded-lg p-4 bg-brand-muted/5">
                  <h4 className="font-medium text-sm mb-3">Add {CHANNEL_LABELS[channel]} Provider</h4>

                  <div className="space-y-4">
                    {/* Provider Select */}
                    <div className="space-y-1">
                      <Label className="text-sm">Provider</Label>
                      <Select
                        value={newProvider.provider}
                        onValueChange={(v) => {
                          setNewProvider({ provider: v, config: {}, providerName: v });
                        }}
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {channelSupported.map((p: any) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dynamic Config Fields */}
                    {newProvider.provider && (() => {
                      const providerDef = channelSupported.find((p: any) => p.value === newProvider.provider);
                      const fields = providerDef?.fields || [];
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fields.map((field: any) => (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-sm">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              <Input
                                type={field.type === 'password' ? 'password' : 'text'}
                                placeholder={field.placeholder || `Enter ${field.label}`}
                                value={newProvider.config[field.key] || ''}
                                onChange={(e) =>
                                  setNewProvider({
                                    ...newProvider,
                                    config: { ...newProvider.config, [field.key]: e.target.value },
                                  })
                                }
                                className="text-sm"
                              />
                              {field.description && (
                                <p className="text-xs text-muted-foreground">{field.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Display Name */}
                    {newProvider.provider && (
                      <div className="space-y-1">
                        <Label className="text-sm">Display Name (Optional)</Label>
                        <Input
                          placeholder={`e.g. My ${newProvider.provider} Account`}
                          value={newProvider.providerName}
                          onChange={(e) => setNewProvider({ ...newProvider, providerName: e.target.value })}
                          className="text-sm max-w-xs"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddProvider(channel)}
                        disabled={createMutation.isPending || !newProvider.provider}
                      >
                        {createMutation.isPending ? (
                          <Loader2Icon className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <PlusIcon className="h-4 w-4 mr-1" />
                        )}
                        Add Provider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAddingChannel(null);
                          setNewProvider({ provider: '', config: {}, providerName: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Help Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-50 rounded-full">
              <AlertTriangleIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium">How Messaging Providers Work</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>Without a configured provider, messages are logged to console (mock mode) - useful for testing.</li>
                <li>Add your API keys from Twilio, MSG91, Gupshup, SendGrid, or custom SMTP to start sending real messages.</li>
                <li>Each channel (SMS, WhatsApp, Email, Voice) can have its own provider.</li>
                <li>The "Default" provider per channel is used for campaign messages.</li>
                <li>Use the "Test" button to verify your configuration before sending campaigns.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
