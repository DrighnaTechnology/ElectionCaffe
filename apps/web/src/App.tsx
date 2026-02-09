import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/PageLoader';

// Layouts
import { AuthLayout, DashboardLayout } from './layouts';

// Pages - lazy loaded for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ElectionsPage = lazy(() => import('./pages/ElectionsPage').then(m => ({ default: m.ElectionsPage })));
const ElectionDetailPage = lazy(() => import('./pages/ElectionDetailPage').then(m => ({ default: m.ElectionDetailPage })));
const VotersPage = lazy(() => import('./pages/VotersPage').then(m => ({ default: m.VotersPage })));
const VoterDetailPage = lazy(() => import('./pages/VoterDetailPage').then(m => ({ default: m.VoterDetailPage })));
const PartsPage = lazy(() => import('./pages/PartsPage').then(m => ({ default: m.PartsPage })));
const SectionsPage = lazy(() => import('./pages/SectionsPage').then(m => ({ default: m.SectionsPage })));
const CadresPage = lazy(() => import('./pages/CadresPage').then(m => ({ default: m.CadresPage })));
const FamiliesPage = lazy(() => import('./pages/FamiliesPage').then(m => ({ default: m.FamiliesPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const AIAnalyticsPage = lazy(() => import('./pages/AIAnalyticsPage').then(m => ({ default: m.AIAnalyticsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const DataCaffePage = lazy(() => import('./pages/DataCaffePage').then(m => ({ default: m.DataCaffePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const MasterDataPage = lazy(() => import('./pages/MasterDataPage').then(m => ({ default: m.MasterDataPage })));
const SurveyPage = lazy(() => import('./pages/SurveyPage').then(m => ({ default: m.SurveyPage })));
const PollDayPage = lazy(() => import('./pages/PollDayPage').then(m => ({ default: m.PollDayPage })));
const CampaignPage = lazy(() => import('./pages/CampaignPage').then(m => ({ default: m.CampaignPage })));

// New PRD pages
const PartMapPage = lazy(() => import('./pages/PartMapPage').then(m => ({ default: m.PartMapPage })));
const VulnerabilityPage = lazy(() => import('./pages/VulnerabilityPage').then(m => ({ default: m.VulnerabilityPage })));
const BoothCommitteePage = lazy(() => import('./pages/BoothCommitteePage').then(m => ({ default: m.BoothCommitteePage })));
const BLA2Page = lazy(() => import('./pages/BLA2Page').then(m => ({ default: m.BLA2Page })));
const AddPartPage = lazy(() => import('./pages/AddPartPage').then(m => ({ default: m.AddPartPage })));
const FamilyCaptainPage = lazy(() => import('./pages/FamilyCaptainPage').then(m => ({ default: m.FamilyCaptainPage })));
const VoterSlipPage = lazy(() => import('./pages/VoterSlipPage').then(m => ({ default: m.VoterSlipPage })));
const AppBannerPage = lazy(() => import('./pages/AppBannerPage').then(m => ({ default: m.AppBannerPage })));
const DatabaseSettingsPage = lazy(() => import('./pages/DatabaseSettingsPage').then(m => ({ default: m.DatabaseSettingsPage })));
const AIToolsPage = lazy(() => import('./pages/AIToolsPage').then(m => ({ default: m.AIToolsPage })));
const OrganizationSetupPage = lazy(() => import('./pages/OrganizationSetupPage').then(m => ({ default: m.OrganizationSetupPage })));

// Tenant-specific pages for EC Data, News, Actions, and AI Analysis
const ECDataPage = lazy(() => import('./pages/ECDataPage').then(m => ({ default: m.ECDataPage })));
const TenantNewsPage = lazy(() => import('./pages/TenantNewsPage').then(m => ({ default: m.TenantNewsPage })));
const TenantActionsPage = lazy(() => import('./pages/TenantActionsPage').then(m => ({ default: m.TenantActionsPage })));
const LocalityAnalysisPage = lazy(() => import('./pages/LocalityAnalysisPage').then(m => ({ default: m.LocalityAnalysisPage })));

// Candidate Management Pages
const CandidateBioPage = lazy(() => import('./pages/CandidateBioPage').then(m => ({ default: m.CandidateBioPage })));
const NominationsPage = lazy(() => import('./pages/NominationsPage').then(m => ({ default: m.NominationsPage })));

// Fund & Inventory Management Pages
const FundsPage = lazy(() => import('./pages/FundsPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })));

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  );
}

// Root route handler - redirects based on auth state
function RootRoute() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return <LoadingSpinner />;
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

// Catch-all route handler - redirects based on auth state
function CatchAllRoute() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return <LoadingSpinner />;
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Wait for auth state to hydrate from localStorage
  if (!_hasHydrated) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Root route - check auth state and redirect appropriately */}
          <Route path="/" element={<RootRoute />} />

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Dashboard Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/elections" element={<ElectionsPage />} />
            <Route path="/elections/:id" element={<ElectionDetailPage />} />
            <Route path="/elections/:id/edit" element={<ElectionDetailPage />} />
            <Route path="/voters" element={<VotersPage />} />
            <Route path="/voters/:id" element={<VoterDetailPage />} />
            <Route path="/parts" element={<PartsPage />} />
            <Route path="/parts/add" element={<AddPartPage />} />
            <Route path="/parts/map" element={<PartMapPage />} />
            <Route path="/parts/vulnerability" element={<VulnerabilityPage />} />
            <Route path="/parts/booth-committee" element={<BoothCommitteePage />} />
            <Route path="/parts/bla2" element={<BLA2Page />} />
            <Route path="/sections" element={<SectionsPage />} />
            <Route path="/cadres" element={<CadresPage />} />
            <Route path="/families" element={<FamiliesPage />} />
            <Route path="/families/captains" element={<FamilyCaptainPage />} />
            <Route path="/master-data" element={<MasterDataPage />} />
            <Route path="/surveys" element={<SurveyPage />} />
            <Route path="/campaigns" element={<CampaignPage />} />
            <Route path="/poll-day" element={<PollDayPage />} />
            <Route path="/poll-day/voter-slips" element={<VoterSlipPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/ai-analytics" element={<AIAnalyticsPage />} />
            <Route path="/ai-tools" element={<AIToolsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/datacaffe" element={<DataCaffePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/banners" element={<AppBannerPage />} />
            <Route path="/settings/database" element={<DatabaseSettingsPage />} />
            <Route path="/settings/organization" element={<OrganizationSetupPage />} />

            {/* Tenant-specific pages for EC Data, News, Actions, and AI Analysis */}
            <Route path="/ec-data" element={<ECDataPage />} />
            <Route path="/news" element={<TenantNewsPage />} />
            <Route path="/actions" element={<TenantActionsPage />} />
            <Route path="/locality-analysis" element={<LocalityAnalysisPage />} />

            {/* Candidate Management pages */}
            <Route path="/candidates" element={<CandidateBioPage />} />
            <Route path="/nominations" element={<NominationsPage />} />

            {/* Fund Management pages */}
            <Route path="/funds" element={<FundsPage />} />
            <Route path="/funds/*" element={<FundsPage />} />

            {/* Inventory Management pages */}
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/*" element={<InventoryPage />} />
          </Route>

          {/* 404 - also check auth state */}
          <Route path="*" element={<CatchAllRoute />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
