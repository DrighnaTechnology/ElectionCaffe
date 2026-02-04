import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { masterDataAPI, api } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Spinner } from '../components/ui/spinner';
import { toast } from 'sonner';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  ChurchIcon,
  UsersIcon,
  FlagIcon,
  LanguagesIcon,
  GiftIcon,
  TagIcon,
  AlertCircleIcon,
} from 'lucide-react';

interface MasterDataItem {
  id: string;
  name: string;
  nameLocal?: string;
  color?: string;
  imageUrl?: string;
  isActive: boolean;
  displayOrder: number;
  voterCount?: number;
  [key: string]: any;
}

// Religion Tab Component
function ReligionsTab({ electionId }: { electionId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [formData, setFormData] = useState({ religionName: '', religionNameLocal: '', religionColor: '#808080', religionImageUrl: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['religions', electionId],
    queryFn: () => masterDataAPI.getReligions(electionId),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => masterDataAPI.createReligion(electionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religions', electionId] });
      toast.success('Religion created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create religion'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => masterDataAPI.updateReligion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religions', electionId] });
      toast.success('Religion updated successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to update religion'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => masterDataAPI.deleteReligion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['religions', electionId] });
      toast.success('Religion deleted successfully');
    },
    onError: () => toast.error('Failed to delete religion'),
  });

  const resetForm = () => {
    setFormData({ religionName: '', religionNameLocal: '', religionColor: '#808080', religionImageUrl: '' });
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      religionName: item.religionName,
      religionNameLocal: item.religionNameLocal || '',
      religionColor: item.religionColor || '#808080',
      religionImageUrl: item.religionImageUrl || '',
    });
    setIsDialogOpen(true);
  };

  const religions = data?.data?.data || [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Religions</h3>
          <p className="text-sm text-gray-500">Manage religions for voter categorization</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Add Religion</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Religion' : 'Add Religion'}</DialogTitle>
              <DialogDescription>Enter the religion details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="religionName">Religion Name *</Label>
                <Input id="religionName" value={formData.religionName} onChange={(e) => setFormData({ ...formData, religionName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="religionNameLocal">Local Name</Label>
                <Input id="religionNameLocal" value={formData.religionNameLocal} onChange={(e) => setFormData({ ...formData, religionNameLocal: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="religionColor">Color</Label>
                <div className="flex gap-2">
                  <Input type="color" id="religionColor" className="w-16 h-10" value={formData.religionColor} onChange={(e) => setFormData({ ...formData, religionColor: e.target.value })} />
                  <Input value={formData.religionColor} onChange={(e) => setFormData({ ...formData, religionColor: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Spinner size="sm" className="mr-2" />}
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Color</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Local Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {religions.map((religion: any) => (
            <TableRow key={religion.id}>
              <TableCell>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: religion.religionColor || religion.color || '#808080' }} />
              </TableCell>
              <TableCell className="font-medium">{religion.name || religion.religionName || '-'}</TableCell>
              <TableCell>{religion.nameLocal || religion.religionNameLocal || '-'}</TableCell>
              <TableCell>
                <Badge variant={religion.isActive ? 'default' : 'secondary'}>
                  {religion.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(religion)}><EditIcon className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(religion.id)}><TrashIcon className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {religions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">No religions found. Add your first religion.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Caste Categories Tab Component
function CasteCategoriesTab({ electionId }: { electionId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ categoryName: '', categoryFullName: '', reservationPercent: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['casteCategories', electionId],
    queryFn: () => masterDataAPI.getCasteCategories(electionId),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/caste-categories', data, { params: { electionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casteCategories', electionId] });
      toast.success('Caste category created successfully');
      setIsDialogOpen(false);
      setFormData({ categoryName: '', categoryFullName: '', reservationPercent: '' });
    },
    onError: () => toast.error('Failed to create caste category'),
  });

  const categories = data?.data?.data || [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Caste Categories</h3>
          <p className="text-sm text-gray-500">Categories like OC, BC, MBC, SC, ST</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Caste Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name *</Label>
                <Input id="categoryName" placeholder="e.g., BC, SC, ST" value={formData.categoryName} onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryFullName">Full Name</Label>
                <Input id="categoryFullName" placeholder="e.g., Backward Classes" value={formData.categoryFullName} onChange={(e) => setFormData({ ...formData, categoryFullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservationPercent">Reservation %</Label>
                <Input id="reservationPercent" type="number" step="0.1" placeholder="e.g., 27" value={formData.reservationPercent} onChange={(e) => setFormData({ ...formData, reservationPercent: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Reservation %</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat: any) => (
            <TableRow key={cat.id}>
              <TableCell className="font-medium">{cat.name || cat.categoryName || '-'}</TableCell>
              <TableCell>{cat.nameLocal || cat.categoryFullName || '-'}</TableCell>
              <TableCell>{cat.reservationPercent ? `${cat.reservationPercent}%` : '-'}</TableCell>
              <TableCell><Badge variant={cat.isActive !== false ? 'default' : 'secondary'}>{cat.isActive !== false ? 'Active' : 'Inactive'}</Badge></TableCell>
            </TableRow>
          ))}
          {categories.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">No caste categories found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Castes Tab Component
function CastesTab({ electionId }: { electionId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ casteName: '', casteNameLocal: '', casteCategoryId: '', casteCode: '' });
  const queryClient = useQueryClient();

  const { data: castesData, isLoading } = useQuery({
    queryKey: ['castes', electionId],
    queryFn: () => masterDataAPI.getCastes(electionId),
    enabled: !!electionId,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['casteCategories', electionId],
    queryFn: () => masterDataAPI.getCasteCategories(electionId),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/castes', data, { params: { electionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['castes', electionId] });
      toast.success('Caste created successfully');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create caste'),
  });

  const castes = castesData?.data?.data || [];
  const categories = categoriesData?.data?.data || [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Castes</h3>
          <p className="text-sm text-gray-500">Individual castes under each category</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Add Caste</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Caste</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="casteCategoryId">Category *</Label>
                <Select value={formData.casteCategoryId} onValueChange={(v) => setFormData({ ...formData, casteCategoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name || cat.categoryName || '-'} - {cat.nameLocal || cat.categoryFullName || cat.name || cat.categoryName || '-'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="casteName">Caste Name *</Label>
                <Input id="casteName" value={formData.casteName} onChange={(e) => setFormData({ ...formData, casteName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="casteNameLocal">Local Name</Label>
                <Input id="casteNameLocal" value={formData.casteNameLocal} onChange={(e) => setFormData({ ...formData, casteNameLocal: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="casteCode">Code</Label>
                <Input id="casteCode" value={formData.casteCode} onChange={(e) => setFormData({ ...formData, casteCode: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Caste Name</TableHead>
            <TableHead>Local Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {castes.map((caste: any) => (
            <TableRow key={caste.id}>
              <TableCell><Badge variant="outline">{caste.category?.name || caste.casteCategory?.categoryName || '-'}</Badge></TableCell>
              <TableCell className="font-medium">{caste.name || caste.casteName || '-'}</TableCell>
              <TableCell>{caste.nameLocal || caste.casteNameLocal || '-'}</TableCell>
              <TableCell>{caste.code || caste.casteCode || '-'}</TableCell>
              <TableCell><Badge variant={caste.isActive !== false ? 'default' : 'secondary'}>{caste.isActive !== false ? 'Active' : 'Inactive'}</Badge></TableCell>
            </TableRow>
          ))}
          {castes.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No castes found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Sub-Castes Tab Component
function SubCastesTab({ electionId }: { electionId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ subCasteName: '', subCasteNameLocal: '', casteId: '' });
  const queryClient = useQueryClient();

  const { data: subCastesData, isLoading } = useQuery({
    queryKey: ['subCastes', electionId],
    queryFn: () => masterDataAPI.getSubCastes(electionId),
    enabled: !!electionId,
  });

  const { data: castesData } = useQuery({
    queryKey: ['castes', electionId],
    queryFn: () => masterDataAPI.getCastes(electionId),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/sub-castes', data, { params: { electionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subCastes', electionId] });
      toast.success('Sub-caste created successfully');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create sub-caste'),
  });

  const subCastes = subCastesData?.data?.data || [];
  const castes = castesData?.data?.data || [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Sub-Castes</h3>
          <p className="text-sm text-gray-500">Sub-divisions of castes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Add Sub-Caste</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sub-Caste</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="casteId">Parent Caste *</Label>
                <Select value={formData.casteId} onValueChange={(v) => setFormData({ ...formData, casteId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select caste" /></SelectTrigger>
                  <SelectContent>
                    {castes.map((caste: any) => (
                      <SelectItem key={caste.id} value={caste.id}>{caste.name || caste.casteName || '-'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subCasteName">Sub-Caste Name *</Label>
                <Input id="subCasteName" value={formData.subCasteName} onChange={(e) => setFormData({ ...formData, subCasteName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subCasteNameLocal">Local Name</Label>
                <Input id="subCasteNameLocal" value={formData.subCasteNameLocal} onChange={(e) => setFormData({ ...formData, subCasteNameLocal: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parent Caste</TableHead>
            <TableHead>Sub-Caste Name</TableHead>
            <TableHead>Local Name</TableHead>
            <TableHead>Voter Count</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subCastes.map((subCaste: any) => (
            <TableRow key={subCaste.id}>
              <TableCell><Badge variant="outline">{subCaste.caste?.name || subCaste.caste?.casteName || '-'}</Badge></TableCell>
              <TableCell className="font-medium">{subCaste.name || subCaste.subCasteName || '-'}</TableCell>
              <TableCell>{subCaste.nameLocal || subCaste.subCasteNameLocal || '-'}</TableCell>
              <TableCell>{subCaste._count?.voters || subCaste.voterCount || 0}</TableCell>
              <TableCell><Badge variant={subCaste.isActive !== false ? 'default' : 'secondary'}>{subCaste.isActive !== false ? 'Active' : 'Inactive'}</Badge></TableCell>
            </TableRow>
          ))}
          {subCastes.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No sub-castes found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Languages Tab Component
function LanguagesTab({ electionId }: { electionId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ languageName: '', languageNameLocal: '', languageCode: '', script: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['languages', electionId],
    queryFn: () => masterDataAPI.getLanguages(electionId),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/languages', data, { params: { electionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages', electionId] });
      toast.success('Language created successfully');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create language'),
  });

  const languages = data?.data?.data || [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Languages</h3>
          <p className="text-sm text-gray-500">Languages spoken by voters</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Add Language</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Language</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="languageName">Language Name *</Label>
                <Input id="languageName" placeholder="e.g., Tamil" value={formData.languageName} onChange={(e) => setFormData({ ...formData, languageName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="languageNameLocal">Local Name</Label>
                <Input id="languageNameLocal" placeholder="e.g., தமிழ்" value={formData.languageNameLocal} onChange={(e) => setFormData({ ...formData, languageNameLocal: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="languageCode">Language Code</Label>
                <Input id="languageCode" placeholder="e.g., ta" value={formData.languageCode} onChange={(e) => setFormData({ ...formData, languageCode: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="script">Script</Label>
                <Input id="script" placeholder="e.g., Tamil" value={formData.script} onChange={(e) => setFormData({ ...formData, script: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Language</TableHead>
            <TableHead>Local Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Script</TableHead>
            <TableHead>Voter Count</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {languages.map((lang: any) => (
            <TableRow key={lang.id}>
              <TableCell className="font-medium">{lang.name || lang.languageName || '-'}</TableCell>
              <TableCell>{lang.nameLocal || lang.languageNameLocal || '-'}</TableCell>
              <TableCell>{lang.code || lang.languageCode || '-'}</TableCell>
              <TableCell>{lang.script || '-'}</TableCell>
              <TableCell>{lang._count?.voters || lang.voterCount || 0}</TableCell>
              <TableCell><Badge variant={lang.isActive !== false ? 'default' : 'secondary'}>{lang.isActive !== false ? 'Active' : 'Inactive'}</Badge></TableCell>
            </TableRow>
          ))}
          {languages.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No languages found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Parties Tab Component
function PartiesTab({ electionId }: { electionId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ partyName: '', partyShortName: '', partyFullName: '', partyColor: '#808080', allianceName: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['parties', electionId],
    queryFn: () => masterDataAPI.getParties(electionId),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/parties', data, { params: { electionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties', electionId] });
      toast.success('Party created successfully');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create party'),
  });

  const parties = data?.data?.data || [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Political Parties</h3>
          <p className="text-sm text-gray-500">Political parties for voter affiliation</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Add Party</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Political Party</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partyName">Party Name *</Label>
                <Input id="partyName" placeholder="e.g., DMK" value={formData.partyName} onChange={(e) => setFormData({ ...formData, partyName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyShortName">Short Name</Label>
                <Input id="partyShortName" placeholder="e.g., DMK" value={formData.partyShortName} onChange={(e) => setFormData({ ...formData, partyShortName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyFullName">Full Name</Label>
                <Input id="partyFullName" placeholder="e.g., Dravida Munnetra Kazhagam" value={formData.partyFullName} onChange={(e) => setFormData({ ...formData, partyFullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allianceName">Alliance</Label>
                <Input id="allianceName" placeholder="e.g., INDIA Alliance" value={formData.allianceName} onChange={(e) => setFormData({ ...formData, allianceName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyColor">Party Color</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-16 h-10" value={formData.partyColor} onChange={(e) => setFormData({ ...formData, partyColor: e.target.value })} />
                  <Input value={formData.partyColor} onChange={(e) => setFormData({ ...formData, partyColor: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Color</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Short Name</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Alliance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parties.map((party: any) => (
            <TableRow key={party.id}>
              <TableCell><div className="w-6 h-6 rounded-full" style={{ backgroundColor: party.colorCode || party.partyColor || '#808080' }} /></TableCell>
              <TableCell className="font-medium">{party.name || party.partyName || '-'}</TableCell>
              <TableCell>{party.abbreviation || party.partyShortName || '-'}</TableCell>
              <TableCell>{party.nameLocal || party.partyFullName || '-'}</TableCell>
              <TableCell>{party.allianceName || '-'}</TableCell>
              <TableCell><Badge variant={party.isActive !== false ? 'default' : 'secondary'}>{party.isActive !== false ? 'Active' : 'Inactive'}</Badge></TableCell>
            </TableRow>
          ))}
          {parties.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No parties found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Schemes Tab Component
function SchemesTab({ electionId }: { electionId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ schemeName: '', schemeShortName: '', schemeDescription: '', schemeBy: 'STATE_GOVT', schemeValue: '', valueType: 'ONE_TIME', category: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['schemes', electionId],
    queryFn: () => masterDataAPI.getSchemes(electionId),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/schemes', data, { params: { electionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes', electionId] });
      toast.success('Scheme created successfully');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create scheme'),
  });

  const schemes = data?.data?.data || [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Government Schemes</h3>
          <p className="text-sm text-gray-500">Central, State, and Local body schemes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Add Scheme</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Government Scheme</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schemeName">Scheme Name *</Label>
                  <Input id="schemeName" placeholder="e.g., PM Kisan" value={formData.schemeName} onChange={(e) => setFormData({ ...formData, schemeName: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schemeShortName">Short Name</Label>
                  <Input id="schemeShortName" placeholder="e.g., PMKISAN" value={formData.schemeShortName} onChange={(e) => setFormData({ ...formData, schemeShortName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schemeDescription">Description</Label>
                <Input id="schemeDescription" value={formData.schemeDescription} onChange={(e) => setFormData({ ...formData, schemeDescription: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={formData.schemeBy} onValueChange={(v) => setFormData({ ...formData, schemeBy: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNION_GOVT">Union Government</SelectItem>
                      <SelectItem value="STATE_GOVT">State Government</SelectItem>
                      <SelectItem value="LOCAL_BODY">Local Body</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input placeholder="e.g., Agriculture" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value (₹)</Label>
                  <Input type="number" placeholder="e.g., 6000" value={formData.schemeValue} onChange={(e) => setFormData({ ...formData, schemeValue: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Value Type</Label>
                  <Select value={formData.valueType} onValueChange={(v) => setFormData({ ...formData, valueType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONE_TIME">One Time</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scheme Name</TableHead>
            <TableHead>Short Name</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Beneficiaries</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schemes.map((scheme: any) => (
            <TableRow key={scheme.id}>
              <TableCell className="font-medium">{scheme.name || scheme.schemeName || '-'}</TableCell>
              <TableCell>{scheme.nameLocal || scheme.schemeShortName || '-'}</TableCell>
              <TableCell><Badge variant="outline">{scheme.ministry || scheme.schemeBy?.replace('_', ' ') || '-'}</Badge></TableCell>
              <TableCell>{scheme.beneficiaries || scheme.category || '-'}</TableCell>
              <TableCell>{scheme.schemeValue ? `₹${scheme.schemeValue} ${scheme.valueType?.toLowerCase() || ''}` : '-'}</TableCell>
              <TableCell>{scheme._count?.voters || scheme.beneficiaryCount || 0}</TableCell>
            </TableRow>
          ))}
          {schemes.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No schemes found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Voter Categories Tab Component
function VoterCategoriesTab({ electionId }: { electionId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ categoryName: '', categoryNameLocal: '', categoryDescription: '', categoryColor: '#808080' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['voterCategories', electionId],
    queryFn: () => masterDataAPI.getVoterCategories(electionId),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/voter-categories', data, { params: { electionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voterCategories', electionId] });
      toast.success('Voter category created successfully');
      setIsDialogOpen(false);
    },
    onError: () => toast.error('Failed to create voter category'),
  });

  const categories = data?.data?.data || [];

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Voter Categories</h3>
          <p className="text-sm text-gray-500">Special voter categories (VIP, Key Influencer, etc.)</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Voter Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name *</Label>
                <Input id="categoryName" placeholder="e.g., VIP, Key Influencer" value={formData.categoryName} onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryNameLocal">Local Name</Label>
                <Input id="categoryNameLocal" value={formData.categoryNameLocal} onChange={(e) => setFormData({ ...formData, categoryNameLocal: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryDescription">Description</Label>
                <Input id="categoryDescription" value={formData.categoryDescription} onChange={(e) => setFormData({ ...formData, categoryDescription: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryColor">Color</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-16 h-10" value={formData.categoryColor} onChange={(e) => setFormData({ ...formData, categoryColor: e.target.value })} />
                  <Input value={formData.categoryColor} onChange={(e) => setFormData({ ...formData, categoryColor: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Color</TableHead>
            <TableHead>Category Name</TableHead>
            <TableHead>Local Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat: any) => (
            <TableRow key={cat.id}>
              <TableCell><div className="w-6 h-6 rounded-full" style={{ backgroundColor: cat.color || cat.categoryColor || '#808080' }} /></TableCell>
              <TableCell className="font-medium">{cat.name || cat.categoryName || '-'}</TableCell>
              <TableCell>{cat.nameLocal || cat.categoryNameLocal || '-'}</TableCell>
              <TableCell>{cat.description || cat.categoryDescription || '-'}</TableCell>
              <TableCell><Badge variant="outline">{cat.isSystem ? 'System' : 'Custom'}</Badge></TableCell>
              <TableCell><Badge variant={cat.isActive !== false ? 'default' : 'secondary'}>{cat.isActive !== false ? 'Active' : 'Inactive'}</Badge></TableCell>
            </TableRow>
          ))}
          {categories.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No voter categories found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Main Master Data Page
export function MasterDataPage() {
  const { selectedElectionId } = useElectionStore();

  if (!selectedElectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircleIcon className="h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Election Selected</h2>
          <p className="text-gray-500">Please select an election from the sidebar to manage master data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Master Data</h1>
        <p className="text-gray-500">Manage religions, castes, parties, languages, schemes, and more</p>
      </div>

      <Tabs defaultValue="religions" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="religions" className="flex items-center gap-2">
            <ChurchIcon className="h-4 w-4" />Religions
          </TabsTrigger>
          <TabsTrigger value="casteCategories" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />Caste Categories
          </TabsTrigger>
          <TabsTrigger value="castes" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />Castes
          </TabsTrigger>
          <TabsTrigger value="subCastes" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />Sub-Castes
          </TabsTrigger>
          <TabsTrigger value="languages" className="flex items-center gap-2">
            <LanguagesIcon className="h-4 w-4" />Languages
          </TabsTrigger>
          <TabsTrigger value="parties" className="flex items-center gap-2">
            <FlagIcon className="h-4 w-4" />Parties
          </TabsTrigger>
          <TabsTrigger value="schemes" className="flex items-center gap-2">
            <GiftIcon className="h-4 w-4" />Schemes
          </TabsTrigger>
          <TabsTrigger value="voterCategories" className="flex items-center gap-2">
            <TagIcon className="h-4 w-4" />Voter Categories
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="pt-6">
            <TabsContent value="religions"><ReligionsTab electionId={selectedElectionId} /></TabsContent>
            <TabsContent value="casteCategories"><CasteCategoriesTab electionId={selectedElectionId} /></TabsContent>
            <TabsContent value="castes"><CastesTab electionId={selectedElectionId} /></TabsContent>
            <TabsContent value="subCastes"><SubCastesTab electionId={selectedElectionId} /></TabsContent>
            <TabsContent value="languages"><LanguagesTab electionId={selectedElectionId} /></TabsContent>
            <TabsContent value="parties"><PartiesTab electionId={selectedElectionId} /></TabsContent>
            <TabsContent value="schemes"><SchemesTab electionId={selectedElectionId} /></TabsContent>
            <TabsContent value="voterCategories"><VoterCategoriesTab electionId={selectedElectionId} /></TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
