import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSidebarStore } from '../../store/sidebar';
import { useFeatures } from '../../hooks/useFeature';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ChevronDownIcon } from 'lucide-react';
import {
  LayoutDashboardIcon,
  VoteIcon,
  UsersIcon,
  MapPinIcon,
  UserCogIcon,
  Users2Icon,
  BarChart3Icon,
  BrainCircuitIcon,
  FileTextIcon,
  DatabaseIcon,
  SettingsIcon,
  LayoutGridIcon,
  ClipboardListIcon,
  MegaphoneIcon,
  CalendarCheckIcon,
  FolderCogIcon,
  MapIcon,
  ShieldAlertIcon,
  UserIcon,
  CrownIcon,
  ImageIcon,
  PrinterIcon,
  PlusIcon,
  SparklesIcon,
  NewspaperIcon,
  ListTodoIcon,
  GlobeIcon,
  FileCheck2Icon,
  ContactIcon,
  WalletIcon,
  PackageIcon,
  PaletteIcon,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  featureKey?: string;
  subItems?: { to: string; icon: any; label: string }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard', featureKey: 'dashboard' },
      { to: '/elections', icon: VoteIcon, label: 'Elections', featureKey: 'elections' },
    ],
  },
  {
    label: 'Voter Management',
    items: [
      { to: '/voters', icon: UsersIcon, label: 'Voters', featureKey: 'voters' },
      {
        to: '/families',
        icon: Users2Icon,
        label: 'Families',
        featureKey: 'families',
        subItems: [
          { to: '/families/captains', icon: CrownIcon, label: 'Family Captains' },
        ],
      },
      { to: '/cadres', icon: UserCogIcon, label: 'Cadres', featureKey: 'cadres' },
    ],
  },
  {
    label: 'Constituency',
    items: [
      {
        to: '/parts',
        icon: MapPinIcon,
        label: 'Parts/Booths',
        featureKey: 'parts',
        subItems: [
          { to: '/parts/add', icon: PlusIcon, label: 'Add Part' },
          { to: '/parts/map', icon: MapIcon, label: 'Part Map' },
          { to: '/parts/vulnerability', icon: ShieldAlertIcon, label: 'Vulnerability' },
          { to: '/parts/booth-committee', icon: Users2Icon, label: 'Booth Committee' },
          { to: '/parts/bla2', icon: UserIcon, label: 'BLA-2' },
        ],
      },
      { to: '/sections', icon: LayoutGridIcon, label: 'Sections', featureKey: 'sections' },
      { to: '/master-data', icon: FolderCogIcon, label: 'Master Data', featureKey: 'master-data' },
    ],
  },
  {
    label: 'Candidates',
    items: [
      {
        to: '/candidates',
        icon: ContactIcon,
        label: 'Candidates',
        subItems: [
          { to: '/nominations', icon: FileCheck2Icon, label: 'Nominations' },
        ],
      },
    ],
  },
  {
    label: 'Campaign & Outreach',
    items: [
      { to: '/surveys', icon: ClipboardListIcon, label: 'Surveys', featureKey: 'surveys' },
      { to: '/campaigns', icon: MegaphoneIcon, label: 'Campaigns', featureKey: 'campaigns' },
      {
        to: '/poll-day',
        icon: CalendarCheckIcon,
        label: 'Poll Day',
        featureKey: 'poll-day',
        subItems: [
          { to: '/poll-day/voter-slips', icon: PrinterIcon, label: 'Voter Slips' },
        ],
      },
    ],
  },
  {
    label: 'Analytics & AI',
    items: [
      { to: '/analytics', icon: BarChart3Icon, label: 'Analytics', featureKey: 'analytics' },
      { to: '/ai-analytics', icon: BrainCircuitIcon, label: 'AI Analytics', featureKey: 'ai-analytics' },
      { to: '/ai-tools', icon: SparklesIcon, label: 'AI Tools', featureKey: 'ai-tools' },
      { to: '/locality-analysis', icon: MapPinIcon, label: 'Locality Analysis' },
    ],
  },
  {
    label: 'Data & Reports',
    items: [
      { to: '/reports', icon: FileTextIcon, label: 'Reports', featureKey: 'reports' },
      { to: '/datacaffe', icon: DatabaseIcon, label: 'DataCaffe', featureKey: 'datacaffe' },
      { to: '/ec-data', icon: GlobeIcon, label: 'EC Data' },
      { to: '/news', icon: NewspaperIcon, label: 'News & Info' },
      { to: '/actions', icon: ListTodoIcon, label: 'Actions' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/funds', icon: WalletIcon, label: 'Funds' },
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

// All feature keys used in NAV_GROUPS for role-based filtering
const ALL_FEATURE_KEYS = [
  'dashboard', 'elections', 'voters', 'families', 'cadres',
  'parts', 'sections', 'master-data', 'surveys', 'campaigns',
  'poll-day', 'analytics', 'ai-analytics', 'ai-tools',
  'reports', 'datacaffe', 'settings', 'inventory_management',
];

export function SidebarNav() {
  const { collapsed, setMobileOpen } = useSidebarStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { enabledFeatures } = useFeatures(ALL_FEATURE_KEYS);

  // Build conditional items (inventory still behind feature flag for now)
  const conditionalItems: NavItem[] = [];
  if (enabledFeatures.inventory_management) {
    conditionalItems.push({ to: '/inventory', icon: PackageIcon, label: 'Inventory' });
  }

  const baseGroups = conditionalItems.length > 0
    ? [...NAV_GROUPS.slice(0, -1), { label: 'More', items: conditionalItems }, NAV_GROUPS[NAV_GROUPS.length - 1]]
    : NAV_GROUPS;

  // Filter nav items based on user's feature access (custom role)
  const allGroups = baseGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.featureKey) return true; // No feature key = always visible
        return enabledFeatures[item.featureKey] !== false;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedItems(newExpanded);
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="flex-1 overflow-y-auto py-2 px-2">
      {allGroups.map((group, groupIndex) => (
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
              <NavItemComponent
                key={item.to}
                item={item}
                collapsed={collapsed}
                expanded={expandedItems.has(item.to)}
                onToggleExpand={() => toggleExpanded(item.to)}
                onCloseMobile={closeMobile}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavItemComponent({
  item,
  collapsed,
  expanded,
  onToggleExpand,
  onCloseMobile,
}: {
  item: NavItem;
  collapsed: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onCloseMobile: () => void;
}) {
  const Icon = item.icon;

  // Collapsed mode — icon only with tooltip
  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to={item.to}
              end={!item.subItems}
              onClick={onCloseMobile}
              className="block"
            >
              {({ isActive }) => (
                <div
                  className="flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200"
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
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  // Expanded mode with sub-items
  if (item.subItems) {
    return (
      <li>
        <NavLink
          to={item.to}
          end
          onClick={onCloseMobile}
          className="block"
        >
          {({ isActive }) => (
            <div
              data-active={isActive || undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={sidebarItemStyle(isActive)}
              {...(!isActive ? sidebarHoverProps : {})}
            >
              <Icon className="h-[18px] w-[18px]" style={{ flexShrink: 0 }} />
              <span className="flex-1 truncate">{item.label}</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleExpand(); }}
                className="ml-auto p-0.5 rounded"
              >
                <ChevronDownIcon
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    expanded && 'rotate-180'
                  )}
                />
              </button>
            </div>
          )}
        </NavLink>

        {/* Sub-items with animation */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <ul
            className="ml-5 mt-1 space-y-0.5 border-l-2 pl-3"
            style={{ borderColor: 'hsl(var(--sidebar-border))' }}
          >
            {item.subItems.map((subItem) => (
              <li key={subItem.to}>
                <NavLink
                  to={subItem.to}
                  onClick={onCloseMobile}
                  className="block"
                >
                  {({ isActive }) => (
                    <div
                      data-active={isActive || undefined}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-all duration-200"
                      style={sidebarItemStyle(isActive)}
                      {...(!isActive ? sidebarHoverProps : {})}
                    >
                      <subItem.icon className="h-[15px] w-[15px]" style={{ flexShrink: 0 }} />
                      <span className="truncate">{subItem.label}</span>
                    </div>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </li>
    );
  }

  // Simple nav item
  return (
    <li>
      <NavLink
        to={item.to}
        onClick={onCloseMobile}
        className="block"
      >
        {({ isActive }) => (
          <div
            data-active={isActive || undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={sidebarItemStyle(isActive)}
            {...(!isActive ? sidebarHoverProps : {})}
          >
            <Icon className="h-[18px] w-[18px]" style={{ flexShrink: 0 }} />
            <span className="truncate">{item.label}</span>
          </div>
        )}
      </NavLink>
    </li>
  );
}
