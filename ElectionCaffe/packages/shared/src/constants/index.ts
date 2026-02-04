// Service Ports
export const SERVICE_PORTS = {
  GATEWAY: 3000,
  AUTH: 3001,
  ELECTION: 3002,
  VOTER: 3003,
  CADRE: 3004,
  ANALYTICS: 3005,
  REPORTING: 3006,
  AI_ANALYTICS: 3007,
  SUPER_ADMIN: 3008,
  WEB: 5173,
} as const;

// Service URLs (for inter-service communication)
export const SERVICE_URLS = {
  AUTH: process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS.AUTH}`,
  ELECTION: process.env.ELECTION_SERVICE_URL || `http://localhost:${SERVICE_PORTS.ELECTION}`,
  VOTER: process.env.VOTER_SERVICE_URL || `http://localhost:${SERVICE_PORTS.VOTER}`,
  CADRE: process.env.CADRE_SERVICE_URL || `http://localhost:${SERVICE_PORTS.CADRE}`,
  ANALYTICS: process.env.ANALYTICS_SERVICE_URL || `http://localhost:${SERVICE_PORTS.ANALYTICS}`,
  REPORTING: process.env.REPORTING_SERVICE_URL || `http://localhost:${SERVICE_PORTS.REPORTING}`,
  AI_ANALYTICS: process.env.AI_ANALYTICS_SERVICE_URL || `http://localhost:${SERVICE_PORTS.AI_ANALYTICS}`,
  SUPER_ADMIN: process.env.SUPER_ADMIN_SERVICE_URL || `http://localhost:${SERVICE_PORTS.SUPER_ADMIN}`,
} as const;

// JWT Configuration
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ALGORITHM: 'HS256' as const,
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Role Permissions
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  TENANT_ADMIN: [
    'elections:*',
    'voters:*',
    'cadres:*',
    'families:*',
    'parts:*',
    'reports:*',
    'analytics:*',
    'settings:*',
    'users:read',
    'users:create',
    'users:update',
  ],
  CAMPAIGN_MANAGER: [
    'elections:read',
    'elections:update',
    'voters:*',
    'cadres:*',
    'families:*',
    'parts:*',
    'reports:read',
    'reports:create',
    'analytics:read',
  ],
  COORDINATOR: [
    'elections:read',
    'voters:read',
    'voters:update',
    'cadres:read',
    'families:read',
    'parts:read',
    'reports:read',
  ],
  BOOTH_INCHARGE: [
    'elections:read',
    'voters:read',
    'voters:update',
    'parts:read',
    'poll-day:*',
  ],
  VOLUNTEER: [
    'elections:read',
    'voters:read',
    'voters:update',
    'parts:read',
    'surveys:read',
    'surveys:submit',
  ],
  AGENT: [
    'elections:read',
    'voters:read',
    'poll-day:mark',
  ],
} as const;

// Election Types with Display Names
export const ELECTION_TYPES = {
  ASSEMBLY: { name: 'Assembly Election', nameLocal: 'சட்டமன்றத் தேர்தல்' },
  PARLIAMENT: { name: 'Parliamentary Election', nameLocal: 'நாடாளுமன்றத் தேர்தல்' },
  LOCAL_BODY: { name: 'Urban Local Body Election', nameLocal: 'நகர்ப்புற உள்ளாட்சித் தேர்தல்' },
  PANCHAYAT: { name: 'Panchayat Election', nameLocal: 'பஞ்சாயத்துத் தேர்தல்' },
  MUNICIPAL: { name: 'Municipal Election', nameLocal: 'நகராட்சித் தேர்தல்' },
  BY_ELECTION: { name: 'By-Election', nameLocal: 'இடைத்தேர்தல்' },
} as const;

// Vulnerability Types with Colors
export const VULNERABILITY_TYPES = {
  NOT_ASSIGNED: { name: 'Not Assigned', color: '#808080' },
  CRITICAL: { name: 'Critical', color: '#FF4D4F' },
  COMMUNAL: { name: 'Communal', color: '#FA8C16' },
  POLITICAL: { name: 'Political', color: '#FADB14' },
  NAXAL: { name: 'Naxal', color: '#A8071A' },
  BORDER: { name: 'Border', color: '#1890FF' },
  REMOTE: { name: 'Remote', color: '#722ED1' },
} as const;

// Feedback Categories
export const FEEDBACK_CATEGORIES = [
  'Water',
  'Roads',
  'Drainage',
  'Electricity',
  'Transportation',
  'Environment',
  'Healthcare',
  'Education',
  'Housing',
  'Agriculture',
  'Other',
] as const;

// Indian States
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
  'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
] as const;

// Chart Colors
export const CHART_COLORS = [
  '#1890FF', // Primary Blue
  '#52C41A', // Success Green
  '#FAAD14', // Warning Yellow
  '#F5222D', // Error Red
  '#722ED1', // Purple
  '#13C2C2', // Cyan
  '#FA8C16', // Orange
  '#EB2F96', // Magenta
  '#2F54EB', // Geek Blue
  '#A0D911', // Lime
] as const;

// Dashboard KPI Colors
export const KPI_COLORS = {
  primary: '#1890FF',
  success: '#52C41A',
  warning: '#FAAD14',
  error: '#F5222D',
  info: '#13C2C2',
  purple: '#722ED1',
} as const;

// Report Formats
export const REPORT_FORMATS = {
  PDF: { name: 'PDF Document', extension: '.pdf', mimeType: 'application/pdf' },
  EXCEL: { name: 'Excel Spreadsheet', extension: '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  CSV: { name: 'CSV File', extension: '.csv', mimeType: 'text/csv' },
  JSON: { name: 'JSON Data', extension: '.json', mimeType: 'application/json' },
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Poll Day Events
  VOTE_MARKED: 'vote_marked',
  TURNOUT_UPDATE: 'turnout_update',
  BOOTH_UPDATE: 'booth_update',

  // Cadre Events
  CADRE_LOCATION: 'cadre_location',
  CADRE_STATUS: 'cadre_status',

  // General Events
  NOTIFICATION: 'notification',
  ERROR: 'error',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
} as const;

// API Response Codes
export const ERROR_CODES = {
  // Auth Errors (1xxx)
  UNAUTHORIZED: 'E1001',
  INVALID_CREDENTIALS: 'E1002',
  TOKEN_EXPIRED: 'E1003',
  INVALID_TOKEN: 'E1004',
  FORBIDDEN: 'E1005',
  OTP_EXPIRED: 'E1006',
  OTP_INVALID: 'E1007',

  // Validation Errors (2xxx)
  VALIDATION_ERROR: 'E2001',
  INVALID_INPUT: 'E2002',
  MISSING_FIELD: 'E2003',
  DUPLICATE_ENTRY: 'E2004',

  // Resource Errors (3xxx)
  NOT_FOUND: 'E3001',
  ALREADY_EXISTS: 'E3002',
  RESOURCE_LOCKED: 'E3003',
  RESOURCE_DELETED: 'E3004',

  // Business Logic Errors (4xxx)
  ELECTION_LOCKED: 'E4001',
  VOTER_ALREADY_VOTED: 'E4002',
  MAX_LIMIT_REACHED: 'E4003',
  OPERATION_NOT_ALLOWED: 'E4004',

  // Server Errors (5xxx)
  INTERNAL_ERROR: 'E5001',
  DATABASE_ERROR: 'E5002',
  SERVICE_UNAVAILABLE: 'E5003',
  EXTERNAL_API_ERROR: 'E5004',
} as const;
