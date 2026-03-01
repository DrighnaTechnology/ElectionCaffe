import { useQuery } from '@tanstack/react-query';
import { useElectionStore } from '../../store/election';
import { useAuthStore } from '../../store/auth';
import { useSidebarStore } from '../../store/sidebar';
import { electionsAPI } from '../../services/api';
import { VoteIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { useEffect } from 'react';

export function ElectionSelector() {
  const { isAuthenticated } = useAuthStore();
  const { selectedElectionId, setSelectedElection } = useElectionStore();
  const { collapsed } = useSidebarStore();

  const { data: electionsData } = useQuery({
    queryKey: ['elections'],
    queryFn: () => electionsAPI.getAll({ limit: 100 }),
    enabled: isAuthenticated,
  });

  const elections = electionsData?.data?.data || [];

  // Auto-select first election if none selected
  useEffect(() => {
    if (elections.length > 0 && !selectedElectionId) {
      setSelectedElection(elections[0].id);
    }
  }, [elections, selectedElectionId, setSelectedElection]);

  const selectedElection = elections.find((e: any) => e.id === selectedElectionId);

  if (collapsed) {
    return (
      <div className="p-2 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors text-brand',
                !selectedElectionId && 'animate-pulse'
              )}
              style={{ backgroundColor: 'hsl(var(--brand-muted))' }}
            >
              <VoteIcon className="h-5 w-5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {selectedElection?.name || 'Select Election'}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      className="p-3 border-b"
      style={{
        borderColor: 'hsl(var(--sidebar-border))',
        backgroundColor: !selectedElectionId ? 'hsl(var(--brand-primary) / 0.1)' : 'transparent',
      }}
    >
      {!selectedElectionId && (
        <p className="text-xs font-medium text-brand mb-2">
          Select an election to get started
        </p>
      )}
      <Select
        value={selectedElectionId || ''}
        onValueChange={(value) => setSelectedElection(value)}
      >
        <SelectTrigger className={cn(
          'w-full text-sm',
          !selectedElectionId && 'border-brand/40 ring-2 ring-brand/20'
        )}
          style={{
            backgroundColor: 'hsl(var(--sidebar-active-bg))',
            borderColor: 'hsl(var(--sidebar-border))',
            color: 'hsl(var(--sidebar-foreground-active))',
          }}
        >
          <SelectValue placeholder="Select Election" />
        </SelectTrigger>
        <SelectContent>
          {elections.map((election: any) => (
            <SelectItem key={election.id} value={election.id}>
              {election.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
