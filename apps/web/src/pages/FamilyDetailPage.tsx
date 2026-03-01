import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familiesAPI, votersAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Spinner } from '../components/ui/spinner';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  EditIcon,
  UsersIcon,
  HomeIcon,
  MapPinIcon,
  PhoneIcon,
  UserPlusIcon,
  XIcon,
  CrownIcon,
  SearchIcon,
} from 'lucide-react';

export function FamilyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedElectionId } = useElectionStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberVoterId, setMemberVoterId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [formData, setFormData] = useState<any>({});

  const { data: familyData, isLoading } = useQuery({
    queryKey: ['family', id],
    queryFn: () => familiesAPI.getById(id!),
    enabled: !!id,
  });

  const { data: votersData, isFetching: isVotersFetching } = useQuery({
    queryKey: ['voters-for-family', selectedElectionId, memberSearch],
    queryFn: () => votersAPI.getAll(selectedElectionId!, { limit: 50, search: memberSearch || undefined }),
    enabled: !!selectedElectionId && isAddMemberOpen && memberSearch.length >= 2,
  });

  const family = familyData?.data?.data;
  const members = family?.voters || [];
  const allVoters = votersData?.data?.data || [];
  const memberIds = new Set(members.map((m: any) => m.id));

  const updateMutation = useMutation({
    mutationFn: (data: any) => familiesAPI.update(id!, data),
    onSuccess: () => {
      toast.success('Family updated successfully');
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['family', id] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update family');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: () => familiesAPI.addMember(id!, memberVoterId),
    onSuccess: () => {
      toast.success('Member added');
      setIsAddMemberOpen(false);
      setMemberVoterId('');
      queryClient.invalidateQueries({ queryKey: ['family', id] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (voterId: string) => familiesAPI.removeMember(id!, voterId),
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['family', id] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to remove member');
    },
  });

  const handleEditOpen = () => {
    if (family) {
      setFormData({
        familyName: family.familyName || '',
        headName: family.headName || '',
        houseNo: family.houseNo || '',
        address: family.address || '',
        mobile: family.mobile || '',
        partyAffiliation: family.partyAffiliation || '',
      });
    }
    setIsEditOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      familyName: formData.familyName || undefined,
      headName: formData.headName || undefined,
      houseNo: formData.houseNo || undefined,
      address: formData.address || undefined,
    });
  };

  const handleAddMember = () => {
    if (!memberVoterId) {
      toast.error('Please select a voter');
      return;
    }
    addMemberMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-muted-foreground">Family not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/families')}>
          Back to Families
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/families')}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Family Details</h1>
          <p className="text-muted-foreground">View and manage family information</p>
        </div>
        <Button variant="outline" onClick={() => setIsAddMemberOpen(true)}>
          <UserPlusIcon className="h-4 w-4 mr-2" />
          Add Member
        </Button>
        <Button onClick={handleEditOpen}>
          <EditIcon className="h-4 w-4 mr-2" />
          Edit Family
        </Button>
      </div>

      {/* Family Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-center justify-center h-20 w-20 rounded-xl bg-purple-50 text-purple-600 shrink-0">
              <UsersIcon className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">{family.familyName || 'Unnamed Family'}</h2>
              {family.headName && (
                <p className="text-muted-foreground mb-3 flex items-center gap-1">
                  <CrownIcon className="h-4 w-4 text-yellow-500" />
                  Head: {family.headName}
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <HomeIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">House No:</span>
                  <span className="font-medium">{family.houseNo || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium truncate">{family.address || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Mobile:</span>
                  <span className="font-medium">{family.mobile || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Members:</span>
                  <span className="font-medium">{members.length}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{members.length}</p>
            <p className="text-xs text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{members.filter((m: any) => m.gender === 'MALE').length}</p>
            <p className="text-xs text-muted-foreground">Male</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{members.filter((m: any) => m.gender === 'FEMALE').length}</p>
            <p className="text-xs text-muted-foreground">Female</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">
              {members.filter((m: any) => m.isFamilyCaptain).length > 0 ? 'Yes' : 'No'}
            </p>
            <p className="text-xs text-muted-foreground">Has Captain</p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Family Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No members yet. Add members to this family.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member: any) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/voters/${member.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.photoUrl} />
                          <AvatarFallback className="text-xs bg-purple-100 text-purple-600">
                            {(member.name || 'V').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.gender === 'MALE' ? 'info' : member.gender === 'FEMALE' ? 'default' : 'secondary'}>
                        {member.gender === 'MALE' ? 'Male' : member.gender === 'FEMALE' ? 'Female' : 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.age || '-'}</TableCell>
                    <TableCell>{member.mobile || '-'}</TableCell>
                    <TableCell>{member.part?.partNumber || '-'}</TableCell>
                    <TableCell>
                      {member.isFamilyCaptain && (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <CrownIcon className="h-3 w-3 mr-1" />
                          Captain
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove ${member.name} from this family?`)) {
                            removeMemberMutation.mutate(member.id);
                          }
                        }}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Family</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Family Name</Label>
                <Input
                  value={formData.familyName || ''}
                  onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Head Name</Label>
                <Input
                  value={formData.headName || ''}
                  onChange={(e) => setFormData({ ...formData, headName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>House No</Label>
                  <Input
                    value={formData.houseNo || ''}
                    onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
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

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={(open) => {
        setIsAddMemberOpen(open);
        if (!open) { setMemberSearch(''); setMemberVoterId(''); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Voter</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Type name or EPIC to search..."
                  value={memberSearch}
                  onChange={(e) => { setMemberSearch(e.target.value); setMemberVoterId(''); }}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            {memberSearch.length < 2 ? (
              <p className="text-sm text-muted-foreground">Type at least 2 characters to search voters</p>
            ) : isVotersFetching ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Spinner size="sm" /> Searching...
              </div>
            ) : allVoters.filter((v: any) => !memberIds.has(v.id)).length === 0 ? (
              <p className="text-sm text-muted-foreground">No voters found for "{memberSearch}"</p>
            ) : (
              <div className="max-h-[250px] overflow-y-auto border rounded-md divide-y">
                {allVoters
                  .filter((v: any) => !memberIds.has(v.id))
                  .map((voter: any) => (
                    <div
                      key={voter.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${memberVoterId === voter.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                      onClick={() => setMemberVoterId(voter.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={voter.photoUrl} />
                        <AvatarFallback className="text-xs bg-purple-100 text-purple-600">
                          {(voter.name || 'V').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{voter.name || voter.voterName || '-'}</p>
                        <p className="text-xs text-muted-foreground">{voter.epicNumber || voter.epicNo || 'No ID'} | Part {voter.part?.partNumber || '-'}</p>
                      </div>
                      {memberVoterId === voter.id && (
                        <Badge variant="default" className="shrink-0">Selected</Badge>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!memberVoterId || addMemberMutation.isPending}
              onClick={handleAddMember}
            >
              {addMemberMutation.isPending ? <Spinner size="sm" className="mr-2" /> : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
