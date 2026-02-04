import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Election<span className="text-orange-500">Caffe</span>
          </h1>
          <p className="text-slate-400 mt-2">Super Admin Portal</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
