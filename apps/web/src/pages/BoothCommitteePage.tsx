import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partsAPI, cadresAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import {
  AlertTriangleIcon,
  SearchIcon,
  PlusIcon,
  UsersIcon,
  UserPlusIcon,
  PhoneIcon,
  MapPinIcon,
  ChevronRightIcon,
  CheckCircle2Icon,
  XCircleIcon,
  UserIcon,
  Users2Icon,
  ShieldIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { getInitials, cn } from '../lib/utils';

interface Part {
  id: string;
  partNo?: number;
  partNumber?: number;
  partNameEn?: string;
  partName?: string;
  partNameLocal?: string;
  boothAddress?: string;
  totalVoters?: number;
  boothCommittee?: BoothCommitteeMember[];
}

interface BoothCommitteeMember {
  id: string;
  role: string;
  cadreId: string;
  cadre?: {
    id: string;
    firstName?: string;
    lastName?: string;
    voterName?: string;
    mobile?: string;
    designation?: string;
    voter?: {
      voterName?: string;
      mobile?: string;
    };
  };
}

interface Cadre {
  id: string;
  firstName?: string;
  lastName?: string;
  voterName?: string;
  mobile?: string;
  designation?: string;
  partId?: string;
  voter?: {
    voterName?: string;
    mobile?: string;
  };
}

const COMMITTEE_ROLES = [
  { value: 'BOOTH_PRESIDENT', label: 'Booth President', icon: ShieldIcon },
  { value: 'BOOTH_AGENT', label: 'Booth Agent (BLA)', icon: UserIcon },
  { value: 'RELIEF_AGENT', label: 'Relief Agent', icon: Users2Icon },
  { value: 'POLLING_AGENT', label: 'Polling Agent', icon: UserIcon },
  { value: 'TRANSPORT_INCHARGE', label: 'Transport In-charge', icon: UserIcon },
  { value: 'SOCIAL_MEDIA_INCHARGE', label: 'Social Media In-charge', icon: UserIcon },
  { value: 'VOLUNTEER', label: 'Volunteer', icon: UserIcon },
];

export function BoothCommitteePage() {
  const { selectedElectionId } = useElectionStore();
  const [search, setSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    role: '',
    cadreId: '',
  });
  const queryClient = useQueryClient();

  const { data: partsData, isLoading: partsLoading } = useQuery({
    queryKey: ['parts-committee', selectedElectionId],
    queryFn: () => partsAPI.getAll(selectedElectionId!, { limit: 500 }),
    enabled: !!selectedElectionId,
  });

  const { data: cadresData } = useQuery({
    queryKey: ['cadres-available', selectedElectionId],
    queryFn: () => cadresAPI.getAll(selectedElectionId!, { limit: 500 }),
    enabled: !!selectedElectionId,
  });

  const parts: Part[] = partsData?.data?.data || [];
  const cadres: Cadre[] = cadresData?.data?.data || [];

  // Filter parts
  const filteredParts = useMemo(() => {
    if (!search) return parts;
    return parts.filter(
      (part) =>
        (part.partName || part.partNameEn)?.toLowerCase().includes(search.toLowerCase()) ||
        (part.partNumber || part.partNo)?.toString().includes(search)
    );
  }, [parts, search]);

  // Calculate stats
  const stats = useMemo(() => {
    let totalCommittees = 0;
    let completeCommittees = 0;
    let totalMembers = 0;

    parts.forEach((part) => {
      const memberCount = part.boothCommittee?.length || 0;
      if (memberCount > 0) {
        totalCommittees++;
        totalMembers += memberCount;
        // A "complete" committee has at least 3 members
        if (memberCount >= 3) completeCommittees++;
      }
    });

    return { totalCommittees, completeCommittees, totalMembers };
  }, [parts]);

  // Get role info
  const getRoleInfo = (roleValue: string) => {
    return COMMITTEE_ROLES.find((r) => r.value === roleValue) || { label: roleValue, icon: UserIcon };
  };

  // Available cadres for a part (not already assigned)
  const availableCadres = useMemo(() => {
    if (!selectedPart) return cadres;
    const assignedIds = new Set(selectedPart.boothCommittee?.map((m) => m.cadreId) || []);
    return cadres.filter((c) => !assignedIds.has(c.id));
  }, [cadres, selectedPart]);

  const addMemberMutation = useMutation({
    mutationFn: (data: { partId: string; role: string; cadreId: string }) =>
      partsAPI.addCommitteeMember(data.partId, data.cadreId, data.role),
    onSuccess: () => {
      toast.success('Committee member added');
      setAddMemberOpen(false);
      setAddFormData({ role: '', cadreId: '' });
      queryClient.invalidateQueries({ queryKey: ['parts-committee'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (data: { partId: string; memberId: string }) =>
      partsAPI.removeCommitteeMember(data.partId, data.memberId),
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['parts-committee'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to remove member');
    },
  });

  const handleAddMember = () => {
    if (!selectedPart || !addFormData.role || !addFormData.cadreId) {
      toast.error('Please select role and cadre');
      return;
    }
    addMemberMutation.mutate({
      partId: selectedPart.id,
      role: addFormData.role,
      cadreId: addFormData.cadreId,
    });
  };

  const handleRemoveMember = (partId: string, memberId: string) => {
    if (confirm('Remove this member from the booth committee?')) {
      removeMemberMutation.mutate({ partId, memberId });
    }
  };

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Election Selected</h2>
        <p className="text-gray-500 mt-2">Please select an election to manage booth committees.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users2Icon className="h-6 w-6" />
            Booth Committees
          </h1>
          <p className="text-gray-500">Manage booth-level committees and their members</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <MapPinIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Booths</p>
                <p className="text-2xl font-bold">{parts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle2Icon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">With Committee</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalCommittees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100">
                <Users2Icon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Complete (3+)</p>
                <p className="text-2xl font-bold text-amber-600">{stats.completeCommittees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <UsersIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Members</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search booths..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Parts List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Booths ({filteredParts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {partsLoading ? (
              <div className="p-4 space-y-2">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto divide-y">
                {filteredParts.map((part) => {
                  const memberCount = part.boothCommittee?.length || 0;
                  const isSelected = selectedPart?.id === part.id;

                  return (
                    <div
                      key={part.id}
                      className={cn(
                        'p-3 cursor-pointer hover:bg-gray-50 transition-colors',
                        isSelected && 'bg-orange-50 border-l-4 border-orange-500'
                      )}
                      onClick={() => setSelectedPart(part)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Part {part.partNumber || part.partNo}</div>
                          <div className="text-sm text-gray-600 truncate max-w-[180px]">
                            {part.partName || part.partNameEn || '-'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={memberCount >= 3 ? 'success' : memberCount > 0 ? 'warning' : 'secondary'}
                          >
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          </Badge>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Committee Details */}
        <Card className="lg:col-span-2">
          {!selectedPart ? (
            <CardContent className="flex flex-col items-center justify-center h-[400px] text-center">
              <Users2Icon className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">Select a Booth</h3>
              <p className="text-gray-500">Click on a booth to view and manage its committee</p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Part {selectedPart.partNumber || selectedPart.partNo} Committee</CardTitle>
                    <CardDescription>{selectedPart.partName || selectedPart.partNameEn || '-'}</CardDescription>
                  </div>
                  <Button onClick={() => setAddMemberOpen(true)}>
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedPart.boothCommittee || selectedPart.boothCommittee.length === 0 ? (
                  <div className="text-center py-8">
                    <Users2Icon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No committee members yet</p>
                    <Button variant="outline" className="mt-4" onClick={() => setAddMemberOpen(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add First Member
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedPart.boothCommittee.map((member) => {
                      const roleInfo = getRoleInfo(member.role);
                      const RoleIcon = roleInfo.icon;

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-orange-100 text-orange-600">
                                {member.cadre
                                  ? getInitials(
                                      member.cadre.voterName || member.cadre.voter?.voterName || `${member.cadre.firstName || ''} ${member.cadre.lastName || ''}`
                                    )
                                  : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.cadre?.voterName || member.cadre?.voter?.voterName || `${member.cadre?.firstName || ''} ${member.cadre?.lastName || ''}`}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <RoleIcon className="h-3 w-3" />
                                {roleInfo.label}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {(member.cadre?.mobile || member.cadre?.voter?.mobile) && (
                              <a
                                href={`tel:${member.cadre?.mobile || member.cadre?.voter?.mobile}`}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                              >
                                <PhoneIcon className="h-3 w-3" />
                                {member.cadre?.mobile || member.cadre?.voter?.mobile}
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveMember(selectedPart.id, member.id)}
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Role Summary */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">Role Assignment Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {COMMITTEE_ROLES.slice(0, 6).map((role) => {
                      const assigned = selectedPart.boothCommittee?.some((m) => m.role === role.value);
                      return (
                        <div
                          key={role.value}
                          className={cn(
                            'p-2 rounded-md text-sm flex items-center gap-2',
                            assigned ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                          )}
                        >
                          {assigned ? (
                            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-gray-400" />
                          )}
                          {role.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Committee Member</DialogTitle>
            <DialogDescription>
              Add a cadre member to Part {selectedPart?.partNumber || selectedPart?.partNo}'s booth committee
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={addFormData.role}
                onValueChange={(v) => setAddFormData({ ...addFormData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {COMMITTEE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cadre Member</Label>
              <Select
                value={addFormData.cadreId}
                onValueChange={(v) => setAddFormData({ ...addFormData, cadreId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cadre" />
                </SelectTrigger>
                <SelectContent>
                  {availableCadres.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No available cadres</div>
                  ) : (
                    availableCadres.map((cadre) => (
                      <SelectItem key={cadre.id} value={cadre.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {cadre.voterName || cadre.voter?.voterName || `${cadre.firstName || ''} ${cadre.lastName || ''}`}
                          </span>
                          <span className="text-gray-400">({cadre.mobile || cadre.voter?.mobile || '-'})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={addMemberMutation.isPending}>
              {addMemberMutation.isPending && <Spinner size="sm" className="mr-2" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
