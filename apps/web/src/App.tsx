import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';

// Layouts
import { AuthLayout, DashboardLayout } from './layouts';

// Pages
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ElectionsPage,
  ElectionDetailPage,
  VotersPage,
  VoterDetailPage,
  PartsPage,
  SectionsPage,
  CadresPage,
  FamiliesPage,
  AnalyticsPage,
  AIAnalyticsPage,
  ReportsPage,
  DataCaffePage,
  SettingsPage,
  MasterDataPage,
  SurveyPage,
  PollDayPage,
  CampaignPage,
  // New PRD pages
  PartMapPage,
  VulnerabilityPage,
  BoothCommitteePage,
  BLA2Page,
  AddPartPage,
  FamilyCaptainPage,
  VoterSlipPage,
  AppBannerPage,
  DatabaseSettingsPage,
  AIToolsPage,
  OrganizationSetupPage,
  // Tenant-specific pages for EC Data, News, Actions, and AI Analysis
  ECDataPage,
  TenantNewsPage,
  TenantActionsPage,
  LocalityAnalysisPage,
  // Candidate Management Pages
  CandidateBioPage,
  NominationsPage,
  // Fund & Inventory Management Pages
  FundsPage,
  InventoryPage,
} from './pages';

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
  );
}

export default App;
