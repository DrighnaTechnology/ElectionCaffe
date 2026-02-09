import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { candidatesAPI, electionsAPI, masterDataAPI } from '../services/api';
import { useElectionStore } from '../store/election';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import { Textarea } from '../components/ui/textarea';
import {
  PlusIcon,
  SearchIcon,
  UserIcon,
  FileTextIcon,
  Share2Icon,
  TrendingUpIcon,
  ExternalLinkIcon,
  TrashIcon,
  GraduationCapIcon,
  BriefcaseIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../lib/utils';

const socialMediaPlatforms = [
  { value: 'WEBSITE', label: 'Website', color: 'bg-gray-700', icon: 'globe' },
  { value: 'FACEBOOK', label: 'Facebook', color: 'bg-blue-600', icon: 'facebook' },
  { value: 'TWITTER', label: 'Twitter/X', color: 'bg-sky-500', icon: 'twitter' },
  { value: 'INSTAGRAM', label: 'Instagram', color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500', icon: 'instagram' },
  { value: 'YOUTUBE', label: 'YouTube', color: 'bg-red-600', icon: 'youtube' },
  { value: 'LINKEDIN', label: 'LinkedIn', color: 'bg-blue-700', icon: 'linkedin' },
  { value: 'TIKTOK', label: 'TikTok', color: 'bg-black', icon: 'tiktok' },
  { value: 'THREADS', label: 'Threads', color: 'bg-gray-900', icon: 'threads' },
  { value: 'WHATSAPP', label: 'WhatsApp', color: 'bg-green-500', icon: 'whatsapp' },
  { value: 'TELEGRAM', label: 'Telegram', color: 'bg-sky-600', icon: 'telegram' },
  { value: 'OTHER', label: 'Other', color: 'bg-gray-500', icon: 'other' },
];

const documentTypes = [
  { value: 'RESUME', label: 'Resume/CV' },
  { value: 'AFFIDAVIT', label: 'Affidavit' },
  { value: 'CRIMINAL_RECORD', label: 'Criminal Record' },
  { value: 'ASSETS', label: 'Assets Declaration' },
  { value: 'EDUCATION', label: 'Education Certificate' },
  { value: 'ID_PROOF', label: 'ID Proof' },
  { value: 'OTHER', label: 'Other' },
];

const storageProviders = [
  { value: 'ONEDRIVE', label: 'OneDrive' },
  { value: 'GOOGLE_DRIVE', label: 'Google Drive' },
  { value: 'LOCAL', label: 'Local Storage' },
];

export function CandidateBioPage() {
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [addSocialMediaOpen, setAddSocialMediaOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    nameLocal: '',
    photoUrl: '',
    partyId: '',
    nominationNumber: '',
    isOurCandidate: false,
    age: '',
    dateOfBirth: '',
    education: '',
    profession: '',
    experience: '',
    biography: '',
    mobile: '',
    email: '',
    address: '',
  });
  const [documentForm, setDocumentForm] = useState({
    documentName: '',
    documentType: 'RESUME',
    storageProvider: 'GOOGLE_DRIVE',
    fileUrl: '',
    fileId: '',
    description: '',
  });
  const [socialMediaForm, setSocialMediaForm] = useState({
    platform: 'FACEBOOK',
    profileUrl: '',
    username: '',
    followers: '',
    following: '',
    posts: '',
    subscribers: '',
    likes: '',
    views: '',
    comments: '',
    shares: '',
    engagementRate: '',
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectedElectionId } = useElectionStore();

  // Fetch elections for dropdown
  const { data: _electionsData } = useQuery({
    queryKey: ['elections'],
    queryFn: () => electionsAPI.getAll(),
  });

  // Fetch candidates for selected election
  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates', selectedElectionId, search],
    queryFn: () => candidatesAPI.getAll(selectedElectionId!, { search: search || undefined }),
    enabled: !!selectedElectionId,
  });

  // Fetch candidate details
  const { data: candidateDetails } = useQuery({
    queryKey: ['candidate', selectedCandidate?.id],
    queryFn: () => candidatesAPI.getById(selectedCandidate!.id),
    enabled: !!selectedCandidate?.id,
  });

  // Fetch candidate documents
  const { data: documentsData } = useQuery({
    queryKey: ['candidate-documents', selectedCandidate?.id],
    queryFn: () => candidatesAPI.getDocuments(selectedCandidate!.id),
    enabled: !!selectedCandidate?.id,
  });

  // Fetch candidate social media
  const { data: socialMediaData } = useQuery({
    queryKey: ['candidate-social-media', selectedCandidate?.id],
    queryFn: () => candidatesAPI.getSocialMedia(selectedCandidate!.id),
    enabled: !!selectedCandidate?.id,
  });

  // Fetch candidate stats
  const { data: statsData } = useQuery({
    queryKey: ['candidate-stats', selectedCandidate?.id],
    queryFn: () => candidatesAPI.getStats(selectedCandidate!.id),
    enabled: !!selectedCandidate?.id,
  });

  // Fetch parties for dropdown
  const { data: partiesData } = useQuery({
    queryKey: ['parties', selectedElectionId],
    queryFn: () => masterDataAPI.getParties(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  // Mutations
  const createCandidateMutation = useMutation({
    mutationFn: () => candidatesAPI.create(selectedElectionId!, {
      ...candidateForm,
      age: candidateForm.age ? parseInt(candidateForm.age) : undefined,
    }),
    onSuccess: () => {
      toast.success('Candidate created successfully');
      setAddCandidateOpen(false);
      setCandidateForm({
        name: '', nameLocal: '', photoUrl: '', partyId: '', nominationNumber: '',
        isOurCandidate: false, age: '', dateOfBirth: '', education: '', profession: '',
        experience: '', biography: '', mobile: '', email: '', address: '',
      });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create candidate');
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: () => candidatesAPI.addDocument(selectedCandidate!.id, documentForm),
    onSuccess: () => {
      toast.success('Document added successfully');
      setAddDocumentOpen(false);
      setDocumentForm({
        documentName: '', documentType: 'RESUME', storageProvider: 'GOOGLE_DRIVE',
        fileUrl: '', fileId: '', description: '',
      });
      queryClient.invalidateQueries({ queryKey: ['candidate-documents'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add document');
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId: string) => candidatesAPI.deleteDocument(selectedCandidate!.id, docId),
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['candidate-documents'] });
    },
  });

  const addSocialMediaMutation = useMutation({
    mutationFn: () => candidatesAPI.addSocialMedia(selectedCandidate!.id, {
      ...socialMediaForm,
      followers: socialMediaForm.followers ? parseInt(socialMediaForm.followers) : 0,
      following: socialMediaForm.following ? parseInt(socialMediaForm.following) : 0,
      posts: socialMediaForm.posts ? parseInt(socialMediaForm.posts) : 0,
      subscribers: socialMediaForm.subscribers ? parseInt(socialMediaForm.subscribers) : 0,
      likes: socialMediaForm.likes ? parseInt(socialMediaForm.likes) : 0,
      views: socialMediaForm.views ? parseInt(socialMediaForm.views) : 0,
      comments: socialMediaForm.comments ? parseInt(socialMediaForm.comments) : 0,
      shares: socialMediaForm.shares ? parseInt(socialMediaForm.shares) : 0,
      engagementRate: socialMediaForm.engagementRate ? parseFloat(socialMediaForm.engagementRate) : undefined,
    } as any),
    onSuccess: () => {
      toast.success('Social media profile added');
      setAddSocialMediaOpen(false);
      setSocialMediaForm({
        platform: 'FACEBOOK', profileUrl: '', username: '',
        followers: '', following: '', posts: '',
        subscribers: '', likes: '', views: '',
        comments: '', shares: '', engagementRate: '',
      });
      queryClient.invalidateQueries({ queryKey: ['candidate-social-media'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add social media');
    },
  });

  const deleteSocialMediaMutation = useMutation({
    mutationFn: (smId: string) => candidatesAPI.deleteSocialMedia(selectedCandidate!.id, smId),
    onSuccess: () => {
      toast.success('Social media profile removed');
      queryClient.invalidateQueries({ queryKey: ['candidate-social-media'] });
    },
  });

  const candidates = candidatesData?.data?.data || [];
  const documents = documentsData?.data?.data || [];
  const socialMedia = socialMediaData?.data?.data || [];
  const stats = statsData?.data?.data || {};
  const parties = partiesData?.data?.data || [];
  const candidate = candidateDetails?.data?.data || selectedCandidate;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const getTotalFollowers = () => {
    return socialMedia.reduce((sum: number, sm: any) => sum + (sm.followers || 0), 0);
  };

  if (!selectedElectionId) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Please select an election to view candidates</p>
        <Button className="mt-4" onClick={() => navigate('/elections')}>
          Go to Elections
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Candidate Bio</h1>
          <p className="text-gray-500">View and manage candidate profiles</p>
        </div>
        <Dialog open={addCandidateOpen} onOpenChange={setAddCandidateOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Candidate</DialogTitle>
              <DialogDescription>Create a new candidate profile</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createCandidateMutation.mutate(); }}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    placeholder="Candidate name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameLocal">Local Name</Label>
                  <Input
                    id="nameLocal"
                    value={candidateForm.nameLocal}
                    onChange={(e) => setCandidateForm({ ...candidateForm, nameLocal: e.target.value })}
                    placeholder="Name in local language"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyId">Party</Label>
                  <Select
                    value={candidateForm.partyId}
                    onValueChange={(value) => setCandidateForm({ ...candidateForm, partyId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select party" />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map((party: any) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name} ({party.shortName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nominationNumber">Nomination Number</Label>
                  <Input
                    id="nominationNumber"
                    value={candidateForm.nominationNumber}
                    onChange={(e) => setCandidateForm({ ...candidateForm, nominationNumber: e.target.value })}
                    placeholder="Nomination #"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={candidateForm.age}
                    onChange={(e) => setCandidateForm({ ...candidateForm, age: e.target.value })}
                    placeholder="Age"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={candidateForm.dateOfBirth}
                    onChange={(e) => setCandidateForm({ ...candidateForm, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    value={candidateForm.education}
                    onChange={(e) => setCandidateForm({ ...candidateForm, education: e.target.value })}
                    placeholder="Education"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    value={candidateForm.profession}
                    onChange={(e) => setCandidateForm({ ...candidateForm, profession: e.target.value })}
                    placeholder="Profession"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={candidateForm.mobile}
                    onChange={(e) => setCandidateForm({ ...candidateForm, mobile: e.target.value })}
                    placeholder="Mobile number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    placeholder="Email"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="photoUrl">Photo URL</Label>
                  <Input
                    id="photoUrl"
                    value={candidateForm.photoUrl}
                    onChange={(e) => setCandidateForm({ ...candidateForm, photoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={candidateForm.address}
                    onChange={(e) => setCandidateForm({ ...candidateForm, address: e.target.value })}
                    placeholder="Full address"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="biography">Biography</Label>
                  <Textarea
                    id="biography"
                    value={candidateForm.biography}
                    onChange={(e) => setCandidateForm({ ...candidateForm, biography: e.target.value })}
                    placeholder="Brief biography"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddCandidateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCandidateMutation.isPending}>
                  {createCandidateMutation.isPending && <Spinner size="sm" className="mr-2" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Candidates</CardTitle>
            <div className="relative mt-2">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search candidates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {candidatesLoading ? (
              <div className="p-4 space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No candidates found</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {candidates.map((cand: any) => (
                  <div
                    key={cand.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedCandidate?.id === cand.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                    }`}
                    onClick={() => setSelectedCandidate(cand)}
                  >
                    <div className="flex items-center gap-3">
                      {cand.photoUrl ? (
                        <img
                          src={cand.photoUrl}
                          alt={cand.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cand.name}</p>
                        {cand.party && (
                          <p className="text-sm text-gray-500 truncate">
                            {cand.party.shortName || cand.party.name}
                          </p>
                        )}
                      </div>
                      {cand.isOurCandidate && (
                        <Badge variant="success" className="shrink-0">Our</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidate Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCandidate ? (
            <>
              {/* Profile Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="shrink-0">
                      {candidate?.photoUrl ? (
                        <img
                          src={candidate.photoUrl}
                          alt={candidate.name}
                          className="h-32 w-32 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-32 w-32 rounded-xl bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-16 w-16 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-bold">{candidate?.name}</h2>
                          {candidate?.isOurCandidate && (
                            <Badge variant="success">Our Candidate</Badge>
                          )}
                        </div>
                        {candidate?.nameLocal && (
                          <p className="text-gray-500">{candidate.nameLocal}</p>
                        )}
                        {candidate?.party && (
                          <p className="text-orange-600 font-medium">
                            {candidate.party.name} ({candidate.party.shortName})
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {candidate?.age && (
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span>{candidate.age} years</span>
                          </div>
                        )}
                        {candidate?.education && (
                          <div className="flex items-center gap-2 text-sm">
                            <GraduationCapIcon className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{candidate.education}</span>
                          </div>
                        )}
                        {candidate?.profession && (
                          <div className="flex items-center gap-2 text-sm">
                            <BriefcaseIcon className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{candidate.profession}</span>
                          </div>
                        )}
                        {candidate?.mobile && (
                          <div className="flex items-center gap-2 text-sm">
                            <PhoneIcon className="h-4 w-4 text-gray-400" />
                            <span>{candidate.mobile}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <UsersIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatNumber(getTotalFollowers())}</p>
                        <p className="text-sm text-gray-500">Total Followers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <FileTextIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{documents.length}</p>
                        <p className="text-sm text-gray-500">Documents</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <Share2Icon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{socialMedia.length}</p>
                        <p className="text-sm text-gray-500">Social Profiles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <TrendingUpIcon className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.battleCards || 0}</p>
                        <p className="text-sm text-gray-500">Battle Cards</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="documents" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="social-media">Social Media</TabsTrigger>
                  <TabsTrigger value="biography">Biography</TabsTrigger>
                </TabsList>

                {/* Documents Tab */}
                <TabsContent value="documents">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Documents</CardTitle>
                        <CardDescription>
                          Manage candidate documents from cloud storage
                        </CardDescription>
                      </div>
                      <Dialog open={addDocumentOpen} onOpenChange={setAddDocumentOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Document
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Document</DialogTitle>
                            <DialogDescription>
                              Link a document from OneDrive or Google Drive
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={(e) => { e.preventDefault(); addDocumentMutation.mutate(); }}>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="docName">Document Name *</Label>
                                <Input
                                  id="docName"
                                  value={documentForm.documentName}
                                  onChange={(e) => setDocumentForm({ ...documentForm, documentName: e.target.value })}
                                  placeholder="e.g., Educational Certificate"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Document Type</Label>
                                  <Select
                                    value={documentForm.documentType}
                                    onValueChange={(v) => setDocumentForm({ ...documentForm, documentType: v })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {documentTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Storage Provider</Label>
                                  <Select
                                    value={documentForm.storageProvider}
                                    onValueChange={(v) => setDocumentForm({ ...documentForm, storageProvider: v })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {storageProviders.map((prov) => (
                                        <SelectItem key={prov.value} value={prov.value}>
                                          {prov.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="fileUrl">File URL *</Label>
                                <Input
                                  id="fileUrl"
                                  value={documentForm.fileUrl}
                                  onChange={(e) => setDocumentForm({ ...documentForm, fileUrl: e.target.value })}
                                  placeholder="https://drive.google.com/..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  value={documentForm.description}
                                  onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                                  placeholder="Brief description"
                                  rows={2}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setAddDocumentOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={addDocumentMutation.isPending}>
                                {addDocumentMutation.isPending && <Spinner size="sm" className="mr-2" />}
                                Add
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {documents.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No documents added yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {documents.map((doc: any) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gray-100">
                                  <FileTextIcon className="h-5 w-5 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{doc.documentName}</p>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Badge variant="outline" className="text-xs">
                                      {doc.documentType}
                                    </Badge>
                                    <span>{doc.storageProvider}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(doc.fileUrl, '_blank')}
                                >
                                  <ExternalLinkIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600"
                                  onClick={() => deleteDocumentMutation.mutate(doc.id)}
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
                </TabsContent>

                {/* Social Media Tab */}
                <TabsContent value="social-media">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Social Media Profiles</CardTitle>
                        <CardDescription>
                          Track follower statistics across platforms
                        </CardDescription>
                      </div>
                      <Dialog open={addSocialMediaOpen} onOpenChange={setAddSocialMediaOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Social Media Profile</DialogTitle>
                            <DialogDescription>
                              Link a social media account
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={(e) => { e.preventDefault(); addSocialMediaMutation.mutate(); }}>
                            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                              <div className="space-y-2">
                                <Label>Platform</Label>
                                <Select
                                  value={socialMediaForm.platform}
                                  onValueChange={(v) => setSocialMediaForm({ ...socialMediaForm, platform: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {socialMediaPlatforms.map((platform) => (
                                      <SelectItem key={platform.value} value={platform.value}>
                                        {platform.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="profileUrl">Profile URL *</Label>
                                <Input
                                  id="profileUrl"
                                  value={socialMediaForm.profileUrl}
                                  onChange={(e) => setSocialMediaForm({ ...socialMediaForm, profileUrl: e.target.value })}
                                  placeholder="https://facebook.com/..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                  id="username"
                                  value={socialMediaForm.username}
                                  onChange={(e) => setSocialMediaForm({ ...socialMediaForm, username: e.target.value })}
                                  placeholder="@username"
                                />
                              </div>

                              {/* Audience Stats */}
                              <div className="pt-2 border-t">
                                <p className="text-sm font-medium text-gray-700 mb-3">Audience Statistics</p>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="followers">Followers</Label>
                                    <Input
                                      id="followers"
                                      type="number"
                                      value={socialMediaForm.followers}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, followers: e.target.value })}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="following">Following</Label>
                                    <Input
                                      id="following"
                                      type="number"
                                      value={socialMediaForm.following}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, following: e.target.value })}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="subscribers">Subscribers</Label>
                                    <Input
                                      id="subscribers"
                                      type="number"
                                      value={socialMediaForm.subscribers}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, subscribers: e.target.value })}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Content Stats */}
                              <div className="pt-2 border-t">
                                <p className="text-sm font-medium text-gray-700 mb-3">Content Statistics</p>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="posts">Posts</Label>
                                    <Input
                                      id="posts"
                                      type="number"
                                      value={socialMediaForm.posts}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, posts: e.target.value })}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="views">Total Views</Label>
                                    <Input
                                      id="views"
                                      type="number"
                                      value={socialMediaForm.views}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, views: e.target.value })}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="engagementRate">Engagement %</Label>
                                    <Input
                                      id="engagementRate"
                                      type="number"
                                      step="0.01"
                                      value={socialMediaForm.engagementRate}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, engagementRate: e.target.value })}
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Engagement Stats */}
                              <div className="pt-2 border-t">
                                <p className="text-sm font-medium text-gray-700 mb-3">Engagement Metrics</p>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="likes">Likes</Label>
                                    <Input
                                      id="likes"
                                      type="number"
                                      value={socialMediaForm.likes}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, likes: e.target.value })}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="comments">Comments</Label>
                                    <Input
                                      id="comments"
                                      type="number"
                                      value={socialMediaForm.comments}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, comments: e.target.value })}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="shares">Shares</Label>
                                    <Input
                                      id="shares"
                                      type="number"
                                      value={socialMediaForm.shares}
                                      onChange={(e) => setSocialMediaForm({ ...socialMediaForm, shares: e.target.value })}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setAddSocialMediaOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={addSocialMediaMutation.isPending}>
                                {addSocialMediaMutation.isPending && <Spinner size="sm" className="mr-2" />}
                                Add
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {socialMedia.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No social media profiles added yet
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Social Media Summary Dashboard */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-blue-600">{formatNumber(getTotalFollowers())}</p>
                              <p className="text-sm text-gray-600">Total Followers</p>
                            </div>
                            <div className="text-center">
                              <p className="text-3xl font-bold text-green-600">
                                {formatNumber(socialMedia.reduce((sum: number, sm: any) => sum + (sm.views || 0), 0))}
                              </p>
                              <p className="text-sm text-gray-600">Total Views</p>
                            </div>
                            <div className="text-center">
                              <p className="text-3xl font-bold text-pink-600">
                                {formatNumber(socialMedia.reduce((sum: number, sm: any) => sum + (sm.likes || 0), 0))}
                              </p>
                              <p className="text-sm text-gray-600">Total Likes</p>
                            </div>
                            <div className="text-center">
                              <p className="text-3xl font-bold text-purple-600">{socialMedia.length}</p>
                              <p className="text-sm text-gray-600">Platforms</p>
                            </div>
                          </div>

                          {/* Individual Platform Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {socialMedia.map((sm: any) => {
                              const platform = socialMediaPlatforms.find(p => p.value === sm.platform);
                              const hasAdvancedStats = sm.views || sm.likes || sm.subscribers || sm.comments || sm.shares;
                              return (
                                <Card key={sm.id} className="overflow-hidden">
                                  <div className={`h-2 ${platform?.color || 'bg-gray-500'}`} />
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{platform?.label || sm.platform}</span>
                                        {sm.username && (
                                          <span className="text-sm text-gray-500">@{sm.username}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => window.open(sm.profileUrl, '_blank')}
                                        >
                                          <ExternalLinkIcon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-red-600"
                                          onClick={() => deleteSocialMediaMutation.mutate(sm.id)}
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Primary Stats Row */}
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                      <div>
                                        <p className="text-xl font-bold">{formatNumber(sm.followers || 0)}</p>
                                        <p className="text-xs text-gray-500">Followers</p>
                                      </div>
                                      <div>
                                        <p className="text-xl font-bold">{formatNumber(sm.following || 0)}</p>
                                        <p className="text-xs text-gray-500">Following</p>
                                      </div>
                                      <div>
                                        <p className="text-xl font-bold">{formatNumber(sm.subscribers || sm.posts || 0)}</p>
                                        <p className="text-xs text-gray-500">{sm.subscribers ? 'Subscribers' : 'Posts'}</p>
                                      </div>
                                    </div>

                                    {/* Advanced Stats Row - Views, Likes, Comments, Shares */}
                                    {hasAdvancedStats && (
                                      <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-center">
                                        {sm.views > 0 && (
                                          <div className="flex flex-col items-center">
                                            <span className="text-lg font-semibold text-blue-600">{formatNumber(sm.views)}</span>
                                            <span className="text-[10px] text-gray-500">Views</span>
                                          </div>
                                        )}
                                        {sm.likes > 0 && (
                                          <div className="flex flex-col items-center">
                                            <span className="text-lg font-semibold text-pink-600">{formatNumber(sm.likes)}</span>
                                            <span className="text-[10px] text-gray-500">Likes</span>
                                          </div>
                                        )}
                                        {sm.comments > 0 && (
                                          <div className="flex flex-col items-center">
                                            <span className="text-lg font-semibold text-yellow-600">{formatNumber(sm.comments)}</span>
                                            <span className="text-[10px] text-gray-500">Comments</span>
                                          </div>
                                        )}
                                        {sm.shares > 0 && (
                                          <div className="flex flex-col items-center">
                                            <span className="text-lg font-semibold text-green-600">{formatNumber(sm.shares)}</span>
                                            <span className="text-[10px] text-gray-500">Shares</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Engagement Rate */}
                                    {sm.engagementRate && (
                                      <div className="mt-3 pt-3 border-t flex items-center justify-center gap-2">
                                        <TrendingUpIcon className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-medium">
                                          {sm.engagementRate.toFixed(2)}% Engagement Rate
                                        </span>
                                      </div>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2 text-center">
                                      Last updated: {formatDate(sm.lastUpdated)}
                                    </p>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Biography Tab */}
                <TabsContent value="biography">
                  <Card>
                    <CardHeader>
                      <CardTitle>Biography & Background</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {candidate?.biography && (
                        <div>
                          <h4 className="font-medium mb-2">Biography</h4>
                          <p className="text-gray-600 whitespace-pre-wrap">{candidate.biography}</p>
                        </div>
                      )}
                      {candidate?.experience && (
                        <div>
                          <h4 className="font-medium mb-2">Experience</h4>
                          <p className="text-gray-600 whitespace-pre-wrap">{candidate.experience}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {candidate?.education && (
                          <div className="flex items-start gap-3">
                            <GraduationCapIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">Education</p>
                              <p className="text-gray-600">{candidate.education}</p>
                            </div>
                          </div>
                        )}
                        {candidate?.profession && (
                          <div className="flex items-start gap-3">
                            <BriefcaseIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">Profession</p>
                              <p className="text-gray-600">{candidate.profession}</p>
                            </div>
                          </div>
                        )}
                        {candidate?.mobile && (
                          <div className="flex items-start gap-3">
                            <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">Mobile</p>
                              <p className="text-gray-600">{candidate.mobile}</p>
                            </div>
                          </div>
                        )}
                        {candidate?.email && (
                          <div className="flex items-start gap-3">
                            <MailIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">Email</p>
                              <p className="text-gray-600">{candidate.email}</p>
                            </div>
                          </div>
                        )}
                        {candidate?.address && (
                          <div className="flex items-start gap-3 col-span-2">
                            <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium">Address</p>
                              <p className="text-gray-600">{candidate.address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center p-8">
                <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a candidate to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
