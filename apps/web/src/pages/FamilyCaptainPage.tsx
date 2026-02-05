import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familiesAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  UsersIcon,
  UserCheckIcon,
  UserPlusIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircle2Icon,
  Users2Icon,
  CrownIcon,
  EditIcon,
  FilterIcon,
  DownloadIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber, getInitials, cn } from '../lib/utils';

interface Family {
  id: string;
  familyCode?: string;
  familyName?: string;
  address?: string;
  partId: string;
  part?: {
    partNo?: number;
    partNumber?: number;
    partNameEn?: string;
    partName?: string;
  };
  captainId?: string;
  captain?: {
    id: string;
    voterNameEn?: string;
    voterName?: string;
    voterNameLocal?: string;
    mobile?: string;
    serialNo?: number;
  };
  totalMembers?: number;
  _count?: {
    members?: number;
    voters?: number;
  };
  members?: Voter[];
  voters?: Voter[];
}

interface Voter {
  id: string;
  serialNo?: number;
  voterNameEn?: string;
  voterName?: string;
  voterNameLocal?: string;
  mobile?: string;
  epicNo?: string;
  age?: number;
  gender?: string;
  familyId?: string;
}

export function FamilyCaptainPage() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: familiesData, isLoading: familiesLoading } = useQuery({
    queryKey: ['families-captains', selectedElectionId],
    queryFn: () => familiesAPI.getAll(selectedElectionId!, { limit: 500 }),
    enabled: !!selectedElectionId,
  });

  const families: Family[] = familiesData?.data?.data || [];

  // Fetch family members when a family is selected
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['family-members', selectedFamily?.id],
    queryFn: () => familiesAPI.getMembers(selectedFamily!.id),
    enabled: !!selectedFamily,
  });

  const familyMembers: Voter[] = membersData?.data?.data || [];

  // Calculate stats
  const stats = useMemo(() => {
    let withCaptain = 0;
    let withoutCaptain = 0;
    let totalMembers = 0;

    families.forEach((family) => {
      if (family.captainId) withCaptain++;
      else withoutCaptain++;
      totalMembers += family.totalMembers || family._count?.members || family._count?.voters || 0;
    });

    const coverage = families.length > 0 ? Math.round((withCaptain / families.length) * 100) : 0;

    return { total: families.length, withCaptain, withoutCaptain, totalMembers, coverage };
  }, [families]);

  // Filter families
  const filteredFamilies = useMemo(() => {
    return families.filter((family) => {
      const matchesSearch =
        !search ||
        (family.familyCode || family.familyName)?.toLowerCase().includes(search.toLowerCase()) ||
        family.address?.toLowerCase().includes(search.toLowerCase()) ||
        (family.captain?.voterName || family.captain?.voterNameEn)?.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'with' && family.captainId) ||
        (filterStatus === 'without' && !family.captainId);

      return matchesSearch && matchesFilter;
    });
  }, [families, search, filterStatus]);

  const assignCaptainMutation = useMutation({
    mutationFn: (data: { familyId: string; captainId: string }) =>
      familiesAPI.assignCaptain(data.familyId, data.captainId),
    onSuccess: () => {
      toast.success('Family captain assigned successfully');
      setAssignOpen(false);
      setSelectedCaptainId('');
      queryClient.invalidateQueries({ queryKey: ['families-captains'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to assign captain');
    },
  });

  const removeCaptainMutation = useMutation({
    mutationFn: (familyId: string) => familiesAPI.removeCaptain(familyId),
    onSuccess: () => {
      toast.success('Captain removed');
      queryClient.invalidateQueries({ queryKey: ['families-captains'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to remove captain');
    },
  });

  const handleAssignCaptain = () => {
    if (!selectedFamily || !selectedCaptainId) {
      toast.error('Please select a family member');
      return;
    }
    assignCaptainMutation.mutate({
      familyId: selectedFamily.id,
      captainId: selectedCaptainId,
    });
  };

  const openAssignDialog = (family: Family) => {
    setSelectedFamily(family);
    setSelectedCaptainId(family.captainId || '');
    setAssignOpen(true);
  };

  const handleExport = () => {
    const csvContent = [
      ['Family Code', 'Address', 'Part No', 'Members', 'Captain Name', 'Captain Mobile'].join(','),
      ...families.map((f) =>
        [
          f.familyCode || f.familyName || '',
          `"${f.address || ''}"`,
          f.part?.partNumber || f.part?.partNo || '',
          f.totalMembers || f._count?.members || f._count?.voters || 0,
          f.captain ? `"${f.captain.voterName || f.captain.voterNameEn}"` : '',
          f.captain?.mobile || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-captains.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election to manage family captains.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CrownIcon className="h-6 w-6" />
            Family Captains
          </h1>
          <p className="text-gray-500">Assign and manage family captains for voter outreach</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <DownloadIcon className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Users2Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Families</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <UserCheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">With Captain</p>
                <p className="text-2xl font-bold text-green-600">{stats.withCaptain}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <UserPlusIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Without Captain</p>
                <p className="text-2xl font-bold text-amber-600">{stats.withoutCaptain}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <UsersIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Members</p>
                <p className="text-2xl font-bold text-purple-600">{formatNumber(stats.totalMembers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <CrownIcon className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Coverage</p>
                <p className="text-2xl font-bold text-orange-600">{stats.coverage}%</p>
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
              <span>Captain Assignment Progress</span>
              <span className="font-medium">{stats.withCaptain} / {stats.total} families</span>
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
                placeholder="Search by family code, address, or captain name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <FilterIcon className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Families</SelectItem>
                <SelectItem value="with">With Captain</SelectItem>
                <SelectItem value="without">Without Captain</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Families Table */}
      <Card>
        <CardContent className="p-0">
          {familiesLoading ? (
            <div className="p-4 space-y-4">
              {Array(10)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
          ) : filteredFamilies.length === 0 ? (
            <div className="p-8 text-center">
              <Users2Icon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No families found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family Code</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Captain</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFamilies.map((family) => (
                  <TableRow
                    key={family.id}
                    className={cn(!family.captainId && 'bg-amber-50/50')}
                  >
                    <TableCell className="font-medium">{family.familyCode || family.familyName || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {family.address || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3 text-gray-400" />
                        <span>{family.part?.partNumber || family.part?.partNo || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <UsersIcon className="h-3 w-3 text-gray-400" />
                        {family.totalMembers || family._count?.members || family._count?.voters || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {family.captain ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-orange-100 text-orange-600 text-xs">
                              {getInitials(family.captain.voterName || family.captain.voterNameEn || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm">{family.captain.voterName || family.captain.voterNameEn}</div>
                            {family.captain.serialNo && <div className="text-xs text-gray-500">S.No: {family.captain.serialNo}</div>}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">
                          Not Assigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {family.captain?.mobile ? (
                        <a
                          href={`tel:${family.captain.mobile}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <PhoneIcon className="h-3 w-3" />
                          {family.captain.mobile}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignDialog(family)}
                        >
                          {family.captainId ? (
                            <>
                              <EditIcon className="h-3 w-3 mr-1" />
                              Change
                            </>
                          ) : (
                            <>
                              <UserPlusIcon className="h-3 w-3 mr-1" />
                              Assign
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Captain Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedFamily?.captainId ? 'Change' : 'Assign'} Family Captain
            </DialogTitle>
            <DialogDescription>
              Family: {selectedFamily?.familyCode || selectedFamily?.familyName} ({selectedFamily?.totalMembers || selectedFamily?._count?.members || selectedFamily?._count?.voters || 0} members)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {membersLoading ? (
              <div className="space-y-2">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
              </div>
            ) : familyMembers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No family members found
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <Label>Select Family Member as Captain</Label>
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      'p-3 border rounded-lg cursor-pointer transition-colors',
                      selectedCaptainId === member.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'hover:bg-gray-50'
                    )}
                    onClick={() => setSelectedCaptainId(member.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gray-100">
                            {getInitials(member.voterName || member.voterNameEn || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.voterName || member.voterNameEn}</div>
                          <div className="text-sm text-gray-500">
                            {member.serialNo && `S.No: ${member.serialNo} | `}{member.gender}{member.age && `, ${member.age} yrs`}
                          </div>
                        </div>
                      </div>
                      {selectedCaptainId === member.id && (
                        <CheckCircle2Icon className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    {member.mobile && (
                      <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                        <PhoneIcon className="h-3 w-3" />
                        {member.mobile}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            {selectedFamily?.captainId && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedFamily) {
                    removeCaptainMutation.mutate(selectedFamily.id);
                    setAssignOpen(false);
                  }
                }}
                disabled={removeCaptainMutation.isPending}
              >
                Remove Captain
              </Button>
            )}
            <Button
              onClick={handleAssignCaptain}
              disabled={!selectedCaptainId || assignCaptainMutation.isPending}
            >
              {assignCaptainMutation.isPending && <Spinner size="sm" className="mr-2" />}
              {selectedFamily?.captainId ? 'Change' : 'Assign'} Captain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
