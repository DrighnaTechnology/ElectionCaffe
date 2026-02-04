import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { reportsAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
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
  AlertTriangleIcon,
  FileTextIcon,
  PlusIcon,
  DownloadIcon,
  TrashIcon,
  FileSpreadsheetIcon,
  UsersIcon,
  MapPinIcon,
  UserCogIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../lib/utils';

const reportTypes = [
  { value: 'VOTER_DEMOGRAPHICS', label: 'Voter Demographics', icon: UsersIcon, description: 'Complete demographic breakdown of voters' },
  { value: 'BOOTH_STATISTICS', label: 'Booth Statistics', icon: MapPinIcon, description: 'Statistics for all polling booths' },
  { value: 'CADRE_PERFORMANCE', label: 'Cadre Performance', icon: UserCogIcon, description: 'Performance metrics for cadres' },
  { value: 'FEEDBACK_SUMMARY', label: 'Feedback Summary', icon: MessageSquareIcon, description: 'Summary of all feedback received' },
];

export function ReportsPage() {
  const { selectedElectionId } = useElectionStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    reportName: '',
    reportType: 'VOTER_DEMOGRAPHICS',
    format: 'CSV',
  });

  const queryClient = useQueryClient();

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports', selectedElectionId],
    queryFn: () => reportsAPI.getAll(selectedElectionId!, { limit: 50 }),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      reportsAPI.create(selectedElectionId!, {
        reportName: formData.reportName,
        reportType: formData.reportType,
        format: formData.format,
      }),
    onSuccess: () => {
      toast.success('Report generation started');
      setCreateOpen(false);
      setFormData({ reportName: '', reportType: 'VOTER_DEMOGRAPHICS', format: 'CSV' });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create report');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsAPI.delete(id),
    onSuccess: () => {
      toast.success('Report deleted');
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const generateVoterDemographics = useMutation({
    mutationFn: (format: string) => reportsAPI.generateVoterDemographics(selectedElectionId!, format),
    onSuccess: (response) => {
      toast.success('Report generated successfully');
      // Handle download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voter-demographics-${Date.now()}.csv`;
      a.click();
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const generateBoothStatistics = useMutation({
    mutationFn: (format: string) => reportsAPI.generateBoothStatistics(selectedElectionId!, format),
    onSuccess: (response) => {
      toast.success('Report generated successfully');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booth-statistics-${Date.now()}.csv`;
      a.click();
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const generateCadrePerformance = useMutation({
    mutationFn: (format: string) => reportsAPI.generateCadrePerformance(selectedElectionId!, format),
    onSuccess: (response) => {
      toast.success('Report generated successfully');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cadre-performance-${Date.now()}.csv`;
      a.click();
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const generateFeedbackSummary = useMutation({
    mutationFn: (format: string) => reportsAPI.generateFeedbackSummary(selectedElectionId!, format),
    onSuccess: (response) => {
      toast.success('Report generated successfully');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-summary-${Date.now()}.csv`;
      a.click();
    },
    onError: () => toast.error('Failed to generate report'),
  });

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election from the sidebar to view reports.</p>
      </div>
    );
  }

  const reports = reportsData?.data?.data || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reportName) {
      toast.error('Please enter a report name');
      return;
    }
    createMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'PROCESSING':
        return <Badge variant="info">Processing</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileTextIcon className="h-7 w-7 text-blue-600" />
            Reports
          </h1>
          <p className="text-gray-500">Generate and download election reports</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
              <DialogDescription>Create a new report from your election data</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Report Name *</Label>
                  <Input
                    value={formData.reportName}
                    onChange={(e) => setFormData({ ...formData, reportName: e.target.value })}
                    placeholder="e.g., January 2024 Demographics"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select
                    value={formData.reportType}
                    onValueChange={(value) => setFormData({ ...formData, reportType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => setFormData({ ...formData, format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSV">CSV</SelectItem>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="PDF">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                  Generate
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Generate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((type) => (
          <Card key={type.value} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <type.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{type.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      switch (type.value) {
                        case 'VOTER_DEMOGRAPHICS':
                          generateVoterDemographics.mutate('csv');
                          break;
                        case 'BOOTH_STATISTICS':
                          generateBoothStatistics.mutate('csv');
                          break;
                        case 'CADRE_PERFORMANCE':
                          generateCadrePerformance.mutate('csv');
                          break;
                        case 'FEEDBACK_SUMMARY':
                          generateFeedbackSummary.mutate('csv');
                          break;
                      }
                    }}
                    disabled={
                      generateVoterDemographics.isPending ||
                      generateBoothStatistics.isPending ||
                      generateCadrePerformance.isPending ||
                      generateFeedbackSummary.isPending
                    }
                  >
                    <DownloadIcon className="h-4 w-4 mr-1" />
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reports History */}
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>Previously generated reports</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <FileSpreadsheetIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reports generated yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.reportName}</TableCell>
                    <TableCell>{report.reportType.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.format}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(report.createdAt)}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {report.status === 'COMPLETED' && (
                          <Button variant="ghost" size="icon">
                            <DownloadIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this report?')) {
                              deleteMutation.mutate(report.id);
                            }
                          }}
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
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
    </div>
  );
}
