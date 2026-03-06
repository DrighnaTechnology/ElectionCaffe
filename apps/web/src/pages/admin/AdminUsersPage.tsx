import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { organizationAPI } from '../../services/api';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { Spinner } from '../../components/ui/spinner';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatDate, getInitials } from '../../lib/utils';
import { toast } from 'sonner';
import {
  UsersIcon,
  SearchIcon,
  UserPlusIcon,
  ClockIcon,
  PencilIcon,
  Trash2Icon,
  BanIcon,
  UserCheckIcon,
  CheckCircleIcon,
  CopyIcon,
} from 'lucide-react';

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
};

export function AdminUsersPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [createdUserResult, setCreatedUserResult] = useState<{
    user: any;
    tempPassword: string;
    loginUrl: string;
  } | null>(null);

  // Fetch custom roles
  const { data: customRolesData } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: () => organizationAPI.getCustomRoles(),
  });
  const allCustomRoles: { id: string; slug: string; name: string; description?: string }[] =
    (customRolesData as any)?.data?.data?.customRoles || [];

  // Fetch admin context (hierarchy capabilities)
  const { data: adminContextData } = useQuery({
    queryKey: ['admin-context'],
    queryFn: () => organizationAPI.getAdminContext(),
    staleTime: 5 * 60 * 1000,
  });
  const adminContext = (adminContextData as any)?.data?.data || {};
  const { isOwner, canDeleteUsers, canAssignFullAdmin } = adminContext;

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      organizationAPI.updateUser(userId, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update user');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      organizationAPI.updateUserStatus(userId, status),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update status');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => organizationAPI.deleteUser(userId),
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeletingUser(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete user');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (userIds: string[]) => organizationAPI.bulkDeleteUsers(userIds),
    onSuccess: (res) => {
      const count = res?.data?.data?.deletedCount ?? selectedUserIds.size;
      toast.success(`${count} user(s) deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUserIds(new Set());
      setShowBulkDeleteConfirm(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete users');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName?: string; email?: string; mobile: string; customRoleId?: string }) =>
      organizationAPI.createUser(data),
    onSuccess: (res) => {
      const result = res?.data?.data;
      setCreatedUserResult(result);
      setShowCreateUserDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create user');
    },
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', searchQuery, roleFilter, page],
    queryFn: () =>
      organizationAPI.getUsers({
        page,
        limit: 20,
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      }),
  });

  const users = usersData?.data?.data?.data || [];
  const pagination = usersData?.data?.data?.pagination;

  const selectableUsers = users.filter((u: any) => u.id !== user?.id);
  const allSelectableSelected = selectableUsers.length > 0 && selectableUsers.every((u: any) => selectedUserIds.has(u.id));
  const someSelected = selectedUserIds.size > 0;

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUsers.map((u: any) => u.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage users and their access
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateUserDialog(true)}>
          <UserPlusIcon className="h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or mobile..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="FULL_ADMIN">Full Admin</SelectItem>
                {allCustomRoles.map((cr) => (
                  <SelectItem key={cr.id} value={`customrole:${cr.id}`}>{cr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {usersLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <>
              {/* Bulk Action Bar */}
              {canDeleteUsers && someSelected && (
                <div className="flex items-center justify-between p-3 mb-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedUserIds(new Set())}>
                      Clear
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      {canDeleteUsers && (
                      <th className="pb-3 pr-3 w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-muted-foreground/30 cursor-pointer accent-brand"
                          checked={allSelectableSelected}
                          onChange={toggleSelectAll}
                          title="Select all"
                        />
                      </th>
                      )}
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Login</th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((u: any) => {
                      const isSelf = u.id === user?.id;
                      const isTargetFullAdmin = !u.customRoleId && !u.customRole;
                      const canEditThisUser = isOwner || (!isTargetFullAdmin && !isSelf);
                      const canBlockThisUser = isOwner || (!isTargetFullAdmin && !isSelf);
                      return (
                        <tr key={u.id} className={`group transition-colors cursor-pointer ${selectedUserIds.has(u.id) ? 'bg-destructive/5' : 'hover:bg-muted/30'}`} onClick={() => navigate(`/admin-dashboard/users/${u.id}`)}>
                          {canDeleteUsers && (
                          <td className="py-3 pr-3 w-10" onClick={(e) => e.stopPropagation()}>
                            {!isSelf ? (
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-muted-foreground/30 cursor-pointer accent-brand"
                                checked={selectedUserIds.has(u.id)}
                                onChange={() => toggleSelectUser(u.id)}
                              />
                            ) : <div className="h-4 w-4" />}
                          </td>
                          )}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-brand-muted flex items-center justify-center text-xs font-bold text-brand flex-shrink-0">
                                {u.profilePhotoUrl ? (
                                  <img src={u.profilePhotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                                ) : (
                                  getInitials(`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'U')
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-brand hover:underline">
                                  {u.firstName} {u.lastName || ''}
                                  {isSelf && (
                                    <span className="text-xs text-muted-foreground ml-1">(You)</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm">{u.mobile}</p>
                            {u.email && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={u.customRole ? 'secondary' : 'destructive'}>
                              {u.customRole ? u.customRole.name : 'Full Admin'}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={STATUS_VARIANT[u.status] || 'secondary'}>{u.status}</Badge>
                          </td>
                          <td className="py-3 pr-4">
                            {u.lastLoginAt ? (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <ClockIcon className="h-3 w-3" />
                                {formatDate(u.lastLoginAt)}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Never</span>
                            )}
                          </td>
                          <td className="py-3" onClick={(e) => e.stopPropagation()}>
                            {!isSelf && (
                              <div className="flex items-center justify-end gap-1">
                                {canEditThisUser && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit user" onClick={() => setEditingUser(u)}>
                                    <PencilIcon className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {canBlockThisUser && (
                                  u.status === 'ACTIVE' ? (
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700" title="Block user" onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'BLOCKED' })}>
                                      <BanIcon className="h-3.5 w-3.5" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700" title="Activate user" onClick={() => updateStatusMutation.mutate({ userId: u.id, status: 'ACTIVE' })}>
                                      <UserCheckIcon className="h-3.5 w-3.5" />
                                    </Button>
                                  )
                                )}
                                {canDeleteUsers && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Delete user" onClick={() => setDeletingUser(u)}>
                                    <Trash2Icon className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * (pagination.limit || 20) + 1} -{' '}
                    {Math.min(page * (pagination.limit || 20), pagination.total)} of{' '}
                    {pagination.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onSave={(data) => updateUserMutation.mutate({ userId: editingUser.id, data })}
          isPending={updateUserMutation.isPending}
          customRoles={allCustomRoles}
          canAssignFullAdmin={canAssignFullAdmin || false}
        />
      )}

      {/* Create User Dialog */}
      <CreateUserDialog
        open={showCreateUserDialog}
        onOpenChange={setShowCreateUserDialog}
        onSubmit={(data) => createUserMutation.mutate(data)}
        isPending={createUserMutation.isPending}
        customRoles={allCustomRoles}
        canAssignFullAdmin={canAssignFullAdmin || false}
      />

      {/* Created User Success Dialog */}
      {createdUserResult && (
        <CreatedUserSuccessDialog
          open={!!createdUserResult}
          onOpenChange={(open) => !open && setCreatedUserResult(null)}
          result={createdUserResult}
          onViewUser={(id) => navigate(`/admin-dashboard/users/${id}`)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingUser && (
        <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2Icon className="h-5 w-5" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deletingUser.firstName} {deletingUser.lastName || ''}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDeletingUser(null)}>Cancel</Button>
              <Button variant="destructive" disabled={deleteUserMutation.isPending} onClick={() => deleteUserMutation.mutate(deletingUser.id)}>
                {deleteUserMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2Icon className="h-5 w-5" />
              Delete {selectedUserIds.size} User{selectedUserIds.size > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedUserIds.size}</strong> selected user{selectedUserIds.size > 1 ? 's' : ''}?
              This action cannot be undone and all their data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" disabled={bulkDeleteMutation.isPending} onClick={() => bulkDeleteMutation.mutate(Array.from(selectedUserIds))}>
              {bulkDeleteMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Delete {selectedUserIds.size} User{selectedUserIds.size > 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Edit User Dialog ====================

function EditUserDialog({
  user: editUser,
  open,
  onOpenChange,
  onSave,
  isPending,
  customRoles,
  canAssignFullAdmin,
}: {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  isPending: boolean;
  customRoles: { id: string; slug: string; name: string }[];
  canAssignFullAdmin: boolean;
}) {
  const [firstName, setFirstName] = useState(editUser.firstName || '');
  const [lastName, setLastName] = useState(editUser.lastName || '');
  const [email, setEmail] = useState(editUser.email || '');
  const [mobile, setMobile] = useState(editUser.mobile || '');
  const [customRoleId, setCustomRoleId] = useState(editUser.customRoleId || (canAssignFullAdmin ? '__none__' : (customRoles[0]?.id || '__none__')));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!mobile.trim()) {
      toast.error('Mobile is required');
      return;
    }
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      customRoleId: customRoleId === '__none__' ? null : customRoleId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilIcon className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update details for {editUser.firstName} {editUser.lastName || ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input id="edit-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input id="edit-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-mobile">Mobile</Label>
            <Input id="edit-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <Select value={customRoleId} onValueChange={setCustomRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {canAssignFullAdmin && (
                  <SelectItem value="__none__">Full Admin Access</SelectItem>
                )}
                {customRoles.map((cr) => (
                  <SelectItem key={cr.id} value={cr.id}>{cr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Create User Dialog ====================

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  customRoles,
  canAssignFullAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { firstName: string; lastName?: string; email?: string; mobile: string; customRoleId?: string }) => void;
  isPending: boolean;
  customRoles: { id: string; slug: string; name: string }[];
  canAssignFullAdmin: boolean;
}) {
  const defaultRole = canAssignFullAdmin ? '__none__' : (customRoles[0]?.id || '__none__');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [customRoleId, setCustomRoleId] = useState(defaultRole);

  useEffect(() => {
    if (open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setMobile('');
      setCustomRoleId(canAssignFullAdmin ? '__none__' : (customRoles[0]?.id || '__none__'));
    }
  }, [open, canAssignFullAdmin, customRoles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!mobile.trim()) {
      toast.error('Mobile number is required');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      toast.error('Invalid mobile number. Must be a 10-digit Indian mobile number starting with 6-9.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Invalid email address');
      return;
    }
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      mobile: mobile.trim(),
      customRoleId: customRoleId === '__none__' ? undefined : customRoleId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            A temporary password will be generated. Share the login URL and password with the user.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Enter first name" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Enter last name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mobile Number *</Label>
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="e.g. 9876543210"
              maxLength={10}
            />
            {mobile && !/^[6-9]\d{9}$/.test(mobile) && (
              <p className="text-xs text-destructive">Must be a 10-digit number starting with 6-9</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={customRoleId} onValueChange={setCustomRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {canAssignFullAdmin && (
                  <SelectItem value="__none__">Full Admin Access</SelectItem>
                )}
                {customRoles.map((cr) => (
                  <SelectItem key={cr.id} value={cr.id}>{cr.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {canAssignFullAdmin
                ? 'Users without a custom role get full admin access. Assign a role to restrict features.'
                : 'Select a role to define what features this user can access.'}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Create User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Created User Success Dialog ====================

function CreatedUserSuccessDialog({
  open,
  onOpenChange,
  result,
  onViewUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: { user: any; tempPassword: string; loginUrl: string };
  onViewUser?: (userId: string) => void;
}) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircleIcon className="h-5 w-5" />
            User Created Successfully
          </DialogTitle>
          <DialogDescription>
            Share the following credentials with <strong>{result.user.firstName}</strong>.
            The temporary password will NOT be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-900">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1.5">Login URL</p>
            <div className="flex items-center gap-2">
              <code className="text-sm flex-1 break-all">{result.loginUrl}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.loginUrl, 'Login URL')}>
                <CopyIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:border-amber-900">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5">Mobile / Username</p>
            <div className="flex items-center gap-2">
              <code className="text-sm flex-1">{result.user.mobile}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.user.mobile, 'Mobile')}>
                <CopyIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/30 dark:border-red-900">
            <p className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1.5">Temporary Password (shown once)</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono flex-1 break-all">{result.tempPassword}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(result.tempPassword, 'Password')}>
                <CopyIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              const text = `Login URL: ${result.loginUrl}\nMobile: ${result.user.mobile}\nTemporary Password: ${result.tempPassword}\n\nPlease change your password on first login.`;
              copyToClipboard(text, 'All credentials');
            }}
          >
            <CopyIcon className="h-4 w-4 mr-2" />
            Copy All Credentials
          </Button>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          {onViewUser && (
            <Button variant="outline" onClick={() => { onOpenChange(false); onViewUser(result.user.id); }}>
              View User
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
