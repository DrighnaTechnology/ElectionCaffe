import { z } from 'zod';

// Common Validators
export const uuidSchema = z.string().uuid();
export const mobileSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');
export const emailSchema = z.string().email().optional();
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number');

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Auth Schemas
export const loginSchema = z.object({
  mobile: mobileSchema.optional(),
  email: z.string().email().optional(),
  password: passwordSchema,
  tenantSlug: z.string().optional(),
}).refine((data) => data.mobile || data.email, {
  message: 'Either mobile number or email is required',
  path: ['mobile'],
});

export const registerSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().max(50).optional(),
  mobile: mobileSchema,
  email: emailSchema,
  password: passwordSchema,
  tenantSlug: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  mobile: mobileSchema,
  otp: z.string().length(6),
  newPassword: passwordSchema,
});

// Election Schemas
export const createElectionSchema = z.object({
  name: z.string().min(3).max(200),
  nameLocal: z.string().max(200).optional(),
  electionType: z.enum(['ASSEMBLY', 'PARLIAMENT', 'LOCAL_BODY', 'PANCHAYAT', 'MUNICIPAL', 'BY_ELECTION']),
  state: z.string().min(2).max(100),
  constituency: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  candidateName: z.string().max(100).optional(),
  partyId: uuidSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  pollDate: z.coerce.date().optional(),
  resultDate: z.coerce.date().optional(),
});

export const updateElectionSchema = createElectionSchema.partial();

// Part/Booth Schemas
export const createPartSchema = z.object({
  partNumber: z.coerce.number().int().positive(),
  boothName: z.string().min(3).max(300),
  boothNameLocal: z.string().max(300).optional(),
  partType: z.enum(['URBAN', 'RURAL']).default('URBAN'),
  address: z.string().max(500).optional(),
  landmark: z.string().max(200).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  schoolName: z.string().max(300).optional(),
  buildingType: z.string().max(100).optional(),
});

export const updatePartSchema = createPartSchema.partial();

export const bulkPartUploadSchema = z.array(createPartSchema);

// Section Schemas
export const createSectionSchema = z.object({
  partId: uuidSchema,
  sectionNumber: z.coerce.number().int().positive(),
  sectionName: z.string().min(1).max(200),
  sectionNameLocal: z.string().max(200).optional(),
  isOverseas: z.boolean().default(false),
});

// Voter Schemas
export const createVoterSchema = z.object({
  partId: uuidSchema,
  sectionId: uuidSchema.optional(),
  boothId: uuidSchema.optional(),
  epicNumber: z.string().max(20).optional(),
  slNumber: z.coerce.number().int().positive().optional(),
  name: z.string().min(2).max(100),
  nameLocal: z.string().max(100).optional(),
  fatherName: z.string().max(100).optional(),
  motherName: z.string().max(100).optional(),
  husbandName: z.string().max(100).optional(),
  relationType: z.enum(['FATHER', 'MOTHER', 'HUSBAND', 'WIFE', 'GUARDIAN']).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'TRANSGENDER']).default('MALE'),
  age: z.coerce.number().int().min(18).max(120).optional(),
  dateOfBirth: z.coerce.date().optional(),
  mobile: mobileSchema.optional(),
  alternateMobile: mobileSchema.optional(),
  email: emailSchema,
  houseNumber: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  religionId: uuidSchema.optional(),
  casteCategoryId: uuidSchema.optional(),
  casteId: uuidSchema.optional(),
  subCasteId: uuidSchema.optional(),
  languageId: uuidSchema.optional(),
  partyId: uuidSchema.optional(),
  voterCategoryId: uuidSchema.optional(),
  politicalLeaning: z.enum(['LOYAL', 'SWING', 'OPPOSITION', 'UNKNOWN']).default('UNKNOWN'),
  influenceLevel: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']).default('NONE'),
  profession: z.string().max(100).optional(),
  education: z.string().max(100).optional(),
});

export const updateVoterSchema = createVoterSchema.partial();

// Cadre Schemas
export const createCadreSchema = z.object({
  name: z.string().min(2).max(100),
  mobile: mobileSchema,
  email: emailSchema,
  role: z.enum(['COORDINATOR', 'BOOTH_INCHARGE', 'VOLUNTEER', 'AGENT']).default('VOLUNTEER'),
  address: z.string().max(500).optional(),
});

export const updateCadreSchema = createCadreSchema.partial();

export const assignCadreSchema = z.object({
  cadreId: uuidSchema,
  partId: uuidSchema,
  assignmentType: z.enum(['PRIMARY', 'SECONDARY', 'BACKUP']).default('PRIMARY'),
});

// Family Schemas
export const createFamilySchema = z.object({
  familyName: z.string().max(200).optional(),
  houseNumber: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  captainId: uuidSchema.optional(),
  memberIds: z.array(uuidSchema).optional(),
});

// Master Data Schemas
export const createReligionSchema = z.object({
  religionName: z.string().min(2).max(100),
  religionNameLocal: z.string().max(100).optional(),
  religionColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  displayOrder: z.coerce.number().int().default(0),
});

export const createCasteCategorySchema = z.object({
  categoryName: z.string().min(1).max(50),
  categoryFullName: z.string().max(200).optional(),
  reservationPercent: z.coerce.number().min(0).max(100).optional(),
  displayOrder: z.coerce.number().int().default(0),
});

export const createCasteSchema = z.object({
  casteCategoryId: uuidSchema,
  religionId: uuidSchema.optional(),
  casteName: z.string().min(2).max(100),
  casteNameLocal: z.string().max(100).optional(),
  casteCode: z.string().max(20).optional(),
  displayOrder: z.coerce.number().int().default(0),
});

export const createSubCasteSchema = z.object({
  casteId: uuidSchema,
  subCasteName: z.string().min(2).max(100),
  subCasteNameLocal: z.string().max(100).optional(),
  displayOrder: z.coerce.number().int().default(0),
});

export const createLanguageSchema = z.object({
  languageName: z.string().min(2).max(100),
  languageNameLocal: z.string().max(100).optional(),
  languageCode: z.string().max(10).optional(),
  script: z.string().max(50).optional(),
  writingDirection: z.enum(['ltr', 'rtl']).default('ltr'),
  displayOrder: z.coerce.number().int().default(0),
});

export const createPartySchema = z.object({
  partyName: z.string().min(2).max(100),
  partyShortName: z.string().max(20).optional(),
  partyFullName: z.string().max(200).optional(),
  allianceName: z.string().max(100).optional(),
  partyColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isDefault: z.boolean().default(false),
  isNeutral: z.boolean().default(false),
  displayOrder: z.coerce.number().int().default(0),
});

export const createSchemeSchema = z.object({
  schemeName: z.string().min(2).max(200),
  schemeShortName: z.string().max(50).optional(),
  schemeDescription: z.string().max(1000).optional(),
  schemeBy: z.enum(['UNION_GOVT', 'STATE_GOVT', 'LOCAL_BODY']).default('STATE_GOVT'),
  schemeValue: z.coerce.number().min(0).optional(),
  valueType: z.enum(['ONE_TIME', 'MONTHLY', 'YEARLY']).default('ONE_TIME'),
  category: z.string().max(100).optional(),
});

// Survey Schemas
export const createSurveySchema = z.object({
  surveyName: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  questions: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'number', 'single_choice', 'multi_choice', 'rating', 'date']),
    question: z.string(),
    options: z.array(z.string()).optional(),
    required: z.boolean().default(false),
  })),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const surveyResponseSchema = z.object({
  surveyId: uuidSchema,
  voterId: uuidSchema,
  responses: z.record(z.string(), z.unknown()),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// Feedback Schemas
export const createFeedbackSchema = z.object({
  partId: uuidSchema.optional(),
  issueName: z.string().min(3).max(200),
  issueNameLocal: z.string().max(200).optional(),
  issueDescription: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  subCategory: z.string().max(100).optional(),
  village: z.string().max(100).optional(),
  ward: z.string().max(100).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  resolutionNotes: z.string().max(2000).optional(),
  assignedTo: uuidSchema.optional(),
});

// Poll Day Schemas
export const markVoteSchema = z.object({
  boothId: uuidSchema,
  voterId: uuidSchema,
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// Report Schemas
export const createReportSchema = z.object({
  reportName: z.string().min(3).max(200),
  reportType: z.enum([
    'VOTER_DEMOGRAPHICS',
    'BOOTH_STATISTICS',
    'CADRE_PERFORMANCE',
    'POLL_DAY_TURNOUT',
    'FAMILY_ANALYSIS',
    'SCHEME_BENEFICIARIES',
    'FEEDBACK_SUMMARY',
    'CUSTOM',
  ]),
  format: z.enum(['PDF', 'EXCEL', 'CSV', 'JSON']).default('PDF'),
  filters: z.record(z.string(), z.unknown()).optional(),
  isScheduled: z.boolean().default(false),
  scheduleExpr: z.string().optional(),
});

// AI Analytics Schemas
export const createAIAnalyticsSchema = z.object({
  analysisType: z.enum([
    'VOTER_SENTIMENT',
    'TURNOUT_PREDICTION',
    'SWING_VOTER_ANALYSIS',
    'BOOTH_RISK_ASSESSMENT',
    'CAMPAIGN_EFFECTIVENESS',
    'DEMOGRAPHIC_INSIGHTS',
    'CUSTOM_ANALYSIS',
  ]),
  analysisName: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

// DataCaffe Embed Schemas
export const createDataCaffeEmbedSchema = z.object({
  embedName: z.string().min(3).max(200),
  embedUrl: z.string().url(),
  embedType: z.enum(['dashboard', 'report', 'chart']).default('dashboard'),
  description: z.string().max(1000).optional(),
  accessToken: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
});

// Export types from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateElectionInput = z.infer<typeof createElectionSchema>;
export type UpdateElectionInput = z.infer<typeof updateElectionSchema>;
export type CreatePartInput = z.infer<typeof createPartSchema>;
export type CreateVoterInput = z.infer<typeof createVoterSchema>;
export type UpdateVoterInput = z.infer<typeof updateVoterSchema>;
export type CreateCadreInput = z.infer<typeof createCadreSchema>;
export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type CreateAIAnalyticsInput = z.infer<typeof createAIAnalyticsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
