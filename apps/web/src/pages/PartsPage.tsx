import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  MapPinIcon,
  AlertTriangleIcon,
  UsersIcon,
  LoaderIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../lib/utils';

// Template columns for bulk upload — field names match backend createPartSchema
const partsTemplateColumns: TemplateColumn[] = [
  { key: 'partNumber', label: 'Part Number', required: true, type: 'number', description: 'Unique part/booth number', example: 1 },
  { key: 'boothName', label: 'Booth Name (English)', required: true, type: 'string', description: 'Booth name in English', example: 'Government School' },
  { key: 'boothNameLocal', label: 'Booth Name (Local)', type: 'string', description: 'Booth name in local language', example: '' },
  { key: 'address', label: 'Address', type: 'string', description: 'Complete booth address', example: '123 Main Street' },
  { key: 'partType', label: 'Part Type', type: 'string', description: 'URBAN or RURAL', example: 'URBAN' },
  { key: 'landmark', label: 'Landmark', type: 'string', description: 'Nearby landmark', example: 'Near Bus Stand' },
  { key: 'pincode', label: 'Pincode', type: 'string', description: '6-digit pincode', example: '600001' },
];

const PAGE_SIZE = 20;

export function PartsPage() {
  const navigate = useNavigate();
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    partNumber: '',
    boothName: '',
    boothNameLocal: '',
    address: '',
    partType: 'URBAN',
    landmark: '',
    pincode: '',
  });

  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    try {
      const parts = data.map(row => ({
        partNumber: Number(row.partNumber),
        boothName: String(row.boothName || ''),
        boothNameLocal: row.boothNameLocal ? String(row.boothNameLocal) : undefined,
        address: row.address ? String(row.address) : undefined,
        partType: row.partType ? String(row.partType).toUpperCase() : 'URBAN',
        landmark: row.landmark ? String(row.landmark) : undefined,
        pincode: row.pincode ? String(row.pincode) : undefined,
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

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['parts', selectedElectionId, debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      partsAPI.getAll(selectedElectionId!, {
        page: pageParam,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.data?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
    enabled: !!selectedElectionId,
  });

  // Flatten all pages into a single parts array
  const parts = data?.pages.flatMap((page) => page?.data?.data || []) || [];
  const totalCount = data?.pages[0]?.data?.meta?.total;

  // IntersectionObserver for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const createMutation = useMutation({
    mutationFn: () =>
      partsAPI.create(selectedElectionId!, {
        partNumber: parseInt(formData.partNumber),
        boothName: formData.boothName,
        boothNameLocal: formData.boothNameLocal || undefined,
        address: formData.address || undefined,
        partType: formData.partType || 'URBAN',
        landmark: formData.landmark || undefined,
        pincode: formData.pincode || undefined,
      }),
    onSuccess: () => {
      toast.success('Part created successfully');
      setCreateOpen(false);
      setFormData({
        partNumber: '',
        boothName: '',
        boothNameLocal: '',
        address: '',
        partType: 'URBAN',
        landmark: '',
        pincode: '',
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

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Election Selected</h2>
        <p className="text-muted-foreground mt-2">Please select an election from the sidebar to view parts.</p>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partNumber || !formData.boothName) {
      toast.error('Please fill in required fields (Part Number and Booth Name)');
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
          <p className="text-muted-foreground">
            Manage polling booths {totalCount != null && `(${totalCount} total)`}
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
                    <Label htmlFor="partNumber">Part Number *</Label>
                    <Input
                      id="partNumber"
                      type="number"
                      value={formData.partNumber}
                      onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partType">Part Type</Label>
                    <Select
                      value={formData.partType}
                      onValueChange={(value) => setFormData({ ...formData, partType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="URBAN">Urban</SelectItem>
                        <SelectItem value="RURAL">Rural</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boothName">Booth Name (English) *</Label>
                  <Input
                    id="boothName"
                    value={formData.boothName}
                    onChange={(e) => setFormData({ ...formData, boothName: e.target.value })}
                    placeholder="e.g., Government School"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boothNameLocal">Booth Name (Local)</Label>
                  <Input
                    id="boothNameLocal"
                    value={formData.boothNameLocal}
                    onChange={(e) => setFormData({ ...formData, boothNameLocal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full booth address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="landmark">Landmark</Label>
                    <Input
                      id="landmark"
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      placeholder="Near Bus Stand"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="6-digit code"
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
      <Card className="hover:shadow-sm hover:translate-y-0">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Parts Table */}
      <Card className="hover:shadow-sm hover:translate-y-0">
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
              <MapPinIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No parts found</p>
            </div>
          ) : (
            <>
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
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part: any) => (
                    <TableRow
                      key={part.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/parts/${part.id}`)}
                    >
                      <TableCell className="font-medium">{part.partNumber ?? '-'}</TableCell>
                      <TableCell>{part.boothName || part.boothNameLocal || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{part.address || '-'}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this part?')) {
                              deleteMutation.mutate(part.id);
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

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="p-4 flex justify-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                    Loading more...
                  </div>
                ) : hasNextPage ? (
                  <p className="text-sm text-muted-foreground">Scroll for more</p>
                ) : parts.length > PAGE_SIZE ? (
                  <p className="text-sm text-muted-foreground">
                    Showing all {parts.length} parts
                  </p>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
