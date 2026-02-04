import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { dataCaffeAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  DatabaseIcon,
  PlusIcon,
  ExternalLinkIcon,
  MoreVerticalIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  RefreshCwIcon,
  LayoutTemplateIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../lib/utils';

const embedTypes = [
  { value: 'DASHBOARD', label: 'Dashboard' },
  { value: 'CHART', label: 'Chart' },
  { value: 'REPORT', label: 'Report' },
  { value: 'TABLE', label: 'Table' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function DataCaffePage() {
  const { selectedElectionId } = useElectionStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewEmbed, setViewEmbed] = useState<any>(null);
  const [formData, setFormData] = useState({
    embedName: '',
    embedUrl: '',
    embedType: 'DASHBOARD',
    description: '',
  });

  const queryClient = useQueryClient();

  const { data: embedsData, isLoading } = useQuery({
    queryKey: ['datacaffe-embeds', selectedElectionId],
    queryFn: () => dataCaffeAPI.getEmbeds(selectedElectionId ?? undefined, { limit: 50 }),
    enabled: true,
  });

  const { data: templatesData } = useQuery({
    queryKey: ['datacaffe-templates'],
    queryFn: () => dataCaffeAPI.getTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      dataCaffeAPI.createEmbed(selectedElectionId ?? undefined, {
        embedName: formData.embedName,
        embedUrl: formData.embedUrl,
        embedType: formData.embedType,
        description: formData.description || undefined,
      }),
    onSuccess: () => {
      toast.success('Embed created successfully');
      setCreateOpen(false);
      setFormData({ embedName: '', embedUrl: '', embedType: 'DASHBOARD', description: '' });
      queryClient.invalidateQueries({ queryKey: ['datacaffe-embeds'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create embed');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => dataCaffeAPI.toggleEmbed(id),
    onSuccess: () => {
      toast.success('Embed visibility updated');
      queryClient.invalidateQueries({ queryKey: ['datacaffe-embeds'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataCaffeAPI.deleteEmbed(id),
    onSuccess: () => {
      toast.success('Embed deleted');
      queryClient.invalidateQueries({ queryKey: ['datacaffe-embeds'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => dataCaffeAPI.syncData(selectedElectionId!),
    onSuccess: () => {
      toast.success('Data sync initiated');
    },
    onError: () => toast.error('Failed to sync data'),
  });

  const embeds = embedsData?.data?.data || [];
  const templates = templatesData?.data?.data || [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.embedName || !formData.embedUrl) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate();
  };

  const useTemplate = (template: any) => {
    setFormData({
      embedName: template.name,
      embedUrl: template.url,
      embedType: template.type,
      description: template.description,
    });
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DatabaseIcon className="h-7 w-7 text-orange-600" />
            DataCaffe.ai
          </h1>
          <p className="text-gray-500">Embed advanced analytics dashboards and reports</p>
        </div>
        <div className="flex gap-2">
          {selectedElectionId && (
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? <Spinner size="sm" className="mr-2" /> : <RefreshCwIcon className="h-4 w-4 mr-2" />}
              Sync Data
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Embed
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add DataCaffe Embed</DialogTitle>
                <DialogDescription>Embed a DataCaffe.ai dashboard or report</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Embed Name *</Label>
                    <Input
                      value={formData.embedName}
                      onChange={(e) => setFormData({ ...formData, embedName: e.target.value })}
                      placeholder="e.g., Voter Analytics Dashboard"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Embed URL *</Label>
                    <Input
                      value={formData.embedUrl}
                      onChange={(e) => setFormData({ ...formData, embedUrl: e.target.value })}
                      placeholder="https://app.datacaffe.ai/embed/..."
                    />
                    <p className="text-xs text-gray-500">
                      Get the embed URL from your DataCaffe.ai dashboard
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Embed Type</Label>
                    <Select
                      value={formData.embedType}
                      onValueChange={(value) => setFormData({ ...formData, embedType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {embedTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                    Add Embed
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Embed Dialog */}
      <Dialog open={!!viewEmbed} onOpenChange={() => setViewEmbed(null)}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewEmbed?.embedName}</DialogTitle>
            <DialogDescription>{viewEmbed?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 h-full">
            {viewEmbed && (
              <iframe
                src={viewEmbed.embedUrl}
                className="w-full h-[calc(80vh-120px)] border rounded-lg"
                title={viewEmbed.embedName}
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Section */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplateIcon className="h-5 w-5" />
              Quick Start Templates
            </CardTitle>
            <CardDescription>Pre-configured DataCaffe.ai embeds to get started quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template: any) => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg hover:border-orange-300 hover:bg-orange-50 cursor-pointer transition-colors"
                  onClick={() => useTemplate(template)}
                >
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  <Badge variant="outline" className="mt-2">
                    {template.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embeds Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            ))}
        </div>
      ) : embeds.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DatabaseIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Embeds Yet</h3>
            <p className="text-gray-500 mt-2 mb-4">
              Add DataCaffe.ai embeds to visualize your election data with advanced analytics
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Embed
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {embeds.map((embed: any) => (
            <Card key={embed.id} className="overflow-hidden">
              <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                {embed.isActive ? (
                  <iframe
                    src={embed.embedUrl}
                    className="w-full h-full pointer-events-none"
                    title={embed.embedName}
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <EyeOffIcon className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Hidden</p>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8">
                        <MoreVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewEmbed(embed)}>
                        <ExternalLinkIcon className="h-4 w-4 mr-2" />
                        View Full
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleMutation.mutate(embed.id)}>
                        {embed.isActive ? (
                          <>
                            <EyeOffIcon className="h-4 w-4 mr-2" />
                            Hide
                          </>
                        ) : (
                          <>
                            <EyeIcon className="h-4 w-4 mr-2" />
                            Show
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <EditIcon className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Delete this embed?')) {
                            deleteMutation.mutate(embed.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{embed.embedName}</h3>
                    {embed.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{embed.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="outline">{embed.embedType}</Badge>
                  <span className="text-xs text-gray-400">{formatDate(embed.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Section */}
      <Card className="bg-gradient-to-r from-orange-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <DatabaseIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">About DataCaffe.ai Integration</h3>
              <p className="text-gray-600 mt-1">
                DataCaffe.ai provides advanced analytics and visualization capabilities for your election data.
                Embed interactive dashboards, charts, and reports directly in ElectionCaffe for deeper insights.
              </p>
              <div className="flex gap-4 mt-4">
                <a
                  href="https://datacaffe.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-600 hover:underline flex items-center gap-1"
                >
                  Visit DataCaffe.ai
                  <ExternalLinkIcon className="h-3 w-3" />
                </a>
                <a
                  href="https://docs.datacaffe.ai/embedding"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  Learn about embedding
                  <ExternalLinkIcon className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
