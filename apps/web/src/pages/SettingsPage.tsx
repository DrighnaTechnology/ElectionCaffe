import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';
import { authAPI, tenantAPI, aiAdminAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '../components/ui/spinner';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  UserIcon,
  LockIcon,
  BellIcon,
  PaletteIcon,
  ShieldIcon,
  SaveIcon,
  KeyIcon,
  UsersIcon,
  FileTextIcon,
  DownloadIcon,
  BookOpenIcon,
  PrinterIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  BuildingIcon,
  GlobeIcon,
  CopyIcon,
  SparklesIcon,
  CoinsIcon,
  BrainIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getInitials, cn } from '../lib/utils';

export function SettingsPage() {
  const { user, setAuth } = useAuthStore();
  const { branding, fetchBranding } = useTenantStore();
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [brandingData, setBrandingData] = useState({
    displayName: '',
    organizationName: '',
    logoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    faviconUrl: '',
    partyName: '',
    partySymbolUrl: '',
    customDomain: '',
  });

  // Check if user is admin (can edit branding)
  const isAdmin = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'].includes(user?.role || '');

  // Initialize branding form data when branding loads
  useEffect(() => {
    if (branding) {
      setBrandingData({
        displayName: branding.displayName || '',
        organizationName: branding.organizationName || '',
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor || '',
        secondaryColor: branding.secondaryColor || '',
        faviconUrl: branding.faviconUrl || '',
        partyName: branding.partyName || '',
        partySymbolUrl: branding.partySymbolUrl || '',
        customDomain: branding.customDomain || '',
      });
    }
  }, [branding]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    campaignUpdates: true,
    voterAlerts: true,
    reportReady: true,
  });
  const [appearance, setAppearance] = useState({
    theme: 'system',
    language: 'en',
  });
  const [slipSettings, setSlipSettings] = useState({
    template: 'standard',
    showPhoto: false,
    showQRCode: true,
    showAddress: true,
    paperSize: 'a4',
  });

  const { data: profileResponse } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authAPI.getProfile(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: () => authAPI.updateProfile(profileData),
    onSuccess: (response) => {
      const updatedUser = response.data.data;
      setAuth(updatedUser, useAuthStore.getState().accessToken!, useAuthStore.getState().refreshToken!);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authAPI.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      ),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to change password');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.firstName) {
      toast.error('First name is required');
      return;
    }
    updateProfileMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate();
  };

  const updateBrandingMutation = useMutation({
    mutationFn: (data: typeof brandingData) => tenantAPI.updateBranding(data),
    onSuccess: (response) => {
      if (response.data.success) {
        fetchBranding(); // Refresh branding data
        toast.success('Branding settings updated successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update branding settings');
    },
  });

  const handleBrandingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrandingMutation.mutate(brandingData);
  };

  const profile = profileResponse?.data?.data || user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <LockIcon className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="authentication" className="flex items-center gap-2">
            <KeyIcon className="h-4 w-4" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="slip-box" className="flex items-center gap-2">
            <PrinterIcon className="h-4 w-4" />
            Slip Box
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <BellIcon className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <PaletteIcon className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center gap-2">
            <DownloadIcon className="h-4 w-4" />
            Downloads
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <DatabaseIcon className="h-4 w-4" />
            Database
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="ai-features" className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              AI Features
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <BuildingIcon className="h-4 w-4" />
              Branding
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="bg-orange-100 text-orange-600 text-2xl">
                    {profile ? getInitials(`${profile.firstName} ${profile.lastName || ''}`) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">
                  {profile?.firstName} {profile?.lastName}
                </h3>
                <p className="text-gray-500">{profile?.mobile}</p>
                {profile?.email && <p className="text-sm text-gray-400">{profile.email}</p>}
                <Badge variant="outline" className="mt-2">
                  {profile?.role}
                </Badge>
              </CardContent>
            </Card>

            {/* Edit Profile Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input id="mobile" value={profile?.mobile || ''} disabled />
                    <p className="text-xs text-gray-500">Mobile number cannot be changed</p>
                  </div>
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <SaveIcon className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Authentication Tab */}
        <TabsContent value="authentication">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyIcon className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">SMS Authentication</p>
                    <p className="text-sm text-gray-500">Receive a code via SMS when logging in</p>
                  </div>
                  <Switch checked={false} />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-gray-500">Use an authenticator app like Google Authenticator</p>
                  </div>
                  <Switch checked={false} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Manage your active login sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Current Session</p>
                      <p className="text-sm text-green-600">This device • Active now</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
                <Button variant="outline" className="mt-4">
                  Sign out all other sessions
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                Role & Permissions
              </CardTitle>
              <CardDescription>View your current role and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <ShieldIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{profile?.role || 'User'}</p>
                      <p className="text-sm text-gray-500">Your current role</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Permissions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['View Dashboard', 'Manage Voters', 'Manage Parts', 'View Reports', 'Manage Cadres', 'View Analytics'].map((permission) => (
                      <div key={permission} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm">{permission}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Contact your administrator to request role changes or additional permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slip Box Tab */}
        <TabsContent value="slip-box">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PrinterIcon className="h-5 w-5" />
                  Voter Slip Configuration
                </CardTitle>
                <CardDescription>Configure voter slip printing preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Slip Template</Label>
                  <Select value={slipSettings.template} onValueChange={(v) => setSlipSettings({ ...slipSettings, template: v })}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Template</SelectItem>
                      <SelectItem value="compact">Compact Template (4 per page)</SelectItem>
                      <SelectItem value="detailed">Detailed Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Paper Size</Label>
                  <Select value={slipSettings.paperSize} onValueChange={(v) => setSlipSettings({ ...slipSettings, paperSize: v })}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label>Slip Content Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Show Voter Photo</p>
                        <p className="text-sm text-gray-500">Include voter photo placeholder on slip</p>
                      </div>
                      <Switch
                        checked={slipSettings.showPhoto}
                        onCheckedChange={(checked) => setSlipSettings({ ...slipSettings, showPhoto: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Show QR Code</p>
                        <p className="text-sm text-gray-500">Include scannable QR code</p>
                      </div>
                      <Switch
                        checked={slipSettings.showQRCode}
                        onCheckedChange={(checked) => setSlipSettings({ ...slipSettings, showQRCode: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Show Full Address</p>
                        <p className="text-sm text-gray-500">Include complete voter address</p>
                      </div>
                      <Switch
                        checked={slipSettings.showAddress}
                        onCheckedChange={(checked) => setSlipSettings({ ...slipSettings, showAddress: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Button>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Save Slip Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Delivery Channels</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive updates via email</p>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-gray-500">Receive browser notifications</p>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-gray-500">Receive important updates via SMS</p>
                      </div>
                      <Switch
                        checked={notifications.sms}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Notification Types</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Campaign Updates</p>
                        <p className="text-sm text-gray-500">Updates about campaign activities</p>
                      </div>
                      <Switch
                        checked={notifications.campaignUpdates}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, campaignUpdates: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Voter Alerts</p>
                        <p className="text-sm text-gray-500">Important alerts about voter data</p>
                      </div>
                      <Switch
                        checked={notifications.voterAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, voterAlerts: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Report Ready</p>
                        <p className="text-sm text-gray-500">Notifications when reports are generated</p>
                      </div>
                      <Switch
                        checked={notifications.reportReady}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, reportReady: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how ElectionCaffe looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-base">Theme</Label>
                  <p className="text-sm text-gray-500 mb-3">Select your preferred theme</p>
                  <div className="grid grid-cols-3 gap-4 max-w-lg">
                    <div
                      className={cn(
                        'p-4 border-2 rounded-lg cursor-pointer transition-all bg-white',
                        appearance.theme === 'light' ? 'border-orange-500' : 'border-gray-200 hover:border-orange-300'
                      )}
                      onClick={() => setAppearance({ ...appearance, theme: 'light' })}
                    >
                      <div className="h-16 bg-gray-100 rounded mb-2 flex items-center justify-center">
                        <SunIcon className="h-6 w-6 text-yellow-500" />
                      </div>
                      <p className="text-sm font-medium text-center">Light</p>
                    </div>
                    <div
                      className={cn(
                        'p-4 border-2 rounded-lg cursor-pointer transition-all bg-gray-900',
                        appearance.theme === 'dark' ? 'border-orange-500' : 'border-gray-700 hover:border-orange-300'
                      )}
                      onClick={() => setAppearance({ ...appearance, theme: 'dark' })}
                    >
                      <div className="h-16 bg-gray-700 rounded mb-2 flex items-center justify-center">
                        <MoonIcon className="h-6 w-6 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-center text-white">Dark</p>
                    </div>
                    <div
                      className={cn(
                        'p-4 border-2 rounded-lg cursor-pointer transition-all',
                        appearance.theme === 'system' ? 'border-orange-500' : 'border-gray-200 hover:border-orange-300'
                      )}
                      onClick={() => setAppearance({ ...appearance, theme: 'system' })}
                    >
                      <div className="h-16 bg-gradient-to-b from-gray-100 to-gray-700 rounded mb-2 flex items-center justify-center">
                        <MonitorIcon className="h-6 w-6 text-gray-600" />
                      </div>
                      <p className="text-sm font-medium text-center">System</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base">Language</Label>
                  <p className="text-sm text-gray-500 mb-3">Select your preferred language</p>
                  <Select value={appearance.language} onValueChange={(v) => setAppearance({ ...appearance, language: v })}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                      <SelectItem value="mr">Marathi (मराठी)</SelectItem>
                      <SelectItem value="gu">Gujarati (ગુજરાતી)</SelectItem>
                      <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                      <SelectItem value="te">Telugu (తెలుగు)</SelectItem>
                      <SelectItem value="kn">Kannada (ಕನ್ನಡ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Downloads Tab */}
        <TabsContent value="downloads">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DownloadIcon className="h-5 w-5" />
                Download History
              </CardTitle>
              <CardDescription>View and manage your generated reports and downloads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <DownloadIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No downloads yet</p>
                  <p className="text-sm">Generated reports and exports will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="h-5 w-5" />
                Data Export
              </CardTitle>
              <CardDescription>Export your data in various formats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <FileTextIcon className="h-8 w-8 text-green-600 mb-2" />
                  <h4 className="font-medium">Voter Data</h4>
                  <p className="text-sm text-gray-500 mb-3">Export all voter records</p>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <FileTextIcon className="h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-medium">Parts Data</h4>
                  <p className="text-sm text-gray-500 mb-3">Export all booth/part records</p>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <FileTextIcon className="h-8 w-8 text-purple-600 mb-2" />
                  <h4 className="font-medium">Cadre Data</h4>
                  <p className="text-sm text-gray-500 mb-3">Export all cadre records</p>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseIcon className="h-5 w-5" />
                Database Configuration
              </CardTitle>
              <CardDescription>Configure and manage your organization's database connection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-6 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <DatabaseIcon className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">Database Settings</h3>
                      <p className="text-gray-600 mb-4">
                        Configure your PostgreSQL database connection settings. You can set up your own dedicated database
                        or use the platform's shared database infrastructure.
                      </p>
                      <Link to="/settings/database">
                        <Button>
                          <ExternalLinkIcon className="h-4 w-4 mr-2" />
                          Open Database Settings
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Dedicated Database</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Set up your own PostgreSQL database for complete data isolation and control.
                    </p>
                    <Badge variant="outline">Self-Managed</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Shared Database</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Use the platform's shared database with logical separation (schema-based).
                    </p>
                    <Badge variant="outline">Platform Managed</Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Note: Database configuration changes may require administrator approval depending on your organization's settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Features Tab */}
        {isAdmin && (
          <TabsContent value="ai-features">
            <AIFeaturesTab />
          </TabsContent>
        )}

        {/* Branding Tab */}
        {isAdmin && (
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BuildingIcon className="h-5 w-5" />
                  Organization Branding
                </CardTitle>
                <CardDescription>Customize your organization's branding and display settings</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBrandingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        placeholder="My Organization"
                        value={brandingData.displayName}
                        onChange={(e) => setBrandingData({ ...brandingData, displayName: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">This name appears in the header of the application</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">Organization Name</Label>
                      <Input
                        id="organizationName"
                        placeholder="Official Organization Name"
                        value={brandingData.organizationName}
                        onChange={(e) => setBrandingData({ ...brandingData, organizationName: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Tenant URL Section */}
                  <div className="p-4 border rounded-lg bg-blue-50/50">
                    <div className="flex items-center gap-2 mb-4">
                      <GlobeIcon className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Tenant URL Settings</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="tenantUrl">System URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="tenantUrl"
                            value={branding?.tenantUrl || 'Not assigned'}
                            disabled
                            className="bg-gray-100 text-gray-600"
                          />
                          {branding?.tenantUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://${branding.tenantUrl}`);
                                toast.success('URL copied to clipboard');
                              }}
                            >
                              <CopyIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">This URL is automatically assigned by the system and cannot be changed</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customDomain">Custom Domain (Alias)</Label>
                        <Input
                          id="customDomain"
                          placeholder="your-domain.com"
                          value={brandingData.customDomain}
                          onChange={(e) => setBrandingData({ ...brandingData, customDomain: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">Set your own domain to use as an alias for the tenant URL</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://example.com/logo.png"
                        value={brandingData.logoUrl}
                        onChange={(e) => setBrandingData({ ...brandingData, logoUrl: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">URL to your organization's logo image</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faviconUrl">Favicon URL</Label>
                      <Input
                        id="faviconUrl"
                        placeholder="https://example.com/favicon.ico"
                        value={brandingData.faviconUrl}
                        onChange={(e) => setBrandingData({ ...brandingData, faviconUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          placeholder="#F97316"
                          value={brandingData.primaryColor}
                          onChange={(e) => setBrandingData({ ...brandingData, primaryColor: e.target.value })}
                        />
                        {brandingData.primaryColor && (
                          <div
                            className="w-10 h-10 rounded border"
                            style={{ backgroundColor: brandingData.primaryColor }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondaryColor"
                          placeholder="#1E293B"
                          value={brandingData.secondaryColor}
                          onChange={(e) => setBrandingData({ ...brandingData, secondaryColor: e.target.value })}
                        />
                        {brandingData.secondaryColor && (
                          <div
                            className="w-10 h-10 rounded border"
                            style={{ backgroundColor: brandingData.secondaryColor }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="partyName">Party Name</Label>
                      <Input
                        id="partyName"
                        placeholder="Political Party Name"
                        value={brandingData.partyName}
                        onChange={(e) => setBrandingData({ ...brandingData, partyName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partySymbolUrl">Party Symbol URL</Label>
                      <Input
                        id="partySymbolUrl"
                        placeholder="https://example.com/symbol.png"
                        value={brandingData.partySymbolUrl}
                        onChange={(e) => setBrandingData({ ...brandingData, partySymbolUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-3">Preview</h4>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      {brandingData.logoUrl ? (
                        <img
                          src={brandingData.logoUrl}
                          alt="Logo Preview"
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <BuildingIcon className="h-5 w-5 text-orange-600" />
                        </div>
                      )}
                      <span className="text-lg font-semibold">
                        {brandingData.displayName || branding?.name || 'Your Organization'}
                      </span>
                    </div>
                  </div>

                  <Button type="submit" disabled={updateBrandingMutation.isPending}>
                    {updateBrandingMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                    <SaveIcon className="h-4 w-4 mr-2" />
                    Save Branding Settings
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// AI Features Tab Component for Tenant Admins
function AIFeaturesTab() {
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  // Fetch AI features available to this tenant
  const { data: featuresResponse, isLoading: featuresLoading } = useQuery({
    queryKey: ['ai-admin-features'],
    queryFn: () => aiAdminAPI.getFeatures(),
  });

  // Fetch subscription/credits info
  const { data: subscriptionResponse, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['ai-subscription'],
    queryFn: () => aiAdminAPI.getSubscription(),
  });

  // Fetch credit usage
  const { data: usageResponse } = useQuery({
    queryKey: ['ai-credit-usage'],
    queryFn: () => aiAdminAPI.getCreditUsage(),
  });

  const features = featuresResponse?.data?.data || [];
  const subscription = subscriptionResponse?.data?.data;
  const usage = usageResponse?.data?.data;

  const isLoading = featuresLoading || subscriptionLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credits Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CoinsIcon className="h-5 w-5 text-orange-500" />
            AI Credits Balance
          </CardTitle>
          <CardDescription>
            Manage your organization's AI credits and monitor usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Available Credits</div>
              <div className="text-3xl font-bold text-orange-700 mt-1">
                {subscription?.credits?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-orange-500 mt-1">
                {subscription?.lowCreditsWarning && (
                  <span className="flex items-center gap-1">
                    <AlertTriangleIcon className="h-3 w-3" />
                    Low credits warning
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Credits Used (This Month)</div>
              <div className="text-3xl font-bold text-gray-700 mt-1">
                {usage?.thisMonth?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total: {usage?.allTime?.toLocaleString() || 0} all time
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 font-medium">Active AI Features</div>
              <div className="text-3xl font-bold text-gray-700 mt-1">
                {features.filter((f: any) => f.isActive).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                of {features.length} available
              </div>
            </div>
          </div>

          {subscription?.credits <= 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <XCircleIcon className="h-5 w-5" />
                <span className="font-medium">No credits available</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                Your AI credits are depleted. Contact your administrator to purchase more credits to continue using AI features.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available AI Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            Available AI Features
          </CardTitle>
          <CardDescription>
            AI features available to your organization. Control which users can access each feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <div className="text-center py-8">
              <BrainIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No AI features available</p>
              <p className="text-sm text-gray-400 mt-1">
                Contact your administrator to enable AI features for your organization.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {features.map((feature: any) => (
                <div
                  key={feature.id}
                  className="border rounded-lg p-4 hover:border-orange-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{feature.name}</h4>
                        <Badge
                          variant={feature.isActive ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {feature.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {feature.category && (
                          <Badge variant="outline" className="text-xs">
                            {feature.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {feature.description || 'No description available'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <CoinsIcon className="h-3 w-3" />
                          {feature.creditsPerUse} credits/use
                        </span>
                        <span className="flex items-center gap-1">
                          <UsersIcon className="h-3 w-3" />
                          {feature.usersWithAccess || 0} users have access
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFeature(feature)}
                    >
                      <UsersIcon className="h-4 w-4 mr-1" />
                      Manage Access
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Access Modal */}
      {selectedFeature && (
        <UserAccessModal
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}
    </div>
  );
}

// User Access Modal Component
function UserAccessModal({ feature, onClose }: { feature: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users with access info
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['ai-feature-users', feature.id],
    queryFn: () => aiAdminAPI.getUserAccess(feature.id),
  });

  const users = usersResponse?.data?.data || [];

  // Filter users based on search
  const filteredUsers = users.filter((user: any) =>
    `${user.firstName} ${user.lastName} ${user.mobile} ${user.email || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Toggle user access mutation
  const toggleAccessMutation = useMutation({
    mutationFn: ({ userId, hasAccess }: { userId: string; hasAccess: boolean }) =>
      aiAdminAPI.updateUserAccess(feature.id, userId, hasAccess),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-feature-users', feature.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-admin-features'] });
      toast.success('User access updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update access');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Manage User Access</h2>
          <p className="text-gray-500 text-sm mt-1">
            Control which users can access "{feature.name}"
          </p>
        </div>

        <div className="p-4 border-b">
          <Input
            placeholder="Search users by name, mobile, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner size="md" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No users found matching your search' : 'No users available'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        {getInitials(`${user.firstName} ${user.lastName || ''}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.mobile} {user.email && `• ${user.email}`}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.hasAccess ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-300" />
                    )}
                    <Switch
                      checked={user.hasAccess}
                      onCheckedChange={(checked) =>
                        toggleAccessMutation.mutate({ userId: user.id, hasAccess: checked })
                      }
                      disabled={toggleAccessMutation.isPending}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
