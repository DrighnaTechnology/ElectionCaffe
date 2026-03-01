import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';
import { organizationAPI, tenantAPI } from './services/api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/PageLoader';
import { getTenantSlug } from './utils/tenant';

// Ordered list of feature keys → their primary route path.
// Used to find the first available route for a user with restricted features.
const FEATURE_ROUTE_ORDER: { featureKey: string; path: string }[] = [
  { featureKey: 'dashboard', path: '/dashboard' },
  { featureKey: 'elections', path: '/elections' },
  { featureKey: 'voters', path: '/voters' },
  { featureKey: 'families', path: '/families' },
  { featureKey: 'cadres', path: '/cadres' },
  { featureKey: 'parts', path: '/parts' },
  { featureKey: 'sections', path: '/sections' },
  { featureKey: 'master-data', path: '/master-data' },
  { featureKey: 'surveys', path: '/surveys' },
  { featureKey: 'campaigns', path: '/campaigns' },
  { featureKey: 'poll-day', path: '/poll-day' },
  { featureKey: 'analytics', path: '/analytics' },
  { featureKey: 'ai-analytics', path: '/ai-analytics' },
  { featureKey: 'ai-tools', path: '/ai-tools' },
  { featureKey: 'reports', path: '/reports' },
  { featureKey: 'datacaffe', path: '/datacaffe' },
];

// Layouts
import { AuthLayout, DashboardLayout, AdminLayout } from './layouts';
import { ElectionGuard } from './components/ElectionGuard';

// Pages - lazy loaded for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ElectionsPage = lazy(() => import('./pages/ElectionsPage').then(m => ({ default: m.ElectionsPage })));
const ElectionDetailPage = lazy(() => import('./pages/ElectionDetailPage').then(m => ({ default: m.ElectionDetailPage })));
const VotersPage = lazy(() => import('./pages/VotersPage').then(m => ({ default: m.VotersPage })));
const VoterDetailPage = lazy(() => import('./pages/VoterDetailPage').then(m => ({ default: m.VoterDetailPage })));
const PartsPage = lazy(() => import('./pages/PartsPage').then(m => ({ default: m.PartsPage })));
const PartDetailPage = lazy(() => import('./pages/PartDetailPage').then(m => ({ default: m.PartDetailPage })));
const SectionsPage = lazy(() => import('./pages/SectionsPage').then(m => ({ default: m.SectionsPage })));
const CadresPage = lazy(() => import('./pages/CadresPage').then(m => ({ default: m.CadresPage })));
const FamiliesPage = lazy(() => import('./pages/FamiliesPage').then(m => ({ default: m.FamiliesPage })));
const FamilyDetailPage = lazy(() => import('./pages/FamilyDetailPage').then(m => ({ default: m.FamilyDetailPage })));
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
// Tenant-specific pages for EC Data, News, Actions, and AI Analysis
const ECDataPage = lazy(() => import('./pages/ECDataPage').then(m => ({ default: m.ECDataPage })));
const TenantNewsPage = lazy(() => import('./pages/TenantNewsPage').then(m => ({ default: m.TenantNewsPage })));
const TenantActionsPage = lazy(() => import('./pages/TenantActionsPage').then(m => ({ default: m.TenantActionsPage })));
const LocalityAnalysisPage = lazy(() => import('./pages/LocalityAnalysisPage').then(m => ({ default: m.LocalityAnalysisPage })));

// UI Theme Studio
const UIThemePage = lazy(() => import('./pages/UIThemePage').then(m => ({ default: m.UIThemePage })));

// Messaging Settings (standalone page)
const MessagingSettingsPage = lazy(() => import('./pages/MessagingSettingsPage').then(m => ({ default: m.MessagingSettingsPage })));

// Admin Dashboard
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage').then(m => ({ default: m.UserDetailPage })));

// Candidate Management Pages
const CandidateBioPage = lazy(() => import('./pages/CandidateBioPage').then(m => ({ default: m.CandidateBioPage })));
const NominationsPage = lazy(() => import('./pages/NominationsPage').then(m => ({ default: m.NominationsPage })));
const BattleCardDetailPage = lazy(() => import('./pages/BattleCardDetailPage').then(m => ({ default: m.BattleCardDetailPage })));

// Fund & Inventory Management Pages
const FundsPage = lazy(() => import('./pages/FundsPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })));

// Public pages (no auth required)
const PublicSurveyPage = lazy(() => import('./pages/PublicSurveyPage').then(m => ({ default: m.PublicSurveyPage })));

// Force reset password (temp password flow)
const ForceResetPasswordPage = lazy(() => import('./pages/ForceResetPasswordPage').then(m => ({ default: m.ForceResetPasswordPage })));

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
    </div>
  );
}

// Root route handler - redirects based on auth state and role
function RootRoute() {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const isFullAdmin = user?.role === 'CENTRAL_ADMIN' && !user?.customRoleId;
  const { route: firstRoute, isLoading: featuresLoading } = useFirstAvailableRoute();

  if (!_hasHydrated) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isFullAdmin) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  // Custom role user — redirect to first available feature route
  if (featuresLoading) {
    return <LoadingSpinner />;
  }

  return <Navigate to={firstRoute} replace />;
}

// Catch-all route handler - redirects based on auth state and role
function CatchAllRoute() {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const isFullAdmin = user?.role === 'CENTRAL_ADMIN' && !user?.customRoleId;
  const { route: firstRoute, isLoading: featuresLoading } = useFirstAvailableRoute();

  if (!_hasHydrated) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isFullAdmin) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (featuresLoading) {
    return <LoadingSpinner />;
  }

  return <Navigate to={firstRoute} replace />;
}

function ProtectedRoute({ children, allowForceReset }: { children: React.ReactNode; allowForceReset?: boolean }) {
  const { isAuthenticated, mustChangePassword, _hasHydrated } = useAuthStore();

  // Wait for auth state to hydrate from localStorage
  if (!_hasHydrated) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user logged in with a temp password, force them to reset before accessing anything else
  if (mustChangePassword && !allowForceReset) {
    return <Navigate to="/force-reset-password" replace />;
  }

  return <>{children}</>;
}

// Finds the first route that the user's custom role has access to
function getFirstAvailableRoute(enabledFeatures: Record<string, boolean>): string {
  for (const entry of FEATURE_ROUTE_ORDER) {
    if (enabledFeatures[entry.featureKey] !== false) {
      return entry.path;
    }
  }
  // Fallback — should never happen if at least one feature is enabled
  return '/elections';
}

// Hook that fetches features and returns the first available route for custom-role users
function useFirstAvailableRoute(): { route: string; isLoading: boolean } {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => organizationAPI.getMyFeatures(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const enabledFeatures: Record<string, boolean> = data?.data?.data?.enabledFeatures || {};
  const route = getFirstAvailableRoute(enabledFeatures);

  return { route, isLoading };
}

// Admin guard — only full admins (no custom role) can access admin dashboard
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { route, isLoading } = useFirstAvailableRoute();

  if (user?.customRoleId) {
    if (isLoading) return <LoadingSpinner />;
    return <Navigate to={route} replace />;
  }
  return <>{children}</>;
}

// Feature-level route guard — blocks access if user's custom role doesn't have the feature enabled
function FeatureGuard({ featureKey, children }: { featureKey: string; children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();

  // Full admin (no custom role) = always allowed
  if (!user?.customRoleId) {
    return <>{children}</>;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => organizationAPI.getMyFeatures(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const enabledFeatures: Record<string, boolean> = data?.data?.data?.enabledFeatures || {};

  if (enabledFeatures[featureKey] === false) {
    const fallback = getFirstAvailableRoute(enabledFeatures);
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

// Validates tenant slug from URL subdomain before rendering the app
function TenantGuard({ children }: { children: React.ReactNode }) {
  const slug = getTenantSlug();
  const [status, setStatus] = useState<'loading' | 'valid' | 'not_found' | 'suspended' | 'error'>('loading');

  useEffect(() => {
    if (!slug) {
      // No subdomain — bare localhost, allow app to render normally
      setStatus('valid');
      return;
    }

    tenantAPI.resolveBySlug(slug)
      .then(() => setStatus('valid'))
      .catch((err: any) => {
        const code = err.response?.data?.error?.code;
        if (code === 'E3001' || err.response?.status === 404) {
          setStatus('not_found');
        } else if (code === 'E3002' || err.response?.status === 403) {
          setStatus('suspended');
        } else {
          setStatus('error');
        }
      });
  }, [slug]);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tenant Not Found</h1>
          <p className="text-gray-500 mb-6">
            The tenant <span className="font-mono font-semibold text-gray-700">{slug}</span> does not exist or has been removed.
          </p>
          <p className="text-sm text-gray-400">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  if (status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-5xl mb-4">&#128683;</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-gray-500">
            This tenant account has been suspended. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500">Unable to connect. Please try again later.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <TenantGuard>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Root route - check auth state and redirect appropriately */}
          <Route path="/" element={<RootRoute />} />

          {/* Public survey form — no auth required */}
          <Route path="/s/:tenantSlug/:surveyId" element={<PublicSurveyPage />} />

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Force reset password — outside AuthLayout to avoid redirect loop */}
          <Route path="/force-reset-password" element={
            <ProtectedRoute allowForceReset>
              <ForceResetPasswordPage />
            </ProtectedRoute>
          } />

          {/* Admin Dashboard — standalone layout, full admin only (no custom role) */}
          <Route
            element={
              <ProtectedRoute>
                <AdminGuard>
                  <AdminLayout />
                </AdminGuard>
              </ProtectedRoute>
            }
          >
            <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin-dashboard/users/:userId" element={<UserDetailPage />} />
          </Route>

          {/* Protected Dashboard Routes — full app with sidebar */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Non-election-dependent routes */}
            <Route path="/elections" element={<FeatureGuard featureKey="elections"><ElectionsPage /></FeatureGuard>} />
            <Route path="/elections/:id" element={<FeatureGuard featureKey="elections"><ElectionDetailPage /></FeatureGuard>} />
            <Route path="/elections/:id/edit" element={<FeatureGuard featureKey="elections"><ElectionDetailPage /></FeatureGuard>} />
            <Route path="/settings" element={<FeatureGuard featureKey="settings"><SettingsPage /></FeatureGuard>} />
            <Route path="/settings/banners" element={<FeatureGuard featureKey="settings"><AppBannerPage /></FeatureGuard>} />
            <Route path="/settings/database" element={<FeatureGuard featureKey="settings"><DatabaseSettingsPage /></FeatureGuard>} />
            <Route path="/ec-data" element={<ECDataPage />} />
            <Route path="/news" element={<TenantNewsPage />} />
            <Route path="/actions" element={<TenantActionsPage />} />
            <Route path="/ui-theme" element={<AdminGuard><UIThemePage /></AdminGuard>} />
            <Route path="/messaging-settings" element={<AdminGuard><MessagingSettingsPage /></AdminGuard>} />

            {/* Election-dependent routes - require an election to be selected */}
            <Route element={<ElectionGuard />}>
              <Route path="/dashboard" element={<FeatureGuard featureKey="dashboard"><DashboardPage /></FeatureGuard>} />
              <Route path="/voters" element={<FeatureGuard featureKey="voters"><VotersPage /></FeatureGuard>} />
              <Route path="/voters/:id" element={<FeatureGuard featureKey="voters"><VoterDetailPage /></FeatureGuard>} />
              <Route path="/parts" element={<FeatureGuard featureKey="parts"><PartsPage /></FeatureGuard>} />
              <Route path="/parts/add" element={<FeatureGuard featureKey="parts"><AddPartPage /></FeatureGuard>} />
              <Route path="/parts/map" element={<FeatureGuard featureKey="parts"><PartMapPage /></FeatureGuard>} />
              <Route path="/parts/vulnerability" element={<FeatureGuard featureKey="parts"><VulnerabilityPage /></FeatureGuard>} />
              <Route path="/parts/booth-committee" element={<FeatureGuard featureKey="parts"><BoothCommitteePage /></FeatureGuard>} />
              <Route path="/parts/bla2" element={<FeatureGuard featureKey="parts"><BLA2Page /></FeatureGuard>} />
              <Route path="/parts/:id" element={<FeatureGuard featureKey="parts"><PartDetailPage /></FeatureGuard>} />
              <Route path="/sections" element={<FeatureGuard featureKey="sections"><SectionsPage /></FeatureGuard>} />
              <Route path="/cadres" element={<FeatureGuard featureKey="cadres"><CadresPage /></FeatureGuard>} />
              <Route path="/families" element={<FeatureGuard featureKey="families"><FamiliesPage /></FeatureGuard>} />
              <Route path="/families/captains" element={<FeatureGuard featureKey="families"><FamilyCaptainPage /></FeatureGuard>} />
              <Route path="/families/:id" element={<FeatureGuard featureKey="families"><FamilyDetailPage /></FeatureGuard>} />
              <Route path="/master-data" element={<FeatureGuard featureKey="master-data"><MasterDataPage /></FeatureGuard>} />
              <Route path="/surveys" element={<FeatureGuard featureKey="surveys"><SurveyPage /></FeatureGuard>} />
              <Route path="/campaigns" element={<FeatureGuard featureKey="campaigns"><CampaignPage /></FeatureGuard>} />
              <Route path="/poll-day" element={<FeatureGuard featureKey="poll-day"><PollDayPage /></FeatureGuard>} />
              <Route path="/poll-day/voter-slips" element={<FeatureGuard featureKey="poll-day"><VoterSlipPage /></FeatureGuard>} />
              <Route path="/analytics" element={<FeatureGuard featureKey="analytics"><AnalyticsPage /></FeatureGuard>} />
              <Route path="/ai-analytics" element={<FeatureGuard featureKey="ai-analytics"><AIAnalyticsPage /></FeatureGuard>} />
              <Route path="/ai-tools" element={<FeatureGuard featureKey="ai-tools"><AIToolsPage /></FeatureGuard>} />
              <Route path="/reports" element={<FeatureGuard featureKey="reports"><ReportsPage /></FeatureGuard>} />
              <Route path="/datacaffe" element={<FeatureGuard featureKey="datacaffe"><DataCaffePage /></FeatureGuard>} />
              <Route path="/locality-analysis" element={<LocalityAnalysisPage />} />
              <Route path="/candidates" element={<CandidateBioPage />} />
              <Route path="/nominations" element={<NominationsPage />} />
              <Route path="/battle-cards/:candidateId/:bcId" element={<BattleCardDetailPage />} />
              <Route path="/funds" element={<FundsPage />} />
              <Route path="/funds/*" element={<FundsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/*" element={<InventoryPage />} />
            </Route>
          </Route>

          {/* 404 - also check auth state */}
          <Route path="*" element={<CatchAllRoute />} />
        </Routes>
      </Suspense>
      </TenantGuard>
    </ErrorBoundary>
  );
}

export default App;
