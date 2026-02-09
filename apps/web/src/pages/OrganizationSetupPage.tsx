import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationAPI } from '../services/api';
import { useAuthStore } from '../store/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  BuildingIcon,
  UsersIcon,
  ShieldIcon,
  SearchIcon,
  SaveIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
} from 'lucide-react';
import { getInitials } from '../lib/utils';
import { toast } from 'sonner';

interface Feature {
  key: string;
  label: string;
  category: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  mobile: string;
  role: string;
  status: string;
  profilePhotoUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  TENANT_ADMIN: 'Tenant Admin',
  CENTRAL_ADMIN: 'Central Admin',
  CENTRAL_CAMPAIGN_TEAM: 'Central Campaign Team',
  CONSTITUENCY_ADMIN: 'Constituency Admin',
  CAMPAIGN_MANAGER: 'Campaign Manager',
  COORDINATOR: 'Coordinator',
  SECTOR_OFFICER: 'Sector Officer',
  BOOTH_INCHARGE: 'Booth Incharge',
  VOLUNTEER: 'Volunteer',
  AGENT: 'Agent',
  POLLING_AGENT: 'Polling Agent',
  COUNTING_AGENT: 'Counting Agent',
  CANDIDATE: 'Candidate',
  CANDIDATE_ADMIN: 'Candidate Admin',
  EMC_ADMIN: 'EMC Admin',
  EMC_MANAGER: 'EMC Manager',
  EMC_OPERATOR: 'EMC Operator',
};

export function OrganizationSetupPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('role-features');
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, { role: string; featureKey: string; isEnabled: boolean }>
  >(new Map());
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userPage, setUserPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  // Check if user has admin access
  const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN'];
  const hasAdminAccess = user && allowedRoles.includes(user.role);

  // Fetch role-feature matrix
  const { data: roleFeaturesData, isLoading: isLoadingRoleFeatures } = useQuery({
    queryKey: ['role-features'],
    queryFn: () => organizationAPI.getRoleFeatures(),
    enabled: !!hasAdminAccess,
  });

  // Fetch users
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['organization-users', userSearch, userRoleFilter, userPage],
    queryFn: () =>
      organizationAPI.getUsers({
        search: userSearch || undefined,
        role: userRoleFilter !== 'all' ? userRoleFilter : undefined,
        page: userPage,
        limit: 10,
      }),
    enabled: !!hasAdminAccess,
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (updates: { role: string; featureKey: string; isEnabled: boolean }[]) =>
      organizationAPI.bulkUpdateRoleFeatures(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-features'] });
      setPendingChanges(new Map());
      toast.success('All changes saved successfully');
    },
    onError: () => {
      toast.error('Failed to save changes');
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      organizationAPI.updateUserRole(data.userId, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole('');
      toast.success('User role updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user role');
    },
  });

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
            <CardDescription className="text-center">
              Only administrators can access organization setup.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const matrix = (roleFeaturesData as any)?.data?.data?.matrix || {};
  const features: Feature[] = (roleFeaturesData as any)?.data?.data?.features || [];
  const roles: string[] = (roleFeaturesData as any)?.data?.data?.roles || [];

  const users: User[] = (usersData as any)?.data?.data?.data || [];
  const pagination = (usersData as any)?.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const handleFeatureToggle = (role: string, featureKey: string, currentValue: boolean) => {
    const key = `${role}-${featureKey}`;
    const newValue = !currentValue;

    setPendingChanges((prev) => {
      const updated = new Map(prev);
      updated.set(key, { role, featureKey, isEnabled: newValue });
      return updated;
    });
  };

  const getFeatureValue = (role: string, featureKey: string): boolean => {
    const key = `${role}-${featureKey}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!.isEnabled;
    }
    return matrix[role]?.[featureKey] ?? true;
  };

  const handleSaveAllChanges = () => {
    const updates = Array.from(pendingChanges.values());
    if (updates.length > 0) {
      bulkUpdateMutation.mutate(updates);
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setIsRoleDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (selectedUser && selectedRole) {
      updateUserRoleMutation.mutate({
        userId: selectedUser.id,
        role: selectedRole,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <BuildingIcon className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Organization Setup</h1>
          <p className="text-muted-foreground">
            Configure role-based feature access and manage user roles
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="role-features" className="flex items-center gap-2">
            <ShieldIcon className="h-4 w-4" />
            Role Features
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            User Management
          </TabsTrigger>
        </TabsList>

        {/* Role-Features Tab */}
        <TabsContent value="role-features" className="space-y-4">
          {pendingChanges.size > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-orange-800">
                    You have {pendingChanges.size} unsaved change(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDiscardChanges}
                    >
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveAllChanges}
                      disabled={bulkUpdateMutation.isPending}
                    >
                      {bulkUpdateMutation.isPending ? (
                        <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <SaveIcon className="h-4 w-4 mr-2" />
                      )}
                      Save All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoadingRoleFeatures ? (
            <Card>
              <CardContent className="py-10">
                <div className="flex items-center justify-center">
                  <LoaderIcon className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Feature Access Matrix</CardTitle>
                <CardDescription>
                  Configure which features are visible to each role. Toggle checkboxes to
                  enable/disable features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white min-w-[180px]">
                          Role
                        </TableHead>
                        {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                          <TableHead
                            key={category}
                            colSpan={categoryFeatures.length}
                            className="text-center border-l"
                          >
                            {category}
                          </TableHead>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white"></TableHead>
                        {features.map((feature) => (
                          <TableHead
                            key={feature.key}
                            className="text-center text-xs px-2 min-w-[80px]"
                          >
                            {feature.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role}>
                          <TableCell className="sticky left-0 bg-white font-medium">
                            {ROLE_LABELS[role] || role}
                          </TableCell>
                          {features.map((feature) => {
                            const isEnabled = getFeatureValue(role, feature.key);
                            const key = `${role}-${feature.key}`;
                            const hasChange = pendingChanges.has(key);
                            return (
                              <TableCell
                                key={feature.key}
                                className={`text-center ${hasChange ? 'bg-orange-50' : ''}`}
                              >
                                <Checkbox
                                  checked={isEnabled}
                                  onCheckedChange={() =>
                                    handleFeatureToggle(role, feature.key, isEnabled)
                                  }
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage user roles within your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={userRoleFilter}
                  onValueChange={(value) => {
                    setUserRoleFilter(value);
                    setUserPage(1);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role] || role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['organization-users'] })}
                >
                  <RefreshCwIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Users Table */}
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-10">
                  <LoaderIcon className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-orange-100 text-orange-600 text-xs">
                                    {getInitials(`${u.firstName} ${u.lastName || ''}`)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {u.firstName} {u.lastName}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{u.mobile}</p>
                                {u.email && (
                                  <p className="text-muted-foreground">{u.email}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {ROLE_LABELS[u.role] || u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}
                              >
                                {u.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRoleDialog(u)}
                                disabled={u.id === user?.id}
                              >
                                Change Role
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {users.length} of {pagination.total} users
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                          disabled={userPage === 1}
                        >
                          <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {userPage} of {pagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setUserPage((p) => Math.min(pagination.totalPages, p + 1))
                          }
                          disabled={userPage === pagination.totalPages}
                        >
                          <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-orange-100 text-orange-600">
                  {selectedUser
                    ? getInitials(`${selectedUser.firstName} ${selectedUser.lastName || ''}`)
                    : ''}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{selectedUser?.mobile}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select New Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role] || role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={
                updateUserRoleMutation.isPending ||
                selectedRole === selectedUser?.role
              }
            >
              {updateUserRoleMutation.isPending ? (
                <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
