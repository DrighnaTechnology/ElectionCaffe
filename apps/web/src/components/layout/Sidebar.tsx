import { useSidebarStore } from '../../store/sidebar';
import { cn } from '../../lib/utils';
import { XIcon } from 'lucide-react';
import { SidebarHeader } from './SidebarHeader';
import { ElectionSelector } from './ElectionSelector';
import { SidebarNav } from './SidebarNav';
import { TooltipProvider } from '../ui/tooltip';

export function Sidebar() {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — always uses CSS variable colours set by UI theme store */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full transform transition-all duration-200 ease-in-out lg:translate-x-0 flex flex-col overflow-hidden',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          backgroundColor: 'hsl(var(--sidebar-bg))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
        }}
      >
        {/* Brand accent strip at top */}
        <div className="h-1 w-full bg-gradient-to-r from-brand via-brand/80 to-brand/40 flex-shrink-0" />

        <div className="relative flex flex-col flex-1 min-h-0">
          <SidebarHeader />
          <ElectionSelector />
          <SidebarNav />
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-5 right-3 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </aside>
    </TooltipProvider>
  );
}
