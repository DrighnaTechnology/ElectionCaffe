import { useEffect, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';
import { useSidebarStore } from '../store/sidebar';
import { cn } from '../lib/utils';
import { Sidebar, Header } from '../components/layout';
import { CaffeAIWidget } from '../components/CaffeAIWidget';

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL']);

export function DashboardLayout() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { fetchBranding } = useTenantStore();
  const { collapsed, toggleCollapsed } = useSidebarStore();

  // Fetch tenant branding on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchBranding();
    }
  }, [isAuthenticated, fetchBranding]);

  // Double-click on non-interactive space toggles sidebar
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Skip if clicked on interactive elements or inside them
    if (target.closest('a, button, input, select, textarea, label, [role="button"], [contenteditable]')) return;
    if (INTERACTIVE_TAGS.has(target.tagName)) return;
    toggleCollapsed();
  }, [toggleCollapsed]);

  // Wait for auth state to hydrate from localStorage
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
      <Sidebar />

      <div
        className={cn(
          'transition-[padding] duration-200 ease-in-out',
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
        onDoubleClick={handleDoubleClick}
      >
        <Header />

        <main className="p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>

      <CaffeAIWidget />
    </div>
  );
}
