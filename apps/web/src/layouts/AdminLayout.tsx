import { useEffect, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';
import { useSidebarStore } from '../store/sidebar';
import { cn } from '../lib/utils';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { ThemeToggle } from '../components/ThemeToggle';
import { UserMenu } from '../components/layout/UserMenu';
import { MenuIcon } from 'lucide-react';

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL']);

export function AdminLayout() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { fetchBranding } = useTenantStore();
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebarStore();

  // Fetch tenant branding on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchBranding();
    }
  }, [isAuthenticated, fetchBranding]);

  // Double-click on non-interactive space toggles sidebar
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea, label, [role="button"], [contenteditable]')) return;
    if (INTERACTIVE_TAGS.has(target.tagName)) return;
    toggleCollapsed();
  }, [toggleCollapsed]);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />

      <div
        className={cn(
          'transition-[padding] duration-200 ease-in-out',
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
        onDoubleClick={handleDoubleClick}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-md border-b shadow-sm flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
