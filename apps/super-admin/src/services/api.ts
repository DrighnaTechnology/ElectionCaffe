import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_SUPER_ADMIN_API_URL || '/api/super-admin',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, logout } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_SUPER_ADMIN_API_URL || '/api/super-admin'}/auth/refresh`,
            { refreshToken }
          );

          const { token } = response.data.data;
          useAuthStore.setState({ token });

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch {
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
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: {
    firstName: string;
    lastName?: string;
    email: string;
    mobile: string;
    password: string;
  }) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Database type options
export type DatabaseType = 'NONE' | 'SHARED' | 'DEDICATED_MANAGED' | 'DEDICATED_SELF';

// Tenants API
export const tenantsAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tenantType?: string;
    isActive?: boolean;
  }) => api.get('/tenants', { params }),
  getById: (id: string) => api.get(`/tenants/${id}`),
  create: (data: {
    name: string;
    slug: string;
    tenantType: 'POLITICAL_PARTY' | 'INDIVIDUAL_CANDIDATE' | 'ELECTION_MANAGEMENT';
    databaseType?: DatabaseType;
    databaseHost?: string;
    databaseName?: string;
    databaseUser?: string;
    databasePassword?: string;
    databasePort?: number;
    databaseSSL?: boolean;
    databaseConnectionUrl?: string;
    limits?: {
      maxVoters?: number;
      maxCadres?: number;
      maxElections?: number;
      maxUsers?: number;
      maxConstituencies?: number;
    };
    adminFirstName: string;
    adminLastName?: string;
    adminEmail: string;
    adminMobile: string;
    adminPassword: string;
    enabledFeatures?: string[];
  }) => api.post('/tenants', data),
  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      logoUrl?: string;
      primaryColor?: string;
      isActive?: boolean;
      limits?: {
        maxVoters?: number;
        maxCadres?: number;
        maxElections?: number;
        maxUsers?: number;
        maxConstituencies?: number;
      };
    }
  ) => api.put(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
  getStats: (id: string) => api.get(`/tenants/${id}/stats`),
  getFeatures: (id: string) => api.get(`/tenants/${id}/features`),
  updateFeature: (tenantId: string, featureId: string, isEnabled: boolean) =>
    api.put(`/tenants/${tenantId}/features/${featureId}`, { isEnabled }),
  getConstituencies: (id: string) => api.get(`/tenants/${id}/constituencies`),
  addConstituency: (
    tenantId: string,
    data: {
      name: string;
      code: string;
      type: string;
      state?: string;
      district?: string;
    }
  ) => api.post(`/tenants/${tenantId}/constituencies`, data),
  // Database management
  getDatabase: (id: string) => api.get(`/tenants/${id}/database`),
  updateDatabase: (
    id: string,
    data: {
      databaseType?: DatabaseType;
      databaseHost?: string;
      databaseName?: string;
      databaseUser?: string;
      databasePassword?: string;
      databasePort?: number;
      databaseSSL?: boolean;
      databaseConnectionUrl?: string;
    }
  ) => api.put(`/tenants/${id}/database`, data),
  testDatabaseConnection: (
    id: string,
    data?: {
      host?: string;
      port?: number;
      database?: string;
      user?: string;
      password?: string;
      ssl?: boolean;
      connectionUrl?: string;
    }
  ) => api.post(`/tenants/${id}/database/test`, data || {}),
};

// Features API
export const featuresAPI = {
  getAll: (category?: string) => api.get('/features', { params: { category } }),
  getById: (id: string) => api.get(`/features/${id}`),
  create: (data: {
    featureKey: string;
    featureName: string;
    description?: string;
    category?: string;
    isGlobal?: boolean;
    defaultEnabled?: boolean;
  }) => api.post('/features', data),
  update: (
    id: string,
    data: {
      featureName?: string;
      description?: string;
      category?: string;
      isGlobal?: boolean;
      defaultEnabled?: boolean;
    }
  ) => api.put(`/features/${id}`, data),
  delete: (id: string) => api.delete(`/features/${id}`),
  enableAll: (id: string) => api.post(`/features/${id}/enable-all`),
  disableAll: (id: string) => api.post(`/features/${id}/disable-all`),
  enableForTenants: (id: string, tenantIds: string[]) =>
    api.post(`/features/${id}/enable-for-tenants`, { tenantIds }),
  disableForTenants: (id: string, tenantIds: string[]) =>
    api.post(`/features/${id}/disable-for-tenants`, { tenantIds }),
  bulkCreate: (features: Array<{
    featureKey: string;
    featureName: string;
    description?: string;
    category?: string;
    isGlobal?: boolean;
    defaultEnabled?: boolean;
  }>) => api.post('/features/bulk', { features }),
};

// Invitations API (for inviting Tenant Admins)
export const invitationsAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    tenantId?: string;
  }) => api.get('/invitations', { params }),

  getById: (id: string) => api.get(`/invitations/${id}`),

  create: (data: {
    mobile: string;
    email?: string;
    firstName: string;
    lastName?: string;
    tenantId: string;
    message?: string;
  }) => api.post('/invitations', data),

  resend: (id: string) => api.post(`/invitations/${id}/resend`),

  cancel: (id: string) => api.post(`/invitations/${id}/cancel`),

  getByTenant: (tenantId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => api.get(`/invitations/tenant/${tenantId}`, { params }),
};

// Licenses API
export const licensesAPI = {
  // License Plans
  getPlans: (params?: { isActive?: boolean; isPublic?: boolean; planType?: string }) =>
    api.get('/licenses/plans', { params }),
  getPlanById: (id: string) => api.get(`/licenses/plans/${id}`),
  createPlan: (data: any) => api.post('/licenses/plans', data),
  updatePlan: (id: string, data: any) => api.put(`/licenses/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/licenses/plans/${id}`),
  seedDefaultPlans: () => api.post('/licenses/plans/seed'),

  // Tenant Licenses
  getAll: (params?: { status?: string; planId?: string; page?: number; limit?: number }) =>
    api.get('/licenses', { params }),
  getById: (id: string) => api.get(`/licenses/${id}`),
  getByTenantId: (tenantId: string) => api.get(`/licenses/tenant/${tenantId}`),
  assign: (data: {
    tenantId: string;
    licensePlanId: string;
    status?: string;
    customMaxUsers?: number;
    customMaxSessions?: number;
    customMaxDataGB?: number;
    expiresAt?: string;
    adminNotes?: string;
  }) => api.post('/licenses', data),
  update: (id: string, data: any) => api.put(`/licenses/${id}`, data),
  suspend: (id: string, reason?: string) => api.post(`/licenses/${id}/suspend`, { reason }),
  activate: (id: string, expiresAt?: string) => api.post(`/licenses/${id}/activate`, { expiresAt }),

  // Sessions
  getSessions: (licenseId: string, isActive?: boolean) =>
    api.get(`/licenses/${licenseId}/sessions`, { params: { isActive } }),
  terminateSession: (sessionId: string, reason?: string) =>
    api.post(`/licenses/sessions/${sessionId}/terminate`, { reason }),
  terminateAllSessions: (licenseId: string, reason?: string) =>
    api.post(`/licenses/${licenseId}/sessions/terminate-all`, { reason }),

  // Usage & Alerts
  getUsage: (licenseId: string, params?: { startDate?: string; endDate?: string; granularity?: string }) =>
    api.get(`/licenses/${licenseId}/usage`, { params }),
  getAlerts: (licenseId: string, params?: { isResolved?: boolean; alertLevel?: string }) =>
    api.get(`/licenses/${licenseId}/alerts`, { params }),
  updateAlert: (alertId: string, data: { isRead?: boolean; isDismissed?: boolean; isResolved?: boolean }) =>
    api.patch(`/licenses/alerts/${alertId}`, data),

  // Billing
  getBilling: (licenseId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/licenses/${licenseId}/billing`, { params }),
  createBilling: (licenseId: string, data: any) => api.post(`/licenses/${licenseId}/billing`, data),
  updateBillingStatus: (billingId: string, data: any) => api.patch(`/licenses/billing/${billingId}`, data),

  // Dashboard
  getDashboardStats: () => api.get('/licenses/stats/dashboard'),
};

// AI Providers API
export const aiProvidersAPI = {
  getAll: (params?: { isActive?: boolean }) =>
    api.get('/ai/providers', { params }),
  getById: (id: string) => api.get(`/ai/providers/${id}`),
  create: (data: {
    name: string;
    providerType: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'XAI' | 'CUSTOM';
    apiKey?: string;
    apiEndpoint?: string;
    modelName?: string;
    maxTokens?: number;
    temperature?: number;
    config?: any;
    isActive?: boolean;
  }) => api.post('/ai/providers', data),
  update: (id: string, data: any) => api.put(`/ai/providers/${id}`, data),
  delete: (id: string) => api.delete(`/ai/providers/${id}`),
  test: (id: string) => api.post(`/ai/providers/${id}/test`),
  getStats: (id: string) => api.get(`/ai/providers/${id}/stats`),
};

// AI Features API
export const aiFeaturesAPI = {
  getAll: (params?: { status?: string; providerId?: string; category?: string }) =>
    api.get('/ai/features', { params }),
  getById: (id: string) => api.get(`/ai/features/${id}`),
  create: (data: {
    name: string;
    featureKey: string;
    description?: string;
    category?: string;
    providerId: string;
    systemPrompt?: string;
    userPromptTemplate?: string;
    outputFormat?: string;
    creditsPerUse: number;
    isActive?: boolean;
  }) => api.post('/ai/features', data),
  update: (id: string, data: any) => api.put(`/ai/features/${id}`, data),
  delete: (id: string) => api.delete(`/ai/features/${id}`),
  publish: (id: string) => api.post(`/ai/features/${id}/publish`),
  deprecate: (id: string) => api.post(`/ai/features/${id}/deprecate`),
  assignToTenant: (id: string, tenantId: string) =>
    api.post(`/ai/features/${id}/assign`, { tenantId }),
  unassignFromTenant: (id: string, tenantId: string) =>
    api.post(`/ai/features/${id}/unassign`, { tenantId }),
  test: (id: string, input: any) => api.post(`/ai/features/${id}/test`, { input }),
  getStats: (id: string) => api.get(`/ai/features/${id}/stats`),
};

// AI Credits API
export const aiCreditsAPI = {
  // Credit Packages
  getPackages: (params?: { isActive?: boolean }) =>
    api.get('/ai/credits/packages', { params }),
  getPackageById: (id: string) => api.get(`/ai/credits/packages/${id}`),
  createPackage: (data: {
    name: string;
    credits: number;
    price: number;
    currency?: string;
    description?: string;
    isActive?: boolean;
  }) => api.post('/ai/credits/packages', data),
  updatePackage: (id: string, data: any) => api.put(`/ai/credits/packages/${id}`, data),
  deletePackage: (id: string) => api.delete(`/ai/credits/packages/${id}`),

  // Tenant Credits
  getTenantCredits: (tenantId: string) => api.get(`/ai/credits/tenant/${tenantId}`),
  addCredits: (tenantId: string, data: {
    credits: number;
    reason?: string;
    packageId?: string;
    paymentReference?: string;
  }) => api.post(`/ai/credits/tenant/${tenantId}/add`, data),
  deductCredits: (tenantId: string, data: {
    credits: number;
    reason: string;
  }) => api.post(`/ai/credits/tenant/${tenantId}/deduct`, data),
  getTransactions: (tenantId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/ai/credits/tenant/${tenantId}/transactions`, { params }),

  // Alerts
  getAlerts: (params?: { isRead?: boolean; isResolved?: boolean }) =>
    api.get('/ai/credits/alerts', { params }),
  markAlertRead: (id: string) => api.put(`/ai/credits/alerts/${id}/read`),
  resolveAlert: (id: string) => api.put(`/ai/credits/alerts/${id}/resolve`),

  // Dashboard
  getSummary: () => api.get('/ai/credits/summary'),
};

// System API
export const systemAPI = {
  getConfig: () => api.get('/system/config'),
  getConfigByKey: (key: string) => api.get(`/system/config/${key}`),
  setConfig: (key: string, configValue: any, description?: string) =>
    api.put(`/system/config/${key}`, { configValue, description }),
  getDashboard: () => api.get('/system/dashboard'),
  getAdmins: () => api.get('/system/admins'),
  createAdmin: (data: {
    firstName: string;
    lastName?: string;
    email: string;
    mobile: string;
    password: string;
  }) => api.post('/system/admins', data),
  deactivateAdmin: (id: string) => api.put(`/system/admins/${id}/deactivate`),
  activateAdmin: (id: string) => api.put(`/system/admins/${id}/activate`),
  getHealth: () => api.get('/system/health'),
};

// EC Integration API
export const ecIntegrationAPI = {
  // Get all integrations
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/ec-integration', { params }),

  // Get integration for a tenant
  getByTenant: (tenantId: string) => api.get(`/ec-integration/tenants/${tenantId}`),

  // Create or update integration for a tenant
  upsert: (tenantId: string, data: {
    apiEndpoint?: string;
    apiKey?: string;
    apiSecret?: string;
    stateCode?: string;
    constituencyCode?: string;
    autoSyncEnabled?: boolean;
    syncIntervalHours?: number;
  }) => api.put(`/ec-integration/tenants/${tenantId}`, data),

  // Test connection
  test: (tenantId: string) => api.post(`/ec-integration/tenants/${tenantId}/test`),

  // Activate integration
  activate: (tenantId: string) => api.post(`/ec-integration/tenants/${tenantId}/activate`),

  // Suspend integration
  suspend: (tenantId: string) => api.post(`/ec-integration/tenants/${tenantId}/suspend`),

  // Trigger manual sync
  sync: (tenantId: string, syncType?: string) =>
    api.post(`/ec-integration/tenants/${tenantId}/sync`, { syncType }),

  // Get sync logs
  getSyncLogs: (tenantId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/ec-integration/tenants/${tenantId}/sync-logs`, { params }),

  // Delete integration
  delete: (tenantId: string) => api.delete(`/ec-integration/tenants/${tenantId}`),
};

// News/Information API
export const newsAPI = {
  // Get all news with filters
  getAll: (params?: {
    page?: number;
    limit?: number;
    tenantId?: string;
    geographicLevel?: string;
    category?: string;
    status?: string;
    priority?: string;
    state?: string;
    district?: string;
    constituency?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/news', { params }),

  // Get news by ID
  getById: (id: string) => api.get(`/news/${id}`),

  // Create news
  create: (data: {
    tenantId?: string;
    title: string;
    titleLocal?: string;
    summary?: string;
    content?: string;
    contentLocal?: string;
    category?: string;
    subCategory?: string;
    tags?: string[];
    keywords?: string[];
    source?: string;
    sourceUrl?: string;
    sourceName?: string;
    publishedAt?: string;
    geographicLevel?: string;
    state?: string;
    region?: string;
    district?: string;
    constituency?: string;
    section?: string;
    booth?: string;
    priority?: string;
    status?: string;
    imageUrls?: string[];
    videoUrls?: string[];
    documentUrls?: string[];
  }) => api.post('/news', data),

  // Update news
  update: (id: string, data: any) => api.put(`/news/${id}`, data),

  // Delete news
  delete: (id: string) => api.delete(`/news/${id}`),

  // Publish news
  publish: (id: string) => api.post(`/news/${id}/publish`),

  // Archive news
  archive: (id: string) => api.post(`/news/${id}/archive`),

  // Flag news for review
  flag: (id: string) => api.post(`/news/${id}/flag`),

  // AI analysis
  analyze: (id: string) => api.post(`/news/${id}/analyze`),

  // Get statistics
  getStats: (params?: { tenantId?: string; startDate?: string; endDate?: string }) =>
    api.get('/news/stats/overview', { params }),

  // Get geographic options
  getGeographicOptions: (params?: { state?: string; district?: string }) =>
    api.get('/news/options/geographic', { params }),
};

// Actions API
export const actionsAPI = {
  // Get all actions with filters
  getAll: (params?: {
    page?: number;
    limit?: number;
    tenantId?: string;
    newsId?: string;
    status?: string;
    priority?: string;
    actionType?: string;
    assignedTo?: string;
    geographicLevel?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/actions', { params }),

  // Get action by ID
  getById: (id: string) => api.get(`/actions/${id}`),

  // Create action
  create: (data: {
    newsId?: string;
    tenantId?: string;
    title: string;
    titleLocal?: string;
    description?: string;
    descriptionLocal?: string;
    actionType: string;
    priority?: string;
    status?: string;
    geographicLevel?: string;
    state?: string;
    region?: string;
    district?: string;
    constituency?: string;
    section?: string;
    booth?: string;
    assignedTo?: string;
    assignedToName?: string;
    dueDate?: string;
    estimatedImpact?: string;
    requiredResources?: string[];
    targetAudience?: string[];
    successMetrics?: any;
  }) => api.post('/actions', data),

  // Update action
  update: (id: string, data: any) => api.put(`/actions/${id}`, data),

  // Delete action
  delete: (id: string) => api.delete(`/actions/${id}`),

  // Update action status
  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/actions/${id}/status`, { status, notes }),

  // Assign action
  assign: (id: string, assignedTo: string, assignedToName?: string) =>
    api.patch(`/actions/${id}/assign`, { assignedTo, assignedToName }),

  // Generate actions from news using AI
  generateFromNews: (newsId: string) => api.post(`/actions/generate/${newsId}`),

  // Get actions for a news item
  getByNews: (newsId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/actions/news/${newsId}`, { params }),

  // Get statistics
  getStats: (params?: { tenantId?: string; startDate?: string; endDate?: string }) =>
    api.get('/actions/stats/dashboard', { params }),
};

export default api;
