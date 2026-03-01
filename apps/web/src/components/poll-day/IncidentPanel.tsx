import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  AlertTriangleIcon, PlusIcon, ClockIcon, CheckCircleIcon,
  ArrowUpIcon, MapPinIcon, SearchIcon,
} from 'lucide-react';

interface IncidentPanelProps {
  incidents: any[];
  electionId: string;
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-yellow-900',
  LOW: 'bg-blue-400 text-white',
};

const statusColors: Record<string, string> = {
  OPEN: 'border-red-300 bg-red-50',
  ACKNOWLEDGED: 'border-orange-300 bg-orange-50',
  IN_PROGRESS: 'border-blue-300 bg-blue-50',
  RESOLVED: 'border-green-300 bg-green-50',
  ESCALATED: 'border-purple-300 bg-purple-50',
};

const typeIcons: Record<string, string> = {
  VIOLENCE: 'Violence',
  DISRUPTION: 'Disruption',
  EVM_MALFUNCTION: 'EVM Issue',
  QUEUE_ISSUE: 'Queue',
  IMPERSONATION: 'Fraud',
  OTHER: 'Other',
};

export function IncidentPanel({ incidents, electionId }: IncidentPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  // Create incident
  const [newIncident, setNewIncident] = useState({
    incidentType: 'OTHER',
    severity: 'MEDIUM',
    title: '',
    description: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/poll-day/incidents', { ...data, electionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', electionId] });
      setShowCreateForm(false);
      setNewIncident({ incidentType: 'OTHER', severity: 'MEDIUM', title: '', description: '' });
    },
  });

  // Update incident
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/poll-day/incidents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', electionId] });
    },
  });

  const filtered = (incidents || []).filter((i: any) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.title?.toLowerCase().includes(q) && !i.incidentType?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const getTimeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const getSlaStatus = (incident: any) => {
    if (!incident.slaDeadline || incident.status === 'RESOLVED') return null;
    const remaining = new Date(incident.slaDeadline).getTime() - Date.now();
    if (remaining < 0) return { label: 'BREACHED', color: 'text-red-600 bg-red-100' };
    const total = new Date(incident.slaDeadline).getTime() - new Date(incident.createdAt).getTime();
    if (remaining / total < 0.25) return { label: 'AT RISK', color: 'text-orange-600 bg-orange-100' };
    return { label: 'ON TRACK', color: 'text-green-600 bg-green-100' };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-7 text-xs w-[130px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => setShowCreateForm(!showCreateForm)}>
          <PlusIcon className="h-3 w-3 mr-1" />
          Report
        </Button>
        <span className="text-xs text-muted-foreground">
          {filtered.filter((i: any) => i.status !== 'RESOLVED').length} open
        </span>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="flex-shrink-0 p-3 rounded border bg-muted mb-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select value={newIncident.incidentType} onValueChange={(v) => setNewIncident({ ...newIncident, incidentType: v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeIcons).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newIncident.severity} onValueChange={(v) => setNewIncident({ ...newIncident, severity: v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Incident title..."
            value={newIncident.title}
            onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Description (optional)..."
            value={newIncident.description}
            onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
            className="h-7 text-xs"
          />
          <div className="flex gap-2">
            <Button
              size="sm" className="h-7 text-xs"
              onClick={() => createMutation.mutate(newIncident)}
              disabled={!newIncident.title || createMutation.isPending}
            >
              Submit
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Incidents list */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No incidents reported</p>
          ) : (
            filtered.map((incident: any) => {
              const sla = getSlaStatus(incident);
              return (
                <div key={incident.id} className={`p-2 rounded border text-xs ${statusColors[incident.status] || 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <AlertTriangleIcon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                        incident.severity === 'CRITICAL' ? 'text-red-600' : 'text-orange-500'
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{incident.title}</span>
                          <Badge className={`text-[8px] ${severityColors[incident.severity]}`}>{incident.severity}</Badge>
                          <Badge variant="outline" className="text-[8px]">{typeIcons[incident.incidentType] || incident.incidentType}</Badge>
                          {sla && <span className={`text-[8px] px-1 rounded ${sla.color}`}>{sla.label}</span>}
                        </div>
                        {incident.description && (
                          <p className="text-muted-foreground mt-0.5 truncate">{incident.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span><ClockIcon className="h-2.5 w-2.5 inline" /> {getTimeAgo(incident.createdAt)}</span>
                          {incident.booth && <span><MapPinIcon className="h-2.5 w-2.5 inline" /> Booth {incident.booth.boothNumber}</span>}
                          {incident.escalationLevel > 0 && (
                            <span className="text-purple-600"><ArrowUpIcon className="h-2.5 w-2.5 inline" /> Level {incident.escalationLevel}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    {incident.status !== 'RESOLVED' && (
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        {incident.status === 'OPEN' && (
                          <Button
                            variant="outline" size="sm" className="h-5 text-[10px]"
                            onClick={() => updateMutation.mutate({ id: incident.id, data: { status: 'ACKNOWLEDGED' } })}
                          >
                            ACK
                          </Button>
                        )}
                        {(incident.status === 'ACKNOWLEDGED' || incident.status === 'OPEN') && (
                          <Button
                            variant="outline" size="sm" className="h-5 text-[10px]"
                            onClick={() => updateMutation.mutate({
                              id: incident.id,
                              data: { status: 'ESCALATED', escalationLevel: (incident.escalationLevel || 0) + 1 }
                            })}
                          >
                            <ArrowUpIcon className="h-2.5 w-2.5" />
                          </Button>
                        )}
                        <Button
                          variant="outline" size="sm" className="h-5 text-[10px] text-green-600"
                          onClick={() => updateMutation.mutate({ id: incident.id, data: { status: 'RESOLVED', resolution: 'Resolved' } })}
                        >
                          <CheckCircleIcon className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
