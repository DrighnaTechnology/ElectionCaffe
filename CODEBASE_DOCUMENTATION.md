# ElectionCaffe - Complete Codebase Documentation

> **Generated:** 2026-02-25
> **Platform:** Enterprise Multi-Tenant Election Management SaaS

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Microservices](#5-microservices)
6. [Database Architecture](#6-database-architecture)
7. [Frontend Applications](#7-frontend-applications)
8. [All Pages & Routes](#8-all-pages--routes)
9. [UI Component Library](#9-ui-component-library)
10. [State Management](#10-state-management)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [User Roles & Permissions](#12-user-roles--permissions)
13. [API Endpoints Reference](#13-api-endpoints-reference)
14. [Feature Catalog](#14-feature-catalog)
15. [Multi-Tenant System](#15-multi-tenant-system)
16. [Real-Time Features (WebSocket)](#16-real-time-features-websocket)
17. [AI & Analytics](#17-ai--analytics)
18. [Fund Management](#18-fund-management)
19. [Inventory Management](#19-inventory-management)
20. [Bulk Operations & File Uploads](#20-bulk-operations--file-uploads)
21. [Maps & Geographic Features](#21-maps--geographic-features)
22. [Third-Party Integrations](#22-third-party-integrations)
23. [Error Handling](#23-error-handling)
24. [Build & Deployment](#24-build--deployment)
25. [Hardcoded Values Audit](#25-hardcoded-values-audit)
26. [Key Statistics](#26-key-statistics)

---

## 1. Project Overview

ElectionCaffe is an **enterprise-grade, multi-tenant election management platform** built as a SaaS product. It enables political parties, individual candidates, and election management companies to manage their entire electoral workflow — from voter data management and cadre coordination to AI-powered analytics and real-time poll-day tracking.

### Key Capabilities
- Multi-tenant SaaS with tenant-specific databases
- Full voter lifecycle management (CRUD, families, demographics, schemes)
- Election campaign management (candidates, nominations, battle cards)
- Field workforce (cadre) management and assignment
- Real-time poll-day tracking with WebSocket
- AI-powered analytics (turnout prediction, swing voter analysis, risk assessment)
- Fund management (donations, expenses, accounts)
- Inventory management (categories, items, stock movements, allocations)
- DataCaffe.ai integration for embedded analytics
- Election Commission data synchronization
- Super Admin portal for platform-wide management

---

## 2. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI library |
| TypeScript | 5.3.3 | Type-safe JavaScript |
| Vite | 5.0.10 | Bundler & dev server |
| Tailwind CSS | 3.4.0 | Utility-first CSS |
| Radix UI | Latest | Accessible component primitives |
| TanStack Query | 5.14.0 | Server state management |
| TanStack Table | 8.11.0 | Headless table library |
| Zustand | 4.4.7 | Client state management |
| React Router | 6.21.0 | Client-side routing |
| React Hook Form | 7.49.2 | Form management |
| Zod | 3.22.4 | Schema validation |
| Axios | 1.6.2 | HTTP client |
| Recharts | 2.10.3 | Charts & visualizations |
| Leaflet / React-Leaflet | 1.9.4 / 4.2.1 | Maps |
| Socket.IO Client | 4.7.2 | Real-time WebSocket |
| XLSX | 0.18.5 | Excel import/export |
| Lucide Icons | 0.302.0 | Icon library |
| Sonner | 1.3.1 | Toast notifications |
| Date-fns | 3.0.6 | Date utilities |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.18.2 | Web framework |
| Prisma ORM | 5.7.1 | Database ORM & migrations |
| PostgreSQL | 14+ | Relational database |
| JWT (jsonwebtoken) | 9.0.2 | Token authentication |
| Bcryptjs | 2.4.3 | Password hashing |
| Socket.IO | 4.7.2 | Real-time server |
| Pino | 8.17.0 | Structured logging |
| Helmet | 7.1.0 | Security headers |
| Express Rate Limit | 7.1.5 | Rate limiting |
| HTTP Proxy Middleware | 2.0.6 | API gateway proxying |
| Multer | 1.4.5 | File uploads |
| pg | 8.11.3 | PostgreSQL driver |

### DevOps & Infrastructure

| Tool | Purpose |
|------|---------|
| Turborepo | Monorepo task orchestration |
| npm Workspaces | Package management |
| Docker / Docker Compose | Containerization |
| Nginx | Reverse proxy |
| ESLint | Code linting |

---

## 3. Architecture

### Monorepo Structure (npm workspaces + Turborepo)

```
ElectionCaffe/
├── apps/              # Frontend applications
│   ├── web/           # Main tenant portal (React SPA)
│   └── super-admin/   # Super admin portal (React SPA)
├── packages/          # Shared libraries
│   ├── database/      # Prisma ORM, schemas, seeds, clients
│   └── shared/        # Types, constants, utilities, validation
├── services/          # Backend microservices
│   ├── gateway/       # API Gateway (Port 3000)
│   ├── auth-service/  # Authentication (Port 3001)
│   ├── election-service/ # Elections (Port 3002)
│   ├── voter-service/ # Voters (Port 3003)
│   ├── cadre-service/ # Cadres (Port 3004)
│   ├── analytics-service/ # Analytics (Port 3005)
│   ├── reporting-service/ # Reports (Port 3006)
│   ├── ai-analytics-service/ # AI Analytics (Port 3007)
│   └── super-admin-service/ # Super Admin Backend
└── scripts/           # Utility & setup scripts
```

### Request Flow

```
Browser → Nginx (dev/prod proxy)
       → API Gateway (Port 3000)
         ├── Auth middleware (JWT verification)
         ├── Rate limiting
         ├── Tenant context injection
         └── Proxy to target microservice
              ├── auth-service    → Core DB + Tenant DB
              ├── election-service → Tenant DB
              ├── voter-service   → Tenant DB
              ├── cadre-service   → Tenant DB
              ├── analytics-service → Tenant DB
              ├── reporting-service → Tenant DB
              └── ai-analytics-service → Tenant DB + AI Providers
```

### Database Architecture

```
PostgreSQL Server
├── ElectionCaffeCore   ← Platform-wide data (tenants, features, licenses, super admin)
├── EC_BJP_TN           ← Tenant: BJP Tamil Nadu
├── EC_BJP_UP           ← Tenant: BJP Uttar Pradesh
├── EC_AIDMK_TN        ← Tenant: AIDMK Tamil Nadu
├── EC_Demo             ← Demo tenant
└── EC_<NewTenant>      ← Dynamically created per tenant
```

---

## 4. Directory Structure

### Root Level Files

| File | Purpose |
|------|---------|
| `package.json` | Root monorepo config with workspace definitions |
| `turbo.json` | Turborepo pipeline config (dev, build, start, lint) |
| `tsconfig.base.json` | Shared TypeScript base config |
| `docker-compose.yml` | Full stack Docker orchestration |
| `Dockerfile.web` | Frontend container image |
| `Dockerfile.service` | Backend services container image |
| `nginx.conf` | Dev reverse proxy config |
| `nginx.prod.conf` | Production reverse proxy config |
| `.env.example` | Development environment template |
| `.env.production.example` | Production environment template |

### Utility Scripts (Root)

| Script | Purpose |
|--------|---------|
| `kill-ports.js` | Kill processes on service ports |
| `enable-fund-inventory.js` | Enable fund/inventory features for tenant |
| `find-tenant-db.js` | Look up tenant database by slug |
| `list-all-users.js` | List all users in the system |
| `reset-password.js` | Reset user password |
| `sync-tenants-to-core.js` | Sync tenant data to core DB |
| `start-all-tenants.sh` | Start all tenant dev portals |
| `test-api-response.sh` | Test API responses |
| `test-login.sh` | Test login flow |

---

## 5. Microservices

### 5.1 API Gateway (Port 3000)

**Path:** `services/gateway/`

**Responsibilities:**
- Route all API requests to appropriate microservices
- JWT authentication verification
- Rate limiting (300 req/15min general, 10 req/15min for auth)
- Security headers (Helmet)
- CORS configuration
- WebSocket proxying
- Request/response logging (Pino)
- JSON body parsing (10MB limit)

**Route Mapping:**
| Path Prefix | Target Service |
|-------------|---------------|
| `/api/auth/*` | Auth Service (3001) |
| `/api/elections/*` | Election Service (3002) |
| `/api/voters/*` | Voter Service (3003) |
| `/api/cadres/*` | Cadre Service (3004) |
| `/api/analytics/*` | Analytics Service (3005) |
| `/api/reports/*` | Reporting Service (3006) |
| `/api/ai/*` | AI Analytics Service (3007) |
| `/ws/*` | WebSocket connections |

### 5.2 Auth Service (Port 3001)

**Path:** `services/auth-service/`

**Route Files:**
- `auth.ts` — Login, register, token refresh, logout, profile, password management
- `users.ts` — User CRUD, role assignment
- `invitations.ts` — Create, send, resend, accept, validate invitations
- `tenants.ts` — Tenant branding, settings, database config
- `organization.ts` — Feature flags, role-feature mapping
- `notifications.ts` — Internal notification management
- `conversations.ts` — Internal chat/messaging
- `websites.ts` — Website builder and page management
- `events.ts` — Event management (create, attendees, resources)
- `funds.ts` — Fund accounts, donations, expenses, transactions
- `inventory.ts` — Categories, items, stock movements, allocations
- `ec-data.ts` — Election Commission data sync
- `news-broadcast.ts` — News parsing, AI analysis, broadcasts, action plans

### 5.3 Election Service (Port 3002)

**Path:** `services/election-service/`

**Controllers:**
- `elections.controller.ts` — Election CRUD, lock/unlock
- `candidates.controller.ts` — Candidate management, documents, social media, battle cards
- `parts.controller.ts` — Parts/booths/sections, vulnerability, BLA-2, booth committee
- `masterData.controller.ts` — Religions, castes, languages, parties, schemes, categories
- `surveys.controller.ts` — Survey creation and response management

### 5.4 Voter Service (Port 3003)

**Path:** `services/voter-service/`

**Features:**
- Voter CRUD (comprehensive demographics)
- Family management (create, assign captain, manage members)
- Voter scheme linking
- Voter category tagging
- Bulk voter import
- Query with filtering and pagination (up to 50,000 batch limit)

### 5.5 Cadre Service (Port 3004)

**Path:** `services/cadre-service/`

**Route Files:**
- `cadres.ts` — Cadre CRUD, assignment, performance
- `pollDay.ts` — Poll day vote marking, turnout tracking

### 5.6 Analytics Service (Port 3005)

**Path:** `services/analytics-service/`

**Features:**
- Overview analytics (voter/part counts)
- Voter demographics (gender, age, religion, caste)
- Political leaning analysis
- Data quality metrics
- Age group distribution
- Polling station performance

### 5.7 Reporting Service (Port 3006)

**Path:** `services/reporting-service/`

**Features:**
- Report generation (PDF/Excel)
- DataCaffe.ai embed management (CRUD)
- Report templates
- Export in multiple formats

### 5.8 AI Analytics Service (Port 3007)

**Path:** `services/ai-analytics-service/`

**AI Features:**
- Turnout prediction
- Swing voter analysis
- Booth risk assessment
- Demographic insights
- Locality-level analysis
- Competitor analysis
- Local issues analysis
- Voting pattern predictions
- Actionable recommendations

### 5.9 Super Admin Service

**Path:** `services/super-admin-service/`

**Features:**
- Super admin authentication
- Tenant CRUD (create, update, suspend, delete)
- License and subscription management
- Feature flag management
- AI provider configuration
- System-wide configuration
- Platform audit logs

---

## 6. Database Architecture

### 6.1 Core Database Schema (`prisma/core/schema.prisma`)

**Models:**

| Model | Purpose |
|-------|---------|
| `SuperAdmin` | Platform super admin accounts |
| `SystemConfig` | Platform-wide settings (key-value) |
| `Tenant` | Tenant organizations (parties, candidates, EMCs) |
| `TenantFeature` | Per-tenant feature flag enablement |
| `FeatureFlag` | Global feature definitions |
| `TenantSession` | Login session tracking |
| `TenantLicense` | Subscription/license management |
| `LicensePlan` | Pricing plans (Free, Starter, Professional, Enterprise) |
| `Invitation` | User invitation tracking |
| `AIProvider` | AI service provider configs |
| `AIFeature` | AI feature definitions |
| `AICreditPackage` | AI credit pricing |
| `WebsiteTemplate` | Website page templates |
| `ECIntegrationConfig` | Election Commission API config |
| `PlatformAuditLog` | System-wide audit trail |
| `AIAdminAlert` | Admin notification alerts |

### 6.2 Tenant Database Schema (`prisma/tenant/schema.prisma`)

**User & Auth Models:**

| Model | Purpose |
|-------|---------|
| `User` | Tenant users (all roles) |
| `RefreshToken` | JWT refresh token storage |
| `OTP` | One-time password for resets |

**Election Models:**

| Model | Purpose |
|-------|---------|
| `Election` | Elections/campaigns |
| `Constituency` | Electoral constituencies |
| `Part` | Polling station/booth division |
| `Section` | Voting sections within parts |
| `Booth` | Physical polling booth |

**Voter Models:**

| Model | Purpose |
|-------|---------|
| `Voter` | Comprehensive voter profiles |
| `Family` | Voter family groupings |
| `Religion` | Religion master data |
| `CasteCategory` | Caste category (General, OBC, SC, ST) |
| `Caste` | Caste master data |
| `SubCaste` | Sub-caste master data |
| `Language` | Language master data |
| `VoterCategory` | Custom voter categories |
| `VoterScheme` | Government beneficiary schemes |

**Cadre & Operations Models:**

| Model | Purpose |
|-------|---------|
| `Cadre` | Field workers/volunteers |
| `CadreAssignment` | Cadre-to-part assignments |
| `BoothAgent` | BLA-2 (Booth Level Agent) |
| `BoothCommittee` | Booth committee members |
| `PollDayVote` | Real-time vote tracking |

**Campaign Models:**

| Model | Purpose |
|-------|---------|
| `Candidate` | Election candidates |
| `CandidateDocument` | Candidate documents/certificates |
| `CandidateSocialMedia` | Social media profiles |
| `BattleCard` | Competitive analysis cards |
| `Party` | Political party master data |
| `Nomination` | Candidature nominations |

**Survey & Feedback Models:**

| Model | Purpose |
|-------|---------|
| `Survey` | Opinion surveys |
| `SurveyResponse` | Survey answers |
| `Feedback` | Voter/citizen feedback |

**Financial Models:**

| Model | Purpose |
|-------|---------|
| `FundAccount` | Fund accounts (bank, UPI, wallet) |
| `Donation` | Monetary contributions |
| `Expense` | Campaign spending |
| `FundTransaction` | Financial transaction log |

**Inventory Models:**

| Model | Purpose |
|-------|---------|
| `InventoryCategory` | Hierarchical item categories |
| `InventoryItem` | Physical items with stock levels |
| `InventoryMovement` | Stock in/out/adjustment records |
| `InventoryAllocation` | Item allocation to events/locations |

**Communication Models:**

| Model | Purpose |
|-------|---------|
| `Notification` | System notifications |
| `Conversation` | Chat conversations |
| `ConversationMessage` | Chat messages |
| `Event` | Events/meetings/rallies |
| `EventAttendee` | Event participants |
| `EventResource` | Event materials |

**Content & News Models:**

| Model | Purpose |
|-------|---------|
| `News` | Parsed news articles |
| `NewsAnalysis` | AI analysis of news |
| `Action` | Actionable items from news |
| `ActionPlan` | Detailed action plans |
| `PartyLine` | Official party positions |
| `SpeechPoint` | Campaign speech points |
| `CampaignSpeech` | Full campaign speeches |
| `Broadcast` | Mass communication broadcasts |

**Other Models:**

| Model | Purpose |
|-------|---------|
| `Website` | Tenant website instances |
| `WebsitePage` | Website pages |
| `AppBanner` | In-app banners |
| `Report` | Generated reports |
| `AIAnalyticsResult` | AI analysis results cache |
| `VoterSlipTemplate` | Voter slip print templates |
| `ECIntegration` | EC data sync config |
| `ECSyncLog` | EC sync history |
| `AuditLog` | Tenant-level audit trail |

### 6.3 Key Enums

| Enum | Values |
|------|--------|
| `UserRole` | SUPER_ADMIN, TENANT_ADMIN, CENTRAL_ADMIN, CONSTITUENCY_ADMIN, CAMPAIGN_MANAGER, COORDINATOR, SECTOR_OFFICER, BOOTH_INCHARGE, VOLUNTEER, AGENT, POLLING_AGENT, COUNTING_AGENT, CANDIDATE, CANDIDATE_ADMIN, EMC_ADMIN, EMC_MANAGER, EMC_OPERATOR |
| `ElectionType` | ASSEMBLY, PARLIAMENT, LOCAL_BODY, PANCHAYAT, MUNICIPAL, BY_ELECTION |
| `ElectionStatus` | DRAFT, ACTIVE, COMPLETED, ARCHIVED |
| `Gender` | MALE, FEMALE, OTHER |
| `PoliticalLeaning` | LOYAL, SWING, OPPOSITION, UNKNOWN |
| `InfluenceLevel` | HIGH, MEDIUM, LOW, NONE |
| `VulnerabilityType` | CRITICAL, SENSITIVE, HYPERSENSITIVE, NONE |
| `TenantType` | POLITICAL_PARTY, INDIVIDUAL_CANDIDATE, ELECTION_MANAGEMENT |
| `TenantStatus` | ACTIVE, SUSPENDED, PENDING, EXPIRED, TRIAL |
| `FundTransactionType` | DONATION, EXPENSE, TRANSFER, REFUND, ADJUSTMENT |
| `DatabaseType` | SHARED, DEDICATED_MANAGED, DEDICATED_SELF_HOSTED |
| `EventStatus` | DRAFT, SCHEDULED, ONGOING, COMPLETED, CANCELLED, POSTPONED |
| `NotificationStatus` | DRAFT, SCHEDULED, SENT, CANCELLED |
| `ConversationType` | DIRECT, GROUP, BROADCAST, SUPPORT |

---

## 7. Frontend Applications

### 7.1 Main Web App (`apps/web/`)

**Entry:** `src/main.tsx` → `src/App.tsx`

**Layouts:**
- `AuthLayout` — Login/register pages (unauthenticated)
- `DashboardLayout` — Main app with sidebar navigation (authenticated)

**Key Dependencies:**
- React Router v6 for routing
- Axios with interceptors for API calls
- TanStack Query for data fetching/caching
- Zustand for client state persistence
- React Hook Form + Zod for forms

### 7.2 Super Admin Portal (`apps/super-admin/`)

**Entry:** `src/main.tsx`

**Pages:**
- Dashboard — Platform overview, tenant stats, system health
- Tenants — CRUD, detail view, feature management
- Features — Global feature flag management
- Licenses — Subscription plan management
- AI Features — AI capability configuration
- AI Credits — Credit packages and pricing
- AI Providers — Provider API key management
- EC Integration — Election Commission sync config
- Invitations — Platform invitation management
- Actions — System action tracking
- News — Platform news management

---

## 8. All Pages & Routes

### Main Web App (37+ Pages)

| Page | File | Purpose |
|------|------|---------|
| Login | `LoginPage.tsx` | User authentication |
| Register | `RegisterPage.tsx` | New user registration |
| Dashboard | `DashboardPage.tsx` | Main dashboard with stats and charts |
| Elections | `ElectionsPage.tsx` | List and manage elections |
| Election Detail | `ElectionDetailPage.tsx` | Single election view with tabs |
| Voters | `VotersPage.tsx` | Voter database with search/filter |
| Voter Detail | `VoterDetailPage.tsx` | Individual voter profile |
| Voter Slip | `VoterSlipPage.tsx` | Generate voter slips for printing |
| Parts | `PartsPage.tsx` | Polling station/booth divisions |
| Add Part | `AddPartPage.tsx` | Create new part |
| Part Map | `PartMapPage.tsx` | Geographic map view of parts |
| Sections | `SectionsPage.tsx` | Manage voting sections |
| Booth Committee | `BoothCommitteePage.tsx` | Booth committee assignment |
| Vulnerability | `VulnerabilityPage.tsx` | Booth vulnerability assessment |
| BLA-2 | `BLA2Page.tsx` | Booth Level Agent assignment |
| Cadres | `CadresPage.tsx` | Field workforce management |
| Families | `FamiliesPage.tsx` | Family grouping management |
| Family Captain | `FamilyCaptainPage.tsx` | Family captain assignment |
| Master Data | `MasterDataPage.tsx` | Religions, castes, languages, etc. |
| Campaign | `CampaignPage.tsx` | Campaign management |
| Nominations | `NominationsPage.tsx` | Candidature tracking |
| Candidate Bio | `CandidateBioPage.tsx` | Candidate profile management |
| Poll Day | `PollDayPage.tsx` | Real-time poll day tracking |
| Analytics | `AnalyticsPage.tsx` | Voter analytics dashboard |
| AI Analytics | `AIAnalyticsPage.tsx` | AI-powered insights |
| AI Tools | `AIToolsPage.tsx` | AI feature tools |
| Locality Analysis | `LocalityAnalysisPage.tsx` | Locality-level analysis |
| Reports | `ReportsPage.tsx` | Report generation |
| DataCaffe | `DataCaffePage.tsx` | Embedded analytics dashboards |
| EC Data | `ECDataPage.tsx` | Election Commission data |
| Tenant News | `TenantNewsPage.tsx` | News feed with AI analysis |
| Tenant Actions | `TenantActionsPage.tsx` | Actionable items from news |
| Funds | `FundsPage.tsx` | Fund management (donations, expenses) |
| Settings | `SettingsPage.tsx` | Tenant settings |
| App Banner | `AppBannerPage.tsx` | In-app banner management |
| Database Settings | `DatabaseSettingsPage.tsx` | Database connection config |
| Organization Setup | `OrganizationSetupPage.tsx` | Role-feature matrix setup |

### Super Admin Portal (14 Pages)

| Page | Purpose |
|------|---------|
| Dashboard | Platform overview, tenant stats |
| Tenants | Tenant CRUD and management |
| Tenant Detail | Individual tenant settings |
| Features | Global feature flags |
| Licenses | Subscription management |
| AI Features | AI capability config |
| AI Credits | Credit package management |
| AI Providers | Provider configuration |
| EC Integration | Election Commission setup |
| Invitations | Platform invitations |
| Actions | System actions |
| News | Platform news |
| Login | Super admin authentication |
| Register | Super admin registration |

---

## 9. UI Component Library

Built on **Radix UI** primitives with **shadcn/ui** patterns:

| Component | File | Purpose |
|-----------|------|---------|
| Accordion | `accordion.tsx` | Collapsible content sections |
| Avatar | `avatar.tsx` | User profile images |
| Badge | `badge.tsx` | Status/label badges |
| Button | `button.tsx` | Action buttons (variants: default, destructive, outline, secondary, ghost, link) |
| Card | `card.tsx` | Content containers |
| Checkbox | `checkbox.tsx` | Boolean input |
| Dialog | `dialog.tsx` | Modal dialogs |
| Dropdown Menu | `dropdown-menu.tsx` | Context menus |
| Input | `input.tsx` | Text input fields |
| Label | `label.tsx` | Form labels |
| Popover | `popover.tsx` | Floating content |
| Progress | `progress.tsx` | Progress bars |
| Select | `select.tsx` | Dropdown selection |
| Skeleton | `skeleton.tsx` | Loading placeholders |
| Switch | `switch.tsx` | Toggle switches |
| Table | `table.tsx` | Data tables |
| Tabs | `tabs.tsx` | Tab navigation |
| Textarea | `textarea.tsx` | Multiline text input |
| Tooltip | `tooltip.tsx` | Hover information |

**Custom Components:**
| Component | Purpose |
|-----------|---------|
| `BulkUpload.tsx` | Excel-based bulk data import with template download, validation, preview |
| `ErrorBoundary.tsx` | React error boundary for graceful error handling |
| `PageLoader.tsx` | Full-page loading spinner |
| `FundAccountsList.tsx` | Fund accounts list with CRUD |
| `DonationsList.tsx` | Donations list with filtering |
| `ExpensesList.tsx` | Expenses list with approval workflow |
| `TransactionsList.tsx` | Financial transaction history |
| `CreateDonationDialog.tsx` | New donation entry form |
| `CreateExpenseDialog.tsx` | New expense entry form |
| `CreateFundAccountDialog.tsx` | New fund account creation |

---

## 10. State Management

### Zustand Stores (Client State)

**Auth Store** (`store/auth.ts`)
```
- user: { id, tenantId, role, permissions, ... }
- accessToken: string
- refreshToken: string
- isAuthenticated: boolean
- Persisted to localStorage as 'electioncaffe-auth'
```

**Election Store** (`store/election.ts`)
```
- currentElection: Election object
- elections: Election[]
- selectedElectionId: string
- Persisted as 'electioncaffe-election'
```

**Tenant Store** (`store/tenant.ts`)
```
- branding: { logo, colors, fonts, ... }
- isLoading, error
- Persisted as 'electioncaffe-tenant'
```

### TanStack Query (Server State)
- Automatic caching and background revalidation
- Query invalidation on mutations
- 5-minute stale time for feature data
- 30-second refetch interval for dashboards
- Optimistic updates for mutations

---

## 11. Authentication & Authorization

### Authentication Flow
1. User submits email/mobile + password
2. Auth service validates credentials (bcrypt comparison)
3. JWT access token (15min) + refresh token (7d) issued
4. Tokens stored in localStorage via Zustand persist
5. Axios interceptor attaches token to all API requests
6. On 401 response, auto-refresh token or redirect to login

### Key Auth Features
- Email or mobile-based login
- Password hashing with bcryptjs
- JWT with HS256 algorithm
- Token refresh rotation
- OTP-based password reset
- Invitation-based onboarding (token-based)
- Session tracking (device, IP, last activity)

### Security Middleware
- Helmet for security headers
- Rate limiting: 300 req/15min (general), 10 req/15min (auth)
- CORS with configurable origins
- JSON body size limit (10MB)
- License enforcement middleware

---

## 12. User Roles & Permissions

### Role Hierarchy

**Platform Level:**
- `SUPER_ADMIN` — Full platform access, tenant management

**Tenant Level:**
- `TENANT_ADMIN` — Full tenant access
- `CENTRAL_ADMIN` — Campaign coordination across constituencies

**Constituency Level:**
- `CONSTITUENCY_ADMIN` — Constituency-wide management
- `CAMPAIGN_MANAGER` — Campaign execution

**Field Level:**
- `COORDINATOR` — Area coordination
- `SECTOR_OFFICER` — Sector management
- `BOOTH_INCHARGE` — Polling booth management
- `VOLUNTEER` — General volunteer tasks

**Polling Operations:**
- `POLLING_AGENT` — Polling station representative
- `COUNTING_AGENT` — Vote counting observer

**Candidate Management:**
- `CANDIDATE` — Election candidate
- `CANDIDATE_ADMIN` — Candidate staff

**Election Commission:**
- `EMC_ADMIN` — EC admin operations
- `EMC_MANAGER` — EC management
- `EMC_OPERATOR` — EC data operations

### Feature Access Control
- Global feature flags (enable/disable per platform)
- Per-tenant feature enablement
- Role-feature matrix mapping
- Per-user feature overrides
- Organization setup page for configuring role-feature access

---

## 13. API Endpoints Reference

### Auth Endpoints (`/api/auth/`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/login` | User login |
| POST | `/register` | User registration |
| POST | `/refresh-token` | Refresh JWT token |
| POST | `/logout` | User logout |
| GET | `/profile` | Get current user profile |
| PUT | `/profile` | Update user profile |
| POST | `/change-password` | Change password |
| POST | `/forgot-password` | Initiate password reset |
| POST | `/reset-password` | Complete password reset |
| POST | `/verify-otp` | Verify OTP code |

### User Management (`/api/auth/users/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List all users (with pagination) |
| GET | `/:id` | Get user by ID |
| PUT | `/:id` | Update user |
| DELETE | `/:id` | Delete user |
| PUT | `/:id/role` | Update user role |

### Invitation Endpoints (`/api/auth/invitations/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List invitations |
| POST | `/` | Create invitation |
| POST | `/:id/resend` | Resend invitation |
| POST | `/accept` | Accept invitation |
| GET | `/validate/:token` | Validate invitation token |

### Election Endpoints (`/api/elections/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List elections |
| POST | `/` | Create election |
| GET | `/:id` | Get election detail |
| PUT | `/:id` | Update election |
| DELETE | `/:id` | Delete election |
| POST | `/:id/lock` | Lock election |
| POST | `/:id/unlock` | Unlock election |

### Candidate Endpoints (`/api/elections/candidates/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List candidates |
| POST | `/` | Create candidate |
| GET | `/:id` | Get candidate detail |
| PUT | `/:id` | Update candidate |
| DELETE | `/:id` | Delete candidate |
| POST | `/:id/documents` | Upload candidate documents |
| POST | `/:id/social-media` | Add social media profiles |
| POST | `/:id/battle-card` | Create battle card |

### Part/Booth Endpoints (`/api/elections/parts/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List parts |
| POST | `/` | Create part |
| GET | `/:id` | Get part detail |
| PUT | `/:id` | Update part |
| DELETE | `/:id` | Delete part |
| PUT | `/:id/vulnerability` | Set vulnerability |
| PUT | `/:id/bla2` | Assign BLA-2 agent |
| GET | `/:id/booth-committee` | Get booth committee |
| POST | `/:id/booth-committee` | Set booth committee |

### Voter Endpoints (`/api/voters/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List voters (pagination, filters) |
| POST | `/` | Create voter |
| GET | `/:id` | Get voter detail |
| PUT | `/:id` | Update voter |
| DELETE | `/:id` | Delete voter |
| POST | `/bulk` | Bulk create voters |

### Family Endpoints (`/api/voters/families/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List families |
| POST | `/` | Create family |
| GET | `/:id` | Get family detail |
| PUT | `/:id` | Update family |
| PUT | `/:id/captain` | Assign family captain |
| POST | `/:id/members` | Add family members |

### Cadre Endpoints (`/api/cadres/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List cadres |
| POST | `/` | Create cadre |
| GET | `/:id` | Get cadre detail |
| PUT | `/:id` | Update cadre |
| DELETE | `/:id` | Delete cadre |
| POST | `/:id/assign` | Assign cadre to part |
| POST | `/bulk` | Bulk import cadres |

### Poll Day Endpoints (`/api/cadres/poll-day/`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/vote` | Mark a vote |
| GET | `/turnout` | Get turnout data |
| GET | `/stats` | Get poll day statistics |

### Analytics Endpoints (`/api/analytics/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/overview` | Overview statistics |
| GET | `/demographics` | Voter demographics |
| GET | `/political-leaning` | Political leaning distribution |
| GET | `/data-quality` | Data quality metrics |
| GET | `/age-distribution` | Age group analysis |

### AI Analytics Endpoints (`/api/ai/`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/turnout-prediction` | Predict turnout |
| POST | `/swing-analysis` | Analyze swing voters |
| POST | `/booth-risk` | Assess booth risk |
| POST | `/demographic-insights` | Get demographic insights |
| POST | `/locality-analysis` | Locality-level analysis |
| POST | `/competitor-analysis` | Competitor analysis |
| GET | `/features` | List AI features |
| GET | `/credits` | Check credit balance |
| GET | `/usage` | View usage history |

### Reporting Endpoints (`/api/reports/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List reports |
| POST | `/generate` | Generate report |
| GET | `/:id` | Download report |
| GET | `/datacaffe/embeds` | List DataCaffe embeds |
| POST | `/datacaffe/embeds` | Create embed |
| PUT | `/datacaffe/embeds/:id` | Update embed |
| DELETE | `/datacaffe/embeds/:id` | Delete embed |

### Fund Management Endpoints (`/api/auth/funds/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/accounts` | List fund accounts |
| POST | `/accounts` | Create fund account |
| PUT | `/accounts/:id` | Update fund account |
| DELETE | `/accounts/:id` | Delete fund account |
| GET | `/donations` | List donations |
| POST | `/donations` | Create donation |
| PUT | `/donations/:id` | Update donation |
| GET | `/expenses` | List expenses |
| POST | `/expenses` | Create expense |
| PUT | `/expenses/:id` | Update expense |
| PUT | `/expenses/:id/approve` | Approve expense |
| PUT | `/expenses/:id/reject` | Reject expense |
| GET | `/transactions` | List all transactions |
| GET | `/summary` | Fund summary/dashboard |

### Inventory Endpoints (`/api/auth/inventory/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| GET | `/items` | List items |
| POST | `/items` | Create item |
| PUT | `/items/:id` | Update item |
| POST | `/movements` | Create stock movement |
| GET | `/movements` | List movements |
| POST | `/allocations` | Create allocation |
| GET | `/allocations` | List allocations |
| GET | `/alerts` | Low stock alerts |

### News & Broadcast Endpoints (`/api/auth/news-broadcast/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/news` | List parsed news |
| POST | `/news/:id/analyze` | AI analyze news item |
| POST | `/news/:id/action-plan` | Generate action plan |
| POST | `/news/:id/party-line` | Generate party line |
| POST | `/news/:id/speech-points` | Generate speech points |
| POST | `/news/:id/campaign-speech` | Generate campaign speech |
| GET | `/broadcasts` | List broadcasts |
| POST | `/broadcasts` | Create broadcast |
| PUT | `/broadcasts/:id` | Update broadcast |

### Master Data Endpoints (`/api/elections/master-data/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/religions` | Religion CRUD |
| GET/POST | `/caste-categories` | Caste category CRUD |
| GET/POST | `/castes` | Caste CRUD |
| GET/POST | `/sub-castes` | Sub-caste CRUD |
| GET/POST | `/languages` | Language CRUD |
| GET/POST | `/parties` | Political party CRUD |
| GET/POST | `/voter-categories` | Voter category CRUD |
| GET/POST | `/voter-schemes` | Voter scheme CRUD |
| GET/POST | `/banners` | App banner CRUD |
| GET/POST | `/feedback` | Feedback CRUD |
| GET/POST | `/voting-histories` | Voting history CRUD |

---

## 14. Feature Catalog

### Core Features

| Feature | Description |
|---------|-------------|
| **Voter Management** | Full CRUD, demographics, families, schemes, categories, bulk import |
| **Election Management** | Create elections, manage candidates, parts, sections, booths |
| **Cadre Management** | Field worker management, assignment, performance tracking |
| **Dashboard** | Real-time stats, charts, election metrics |
| **Analytics** | Demographics, political leaning, data quality, age distribution |
| **Reports** | PDF/Excel generation, templates, DataCaffe embeds |

### Advanced Features

| Feature | Description |
|---------|-------------|
| **AI Analytics** | Turnout prediction, swing analysis, risk assessment, insights |
| **Poll Day Tracking** | Real-time vote marking, turnout monitoring via WebSocket |
| **Fund Management** | Accounts, donations, expenses, transactions, summaries |
| **Inventory Management** | Categories, items, stock movements, allocations, alerts |
| **News & Broadcast** | AI-parsed news, analysis, action plans, party lines, speeches |
| **EC Integration** | Election Commission data sync, validation |
| **DataCaffe.ai** | Embedded analytics dashboards |

### Platform Features

| Feature | Description |
|---------|-------------|
| **Multi-Tenancy** | Isolated databases, branding, custom domains, feature flags |
| **License Management** | Subscription plans, usage limits, quota enforcement |
| **Invitation System** | Token-based user onboarding |
| **Organization Setup** | Role-feature matrix, access control configuration |
| **Website Builder** | Tenant website page management |
| **Event Management** | Events, attendees, resources |
| **Internal Chat** | Conversations (direct, group, broadcast, support) |

---

## 15. Multi-Tenant System

### Tenant Types
- **POLITICAL_PARTY** — Multiple constituencies, candidates, full features
- **INDIVIDUAL_CANDIDATE** — Single constituency, focused features
- **ELECTION_MANAGEMENT** — Manages elections for others

### Tenant Status Lifecycle
`PENDING` → `TRIAL` → `ACTIVE` → `SUSPENDED` / `EXPIRED`

### Tenant Isolation
- **Database Isolation:** Each tenant gets a dedicated PostgreSQL database (`EC_<TenantSlug>`)
- **URL-based Detection:** Tenant identified by subdomain or dev port
- **JWT Context:** Tenant ID embedded in JWT claims
- **Header Propagation:** `x-tenant-id` header for service-to-service calls

### Tenant Branding
- Custom logo, colors, fonts
- Custom domain support
- Configurable via Settings page

### Feature Flag System
Feature flags per tenant:
- `voter_management`, `election_management`, `cadre_management`
- `analytics`, `ai_analytics`, `reporting`
- `fund_management`, `inventory_management`
- `ec_integration`, `datacaffe`
- `news_broadcast`, `website_builder`
- `event_management`, `internal_chat`

### License Enforcement
Free tier defaults (enforced via middleware):
- Max 5 users
- Max 1,000 voters
- Max 1 election
- Max 1 constituency
- Max 500 MB storage
- Max 1,000 API calls/day
- Max 100 API calls/hour

### Dev Port → Tenant Mapping

| Port | Tenant |
|------|--------|
| 5000/5173 | Default / Demo |
| 5180 | demo |
| 5181 | bjp-tn |
| 5182 | bjp-up |
| 5183 | aidmk-tn |
| 5177 | (extra) |

---

## 16. Real-Time Features (WebSocket)

### Socket.IO Namespaces

| Namespace | Events | Purpose |
|-----------|--------|---------|
| `/ws/poll-day` | `vote_marked`, `turnout_update` | Real-time voting and turnout |
| `/ws/cadres` | `location_update` | Cadre location tracking |
| `/ws/notifications` | `notification` | System notifications |

### WebSocket Event Constants
Defined in `packages/shared/src/constants/index.ts`:
- `WS_EVENTS.VOTE_MARKED`
- `WS_EVENTS.TURNOUT_UPDATE`
- `WS_EVENTS.CADRE_LOCATION`
- `WS_EVENTS.NOTIFICATION`

---

## 17. AI & Analytics

### AI-Powered Features

| Feature | Description |
|---------|-------------|
| Turnout Prediction | Predict voter turnout percentage per booth/part |
| Swing Voter Analysis | Identify and categorize swing voters |
| Booth Risk Assessment | Assess risk levels for polling stations |
| Demographic Insights | AI-generated demographic analysis |
| Locality Analysis | Neighborhood-level voter analysis |
| Competitor Analysis | Opposition strength assessment |
| Local Issues Analysis | Identify key local issues affecting votes |
| Voting Pattern Prediction | Predict voting patterns based on history |
| Campaign Speech Generation | AI-generated campaign speeches |
| Party Line Generation | Generate official party positions |
| News Analysis | AI analysis of news articles |
| Action Plan Generation | Generate actionable plans from news/data |

### Analytics Dashboards

| Dashboard | Metrics |
|-----------|---------|
| Overview | Total voters, parts, booths, elections |
| Demographics | Gender, age, religion, caste distributions |
| Political | Leaning distribution (Loyal/Swing/Opposition) |
| Data Quality | Completeness percentage, missing fields |
| Turnout | Real-time and historical turnout |
| Vulnerability | Booth vulnerability classification |

### AI Credit System
- Credits consumed per AI feature execution
- Credit packages for purchase
- Usage tracking and history
- Per-tenant credit balance
- AI provider configuration (multiple providers)

---

## 18. Fund Management

### Fund Accounts
- Types: Bank Account, UPI, Digital Wallet, Cash
- Track balance per account
- Account status management

### Donations
- Record donor information
- Categorize by type
- Verification workflow
- Receipt generation tracking

### Expenses
- Create expense requests
- Approval/rejection workflow
- Category-based tracking
- Receipt/proof attachment
- Budget tracking

### Transactions
- Automatic transaction log for all fund movements
- Types: Donation, Expense, Transfer, Refund, Adjustment
- Running balance calculation
- Filtering by date, type, account

---

## 19. Inventory Management

### Features
- **Categories:** Hierarchical item categorization
- **Items:** Track items with current stock levels, reorder points
- **Stock Movements:** Stock in, stock out, adjustments with reason tracking
- **Allocations:** Allocate items to events, track returns
- **Low Stock Alerts:** Automated alerts when stock falls below reorder point

---

## 20. Bulk Operations & File Uploads

### BulkUpload Component Features
1. **Template Download** — Pre-formatted Excel template with column descriptions and examples
2. **File Upload** — Drag-and-drop or file picker (XLSX format)
3. **Validation** — Per-row validation with error highlighting
4. **Preview** — Data preview before committing import
5. **Error Report** — Detailed error summary per row
6. **Success Summary** — Count of successful/failed records

### Supported Bulk Operations
- Voter bulk import (with demographic fields)
- Cadre bulk import
- Family bulk import
- Part creation
- Candidate import
- Inventory items

### File Size Limits
- Cadre uploads: 50MB max
- Election data: 10MB max
- General uploads via Multer middleware

---

## 21. Maps & Geographic Features

### Leaflet Integration
- Interactive map view of polling parts/booths
- Latitude/longitude coordinate tracking
- Part type classification (Urban, Rural, Semi-urban)
- School/polling station location pins
- Geographic clustering and visualization

---

## 22. Third-Party Integrations

### Election Commission (EC)
- Voter roll data synchronization
- Election data verification
- Sync status tracking and history
- Configurable API endpoint per tenant

### DataCaffe.ai
- Embedded analytics dashboards
- Custom embed CRUD management
- Data sync capabilities
- Template-based dashboard creation

### AI Providers
- Multiple provider support (configurable)
- API key management
- Model selection per feature
- Rate limit configuration
- Cost per token tracking

---

## 23. Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "E3001",
    "message": "Route not found"
  }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| E1001 | Authentication error |
| E2001 | Authorization error |
| E3001 | Route not found |
| E5001 | Internal server error |
| E5003 | Service unavailable / Rate limited |

### Frontend Error Handling
- Axios interceptor for 401 → auto logout/redirect
- ErrorBoundary component for React errors
- Toast notifications (Sonner) for user-facing errors
- Loading/error states in all data-fetching components

### Backend Error Handling
- Try-catch in all async route handlers
- Pino structured logging
- Middleware-based error handling
- Graceful degradation for service unavailability

---

## 24. Build & Deployment

### NPM Scripts (Root)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start all services + frontend concurrently |
| `npm run build` | Build all packages, services, and apps |
| `npm run start` | Start production servers |
| `npm run lint` | Run ESLint across all packages |
| `npm run clean` | Clean build artifacts |
| `npm run db:generate` | Generate Prisma clients |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Prisma Studio |

### Docker Deployment

**docker-compose.yml services:**
- PostgreSQL database
- API Gateway
- Auth Service
- Election Service
- Voter Service
- Cadre Service
- Analytics Service
- Reporting Service
- AI Analytics Service
- Web Frontend (Nginx)

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Core PostgreSQL connection |
| `TENANT_DATABASE_URL` | Tenant DB connection pattern |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `CORS_ORIGIN` | Allowed CORS origins |
| `NODE_ENV` | Environment (development/production) |
| `DATACAFFE_API_URL` | DataCaffe.ai API endpoint |
| `DATACAFFE_API_KEY` | DataCaffe.ai API key |
| `AI_PROVIDER_*` | AI provider credentials |
| `EC_API_*` | Election Commission API config |

### Nginx Configuration
- Development: Proxy all `/api/*` to gateway:3000
- Production: Static file serving + API proxy + WebSocket upgrade

---

## 25. Hardcoded Values Audit

### CRITICAL — Database Credentials in Scripts

| File | Value | Fix |
|------|-------|-----|
| `enable-fund-inventory.js` | `postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore` | Move to `.env` |
| `reset-password.js` | `postgresql://postgres:postgres@localhost:5432/ElectionCaffe` | Move to `.env` |
| `list-all-users.js` | `postgresql://postgres:postgres@localhost:5432/ElectionCaffe` | Move to `.env` |
| `find-tenant-db.js` | `postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore` | Move to `.env` |
| `sync-tenants-to-core.js` | `postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore` | Move to `.env` |
| `verify-tenants.ts` | `postgresql://postgres:postgres@localhost:5432/` | Move to `.env` |
| `seed-cadres.ts` | `postgresql://postgres:postgres@localhost:5432/${dbName}` | Move to `.env` |

### CRITICAL — Hardcoded Passwords

| File | Value | Fix |
|------|-------|-----|
| `reset-password.js:10-11` | `admin@electioncaffe.com` / `admin123` | Use env vars |
| `seed.ts:116-117` | `admin123` / `SuperAdmin@123` | Use env vars |
| `seed-quick.ts:20` | `admin123` | Use env vars |
| `seed-cadres.ts:83` | `$2a$10$dummyhashedpassword...` | Generate properly |

### HIGH — Hardcoded Email Addresses

| File | Value |
|------|-------|
| `enable-fund-inventory.js:99` | `admin.bjp-tn@electioncaffe.com` |
| `reset-password.js:10` | `admin@electioncaffe.com` |
| `sync-tenants-to-core.js:81` | `admin.tn.bjp@electioncaffe.com` |
| `seed.ts:123,140,209` | `superadmin@electioncaffe.com`, `admin@electioncaffe.com`, `admin@demo.electioncaffe.com` |
| `seed-core.ts:334` | `superadmin@electioncaffe.com` |

### HIGH — Hardcoded Ports in Vite Configs

| File | Value | Fix |
|------|-------|-----|
| `apps/web/vite.config.ts:13` | Port `5000` | Use env var |
| `apps/web/vite.config.ts:18,22` | `http://localhost:3000` | Use env var |
| `apps/super-admin/vite.config.ts:13` | Port `5174` | Use env var |
| `apps/super-admin/vite.config.ts:16` | `http://localhost:3000` | Use env var |

### HIGH — Hardcoded Tenant Configs

| File | Value |
|------|-------|
| `apps/web/src/utils/tenant.ts:12-26` | Tenant port mappings (5180-5183) |
| `apps/web/src/utils/tenant.ts:104` | `https://${slug}.electioncaffe.com` |
| `find-tenant-db.js:19,46` | Tenant slug `'tn-bjp'` |

### MEDIUM — Rate Limiting & Timeouts

| File | Value | Description |
|------|-------|-------------|
| `gateway/src/index.ts:70-71` | `15 * 60 * 1000`, `300` | General rate limit (300 req/15min) |
| `gateway/src/index.ts:78-79` | `15 * 60 * 1000`, `10` | Auth rate limit (10 req/15min) |
| `gateway/src/index.ts:56` | `'10mb'` | JSON body size limit |
| `hooks/useFeature.ts:13,42` | `5 * 60 * 1000` | Feature cache stale time (5min) |
| `super-admin/pages/DashboardPage.tsx:22` | `30000` | Dashboard refetch interval (30s) |

### MEDIUM — License Free Tier Defaults

| File | Value | Description |
|------|-------|-------------|
| `middleware/licenseEnforcement.ts:95-102` | `maxUsers: 5` | Free tier user limit |
| | `maxVoters: 1000` | Free tier voter limit |
| | `maxElections: 1` | Free tier election limit |
| | `maxConstituencies: 1` | Free tier constituency limit |
| | `maxStorageMB: 500` | Free tier storage limit |
| | `maxApiPerDay: 1000` | Free tier daily API limit |
| | `maxApiPerHour: 100` | Free tier hourly API limit |

### LOW — Color Constants (Centralized, Acceptable)

Located in `packages/shared/src/constants/index.ts`:
- Vulnerability type colors: `#808080`, `#FF4D4F`, `#FA8C16`, `#FADB14`, `#A8071A`, `#1890FF`, `#722ED1`
- Chart palette: `#1890FF`, `#52C41A`, `#FAAD14`, `#F5222D`, `#722ED1`, etc.
- KPI colors: `#1890FF`, `#52C41A`, `#FAAD14`, `#F5222D`, `#13C2C2`, `#722ED1`

### LOW — JWT Configuration (Centralized)

Located in `packages/shared/src/constants/index.ts`:
- Access token expiry: `'15m'`
- Refresh token expiry: `'7d'`
- Algorithm: `'HS256'`

### LOW — Pagination Defaults (Centralized)

Located in `packages/shared/src/constants/index.ts`:
- `DEFAULT_PAGE: 1`
- `DEFAULT_LIMIT: 10`
- `MAX_LIMIT: 100`

### LOW — Database Connection Defaults (Have env fallback)

Located in `packages/database/src/clients/`:
- `DB_HOST: 'localhost'` (falls back to env)
- `DB_PORT: 5432` (falls back to env)
- `DB_USER: 'postgres'` (falls back to env)
- `DB_PASSWORD: 'postgres'` (falls back to env)
- `MAX_CACHED_CONNECTIONS: 50`
- `CONNECTION_TTL_MS: 30 * 60 * 1000` (30 minutes)

---

## 26. Key Statistics

| Metric | Value |
|--------|-------|
| Total Files | 735+ |
| TypeScript/JavaScript Files | 250+ |
| React Components | 80+ |
| Pages (Web App) | 37+ |
| Pages (Super Admin) | 14 |
| Backend Microservices | 9 |
| API Endpoints | 150+ |
| Database Models (per tenant) | 30+ |
| Core Database Models | 16 |
| User Roles | 17 |
| UI Components (Radix) | 20+ |
| Zustand Stores | 3 |
| Feature Flags | 14+ |
| Enums | 15+ |
| Seed Files | 10+ |
| Configuration Files | 25+ |
| Documentation Files | 15+ |
| Docker Services | 10 |
| npm Workspace Packages | 14 |

---

## Appendix: Port Assignment Map

| Port | Service |
|------|---------|
| 3000 | API Gateway |
| 3001 | Auth Service |
| 3002 | Election Service |
| 3003 | Voter Service |
| 3004 | Cadre Service |
| 3005 | Analytics Service |
| 3006 | Reporting Service |
| 3007 | AI Analytics Service |
| 3008 | Super Admin Service |
| 5000 | Web App (dev) |
| 5173 | Web App (Vite default) |
| 5174 | Super Admin Portal (dev) |
| 5180 | Demo Tenant |
| 5181 | BJP-TN Tenant |
| 5182 | BJP-UP Tenant |
| 5183 | AIDMK-TN Tenant |
| 5432 | PostgreSQL |

---

*This documentation was auto-generated from a full codebase analysis. For specific implementation details, refer to the source code files referenced throughout.*
