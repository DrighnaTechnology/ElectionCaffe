import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';
import { ThemeToggle } from '../components/ThemeToggle';
import { UserMenu } from '../components/layout/UserMenu';

export function AdminLayout() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { branding } = useTenantStore();

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
      {/* Minimal header */}
      <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-md border-b shadow-sm flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img
            src={branding?.logoUrl || '/logo-light.png'}
            alt={branding?.displayName || 'ElectionCaffe'}
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="text-lg font-bold">
            {branding?.displayName || 'ElectionCaffe'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
