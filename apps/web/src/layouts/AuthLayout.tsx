import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';

export function AuthLayout() {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const { branding } = useTenantStore();

  // Wait for auth state to hydrate from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  if (isAuthenticated) {
    const isAdmin = user?.role === 'CENTRAL_ADMIN';
    return <Navigate to={isAdmin ? '/admin-dashboard' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-brand-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <img
            src={branding?.logoUrl || '/logo-light.png'}
            alt={branding?.displayName || 'ElectionCaffe'}
            className="h-28 w-28 mx-auto mb-4 rounded-xl object-contain"
          />
          <h1 className="text-3xl font-bold text-foreground">
            Election<span className="text-brand">Caffe</span>
          </h1>
          <p className="text-muted-foreground mt-2">Election Management Platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
