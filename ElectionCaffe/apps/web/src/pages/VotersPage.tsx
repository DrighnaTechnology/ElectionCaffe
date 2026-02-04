import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { votersAPI, partsAPI } from '../services/api';
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
  AlertTriangleIcon,
  PhoneIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// Template columns for bulk upload
const votersTemplateColumns: TemplateColumn[] = [
  { key: 'firstName', label: 'First Name', required: true, type: 'string', description: 'Voter first name', example: 'John' },
  { key: 'middleName', label: 'Middle Name', type: 'string', description: 'Voter middle name', example: '' },
  { key: 'lastName', label: 'Last Name', type: 'string', description: 'Voter last name', example: 'Doe' },
  { key: 'gender', label: 'Gender', type: 'string', description: 'M for Male, F for Female, O for Other', example: 'M' },
  { key: 'age', label: 'Age', type: 'number', description: 'Voter age', example: 35 },
  { key: 'voterId', label: 'Voter ID', type: 'string', description: 'EPIC/Voter ID number', example: 'ABC1234567' },
  { key: 'mobile', label: 'Mobile', type: 'string', description: '10-digit mobile number', example: '9876543210' },
  { key: 'serialNo', label: 'Serial No', type: 'number', description: 'Serial number in voter list', example: 1 },
  { key: 'partNo', label: 'Part Number', required: true, type: 'number', description: 'Part/Booth number (must exist)', example: 1 },
];

export function VotersPage() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [partFilter, setPartFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'M',
    age: '',
    mobile: '',
    voterId: '',
    serialNo: '',
    partId: '',
  });

  const queryClient = useQueryClient();

  const { data: votersData, isLoading } = useQuery({
    queryKey: ['voters', selectedElectionId, search, partFilter, genderFilter, page],
    queryFn: () =>
      votersAPI.getAll(selectedElectionId!, {
        page,
        limit: 20,
        search: search || undefined,
        partId: partFilter !== 'all' ? partFilter : undefined,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
      }),
    enabled: !!selectedElectionId,
  });

  const { data: partsData } = useQuery({
    queryKey: ['parts', selectedElectionId],
    queryFn: () => partsAPI.getAll(selectedElectionId!, { limit: 1000 }),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      votersAPI.create(selectedElectionId!, {
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        serialNo: formData.serialNo ? parseInt(formData.serialNo) : undefined,
      }),
    onSuccess: () => {
      toast.success('Voter created successfully');
      setCreateOpen(false);
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        gender: 'M',
        age: '',
        mobile: '',
        voterId: '',
        serialNo: '',
        partId: '',
      });
      queryClient.invalidateQueries({ queryKey: ['voters'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create voter');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => votersAPI.delete(id),
    onSuccess: () => {
      toast.success('Voter deleted');
      queryClient.invalidateQueries({ queryKey: ['voters'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete voter');
    },
  });

  const voters = votersData?.data?.data || [];
  const pagination = votersData?.data?.meta;
  const parts = partsData?.data?.data || [];

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    try {
      // Map part numbers to part IDs
      const partNoToId = new Map(parts.map((p: any) => [p.partNo, p.id]));

      const votersToCreate = data.map(row => {
        const partNo = Number(row.partNo);
        const partId = partNoToId.get(partNo);
        if (!partId) {
          throw new Error(`Part number ${partNo} not found`);
        }
        return {
          firstName: String(row.firstName || ''),
          middleName: row.middleName ? String(row.middleName) : undefined,
          lastName: row.lastName ? String(row.lastName) : undefined,
          gender: String(row.gender || 'M'),
          age: row.age ? Number(row.age) : undefined,
          voterId: row.voterId ? String(row.voterId) : undefined,
          mobile: row.mobile ? String(row.mobile) : undefined,
          serialNo: row.serialNo ? Number(row.serialNo) : undefined,
          partId,
        };
      });

      const response = await votersAPI.bulkCreate(selectedElectionId!, votersToCreate);
      queryClient.invalidateQueries({ queryKey: ['voters'] });

      const result = response.data?.data || { created: votersToCreate.length };
      return {
        success: result.created || votersToCreate.length,
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
        <p className="text-gray-500 mt-2">Please select an election from the sidebar to view voters.</p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.partId) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Voters</h1>
          <p className="text-gray-500">
            Manage voter data {pagination && `(${pagination.total.toLocaleString()} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <BulkUpload
            entityName="Voters"
            templateColumns={votersTemplateColumns}
            onUpload={handleBulkUpload}
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Voter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Voter</DialogTitle>
                <DialogDescription>Enter voter details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name</Label>
                      <Input
                        id="middleName"
                        value={formData.middleName}
                        onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voterId">Voter ID</Label>
                      <Input
                        id="voterId"
                        value={formData.voterId}
                        onChange={(e) => setFormData({ ...formData, voterId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partId">Part/Booth *</Label>
                      <Select
                        value={formData.partId}
                        onValueChange={(value) => setFormData({ ...formData, partId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select part" />
                        </SelectTrigger>
                        <SelectContent>
                          {parts.map((part: any) => (
                            <SelectItem key={part.id} value={part.id}>
                              {part.partNumber || part.partNo} - {part.partName || part.partNameEn || '-'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serialNo">Serial No</Label>
                      <Input
                        id="serialNo"
                        type="number"
                        value={formData.serialNo}
                        onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                    Add Voter
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, voter ID, or mobile..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select value={partFilter} onValueChange={(v) => { setPartFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parts</SelectItem>
                {parts.map((part: any) => (
                  <SelectItem key={part.id} value={part.id}>
                    Part {part.partNumber || part.partNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gender</SelectItem>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Voters Table */}
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
          ) : voters.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No voters found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr. No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Voter ID</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Part No</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voters.map((voter: any) => (
                  <TableRow key={voter.id}>
                    <TableCell>{voter.slNumber || voter.serialNo || '-'}</TableCell>
                    <TableCell className="font-medium">
                      {voter.name || voter.nameLocal || voter.voterName || voter.voterNameLocal || '-'}
                    </TableCell>
                    <TableCell>{voter.epicNumber || voter.epicNo || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={voter.gender === 'MALE' || voter.gender === 'M' ? 'info' : voter.gender === 'FEMALE' || voter.gender === 'F' ? 'default' : 'secondary'}>
                        {voter.gender === 'MALE' || voter.gender === 'M' ? 'Male' : voter.gender === 'FEMALE' || voter.gender === 'F' ? 'Female' : 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell>{voter.age || '-'}</TableCell>
                    <TableCell>{voter.part?.partNumber || voter.part?.partNo || '-'}</TableCell>
                    <TableCell>
                      {voter.mobile ? (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="h-3 w-3" />
                          {voter.mobile}
                        </span>
                      ) : (
                        '-'
                      )}
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
                              if (confirm('Are you sure you want to delete this voter?')) {
                                deleteMutation.mutate(voter.id);
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
