import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import { organizationAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Spinner } from '../components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { formatDate, getInitials } from '../lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  CopyIcon,
  KeyIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  SaveIcon,
  AlertTriangleIcon,
  ExternalLinkIcon,
  LinkIcon,
  Trash2Icon,
} from 'lucide-react';

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
};

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', mobile: '' });
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenResult, setRegenResult] = useState<{ tempPassword: string; loginUrl: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch user detail
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-detail', userId],
    queryFn: () => organizationAPI.getUser(userId!),
    enabled: !!userId,
  });

  // Fetch custom roles for role dropdown
  const { data: customRolesData } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: () => organizationAPI.getCustomRoles(),
  });
  const allCustomRoles: { id: string; slug: string; name: string }[] =
    (customRolesData as any)?.data?.data?.customRoles || [];

  const userData = data?.data?.data;
  const userDetail = userData?.user;
  const loginUrl = userData?.loginUrl;
  const tenantSlug = userData?.tenantSlug;
  const enabledFeatures: Record<string, boolean> = userData?.enabledFeatures || {};

  const isSelf = currentUser?.id === userId;

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: (updateData: any) => organizationAPI.updateUser(userId!, updateData),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update user');
    },
  });

  const regeneratePasswordMutation = useMutation({
    mutationFn: () => organizationAPI.regeneratePassword(userId!),
    onSuccess: (res) => {
      const result = res?.data?.data;
      setRegenResult(result);
      setShowRegenConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] });
      toast.success('Password regenerated. All sessions invalidated.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to regenerate password');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => organizationAPI.updateUserStatus(userId!, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to update status');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => organizationAPI.deleteUser(userId!),
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      navigate('/admin-dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete user');
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const startEditing = () => {
    if (!userDetail) return;
    setEditForm({
      firstName: userDetail.firstName || '',
      lastName: userDetail.lastName || '',
      email: userDetail.email || '',
      mobile: userDetail.mobile || '',
    });
    setEditRoleId(userDetail.customRoleId || '__none__');
    setIsEditing(true);
  };

  const saveEdit = () => {
    const customRoleId = editRoleId === '__none__' ? null : editRoleId;
    updateUserMutation.mutate({
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim() || undefined,
      email: editForm.email.trim() || undefined,
      mobile: editForm.mobile.trim(),
      customRoleId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/admin-dashboard')} className="gap-2">
          <ArrowLeftIcon className="h-4 w-4" /> Back to Admin Dashboard
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            User not found or you don't have access.
          </CardContent>
        </Card>
      </div>
    );
  }

  const enabledFeaturesList = Object.entries(enabledFeatures)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const disabledFeaturesList = Object.entries(enabledFeatures)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin-dashboard')} className="gap-2">
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          {!isSelf && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowRegenConfirm(true)}
              >
                <KeyIcon className="h-4 w-4" />
                Reset Password
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2Icon className="h-4 w-4" />
                Delete User
              </Button>
            </>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xl font-bold">
                {getInitials(`${userDetail.firstName} ${userDetail.lastName || ''}`)}
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {userDetail.firstName} {userDetail.lastName || ''}
                  {isSelf && <Badge variant="outline">You</Badge>}
                </CardTitle>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant={STATUS_VARIANT[userDetail.status] || 'secondary'}>
                    {userDetail.status}
                  </Badge>
                  <Badge variant={userDetail.customRole ? 'default' : 'destructive'}>
                    {userDetail.customRole?.name || 'Full Admin'}
                  </Badge>
                  {userDetail.isTempPassword && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                      Temp Password
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {!isSelf && !isEditing && (
              <Button variant="outline" size="sm" className="gap-2" onClick={startEditing}>
                <PencilIcon className="h-4 w-4" /> Edit
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" className="gap-2" onClick={saveEdit} disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? <Spinner size="sm" /> : <SaveIcon className="h-4 w-4" />}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Details */}
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile *</Label>
                <Input
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRoleId || '__none__'} onValueChange={setEditRoleId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Full Admin Access</SelectItem>
                    {allCustomRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <InfoRow icon={PhoneIcon} label="Mobile" value={userDetail.mobile} copyable />
              <InfoRow icon={MailIcon} label="Email" value={userDetail.email || '—'} copyable={!!userDetail.email} />
              <InfoRow icon={ShieldIcon} label="Role" value={userDetail.customRole?.name || 'Full Admin (Unrestricted)'} />
              <InfoRow icon={UserIcon} label="User ID" value={userDetail.id} copyable mono />
              <InfoRow icon={CalendarIcon} label="Created" value={formatDate(userDetail.createdAt)} />
              <InfoRow icon={ClockIcon} label="Last Login" value={userDetail.lastLoginAt ? formatDate(userDetail.lastLoginAt) : 'Never'} />
              {userDetail.passwordChangedAt && (
                <InfoRow icon={KeyIcon} label="Password Changed" value={formatDate(userDetail.passwordChangedAt)} />
              )}
            </div>
          )}

          {/* Status Controls */}
          {!isSelf && !isEditing && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Change Status:</span>
              {['ACTIVE', 'INACTIVE', 'BLOCKED'].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={userDetail.status === s ? 'default' : 'outline'}
                  disabled={userDetail.status === s || updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login URL Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> Login Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CredentialRow
            label="Login URL"
            value={loginUrl || ''}
            onCopy={() => copyToClipboard(loginUrl!, 'Login URL')}
            isLink
          />
          <CredentialRow
            label="Username (Mobile)"
            value={userDetail.mobile}
            onCopy={() => copyToClipboard(userDetail.mobile, 'Mobile')}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {userDetail.isTempPassword ? (
              <>
                <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
                User has a temporary password. They will be asked to change it on next login.
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                User has set their own password.
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const text = `Login URL: ${loginUrl}\nUsername: ${userDetail.mobile}`;
              copyToClipboard(text, 'Credentials');
            }}
          >
            <CopyIcon className="h-4 w-4" /> Copy All Credentials
          </Button>
        </CardContent>
      </Card>

      {/* Feature Access Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldIcon className="h-4 w-4" />
            Feature Access
            {!userDetail.customRoleId && (
              <Badge variant="destructive" className="ml-2 text-xs">Full Admin — All Features</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Object.entries(enabledFeatures).map(([key, enabled]) => (
              <div
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  enabled
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-500 border border-red-200'
                }`}
              >
                {enabled ? (
                  <CheckCircleIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircleIcon className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{key}</span>
              </div>
            ))}
          </div>
          {userDetail.customRoleId && (
            <p className="text-xs text-muted-foreground mt-3">
              {enabledFeaturesList.length} enabled, {disabledFeaturesList.length} disabled
            </p>
          )}
        </CardContent>
      </Card>

      {/* Regenerate Password Confirm Dialog */}
      <Dialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
              Regenerate Password
            </DialogTitle>
            <DialogDescription>
              This will generate a new temporary password for <strong>{userDetail.firstName} {userDetail.lastName || ''}</strong> and:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-1 pl-4 list-disc text-muted-foreground">
            <li>Invalidate all existing login sessions</li>
            <li>The user will be forced to change their password on next login</li>
            <li>Any previously saved passwords will stop working</li>
          </ul>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowRegenConfirm(false)}>Cancel</Button>
            <Button
              onClick={() => regeneratePasswordMutation.mutate()}
              disabled={regeneratePasswordMutation.isPending}
              className="gap-2"
            >
              {regeneratePasswordMutation.isPending && <Spinner size="sm" />}
              Regenerate Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerated Password Result Dialog */}
      <Dialog open={!!regenResult} onOpenChange={() => setRegenResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Credentials</DialogTitle>
            <DialogDescription>
              Share these with the user. The temporary password will NOT be shown again.
            </DialogDescription>
          </DialogHeader>
          {regenResult && (
            <div className="space-y-3">
              <CredentialRow
                label="Login URL"
                value={regenResult.loginUrl}
                onCopy={() => copyToClipboard(regenResult.loginUrl, 'Login URL')}
                isLink
              />
              <CredentialRow
                label="Username (Mobile)"
                value={userDetail.mobile}
                onCopy={() => copyToClipboard(userDetail.mobile, 'Mobile')}
              />
              <CredentialRow
                label="Temporary Password"
                value={regenResult.tempPassword}
                onCopy={() => copyToClipboard(regenResult.tempPassword, 'Password')}
                highlight
              />
              <Button
                className="w-full gap-2 mt-2"
                onClick={() => {
                  const text = `Login URL: ${regenResult.loginUrl}\nUsername: ${userDetail.mobile}\nTemporary Password: ${regenResult.tempPassword}`;
                  copyToClipboard(text, 'All credentials');
                }}
              >
                <CopyIcon className="h-4 w-4" /> Copy All Credentials
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2Icon className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{userDetail.firstName} {userDetail.lastName || ''}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
              className="gap-2"
            >
              {deleteUserMutation.isPending && <Spinner size="sm" />}
              Delete User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  copyable,
  mono,
}: {
  icon: any;
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-medium truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
          {copyable && value && value !== '—' && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(value);
                toast.success(`${label} copied`);
              }}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <CopyIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
  isLink,
  highlight,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  isLink?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-muted/50'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand hover:underline flex items-center gap-1"
          >
            {value} <ExternalLinkIcon className="h-3 w-3" />
          </a>
        ) : (
          <p className={`text-sm font-mono font-medium truncate ${highlight ? 'text-amber-800' : ''}`}>{value}</p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onCopy} className="shrink-0 ml-2">
        <CopyIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
