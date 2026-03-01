import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { electionsAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  UserCogIcon,
  EditIcon,
  SaveIcon,
  XIcon,
} from 'lucide-react';
import { formatDate, formatNumber } from '../lib/utils';
import { toast } from 'sonner';
import { Spinner } from '../components/ui/spinner';

const electionTypes = [
  { value: 'PARLIAMENT', label: 'General Election (Lok Sabha)' },
  { value: 'ASSEMBLY', label: 'State Assembly (Vidhan Sabha)' },
  { value: 'LOCAL_BODY', label: 'Local Body' },
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'PANCHAYAT', label: 'Panchayat' },
  { value: 'BY_ELECTION', label: 'By-Election' },
];

export function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { setSelectedElection } = useElectionStore();

  const isEditRoute = location.pathname.endsWith('/edit');
  const [isEditing, setIsEditing] = useState(isEditRoute);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (id) {
      setSelectedElection(id);
    }
  }, [id, setSelectedElection]);

  useEffect(() => {
    setIsEditing(isEditRoute);
  }, [isEditRoute]);

  const { data, isLoading } = useQuery({
    queryKey: ['election', id],
    queryFn: () => electionsAPI.getById(id!),
    enabled: !!id,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['election-stats', id],
    queryFn: () => electionsAPI.getStats(id!),
    enabled: !!id,
  });

  const election = data?.data?.data;
  const stats = statsData?.data?.data;

  // Populate edit form when election data loads or edit mode starts
  useEffect(() => {
    if (election && isEditing) {
      setEditData({
        name: election.name || '',
        electionType: election.electionType || 'ASSEMBLY',
        constituency: election.constituency || '',
        state: election.state || '',
        district: election.district || '',
        candidateName: election.candidateName || '',
        pollDate: election.pollDate ? new Date(election.pollDate).toISOString().split('T')[0] : '',
        startDate: election.startDate ? new Date(election.startDate).toISOString().split('T')[0] : '',
        endDate: election.endDate ? new Date(election.endDate).toISOString().split('T')[0] : '',
      });
    }
  }, [election, isEditing]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => electionsAPI.update(id!, data),
    onSuccess: () => {
      toast.success('Election updated successfully');
      queryClient.invalidateQueries({ queryKey: ['election', id] });
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setIsEditing(false);
      navigate(`/elections/${id}`, { replace: true });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update election');
    },
  });

  const handleSave = () => {
    if (!editData.name || !editData.constituency || !editData.state) {
      toast.error('Please fill in required fields (Name, Constituency, State)');
      return;
    }
    // Only send changed fields
    const updates: any = {};
    if (editData.name !== election.name) updates.name = editData.name;
    if (editData.electionType !== election.electionType) updates.electionType = editData.electionType;
    if (editData.constituency !== election.constituency) updates.constituency = editData.constituency;
    if (editData.state !== election.state) updates.state = editData.state;
    if (editData.district !== (election.district || '')) updates.district = editData.district || undefined;
    if (editData.candidateName !== (election.candidateName || '')) updates.candidateName = editData.candidateName || undefined;
    if (editData.pollDate) updates.pollDate = editData.pollDate;
    if (editData.startDate) updates.startDate = editData.startDate;
    if (editData.endDate) updates.endDate = editData.endDate;

    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save');
      setIsEditing(false);
      navigate(`/elections/${id}`, { replace: true });
      return;
    }
    updateMutation.mutate(updates);
  };

  const handleCancel = () => {
    setIsEditing(false);
    navigate(`/elections/${id}`, { replace: true });
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!election) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Election not found</p>
        <Button variant="link" onClick={() => navigate('/elections')}>
          Go back to elections
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/elections')}>
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{election.name}</h1>
            {getStatusBadge(election.status)}
          </div>
          <p className="text-muted-foreground">{election.constituency}</p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Spinner size="sm" className="mr-2" /> : <SaveIcon className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => navigate(`/elections/${id}/edit`)}>
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Election Date</p>
              <p className="font-semibold">
                {election.pollDate ? formatDate(election.pollDate) : 'Not set'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <MapPinIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Parts</p>
              <p className="font-semibold">{formatNumber(stats?.totalParts || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-full">
              <UsersIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Voters</p>
              <p className="font-semibold">{formatNumber(stats?.totalVoters || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-brand-muted rounded-full">
              <UserCogIcon className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cadres</p>
              <p className="font-semibold">{formatNumber(stats?.totalCadres || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Form or Details Tabs */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Election</CardTitle>
            <CardDescription>Update election details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Election Name *</Label>
                <Input
                  id="edit-name"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Election Type</Label>
                <Select
                  value={editData.electionType || 'ASSEMBLY'}
                  onValueChange={(value) => setEditData({ ...editData, electionType: value })}
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
                <Label htmlFor="edit-constituency">Constituency *</Label>
                <Input
                  id="edit-constituency"
                  value={editData.constituency || ''}
                  onChange={(e) => setEditData({ ...editData, constituency: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">State *</Label>
                <Input
                  id="edit-state"
                  value={editData.state || ''}
                  onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-district">District</Label>
                <Input
                  id="edit-district"
                  value={editData.district || ''}
                  onChange={(e) => setEditData({ ...editData, district: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-candidate">Candidate Name</Label>
                <Input
                  id="edit-candidate"
                  value={editData.candidateName || ''}
                  onChange={(e) => setEditData({ ...editData, candidateName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pollDate">Poll Date</Label>
                <Input
                  id="edit-pollDate"
                  type="date"
                  value={editData.pollDate || ''}
                  onChange={(e) => setEditData({ ...editData, pollDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Campaign Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={editData.startDate || ''}
                  onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Election Details</CardTitle>
                <CardDescription>Basic information about this election</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Election Type</dt>
                    <dd className="font-medium">{election.electionType}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Constituency</dt>
                    <dd className="font-medium">{election.constituency}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">State</dt>
                    <dd className="font-medium">{election.state || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">District</dt>
                    <dd className="font-medium">{election.district || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Candidate</dt>
                    <dd className="font-medium">{election.candidateName || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Created At</dt>
                    <dd className="font-medium">{formatDate(election.createdAt)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Election Statistics</CardTitle>
                <CardDescription>Overview of election data</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">{formatNumber(stats?.totalVoters || 0)}</p>
                      <p className="text-sm text-muted-foreground mt-1">Total Voters</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{formatNumber(stats?.maleVoters || 0)}</p>
                      <p className="text-sm text-muted-foreground mt-1">Male Voters</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-pink-600">{formatNumber(stats?.femaleVoters || 0)}</p>
                      <p className="text-sm text-muted-foreground mt-1">Female Voters</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-purple-600">{formatNumber(stats?.totalFamilies || 0)}</p>
                      <p className="text-sm text-muted-foreground mt-1">Families</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
