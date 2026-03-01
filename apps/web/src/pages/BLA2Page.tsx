import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partsAPI, cadresAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import {
  AlertTriangleIcon,
  SearchIcon,
  UserPlusIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircle2Icon,
  XCircleIcon,
  UserIcon,
  EditIcon,
  DownloadIcon,
  ClipboardListIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { getInitials, cn } from '../lib/utils';

interface Part {
  id: string;
  partNumber: number;
  boothName: string;
  partName?: string;
  partNameLocal?: string;
  address: string;
  totalVoters?: number;
  bla2?: BLA2Agent;
}

interface BLA2Agent {
  id: string;
  cadreId: string;
  cadre?: {
    id: string;
    cadreType?: string;
    designation?: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      mobile?: string;
    };
  };
  status: string;
  trainingCompleted: boolean;
  assignedAt: string;
  notes?: string;
}

interface Cadre {
  id: string;
  cadreType?: string;
  designation?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    mobile?: string;
  };
}

const BLA2_STATUSES = [
  { value: 'ASSIGNED', label: 'Assigned', color: 'bg-blue-500' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-green-500' },
  { value: 'TRAINING_PENDING', label: 'Training Pending', color: 'bg-amber-500' },
  { value: 'TRAINED', label: 'Trained', color: 'bg-emerald-500' },
  { value: 'INACTIVE', label: 'Inactive', color: 'bg-muted/500' },
];

export function BLA2Page() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [cadreSearch, setCadreSearch] = useState('');
  const [formData, setFormData] = useState({
    cadreId: '',
    status: 'ASSIGNED',
    trainingCompleted: false,
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: partsData, isLoading: partsLoading } = useQuery({
    queryKey: ['parts-bla2', selectedElectionId],
    queryFn: () => partsAPI.getAll(selectedElectionId!, { limit: 500 }),
    enabled: !!selectedElectionId,
  });

  const { data: cadresData } = useQuery({
    queryKey: ['cadres-bla2', selectedElectionId],
    queryFn: () => cadresAPI.getAll(selectedElectionId!, { limit: 500 }),
    enabled: !!selectedElectionId,
  });

  const parts: Part[] = partsData?.data?.data || [];
  const cadres: Cadre[] = cadresData?.data?.data || [];

  // Calculate stats
  const stats = useMemo(() => {
    let assigned = 0;
    let confirmed = 0;
    let trained = 0;
    let pending = 0;

    parts.forEach((part) => {
      if (part.bla2) {
        assigned++;
        if (part.bla2.status === 'CONFIRMED' || part.bla2.status === 'TRAINED') confirmed++;
        if (part.bla2.trainingCompleted) trained++;
        else pending++;
      }
    });

    const coverage = parts.length > 0 ? Math.round((assigned / parts.length) * 100) : 0;

    return { total: parts.length, assigned, confirmed, trained, pending, coverage };
  }, [parts]);

  // Filter parts
  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesSearch =
        !search ||
        part.boothName?.toLowerCase().includes(search.toLowerCase()) ||
        part.partNumber?.toString().includes(search) ||
        part.bla2?.cadre?.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        part.bla2?.cadre?.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        part.bla2?.cadre?.user?.mobile?.includes(search);

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'ASSIGNED' && part.bla2) ||
        (filterStatus === 'UNASSIGNED' && !part.bla2) ||
        (part.bla2?.status === filterStatus);

      return matchesSearch && matchesStatus;
    });
  }, [parts, search, filterStatus]);

  // Available cadres (not already assigned as BLA2)
  const availableCadres = useMemo(() => {
    const assignedIds = new Set(parts.filter((p) => p.bla2).map((p) => p.bla2!.cadreId));
    return cadres.filter((c) => !assignedIds.has(c.id));
  }, [cadres, parts]);

  // Filter available cadres by search
  const filteredCadres = useMemo(() => {
    if (!cadreSearch) return availableCadres;
    const q = cadreSearch.toLowerCase();
    return availableCadres.filter((c) => {
      const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.toLowerCase();
      const mobile = c.user?.mobile || '';
      return name.includes(q) || mobile.includes(q);
    });
  }, [availableCadres, cadreSearch]);

  const assignMutation = useMutation({
    mutationFn: (data: { partId: string; cadreId: string; status: string; notes?: string }) =>
      partsAPI.assignBLA2(data.partId, data.cadreId, { status: data.status, notes: data.notes }),
    onSuccess: () => {
      toast.success('BLA-2 assigned successfully');
      setAssignOpen(false);
      setSelectedPart(null);
      setFormData({ cadreId: '', status: 'ASSIGNED', trainingCompleted: false, notes: '' });
      setCadreSearch('');
      queryClient.invalidateQueries({ queryKey: ['parts-bla2'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to assign BLA-2');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { partId: string; status: string; trainingCompleted: boolean; notes?: string }) =>
      partsAPI.updateBLA2(data.partId, data),
    onSuccess: () => {
      toast.success('BLA-2 updated');
      setEditOpen(false);
      setSelectedPart(null);
      queryClient.invalidateQueries({ queryKey: ['parts-bla2'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (partId: string) => partsAPI.removeBLA2(partId),
    onSuccess: () => {
      toast.success('BLA-2 removed');
      queryClient.invalidateQueries({ queryKey: ['parts-bla2'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to remove');
    },
  });

  const handleAssign = () => {
    if (!selectedPart || !formData.cadreId) {
      toast.error('Please select a cadre');
      return;
    }
    assignMutation.mutate({
      partId: selectedPart.id,
      cadreId: formData.cadreId,
      status: formData.status,
      notes: formData.notes,
    });
  };

  const handleUpdate = () => {
    if (!selectedPart) return;
    updateMutation.mutate({
      partId: selectedPart.id,
      status: formData.status,
      trainingCompleted: formData.trainingCompleted,
      notes: formData.notes,
    });
  };

  const openAssignDialog = (part: Part) => {
    setSelectedPart(part);
    setFormData({ cadreId: '', status: 'ASSIGNED', trainingCompleted: false, notes: '' });
    setAssignOpen(true);
  };

  const openEditDialog = (part: Part) => {
    setSelectedPart(part);
    setFormData({
      cadreId: part.bla2?.cadreId || '',
      status: part.bla2?.status || 'ASSIGNED',
      trainingCompleted: part.bla2?.trainingCompleted || false,
      notes: part.bla2?.notes || '',
    });
    setEditOpen(true);
  };

  const getStatusBadge = (status?: string) => {
    const statusInfo = BLA2_STATUSES.find((s) => s.value === status);
    if (!statusInfo) return <Badge variant="secondary">Unknown</Badge>;

    return (
      <Badge className={cn('text-white', statusInfo.color)}>
        {statusInfo.label}
      </Badge>
    );
  };

  const handleExport = () => {
    const csvContent = [
      ['Part No', 'Part Name', 'BLA-2 Name', 'Mobile', 'Status', 'Training'].join(','),
      ...parts.map((part) =>
        [
          part.partNumber,
          `"${part.boothName || ''}"`,
          part.bla2 ? `"${`${part.bla2.cadre?.user?.firstName || ''} ${part.bla2.cadre?.user?.lastName || ''}`.trim() || '-'}"` : '',
          part.bla2?.cadre?.user?.mobile || '',
          part.bla2?.status || 'UNASSIGNED',
          part.bla2?.trainingCompleted ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bla2-assignments.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Election Selected</h2>
        <p className="text-muted-foreground mt-2">Please select an election to manage BLA-2 assignments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserIcon className="h-6 w-6" />
            BLA-2 Management
          </h1>
          <p className="text-muted-foreground">
            Booth Level Agent (Type 2) assignments for poll day operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <MapPinIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Booths</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle2Icon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold text-green-600">{stats.assigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <ClipboardListIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trained</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.trained}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Training Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <UserIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coverage</p>
                <p className="text-2xl font-bold text-purple-600">{stats.coverage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Assignment Progress</span>
              <span className="font-medium">{stats.assigned} / {stats.total} booths</span>
            </div>
            <Progress value={stats.coverage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by part, agent name, or mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {BLA2_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {partsLoading ? (
            <div className="p-4 space-y-4">
              {Array(10)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="p-8 text-center">
              <UserIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No parts found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>BLA-2 Agent</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Training</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => (
                  <TableRow
                    key={part.id}
                    className={cn(!part.bla2 && 'bg-muted/50')}
                  >
                    <TableCell>
                      <div className="font-medium">Part {part.partNumber}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {part.boothName || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {part.bla2 ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-brand-muted text-brand text-xs">
                              {getInitials(
                                `${part.bla2.cadre?.user?.firstName || ''} ${part.bla2.cadre?.user?.lastName || ''}`
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {`${part.bla2.cadre?.user?.firstName || ''} ${part.bla2.cadre?.user?.lastName || ''}`.trim() || '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not Assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {part.bla2?.cadre?.user?.mobile ? (
                        <a
                          href={`tel:${part.bla2.cadre.user.mobile}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <PhoneIcon className="h-3 w-3" />
                          {part.bla2.cadre.user.mobile}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {part.bla2 ? (
                        getStatusBadge(part.bla2.status)
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {part.bla2 ? (
                        part.bla2.trainingCompleted ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2Icon className="h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <XCircleIcon className="h-3 w-3" />
                            Pending
                          </Badge>
                        )
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {part.bla2 ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(part)}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Remove BLA-2 assignment?')) {
                                removeMutation.mutate(part.id);
                              }
                            }}
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(part)}
                        >
                          <UserPlusIcon className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={(open) => { setAssignOpen(open); if (!open) setCadreSearch(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign BLA-2</DialogTitle>
            <DialogDescription>
              Assign a Booth Level Agent for Part {selectedPart?.partNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Cadre</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type name or mobile to search..."
                  value={cadreSearch}
                  onChange={(e) => {
                    setCadreSearch(e.target.value);
                    if (formData.cadreId) setFormData({ ...formData, cadreId: '' });
                  }}
                  className="pl-9"
                />
                {formData.cadreId && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    onClick={() => { setCadreSearch(''); setFormData({ ...formData, cadreId: '' }); }}
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!formData.cadreId && cadreSearch.length > 0 && (
                <div className="border rounded-md max-h-[180px] overflow-y-auto bg-card shadow-sm">
                  {filteredCadres.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">No cadres found</div>
                  ) : (
                    filteredCadres.slice(0, 50).map((cadre) => {
                      const name = `${cadre.user?.firstName || ''} ${cadre.user?.lastName || ''}`.trim() || 'Unknown';
                      return (
                        <div
                          key={cadre.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-brand-muted cursor-pointer transition-colors"
                          onClick={() => {
                            setFormData({ ...formData, cadreId: cadre.id });
                            setCadreSearch(name);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {getInitials(name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{cadre.user?.mobile || '-'}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {formData.cadreId && (
                <div className="flex items-center gap-2 p-2 bg-brand-muted rounded-md border border-brand/30">
                  <CheckCircle2Icon className="h-4 w-4 text-brand" />
                  <span className="text-sm text-orange-700 font-medium">{cadreSearch}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {BLA2_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assignMutation.isPending}>
              {assignMutation.isPending && <Spinner size="sm" className="mr-2" />}
              Assign BLA-2
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update BLA-2</DialogTitle>
            <DialogDescription>
              Update status for Part {selectedPart?.partNumber}'s BLA-2
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {BLA2_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trainingCompleted"
                checked={formData.trainingCompleted}
                onChange={(e) =>
                  setFormData({ ...formData, trainingCompleted: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="trainingCompleted">Training Completed</Label>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Spinner size="sm" className="mr-2" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
