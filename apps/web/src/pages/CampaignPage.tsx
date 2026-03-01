import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectionStore } from '../store/election';
import { campaignsAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
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
  AlertTriangleIcon,
  SettingsIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Campaign {
  id: string;
  campaignName: string;
  campaignType: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'VOICE';
  message: string;
  targetAudience: any;
  targetCount: number;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
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

  // Fetch campaigns
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaigns', selectedElectionId],
    queryFn: () => campaignsAPI.getAll(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  // Fetch campaign stats
  const { data: statsData } = useQuery({
    queryKey: ['campaign-stats', selectedElectionId],
    queryFn: () => campaignsAPI.getStats(selectedElectionId!),
    enabled: !!selectedElectionId,
  });

  // Fetch provider status
  const { data: providerData } = useQuery({
    queryKey: ['provider-status'],
    queryFn: () => campaignsAPI.getProviderStatus(),
    enabled: !!selectedElectionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => campaignsAPI.create(selectedElectionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', selectedElectionId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats', selectedElectionId] });
      toast.success('Campaign created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to create campaign'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.send(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', selectedElectionId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats', selectedElectionId] });
      const data = response.data?.data;
      if (data?.mockMode) {
        toast.warning(`Campaign started in MOCK MODE. ${data.totalTargets} messages queued but won't actually send. Configure a provider in Settings > Messaging.`);
      } else {
        toast.success(`Campaign sent! ${data?.totalTargets || 0} messages queued for delivery.`);
      }
    },
    onError: (error: any) => toast.error(error.response?.data?.error?.message || 'Failed to send campaign'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', selectedElectionId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats', selectedElectionId] });
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
    createMutation.mutate({
      campaignName: formData.campaignName,
      campaignType: formData.campaignType,
      message: formData.message,
      targetAudience: { preset: formData.targetAudience },
      scheduledAt: formData.scheduledAt || undefined,
    });
  };

  const campaigns: Campaign[] = campaignsData?.data?.data || [];
  const stats = statsData?.data?.data || { totalCampaigns: 0, messagesSent: 0, delivered: 0, active: 0 };
  const providerStatus: Record<string, boolean> = providerData?.data?.data || {};

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if selected campaign type has a provider configured
  const hasProvider = (type: string) => providerStatus[type] === true;
  const anyProviderMissing = !hasProvider('SMS') && !hasProvider('WHATSAPP') && !hasProvider('EMAIL') && !hasProvider('VOICE');

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SCHEDULED': return 'outline';
      case 'SENDING': return 'default';
      case 'COMPLETED': return 'default';
      case 'FAILED': return 'destructive';
      case 'CANCELLED': return 'secondary';
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

  const getAudienceLabel = (audience: any) => {
    if (typeof audience === 'string') return audience;
    if (audience?.preset) return audience.preset;
    return 'Custom';
  };

  if (!selectedElectionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircleIcon className="h-12 w-12 text-brand mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Election Selected</h2>
          <p className="text-muted-foreground">Please select an election from the sidebar to manage campaigns.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Provider Warning Banner */}
      {anyProviderMissing && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              No messaging providers configured
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
              Campaigns will run in mock mode (messages logged but not delivered). Configure your SMS, WhatsApp, Email, or Voice provider in Settings.
            </p>
          </div>
          <Link to="/settings">
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <SettingsIcon className="h-4 w-4 mr-1" />
              Configure
            </Button>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaign Manager</h1>
          <p className="text-muted-foreground">Create and manage voter communication campaigns</p>
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
                      <SelectItem value="SMS">
                        <span className="flex items-center gap-2">SMS {!hasProvider('SMS') && <span className="text-xs text-yellow-600">(no provider)</span>}</span>
                      </SelectItem>
                      <SelectItem value="WHATSAPP">
                        <span className="flex items-center gap-2">WhatsApp {!hasProvider('WHATSAPP') && <span className="text-xs text-yellow-600">(no provider)</span>}</span>
                      </SelectItem>
                      <SelectItem value="EMAIL">
                        <span className="flex items-center gap-2">Email {!hasProvider('EMAIL') && <span className="text-xs text-yellow-600">(no provider)</span>}</span>
                      </SelectItem>
                      <SelectItem value="VOICE">
                        <span className="flex items-center gap-2">Voice Call {!hasProvider('VOICE') && <span className="text-xs text-yellow-600">(no provider)</span>}</span>
                      </SelectItem>
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

              {/* Provider warning for selected type */}
              {!hasProvider(formData.campaignType) && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-xs text-yellow-700 dark:text-yellow-300">
                  <AlertTriangleIcon className="h-3 w-3" />
                  No {formData.campaignType} provider configured. Messages will be logged but not delivered.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your campaign message... Use {{voter_name}} for personalization"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.message.length} characters
                  {formData.campaignType === 'SMS' && ` / 160 SMS limit`}
                  {' '} | Use {'{{voter_name}}'} for personalization
                </p>
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
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
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
                <p className="text-sm text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold">{stats.messagesSent.toLocaleString()}</p>
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
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{stats.delivered.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-muted rounded-lg">
                <TargetIcon className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  <TableHead className="text-right">Failed</TableHead>
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
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{campaign.message}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getCampaignIcon(campaign.campaignType)}
                        {campaign.campaignType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Badge variant="secondary">{getAudienceLabel(campaign.targetAudience)}</Badge>
                        {campaign.targetCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">{campaign.targetCount.toLocaleString()} voters</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(campaign.status) as any}>
                        {campaign.status === 'SENDING' && <ClockIcon className="h-3 w-3 mr-1 animate-spin" />}
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{campaign.sentCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{campaign.deliveredCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {campaign.failedCount > 0 ? (
                        <span className="text-red-600">{campaign.failedCount.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {campaign.scheduledAt ? (
                        <span className="text-sm">
                          {new Date(campaign.scheduledAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendMutation.mutate(campaign.id)}
                          disabled={sendMutation.isPending}
                          title="Send Now"
                        >
                          <SendIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {['DRAFT', 'SCHEDULED', 'COMPLETED', 'FAILED'].includes(campaign.status) && (
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => {
              setFormData({
                ...formData,
                campaignName: 'Election Day Reminder',
                message: 'Dear {{voter_name}}, tomorrow is election day! Your vote matters. Timing: 7 AM - 6 PM. Carry your Voter ID.'
              });
              setIsDialogOpen(true);
            }}>
              <h4 className="font-medium">Election Day Reminder</h4>
              <p className="text-sm text-muted-foreground mt-1">Remind voters about polling day</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => {
              setFormData({
                ...formData,
                campaignName: 'Thank You Message',
                message: 'Dear {{voter_name}}, thank you for voting! Your participation strengthens our democracy. Together we build a better future.'
              });
              setIsDialogOpen(true);
            }}>
              <h4 className="font-medium">Thank You Message</h4>
              <p className="text-sm text-muted-foreground mt-1">Post-voting appreciation</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => {
              setFormData({
                ...formData,
                campaignName: 'Rally Invitation',
                message: 'Dear {{voter_name}}, you are invited to our public meeting on [DATE] at [VENUE]. Be part of the change!'
              });
              setIsDialogOpen(true);
            }}>
              <h4 className="font-medium">Rally Invitation</h4>
              <p className="text-sm text-muted-foreground mt-1">Invite to public meetings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
