import { useState, useEffect } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useElectionStore } from '../store/election';
import { useTenantStore } from '../store/tenant';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  LogOutIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
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
  BuildingIcon,
  NewspaperIcon,
  ListTodoIcon,
  GlobeIcon,
  FileCheck2Icon,
  ContactIcon,
  WalletIcon,
  PackageIcon,
} from 'lucide-react';
import { getInitials } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { electionsAPI } from '../services/api';
import { useFeatures } from '../hooks/useFeature';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  subItems?: { to: string; icon: any; label: string }[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
  { to: '/elections', icon: VoteIcon, label: 'Elections' },
  {
    to: '/candidates',
    icon: ContactIcon,
    label: 'Candidates',
    subItems: [
      { to: '/nominations', icon: FileCheck2Icon, label: 'Nominations' },
    ],
  },
  { to: '/master-data', icon: FolderCogIcon, label: 'Master Data' },
  { to: '/voters', icon: UsersIcon, label: 'Voters' },
  {
    to: '/parts',
    icon: MapPinIcon,
    label: 'Parts/Booths',
    subItems: [
      { to: '/parts/add', icon: PlusIcon, label: 'Add Part' },
      { to: '/parts/map', icon: MapIcon, label: 'Part Map' },
      { to: '/parts/vulnerability', icon: ShieldAlertIcon, label: 'Vulnerability' },
      { to: '/parts/booth-committee', icon: Users2Icon, label: 'Booth Committee' },
      { to: '/parts/bla2', icon: UserIcon, label: 'BLA-2' },
    ],
  },
  { to: '/sections', icon: LayoutGridIcon, label: 'Sections' },
  { to: '/cadres', icon: UserCogIcon, label: 'Cadres' },
  {
    to: '/families',
    icon: Users2Icon,
    label: 'Families',
    subItems: [
      { to: '/families/captains', icon: CrownIcon, label: 'Family Captains' },
    ],
  },
  { to: '/surveys', icon: ClipboardListIcon, label: 'Surveys' },
  { to: '/campaigns', icon: MegaphoneIcon, label: 'Campaigns' },
  {
    to: '/poll-day',
    icon: CalendarCheckIcon,
    label: 'Poll Day',
    subItems: [
      { to: '/poll-day/voter-slips', icon: PrinterIcon, label: 'Voter Slips' },
    ],
  },
  { to: '/analytics', icon: BarChart3Icon, label: 'Analytics' },
  { to: '/ai-analytics', icon: BrainCircuitIcon, label: 'AI Analytics' },
  { to: '/ai-tools', icon: SparklesIcon, label: 'AI Tools' },
  { to: '/reports', icon: FileTextIcon, label: 'Reports' },
  { to: '/datacaffe', icon: DatabaseIcon, label: 'DataCaffe' },
  { to: '/ec-data', icon: GlobeIcon, label: 'EC Data' },
  { to: '/news', icon: NewspaperIcon, label: 'News & Info' },
  { to: '/actions', icon: ListTodoIcon, label: 'Actions' },
  { to: '/locality-analysis', icon: MapPinIcon, label: 'Locality Analysis' },
  {
    to: '/settings',
    icon: SettingsIcon,
    label: 'Settings',
    subItems: [
      { to: '/settings/banners', icon: ImageIcon, label: 'App Banners' },
      { to: '/settings/organization', icon: BuildingIcon, label: 'Organization Setup' },
    ],
  },
];

export function DashboardLayout() {
  const { isAuthenticated, user, logout, _hasHydrated } = useAuthStore();
  const { selectedElectionId, setSelectedElection } = useElectionStore();
  const { branding, fetchBranding, clearBranding } = useTenantStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Check if Fund and Inventory features are enabled
  const { enabledFeatures } = useFeatures(['fund_management', 'inventory_management']);

  // Fetch tenant branding on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchBranding();
    }
  }, [isAuthenticated, fetchBranding]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedItems(newExpanded);
  };

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

  // Create dynamic navigation items based on enabled features
  const dynamicNavItems = [
    ...navItems,
    // Add Fund Management if enabled
    ...(enabledFeatures.fund_management ? [{
      to: '/funds',
      icon: WalletIcon,
      label: 'Funds',
    }] : []),
    // Add Inventory Management if enabled
    ...(enabledFeatures.inventory_management ? [{
      to: '/inventory',
      icon: PackageIcon,
      label: 'Inventory',
    }] : []),
  ];

  // Wait for auth state to hydrate from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    clearBranding();
    navigate('/login');
  };

  // Get the display name for the header (use displayName if set, otherwise fall back to name)
  const tenantDisplayName = branding?.displayName || branding?.name || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Logo position: 'before' (default) or 'after' display name */}
            {branding?.logoUrl && (branding?.logoPosition !== 'after') && (
              <img
                src={branding.logoUrl}
                alt={tenantDisplayName}
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
            )}
            {tenantDisplayName && (
              <span className="text-sm font-semibold text-gray-800 truncate">
                {tenantDisplayName}
              </span>
            )}
            {branding?.logoUrl && branding?.logoPosition === 'after' && (
              <img
                src={branding.logoUrl}
                alt={tenantDisplayName}
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 flex-shrink-0"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Election Selector */}
        <div className="p-4 border-b">
          <Select
            value={selectedElectionId || ''}
            onValueChange={(value) => setSelectedElection(value)}
          >
            <SelectTrigger className="w-full">
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {dynamicNavItems.map((item) => (
              <li key={item.to}>
                {item.subItems ? (
                  <div>
                    <div className="flex items-center">
                      <NavLink
                        to={item.to}
                        end
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex-1 flex items-center gap-3 px-3 py-2 rounded-l-md text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-orange-50 text-orange-600'
                              : 'text-gray-700 hover:bg-gray-100'
                          )
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </NavLink>
                      <button
                        onClick={() => toggleExpanded(item.to)}
                        className="p-2 rounded-r-md text-gray-500 hover:bg-gray-100"
                      >
                        <ChevronDownIcon
                          className={cn(
                            'h-4 w-4 transition-transform',
                            expandedItems.has(item.to) && 'rotate-180'
                          )}
                        />
                      </button>
                    </div>
                    {expandedItems.has(item.to) && (
                      <ul className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.to}>
                            <NavLink
                              to={subItem.to}
                              onClick={() => setSidebarOpen(false)}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
                                  isActive
                                    ? 'bg-orange-50 text-orange-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                                )
                              }
                            >
                              <subItem.icon className="h-4 w-4" />
                              {subItem.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Centered Election Caffe Branding */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
            <h1 className="text-xl font-bold">
              Election<span className="text-orange-500">Caffe</span>
            </h1>
          </div>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                    {user ? getInitials(`${user.firstName} ${user.lastName || ''}`) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.firstName} {user?.lastName}</span>
                  <span className="text-xs text-muted-foreground">{user?.mobile}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOutIcon className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
