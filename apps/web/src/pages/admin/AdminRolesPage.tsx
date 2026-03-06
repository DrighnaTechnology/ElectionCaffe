import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationAPI } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { Spinner } from '../../components/ui/spinner';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from 'sonner';
import {
  ShieldIcon,
  LayoutDashboardIcon,
  PlusIcon,
  Trash2Icon,
  SaveIcon,
  LoaderIcon,
} from 'lucide-react';

export function AdminRolesPage() {
  const queryClient = useQueryClient();
  const [roleFeaturesPending, setRoleFeaturesPending] = useState<
    Map<string, { role: string; featureKey: string; isEnabled: boolean }>
  >(new Map());
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [deletingCustomRole, setDeletingCustomRole] = useState<{ id: string; name: string } | null>(null);

  // Mutations for custom roles
  const createCustomRoleMutation = useMutation({
    mutationFn: (name: string) => organizationAPI.createCustomRole({ name }),
    onSuccess: () => {
      toast.success('Custom role created');
      queryClient.invalidateQueries({ queryKey: ['role-features'] });
      setShowAddRoleDialog(false);
      setNewRoleName('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to create role');
    },
  });

  const deleteCustomRoleMutation = useMutation({
    mutationFn: (roleId: string) => organizationAPI.deleteCustomRole(roleId),
    onSuccess: () => {
      toast.success('Custom role deleted');
      queryClient.invalidateQueries({ queryKey: ['role-features'] });
      setDeletingCustomRole(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete role');
    },
  });

  const updateCustomRoleFeaturesMutation = useMutation({
    mutationFn: ({ roleId, updates }: { roleId: string; updates: { featureKey: string; isEnabled: boolean }[] }) =>
      organizationAPI.updateCustomRoleFeatures(roleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-features'] });
    },
    onError: () => {
      toast.error('Failed to save custom role feature access');
    },
  });

  // Fetch role-feature matrix
  const { data: roleFeaturesData, isLoading: roleFeaturesLoading } = useQuery({
    queryKey: ['role-features'],
    queryFn: () => organizationAPI.getRoleFeatures(),
  });

  const rfMatrix = (roleFeaturesData as any)?.data?.data?.matrix || {};
  const rfFeatures: { key: string; label: string; category: string }[] = (roleFeaturesData as any)?.data?.data?.features || [];
  const rfRoles: string[] = (roleFeaturesData as any)?.data?.data?.roles || [];
  const rfCustomRoles: { id: string; slug: string; name: string; description?: string; isCustom: boolean }[] =
    (roleFeaturesData as any)?.data?.data?.customRoles || [];

  // Fetch admin context for hierarchy restrictions
  const { data: adminContextData } = useQuery({
    queryKey: ['admin-context'],
    queryFn: () => organizationAPI.getAdminContext(),
    staleTime: 5 * 60 * 1000,
  });
  const adminContext = (adminContextData as any)?.data?.data || {};
  const canDeleteRoles = adminContext.canDeleteRoles ?? true;
  const canCreateRoles = adminContext.canCreateRoles ?? true;

  const customRoleMap = new Map(rfCustomRoles.map(cr => [cr.slug, cr]));

  const featuresByCategory = rfFeatures.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, { key: string; label: string; category: string }[]>);

  const getRfValue = (role: string, featureKey: string): boolean => {
    const key = `${role}-${featureKey}`;
    if (roleFeaturesPending.has(key)) return roleFeaturesPending.get(key)!.isEnabled;
    return rfMatrix[role]?.[featureKey] ?? false;
  };

  const toggleRfValue = (role: string, featureKey: string, current: boolean) => {
    const key = `${role}-${featureKey}`;
    setRoleFeaturesPending((prev) => {
      const next = new Map(prev);
      next.set(key, { role, featureKey, isEnabled: !current });
      return next;
    });
  };

  const saveAllRfChanges = () => {
    const allPending = Array.from(roleFeaturesPending.values());

    const byRole = new Map<string, { featureKey: string; isEnabled: boolean }[]>();
    for (const u of allPending) {
      if (!byRole.has(u.role)) byRole.set(u.role, []);
      byRole.get(u.role)!.push({ featureKey: u.featureKey, isEnabled: u.isEnabled });
    }

    for (const [slug, updates] of byRole) {
      const cr = customRoleMap.get(slug);
      if (cr) {
        updateCustomRoleFeaturesMutation.mutate({ roleId: cr.id, updates });
      }
    }

    setRoleFeaturesPending(new Map());
    toast.success('Feature access saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Roles & Access</h1>
        <p className="text-muted-foreground">
          Manage custom roles and control feature access
        </p>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <LayoutDashboardIcon className="h-4 w-4" />
            Role Distribution
          </CardTitle>
          <CardDescription className="text-xs">
            Breakdown of users by their assigned roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoleDistributionSection />
        </CardContent>
      </Card>

      {/* Role-Based Feature Access */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldIcon className="h-4 w-4" />
                Role-Based Feature Access
              </CardTitle>
              <CardDescription className="text-xs">
                Control which features each role can see in the application
              </CardDescription>
            </div>
            {canCreateRoles && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAddRoleDialog(true)}
              >
                <PlusIcon className="h-4 w-4" />
                Add Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {roleFeaturesPending.size > 0 && (
            <div className="flex items-center justify-between p-3 mb-4 bg-brand-muted border border-brand/20 rounded-lg">
              <p className="text-sm text-orange-800">
                {roleFeaturesPending.size} unsaved change{roleFeaturesPending.size > 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setRoleFeaturesPending(new Map())}>
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={saveAllRfChanges}
                  disabled={updateCustomRoleFeaturesMutation.isPending}
                >
                  {updateCustomRoleFeaturesMutation.isPending ? (
                    <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SaveIcon className="h-3.5 w-3.5" />
                  )}
                  Save All
                </Button>
              </div>
            </div>
          )}

          {roleFeaturesLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rfFeatures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No feature configuration available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="sticky left-0 bg-background text-left pb-2 pl-3 pr-4 min-w-[180px] w-[180px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    {Object.entries(featuresByCategory).map(([cat, catFeatures]) => (
                      <th key={cat} colSpan={catFeatures.length} className="text-center pb-1 border-l text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                        {cat}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <th className="sticky left-0 bg-background" />
                    {rfFeatures.map((f) => (
                      <th key={f.key} className="text-center text-[11px] px-1.5 pb-2 text-muted-foreground font-medium min-w-[70px]">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rfRoles.map((role) => {
                    const isCustom = customRoleMap.has(role);
                    const crMeta = customRoleMap.get(role);
                    return (
                      <tr key={role} className={`hover:bg-muted/30 transition-colors ${isCustom ? 'bg-blue-50/40' : ''}`}>
                        <td className="sticky left-0 bg-background py-2.5 pl-3 pr-2 font-medium text-xs">
                          <div className="flex items-center justify-between whitespace-nowrap">
                            <span>{crMeta?.name || role}</span>
                            {isCustom && canDeleteRoles && (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 ml-2"
                                title="Delete custom role"
                                onClick={() => setDeletingCustomRole({ id: crMeta!.id, name: crMeta!.name })}
                              >
                                <Trash2Icon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        {rfFeatures.map((f) => {
                          const enabled = getRfValue(role, f.key);
                          const key = `${role}-${f.key}`;
                          const hasChange = roleFeaturesPending.has(key);
                          return (
                            <td key={f.key} className={`text-center py-2.5 ${hasChange ? 'bg-brand-muted' : ''}`}>
                              <Checkbox
                                checked={enabled}
                                onCheckedChange={() => toggleRfValue(role, f.key, enabled)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Custom Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Add Custom Role
            </DialogTitle>
            <DialogDescription>
              Create a new role. You can then assign menu access in the matrix.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newRoleName.trim()) createCustomRoleMutation.mutate(newRoleName.trim());
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="custom-role-name">Role Name</Label>
              <Input
                id="custom-role-name"
                placeholder="e.g. District Officer"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setShowAddRoleDialog(false); setNewRoleName(''); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newRoleName.trim() || createCustomRoleMutation.isPending}>
                {createCustomRoleMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Create Role
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Custom Role Confirmation */}
      {deletingCustomRole && (
        <Dialog open={!!deletingCustomRole} onOpenChange={(open) => !open && setDeletingCustomRole(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2Icon className="h-5 w-5" />
                Delete Custom Role
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the role <strong>{deletingCustomRole.name}</strong>?
                All feature access settings for this role will be removed.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDeletingCustomRole(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteCustomRoleMutation.isPending}
                onClick={() => deleteCustomRoleMutation.mutate(deletingCustomRole.id)}
              >
                {deleteCustomRoleMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ==================== Role Distribution ====================

function RoleDistributionSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-role-distribution'],
    queryFn: () => organizationAPI.getRoleDistribution(),
  });

  const distribution: { role: string; count: number }[] = data?.data?.data?.distribution || [];

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (distribution.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No user data</p>;
  }

  const max = distribution[0]?.count || 1;

  const barColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-brand',
    'bg-red-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
  ];

  return (
    <div className="space-y-2.5">
      {distribution.map(({ role, count }, i) => (
        <div key={role}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-foreground">{role}</span>
            <span className="text-xs font-bold text-muted-foreground">{count}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${barColors[i % barColors.length]}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
