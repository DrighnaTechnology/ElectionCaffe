import axios from 'axios';
import { useAuthStore } from '../store/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, logout } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          useAuthStore.setState({ accessToken });

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          logout();
          window.location.href = '/login';
        }
      } else {
        logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (identifier: string, password: string, tenantSlug?: string) => {
    // Check if identifier is an email or mobile number
    const isEmail = identifier.includes('@');
    const payload = {
      ...(isEmail ? { email: identifier } : { mobile: identifier }),
      password,
      tenantSlug,
    };
    console.log('📤 [API] Sending login request:', { payload: { ...payload, password: '***' } });
    return api.post('/auth/login', payload);
  },

  register: (data: { firstName: string; lastName?: string; mobile: string; email?: string; password: string }) =>
    api.post('/auth/register', data),

  logout: (refreshToken?: string) =>
    api.post('/auth/logout', { refreshToken }),

  getProfile: () => api.get('/auth/me'),

  updateProfile: (data: { firstName?: string; lastName?: string; email?: string }) =>
    api.put('/auth/me', data),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword, confirmPassword }),

  forgotPassword: (mobile: string) =>
    api.post('/auth/forgot-password', { mobile }),

  resetPassword: (resetToken: string, newPassword: string) =>
    api.post('/auth/reset-password', { resetToken, newPassword }),
};

// Elections API
export const electionsAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/elections', { params }),

  getById: (id: string) => api.get(`/elections/${id}`),

  create: (data: any) => api.post('/elections', data),

  update: (id: string, data: any) => api.put(`/elections/${id}`, data),

  delete: (id: string) => api.delete(`/elections/${id}`),

  lock: (id: string) => api.post(`/elections/${id}/lock`),

  unlock: (id: string) => api.post(`/elections/${id}/unlock`),

  getStats: (id: string) => api.get(`/elections/${id}/stats`),
};

// Candidates API
export const candidatesAPI = {
  // CRUD operations
  getAll: (electionId: string, params?: { page?: number; limit?: number; search?: string; isOurCandidate?: boolean; nominationStatus?: string }) =>
    api.get('/candidates', { params: { electionId, ...params } }),

  getById: (id: string) => api.get(`/candidates/${id}`),

  create: (electionId: string, data: any) =>
    api.post('/candidates', data, { params: { electionId } }),

  update: (id: string, data: any) => api.put(`/candidates/${id}`, data),

  delete: (id: string) => api.delete(`/candidates/${id}`),

  // Stats
  getStats: (id: string) => api.get(`/candidates/${id}/stats`),

  // Documents
  getDocuments: (id: string) => api.get(`/candidates/${id}/documents`),

  addDocument: (id: string, data: {
    documentName: string;
    documentType: string;
    storageProvider: string;
    fileUrl: string;
    fileId?: string;
    folderId?: string;
    description?: string;
  }) => api.post(`/candidates/${id}/documents`, data),

  deleteDocument: (id: string, docId: string) =>
    api.delete(`/candidates/${id}/documents/${docId}`),

  // Social Media
  getSocialMedia: (id: string) => api.get(`/candidates/${id}/social-media`),

  addSocialMedia: (id: string, data: {
    platform: string;
    profileUrl: string;
    username?: string;
    followers?: number;
    following?: number;
    posts?: number;
    engagementRate?: number;
  }) => api.post(`/candidates/${id}/social-media`, data),

  updateSocialMedia: (id: string, smId: string, data: {
    followers?: number;
    following?: number;
    posts?: number;
    engagementRate?: number;
  }) => api.put(`/candidates/${id}/social-media/${smId}`, data),

  deleteSocialMedia: (id: string, smId: string) =>
    api.delete(`/candidates/${id}/social-media/${smId}`),

  // Battle Cards
  getBattleCards: (id: string) => api.get(`/candidates/${id}/battle-cards`),

  createBattleCard: (id: string, data: {
    opponentId: string;
    title: string;
    ourStrengths?: string[];
    opponentWeaknesses?: string[];
    keyIssues?: string[];
    talkingPoints?: string[];
  }) => api.post(`/candidates/${id}/battle-cards`, data),

  updateBattleCard: (id: string, bcId: string, data: {
    title?: string;
    ourStrengths?: string[];
    opponentWeaknesses?: string[];
    keyIssues?: string[];
    talkingPoints?: string[];
  }) => api.put(`/candidates/${id}/battle-cards/${bcId}`, data),

  deleteBattleCard: (id: string, bcId: string) =>
    api.delete(`/candidates/${id}/battle-cards/${bcId}`),
};

// Parts API
export const partsAPI = {
  getAll: (electionId: string, params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/parts', { params: { electionId, ...params } }),

  getForMap: (electionId: string) =>
    api.get('/parts/map', { params: { electionId } }),

  getById: (id: string) => api.get(`/parts/${id}`),

  create: (electionId: string, data: any) =>
    api.post('/parts', data, { params: { electionId } }),

  bulkCreate: (electionId: string, parts: any[]) =>
    api.post('/parts/bulk', { parts }, { params: { electionId } }),

  update: (id: string, data: any) => api.put(`/parts/${id}`, data),

  delete: (id: string) => api.delete(`/parts/${id}`),

  updateVulnerability: (id: string, vulnerability: string, notes?: string) =>
    api.put(`/parts/${id}/vulnerability`, { vulnerability, vulnerabilityNotes: notes }),

  // BLA-2 (Booth Level Agent) methods
  assignBLA2: (partId: string, cadreId: string, data?: any) =>
    api.post(`/parts/${partId}/bla2`, { cadreId, ...data }),

  updateBLA2: (partId: string, data: any) =>
    api.put(`/parts/${partId}/bla2`, data),

  removeBLA2: (partId: string) =>
    api.delete(`/parts/${partId}/bla2`),

  // Booth Committee methods
  getCommittee: (partId: string) =>
    api.get(`/parts/${partId}/committee`),

  addCommitteeMember: (partId: string, cadreId: string, role: string) =>
    api.post(`/parts/${partId}/committee`, { cadreId, role }),

  removeCommitteeMember: (partId: string, cadreId: string) =>
    api.delete(`/parts/${partId}/committee/${cadreId}`),
};

// Voters API
export const votersAPI = {
  getAll: (electionId: string, params?: { page?: number; limit?: number; search?: string; partId?: string; gender?: string }) =>
    api.get('/voters', { params: { electionId, ...params } }),

  getById: (id: string) => api.get(`/voters/${id}`),

  create: (electionId: string, data: any) =>
    api.post('/voters', data, { params: { electionId } }),

  bulkCreate: (electionId: string, voters: any[]) =>
    api.post('/voters/bulk', { voters }, { params: { electionId } }),

  update: (id: string, data: any) => api.put(`/voters/${id}`, data),

  delete: (id: string) => api.delete(`/voters/${id}`),

  getSchemes: (id: string) => api.get(`/voters/${id}/schemes`),

  addScheme: (id: string, schemeId: string) =>
    api.post(`/voters/${id}/schemes`, { schemeId }),

  removeScheme: (id: string, schemeId: string) =>
    api.delete(`/voters/${id}/schemes/${schemeId}`),
};

// Families API
export const familiesAPI = {
  getAll: (electionId: string, params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/families', { params: { electionId, ...params } }),

  getById: (id: string) => api.get(`/families/${id}`),

  create: (electionId: string, data: any) =>
    api.post('/families', data, { params: { electionId } }),

  bulkCreate: (electionId: string, families: any[]) =>
    api.post('/families/bulk', { families }, { params: { electionId } }),

  update: (id: string, data: any) => api.put(`/families/${id}`, data),

  delete: (id: string) => api.delete(`/families/${id}`),

  addMember: (id: string, voterId: string, isCaptain?: boolean) =>
    api.post(`/families/${id}/members`, { voterId, isCaptain }),

  removeMember: (id: string, voterId: string) =>
    api.delete(`/families/${id}/members/${voterId}`),

  getMembers: (id: string) =>
    api.get(`/families/${id}/members`),

  assignCaptain: (id: string, captainId: string) =>
    api.put(`/families/${id}/captain`, { captainId }),

  removeCaptain: (id: string) =>
    api.delete(`/families/${id}/captain`),
};

// Cadres API
export const cadresAPI = {
  getAll: (electionId: string, params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/cadres', { params: { electionId, ...params } }),

  getById: (id: string) => api.get(`/cadres/${id}`),

  create: (electionId: string, data: any) =>
    api.post('/cadres', data, { params: { electionId } }),

  bulkCreate: (electionId: string, cadres: any[]) =>
    api.post('/cadres/bulk', { cadres }, { params: { electionId } }),

  update: (id: string, data: any) => api.put(`/cadres/${id}`, data),

  delete: (id: string) => api.delete(`/cadres/${id}`),

  assign: (cadreId: string, partId: string, assignmentType?: string) =>
    api.post('/cadres/assign', { cadreId, partId, assignmentType }),

  unassign: (cadreId: string, partId: string) =>
    api.delete(`/cadres/${cadreId}/assignments/${partId}`),
};

// Dashboard API
export const dashboardAPI = {
  getElectionDashboard: (electionId: string) =>
    api.get(`/dashboard/election/${electionId}`),

  getCadreDashboard: (electionId: string) =>
    api.get(`/dashboard/cadre/${electionId}`),

  getPollDayDashboard: (electionId: string) =>
    api.get(`/dashboard/poll-day/${electionId}`),

  getStats: (type: string, electionId: string) =>
    api.get(`/dashboard/stats/${type}/${electionId}`),
};

// Analytics API
export const analyticsAPI = {
  getOverview: (electionId: string) =>
    api.get(`/analytics/overview/${electionId}`),

  getVoterAnalytics: (electionId: string) =>
    api.get(`/analytics/voters/${electionId}`),

  getAgeGroups: (electionId: string) =>
    api.get(`/analytics/age-groups/${electionId}`),

  getPoliticalLeaning: (electionId: string) =>
    api.get(`/analytics/political-leaning/${electionId}`),

  getDataQuality: (electionId: string) =>
    api.get(`/analytics/data-quality/${electionId}`),
};

// AI Analytics API
export const aiAnalyticsAPI = {
  getAll: (electionId: string) =>
    api.get(`/ai-analytics/${electionId}`),

  getById: (electionId: string, id: string) =>
    api.get(`/ai-analytics/${electionId}/${id}`),

  create: (electionId: string, data: { analysisType: string; analysisName: string; description?: string; parameters?: any }) =>
    api.post(`/ai-analytics/${electionId}`, data),

  getTurnoutPrediction: (electionId: string) =>
    api.get(`/ai-analytics/${electionId}/predict/turnout`),

  getSwingVoterAnalysis: (electionId: string) =>
    api.get(`/ai-analytics/${electionId}/analyze/swing-voters`),

  getBoothRiskAssessment: (electionId: string) =>
    api.get(`/ai-analytics/${electionId}/assess/booth-risk`),

  getDemographicInsights: (electionId: string) =>
    api.get(`/ai-analytics/${electionId}/insights/demographic`),

  delete: (electionId: string, id: string) =>
    api.delete(`/ai-analytics/${electionId}/${id}`),
};

// Reports API
export const reportsAPI = {
  getAll: (electionId: string, params?: { page?: number; limit?: number }) =>
    api.get('/reports', { params: { electionId, ...params } }),

  getById: (id: string) => api.get(`/reports/${id}`),

  create: (electionId: string, data: { reportName: string; reportType: string; format?: string; filters?: any }) =>
    api.post('/reports', data, { params: { electionId } }),

  delete: (id: string) => api.delete(`/reports/${id}`),

  generateVoterDemographics: (electionId: string, format?: string) =>
    api.get(`/reports/generate/voter-demographics/${electionId}`, { params: { format } }),

  generateBoothStatistics: (electionId: string, format?: string) =>
    api.get(`/reports/generate/booth-statistics/${electionId}`, { params: { format } }),

  generateCadrePerformance: (electionId: string, format?: string) =>
    api.get(`/reports/generate/cadre-performance/${electionId}`, { params: { format } }),

  generateFeedbackSummary: (electionId: string, format?: string) =>
    api.get(`/reports/generate/feedback-summary/${electionId}`, { params: { format } }),
};

// DataCaffe API
export const dataCaffeAPI = {
  getEmbeds: (electionId?: string, params?: { page?: number; limit?: number }) =>
    api.get('/datacaffe/embeds', { params: { electionId, ...params } }),

  getEmbedById: (id: string) => api.get(`/datacaffe/embeds/${id}`),

  createEmbed: (electionId: string | undefined, data: { embedName: string; embedUrl: string; embedType?: string; description?: string }) =>
    api.post('/datacaffe/embeds', data, { params: { electionId } }),

  updateEmbed: (id: string, data: any) => api.put(`/datacaffe/embeds/${id}`, data),

  deleteEmbed: (id: string) => api.delete(`/datacaffe/embeds/${id}`),

  toggleEmbed: (id: string) => api.put(`/datacaffe/embeds/${id}/toggle`),

  getEmbedUrl: (id: string) => api.get(`/datacaffe/embeds/${id}/url`),

  getTemplates: () => api.get('/datacaffe/templates'),

  syncData: (electionId: string) => api.post(`/datacaffe/sync/${electionId}`),
};

// Master Data APIs
export const masterDataAPI = {
  // Religions
  getReligions: (electionId: string) =>
    api.get('/religions', { params: { electionId } }),

  createReligion: (electionId: string, data: any) =>
    api.post('/religions', data, { params: { electionId } }),

  updateReligion: (id: string, data: any) =>
    api.put(`/religions/${id}`, data),

  deleteReligion: (id: string) => api.delete(`/religions/${id}`),

  // Caste Categories
  getCasteCategories: (electionId: string) =>
    api.get('/caste-categories', { params: { electionId } }),

  // Castes
  getCastes: (electionId: string, casteCategoryId?: string) =>
    api.get('/castes', { params: { electionId, casteCategoryId } }),

  // Sub-Castes
  getSubCastes: (electionId: string, casteId?: string) =>
    api.get('/sub-castes', { params: { electionId, casteId } }),

  // Languages
  getLanguages: (electionId: string) =>
    api.get('/languages', { params: { electionId } }),

  // Parties
  getParties: (electionId: string) =>
    api.get('/parties', { params: { electionId } }),

  // Schemes
  getSchemes: (electionId: string) =>
    api.get('/schemes', { params: { electionId } }),

  // Voter Categories
  getVoterCategories: (electionId: string) =>
    api.get('/voter-categories', { params: { electionId } }),

  // Feedback
  getFeedback: (electionId: string, params?: { status?: string; priority?: string }) =>
    api.get('/feedback', { params: { electionId, ...params } }),

  createFeedback: (electionId: string, data: any) =>
    api.post('/feedback', data, { params: { electionId } }),

  updateFeedbackStatus: (id: string, status: string, resolutionNotes?: string) =>
    api.put(`/feedback/${id}/status`, { status, resolutionNotes }),
};

// Banners API
export const bannersAPI = {
  getAll: (params?: { page?: number; limit?: number; isActive?: boolean }) =>
    api.get('/banners', { params }),

  getById: (id: string) => api.get(`/banners/${id}`),

  create: (data: {
    title: string;
    imageUrl: string;
    linkUrl?: string;
    targetAudience?: string;
    priority?: number;
    startDate?: string;
    endDate?: string;
  }) => api.post('/banners', data),

  update: (id: string, data: any) => api.put(`/banners/${id}`, data),

  delete: (id: string) => api.delete(`/banners/${id}`),

  toggle: (id: string) => api.put(`/banners/${id}/toggle`),
};

// Invitations API (for tenant admins to invite users)
export const invitationsAPI = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/invitations', { params }),

  getById: (id: string) => api.get(`/invitations/${id}`),

  create: (data: {
    mobile: string;
    email?: string;
    firstName: string;
    lastName?: string;
    role: string;
    electionId?: string;
    message?: string;
  }) => api.post('/invitations', data),

  resend: (id: string) => api.post(`/invitations/${id}/resend`),

  cancel: (id: string) => api.post(`/invitations/${id}/cancel`),

  // Public endpoints (no auth required)
  validateToken: (token: string) => api.get(`/invitations/validate/${token}`),

  acceptInvitation: (data: { token: string; password: string }) =>
    api.post('/invitations/accept', data),
};

// Tenant API (for tenant admins to manage their settings)
export const tenantAPI = {
  // Branding/Display Settings
  getBranding: () => api.get('/tenant/branding'),

  updateBranding: (data: {
    displayName?: string;
    organizationName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    faviconUrl?: string;
    partyName?: string;
    partySymbolUrl?: string;
    customDomain?: string; // Custom domain alias (tenant admin can set)
  }) => api.put('/tenant/branding', data),

  // Database Settings
  getDatabaseSettings: () => api.get('/tenant/database'),

  updateDatabaseSettings: (data: {
    databaseHost?: string;
    databaseName?: string;
    databaseUser?: string;
    databasePassword?: string;
    databasePort?: number;
    databaseSSL?: boolean;
  }) => api.put('/tenant/database', data),

  testDatabaseConnection: (data?: {
    databaseHost?: string;
    databaseName?: string;
    databaseUser?: string;
    databasePassword?: string;
    databasePort?: number;
    databaseSSL?: boolean;
  }) => api.post('/tenant/database/test', data || {}),
};

// AI Features API (for tenant users to access AI features)
export const aiAPI = {
  // Get available AI features for tenant
  getAvailableFeatures: () => api.get('/ai/features'),

  // Get AI credits balance
  getCredits: () => api.get('/ai/credits'),

  // Get AI usage history
  getUsageHistory: (params?: { page?: number; limit?: number; featureId?: string }) =>
    api.get('/ai/usage', { params }),

  // Execute an AI feature
  executeFeature: (featureKey: string, input: any) =>
    api.post(`/ai/features/${featureKey}/execute`, { input }),

  // OCR specific endpoint
  processOCR: (data: { file?: File; fileUrl?: string; outputFormat?: string }) => {
    const formData = new FormData();
    if (data.file) {
      formData.append('file', data.file);
    }
    if (data.fileUrl) {
      formData.append('fileUrl', data.fileUrl);
    }
    if (data.outputFormat) {
      formData.append('outputFormat', data.outputFormat);
    }
    return api.post('/ai/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Get AI feature by key
  getFeatureByKey: (featureKey: string) => api.get(`/ai/features/${featureKey}`),
};

// Organization Setup API (for tenant admins to manage role-feature access)
export const organizationAPI = {
  // Get available features and roles
  getFeatures: () => api.get('/organization/features'),

  // Get role-feature matrix for the tenant
  getRoleFeatures: () => api.get('/organization/role-features'),

  // Update single role-feature access
  updateRoleFeature: (role: string, featureKey: string, isEnabled: boolean) =>
    api.put('/organization/role-features', { role, featureKey, isEnabled }),

  // Bulk update role-feature access
  bulkUpdateRoleFeatures: (updates: { role: string; featureKey: string; isEnabled: boolean }[]) =>
    api.put('/organization/role-features/bulk', { updates }),

  // Get users with their roles (for user management)
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/organization/users', { params }),

  // Update user role
  updateUserRole: (userId: string, role: string) =>
    api.put(`/organization/users/${userId}/role`, { role }),

  // Get current user's feature access
  getMyFeatures: () => api.get('/organization/my-features'),
};

// AI Admin API (for tenant admins to manage AI feature access)
export const aiAdminAPI = {
  // Get all AI features with user access control
  getFeatures: () => api.get('/ai/admin/features'),

  // Get tenant's AI subscription details
  getSubscription: () => api.get('/ai/admin/subscription'),

  // Get users with AI feature access
  getUserAccess: (featureId: string) => api.get(`/ai/admin/features/${featureId}/users`),

  // Update user access to AI feature
  updateUserAccess: (featureId: string, userId: string, hasAccess: boolean) =>
    api.put(`/ai/admin/features/${featureId}/users/${userId}`, { hasAccess }),

  // Bulk update user access
  bulkUpdateAccess: (featureId: string, userIds: string[], hasAccess: boolean) =>
    api.put(`/ai/admin/features/${featureId}/users`, { userIds, hasAccess }),

  // Get credit usage summary
  getCreditUsage: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/ai/admin/credits/usage', { params }),

  // Get usage by user
  getUserUsage: (params?: { page?: number; limit?: number }) =>
    api.get('/ai/admin/credits/users', { params }),
};

// EC Data API (for tenant users to view Election Commission data)
export const ecDataAPI = {
  // Get EC integration status for tenant
  getStatus: () => api.get('/ec-data/status'),

  // Get sync history
  getSyncHistory: (params?: { page?: number; limit?: number }) =>
    api.get('/ec-data/sync-history', { params }),

  // Get EC data summary (constituency-level data)
  getSummary: () => api.get('/ec-data/summary'),

  // Request a new sync
  requestSync: () => api.post('/ec-data/request-sync'),
};

// News API (for tenant users to view and analyze news)
export const newsAPI = {
  // Get all news for tenant
  getAll: (params?: { page?: number; limit?: number; category?: string; scope?: string; search?: string }) =>
    api.get('/news', { params }),

  // Get single news item
  getById: (id: string) => api.get(`/news/${id}`),

  // Get news category stats
  getCategoryStats: () => api.get('/news/stats/categories'),

  // Get AI analysis for a news item
  getAnalysis: (id: string) => api.get(`/news/${id}/analysis`),

  // Request AI analysis for a news item
  requestAnalysis: (id: string, analysisType?: string) =>
    api.post(`/news/${id}/analyze`, { analysisType }),
};

// Actions API (for tenant users to manage tasks and actions)
export const actionsAPI = {
  // Get all actions
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignedTo?: string;
    category?: string;
    search?: string;
  }) => api.get('/actions', { params }),

  // Get single action
  getById: (id: string) => api.get(`/actions/${id}`),

  // Create new action
  create: (data: {
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    dueDate?: string;
    assignedTo?: string;
    relatedNewsId?: string;
  }) => api.post('/actions', data),

  // Update action
  update: (id: string, data: any) => api.put(`/actions/${id}`, data),

  // Update action status
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/actions/${id}/status`, { status, notes }),

  // Assign action to user
  assignAction: (id: string, userId: string) =>
    api.patch(`/actions/${id}/assign`, { assignedTo: userId }),

  // Delete action
  delete: (id: string) => api.delete(`/actions/${id}`),

  // Get dashboard stats
  getDashboardStats: () => api.get('/actions/stats/dashboard'),

  // Get my assigned actions
  getMyActions: (params?: { status?: string }) =>
    api.get('/actions/my/assigned', { params }),

  // Generate actions from news using AI
  generateFromNews: (newsId: string) =>
    api.post(`/actions/generate/${newsId}`),
};

// Locality Analysis API (for tenant-specific AI insights)
export const localityAnalysisAPI = {
  // Get constituency-level insights
  getConstituencyInsights: (electionId: string) =>
    api.get(`/ai-analytics/${electionId}/insights/constituency`),

  // Get demographic analysis for locality
  getDemographicAnalysis: (electionId: string, params?: { level?: string; areaId?: string }) =>
    api.get(`/ai-analytics/${electionId}/analyze/demographics`, { params }),

  // Get voting pattern predictions
  getVotingPatterns: (electionId: string, params?: { boothId?: string; sectionId?: string }) =>
    api.get(`/ai-analytics/${electionId}/predict/voting-patterns`, { params }),

  // Get local issues analysis
  getLocalIssues: (electionId: string) =>
    api.get(`/ai-analytics/${electionId}/analyze/local-issues`),

  // Get competitor analysis
  getCompetitorAnalysis: (electionId: string) =>
    api.get(`/ai-analytics/${electionId}/analyze/competitors`),

  // Get actionable recommendations
  getRecommendations: (electionId: string, params?: { category?: string }) =>
    api.get(`/ai-analytics/${electionId}/recommendations`, { params }),
};

// News & Broadcast (NB) API - AI-powered news analysis and campaign management
export const nbAPI = {
  // Dashboard
  getDashboard: () => api.get('/nb/dashboard'),

  // Parsed News
  getParsedNews: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sentiment?: string;
    category?: string;
    geographicRelevance?: string;
  }) => api.get('/nb/parsed-news', { params }),

  parseNews: (newsId: string) => api.post(`/nb/parse-news/${newsId}`),

  // AI Analyses
  getAnalyses: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/nb/analyses', { params }),

  getAnalysisById: (id: string) => api.get(`/nb/analyses/${id}`),

  triggerAnalysis: (parsedNewsId: string, electionId?: string) =>
    api.post(`/nb/analyze/${parsedNewsId}`, { electionId }),

  // Action Plans
  getActionPlans: (params?: {
    page?: number;
    limit?: number;
    targetRole?: string;
    priority?: string;
    status?: string;
    analysisId?: string;
  }) => api.get('/nb/action-plans', { params }),

  generateActionPlans: (analysisId: string) =>
    api.post(`/nb/generate-action-plans/${analysisId}`),

  approveActionPlan: (id: string) => api.patch(`/nb/action-plans/${id}/approve`),

  // Party Lines
  getPartyLines: (params?: {
    page?: number;
    limit?: number;
    level?: string;
    isActive?: boolean;
    analysisId?: string;
  }) => api.get('/nb/party-lines', { params }),

  generatePartyLines: (analysisId: string) =>
    api.post(`/nb/generate-party-lines/${analysisId}`),

  publishPartyLine: (id: string) => api.patch(`/nb/party-lines/${id}/publish`),

  // Speech Points
  getSpeechPoints: (params?: {
    page?: number;
    limit?: number;
    pointType?: string;
    priority?: string;
    isApproved?: boolean;
    analysisId?: string;
  }) => api.get('/nb/speech-points', { params }),

  generateSpeechPoints: (analysisId: string) =>
    api.post(`/nb/generate-speech-points/${analysisId}`),

  approveSpeechPoint: (id: string) => api.patch(`/nb/speech-points/${id}/approve`),

  // Campaign Speeches
  getCampaignSpeeches: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    speechType?: string;
  }) => api.get('/nb/campaign-speeches', { params }),

  createCampaignSpeech: (data: {
    speechPointId: string;
    electionId?: string;
    speechType?: string;
    venue?: string;
    scheduledAt?: string;
    targetAudience?: string[];
    estimatedAudienceSize?: number;
    notes?: string;
  }) => api.post('/nb/campaign-speeches', data),

  // Broadcasts
  getBroadcasts: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    channel?: string;
    targetLevel?: string;
  }) => api.get('/nb/broadcasts', { params }),

  createBroadcast: (data: {
    partyLineId: string;
    channel?: string;
    targetLevel?: string;
    targetAreas?: string[];
    message?: string;
    messageLocal?: string;
    scheduledAt?: string;
    priority?: string;
  }) => api.post('/nb/broadcasts', data),

  sendBroadcast: (id: string) => api.post(`/nb/broadcasts/${id}/send`),
};

// Fund Management API
export const fundsAPI = {
  // Fund Accounts
  getAccounts: (params?: { page?: number; limit?: number; accountType?: string; isActive?: boolean }) =>
    api.get('/funds/accounts', { params }),

  getAccountById: (id: string) => api.get(`/funds/accounts/${id}`),

  createAccount: (data: {
    accountName: string;
    accountNameLocal?: string;
    accountType: string;
    description?: string;
    currentBalance?: number;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    isDefault?: boolean;
  }) => api.post('/funds/accounts', data),

  updateAccount: (id: string, data: any) => api.put(`/funds/accounts/${id}`, data),

  deleteAccount: (id: string) => api.delete(`/funds/accounts/${id}`),

  // Donations
  getDonations: (params?: {
    page?: number;
    limit?: number;
    accountId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => api.get('/funds/donations', { params }),

  getDonationById: (id: string) => api.get(`/funds/donations/${id}`),

  createDonation: (data: {
    accountId: string;
    electionId?: string;
    donorName: string;
    donorEmail?: string;
    donorPhone?: string;
    donorAddress?: string;
    donorPanNumber?: string;
    isAnonymous?: boolean;
    donationType: string;
    amount: number;
    paymentMethod?: string;
    transactionRef?: string;
    purpose?: string;
    remarks?: string;
  }) => api.post('/funds/donations', data),

  updateDonation: (id: string, data: any) => api.put(`/funds/donations/${id}`, data),

  deleteDonation: (id: string) => api.delete(`/funds/donations/${id}`),

  // Expenses
  getExpenses: (params?: {
    page?: number;
    limit?: number;
    accountId?: string;
    status?: string;
    expenseCategory?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => api.get('/funds/expenses', { params }),

  getExpenseById: (id: string) => api.get(`/funds/expenses/${id}`),

  createExpense: (data: {
    accountId: string;
    electionId?: string;
    expenseCategory: string;
    description: string;
    amount: number;
    vendorName?: string;
    vendorContact?: string;
    invoiceNumber?: string;
    invoiceUrl?: string;
    paymentMethod?: string;
    remarks?: string;
  }) => api.post('/funds/expenses', data),

  updateExpense: (id: string, data: any) => api.put(`/funds/expenses/${id}`, data),

  updateExpenseStatus: (id: string, status: string, rejectionReason?: string) =>
    api.patch(`/funds/expenses/${id}/status`, { status, rejectionReason }),

  deleteExpense: (id: string) => api.delete(`/funds/expenses/${id}`),

  // Transactions
  getTransactions: (params?: {
    page?: number;
    limit?: number;
    accountId?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/funds/transactions', { params }),

  getTransactionById: (id: string) => api.get(`/funds/transactions/${id}`),

  // Summary/Dashboard
  getSummary: (params?: { accountId?: string }) => api.get('/funds/summary', { params }),

  // Reports
  generateReport: (params: {
    reportType: string;
    startDate?: string;
    endDate?: string;
    accountId?: string;
    format?: string;
  }) => api.get('/funds/reports', { params }),
};

// Inventory Management API
export const inventoryAPI = {
  // Categories
  getCategories: (params?: { page?: number; limit?: number; parentId?: string; isActive?: boolean }) =>
    api.get('/inventory/categories', { params }),

  getCategoryById: (id: string) => api.get(`/inventory/categories/${id}`),

  createCategory: (data: {
    name: string;
    nameLocal?: string;
    description?: string;
    icon?: string;
    parentId?: string;
    sortOrder?: number;
  }) => api.post('/inventory/categories', data),

  updateCategory: (id: string, data: any) => api.put(`/inventory/categories/${id}`, data),

  deleteCategory: (id: string) => api.delete(`/inventory/categories/${id}`),

  // Items
  getItems: (params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    status?: string;
    search?: string;
    lowStock?: boolean;
  }) => api.get('/inventory/items', { params }),

  getItemById: (id: string) => api.get(`/inventory/items/${id}`),

  createItem: (data: {
    categoryId: string;
    itemCode: string;
    name: string;
    nameLocal?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderLevel?: number;
    unitCost?: number;
    location?: string;
    warehouseId?: string;
    isVehicle?: boolean;
    vehicleNumber?: string;
    vehicleType?: string;
    imageUrl?: string;
    notes?: string;
  }) => api.post('/inventory/items', data),

  updateItem: (id: string, data: any) => api.put(`/inventory/items/${id}`, data),

  deleteItem: (id: string) => api.delete(`/inventory/items/${id}`),

  // Stock Movements
  stockIn: (itemId: string, data: {
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    remarks?: string;
    toLocation?: string;
  }) => api.post(`/inventory/items/${itemId}/stock-in`, data),

  stockOut: (itemId: string, data: {
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    remarks?: string;
    fromLocation?: string;
  }) => api.post(`/inventory/items/${itemId}/stock-out`, data),

  adjustStock: (itemId: string, data: {
    quantity: number;
    reason: string;
    remarks?: string;
  }) => api.post(`/inventory/items/${itemId}/adjust`, data),

  getMovements: (params?: {
    page?: number;
    limit?: number;
    itemId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/inventory/movements', { params }),

  // Allocations
  getAllocations: (params?: {
    page?: number;
    limit?: number;
    itemId?: string;
    eventId?: string;
    status?: string;
    overdue?: boolean;
  }) => api.get('/inventory/allocations', { params }),

  getAllocationById: (id: string) => api.get(`/inventory/allocations/${id}`),

  createAllocation: (data: {
    itemId: string;
    eventId?: string;
    electionId?: string;
    quantity: number;
    allocatedTo?: string;
    allocatedToName?: string;
    purpose?: string;
    allocatedFrom: string;
    allocatedUntil?: string;
    remarks?: string;
  }) => api.post('/inventory/allocations', data),

  updateAllocation: (id: string, data: any) => api.put(`/inventory/allocations/${id}`, data),

  returnAllocation: (id: string, data: {
    returnedQuantity: number;
    condition?: string;
    remarks?: string;
  }) => api.post(`/inventory/allocations/${id}/return`, data),

  deleteAllocation: (id: string) => api.delete(`/inventory/allocations/${id}`),

  // Summary/Dashboard
  getSummary: (params?: { categoryId?: string }) => api.get('/inventory/summary', { params }),

  // Reports
  generateReport: (params: {
    reportType: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    format?: string;
  }) => api.get('/inventory/reports', { params }),
};

export default api;
