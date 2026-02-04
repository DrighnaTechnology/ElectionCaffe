import { useState } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { cn, getInitials } from '../lib/utils';
import {
  LayoutDashboardIcon,
  BuildingIcon,
  ToggleLeftIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
  ShieldIcon,
  MailIcon,
  KeyIcon,
  BrainIcon,
  SparklesIcon,
  CoinsIcon,
  DatabaseIcon,
  NewspaperIcon,
  ClipboardListIcon,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
  { to: '/tenants', icon: BuildingIcon, label: 'Tenants' },
  { to: '/invitations', icon: MailIcon, label: 'Invitations' },
  { to: '/licenses', icon: KeyIcon, label: 'Licenses' },
  { to: '/features', icon: ToggleLeftIcon, label: 'Feature Flags' },
  { to: '/ec-integration', icon: DatabaseIcon, label: 'EC Integration' },
  { to: '/news', icon: NewspaperIcon, label: 'News/Information' },
  { to: '/actions', icon: ClipboardListIcon, label: 'Actions' },
  { to: '/ai/providers', icon: BrainIcon, label: 'AI Providers' },
  { to: '/ai/features', icon: SparklesIcon, label: 'AI Features' },
  { to: '/ai/credits', icon: CoinsIcon, label: 'AI Credits' },
  { to: '/system', icon: SettingsIcon, label: 'System' },
];

export function DashboardLayout() {
  const { isAuthenticated, admin, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
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
          'fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-6 w-6 text-orange-500" />
            <span className="text-white font-bold">Super Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User menu at bottom */}
        <div className="p-4 border-t border-slate-700">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
                {admin ? getInitials(`${admin.firstName} ${admin.lastName || ''}`) : 'U'}
              </div>
              <span className="flex-1 text-left truncate">
                {admin?.firstName} {admin?.lastName}
              </span>
              <ChevronDownIcon className="h-4 w-4" />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 py-1 bg-slate-800 rounded-md shadow-lg">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b flex items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          {/* Centered Election Caffe Branding */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
            <h1 className="text-xl font-bold">
              Election<span className="text-orange-500">Caffe</span>
            </h1>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-sm text-slate-600">
              {admin?.email}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
