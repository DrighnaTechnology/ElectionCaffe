import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { api } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
// Tabs imports removed - not used in this component
import { Spinner } from '../components/ui/spinner';
import { toast } from 'sonner';
import {
  PlusIcon,
  SearchIcon,
  TrashIcon,
  SendIcon,
  MessageSquareIcon,
  PhoneIcon,
  MailIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  MegaphoneIcon,
  TargetIcon,
} from 'lucide-react';

interface Campaign {
  id: string;
  campaignName: string;
  campaignType: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'VOICE';
  message: string;
  targetAudience: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  scheduledAt?: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

export function CampaignPage() {
  const { selectedElectionId } = useElectionStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    campaignName: '',
    campaignType: 'SMS' as Campaign['campaignType'],
    message: '',
    targetAudience: 'all',
    scheduledAt: '',
  });
  const queryClient = useQueryClient();

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaigns', selectedElectionId],
    queryFn: () => api.get('/campaigns', { params: { electionId: selectedElectionId } }),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/campaigns', data, { params: { electionId: selectedElectionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', selectedElectionId] });
      toast.success('Campaign created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to create campaign'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', selectedElectionId] });
      toast.success('Campaign sent successfully');
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to send campaign'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', selectedElectionId] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to delete campaign'),
  });

  const resetForm = () => {
    setFormData({
      campaignName: '',
      campaignType: 'SMS',
      message: '',
      targetAudience: 'all',
      scheduledAt: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const campaigns: Campaign[] = campaignsData?.data?.data || [];

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.deliveredCount, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'RUNNING').length;

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SCHEDULED': return 'outline';
      case 'RUNNING': return 'default';
      case 'COMPLETED': return 'default';
      case 'FAILED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getCampaignIcon = (type: Campaign['campaignType']) => {
    switch (type) {
      case 'SMS': return <MessageSquareIcon className="h-4 w-4" />;
      case 'WHATSAPP': return <MessageSquareIcon className="h-4 w-4" />;
      case 'EMAIL': return <MailIcon className="h-4 w-4" />;
      case 'VOICE': return <PhoneIcon className="h-4 w-4" />;
      default: return <MessageSquareIcon className="h-4 w-4" />;
    }
  };

  if (!selectedElectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircleIcon className="h-12 w-12 text-orange-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Election Selected</h2>
          <p className="text-gray-500">Please select an election from the sidebar to manage campaigns.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaign Manager</h1>
          <p className="text-gray-500">Create and manage voter communication campaigns</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><PlusIcon className="h-4 w-4 mr-2" />Create Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>Design your voter outreach campaign</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  placeholder="e.g., Election Day Reminder"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Type *</Label>
                  <Select value={formData.campaignType} onValueChange={(v: any) => setFormData({ ...formData, campaignType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="VOICE">Voice Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Audience *</Label>
                  <Select value={formData.targetAudience} onValueChange={(v) => setFormData({ ...formData, targetAudience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Voters</SelectItem>
                      <SelectItem value="loyal">Loyal Voters</SelectItem>
                      <SelectItem value="swing">Swing Voters</SelectItem>
                      <SelectItem value="opposition">Opposition Voters</SelectItem>
                      <SelectItem value="youth">Youth (18-35)</SelectItem>
                      <SelectItem value="seniors">Seniors (60+)</SelectItem>
                      <SelectItem value="female">Female Voters</SelectItem>
                      <SelectItem value="male">Male Voters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your campaign message..."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500">{formData.message.length}/160 characters (SMS limit)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Schedule (Optional)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Spinner size="sm" className="mr-2" />}
                  Create Campaign
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MegaphoneIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <SendIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Messages Sent</p>
                <p className="text-2xl font-bold">{totalSent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="text-2xl font-bold">{totalDelivered.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TargetIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold">{activeCampaigns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search campaigns..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.campaignName}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{campaign.message}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getCampaignIcon(campaign.campaignType)}
                        {campaign.campaignType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{campaign.targetAudience}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(campaign.status) as any}>
                        {campaign.status === 'RUNNING' && <ClockIcon className="h-3 w-3 mr-1 animate-spin" />}
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{campaign.sentCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{campaign.deliveredCount.toLocaleString()}</TableCell>
                    <TableCell>
                      {campaign.scheduledAt ? (
                        <span className="text-sm">
                          {new Date(campaign.scheduledAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.status === 'DRAFT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendMutation.mutate(campaign.id)}
                          title="Send Now"
                        >
                          <SendIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this campaign?')) {
                            deleteMutation.mutate(campaign.id);
                          }
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm
                        ? 'No campaigns found matching your search.'
                        : 'No campaigns yet. Create your first campaign.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Message Templates</CardTitle>
          <CardDescription>Common campaign message templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => {
              setFormData({
                ...formData,
                campaignName: 'Election Day Reminder',
                message: 'Dear Voter, tomorrow is election day! Your vote matters. Booth: [BOOTH_NAME], Timing: 7 AM - 6 PM. Carry your Voter ID. - ElectionCaffe'
              });
              setIsDialogOpen(true);
            }}>
              <h4 className="font-medium">Election Day Reminder</h4>
              <p className="text-sm text-gray-500 mt-1">Remind voters about polling day</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => {
              setFormData({
                ...formData,
                campaignName: 'Thank You Message',
                message: 'Thank you for voting! Your participation strengthens our democracy. Together we build a better future. - ElectionCaffe'
              });
              setIsDialogOpen(true);
            }}>
              <h4 className="font-medium">Thank You Message</h4>
              <p className="text-sm text-gray-500 mt-1">Post-voting appreciation</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => {
              setFormData({
                ...formData,
                campaignName: 'Rally Invitation',
                message: 'You are invited! Join our public meeting on [DATE] at [VENUE]. Be part of the change. - ElectionCaffe'
              });
              setIsDialogOpen(true);
            }}>
              <h4 className="font-medium">Rally Invitation</h4>
              <p className="text-sm text-gray-500 mt-1">Invite to public meetings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
