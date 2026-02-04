import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cadresAPI, votersAPI } from '../services/api';
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

const cadreTypes = [
  { value: 'BOOTH_AGENT', label: 'Booth Agent' },
  { value: 'SECTOR_OFFICER', label: 'Sector Officer' },
  { value: 'WARD_PRESIDENT', label: 'Ward President' },
  { value: 'MANDAL_PRESIDENT', label: 'Mandal President' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'COORDINATOR', label: 'Coordinator' },
];

// Template columns for bulk upload
const cadresTemplateColumns: TemplateColumn[] = [
  { key: 'voterEpic', label: 'Voter EPIC/ID', required: true, type: 'string', description: 'Voter ID (EPIC number) of the person to assign as cadre', example: 'ABC1234567' },
  { key: 'cadreType', label: 'Cadre Type', required: true, type: 'string', description: 'BOOTH_AGENT, SECTOR_OFFICER, WARD_PRESIDENT, MANDAL_PRESIDENT, VOLUNTEER, or COORDINATOR', example: 'BOOTH_AGENT' },
  { key: 'role', label: 'Role', type: 'string', description: 'Optional role description', example: 'Team Lead' },
];

export function CadresPage() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    voterId: '',
    cadreType: 'BOOTH_AGENT',
    role: '',
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

  const { data: votersData } = useQuery({
    queryKey: ['voters-for-cadre', selectedElectionId],
    queryFn: () => votersAPI.getAll(selectedElectionId!, { limit: 1000 }),
    enabled: !!selectedElectionId && createOpen,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      cadresAPI.create(selectedElectionId!, {
        voterId: formData.voterId,
        cadreType: formData.cadreType,
        role: formData.role || undefined,
      }),
    onSuccess: () => {
      toast.success('Cadre created successfully');
      setCreateOpen(false);
      setFormData({
        voterId: '',
        cadreType: 'BOOTH_AGENT',
        role: '',
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
  const voters = votersData?.data?.data || [];

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    try {
      // Map voter EPIC to voter ID
      const epicToId = new Map(voters.map((v: any) => [v.voterId, v.id]));

      const cadresToCreate = data.map(row => {
        const voterEpic = String(row.voterEpic || '');
        const voterId = epicToId.get(voterEpic);
        if (!voterId) {
          throw new Error(`Voter EPIC "${voterEpic}" not found`);
        }
        return {
          voterId,
          cadreType: String(row.cadreType || 'BOOTH_AGENT'),
          role: row.role ? String(row.role) : undefined,
        };
      });

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
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election from the sidebar to view cadres.</p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.voterId || !formData.cadreType) {
      toast.error('Please select a voter and cadre type');
      return;
    }
    createMutation.mutate();
  };

  const getCadreTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      BOOTH_AGENT: 'bg-blue-100 text-blue-800',
      SECTOR_OFFICER: 'bg-green-100 text-green-800',
      WARD_PRESIDENT: 'bg-purple-100 text-purple-800',
      MANDAL_PRESIDENT: 'bg-orange-100 text-orange-800',
      VOLUNTEER: 'bg-gray-100 text-gray-800',
      COORDINATOR: 'bg-pink-100 text-pink-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cadres</h1>
          <p className="text-gray-500">
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
              <DialogDescription>Assign a voter as cadre</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="voterId">Select Voter *</Label>
                  <Select
                    value={formData.voterId}
                    onValueChange={(value) => setFormData({ ...formData, voterId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Search and select voter" />
                    </SelectTrigger>
                    <SelectContent>
                      {voters.map((voter: any) => (
                        <SelectItem key={voter.id} value={voter.id}>
                          {voter.name || voter.voterName || `${voter.firstName || ''} ${voter.lastName || ''}`} - {voter.epicNumber || voter.epicNo || voter.voterId || 'No ID'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadreType">Cadre Type *</Label>
                  <Select
                    value={formData.cadreType}
                    onValueChange={(value) => setFormData({ ...formData, cadreType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cadreTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role (Optional)</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., Team Lead"
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
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              <UserCogIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No cadres found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Voter ID</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cadres.map((cadre: any) => (
                  <TableRow key={cadre.id}>
                    <TableCell className="font-medium">
                      {cadre.user?.firstName || cadre.voter?.voterName || cadre.voter?.firstName || '-'} {cadre.user?.lastName || cadre.voter?.lastName || ''}
                    </TableCell>
                    <TableCell>{cadre.voter?.epicNo || cadre.voter?.voterId || '-'}</TableCell>
                    <TableCell>
                      {(cadre.user?.mobile || cadre.voter?.mobile) ? (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="h-3 w-3" />
                          {cadre.user?.mobile || cadre.voter?.mobile}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getCadreTypeBadge(cadre.cadreType)}</TableCell>
                    <TableCell>{cadre.designation || cadre.role || '-'}</TableCell>
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
          <span className="flex items-center px-4 text-sm text-gray-600">
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
