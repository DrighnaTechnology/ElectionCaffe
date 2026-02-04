import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partsAPI } from '../services/api';
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
// Select imports removed - not currently used
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
  MapPinIcon,
  AlertTriangleIcon,
  UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../lib/utils';

// Template columns for bulk upload
const partsTemplateColumns: TemplateColumn[] = [
  { key: 'partNo', label: 'Part Number', required: true, type: 'number', description: 'Unique part/booth number', example: 1 },
  { key: 'partNameEn', label: 'Part Name (English)', required: true, type: 'string', description: 'Part name in English', example: 'Government School' },
  { key: 'partNameLocal', label: 'Part Name (Local)', type: 'string', description: 'Part name in local language', example: '' },
  { key: 'boothAddress', label: 'Booth Address', type: 'string', description: 'Complete booth address', example: '123 Main Street' },
  { key: 'totalVoters', label: 'Total Voters', type: 'number', description: 'Total number of voters', example: 1500 },
  { key: 'maleVoters', label: 'Male Voters', type: 'number', description: 'Number of male voters', example: 750 },
  { key: 'femaleVoters', label: 'Female Voters', type: 'number', description: 'Number of female voters', example: 750 },
];

export function PartsPage() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    partNo: '',
    partNameEn: '',
    partNameLocal: '',
    boothAddress: '',
    totalVoters: '',
    maleVoters: '',
    femaleVoters: '',
  });

  const queryClient = useQueryClient();

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    try {
      const parts = data.map(row => ({
        partNo: Number(row.partNo),
        partNameEn: String(row.partNameEn || ''),
        partNameLocal: row.partNameLocal ? String(row.partNameLocal) : undefined,
        boothAddress: row.boothAddress ? String(row.boothAddress) : undefined,
        totalVoters: row.totalVoters ? Number(row.totalVoters) : undefined,
        maleVoters: row.maleVoters ? Number(row.maleVoters) : undefined,
        femaleVoters: row.femaleVoters ? Number(row.femaleVoters) : undefined,
      }));

      const response = await partsAPI.bulkCreate(selectedElectionId!, parts);
      queryClient.invalidateQueries({ queryKey: ['parts'] });

      const result = response.data?.data || { created: parts.length };
      return {
        success: result.created || parts.length,
        failed: result.failed || 0,
        errors: result.errors || [],
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Bulk upload failed');
    }
  };

  const { data: partsData, isLoading } = useQuery({
    queryKey: ['parts', selectedElectionId, search, page],
    queryFn: () =>
      partsAPI.getAll(selectedElectionId!, {
        page,
        limit: 20,
        search: search || undefined,
      }),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      partsAPI.create(selectedElectionId!, {
        ...formData,
        partNo: parseInt(formData.partNo),
        totalVoters: formData.totalVoters ? parseInt(formData.totalVoters) : undefined,
        maleVoters: formData.maleVoters ? parseInt(formData.maleVoters) : undefined,
        femaleVoters: formData.femaleVoters ? parseInt(formData.femaleVoters) : undefined,
      }),
    onSuccess: () => {
      toast.success('Part created successfully');
      setCreateOpen(false);
      setFormData({
        partNo: '',
        partNameEn: '',
        partNameLocal: '',
        boothAddress: '',
        totalVoters: '',
        maleVoters: '',
        femaleVoters: '',
      });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create part');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partsAPI.delete(id),
    onSuccess: () => {
      toast.success('Part deleted');
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete part');
    },
  });

  const parts = partsData?.data?.data || [];
  const pagination = partsData?.data?.meta;

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election from the sidebar to view parts.</p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partNo || !formData.partNameEn) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate();
  };

  const getVulnerabilityBadge = (vulnerability: string) => {
    switch (vulnerability) {
      case 'HIGH':
        return <Badge variant="destructive">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium</Badge>;
      case 'LOW':
        return <Badge variant="success">Low</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Parts / Booths</h1>
          <p className="text-gray-500">
            Manage polling booths {pagination && `(${pagination.total} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <BulkUpload
            entityName="Parts"
            templateColumns={partsTemplateColumns}
            onUpload={handleBulkUpload}
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Part</DialogTitle>
              <DialogDescription>Add a new polling booth/part</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partNo">Part Number *</Label>
                    <Input
                      id="partNo"
                      type="number"
                      value={formData.partNo}
                      onChange={(e) => setFormData({ ...formData, partNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalVoters">Total Voters</Label>
                    <Input
                      id="totalVoters"
                      type="number"
                      value={formData.totalVoters}
                      onChange={(e) => setFormData({ ...formData, totalVoters: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partNameEn">Part Name (English) *</Label>
                  <Input
                    id="partNameEn"
                    value={formData.partNameEn}
                    onChange={(e) => setFormData({ ...formData, partNameEn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partNameLocal">Part Name (Local)</Label>
                  <Input
                    id="partNameLocal"
                    value={formData.partNameLocal}
                    onChange={(e) => setFormData({ ...formData, partNameLocal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boothAddress">Booth Address</Label>
                  <Input
                    id="boothAddress"
                    value={formData.boothAddress}
                    onChange={(e) => setFormData({ ...formData, boothAddress: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maleVoters">Male Voters</Label>
                    <Input
                      id="maleVoters"
                      type="number"
                      value={formData.maleVoters}
                      onChange={(e) => setFormData({ ...formData, maleVoters: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="femaleVoters">Female Voters</Label>
                    <Input
                      id="femaleVoters"
                      type="number"
                      value={formData.femaleVoters}
                      onChange={(e) => setFormData({ ...formData, femaleVoters: e.target.value })}
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
                  Create
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
              placeholder="Search parts..."
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

      {/* Parts Table */}
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
          ) : parts.length === 0 ? (
            <div className="p-8 text-center">
              <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No parts found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Total Voters</TableHead>
                  <TableHead>Male</TableHead>
                  <TableHead>Female</TableHead>
                  <TableHead>Vulnerability</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part: any) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.partNumber || part.partNo || '-'}</TableCell>
                    <TableCell>{part.boothName || part.boothNameLocal || part.partName || part.partNameEn || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{part.address || part.boothAddress || '-'}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" />
                        {formatNumber(part.totalVoters ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell>{formatNumber(part.maleVoters ?? 0)}</TableCell>
                    <TableCell>{formatNumber(part.femaleVoters ?? 0)}</TableCell>
                    <TableCell>{getVulnerabilityBadge(part.vulnerability)}</TableCell>
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
                              if (confirm('Are you sure you want to delete this part?')) {
                                deleteMutation.mutate(part.id);
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
