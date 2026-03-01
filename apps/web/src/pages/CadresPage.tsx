import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cadresAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BulkUpload, TemplateColumn } from '../components/BulkUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import {
  PlusIcon,
  SearchIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  UserCogIcon,
  AlertTriangleIcon,
  PhoneIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// Role enum values matching backend createCadreSchema
const cadreRoles = [
  { value: 'COORDINATOR', label: 'Coordinator' },
  { value: 'BOOTH_INCHARGE', label: 'Booth In-Charge' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'AGENT', label: 'Agent' },
];

// Template columns for bulk upload — matches backend createCadreSchema
const cadresTemplateColumns: TemplateColumn[] = [
  { key: 'name', label: 'Full Name', required: true, type: 'string', description: 'Cadre full name', example: 'Rajesh Kumar' },
  { key: 'mobile', label: 'Mobile', required: true, type: 'string', description: '10-digit mobile number', example: '9876543210' },
  { key: 'role', label: 'Role', required: true, type: 'string', description: 'COORDINATOR, BOOTH_INCHARGE, VOLUNTEER, or AGENT', example: 'VOLUNTEER' },
  { key: 'email', label: 'Email', type: 'string', description: 'Email address (optional)', example: 'rajesh@example.com' },
];

export function CadresPage() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    role: 'VOLUNTEER',
    address: '',
  });

  const queryClient = useQueryClient();

  const { data: cadresData, isLoading } = useQuery({
    queryKey: ['cadres', selectedElectionId, search, page],
    queryFn: () =>
      cadresAPI.getAll(selectedElectionId!, {
        page,
        limit: 20,
        search: search || undefined,
      }),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      cadresAPI.create(selectedElectionId!, {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || undefined,
        role: formData.role,
        address: formData.address || undefined,
      }),
    onSuccess: () => {
      toast.success('Cadre created successfully');
      setCreateOpen(false);
      setFormData({
        name: '',
        mobile: '',
        email: '',
        role: 'VOLUNTEER',
        address: '',
      });
      queryClient.invalidateQueries({ queryKey: ['cadres'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create cadre');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cadresAPI.delete(id),
    onSuccess: () => {
      toast.success('Cadre deleted');
      queryClient.invalidateQueries({ queryKey: ['cadres'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete cadre');
    },
  });

  const cadres = cadresData?.data?.data || [];
  const pagination = cadresData?.data?.meta;

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    try {
      const cadresToCreate = data.map(row => ({
        name: String(row.name || ''),
        mobile: String(row.mobile || ''),
        role: String(row.role || 'VOLUNTEER'),
        email: row.email ? String(row.email) : undefined,
      }));

      const response = await cadresAPI.bulkCreate(selectedElectionId!, cadresToCreate);
      queryClient.invalidateQueries({ queryKey: ['cadres'] });

      const result = response.data?.data || { created: cadresToCreate.length };
      return {
        success: result.created || cadresToCreate.length,
        failed: result.failed || 0,
        errors: result.errors || [],
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.message || 'Bulk upload failed');
    }
  };

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Election Selected</h2>
        <p className="text-muted-foreground mt-2">Please select an election from the sidebar to view cadres.</p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      toast.error('Please fill in name and mobile number');
      return;
    }
    createMutation.mutate();
  };

  const getCadreRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      COORDINATOR: 'bg-pink-100 text-pink-800',
      BOOTH_INCHARGE: 'bg-blue-100 text-blue-800',
      VOLUNTEER: 'bg-green-100 text-green-800',
      AGENT: 'bg-brand-muted text-brand',
    };
    const labels: Record<string, string> = {
      COORDINATOR: 'Coordinator',
      BOOTH_INCHARGE: 'Booth In-Charge',
      VOLUNTEER: 'Volunteer',
      AGENT: 'Agent',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || 'bg-muted text-foreground'}`}>
        {labels[role] || role?.replace('_', ' ') || '-'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cadres</h1>
          <p className="text-muted-foreground">
            Manage election cadres {pagination && `(${pagination.total} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <BulkUpload
            entityName="Cadres"
            templateColumns={cadresTemplateColumns}
            onUpload={handleBulkUpload}
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Cadre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Cadre</DialogTitle>
              <DialogDescription>Add a cadre member for this election</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Rajesh Kumar"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile *</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="10-digit number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cadreRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Optional address"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                  Add Cadre
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cadres..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cadres Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array(10)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
          ) : cadres.length === 0 ? (
            <div className="p-8 text-center">
              <UserCogIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No cadres found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cadres.map((cadre: any) => (
                  <TableRow key={cadre.id}>
                    <TableCell className="font-medium">
                      {cadre.user?.firstName || '-'} {cadre.user?.lastName || ''}
                    </TableCell>
                    <TableCell>
                      {cadre.user?.email || '-'}
                    </TableCell>
                    <TableCell>
                      {cadre.user?.mobile ? (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="h-3 w-3" />
                          {cadre.user.mobile}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getCadreRoleBadge(cadre.cadreType)}</TableCell>
                    <TableCell>{cadre.designation || '-'}</TableCell>
                    <TableCell>{cadre._count?.assignments || 0}</TableCell>
                    <TableCell>
                      <Badge variant={cadre.isActive ? 'success' : 'secondary'}>
                        {cadre.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <EditIcon className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this cadre?')) {
                                deleteMutation.mutate(cadre.id);
                              }
                            }}
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
