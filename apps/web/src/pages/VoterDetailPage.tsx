import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { votersAPI } from '../services/api';
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
} from 'lucide-react';

export function VoterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

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

  const updateMutation = useMutation({
    mutationFn: (data: any) => votersAPI.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voter', id] });
      toast.success('Voter updated successfully');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to update voter'),
  });

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
          <UserIcon className="h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Voter Not Found</h2>
          <p className="text-gray-500 mb-4">The voter you're looking for doesn't exist.</p>
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
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getLeaningColor = (leaning: string) => {
    switch (leaning) {
      case 'LOYAL': return 'bg-green-100 text-green-700';
      case 'SWING': return 'bg-yellow-100 text-yellow-700';
      case 'OPPOSITION': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getInfluenceColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700';
      case 'LOW': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
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
            <p className="text-gray-500">View and manage voter information</p>
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
            <Avatar className="h-24 w-24">
              <AvatarImage src={voter.photoUrl} />
              <AvatarFallback className="text-2xl bg-orange-100 text-orange-600">
                {(voter.voterName || voter.name)?.charAt(0) || 'V'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{voter.voterName || voter.name}</h2>
                {(voter.voterNameLocal || voter.nameLocal) && (
                  <span className="text-lg text-gray-500">({voter.voterNameLocal || voter.nameLocal})</span>
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
                  <CreditCardIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">EPIC:</span>
                  <span className="font-medium">{voter.epicNo || voter.epicNumber || voter.voterId || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Part:</span>
                  <span className="font-medium">{voter.part?.partNumber || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">SL#:</span>
                  <span className="font-medium">{voter.serialNo || voter.slNumber || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Age:</span>
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
                    <Label className="text-gray-500">Full Name</Label>
                    <p className="font-medium">{voter.voterName || voter.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Local Name</Label>
                    <p className="font-medium">{voter.voterNameLocal || voter.nameLocal || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Father's Name</Label>
                    <p className="font-medium">{voter.fatherName || voter.relationName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Mother's Name</Label>
                    <p className="font-medium">{voter.motherName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Husband's Name</Label>
                    <p className="font-medium">{voter.husbandName || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500">Gender</Label>
                    <p className="font-medium">{voter.gender}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Age</Label>
                    <p className="font-medium">{voter.age || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Date of Birth</Label>
                    <p className="font-medium">{voter.dateOfBirth ? new Date(voter.dateOfBirth).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Education</Label>
                    <p className="font-medium">{voter.education || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Profession</Label>
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
                    <Label className="text-gray-500">Religion</Label>
                    <p className="font-medium">{voter.religion?.name || voter.religion?.religionName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Caste Category</Label>
                    <p className="font-medium">{voter.casteCategory?.name || voter.casteCategory?.categoryName || voter.caste?.category?.name || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500">Caste</Label>
                    <p className="font-medium">{voter.caste?.name || voter.caste?.casteName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Sub-Caste</Label>
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
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <Label className="text-gray-500">Mobile</Label>
                      <p className="font-medium">{voter.mobile || '-'}</p>
                    </div>
                    {voter.isMobileVerified && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <Label className="text-gray-500">Alternate Mobile</Label>
                      <p className="font-medium">{voter.alternateMobile || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MailIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <Label className="text-gray-500">Email</Label>
                      <p className="font-medium">{voter.email || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <HomeIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <Label className="text-gray-500">House Number</Label>
                      <p className="font-medium">{voter.houseNumber || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <Label className="text-gray-500">Address</Label>
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
                      <Label className="text-gray-500">Family Name</Label>
                      <p className="font-medium">{voter.family.familyName || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Total Members</Label>
                      <p className="font-medium">{voter.family.totalMembers || 0}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">House Number</Label>
                      <p className="font-medium">{voter.family.houseNumber || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Is Family Captain</Label>
                      <p className="font-medium">{voter.isFamilyCaptain ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No family assigned</p>
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
                    <Label className="text-gray-500">Political Leaning</Label>
                    <Badge className={getLeaningColor(voter.politicalLeaning)}>{voter.politicalLeaning}</Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500">Influence Level</Label>
                    <Badge className={getInfluenceColor(voter.influenceLevel)}>{voter.influenceLevel}</Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500">Party Affiliation</Label>
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
                    <Label className="text-gray-500">Voter Category</Label>
                    {voter.voterCategory ? (
                      <Badge style={{ backgroundColor: voter.voterCategory.color || voter.voterCategory.categoryColor || '#808080' }}>
                        {voter.voterCategory.name || voter.voterCategory.categoryName}
                      </Badge>
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-500">Last Contacted</Label>
                    <p className="font-medium">
                      {voter.lastContactedAt ? new Date(voter.lastContactedAt).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Notes</Label>
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
                          <p className="text-sm text-gray-500">{vs.scheme?.description || vs.scheme?.schemeDescription}</p>
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
                <p className="text-gray-500">No scheme enrollments found</p>
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
                        <p className="text-sm text-gray-500">{vh.history?.electionType} - {vh.history?.electionYear}</p>
                      </div>
                      <Badge variant={vh.voted ? 'default' : 'secondary'}>
                        {vh.voted ? 'Voted' : 'Did Not Vote'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No voting history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Voter</DialogTitle>
            <DialogDescription>Update voter information</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const data: any = {};
            formData.forEach((value, key) => {
              if (value) data[key] = value;
            });
            updateMutation.mutate(data);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={voter.voterName || voter.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" name="mobile" defaultValue={voter.mobile} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="politicalLeaning">Political Leaning</Label>
                <Select name="politicalLeaning" defaultValue={voter.politicalLeaning}>
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
                <Label htmlFor="influenceLevel">Influence Level</Label>
                <Select name="influenceLevel" defaultValue={voter.influenceLevel}>
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
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" defaultValue={voter.notes} />
            </div>
            <DialogFooter>
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
