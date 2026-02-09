import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/PageLoader';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages - lazy loaded for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TenantsPage = lazy(() => import('./pages/TenantsPage').then(m => ({ default: m.TenantsPage })));
const TenantDetailPage = lazy(() => import('./pages/TenantDetailPage').then(m => ({ default: m.TenantDetailPage })));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const SystemPage = lazy(() => import('./pages/SystemPage').then(m => ({ default: m.SystemPage })));
const InvitationsPage = lazy(() => import('./pages/InvitationsPage').then(m => ({ default: m.InvitationsPage })));
const LicensesPage = lazy(() => import('./pages/LicensesPage').then(m => ({ default: m.LicensesPage })));
const AIProvidersPage = lazy(() => import('./pages/AIProvidersPage').then(m => ({ default: m.AIProvidersPage })));
const AIFeaturesPage = lazy(() => import('./pages/AIFeaturesPage').then(m => ({ default: m.AIFeaturesPage })));
const AICreditsPage = lazy(() => import('./pages/AICreditsPage').then(m => ({ default: m.AICreditsPage })));
const ECIntegrationPage = lazy(() => import('./pages/ECIntegrationPage').then(m => ({ default: m.ECIntegrationPage })));
const NewsPage = lazy(() => import('./pages/NewsPage').then(m => ({ default: m.NewsPage })));
const ActionsPage = lazy(() => import('./pages/ActionsPage').then(m => ({ default: m.ActionsPage })));

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/tenants/:id" element={<TenantDetailPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/invitations" element={<InvitationsPage />} />
            <Route path="/licenses" element={<LicensesPage />} />
            <Route path="/ec-integration" element={<ECIntegrationPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/actions" element={<ActionsPage />} />
            <Route path="/ai/providers" element={<AIProvidersPage />} />
            <Route path="/ai/features" element={<AIFeaturesPage />} />
            <Route path="/ai/credits" element={<AICreditsPage />} />
            <Route path="/system" element={<SystemPage />} />
          </Route>

          {/* Default redirect */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
