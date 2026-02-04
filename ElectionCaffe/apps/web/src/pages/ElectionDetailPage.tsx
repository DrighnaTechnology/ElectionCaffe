import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { electionsAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  UserCogIcon,
  SettingsIcon,
} from 'lucide-react';
import { formatDate, formatNumber } from '../lib/utils';
import { useEffect } from 'react';

export function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setSelectedElection } = useElectionStore();

  useEffect(() => {
    if (id) {
      setSelectedElection(id);
    }
  }, [id, setSelectedElection]);

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
        <p className="text-gray-500">Election not found</p>
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
            <h1 className="text-2xl font-bold">{election.name || election.electionName}</h1>
            {getStatusBadge(election.status)}
          </div>
          <p className="text-gray-500">{election.constituency || election.constituencyName}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/elections/${id}/edit`)}>
          <SettingsIcon className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Election Date</p>
              <p className="font-semibold">
                {(election.pollDate || election.electionDate) ? formatDate(election.pollDate || election.electionDate) : 'Not set'}
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
              <p className="text-sm text-gray-500">Total Parts</p>
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
              <p className="text-sm text-gray-500">Total Voters</p>
              <p className="font-semibold">{formatNumber(stats?.totalVoters || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-full">
              <UserCogIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cadres</p>
              <p className="font-semibold">{formatNumber(stats?.totalCadres || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Tabs */}
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
                  <dt className="text-sm text-gray-500">Election Type</dt>
                  <dd className="font-medium">{election.electionType}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Constituency</dt>
                  <dd className="font-medium">{election.constituency || election.constituencyName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">State</dt>
                  <dd className="font-medium">{election.state || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">District</dt>
                  <dd className="font-medium">{election.district || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Taluka</dt>
                  <dd className="font-medium">{election.taluka || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Created At</dt>
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
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{formatNumber(stats?.totalVoters || 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Voters</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{formatNumber(stats?.maleVoters || 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">Male Voters</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-pink-600">{formatNumber(stats?.femaleVoters || 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">Female Voters</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">{formatNumber(stats?.totalFamilies || 0)}</p>
                    <p className="text-sm text-gray-500 mt-1">Families</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
