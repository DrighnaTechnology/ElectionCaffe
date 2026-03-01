import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { votersAPI, masterDataAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Spinner } from '../components/ui/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  EditIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  HomeIcon,
  CreditCardIcon,
  CameraIcon,
} from 'lucide-react';

export function VoterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTab, setEditTab] = useState('personal');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { selectedElectionId } = useElectionStore();

  const { data: voterData, isLoading } = useQuery({
    queryKey: ['voter', id],
    queryFn: () => votersAPI.getById(id!),
    enabled: !!id,
  });

  const { data: schemesData } = useQuery({
    queryKey: ['voterSchemes', id],
    queryFn: () => votersAPI.getSchemes(id!),
    enabled: !!id,
  });

  // Master data for dropdowns
  const { data: religionsData } = useQuery({
    queryKey: ['religions', selectedElectionId],
    queryFn: () => masterDataAPI.getReligions(selectedElectionId!),
    enabled: !!selectedElectionId && isEditDialogOpen,
  });
  const { data: casteCategoriesData } = useQuery({
    queryKey: ['casteCategories', selectedElectionId],
    queryFn: () => masterDataAPI.getCasteCategories(selectedElectionId!),
    enabled: !!selectedElectionId && isEditDialogOpen,
  });
  const { data: castesData } = useQuery({
    queryKey: ['castes', selectedElectionId],
    queryFn: () => masterDataAPI.getCastes(selectedElectionId!),
    enabled: !!selectedElectionId && isEditDialogOpen,
  });
  const { data: partiesData } = useQuery({
    queryKey: ['parties', selectedElectionId],
    queryFn: () => masterDataAPI.getParties(selectedElectionId!),
    enabled: !!selectedElectionId && isEditDialogOpen,
  });
  const { data: languagesData } = useQuery({
    queryKey: ['languages', selectedElectionId],
    queryFn: () => masterDataAPI.getLanguages(selectedElectionId!),
    enabled: !!selectedElectionId && isEditDialogOpen,
  });
  const { data: voterCategoriesData } = useQuery({
    queryKey: ['voterCategories', selectedElectionId],
    queryFn: () => masterDataAPI.getVoterCategories(selectedElectionId!),
    enabled: !!selectedElectionId && isEditDialogOpen,
  });

  const religions = religionsData?.data?.data || [];
  const casteCategories = casteCategoriesData?.data?.data || [];
  const castes = castesData?.data?.data || [];
  const parties = partiesData?.data?.data || [];
  const languages = languagesData?.data?.data || [];
  const voterCategories = voterCategoriesData?.data?.data || [];

  const updateMutation = useMutation({
    mutationFn: (data: any) => votersAPI.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter', id] });
      toast.success('Voter updated successfully');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to update voter'),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => votersAPI.uploadPhoto(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter', id] });
      toast.success('Photo uploaded successfully');
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to upload photo'),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo must be less than 5MB');
        return;
      }
      photoMutation.mutate(file);
    }
  };

  const voter = voterData?.data?.data;
  const schemes = schemesData?.data?.data || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!voter) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Voter Not Found</h2>
          <p className="text-muted-foreground mb-4">The voter you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/voters')}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Voters
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'MALE': return 'bg-blue-100 text-blue-700';
      case 'FEMALE': return 'bg-pink-100 text-pink-700';
      case 'TRANSGENDER': return 'bg-purple-100 text-purple-700';
      default: return 'bg-muted text-foreground';
    }
  };

  const getLeaningColor = (leaning: string) => {
    switch (leaning) {
      case 'LOYAL': return 'bg-green-100 text-green-700';
      case 'SWING': return 'bg-yellow-100 text-yellow-700';
      case 'OPPOSITION': return 'bg-red-100 text-red-700';
      default: return 'bg-muted text-foreground';
    }
  };

  const getInfluenceColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-brand-muted text-orange-700';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700';
      case 'LOW': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/voters')}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Voter Details</h1>
            <p className="text-muted-foreground">View and manage voter information</p>
          </div>
        </div>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <EditIcon className="h-4 w-4 mr-2" />
          Edit Voter
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
              <Avatar className="h-24 w-24">
                <AvatarImage src={voter.photoUrl} />
                <AvatarFallback className="text-2xl bg-brand-muted text-brand">
                  {(voter.voterName || voter.name)?.charAt(0) || 'V'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {photoMutation.isPending ? (
                  <Spinner size="sm" className="text-white" />
                ) : (
                  <CameraIcon className="h-6 w-6 text-white" />
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{voter.voterName || voter.name}</h2>
                {(voter.voterNameLocal || voter.nameLocal) && (
                  <span className="text-lg text-muted-foreground">({voter.voterNameLocal || voter.nameLocal})</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={getGenderColor(voter.gender)}>{voter.gender}</Badge>
                <Badge className={getLeaningColor(voter.politicalLeaning)}>{voter.politicalLeaning}</Badge>
                <Badge className={getInfluenceColor(voter.influenceLevel)}>{voter.influenceLevel} Influence</Badge>
                {voter.isFamilyCaptain && <Badge className="bg-purple-100 text-purple-700">Family Captain</Badge>}
                {voter.isAadhaarVerified && <Badge className="bg-green-100 text-green-700"><CheckCircleIcon className="h-3 w-3 mr-1" />Aadhaar Verified</Badge>}
                {voter.isDead && <Badge variant="destructive">Deceased</Badge>}
                {voter.isShifted && <Badge variant="secondary">Shifted</Badge>}
                {voter.isDoubleEntry && <Badge variant="destructive">Double Entry</Badge>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">EPIC:</span>
                  <span className="font-medium">{voter.epicNo || voter.epicNumber || voter.voterId || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Part:</span>
                  <span className="font-medium">{voter.part?.partNumber || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">SL No:</span>
                  <span className="font-medium">
                    {voter.slNumber || voter.serialNo || '-'}
                    {voter.part?.partNumber ? <span className="text-muted-foreground text-xs ml-1">(Part {voter.part.partNumber})</span> : null}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Age:</span>
                  <span className="font-medium">{voter.age || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
          <TabsTrigger value="political">Political</TabsTrigger>
          <TabsTrigger value="schemes">Schemes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{voter.voterName || voter.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Local Name</Label>
                    <p className="font-medium">{voter.voterNameLocal || voter.nameLocal || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Father's Name</Label>
                    <p className="font-medium">{voter.fatherName || voter.relationName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mother's Name</Label>
                    <p className="font-medium">{voter.motherName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Husband's Name</Label>
                    <p className="font-medium">{voter.husbandName || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Gender</Label>
                    <p className="font-medium">{voter.gender}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Age</Label>
                    <p className="font-medium">{voter.age || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date of Birth</Label>
                    <p className="font-medium">{voter.dateOfBirth ? new Date(voter.dateOfBirth).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Education</Label>
                    <p className="font-medium">{voter.education || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Profession</Label>
                    <p className="font-medium">{voter.profession || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Caste & Religion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Religion</Label>
                    <p className="font-medium">{voter.religion?.name || voter.religion?.religionName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Caste Category</Label>
                    <p className="font-medium">{voter.casteCategory?.name || voter.casteCategory?.categoryName || voter.caste?.category?.name || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Caste</Label>
                    <p className="font-medium">{voter.caste?.name || voter.caste?.casteName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sub-Caste</Label>
                    <p className="font-medium">{voter.subCaste?.name || voter.subCaste?.subCasteName || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Mobile</Label>
                      <p className="font-medium">{voter.mobile || '-'}</p>
                    </div>
                    {voter.isMobileVerified && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Alternate Mobile</Label>
                      <p className="font-medium">{voter.alternateMobile || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MailIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{voter.email || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <HomeIcon className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <Label className="text-muted-foreground">House Number</Label>
                      <p className="font-medium">{voter.houseNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{voter.address || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family">
          <Card>
            <CardHeader>
              <CardTitle>Family Information</CardTitle>
            </CardHeader>
            <CardContent>
              {voter.family ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-muted-foreground">Family Name</Label>
                      <p className="font-medium">{voter.family.familyName || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Members</Label>
                      <p className="font-medium">{voter.family.totalMembers || 0}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">House Number</Label>
                      <p className="font-medium">{voter.family.houseNumber || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Is Family Captain</Label>
                      <p className="font-medium">{voter.isFamilyCaptain ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No family assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Political Tab */}
        <TabsContent value="political">
          <Card>
            <CardHeader>
              <CardTitle>Political Affiliation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Political Leaning</Label>
                    <Badge className={getLeaningColor(voter.politicalLeaning)}>{voter.politicalLeaning}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Influence Level</Label>
                    <Badge className={getInfluenceColor(voter.influenceLevel)}>{voter.influenceLevel}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Party Affiliation</Label>
                    {voter.party ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: voter.party.colorCode || voter.party.partyColor || '#808080' }} />
                        <span className="font-medium">{voter.party.name || voter.party.partyName}</span>
                      </div>
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Voter Category</Label>
                    {voter.voterCategory ? (
                      <Badge style={{ backgroundColor: voter.voterCategory.color || voter.voterCategory.categoryColor || '#808080' }}>
                        {voter.voterCategory.name || voter.voterCategory.categoryName}
                      </Badge>
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Contacted</Label>
                    <p className="font-medium">
                      {voter.lastContactedAt ? new Date(voter.lastContactedAt).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="font-medium">{voter.notes || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schemes Tab */}
        <TabsContent value="schemes">
          <Card>
            <CardHeader>
              <CardTitle>Government Scheme Beneficiary</CardTitle>
              <CardDescription>Schemes this voter is enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {schemes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schemes.map((vs: any) => (
                    <div key={vs.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{vs.scheme?.name || vs.scheme?.schemeName}</h4>
                          <p className="text-sm text-muted-foreground">{vs.scheme?.description || vs.scheme?.schemeDescription}</p>
                        </div>
                        <Badge variant="outline">{vs.scheme?.ministry || vs.scheme?.schemeBy?.replace('_', ' ')}</Badge>
                      </div>
                      {vs.scheme?.schemeValue && (
                        <p className="text-sm mt-2">
                          Value: <span className="font-medium">₹{vs.scheme.schemeValue}</span>
                          {vs.scheme.valueType && ` (${vs.scheme.valueType.toLowerCase()})`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No scheme enrollments found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Voting History</CardTitle>
              <CardDescription>Past election participation</CardDescription>
            </CardHeader>
            <CardContent>
              {voter.votingHistory && voter.votingHistory.length > 0 ? (
                <div className="space-y-2">
                  {voter.votingHistory.map((vh: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{vh.history?.historyName}</p>
                        <p className="text-sm text-muted-foreground">{vh.history?.electionType} - {vh.history?.electionYear}</p>
                      </div>
                      <Badge variant={vh.voted ? 'default' : 'secondary'}>
                        {vh.voted ? 'Voted' : 'Did Not Vote'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No voting history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog — Full Form */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditTab('personal'); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Voter</DialogTitle>
            <DialogDescription>Update voter information across all categories</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target as HTMLFormElement);
            const data: any = {};
            fd.forEach((value, key) => {
              if (key === 'age') {
                if (value) data[key] = parseInt(value as string);
              } else if (key === 'dateOfBirth') {
                if (value) data[key] = value;
              } else if (['isDead', 'isShifted', 'isDoubleEntry', 'isFamilyCaptain'].includes(key)) {
                data[key] = value === 'true';
              } else if (key.endsWith('Id') && value === '__none__') {
                data[key] = null;
              } else if (value !== '') {
                data[key] = value;
              }
            });
            updateMutation.mutate(data);
          }}>
            <Tabs value={editTab} onValueChange={setEditTab} className="mt-2">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="political">Political</TabsTrigger>
                <TabsTrigger value="demographics">Demographics</TabsTrigger>
              </TabsList>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" defaultValue={voter.voterName || voter.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameLocal">Local Name</Label>
                    <Input id="nameLocal" name="nameLocal" defaultValue={voter.voterNameLocal || voter.nameLocal} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Father's Name</Label>
                    <Input id="fatherName" name="fatherName" defaultValue={voter.fatherName || voter.relationName} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherName">Mother's Name</Label>
                    <Input id="motherName" name="motherName" defaultValue={voter.motherName} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="husbandName">Husband's Name</Label>
                    <Input id="husbandName" name="husbandName" defaultValue={voter.husbandName} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select name="gender" defaultValue={voter.gender || 'MALE'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="TRANSGENDER">Transgender</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" name="age" type="number" min={18} max={120} defaultValue={voter.age} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={voter.dateOfBirth ? new Date(voter.dateOfBirth).toISOString().split('T')[0] : ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="education">Education</Label>
                    <Input id="education" name="education" defaultValue={voter.education} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input id="profession" name="profession" defaultValue={voter.profession} />
                </div>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input id="mobile" name="mobile" defaultValue={voter.mobile} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alternateMobile">Alternate Mobile</Label>
                    <Input id="alternateMobile" name="alternateMobile" defaultValue={voter.alternateMobile} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={voter.email} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="houseNumber">House Number</Label>
                    <Input id="houseNumber" name="houseNumber" defaultValue={voter.houseNumber} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" defaultValue={voter.address} />
                  </div>
                </div>
              </TabsContent>

              {/* Political Tab */}
              <TabsContent value="political" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Political Leaning</Label>
                    <Select name="politicalLeaning" defaultValue={voter.politicalLeaning || 'UNKNOWN'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOYAL">Loyal</SelectItem>
                        <SelectItem value="SWING">Swing</SelectItem>
                        <SelectItem value="OPPOSITION">Opposition</SelectItem>
                        <SelectItem value="UNKNOWN">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Influence Level</Label>
                    <Select name="influenceLevel" defaultValue={voter.influenceLevel || 'NONE'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Party</Label>
                    <Select name="partyId" defaultValue={voter.partyId || '__none__'}>
                      <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {parties.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.partyName || p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Voter Category</Label>
                    <Select name="voterCategoryId" defaultValue={voter.voterCategoryId || '__none__'}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {voterCategories.map((vc: any) => (
                          <SelectItem key={vc.id} value={vc.id}>{vc.categoryName || vc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" defaultValue={voter.notes} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Label className="flex-1">Deceased</Label>
                    <Select name="isDead" defaultValue={String(voter.isDead || false)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Label className="flex-1">Shifted</Label>
                    <Select name="isShifted" defaultValue={String(voter.isShifted || false)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Label className="flex-1">Double Entry</Label>
                    <Select name="isDoubleEntry" defaultValue={String(voter.isDoubleEntry || false)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Label className="flex-1">Family Captain</Label>
                    <Select name="isFamilyCaptain" defaultValue={String(voter.isFamilyCaptain || false)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Demographics Tab */}
              <TabsContent value="demographics" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Religion</Label>
                    <Select name="religionId" defaultValue={voter.religionId || '__none__'}>
                      <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {religions.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.religionName || r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Caste Category</Label>
                    <Select name="casteCategoryId" defaultValue={voter.casteCategoryId || '__none__'}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {casteCategories.map((cc: any) => (
                          <SelectItem key={cc.id} value={cc.id}>{cc.categoryName || cc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Caste</Label>
                    <Select name="casteId" defaultValue={voter.casteId || '__none__'}>
                      <SelectTrigger><SelectValue placeholder="Select caste" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {castes.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.casteName || c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select name="languageId" defaultValue={voter.languageId || '__none__'}>
                      <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {languages.map((l: any) => (
                          <SelectItem key={l.id} value={l.id}>{l.languageName || l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Spinner size="sm" className="mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
