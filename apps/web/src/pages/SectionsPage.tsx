import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { partsAPI, api } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { BulkUpload, TemplateColumn } from '../components/BulkUpload';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Spinner } from '../components/ui/spinner';
import { toast } from 'sonner';
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  MapPinIcon,
  UsersIcon,
  AlertCircleIcon,
  LayoutGridIcon,
  GlobeIcon,
  FilterIcon,
} from 'lucide-react';

// Template columns for bulk upload
const sectionsTemplateColumns: TemplateColumn[] = [
  { key: 'partNo', label: 'Part Number', required: true, type: 'number', description: 'Part/Booth number (must exist)', example: 1 },
  { key: 'sectionNumber', label: 'Section Number', required: true, type: 'number', description: 'Unique section number within the part', example: 1 },
  { key: 'sectionName', label: 'Section Name', required: true, type: 'string', description: 'Section name in English', example: 'Section A' },
  { key: 'sectionNameLocal', label: 'Section Name (Local)', type: 'string', description: 'Section name in local language', example: '' },
  { key: 'isOverseas', label: 'Is Overseas', type: 'boolean', description: 'Yes/No - Is this an overseas section?', example: 'No' },
];

interface Section {
  id: string;
  sectionNumber: number;
  sectionName: string;
  sectionNameLocal?: string;
  isOverseas: boolean;
  totalVoters: number;
  part?: {
    id: string;
    partNumber: number;
    partName?: string;
    boothName?: string;
  };
}

export function SectionsPage() {
  const { selectedElectionId } = useElectionStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<string>('all');
  const [formData, setFormData] = useState({
    partId: '',
    sectionNumber: '',
    sectionName: '',
    sectionNameLocal: '',
    isOverseas: false,
  });
  const queryClient = useQueryClient();

  // Fetch parts for dropdown
  const { data: partsData } = useQuery({
    queryKey: ['parts', selectedElectionId],
    queryFn: () => partsAPI.getAll(selectedElectionId!, { limit: 1000 }),
    enabled: !!selectedElectionId,
  });

  // Fetch sections
  const { data: sectionsData, isLoading } = useQuery({
    queryKey: ['sections', selectedElectionId, selectedPartId],
    queryFn: () => api.get('/sections', {
      params: {
        electionId: selectedElectionId,
        ...(selectedPartId !== 'all' && { partId: selectedPartId })
      }
    }),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/sections', data, { params: { electionId: selectedElectionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', selectedElectionId] });
      toast.success('Section created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to create section'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', selectedElectionId] });
      toast.success('Section updated successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to update section'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', selectedElectionId] });
      toast.success('Section deleted successfully');
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to delete section'),
  });

  const resetForm = () => {
    setFormData({
      partId: '',
      sectionNumber: '',
      sectionName: '',
      sectionNameLocal: '',
      isOverseas: false,
    });
    setEditingSection(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      sectionNumber: parseInt(formData.sectionNumber),
    };
    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setFormData({
      partId: section.part?.id || '',
      sectionNumber: section.sectionNumber.toString(),
      sectionName: section.sectionName,
      sectionNameLocal: section.sectionNameLocal || '',
      isOverseas: section.isOverseas,
    });
    setIsDialogOpen(true);
  };

  const parts = partsData?.data?.data || [];
  const sections: Section[] = sectionsData?.data?.data || [];

  // Filter sections by search term
  const filteredSections = sections.filter((section) =>
    section.sectionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.sectionNumber?.toString().includes(searchTerm) ||
    section.part?.boothName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalVoters = filteredSections.reduce((sum, s) => sum + (s.totalVoters || 0), 0);
  const overseasCount = filteredSections.filter(s => s.isOverseas).length;

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    try {
      // Map part numbers to part IDs
      const partNoToId = new Map(parts.map((p: any) => [p.partNo || p.partNumber, p.id]));

      const sectionsToCreate = data.map(row => {
        const partNo = Number(row.partNo);
        const partId = partNoToId.get(partNo);
        if (!partId) {
          throw new Error(`Part number ${partNo} not found`);
        }
        return {
          partId,
          sectionNumber: Number(row.sectionNumber),
          sectionName: String(row.sectionName || ''),
          sectionNameLocal: row.sectionNameLocal ? String(row.sectionNameLocal) : undefined,
          isOverseas: row.isOverseas === true || row.isOverseas === 'Yes' || row.isOverseas === 'yes',
        };
      });

      const response = await api.post('/sections/bulk', { sections: sectionsToCreate }, { params: { electionId: selectedElectionId } });
      queryClient.invalidateQueries({ queryKey: ['sections'] });

      const result = response.data?.data || { created: sectionsToCreate.length };
      return {
        success: result.created || sectionsToCreate.length,
        failed: result.failed || 0,
        errors: result.errors || [],
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.message || 'Bulk upload failed');
    }
  };

  if (!selectedElectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircleIcon className="h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Election Selected</h2>
          <p className="text-gray-500">Please select an election from the sidebar to manage sections.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sections</h1>
          <p className="text-gray-500">Manage sections within parts/booths</p>
        </div>
        <div className="flex gap-2">
          <BulkUpload
            entityName="Sections"
            templateColumns={sectionsTemplateColumns}
            onUpload={handleBulkUpload}
          />
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><PlusIcon className="h-4 w-4 mr-2" />Add Section</Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSection ? 'Edit Section' : 'Add New Section'}</DialogTitle>
              <DialogDescription>Enter section details below</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partId">Part/Booth *</Label>
                <Select value={formData.partId} onValueChange={(v) => setFormData({ ...formData, partId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select part" />
                  </SelectTrigger>
                  <SelectContent>
                    {parts.map((part: any) => (
                      <SelectItem key={part.id} value={part.id}>
                        Part {part.partNumber || part.partNo || '-'} - {part.partName || part.boothName || '-'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sectionNumber">Section Number *</Label>
                  <Input
                    id="sectionNumber"
                    type="number"
                    placeholder="e.g., 1"
                    value={formData.sectionNumber}
                    onChange={(e) => setFormData({ ...formData, sectionNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isOverseas}
                      onChange={(e) => setFormData({ ...formData, isOverseas: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Overseas Section</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectionName">Section Name *</Label>
                <Input
                  id="sectionName"
                  placeholder="e.g., Section A, Ward 5"
                  value={formData.sectionName}
                  onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectionNameLocal">Local Name</Label>
                <Input
                  id="sectionNameLocal"
                  placeholder="Section name in local language"
                  value={formData.sectionNameLocal}
                  onChange={(e) => setFormData({ ...formData, sectionNameLocal: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Spinner size="sm" className="mr-2" />}
                  {editingSection ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <LayoutGridIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sections</p>
                <p className="text-2xl font-bold">{filteredSections.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Voters</p>
                <p className="text-2xl font-bold">{totalVoters.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MapPinIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Parts</p>
                <p className="text-2xl font-bold">{parts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <GlobeIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Overseas Sections</p>
                <p className="text-2xl font-bold">{overseasCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sections..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger className="w-full md:w-[250px]">
                <FilterIcon className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by Part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parts</SelectItem>
                {parts.map((part: any) => (
                  <SelectItem key={part.id} value={part.id}>
                    Part {part.partNumber} - {part.boothName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sections Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section #</TableHead>
                  <TableHead>Section Name</TableHead>
                  <TableHead>Local Name</TableHead>
                  <TableHead>Part/Booth</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Voters</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.sectionNumber}</TableCell>
                    <TableCell>{section.sectionName}</TableCell>
                    <TableCell>{section.sectionNameLocal || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Part {section.part?.partNumber || '-'} - {section.part?.partName || section.part?.boothName || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {section.isOverseas ? (
                        <Badge className="bg-orange-100 text-orange-700">
                          <GlobeIcon className="h-3 w-3 mr-1" />
                          Overseas
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Local</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{section.totalVoters.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(section)}>
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this section?')) {
                            deleteMutation.mutate(section.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm || selectedPartId !== 'all'
                        ? 'No sections found matching your criteria.'
                        : 'No sections found. Add your first section.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
