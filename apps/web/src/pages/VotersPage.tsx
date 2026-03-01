import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { votersAPI, partsAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
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
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import {
  PlusIcon,
  SearchIcon,
  TrashIcon,
  AlertTriangleIcon,
  PhoneIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// Template columns for bulk upload with validation rules
const votersTemplateColumns: TemplateColumn[] = [
  { key: 'name', label: 'Full Name', required: true, type: 'string', minLength: 2, maxLength: 100, description: 'Voter full name (2-100 chars)', example: 'Rajesh Kumar' },
  { key: 'nameLocal', label: 'Name (Local)', type: 'string', maxLength: 100, description: 'Name in local language', example: '' },
  { key: 'gender', label: 'Gender', type: 'string', enum: ['MALE', 'FEMALE', 'TRANSGENDER', 'M', 'F'], description: 'MALE, FEMALE, TRANSGENDER (or M, F)', example: 'MALE' },
  { key: 'age', label: 'Age', type: 'number', min: 18, max: 120, description: 'Voter age (18-120)', example: 35 },
  { key: 'epicNumber', label: 'EPIC Number', type: 'string', maxLength: 20, description: 'EPIC/Voter ID number (max 20 chars)', example: 'ABC1234567' },
  { key: 'mobile', label: 'Mobile', type: 'string', pattern: /^[6-9]\d{9}$/, description: '10-digit Indian mobile (starts with 6-9)', example: '9876543210' },
  { key: 'slNumber', label: 'Serial No', type: 'number', min: 1, description: 'Serial number in voter list (positive)', example: 1 },
  { key: 'partNo', label: 'Part Number', required: true, type: 'number', min: 1, description: 'Part/Booth number (must exist in system)', example: 1 },
];

export function VotersPage() {
  const navigate = useNavigate();
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [partFilter, setPartFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nameLocal: '',
    gender: 'MALE',
    age: '',
    mobile: '',
    epicNumber: '',
    slNumber: '',
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
        name: formData.name,
        nameLocal: formData.nameLocal || undefined,
        gender: formData.gender,
        age: formData.age ? parseInt(formData.age) : undefined,
        mobile: formData.mobile || undefined,
        epicNumber: formData.epicNumber || undefined,
        slNumber: formData.slNumber ? parseInt(formData.slNumber) : undefined,
        partId: formData.partId,
      }),
    onSuccess: () => {
      toast.success('Voter created successfully');
      setCreateOpen(false);
      setFormData({
        name: '',
        nameLocal: '',
        gender: 'MALE',
        age: '',
        mobile: '',
        epicNumber: '',
        slNumber: '',
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
    // Map part numbers to part IDs
    const partNoToId = new Map(parts.map((p: any) => [p.partNumber, p.id]));

    const votersToCreate: any[] = [];
    const rowMapping: number[] = []; // maps votersToCreate index → data index
    const localErrors: Array<{ row: number; field: string; error: string }> = [];

    data.forEach((row, index) => {
      const partNo = Number(row.partNo);
      const partId = partNoToId.get(partNo);

      if (!partId) {
        localErrors.push({
          row: index + 1,
          field: 'partNo',
          error: `Part number ${partNo} not found in system`,
        });
        return;
      }

      // Map gender shorthand to full enum value
      const genderRaw = String(row.gender || 'MALE').toUpperCase();
      const gender =
        genderRaw === 'M' ? 'MALE' :
        genderRaw === 'F' ? 'FEMALE' :
        genderRaw === 'O' ? 'TRANSGENDER' :
        genderRaw;

      votersToCreate.push({
        name: String(row.name || ''),
        nameLocal: row.nameLocal ? String(row.nameLocal) : undefined,
        gender,
        age: row.age ? Number(row.age) : undefined,
        epicNumber: row.epicNumber ? String(row.epicNumber) : undefined,
        mobile: row.mobile ? String(row.mobile) : undefined,
        slNumber: row.slNumber ? Number(row.slNumber) : undefined,
        partId,
      });
      rowMapping.push(index);
    });

    // If no valid rows to send, return local errors only
    if (votersToCreate.length === 0) {
      return { success: 0, failed: localErrors.length, errors: localErrors };
    }

    try {
      const response = await votersAPI.bulkCreate(selectedElectionId!, votersToCreate);
      queryClient.invalidateQueries({ queryKey: ['voters'] });

      const result = response.data?.data || { created: votersToCreate.length };

      // Map backend errors back to original row indices
      const backendErrors = (result.errors || []).map((err: any) => ({
        row: rowMapping[err.row - 1] !== undefined ? rowMapping[err.row - 1] + 1 : err.row,
        field: err.field,
        error: err.error || 'Unknown error',
      }));

      return {
        success: result.created || 0,
        failed: (result.failed || 0) + localErrors.length,
        errors: [...localErrors, ...backendErrors],
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
        <p className="text-muted-foreground mt-2">Please select an election from the sidebar to view voters.</p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.partId) {
      toast.error('Please fill in required fields (Name and Part)');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Voters</h1>
          <p className="text-muted-foreground">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Rajesh Kumar"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nameLocal">Name (Local)</Label>
                      <Input
                        id="nameLocal"
                        value={formData.nameLocal}
                        onChange={(e) => setFormData({ ...formData, nameLocal: e.target.value })}
                        placeholder="Local language name"
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
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
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
                      <Label htmlFor="epicNumber">EPIC Number</Label>
                      <Input
                        id="epicNumber"
                        value={formData.epicNumber}
                        onChange={(e) => setFormData({ ...formData, epicNumber: e.target.value })}
                        placeholder="e.g., ABC1234567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        placeholder="10-digit number"
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
                              {part.partNumber} - {part.boothName || '-'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slNumber">Serial No</Label>
                      <Input
                        id="slNumber"
                        type="number"
                        value={formData.slNumber}
                        onChange={(e) => setFormData({ ...formData, slNumber: e.target.value })}
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
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    Part {part.partNumber}
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
              <p className="text-muted-foreground">No voters found</p>
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
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voters.map((voter: any, index: number) => (
                  <TableRow
                    key={voter.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/voters/${voter.id}`)}
                  >
                    <TableCell>{(page - 1) * 20 + index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={voter.photoUrl} />
                          <AvatarFallback className="text-xs bg-brand-muted text-brand">
                            {(voter.name || voter.voterName || 'V').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{voter.name || voter.nameLocal || voter.voterName || voter.voterNameLocal || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{voter.epicNumber || voter.epicNo || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={voter.gender === 'MALE' || voter.gender === 'M' ? 'info' : voter.gender === 'FEMALE' || voter.gender === 'F' ? 'default' : 'secondary'}>
                        {voter.gender === 'MALE' || voter.gender === 'M' ? 'Male' : voter.gender === 'FEMALE' || voter.gender === 'F' ? 'Female' : 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell>{voter.age || '-'}</TableCell>
                    <TableCell>{voter.part?.partNumber ?? '-'}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this voter?')) {
                            deleteMutation.mutate(voter.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
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
