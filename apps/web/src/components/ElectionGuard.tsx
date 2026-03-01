import { Outlet } from 'react-router-dom';
import { useElectionStore } from '../store/election';
import { AlertTriangleIcon, ChevronLeftIcon } from 'lucide-react';

/**
 * A route layout guard that shows a prompt to select an election
 * when no election is currently selected. Wraps election-dependent routes.
 */
export function ElectionGuard() {
  const { selectedElectionId, elections } = useElectionStore();

  if (!selectedElectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="bg-brand-muted rounded-full p-4 mb-6">
          <AlertTriangleIcon className="h-12 w-12 text-brand" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">No Election Selected</h2>
        <p className="text-muted-foreground mt-3 max-w-md">
          {elections.length > 0
            ? 'Please select an election from the dropdown in the sidebar to view data.'
            : 'No elections found. Please create an election first to get started.'}
        </p>
        {elections.length > 0 && (
          <div className="mt-6 flex items-center gap-2 text-brand font-medium animate-pulse">
            <ChevronLeftIcon className="h-5 w-5" />
            <span>Select an election from the sidebar</span>
          </div>
        )}
      </div>
    );
  }

  return <Outlet />;
}
