import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { electionsAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
  LockIcon,
  UnlockIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../lib/utils';

const electionTypes = [
  { value: 'GENERAL', label: 'General Election' },
  { value: 'STATE', label: 'State Assembly' },
  { value: 'LOCAL', label: 'Local Body' },
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'PANCHAYAT', label: 'Panchayat' },
  { value: 'BY_ELECTION', label: 'By-Election' },
];

export function ElectionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    electionName: '',
    electionType: 'GENERAL',
    constituencyName: '',
    state: '',
    district: '',
    electionDate: '',
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedElection } = useElectionStore();

  const { data, isLoading } = useQuery({
    queryKey: ['elections', search, statusFilter],
    queryFn: () => electionsAPI.getAll({
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: () => electionsAPI.create(formData),
    onSuccess: () => {
      toast.success('Election created successfully');
      setCreateOpen(false);
      setFormData({
        electionName: '',
        electionType: 'GENERAL',
        constituencyName: '',
        state: '',
        district: '',
        electionDate: '',
      });
      queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create election');
    },
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => electionsAPI.lock(id),
    onSuccess: () => {
      toast.success('Election locked');
      queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => electionsAPI.unlock(id),
    onSuccess: () => {
      toast.success('Election unlocked');
      queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => electionsAPI.delete(id),
    onSuccess: () => {
      toast.success('Election deleted');
      queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete election');
    },
  });

  const elections = data?.data?.data || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.electionName || !formData.constituencyName) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate();
  };

  const handleViewElection = (election: any) => {
    setSelectedElection(election.id);
    navigate(`/elections/${election.id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      case 'LOCKED':
        return <Badge variant="destructive">Locked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Elections</h1>
          <p className="text-gray-500">Manage your elections</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Election
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Election</DialogTitle>
              <DialogDescription>Add a new election to manage</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="electionName">Election Name *</Label>
                  <Input
                    id="electionName"
                    value={formData.electionName}
                    onChange={(e) => setFormData({ ...formData, electionName: e.target.value })}
                    placeholder="e.g., Lok Sabha 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="electionType">Election Type</Label>
                  <Select
                    value={formData.electionType}
                    onValueChange={(value) => setFormData({ ...formData, electionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {electionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="constituencyName">Constituency Name *</Label>
                  <Input
                    id="constituencyName"
                    value={formData.constituencyName}
                    onChange={(e) => setFormData({ ...formData, constituencyName: e.target.value })}
                    placeholder="e.g., Mumbai North"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="Mumbai"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="electionDate">Election Date</Label>
                  <Input
                    id="electionDate"
                    type="date"
                    value={formData.electionDate}
                    onChange={(e) => setFormData({ ...formData, electionDate: e.target.value })}
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search elections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="LOCKED">Locked</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Elections Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
          ) : elections.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No elections found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Election Name</TableHead>
                  <TableHead>Constituency</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elections.map((election: any) => (
                  <TableRow key={election.id}>
                    <TableCell className="font-medium">{election.name || election.electionName || '-'}</TableCell>
                    <TableCell>{election.constituency || election.constituencyName || '-'}</TableCell>
                    <TableCell>
                      {election.candidateName ? (
                        <div className="flex items-center gap-2">
                          {election.candidatePhotoUrl ? (
                            <img
                              src={election.candidatePhotoUrl}
                              alt={election.candidateName}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{election.candidateName}</p>
                            {election.candidateParty && (
                              <p className="text-xs text-gray-500">{election.candidateParty.name || election.candidateParty.shortName}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{election.electionType || '-'}</TableCell>
                    <TableCell>{election.pollDate || election.electionDate ? formatDate(election.pollDate || election.electionDate) : '-'}</TableCell>
                    <TableCell>{getStatusBadge(election.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewElection(election)}>
                            <EyeIcon className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/elections/${election.id}/edit`)}>
                            <EditIcon className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {election.status !== 'LOCKED' ? (
                            <DropdownMenuItem onClick={() => lockMutation.mutate(election.id)}>
                              <LockIcon className="h-4 w-4 mr-2" />
                              Lock
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => unlockMutation.mutate(election.id)}>
                              <UnlockIcon className="h-4 w-4 mr-2" />
                              Unlock
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this election?')) {
                                deleteMutation.mutate(election.id);
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
    </div>
  );
}
