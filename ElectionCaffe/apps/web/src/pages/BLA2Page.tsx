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
  partNo?: number;
  partNumber?: number;
  partNameEn?: string;
  partName?: string;
  partNameLocal?: string;
  boothAddress?: string;
  totalVoters?: number;
  bla2?: BLA2Agent;
}

interface BLA2Agent {
  id: string;
  cadreId: string;
  cadre?: {
    id: string;
    firstName?: string;
    lastName?: string;
    voterName?: string;
    mobile?: string;
  };
  status: string;
  trainingCompleted: boolean;
  assignedAt: string;
  notes?: string;
}

interface Cadre {
  id: string;
  firstName?: string;
  lastName?: string;
  voterName?: string;
  mobile?: string;
  designation?: string;
}

const BLA2_STATUSES = [
  { value: 'ASSIGNED', label: 'Assigned', color: 'bg-blue-500' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-green-500' },
  { value: 'TRAINING_PENDING', label: 'Training Pending', color: 'bg-amber-500' },
  { value: 'TRAINED', label: 'Trained', color: 'bg-emerald-500' },
  { value: 'INACTIVE', label: 'Inactive', color: 'bg-gray-500' },
];

export function BLA2Page() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
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
        part.partNameEn?.toLowerCase().includes(search.toLowerCase()) ||
        part.partNo?.toString().includes(search) ||
        part.bla2?.cadre?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        part.bla2?.cadre?.mobile?.includes(search);

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

  const assignMutation = useMutation({
    mutationFn: (data: { partId: string; cadreId: string; status: string; notes?: string }) =>
      partsAPI.assignBLA2(data.partId, data.cadreId, { status: data.status, notes: data.notes }),
    onSuccess: () => {
      toast.success('BLA-2 assigned successfully');
      setAssignOpen(false);
      setSelectedPart(null);
      setFormData({ cadreId: '', status: 'ASSIGNED', trainingCompleted: false, notes: '' });
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
          part.partNumber || part.partNo,
          `"${part.partName || part.partNameEn || ''}"`,
          part.bla2 ? `"${part.bla2.cadre?.voterName || `${part.bla2.cadre?.firstName || ''} ${part.bla2.cadre?.lastName || ''}`.trim()}"` : '',
          part.bla2?.cadre?.mobile || '',
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
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election to manage BLA-2 assignments.</p>
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
          <p className="text-gray-500">
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
                <p className="text-sm text-gray-500">Total Booths</p>
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
                <p className="text-sm text-gray-500">Assigned</p>
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
                <p className="text-sm text-gray-500">Trained</p>
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
                <p className="text-sm text-gray-500">Training Pending</p>
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
                <p className="text-sm text-gray-500">Coverage</p>
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
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No parts found</p>
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
                    className={cn(!part.bla2 && 'bg-gray-50')}
                  >
                    <TableCell>
                      <div className="font-medium">Part {part.partNumber || part.partNo}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[200px]">
                        {part.partName || part.partNameEn || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {part.bla2 ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-orange-100 text-orange-600 text-xs">
                              {getInitials(
                                part.bla2.cadre?.voterName || `${part.bla2.cadre?.firstName || ''} ${part.bla2.cadre?.lastName || ''}`
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {part.bla2.cadre?.voterName || `${part.bla2.cadre?.firstName || ''} ${part.bla2.cadre?.lastName || ''}`.trim() || '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not Assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {part.bla2?.cadre?.mobile ? (
                        <a
                          href={`tel:${part.bla2.cadre.mobile}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <PhoneIcon className="h-3 w-3" />
                          {part.bla2.cadre.mobile}
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
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign BLA-2</DialogTitle>
            <DialogDescription>
              Assign a Booth Level Agent for Part {selectedPart?.partNo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Cadre</Label>
              <Select
                value={formData.cadreId}
                onValueChange={(v) => setFormData({ ...formData, cadreId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cadre" />
                </SelectTrigger>
                <SelectContent>
                  {availableCadres.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No available cadres</div>
                  ) : (
                    availableCadres.map((cadre) => (
                      <SelectItem key={cadre.id} value={cadre.id}>
                        {cadre.voterName || `${cadre.firstName || ''} ${cadre.lastName || ''}`.trim() || '-'} ({cadre.mobile || '-'})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
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
              Update status for Part {selectedPart?.partNo}'s BLA-2
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
                className="h-4 w-4 rounded border-gray-300"
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
