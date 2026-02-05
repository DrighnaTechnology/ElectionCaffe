import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
// Table imports removed - not used in this component
import { Switch } from '../components/ui/switch';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import {
  AlertTriangleIcon,
  PlusIcon,
  ImageIcon,
  LinkIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  SmartphoneIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import api from '../services/api';

interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: 'internal' | 'external' | 'none';
  position: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  targetAudience?: string;
  createdAt: string;
}

const bannersAPI = {
  getAll: (electionId: string) =>
    api.get(`/elections/${electionId}/banners`),
  create: (electionId: string, data: any) =>
    api.post(`/elections/${electionId}/banners`, data),
  update: (bannerId: string, data: any) =>
    api.put(`/banners/${bannerId}`, data),
  delete: (bannerId: string) =>
    api.delete(`/banners/${bannerId}`),
  reorder: (electionId: string, bannerIds: string[]) =>
    api.post(`/elections/${electionId}/banners/reorder`, { bannerIds }),
};

export function AppBannerPage() {
  const { selectedElectionId } = useElectionStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [previewBanner, setPreviewBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    linkType: 'none' as 'internal' | 'external' | 'none',
    targetAudience: 'all',
    startDate: '',
    endDate: '',
  });
  const queryClient = useQueryClient();

  const { data: bannersData, isLoading } = useQuery({
    queryKey: ['banners', selectedElectionId],
    queryFn: () => bannersAPI.getAll(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  const banners: Banner[] = bannersData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => bannersAPI.create(selectedElectionId!, data),
    onSuccess: () => {
      toast.success('Banner created successfully');
      setCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create banner');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: any }) =>
      bannersAPI.update(data.id, data.updates),
    onSuccess: () => {
      toast.success('Banner updated');
      setEditBanner(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update banner');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannersAPI.delete(id),
    onSuccess: () => {
      toast.success('Banner deleted');
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete banner');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) =>
      bannersAPI.update(data.id, { isActive: data.isActive }),
    onSuccess: () => {
      toast.success('Banner status updated');
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      linkUrl: '',
      linkType: 'none',
      targetAudience: 'all',
      startDate: '',
      endDate: '',
    });
  };

  const handleCreate = () => {
    if (!formData.title || !formData.imageUrl) {
      toast.error('Title and image URL are required');
      return;
    }
    createMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      imageUrl: formData.imageUrl,
      linkUrl: formData.linkUrl || undefined,
      linkType: formData.linkType,
      targetAudience: formData.targetAudience,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editBanner || !formData.title || !formData.imageUrl) {
      toast.error('Title and image URL are required');
      return;
    }
    updateMutation.mutate({
      id: editBanner.id,
      updates: {
        title: formData.title,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl,
        linkUrl: formData.linkUrl || undefined,
        linkType: formData.linkType,
        targetAudience: formData.targetAudience,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      },
    });
  };

  const openEditDialog = (banner: Banner) => {
    setEditBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || '',
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      linkType: banner.linkType || 'none',
      targetAudience: banner.targetAudience || 'all',
      startDate: banner.startDate?.split('T')[0] || '',
      endDate: banner.endDate?.split('T')[0] || '',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      deleteMutation.mutate(id);
    }
  };

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election to manage app banners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            App Banners
          </h1>
          <p className="text-gray-500">
            Manage promotional banners displayed in the mobile app
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Banner</DialogTitle>
              <DialogDescription>
                Add a new promotional banner for the mobile app
              </DialogDescription>
            </DialogHeader>
            <BannerForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreate}
              onCancel={() => {
                setCreateOpen(false);
                resetForm();
              }}
              isPending={createMutation.isPending}
              submitLabel="Create Banner"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <ImageIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Banners</p>
                <p className="text-2xl font-bold">{banners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <EyeIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {banners.filter((b) => b.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gray-100">
                <EyeOffIcon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">
                  {banners.filter((b) => !b.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <LinkIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">With Links</p>
                <p className="text-2xl font-bold text-purple-600">
                  {banners.filter((b) => b.linkUrl).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banners List */}
      <Card>
        <CardHeader>
          <CardTitle>All Banners</CardTitle>
          <CardDescription>Drag to reorder banner display sequence</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="p-8 text-center">
              <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No banners yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Banner
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={cn(
                    'flex items-center gap-4 p-4',
                    !banner.isActive && 'opacity-60 bg-gray-50'
                  )}
                >
                  <div className="cursor-move text-gray-400 hover:text-gray-600">
                    <GripVerticalIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-gray-100">
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/320x200?text=Banner';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{banner.title}</h3>
                      <Badge variant={banner.isActive ? 'success' : 'secondary'}>
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {banner.linkUrl && (
                        <Badge variant="outline" className="gap-1">
                          <LinkIcon className="h-3 w-3" />
                          {banner.linkType}
                        </Badge>
                      )}
                    </div>
                    {banner.description && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {banner.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Position: {index + 1}</span>
                      {banner.startDate && (
                        <span>
                          Start: {new Date(banner.startDate).toLocaleDateString()}
                        </span>
                      )}
                      {banner.endDate && (
                        <span>
                          End: {new Date(banner.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={banner.isActive}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: banner.id, isActive: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewBanner(banner)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(banner)}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(banner.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editBanner} onOpenChange={(open) => !open && setEditBanner(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Banner</DialogTitle>
            <DialogDescription>Update banner details</DialogDescription>
          </DialogHeader>
          <BannerForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditBanner(null);
              resetForm();
            }}
            isPending={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewBanner} onOpenChange={(open) => !open && setPreviewBanner(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SmartphoneIcon className="h-5 w-5" />
              Mobile Preview
            </DialogTitle>
          </DialogHeader>
          <div className="bg-gray-900 rounded-xl p-2 mx-auto" style={{ width: 280 }}>
            <div className="bg-white rounded-lg overflow-hidden">
              {previewBanner?.imageUrl && (
                <img
                  src={previewBanner.imageUrl}
                  alt={previewBanner.title}
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/320x200?text=Banner';
                  }}
                />
              )}
              <div className="p-3">
                <h4 className="font-semibold text-sm">{previewBanner?.title}</h4>
                {previewBanner?.description && (
                  <p className="text-xs text-gray-500 mt-1">{previewBanner.description}</p>
                )}
                {previewBanner?.linkUrl && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                    <ExternalLinkIcon className="h-3 w-3" />
                    Learn More
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Banner Form Component
function BannerForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Banner title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Short description (optional)"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">Image URL *</Label>
        <Input
          id="imageUrl"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          placeholder="https://example.com/banner.jpg"
        />
        {formData.imageUrl && (
          <div className="mt-2 rounded-lg overflow-hidden border">
            <img
              src={formData.imageUrl}
              alt="Preview"
              className="w-full h-32 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/320x200?text=Invalid+URL';
              }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="linkType">Link Type</Label>
          <Select
            value={formData.linkType}
            onValueChange={(v) => setFormData({ ...formData, linkType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Link</SelectItem>
              <SelectItem value="internal">Internal (App)</SelectItem>
              <SelectItem value="external">External (Browser)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetAudience">Target Audience</Label>
          <Select
            value={formData.targetAudience}
            onValueChange={(v) => setFormData({ ...formData, targetAudience: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="cadres">Cadres Only</SelectItem>
              <SelectItem value="admins">Admins Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.linkType !== 'none' && (
        <div className="space-y-2">
          <Label htmlFor="linkUrl">Link URL</Label>
          <Input
            id="linkUrl"
            value={formData.linkUrl}
            onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
            placeholder={
              formData.linkType === 'internal'
                ? '/dashboard or /voters'
                : 'https://example.com'
            }
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending && <Spinner size="sm" className="mr-2" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
