import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TenantsPage } from './pages/TenantsPage';
import { TenantDetailPage } from './pages/TenantDetailPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { SystemPage } from './pages/SystemPage';
import { InvitationsPage } from './pages/InvitationsPage';
import { LicensesPage } from './pages/LicensesPage';
import { AIProvidersPage } from './pages/AIProvidersPage';
import { AIFeaturesPage } from './pages/AIFeaturesPage';
import { AICreditsPage } from './pages/AICreditsPage';
import { ECIntegrationPage } from './pages/ECIntegrationPage';
import { NewsPage } from './pages/NewsPage';
import { ActionsPage } from './pages/ActionsPage';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
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
  );
}

export default App;
