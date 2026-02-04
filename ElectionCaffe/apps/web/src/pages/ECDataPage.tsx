import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ecDataAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DatabaseIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  UsersIcon,
  MapPinIcon,
  CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ECDataPage() {
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['ec-data-status'],
    queryFn: () => ecDataAPI.getStatus(),
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['ec-data-summary'],
    queryFn: () => ecDataAPI.getSummary(),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['ec-data-history'],
    queryFn: () => ecDataAPI.getSyncHistory({ limit: 10 }),
  });

  const requestSyncMutation = useMutation({
    mutationFn: () => ecDataAPI.requestSync(),
    onSuccess: () => {
      toast.success('Sync request submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['ec-data-status'] });
      queryClient.invalidateQueries({ queryKey: ['ec-data-history'] });
    },
    onError: () => {
      toast.error('Failed to request sync');
    },
  });

  const status = statusData?.data?.data;
  const summary = summaryData?.data?.data;
  const history = historyData?.data?.data || [];

  const getStatusBadge = (syncStatus: string) => {
    switch (syncStatus) {
      case 'ACTIVE':
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{syncStatus || 'Unknown'}</Badge>;
    }
  };

  const getSyncStatusIcon = (syncStatus: string) => {
    switch (syncStatus) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'PENDING':
      case 'IN_PROGRESS':
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'FAILED':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangleIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">EC Data</h1>
          <p className="text-muted-foreground">
            View Election Commission data synced for your constituency
          </p>
        </div>
        <Button
          onClick={() => requestSyncMutation.mutate()}
          disabled={requestSyncMutation.isPending}
        >
          <RefreshCwIcon className={`h-4 w-4 mr-2 ${requestSyncMutation.isPending ? 'animate-spin' : ''}`} />
          Request Sync
        </Button>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5" />
            Integration Status
          </CardTitle>
          <CardDescription>
            Current status of EC data integration for your tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : status ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                {getStatusBadge(status.status)}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="text-sm font-medium">
                  {status.lastSyncAt
                    ? format(new Date(status.lastSyncAt), 'PPp')
                    : 'Never'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Next Scheduled Sync</p>
                <p className="text-sm font-medium">
                  {status.nextSyncAt
                    ? format(new Date(status.nextSyncAt), 'PPp')
                    : 'Not scheduled'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Data Source</p>
                <p className="text-sm font-medium">{status.dataSource || 'Election Commission API'}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No integration configured for your tenant</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalVoters?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Voters</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPinIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalBooths?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">Polling Booths</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CalendarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalParts?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">Parts/Wards</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DatabaseIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.lastUpdateRecords?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">Records Updated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>
            Recent data synchronization events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((sync: any) => (
                  <TableRow key={sync.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSyncStatusIcon(sync.status)}
                        <span className="capitalize">{sync.status?.toLowerCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sync.startedAt ? format(new Date(sync.startedAt), 'PPp') : '-'}
                    </TableCell>
                    <TableCell>
                      {sync.completedAt ? format(new Date(sync.completedAt), 'PPp') : '-'}
                    </TableCell>
                    <TableCell>{sync.recordsProcessed?.toLocaleString() || 0}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {sync.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No sync history available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
