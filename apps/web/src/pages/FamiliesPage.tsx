import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familiesAPI, votersAPI } from '../services/api';
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
  Users2Icon,
  AlertTriangleIcon,
  UserPlusIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../lib/utils';

// Template columns for bulk upload
const familiesTemplateColumns: TemplateColumn[] = [
  { key: 'familyName', label: 'Family Name', required: true, type: 'string', description: 'Name of the family', example: 'Sharma Family' },
  { key: 'captainEpic', label: 'Captain Voter ID', type: 'string', description: 'EPIC/Voter ID of the family captain (optional)', example: 'ABC1234567' },
  { key: 'address', label: 'Address', type: 'string', description: 'Family address', example: '123 Main Street' },
  { key: 'contactNumber', label: 'Contact Number', type: 'string', description: '10-digit contact number', example: '9876543210' },
];

export function FamiliesPage() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [formData, setFormData] = useState({
    familyName: '',
    captainId: '',
    address: '',
    contactNumber: '',
  });
  const [memberVoterId, setMemberVoterId] = useState('');

  const queryClient = useQueryClient();

  const { data: familiesData, isLoading } = useQuery({
    queryKey: ['families', selectedElectionId, search, page],
    queryFn: () =>
      familiesAPI.getAll(selectedElectionId!, {
        page,
        limit: 20,
        search: search || undefined,
      }),
    enabled: !!selectedElectionId,
  });

  const { data: votersData } = useQuery({
    queryKey: ['voters-for-family', selectedElectionId],
    queryFn: () => votersAPI.getAll(selectedElectionId!, { limit: 1000 }),
    enabled: !!selectedElectionId && (createOpen || addMemberOpen),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      familiesAPI.create(selectedElectionId!, {
        familyName: formData.familyName,
        captainId: formData.captainId || undefined,
        address: formData.address || undefined,
        contactNumber: formData.contactNumber || undefined,
      }),
    onSuccess: () => {
      toast.success('Family created successfully');
      setCreateOpen(false);
      setFormData({
        familyName: '',
        captainId: '',
        address: '',
        contactNumber: '',
      });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create family');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: () => familiesAPI.addMember(selectedFamily?.id, memberVoterId),
    onSuccess: () => {
      toast.success('Member added successfully');
      setAddMemberOpen(false);
      setMemberVoterId('');
      setSelectedFamily(null);
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add member');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => familiesAPI.delete(id),
    onSuccess: () => {
      toast.success('Family deleted');
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete family');
    },
  });

  const families = familiesData?.data?.data || [];
  const pagination = familiesData?.data?.meta;
  const voters = votersData?.data?.data || [];

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    try {
      // Map voter EPIC to voter ID for captain assignment
      const epicToId = new Map(voters.map((v: any) => [v.voterId, v.id]));

      const familiesToCreate = data.map(row => {
        const captainEpic = row.captainEpic ? String(row.captainEpic) : undefined;
        let captainId = undefined;
        if (captainEpic) {
          captainId = epicToId.get(captainEpic);
          if (!captainId) {
            throw new Error(`Captain Voter ID "${captainEpic}" not found`);
          }
        }
        return {
          familyName: String(row.familyName || ''),
          captainId,
          address: row.address ? String(row.address) : undefined,
          contactNumber: row.contactNumber ? String(row.contactNumber) : undefined,
        };
      });

      const response = await familiesAPI.bulkCreate(selectedElectionId!, familiesToCreate);
      queryClient.invalidateQueries({ queryKey: ['families'] });

      const result = response.data?.data || { created: familiesToCreate.length };
      return {
        success: result.created || familiesToCreate.length,
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
        <p className="text-gray-500 mt-2">Please select an election from the sidebar to view families.</p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.familyName) {
      toast.error('Please enter family name');
      return;
    }
    createMutation.mutate();
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberVoterId) {
      toast.error('Please select a voter');
      return;
    }
    addMemberMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Families</h1>
          <p className="text-gray-500">
            Manage voter families {pagination && `(${pagination.total} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <BulkUpload
            entityName="Families"
            templateColumns={familiesTemplateColumns}
            onUpload={handleBulkUpload}
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Family
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Family</DialogTitle>
              <DialogDescription>Create a new family group</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="familyName">Family Name *</Label>
                  <Input
                    id="familyName"
                    value={formData.familyName}
                    onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                    placeholder="e.g., Sharma Family"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="captainId">Family Captain</Label>
                  <Select
                    value={formData.captainId}
                    onValueChange={(value) => setFormData({ ...formData, captainId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select captain (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {voters.map((voter: any) => (
                        <SelectItem key={voter.id} value={voter.id}>
                          {voter.name || voter.voterName || `${voter.firstName || ''} ${voter.lastName || ''}`}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  <Input
                    id="contactNumber"
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              Add a voter to {selectedFamily?.familyName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="memberVoterId">Select Voter</Label>
                <Select value={memberVoterId} onValueChange={setMemberVoterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voter" />
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddMemberOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMemberMutation.isPending}>
                {addMemberMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search families..."
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

      {/* Families Table */}
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
          ) : families.length === 0 ? (
            <div className="p-8 text-center">
              <Users2Icon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No families found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family Name</TableHead>
                  <TableHead>Captain</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {families.map((family: any) => (
                  <TableRow key={family.id}>
                    <TableCell className="font-medium">{family.familyName || '-'}</TableCell>
                    <TableCell>
                      {family.headName || family.captain ? (
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">Head</Badge>
                          {family.headName || (family.captain && `${family.captain.firstName || family.captain.voterName || ''} ${family.captain.lastName || ''}`)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Users2Icon className="h-3 w-3" />
                        {formatNumber(family.totalMembers || family._count?.members || family._count?.voters || family.voters?.length || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{family.address || '-'}</TableCell>
                    <TableCell>{family.mobile || family.contactNumber || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedFamily(family);
                              setAddMemberOpen(true);
                            }}
                          >
                            <UserPlusIcon className="h-4 w-4 mr-2" />
                            Add Member
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <EditIcon className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this family?')) {
                                deleteMutation.mutate(family.id);
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
