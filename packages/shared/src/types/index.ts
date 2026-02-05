// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User & Auth Types
export interface UserPayload {
  id: string;
  tenantId: string;
  email?: string;
  mobile: string;
  role: UserRole;
  permissions?: string[];
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'CAMPAIGN_MANAGER'
  | 'COORDINATOR'
  | 'BOOTH_INCHARGE'
  | 'VOLUNTEER'
  | 'AGENT';

export interface LoginRequest {
  mobile: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPayload;
  expiresIn: number;
}

// Election Types
export type ElectionType =
  | 'ASSEMBLY'
  | 'PARLIAMENT'
  | 'LOCAL_BODY'
  | 'PANCHAYAT'
  | 'MUNICIPAL'
  | 'BY_ELECTION';

export type ElectionStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface ElectionSummary {
  id: string;
  name: string;
  nameLocal?: string;
  electionType: ElectionType;
  status: ElectionStatus;
  state: string;
  constituency: string;
  pollDate?: Date;
  totalVoters: number;
  totalBooths: number;
  candidateName?: string;
  candidatePhotoUrl?: string;
}

// Voter Types
export type Gender = 'MALE' | 'FEMALE' | 'TRANSGENDER';
export type PoliticalLeaning = 'LOYAL' | 'SWING' | 'OPPOSITION' | 'UNKNOWN';
export type InfluenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface VoterSummary {
  id: string;
  epicNumber?: string;
  name: string;
  nameLocal?: string;
  gender: Gender;
  age?: number;
  mobile?: string;
  partNumber: number;
  boothName: string;
  religion?: string;
  caste?: string;
  politicalLeaning: PoliticalLeaning;
}

// Dashboard Types
export interface DashboardKPI {
  label: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  color?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface ElectionDashboard {
  kpis: {
    totalVoters: DashboardKPI;
    totalBooths: DashboardKPI;
    totalFamilies: DashboardKPI;
    totalCadres: DashboardKPI;
    mobileUpdated: DashboardKPI;
    dobUpdated: DashboardKPI;
  };
  demographics: {
    gender: ChartDataPoint[];
    religion: ChartDataPoint[];
    casteCategory: ChartDataPoint[];
    language: ChartDataPoint[];
  };
  cadrePerformance: {
    loggedIn: number;
    notLogged: number;
    topPerformers: CadrePerformance[];
    leastPerformers: CadrePerformance[];
  };
}

export interface CadrePerformance {
  id: string;
  name: string;
  votersUpdated: number;
  surveysCompleted: number;
  votesMarked: number;
  rank: number;
}

// Poll Day Types
export interface PollDayStats {
  electionId: string;
  totalVoters: number;
  votedCount: number;
  turnoutPercentage: number;
  hourlyTurnout: HourlyTurnout[];
  boothWiseTurnout: BoothTurnout[];
}

export interface HourlyTurnout {
  hour: string;
  count: number;
  cumulative: number;
  percentage: number;
}

export interface BoothTurnout {
  boothId: string;
  boothNumber: number;
  boothName: string;
  totalVoters: number;
  votedCount: number;
  percentage: number;
}

// Analytics Types
export interface AnalyticsFilter {
  electionId: string;
  partIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  groupBy?: 'religion' | 'caste' | 'gender' | 'age' | 'language' | 'party';
}

export interface AIAnalyticsRequest {
  electionId: string;
  analysisType: AIAnalyticsType;
  parameters?: Record<string, unknown>;
}

export type AIAnalyticsType =
  | 'VOTER_SENTIMENT'
  | 'TURNOUT_PREDICTION'
  | 'SWING_VOTER_ANALYSIS'
  | 'BOOTH_RISK_ASSESSMENT'
  | 'CAMPAIGN_EFFECTIVENESS'
  | 'DEMOGRAPHIC_INSIGHTS'
  | 'CUSTOM_ANALYSIS';

export interface AIAnalyticsResult {
  id: string;
  analysisType: AIAnalyticsType;
  analysisName: string;
  results: Record<string, unknown>;
  insights: AIInsight[];
  confidence: number;
  processedAt: Date;
}

export interface AIInsight {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  actionable: boolean;
  recommendation?: string;
}

// Report Types
export type ReportType =
  | 'VOTER_DEMOGRAPHICS'
  | 'BOOTH_STATISTICS'
  | 'CADRE_PERFORMANCE'
  | 'POLL_DAY_TURNOUT'
  | 'FAMILY_ANALYSIS'
  | 'SCHEME_BENEFICIARIES'
  | 'FEEDBACK_SUMMARY'
  | 'CUSTOM';

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON';

export interface ReportRequest {
  electionId: string;
  reportType: ReportType;
  format: ReportFormat;
  filters?: Record<string, unknown>;
  schedule?: {
    enabled: boolean;
    cronExpression: string;
  };
}

// DataCaffe Embed Types
export interface DataCaffeEmbed {
  id: string;
  embedName: string;
  embedUrl: string;
  embedType: 'dashboard' | 'report' | 'chart';
  description?: string;
  isActive: boolean;
}

// Bulk Import Types
export interface BulkImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: BulkImportError[];
}

export interface BulkImportError {
  row: number;
  field: string;
  value: string;
  error: string;
}

// WebSocket Event Types
export interface WSEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
}

export interface VoteMarkedEvent {
  electionId: string;
  boothId: string;
  voterId: string;
  votedAt: Date;
  newTurnout: number;
}

export interface CadreLocationEvent {
  cadreId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}
