import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partsAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Spinner } from '../components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  EditIcon,
  MapPinIcon,
  UsersIcon,
  LayoutGridIcon,
  BuildingIcon,
  ShieldAlertIcon,
} from 'lucide-react';

export function PartDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: partData, isLoading } = useQuery({
    queryKey: ['part', id],
    queryFn: () => partsAPI.getById(id!),
    enabled: !!id,
  });

  const part = partData?.data?.data;

  const [formData, setFormData] = useState<any>({});

  const updateMutation = useMutation({
    mutationFn: (data: any) => partsAPI.update(id!, data),
    onSuccess: () => {
      toast.success('Part updated successfully');
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['part', id] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update part');
    },
  });

  const handleEditOpen = () => {
    if (part) {
      setFormData({
        boothName: part.boothName || '',
        boothNameLocal: part.boothNameLocal || '',
        address: part.address || '',
        partType: part.partType || 'URBAN',
        landmark: part.landmark || '',
        pincode: part.pincode || '',
        latitude: part.latitude ?? '',
        longitude: part.longitude ?? '',
      });
    }
    setIsEditOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      boothName: formData.boothName,
      boothNameLocal: formData.boothNameLocal || undefined,
      address: formData.address || undefined,
      partType: formData.partType,
      landmark: formData.landmark || undefined,
      pincode: formData.pincode || undefined,
    };
    if (formData.latitude !== '') data.latitude = parseFloat(formData.latitude);
    if (formData.longitude !== '') data.longitude = parseFloat(formData.longitude);
    updateMutation.mutate(data);
  };

  const getVulnerabilityColor = (v: string) => {
    switch (v) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-muted-foreground">Part not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/parts')}>
          Back to Parts
        </Button>
      </div>
    );
  }

  const sections = part.sections || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/parts')}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Part {part.partNumber}</h1>
          <p className="text-muted-foreground">Part / Booth details</p>
        </div>
        <Button onClick={handleEditOpen}>
          <EditIcon className="h-4 w-4 mr-2" />
          Edit Part
        </Button>
      </div>

      {/* Part Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-center justify-center h-20 w-20 rounded-xl bg-blue-50 text-blue-600 text-2xl font-bold shrink-0">
              #{part.partNumber}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">{part.boothName}</h2>
              {part.boothNameLocal && (
                <p className="text-muted-foreground mb-3">{part.boothNameLocal}</p>
              )}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{part.partType || 'URBAN'}</Badge>
                <Badge variant={getVulnerabilityColor(part.vulnerability) as any}>
                  {part.vulnerability || 'Normal'} Vulnerability
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium truncate">{part.address || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Landmark:</span>
                  <span className="font-medium">{part.landmark || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Pincode:</span>
                  <span className="font-medium">{part.pincode || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldAlertIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Election:</span>
                  <span className="font-medium">{part.election?.name || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{part.totalVoters ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Voters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-2xl font-bold">{part.maleVoters ?? 0}</p>
                <p className="text-xs text-muted-foreground">Male</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{part.femaleVoters ?? 0}</p>
                <p className="text-xs text-muted-foreground">Female</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <UsersIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{part.otherVoters ?? 0}</p>
                <p className="text-xs text-muted-foreground">Other</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <LayoutGridIcon className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{sections.length}</p>
                <p className="text-xs text-muted-foreground">Sections</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections Table */}
      {sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section No</TableHead>
                  <TableHead>Section Name</TableHead>
                  <TableHead>Name (Local)</TableHead>
                  <TableHead>Total Voters</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section: any) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.sectionNumber}</TableCell>
                    <TableCell>{section.sectionName || '-'}</TableCell>
                    <TableCell>{section.sectionNameLocal || '-'}</TableCell>
                    <TableCell>{section.totalVoters ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Vulnerability Notes */}
      {part.vulnerabilityNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vulnerability Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{part.vulnerabilityNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Part {part.partNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Booth Name (English) *</Label>
                <Input
                  value={formData.boothName || ''}
                  onChange={(e) => setFormData({ ...formData, boothName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Booth Name (Local)</Label>
                <Input
                  value={formData.boothNameLocal || ''}
                  onChange={(e) => setFormData({ ...formData, boothNameLocal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Part Type</Label>
                  <Select
                    value={formData.partType || 'URBAN'}
                    onValueChange={(v) => setFormData({ ...formData, partType: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URBAN">Urban</SelectItem>
                      <SelectItem value="RURAL">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Landmark</Label>
                <Input
                  value={formData.landmark || ''}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.latitude ?? ''}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.longitude ?? ''}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
