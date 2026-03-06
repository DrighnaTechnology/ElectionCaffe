import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSidebarStore } from '../../store/sidebar';
import { useTenantStore } from '../../store/tenant';
import { aiAPI } from '../../services/api';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { TooltipProvider } from '../ui/tooltip';
import { XIcon } from 'lucide-react';
import {
  LayoutDashboardIcon,
  UsersIcon,
  ShieldIcon,
  SparklesIcon,
  MessageSquareIcon,
  ExternalLinkIcon,
  PaletteIcon,
} from 'lucide-react';

interface AdminNavItem {
  to: string;
  icon: any;
  label: string;
  external?: boolean;
  badge?: 'credits';
}

interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/admin-dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
    ],
  },
  {
    label: 'User Management',
    items: [
      { to: '/admin-dashboard/users', icon: UsersIcon, label: 'Users' },
      { to: '/admin-dashboard/roles', icon: ShieldIcon, label: 'Roles & Access' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/admin-dashboard/credits', icon: SparklesIcon, label: 'AI Credits', badge: 'credits' },
      { to: '/admin-dashboard/messaging', icon: MessageSquareIcon, label: 'Messaging' },
    ],
  },
  {
    label: 'Quick Links',
    items: [
      { to: '/dashboard', icon: ExternalLinkIcon, label: 'Election App', external: true },
      { to: '/ui-theme', icon: PaletteIcon, label: 'UI Theme' },
    ],
  },
];

// Inline style helpers — use CSS variables so UI Theme Studio controls all colours
const sidebarItemStyle = (isActive: boolean) => ({
  color: isActive ? 'hsl(var(--sidebar-foreground-active))' : 'hsl(var(--sidebar-foreground))',
  backgroundColor: isActive ? 'hsl(var(--sidebar-active-bg))' : 'transparent',
});

const sidebarHoverProps = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    if (!el.dataset.active) {
      el.style.backgroundColor = 'hsl(var(--sidebar-hover-bg))';
      el.style.color = 'hsl(var(--sidebar-foreground-active))';
    }
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    if (!el.dataset.active) {
      el.style.backgroundColor = 'transparent';
      el.style.color = 'hsl(var(--sidebar-foreground))';
    }
  },
};

export function AdminSidebar() {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebarStore();
  const { branding } = useTenantStore();
  const creditPercent = useCreditUsedPercent();

  const tenantDisplayName = branding?.displayName || branding?.name || '';

  const closeMobile = () => setMobileOpen(false);

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
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
          {/* Header */}
          <div
            className={cn('flex items-center h-16 px-3 border-b', collapsed ? 'justify-center' : 'justify-start')}
            style={{ borderColor: 'hsl(var(--sidebar-border))' }}
          >
            <NavLink
              to="/admin-dashboard"
              className={cn(
                'flex items-center gap-3 min-w-0 cursor-pointer',
                collapsed && 'justify-center'
              )}
            >
              {(branding?.logoUrl && (branding as any)?.logoPosition !== 'after') ? (
                <img
                  src={branding.logoUrl}
                  alt={tenantDisplayName}
                  className="rounded-lg object-cover flex-shrink-0 h-[4.25rem] w-[4.25rem]"
                />
              ) : (
                <img
                  src="/logo-light.png"
                  alt="ElectionCaffe"
                  className="object-contain flex-shrink-0 rounded-lg h-12 w-12 bg-white p-1"
                />
              )}
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold truncate uppercase" style={{ color: 'hsl(var(--sidebar-foreground-active))' }}>
                    {tenantDisplayName || 'ElectionCaffe'}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
                    Admin Panel
                  </div>
                </div>
              )}
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            {ADMIN_NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.label} className={cn(groupIndex > 0 && 'mt-4')}>
                {/* Group label */}
                {collapsed ? (
                  groupIndex > 0 && (
                    <div className="mx-2 my-2 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }} />
                  )
                ) : (
                  <div
                    className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: 'hsl(var(--sidebar-group-label, var(--sidebar-foreground)))' }}
                  >
                    {group.label}
                  </div>
                )}

                {/* Nav items */}
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <AdminNavItemComponent
                      key={item.to}
                      item={item}
                      collapsed={collapsed}
                      onCloseMobile={closeMobile}
                      creditPercent={item.badge === 'credits' ? creditPercent : null}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
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

// Thin usage bar shown below the AI Credits nav item
function CreditUsageBar({ usedPercent }: { usedPercent: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(usedPercent), 150);
    return () => clearTimeout(timer);
  }, [usedPercent]);

  const getBarColor = () => {
    if (usedPercent < 40) return '#16a34a';
    if (usedPercent < 70) return '#d97706';
    return '#dc2626';
  };

  return (
    <div className="w-full mt-1.5 flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-sm" style={{ backgroundColor: 'rgba(128,128,128,0.25)' }}>
        <div
          className="h-1.5 rounded-sm transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(animated, 100)}%`, backgroundColor: getBarColor() }}
        />
      </div>
      <span className="text-[16px] font-extrabold leading-none flex-shrink-0" style={{ color: getBarColor() }}>
        {Math.round(usedPercent)}%
      </span>
    </div>
  );
}

function useCreditUsedPercent() {
  const { data } = useQuery({
    queryKey: ['admin-ai-credits'],
    queryFn: () => aiAPI.getCredits(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const credits = data?.data?.data;
  if (!credits) return null;
  const total = (credits.totalCredits ?? 0) + (credits.bonusCredits ?? 0);
  if (total === 0) return null;
  const used = credits.usedCredits ?? 0;
  return Math.round((used / total) * 100);
}

function AdminNavItemComponent({
  item,
  collapsed,
  onCloseMobile,
  creditPercent,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  onCloseMobile: () => void;
  creditPercent: number | null;
}) {
  const Icon = item.icon;
  const showBadge = creditPercent !== null;

  // Collapsed mode — icon only with tooltip
  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to={item.to}
              end={item.to === '/admin-dashboard'}
              onClick={onCloseMobile}
              className="block"
            >
              {({ isActive }) => (
                <div
                  className="relative flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200"
                  style={
                    isActive
                      ? {
                          backgroundColor: 'hsl(var(--sidebar-active-bg))',
                          color: 'hsl(var(--sidebar-foreground-active))',
                          boxShadow: '0 4px 12px hsl(var(--brand-primary) / 0.35)',
                        }
                      : { color: 'hsl(var(--sidebar-foreground))' }
                  }
                >
                  <Icon className="h-6 w-6" style={{ strokeWidth: 1.8 }} />
                </div>
              )}
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.label}
            {showBadge && ` (${creditPercent}% used)`}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }

  // Expanded mode — simple nav item
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === '/admin-dashboard'}
        onClick={onCloseMobile}
        className="block"
      >
        {({ isActive }) => (
          <div
            data-active={isActive || undefined}
            className="px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={sidebarItemStyle(isActive)}
            {...(!isActive ? sidebarHoverProps : {})}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-[18px] w-[18px]" style={{ flexShrink: 0 }} />
              <span className="truncate flex-1">{item.label}</span>
            </div>
            {showBadge && <CreditUsageBar usedPercent={creditPercent} />}
          </div>
        )}
      </NavLink>
    </li>
  );
}
