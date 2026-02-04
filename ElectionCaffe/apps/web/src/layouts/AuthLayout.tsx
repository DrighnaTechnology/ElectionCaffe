import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export function AuthLayout() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Wait for auth state to hydrate from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Election<span className="text-orange-500">Caffe</span>
          </h1>
          <p className="text-gray-600 mt-2">Election Management Platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
