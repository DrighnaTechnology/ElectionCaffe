# ElectionSoft - Comprehensive Product Requirements Document (PRD)

**Version:** 2.0
**Date:** January 20, 2026
**Document Status:** Complete
**Product:** ElectionSoft - Election Management Platform

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [Market Analysis](#3-market-analysis)
4. [User Personas & Stakeholders](#4-user-personas--stakeholders)
5. [Product Architecture](#5-product-architecture)
6. [Core Features & Functional Requirements](#6-core-features--functional-requirements)
7. [Data Model & Information Architecture](#7-data-model--information-architecture)
8. [User Experience & Interface Design](#8-user-experience--interface-design)
9. [Technical Requirements](#9-technical-requirements)
10. [Security & Compliance](#10-security--compliance)
11. [Performance & Scalability](#11-performance--scalability)
12. [Integration Requirements](#12-integration-requirements)
13. [Deployment & Operations](#13-deployment--operations)
14. [Analytics & Reporting](#14-analytics--reporting)
15. [Mobile Strategy](#15-mobile-strategy)
16. [Roadmap & Phases](#16-roadmap--phases)
17. [Success Metrics](#17-success-metrics)
18. [Risk Assessment](#18-risk-assessment)
19. [Appendix](#19-appendix)

---

## 1. Executive Summary

### 1.1 Product Overview

ElectionSoft is a comprehensive, multi-tenant election management platform designed to revolutionize how political parties, candidates, and election management companies organize, execute, and analyze electoral campaigns. The platform combines traditional voter database management with cutting-edge AI analytics, real-time tracking, and microservices architecture to deliver a scalable, enterprise-grade solution.

### 1.2 Business Objectives

- **Primary Goal**: Become the leading election management platform in India, serving 1,000+ political organizations within 3 years
- **Revenue Target**: Generate ₹50 Cr ARR by Year 3 through SaaS subscriptions
- **Market Position**: Establish as the industry standard for data-driven campaign management
- **Innovation Leadership**: Pioneer AI-driven election analytics and predictions

### 1.3 Key Value Propositions

| Stakeholder | Value Delivered |
|-------------|-----------------|
| **Political Parties** | Complete voter intelligence, cadre coordination, and poll day execution platform |
| **Individual Candidates** | Affordable, easy-to-use campaign management without technical expertise |
| **Election Management Companies** | White-label solution to serve multiple clients with dedicated infrastructure |
| **Campaign Managers** | Real-time dashboards, predictive analytics, and actionable insights |
| **Field Workers (Cadres)** | Mobile-first interface for on-ground data collection and voter engagement |

### 1.4 Product Differentiation

**Unique Selling Points:**

1. **Dual Architecture**: Offers both monolithic (ElectPro) and microservices (ElectionCaffe) versions for different market segments
2. **AI-Powered Analytics**: Machine learning models for turnout prediction, swing voter identification, and booth risk assessment
3. **Comprehensive Family Intelligence**: Advanced family grouping with cross-booth relationship mapping
4. **Multi-Tenant Flexibility**: Choice between shared database, dedicated managed, or self-hosted infrastructure
5. **News Intelligence System**: Automated news parsing, AI analysis, and party-line generation
6. **Integrated Fund Management**: Complete financial tracking for campaign compliance
7. **DataCaffe Integration**: Embedded analytics dashboards from external BI platform
8. **Real-time Poll Day Operations**: Live vote marking, turnout tracking, and family status monitoring

### 1.5 Target Market Segments

#### Primary Markets (Year 1-2)
1. **State-Level Political Parties**:
   - Market Size: 50+ state parties in India
   - Target: 25 parties in first 2 years
   - ARPU: ₹15-25 lakhs/year

2. **Individual Candidates (Assembly/Parliament)**:
   - Market Size: 4,000+ assembly seats, 543 parliamentary seats
   - Target: 500 candidates in first 2 years
   - ARPU: ₹50,000-2 lakhs/year

3. **Election Management Companies**:
   - Market Size: 100+ companies
   - Target: 10 companies in first 2 years
   - ARPU: ₹50 lakhs-1 Cr/year

#### Secondary Markets (Year 2-3)
4. **National Political Parties**: Enterprise deployments
5. **Municipal/Local Body Elections**: Volume market
6. **Panchayat Elections**: Rural penetration

### 1.6 Success Criteria

**Quantitative Metrics:**
- **User Adoption**: 100,000+ active users by Year 2
- **Voter Data Management**: 50 million+ voter records processed
- **Poll Day Coverage**: 50,000+ booths monitored in elections
- **Platform Uptime**: 99.9% availability during active elections
- **Mobile MAU**: 25,000+ field workers actively using mobile app
- **Customer Retention**: 85%+ annual renewal rate

**Qualitative Metrics:**
- Industry recognition as leading election tech platform
- Case studies of election wins attributed to platform use
- Positive media coverage and thought leadership
- Strategic partnerships with political consulting firms

---

## 2. Product Vision & Strategy

### 2.1 Long-Term Vision (5 Years)

**"To become the operating system for democratic elections across India and emerging democracies worldwide, empowering political organizations with data-driven decision making and ethical voter engagement tools."**

### 2.2 Product Mission

Democratize access to world-class election management technology by providing:
- **Accessibility**: Affordable pricing tiers from individual candidates to national parties
- **Usability**: Intuitive interfaces requiring minimal technical training
- **Scalability**: Infrastructure that grows from ward-level to national elections
- **Intelligence**: AI-powered insights previously available only to resource-rich organizations
- **Compliance**: Built-in safeguards for election regulations and data privacy

### 2.3 Strategic Pillars

#### Pillar 1: Data-Driven Campaign Management
- Comprehensive voter database with 50+ attributes per voter
- Family relationship mapping for household-level targeting
- Demographic segmentation (religion, caste, age, gender, language)
- Political categorization (loyal, swing, opposition, unknown)
- Influence level tracking for community leaders

#### Pillar 2: Field Force Coordination
- Hierarchical cadre management (coordinators → booth incharge → volunteers)
- Real-time GPS tracking and location history
- Performance metrics and gamification
- Task assignment and completion tracking
- Mobile-first data collection tools

#### Pillar 3: Poll Day Excellence
- Live vote marking with GPS verification
- Hourly turnout tracking vs. targets
- Family voting status monitoring
- Booth agent coordination
- Problem escalation workflows

#### Pillar 4: AI & Predictive Analytics
- Turnout prediction models
- Swing voter identification algorithms
- Booth-level risk assessment
- Opposition strength analysis
- Resource allocation optimization

#### Pillar 5: Communication & Outreach
- Multi-channel campaigns (SMS, WhatsApp, Voice, Email)
- Survey system with conditional logic
- Personalized voter communication
- News monitoring and party-line generation
- Social media integration

### 2.4 Product Strategy Framework

#### Build vs. Buy Decisions

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Core Platform | **Build** | IP creation, competitive differentiation |
| Database & ORM | **Buy** (Prisma) | Mature, type-safe, well-maintained |
| UI Components | **Buy** (Radix UI + shadcn) | Accessibility, customization, speed |
| SMS/WhatsApp | **Buy** (MSG91) | Regulatory compliance, delivery rates |
| AI Models | **Hybrid** | Custom training on open-source models |
| Maps | **Buy** (Mapbox/Google) | Complex, well-solved problem |
| Analytics | **Partner** (DataCaffe) | Strategic partnership opportunity |
| Payment Gateway | **Buy** (Razorpay) | PCI compliance complexity |

#### Technology Stack Decisions

**Backend:**
- **Language**: TypeScript (type safety, developer productivity)
- **Runtime**: Node.js (JavaScript ecosystem, real-time capabilities)
- **Framework**: Express.js (maturity, flexibility, middleware ecosystem)
- **ORM**: Prisma (type safety, multi-database support, migrations)
- **Database**: PostgreSQL (ACID compliance, JSON support, full-text search)
- **Cache**: Redis (speed, pub/sub for real-time features)
- **Search**: Meilisearch (speed, typo tolerance, easy deployment)

**Frontend:**
- **Framework**: React 18 (ecosystem, talent availability, performance)
- **Build Tool**: Vite (speed, modern features, HMR)
- **Styling**: Tailwind CSS (utility-first, customization, consistency)
- **State**: Zustand + TanStack Query (simplicity, server state management)
- **Forms**: React Hook Form + Zod (performance, validation)

**Architecture:**
- **Monolith (ElectPro)**: For small-to-medium deployments, faster time-to-market
- **Microservices (ElectionCaffe)**: For enterprise clients requiring scale and isolation

### 2.5 Go-to-Market Strategy

#### Phase 1: Early Adopters (Months 1-6)
- **Target**: 10 pilot customers (3 parties, 5 candidates, 2 EMCs)
- **Pricing**: 50% discount for feedback and case studies
- **Focus**: Product refinement, proof of concept
- **Success**: 8/10 customers renew at full price

#### Phase 2: Market Entry (Months 7-18)
- **Target**: 100 paying customers
- **Pricing**: Freemium model with premium features
- **Focus**: Word-of-mouth, case study marketing, election wins
- **Success**: 3 major state elections covered

#### Phase 3: Scale (Months 19-36)
- **Target**: 1,000 customers across all segments
- **Pricing**: Tiered pricing with enterprise custom deals
- **Focus**: Brand building, thought leadership, partnerships
- **Success**: Market leadership position established

### 2.6 Competitive Strategy

#### Direct Competitors
1. **i360 (USA)**: Republican party data platform
2. **NGP VAN (USA)**: Democratic party platform
3. **Shakr (India)**: Mobile-first election app
4. **Leadtech (India)**: Voter management platform

#### Competitive Advantages

| Aspect | ElectionSoft | Competitors |
|--------|--------------|-------------|
| **Architecture** | Dual (monolith + microservices) | Single architecture |
| **AI Analytics** | Built-in ML models | Basic reporting only |
| **Family Intelligence** | Cross-booth family tracking | Simple household grouping |
| **Multi-tenancy** | Flexible (shared/dedicated DB) | Rigid single-tenant |
| **News Intelligence** | Automated AI analysis | Manual processes |
| **Fund Management** | Integrated compliance tracking | Separate tools required |
| **Pricing** | India-specific tiers | Western pricing models |
| **Localization** | 22+ Indian languages | English/Hindi only |
| **Mobile** | Offline-first for rural areas | Online-dependent |

---

## 3. Market Analysis

### 3.1 Total Addressable Market (TAM)

**India Election Market:**

| Election Type | Frequency | Seats/Units | Candidates per Seat | Total Candidates | Avg. Spend/Candidate | Market Size |
|---------------|-----------|-------------|---------------------|------------------|----------------------|-------------|
| **Lok Sabha** | 5 years | 543 | 15 | 8,145 | ₹2 Cr | ₹16,290 Cr |
| **State Assembly** | 5 years | 4,120 | 12 | 49,440 | ₹50 lakhs | ₹24,720 Cr |
| **Local Bodies** | 5 years | 3,800 ULBs | 50,000+ wards | 250,000+ | ₹5 lakhs | ₹12,500 Cr |
| **Panchayat** | 5 years | 250,000+ | 3 million+ positions | 3,000,000+ | ₹50,000 | ₹15,000 Cr |

**Annual Market Size**: ₹13,702 Cr (₹68,510 Cr / 5 years)

**Software Market (% of Total Spend)**:
- Assuming 5% of campaign budgets allocated to software/data management
- **Annual Software TAM**: ₹685 Cr

### 3.2 Serviceable Addressable Market (SAM)

**Target Segments:**

1. **State Political Parties**:
   - 50 parties × ₹20 lakhs avg = **₹10 Cr/year**

2. **Assembly Candidates (Top 2 tiers)**:
   - 10,000 candidates × ₹1 lakh avg = **₹100 Cr/year**

3. **Parliamentary Candidates**:
   - 1,000 serious candidates × ₹5 lakhs avg = **₹50 Cr/year**

4. **Election Management Companies**:
   - 100 companies × ₹50 lakhs avg = **₹50 Cr/year**

5. **Local Body Elections**:
   - 50,000 municipal candidates × ₹25,000 avg = **₹125 Cr/year**

**Total SAM**: **₹335 Cr/year**

### 3.3 Serviceable Obtainable Market (SOM)

**Year 1 Target**: 2% of SAM = **₹6.7 Cr**
**Year 3 Target**: 15% of SAM = **₹50 Cr**
**Year 5 Target**: 30% of SAM = **₹100 Cr**

### 3.4 Market Trends

#### Macro Trends
1. **Digital Transformation of Politics**: Increasing tech adoption in campaigns
2. **Data-Driven Campaigning**: Shift from intuition to analytics
3. **Mobile-First India**: 750M+ smartphone users enabling field worker apps
4. **AI Adoption**: Growing acceptance of AI in decision-making
5. **Regulatory Scrutiny**: Increased focus on election spending transparency

#### Micro Trends
1. **Micro-Targeting**: Granular voter segmentation beyond demographics
2. **Real-Time Coordination**: Demand for live dashboards and instant updates
3. **Family-Based Campaigning**: Recognition of household voting patterns
4. **Cadre Accountability**: Performance tracking for field workers
5. **Video Content**: Short video messages for voter outreach

### 3.5 Customer Pain Points

#### Political Parties
1. **Data Fragmentation**: Voter data scattered across Excel sheets, paper records
2. **Cadre Coordination**: No visibility into field worker activities
3. **Poll Day Chaos**: Manual vote tracking, delayed turnout data
4. **Resource Wastage**: Inefficient allocation of campaign resources
5. **Post-Election Analysis**: Limited insights on what worked/didn't work

#### Individual Candidates
1. **High Cost**: Existing solutions priced for parties, not individuals
2. **Complexity**: Technical tools requiring IT expertise
3. **Vendor Lock-in**: Dependence on local data operators
4. **Data Quality**: Inaccurate, outdated voter information
5. **Limited Features**: Basic tools lacking advanced capabilities

#### Election Management Companies
1. **Client Management**: Serving multiple clients with separate systems
2. **White-Labeling**: Need for branded solutions
3. **Data Isolation**: Ensuring client data security and separation
4. **Scalability**: Systems failing during peak election periods
5. **Profitability**: High operational costs eating into margins

### 3.6 Market Barriers & Entry Strategy

#### Barriers to Entry
1. **Trust**: Political data is sensitive; requires reputation building
2. **Network Effects**: Parties prefer platforms used by peers
3. **Switching Costs**: Migration from existing systems is painful
4. **Regulatory**: Election Commission regulations on data handling
5. **Localization**: Support for 22+ languages and regional variations

#### Entry Strategy
1. **Pilot Program**: Free/discounted trials for influential early adopters
2. **Case Studies**: Document election wins to build credibility
3. **Data Migration**: Offer free data migration from Excel/legacy systems
4. **Training**: Comprehensive onboarding and support
5. **Partnership**: Collaborate with political consulting firms
6. **Compliance**: Proactive adherence to EC guidelines

---

## 4. User Personas & Stakeholders

### 4.1 Primary User Personas

#### Persona 1: The Campaign Manager (Rajesh)

**Demographics:**
- Age: 35-50
- Education: Graduate/Post-graduate
- Role: Campaign strategist for state-level political party
- Location: State capital city
- Tech Savviness: Medium (uses smartphone, laptop, social media)

**Goals:**
- Win the election for maximum number of party candidates
- Optimize resource allocation across constituencies
- Track real-time campaign performance
- Make data-driven decisions on strategy adjustments
- Demonstrate ROI to party leadership

**Pain Points:**
- Overwhelming amount of data from 100+ constituencies
- Inability to identify underperforming areas quickly
- Manual compilation of reports for leadership
- Uncertainty about swing voter segments
- Limited visibility into field worker productivity

**User Journey:**
1. Logs in to central dashboard
2. Reviews state-wide election metrics
3. Drills down into weak-performing constituencies
4. Analyzes voter category distribution
5. Reallocates cadres to critical booths
6. Schedules targeted communication campaigns
7. Generates leadership report

**Key Features:**
- Multi-constituency dashboard
- Predictive analytics
- Resource allocation tools
- Automated report generation
- Real-time alerts on anomalies

**Success Metrics:**
- Time to insight: <5 minutes from question to answer
- Daily active usage: 30+ min/day during campaign
- Feature adoption: Uses 8+ modules regularly

---

#### Persona 2: The Booth Incharge (Priya)

**Demographics:**
- Age: 25-40
- Education: 10th-12th pass
- Role: Booth-level coordinator managing 1-2 booths
- Location: Town/village
- Tech Savviness: Low-Medium (smartphone user, limited laptop experience)

**Goals:**
- Update voter data with current mobile numbers
- Identify and mark loyal/swing/opposition voters
- Ensure all family members vote on poll day
- Report daily progress to coordinator
- Improve booth performance vs. previous election

**Pain Points:**
- Time-consuming data entry on mobile
- Difficulty navigating complex software
- Poor internet connectivity in rural areas
- Lack of recognition for good performance
- Confusion about voter family relationships

**User Journey:**
1. Opens mobile app (offline mode)
2. Searches for voter by name/house number
3. Updates mobile number and voter category
4. Marks family relationships
5. Takes GPS-tagged photo
6. Syncs data when internet available
7. Views personal performance metrics

**Key Features:**
- Mobile-first, offline-capable interface
- Simple search and edit flows
- Voice input for vernacular names
- Gamification (badges, leaderboards)
- Family auto-grouping suggestions

**Success Metrics:**
- Daily active users: 80%+ during active campaign
- Avg. voters updated: 50+ per day
- Data quality: 90%+ accuracy on verification
- Mobile app rating: 4.5+ stars

---

#### Persona 3: The Individual Candidate (Amit)

**Demographics:**
- Age: 30-55
- Education: Graduate+
- Role: First-time assembly candidate
- Location: Semi-urban constituency
- Tech Savviness: Medium-High (uses multiple apps, social media savvy)

**Goals:**
- Manage entire campaign with limited budget
- Build comprehensive voter database
- Track booth-wise performance
- Monitor cadre activities
- Run targeted communication campaigns
- Analyze post-election performance

**Pain Points:**
- Cannot afford expensive enterprise software
- Limited technical team to manage systems
- Needs to do more with less resources
- Overwhelmed by campaign management complexity
- Wants professional tools at affordable price

**User Journey:**
1. Signs up for individual candidate plan
2. Imports voter data from EC rolls
3. Creates booth assignments for volunteers
4. Launches WhatsApp campaign for specific voter segment
5. Monitors poll day turnout on mobile
6. Reviews post-election analytics

**Key Features:**
- Self-service onboarding
- Affordable pricing (₹50k-2L range)
- Data import wizards
- Pre-built templates (campaigns, surveys)
- All-in-one platform (no integrations needed)

**Success Metrics:**
- Time to first value: <1 day from signup
- Feature discovery: Uses 5+ modules
- Cost efficiency: Saves 50%+ vs. hiring data team
- Election win rate: 60%+ of users win elections

---

#### Persona 4: The Super Administrator (Sanjay)

**Demographics:**
- Age: 28-45
- Education: B.Tech/MCA
- Role: Platform administrator at SaaS company
- Location: Metro city
- Tech Savviness: High (developer/ops background)

**Goals:**
- Onboard new tenants (parties/candidates)
- Manage tenant databases and configurations
- Monitor system health and performance
- Handle support escalations
- Ensure data security and compliance
- Drive platform adoption

**Pain Points:**
- Manual tenant provisioning is time-consuming
- Database migrations across tenants are risky
- Difficult to troubleshoot customer-specific issues
- Need better visibility into usage analytics
- License management is complex

**User Journey:**
1. Receives new customer signup notification
2. Creates tenant with dedicated database option
3. Configures branding (logo, colors, domain)
4. Runs database migrations
5. Sets up initial admin user
6. Configures features and quotas
7. Monitors health dashboard

**Key Features:**
- Tenant management interface
- Database provisioning automation
- Feature flag controls
- Usage analytics dashboard
- License key generation
- Audit logs

**Success Metrics:**
- Tenant provisioning time: <30 min
- System uptime: 99.9%+
- Mean time to resolution: <2 hours
- Customer satisfaction: 4.5+/5

---

#### Persona 5: The EMC Administrator (Neha)

**Demographics:**
- Age: 32-50
- Education: MBA/Graduate
- Role: Owner of election management company
- Location: State capital
- Tech Savviness: Medium (business user)

**Goals:**
- Serve 50+ political clients with single platform
- White-label platform with company branding
- Ensure complete data isolation between clients
- Generate recurring revenue from clients
- Scale operations without linear cost growth

**Pain Points:**
- Managing multiple client systems is complex
- Data security concerns with shared infrastructure
- Clients demand branded solutions
- High operational costs eat into margins
- Difficulty in scaling during election season

**User Journey:**
1. Logs into EMC portal
2. Views all client tenants
3. Creates new client tenant with custom domain
4. Assigns licenses and quotas
5. Configures white-label branding
6. Monitors client usage and billing
7. Generates client reports

**Key Features:**
- Multi-tenant management
- White-label customization
- Client billing and invoicing
- Usage metering
- Client portal access
- Bulk operations (migrations, updates)

**Success Metrics:**
- Clients managed: 50+ per EMC
- Client retention: 85%+
- Operational margin: 60%+
- Client satisfaction: 4.3+/5

---

### 4.2 Secondary Stakeholders

#### Voter (End Beneficiary)
- **Interest**: Respectful engagement, privacy protection, issue-based outreach
- **Concerns**: Spam, data misuse, unauthorized calls
- **Platform Responsibility**: Ethical use guidelines, data privacy, opt-out mechanisms

#### Party Leadership
- **Interest**: Strategic insights, election wins, transparency
- **Concerns**: Data leaks, vendor reliability, ROI
- **Platform Responsibility**: Enterprise security, uptime SLAs, executive dashboards

#### Field Volunteers
- **Interest**: Easy-to-use tools, recognition, clear instructions
- **Concerns**: Complex interfaces, unreliable apps, lack of feedback
- **Platform Responsibility**: Mobile UX, offline capability, gamification

#### Election Commission
- **Interest**: Compliance with election code of conduct
- **Concerns**: Data misuse, violation of regulations
- **Platform Responsibility**: Transparent data handling, compliance certifications

---

## 5. Product Architecture

### 5.1 Architecture Decision Framework

ElectionSoft offers **two distinct architectural implementations** to serve different market segments:

#### Architecture Option A: ElectPro (Monolithic)

**Target Segments:**
- Individual candidates
- Small political parties (1-10 constituencies)
- First-time users
- Budget-conscious customers

**Characteristics:**
- Single codebase with modular structure
- Turborepo-based monorepo
- Schema-per-tenant multi-tenancy
- Simpler deployment (single container)
- Faster development and iteration

**Trade-offs:**
- ✅ Simpler operations and maintenance
- ✅ Lower infrastructure costs
- ✅ Faster feature development
- ❌ Limited horizontal scalability
- ❌ All features in single deployment
- ❌ Resource contention between tenants

#### Architecture Option B: ElectionCaffe (Microservices)

**Target Segments:**
- National/state political parties
- Election management companies
- Large-scale deployments (50+ constituencies)
- Enterprise customers with dedicated infrastructure

**Characteristics:**
- Service-oriented architecture
- Independent service deployment
- Flexible database topology (shared/dedicated)
- Horizontal scalability
- Service-level isolation

**Trade-offs:**
- ✅ Independent service scaling
- ✅ Technology flexibility per service
- ✅ Fault isolation
- ✅ Team autonomy
- ❌ Complex deployment and orchestration
- ❌ Higher infrastructure costs
- ❌ Distributed system challenges (latency, consistency)

### 5.2 ElectPro Architecture (Monolithic)

#### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer (NGINX)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐       ┌───────▼────────┐
│   Web App      │       │   API Server    │
│   (React SPA)  │       │   (Node.js)     │
│   Port 3000    │       │   Port 4000     │
└────────────────┘       └────┬────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              ┌─────▼───┐ ┌──▼────┐ ┌──▼────────┐
              │PostgreSQL│ │ Redis │ │Meilisearch│
              │ Port 5432│ │ 6379  │ │  7700     │
              └──────────┘ └───────┘ └───────────┘
```

#### Application Structure

```
ElectPro/
├── apps/
│   ├── api/                    # Backend API Application
│   │   ├── src/
│   │   │   ├── server.ts       # Express server setup
│   │   │   ├── routes/         # API route definitions
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── elections.routes.ts
│   │   │   │   ├── voters.routes.ts
│   │   │   │   ├── cadres.routes.ts
│   │   │   │   ├── families.routes.ts
│   │   │   │   ├── campaigns.routes.ts
│   │   │   │   ├── surveys.routes.ts
│   │   │   │   ├── poll-day.routes.ts
│   │   │   │   ├── reports.routes.ts
│   │   │   │   └── dashboard.routes.ts
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Express middleware
│   │   │   │   ├── authenticate.ts
│   │   │   │   ├── requireTenant.ts
│   │   │   │   ├── requireRole.ts
│   │   │   │   ├── requirePermissions.ts
│   │   │   │   └── errorHandler.ts
│   │   │   ├── validators/     # Zod schemas
│   │   │   └── utils/          # Helper functions
│   │   └── package.json
│   │
│   └── web/                    # Frontend React Application
│       ├── src/
│       │   ├── main.tsx        # App entry point
│       │   ├── App.tsx         # Root component
│       │   ├── routes/         # React Router config
│       │   ├── features/       # Feature modules
│       │   │   ├── auth/
│       │   │   ├── dashboard/
│       │   │   ├── elections/
│       │   │   ├── voters/
│       │   │   ├── cadres/
│       │   │   ├── families/
│       │   │   ├── campaigns/
│       │   │   ├── surveys/
│       │   │   ├── poll-day/
│       │   │   └── settings/
│       │   ├── components/     # Shared components
│       │   │   ├── layout/
│       │   │   └── ui/         # shadcn components
│       │   ├── lib/
│       │   │   ├── api.ts      # Axios instance
│       │   │   ├── queryClient.ts
│       │   │   └── utils.ts
│       │   └── stores/         # Zustand stores
│       └── package.json
│
├── packages/
│   ├── database/               # Prisma ORM Package
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   ├── migrations/     # Migration files
│   │   │   └── seed.ts         # Seed data
│   │   ├── src/
│   │   │   ├── index.ts        # Prisma client export
│   │   │   └── getTenantDb.ts  # Tenant DB resolver
│   │   └── package.json
│   │
│   ├── shared/                 # Shared utilities
│   │   ├── src/
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── constants/      # Shared constants
│   │   │   ├── schemas/        # Zod schemas
│   │   │   └── utils/          # Utility functions
│   │   └── package.json
│   │
│   └── ui/                     # Shared UI components
│       ├── src/
│       │   └── components/
│       └── package.json
│
├── docker-compose.yml          # Local development setup
├── turbo.json                  # Turborepo configuration
└── package.json                # Root package.json
```

#### Multi-Tenancy Implementation

**Schema-Per-Tenant Approach:**

1. **Public Schema (S_ElectionManagement)**:
   - Tenant metadata
   - Users with tenant associations
   - Subscription plans
   - Refresh tokens
   - OTPs

2. **Tenant Schemas (T_ElectionManagement_{tenantId})**:
   - All election-specific data
   - Voters, families, cadres
   - Elections, parts, sections, booths
   - Campaigns, surveys, reports

**Tenant Resolution Flow:**
```typescript
Request → Extract JWT → Get tenantId → Resolve schema name →
Query with schema context → Return scoped results
```

**Database Connection:**
```typescript
// getTenantDb.ts
export function getTenantDb(tenantId: string) {
  const schemaName = `tenant_${tenantId}`;
  return prisma.$executeRaw`SET search_path TO ${schemaName}`;
}
```

### 5.3 ElectionCaffe Architecture (Microservices)

#### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Load Balancer (NGINX)                   │
└────────────────────────┬─────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │   CDN   │ (Static Assets)
                    └────┬────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│                    API Gateway                             │
│                    Port 3000                               │
│  - Authentication                                          │
│  - Rate Limiting                                           │
│  - Request Routing                                         │
│  - Response Aggregation                                    │
└───┬────────────────────────────────────────────────────┬──┘
    │                                                     │
    ├─────────┬──────────┬──────────┬──────────┬────────┤
    │         │          │          │          │        │
┌───▼───┐ ┌──▼────┐ ┌───▼────┐ ┌───▼────┐ ┌───▼───┐ ┌──▼────┐
│ Auth  │ │Election│ │ Voter  │ │ Cadre  │ │Analytics│ │  AI   │
│Service│ │Service │ │Service │ │Service │ │Service│ │Service│
│ 3001  │ │ 3002   │ │ 3003   │ │ 3004   │ │ 3005  │ │ 3007  │
└───┬───┘ └──┬─────┘ └───┬────┘ └───┬────┘ └───┬───┘ └──┬────┘
    │        │           │          │          │        │
    └────────┴───────────┴──────────┴──────────┴────────┘
                         │
              ┌──────────▼──────────┐
              │    PostgreSQL       │
              │  (Core + Tenants)   │
              └─────────────────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼────┐ ┌──▼────┐ ┌───▼────────┐
         │  Redis  │ │  S3   │ │  Socket.IO │
         └─────────┘ └───────┘ └────────────┘
```

#### Service Breakdown

**1. Gateway Service (Port 3000)**
- **Responsibilities**:
  - Request routing to appropriate services
  - JWT validation
  - Rate limiting
  - CORS handling
  - Request/response logging
  - API versioning
  - Response caching

- **Technology**: Express + http-proxy-middleware

**2. Auth Service (Port 3001)**
- **Responsibilities**:
  - User authentication (login, logout, token refresh)
  - User management (CRUD)
  - Tenant management
  - Invitation system
  - Organization settings
  - News & broadcast (NB system)
  - Fund management
  - Inventory management
  - Event management
  - Internal chat and notifications

- **Database**: Core schema (User, Tenant, Invitation, etc.)
- **APIs**: 50+ endpoints

**3. Election Service (Port 3002)**
- **Responsibilities**:
  - Election CRUD
  - Geographic hierarchy (parts, sections, booths)
  - Master data (religion, caste, language, party, schemes)
  - Candidate management
  - Survey system
  - Voting history
  - Vulnerability tracking

- **Database**: Tenant-specific election data
- **APIs**: 30+ endpoints

**4. Voter Service (Port 3003)**
- **Responsibilities**:
  - Voter CRUD
  - Voter search and filtering
  - Bulk import/export
  - Duplicate detection
  - Family management
  - Family auto-grouping
  - Voter slip generation

- **Database**: Tenant-specific voter data
- **APIs**: 25+ endpoints

**5. Cadre Service (Port 3004)**
- **Responsibilities**:
  - Cadre management
  - Booth/part assignments
  - Performance tracking
  - Location tracking
  - Poll day vote marking
  - Turnout monitoring
  - Booth status tracking

- **Database**: Tenant-specific cadre and poll day data
- **APIs**: 20+ endpoints

**6. Analytics Service (Port 3005)**
- **Responsibilities**:
  - Voter analytics (age, gender, caste distribution)
  - Booth-wise analytics
  - Dashboard data aggregation
  - Election overview metrics
  - Cadre performance analytics
  - Poll day real-time analytics

- **Database**: Read-heavy queries across tenant data
- **Caching**: Aggressive Redis caching
- **APIs**: 15+ endpoints

**7. Reporting Service (Port 3006)**
- **Responsibilities**:
  - Report generation (PDF, Excel)
  - DataCaffe.ai integration
  - Embedded dashboard management
  - Data synchronization
  - Custom report builder

- **External APIs**: DataCaffe API integration
- **Storage**: S3 for generated reports
- **APIs**: 10+ endpoints

**8. AI Analytics Service (Port 3007)**
- **Responsibilities**:
  - Turnout prediction
  - Election result forecasting
  - Swing voter analysis
  - Booth risk assessment
  - Campaign recommendations
  - AI credit management

- **AI Providers**: OpenAI, Anthropic
- **ML Models**: Custom trained models
- **APIs**: 8+ endpoints

**9. Super Admin Service (Varies)**
- **Responsibilities**:
  - Tenant provisioning
  - Database management (create, migrate, backup)
  - License key management
  - Feature flag controls
  - AI feature configuration
  - System health monitoring
  - EC data integration

- **Database**: System-wide admin operations
- **APIs**: 40+ endpoints

#### Service Communication

**Synchronous Communication:**
- HTTP/REST for request-response patterns
- Service-to-service calls via internal network
- Circuit breakers for fault tolerance

**Asynchronous Communication:**
- Redis pub/sub for events (poll day vote marking, real-time updates)
- Message queues for background jobs (bulk imports, report generation)

**Data Consistency:**
- Event sourcing for critical operations
- Saga pattern for distributed transactions
- Eventual consistency where acceptable

#### Database Strategy

**Option 1: Shared Database**
- Single PostgreSQL instance
- All tenants in same database
- Row-level tenant_id filtering
- Lower cost, simpler management
- Suitable for small-to-medium tenants

**Option 2: Dedicated Managed Database**
- Separate PostgreSQL database per tenant
- Platform manages database provisioning
- Full data isolation
- Higher cost, better performance
- Suitable for large enterprise tenants

**Option 3: Dedicated Self-Hosted Database**
- Tenant provides own database
- Platform connects via encrypted connection string
- Complete control for tenant
- Suitable for highly regulated industries

**Database Provisioning Flow:**
```
Tenant signup → Select database type →
Platform provisions database → Run migrations →
Seed initial data → Set status to READY
```

### 5.4 Common Components (Both Architectures)

#### Authentication & Authorization

**JWT Token Structure:**
```json
{
  "userId": "user_abc123",
  "tenantId": "tenant_xyz789",
  "role": "CAMPAIGN_MANAGER",
  "permissions": ["manage_voters", "manage_cadres", "view_reports"],
  "electionIds": ["election_001", "election_002"],
  "tokenVersion": 1,
  "iat": 1737500000,
  "exp": 1737500900
}
```

**Access Token:** 15 minutes expiry
**Refresh Token:** 7 days expiry (HTTP-only cookie)

**Permission Hierarchy:**
```
Permissions = Union(RolePermissions, UserSpecificPermissions)
```

**Middleware Chain:**
```
authenticate → requireTenant → requireRole/requirePermissions → handler
```

#### Real-Time Features (Socket.IO)

**Namespaces:**
- `/poll-day` - Poll day vote marking and turnout updates
- `/notifications` - User notifications
- `/chat` - Internal communication
- `/tracking` - Cadre location tracking

**Room Structure:**
```
/poll-day
  ├── election:{electionId}           # Election-wide updates
  ├── election:{electionId}:booth:{boothId}  # Booth-specific
  └── election:{electionId}:part:{partId}    # Part-specific
```

**Events:**
- `vote:marked` - New vote marked
- `turnout:updated` - Turnout statistics updated
- `booth:status` - Booth status changed
- `cadre:location` - Cadre location updated

#### Caching Strategy (Redis)

**Cache Layers:**

1. **Session Cache**:
   - Key: `session:{userId}`
   - TTL: 15 minutes (extends on activity)
   - Data: User session, permissions

2. **Data Cache**:
   - Key: `voter:{voterId}`, `election:{electionId}`, etc.
   - TTL: 5 minutes
   - Data: Frequently accessed entities

3. **Query Cache**:
   - Key: `query:{hash(sql+params)}`
   - TTL: 1 minute
   - Data: Read-heavy query results

4. **Dashboard Cache**:
   - Key: `dashboard:{type}:{electionId}`
   - TTL: 30 seconds
   - Data: Dashboard aggregations

**Cache Invalidation:**
- Write-through on mutations
- Event-driven invalidation (vote marked → invalidate turnout cache)
- Time-based expiry for low-consistency data

#### Search (Meilisearch)

**Indexes:**
- `voters` - Voter search by name, EPIC, mobile, address
- `cadres` - Cadre search
- `families` - Family search

**Features:**
- Typo tolerance (handle misspellings)
- Prefix search (autocomplete)
- Faceted search (filters)
- Geo-search (location-based)
- Ranking rules (custom relevance)

**Sync Strategy:**
- Real-time sync on voter create/update
- Bulk reindex nightly
- Tenant-specific indexes

#### File Storage (AWS S3)

**Bucket Structure:**
```
electsoft-production/
├── tenants/
│   ├── {tenantId}/
│   │   ├── voters/
│   │   │   └── photos/{voterId}.jpg
│   │   ├── documents/
│   │   ├── reports/
│   │   │   └── {reportId}.pdf
│   │   ├── imports/
│   │   │   └── {importId}.csv
│   │   └── exports/
│   │       └── {exportId}.xlsx
│   └── ...
└── public/
    ├── logos/
    └── banners/
```

**Access Control:**
- Signed URLs for private content (15 min expiry)
- Public URLs for logos/banners
- Tenant-scoped access validation

---

## 6. Core Features & Functional Requirements

### 6.1 Feature Overview & Prioritization

#### MoSCoW Prioritization

**Must Have (MVP - Phase 1)**
1. User Authentication & Authorization
2. Multi-Tenant Management
3. Election Management
4. Voter Database Management
5. Geographic Hierarchy (Parts, Sections, Booths)
6. Basic Dashboard
7. Master Data Management
8. Poll Day Vote Marking

**Should Have (Phase 2)**
9. Family Management
10. Cadre Management
11. Advanced Dashboard & Analytics
12. Search & Filtering
13. Bulk Import/Export
14. Reports (PDF/Excel)
15. Mobile App (Cadre Interface)

**Could Have (Phase 3)**
16. Campaign Management
17. Survey System
18. Real-time Location Tracking
19. Communication Tools (SMS/WhatsApp)
20. AI Analytics
21. News & Broadcast System

**Won't Have (Future)**
22. Video Calling
23. Payment Gateway
24. E-commerce Integration
25. Blockchain Voting

---

### 6.2 Detailed Feature Specifications

#### Feature 1: User Authentication & Authorization

**Description**: Secure authentication system with JWT tokens and role-based access control.

**User Stories:**
- As a user, I want to log in with my mobile number and password so that I can access the platform
- As a user, I want to reset my password using OTP so that I can recover my account
- As an admin, I want to create users with specific roles so that I can control access
- As a user, I want to stay logged in across sessions so that I don't have to log in repeatedly

**Functional Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| AUTH-001 | Mobile + Password Login | Must Have | User can log in with 10-digit mobile and password. Invalid credentials show error. |
| AUTH-002 | JWT Token Generation | Must Have | Successful login returns access token (15 min) and refresh token (7 days). |
| AUTH-003 | Token Refresh | Must Have | Client can refresh access token using refresh token. Old refresh token invalidated. |
| AUTH-004 | Logout | Must Have | Logout invalidates refresh token in database. Client clears tokens. |
| AUTH-005 | Password Reset (OTP) | Must Have | User requests OTP via mobile. 6-digit OTP sent. Valid for 10 min. Allows password reset. |
| AUTH-006 | Failed Login Tracking | Should Have | After 10 failed attempts, account locked for 15 minutes. |
| AUTH-007 | Change Password | Should Have | Authenticated user can change password. Old password required. |
| AUTH-008 | Session Management | Should Have | User can view active sessions and revoke them. |
| AUTH-009 | Google OAuth | Could Have | User can log in with Google account. Links to existing account if mobile matches. |
| AUTH-010 | 2FA (OTP) | Won't Have | Two-factor authentication via SMS. |

**Role Hierarchy:**
```
SUPER_ADMIN
  └── Full platform access
TENANT_ADMIN
  └── Full tenant access
    └── CENTRAL_ADMIN
      └── Multi-constituency access
        └── CONSTITUENCY_ADMIN
          └── Single constituency access
            └── CAMPAIGN_MANAGER
              └── Campaign + data access
                └── COORDINATOR
                  └── Area-level access
                    └── BOOTH_INCHARGE
                      └── Booth-level access
                        └── VOLUNTEER
                          └── Limited access
```

**Permission System:**

| Permission | Description | Roles |
|-----------|-------------|-------|
| `manage_elections` | Create, edit, delete elections | Super Admin, Tenant Admin, Central Admin |
| `view_elections` | View election data | All roles |
| `manage_voters` | Create, edit, delete voters | Admin, Campaign Manager, Coordinator, Booth Incharge |
| `view_voters` | View voter data | All roles except Volunteer |
| `manage_cadres` | Manage cadre assignments | Admin, Campaign Manager, Coordinator |
| `view_cadres` | View cadre data | Admin, Campaign Manager, Coordinator, Booth Incharge |
| `manage_families` | Manage family groupings | Admin, Campaign Manager, Coordinator, Booth Incharge |
| `manage_campaigns` | Create and manage campaigns | Admin, Campaign Manager |
| `manage_surveys` | Create and manage surveys | Admin, Campaign Manager, Coordinator |
| `poll_day_operations` | Mark votes, view turnout | All roles |
| `view_reports` | Generate and view reports | Admin, Campaign Manager, Coordinator |
| `manage_settings` | Modify tenant settings | Super Admin, Tenant Admin |
| `manage_users` | Create, edit, delete users | Super Admin, Tenant Admin, Central Admin |
| `view_analytics` | View analytics dashboards | Admin, Campaign Manager |
| `manage_funds` | Manage fund accounts | Tenant Admin |
| `manage_inventory` | Manage inventory | Tenant Admin, Campaign Manager |

**API Endpoints:**
```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/change-password
GET    /api/auth/me
PUT    /api/auth/profile
GET    /api/auth/sessions
DELETE /api/auth/sessions/:id
```

**UI Screens:**
- Login Page (mobile + password)
- Forgot Password Page (mobile input → OTP verification → new password)
- Change Password Page (old password + new password)
- Profile Page (view/edit user info)

**Security Considerations:**
- Passwords hashed with bcrypt (salt rounds: 12)
- JWT secret from environment variable
- HTTP-only cookies for refresh tokens
- Rate limiting: 5 login attempts per minute per IP
- Token version tracking for forced logout
- CSRF protection on state-changing endpoints

---

#### Feature 2: Multi-Tenant Management

**Description**: Support multiple organizations (parties, candidates, EMCs) on single platform with complete data isolation.

**User Stories:**
- As a super admin, I want to create new tenants so that new customers can use the platform
- As a tenant admin, I want to customize branding so that the platform reflects my organization
- As a super admin, I want to suspend tenants so that I can enforce compliance
- As an EMC, I want to manage multiple client tenants so that I can serve all clients from one place

**Functional Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| TENANT-001 | Tenant Registration | Must Have | New tenant created with name, type, contact info. Unique subdomain assigned. |
| TENANT-002 | Tenant Types | Must Have | Support POLITICAL_PARTY, INDIVIDUAL_CANDIDATE, ELECTION_MANAGEMENT types. |
| TENANT-003 | Database Isolation | Must Have | Tenants can choose SHARED, DEDICATED_MANAGED, or DEDICATED_SELF database. |
| TENANT-004 | Schema Provisioning | Must Have | On tenant creation, database schema auto-provisioned and migrated. |
| TENANT-005 | Branding Customization | Should Have | Tenant can set logo, primary color, secondary color, display name, favicon. |
| TENANT-006 | Custom Domain | Should Have | Tenant can map custom domain (e.g., campaign.party.com). |
| TENANT-007 | Tenant Status | Must Have | Statuses: PENDING, ACTIVE, SUSPENDED, CANCELLED. Only ACTIVE can log in. |
| TENANT-008 | Subscription Plans | Must Have | Plans: FREE (1 election, 10k voters), PRO (5 elections, 100k voters), ENTERPRISE (unlimited). |
| TENANT-009 | Quota Enforcement | Should Have | Enforce max voters, cadres, elections based on plan. Block creation when limit reached. |
| TENANT-010 | Trial Period | Should Have | New tenants get 14-day trial. Auto-suspend after trial unless paid. |
| TENANT-011 | Tenant Admin Creation | Must Have | On tenant creation, create default admin user with credentials. |
| TENANT-012 | EMC Multi-Tenant | Could Have | EMC can create and manage multiple client tenants. White-label branding. |

**Tenant Onboarding Flow:**
```
1. Super Admin creates tenant
   ↓
2. System provisions database
   ↓
3. System runs migrations
   ↓
4. System creates admin user
   ↓
5. System sends welcome email with credentials
   ↓
6. Tenant admin logs in
   ↓
7. Tenant admin customizes branding
   ↓
8. Tenant admin creates first election
```

**Database Topology Options:**

**Option A: Shared Database**
```sql
-- All tenants in single database
SELECT * FROM voters WHERE tenant_id = 'tenant_123';
```
- ✅ Lowest cost
- ✅ Simple management
- ❌ No physical isolation
- **Use Case**: Free/Pro plans, small tenants

**Option B: Schema-Per-Tenant**
```sql
-- Each tenant gets own schema
SET search_path TO tenant_123;
SELECT * FROM voters;
```
- ✅ Logical isolation
- ✅ Easy backup/restore per tenant
- ❌ Schema management overhead
- **Use Case**: Mid-tier customers (ElectPro approach)

**Option C: Database-Per-Tenant**
```sql
-- Each tenant gets own database
-- Connect to tenant_123_db
SELECT * FROM voters;
```
- ✅ Complete isolation
- ✅ Independent scaling
- ✅ Easier compliance
- ❌ Higher cost
- **Use Case**: Enterprise customers (ElectionCaffe approach)

**API Endpoints:**
```
# Super Admin
POST   /api/super-admin/tenants
GET    /api/super-admin/tenants
PUT    /api/super-admin/tenants/:id
DELETE /api/super-admin/tenants/:id
POST   /api/super-admin/tenants/:id/suspend
POST   /api/super-admin/tenants/:id/activate

# Tenant Admin
GET    /api/tenant/info
PUT    /api/tenant/settings
PUT    /api/tenant/branding
POST   /api/tenant/upload-logo
PUT    /api/tenant/database
```

**UI Screens:**
- Super Admin: Tenant List (table with name, type, status, plan, users, created date)
- Super Admin: Create Tenant Form (name, type, contact, plan, database type)
- Super Admin: Tenant Detail View (overview, users, elections, usage, billing)
- Tenant Admin: Settings Page (branding, domain, subscription, billing)

**Subscription Plans:**

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Price** | ₹0 | ₹50,000/election | Custom |
| **Elections** | 1 | 5 | Unlimited |
| **Voters** | 10,000 | 100,000 | Unlimited |
| **Cadres** | 50 | 500 | Unlimited |
| **Users** | 5 | 25 | Unlimited |
| **Storage** | 500 MB | 5 GB | Unlimited |
| **SMS Credits** | 100 | 5,000 | Custom |
| **AI Analytics** | ❌ | Limited | Full |
| **Custom Domain** | ❌ | ✅ | ✅ |
| **White-Label** | ❌ | ❌ | ✅ |
| **Dedicated DB** | ❌ | ❌ | ✅ |
| **Support** | Community | Email | Dedicated |

---

#### Feature 3: Election Management

**Description**: Create and manage elections with complete configuration of geography, candidates, and settings.

**User Stories:**
- As a campaign manager, I want to create a new election so that I can start managing campaign data
- As a user, I want to view all elections so that I can switch between different campaigns
- As an admin, I want to lock an election so that no further changes can be made after the election
- As a user, I want to see election statistics so that I can understand campaign progress

**Functional Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| ELEC-001 | Create Election | Must Have | User can create election with name, type, date, constituency details. |
| ELEC-002 | Election Types | Must Have | Support ASSEMBLY, PARLIAMENT, LOCAL_BODY, PANCHAYAT, MUNICIPAL. |
| ELEC-003 | Election Status | Must Have | Statuses: DRAFT, ACTIVE, COMPLETED, ARCHIVED. Only ACTIVE used for operations. |
| ELEC-004 | Candidate Information | Must Have | Store candidate name, party, photo, symbol, contact. |
| ELEC-005 | Election Configuration | Should Have | Set poll date, counting date, constituency name, code. |
| ELEC-006 | Election Lock | Should Have | Lock election after completion to prevent further edits. |
| ELEC-007 | Election Statistics | Must Have | Show total voters, total parts, total booths, loyal/swing/opposition counts. |
| ELEC-008 | Multi-Election Support | Must Have | Tenant can manage multiple elections simultaneously. |
| ELEC-009 | Election Selection | Must Have | User selects active election. All subsequent operations scoped to selected election. |
| ELEC-010 | Election Cloning | Could Have | Clone election with all geography and master data to new election. |

**Election Types & Hierarchies:**

```
PARLIAMENT
├── Constituency (Lok Sabha seat)
    ├── Assembly segments (5-10 AC per PC)
        ├── Parts/Wards
            ├── Sections
                └── Booths

ASSEMBLY
├── Constituency (Vidhan Sabha seat)
    ├── Parts/Wards
        ├── Sections
            └── Booths

LOCAL_BODY / MUNICIPAL
├── Ward
    ├── Sections
        └── Booths

PANCHAYAT
├── Gram Panchayat
    └── Booths
```

**Election Data Model:**
```typescript
interface Election {
  id: string;
  tenantId: string;
  name: string;                    // "2024 Assembly Election"
  type: ElectionType;              // ASSEMBLY, PARLIAMENT, etc.
  status: ElectionStatus;          // DRAFT, ACTIVE, COMPLETED, ARCHIVED

  // Dates
  pollDate: Date;
  countingDate: Date;
  createdAt: Date;
  updatedAt: Date;

  // Constituency
  constituencyName: string;        // "Mumbai North"
  constituencyCode: string;        // "19"

  // Candidate
  candidateName: string;
  candidateParty: string;
  candidatePhoto?: string;
  candidateSymbol?: string;
  candidateMobile?: string;
  candidateEmail?: string;

  // Statistics (computed)
  totalVoters: number;
  totalParts: number;
  totalSections: number;
  totalBooths: number;
  loyalVoters: number;
  swingVoters: number;
  oppositionVoters: number;
  unknownVoters: number;

  // Settings
  isLocked: boolean;
}
```

**API Endpoints:**
```
GET    /api/elections
POST   /api/elections
GET    /api/elections/:id
PUT    /api/elections/:id
DELETE /api/elections/:id
POST   /api/elections/:id/lock
POST   /api/elections/:id/unlock
GET    /api/elections/:id/statistics
POST   /api/elections/:id/clone
```

**UI Screens:**
- Elections List Page (cards/table with name, type, date, status, voter count)
- Create Election Form (multi-step wizard)
  - Step 1: Basic Info (name, type, dates)
  - Step 2: Constituency (name, code)
  - Step 3: Candidate (name, party, photo, symbol)
  - Step 4: Review & Create
- Election Detail View (overview, statistics, quick actions)
- Election Settings (edit details, lock/unlock, archive)

**Business Rules:**
- Election name must be unique within tenant
- Poll date must be in future for new elections
- Cannot delete election if it has voters/cadres/parts
- Locked elections cannot be edited (except unlock by admin)
- Only one election can be "selected" per user session
- Elections auto-archived 30 days after counting date

---

#### Feature 4: Voter Database Management

**Description**: Comprehensive voter database with rich demographic, political, and contact information.

**User Stories:**
- As a booth incharge, I want to add new voters so that I can build a complete database
- As a coordinator, I want to search voters by name/mobile so that I can quickly find specific voters
- As a campaign manager, I want to categorize voters (loyal/swing/opposition) so that I can target outreach
- As a user, I want to upload voter photos so that I can verify identity
- As a data operator, I want to bulk import voters from Excel so that I can quickly populate the database

**Functional Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| VOTER-001 | Add Voter Manually | Must Have | User can create voter with all required fields. Form validates inputs. |
| VOTER-002 | Edit Voter | Must Have | User can edit existing voter. Track edit history (who, when). |
| VOTER-003 | Delete Voter | Should Have | User with permission can soft-delete voter. Deleted voters not shown by default. |
| VOTER-004 | View Voter Details | Must Have | User can view full voter profile with all attributes. |
| VOTER-005 | Voter Search | Must Have | Search by name (English/local), EPIC number, mobile, address. Typo-tolerant. |
| VOTER-006 | Advanced Filters | Should Have | Filter by booth, part, age range, gender, caste, category, party, family status. |
| VOTER-007 | Voter Categorization | Must Have | Assign category: LOYAL, SWING, OPPOSITION, UNKNOWN. Color-coded display. |
| VOTER-008 | Influence Level | Should Have | Mark influence: HIGH, MEDIUM, LOW, NONE. |
| VOTER-009 | Photo Upload | Should Have | Upload voter photo. Compress and store in S3. Show thumbnail in list. |
| VOTER-010 | Bulk Import (Excel) | Must Have | Upload Excel with voter data. Validate, preview, and import. Show error report. |
| VOTER-011 | Bulk Export | Should Have | Export filtered voters to Excel/CSV. |
| VOTER-012 | Duplicate Detection | Should Have | On add/import, detect duplicates by EPIC/mobile. Merge option. |
| VOTER-013 | Aadhaar Verification | Could Have | Mark voter as Aadhaar-verified. Store verification date. |
| VOTER-014 | Voter Status Flags | Should Have | Mark isDead, isShifted, isDoubleEntry flags. |
| VOTER-015 | Data Enrichment | Should Have | Track data completeness %. Highlight incomplete profiles. |
| VOTER-016 | Voter History | Could Have | Track voter's participation history across elections. |
| VOTER-017 | Relationship Mapping | Should Have | Link voter to family, mark relations (father, mother, husband, etc.). |

**Voter Data Model:**
```typescript
interface Voter {
  // Identity
  id: string;
  epicNo: string;                    // Voter ID card number
  serialNo?: string;                 // Serial number in electoral roll

  // Personal Info
  nameEnglish: string;
  nameLocal?: string;                // Name in regional language
  fatherNameEnglish?: string;
  motherNameEnglish?: string;
  husbandNameEnglish?: string;
  age: number;
  dateOfBirth?: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  photo?: string;                    // S3 URL

  // Contact
  mobile?: string;
  alternateMobile?: string;
  email?: string;
  address?: string;

  // Location
  electionId: string;
  partId: string;
  sectionId?: string;
  boothId: string;
  houseNo?: string;
  latitude?: number;
  longitude?: number;

  // Demographics
  religionId?: string;
  casteCategoryId?: string;
  casteId?: string;
  subCasteId?: string;
  languageId?: string;

  // Political
  partyId?: string;
  voterCategory: 'LOYAL' | 'SWING' | 'OPPOSITION' | 'UNKNOWN';
  influenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

  // Family
  familyId?: string;
  isFamilyCaptain: boolean;

  // Status
  isDead: boolean;
  isShifted: boolean;
  isDoubleEntry: boolean;
  isAadhaarVerified: boolean;
  aadhaarVerifiedAt?: Date;

  // Metadata
  addedBy: string;                   // User ID
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

**Voter List Display:**

| Column | Display | Sortable | Filterable |
|--------|---------|----------|------------|
| Sl No | Auto-increment | ❌ | ❌ |
| Photo | Thumbnail (40x40) | ❌ | ❌ |
| EPIC No | Text | ✅ | ✅ |
| Name | English name | ✅ | ✅ |
| Age/Gender | "45/M" | ✅ | ✅ |
| Mobile | "+91 98765..." | ❌ | ✅ |
| Address | Truncated | ❌ | ❌ |
| Booth | "Booth 1" | ✅ | ✅ |
| Part | "Part 12" | ✅ | ✅ |
| Category | Badge (colored) | ✅ | ✅ |
| Influence | Icon (⭐) | ✅ | ✅ |
| Family | Family name | ✅ | ✅ |
| Actions | Edit, Delete | ❌ | ❌ |

**Category Color Coding:**
- 🟢 **LOYAL** - Green badge (party supporter)
- 🟡 **SWING** - Yellow badge (undecided)
- 🔴 **OPPOSITION** - Red badge (opposition)
- ⚪ **UNKNOWN** - Gray badge (not categorized)

**Bulk Import Specification:**

**Excel Format:**
```
| EPIC No | Name | Age | Gender | Mobile | Address | Booth | Part | Father | Mother | Caste | Religion | Category |
|---------|------|-----|--------|--------|---------|-------|------|--------|--------|-------|----------|----------|
| ABC1234 | John | 35  | M      | 987... | House 1 | 1     | 12   | David  | Mary   | OBC   | Hindu    | LOYAL    |
```

**Import Flow:**
1. User uploads Excel file
2. System validates format and columns
3. System validates data (age range, gender values, etc.)
4. System checks for duplicates
5. System shows preview with errors highlighted
6. User confirms import
7. System imports valid rows
8. System generates error report for failed rows

**Validation Rules:**
- EPIC No: Alphanumeric, 10 characters
- Name: Required, 2-100 characters
- Age: 18-120
- Gender: MALE, FEMALE, OTHER
- Mobile: 10 digits, optional
- Booth/Part: Must exist in election
- Category: LOYAL, SWING, OPPOSITION, UNKNOWN
- Influence: HIGH, MEDIUM, LOW, NONE

**API Endpoints:**
```
GET    /api/voters                 # List with pagination & filters
POST   /api/voters                 # Create voter
GET    /api/voters/:id             # Get voter details
PUT    /api/voters/:id             # Update voter
DELETE /api/voters/:id             # Soft delete voter
GET    /api/voters/search          # Search voters
POST   /api/voters/bulk            # Bulk import
GET    /api/voters/export          # Export to Excel
GET    /api/voters/duplicates      # Find duplicates
POST   /api/voters/:id/photo       # Upload photo
PUT    /api/voters/:id/verify      # Mark Aadhaar verified
```

**UI Screens:**
- Voter List Page (table with search, filters, pagination)
- Add Voter Form (multi-section form)
  - Personal Info
  - Contact Info
  - Location
  - Demographics
  - Political Info
  - Photo Upload
- Edit Voter Form (same as add)
- Voter Detail View (read-only profile with all data)
- Bulk Import Page (upload → validate → preview → import)
- Duplicate Voters Page (side-by-side comparison, merge option)

**Performance Considerations:**
- Voter list paginated (50 per page)
- Search index in Meilisearch for fast search
- Photo thumbnails cached in CDN
- Lazy load photos in list view
- Virtual scrolling for 1000+ results

---

#### Feature 5: Geographic Hierarchy Management

**Description**: Manage election geography with parts (wards/mandals), sections, and booths.

**User Stories:**
- As an admin, I want to create parts so that I can organize election geography
- As a coordinator, I want to view booth-wise voter counts so that I can plan field operations
- As a user, I want to assign cadres to booths so that I can manage booth coverage
- As a user, I want to mark vulnerable parts so that I can allocate more resources

**Functional Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| GEO-001 | Create Part | Must Have | User can create part with part number, name, total voters. |
| GEO-002 | Create Section | Should Have | User can create section within part. |
| GEO-003 | Create Booth | Must Have | User can create booth with booth number, name, location. |
| GEO-004 | Hierarchy View | Should Have | Tree view showing Parts → Sections → Booths. |
| GEO-005 | Voter Count Aggregation | Must Have | Auto-compute voter counts for part/section/booth. |
| GEO-006 | Bulk Part Creation | Should Have | Upload Excel with multiple parts. |
| GEO-007 | Booth Location | Should Have | Add GPS coordinates and address for booth. |
| GEO-008 | Vulnerability Marking | Could Have | Mark parts as CRITICAL, COMMUNAL, POLITICAL, NAXAL, BORDER, REMOTE. |
| GEO-009 | Booth Agent Assignment | Should Have | Assign booth agent (name, mobile) to booth for poll day. |
| GEO-010 | Part Statistics | Must Have | Show total voters, loyal/swing/opposition counts per part. |

**Data Model:**

```typescript
interface Part {
  id: string;
  electionId: string;
  partNumber: string;              // "12", "A", "Ward 5"
  partName: string;                // "Malad West"
  totalVoters: number;             // From EC data

  // Computed
  actualVoterCount: number;        // From voter table
  totalSections: number;
  totalBooths: number;

  // Vulnerability
  vulnerabilityType?: 'CRITICAL' | 'COMMUNAL' | 'POLITICAL' | 'NAXAL' | 'BORDER' | 'REMOTE';

  createdAt: Date;
  updatedAt: Date;
}

interface Section {
  id: string;
  partId: string;
  sectionNumber: string;
  sectionName: string;

  // Computed
  totalVoters: number;
  totalBooths: number;

  createdAt: Date;
  updatedAt: Date;
}

interface Booth {
  id: string;
  partId: string;
  sectionId?: string;
  electionId: string;

  boothNumber: string;             // "1", "1A", "148"
  boothName: string;               // "Government Primary School"
  address?: string;
  latitude?: number;
  longitude?: number;

  // Computed
  totalVoters: number;
  maleVoters: number;
  femaleVoters: number;

  // Poll Day
  boothAgent?: string;             // Agent name
  boothAgentMobile?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

**API Endpoints:**
```
# Parts
GET    /api/parts
POST   /api/parts
GET    /api/parts/:id
PUT    /api/parts/:id
DELETE /api/parts/:id
POST   /api/parts/bulk
GET    /api/parts/:id/statistics

# Sections
GET    /api/sections
POST   /api/sections
GET    /api/sections/:id
PUT    /api/sections/:id
DELETE /api/sections/:id

# Booths
GET    /api/booths
POST   /api/booths
GET    /api/booths/:id
PUT    /api/booths/:id
DELETE /api/booths/:id
GET    /api/booths/:id/voters
```

**UI Screens:**
- Part List (table with part number, name, voter count, sections, booths)
- Section List (table with section number, name, part, voter count, booths)
- Booth List (table with booth number, name, part, section, voter count, agent)
- Add Part Form (part number, name, total voters from EC, vulnerability)
- Add Section Form (part selection, section number, name)
- Add Booth Form (part, section, booth number, name, location map picker)
- Hierarchy Tree View (expandable tree: Part → Section → Booth)

**Bulk Part Import:**
```excel
| Part No | Part Name    | Total Voters | Vulnerability |
|---------|--------------|--------------|---------------|
| 1       | Malad West   | 45000        | COMMUNAL      |
| 2       | Malad East   | 42000        |               |
```

---

*[Due to length constraints, I'll continue with remaining features in a structured summary format]*

#### Feature 6: Family Management

**Key Capabilities:**
- Auto-grouping by house number + surname
- Manual family creation and editing
- Family captain designation
- Cross-booth family support
- Family voting status tracking
- Family-wise communication

**Critical Fields:**
```typescript
interface Family {
  id: string;
  familyName: string;
  address: string;
  houseNo: string;
  memberCount: number;
  captainId?: string;  // Voter ID of family captain
  votedCount: number;  // Poll day tracking
}
```

#### Feature 7: Cadre Management

**Key Capabilities:**
- Hierarchical roles (Coordinator → Booth Incharge → Volunteer)
- Booth/part assignments
- Performance metrics (voters updated, surveys completed)
- Real-time GPS tracking
- Task assignment
- Attendance tracking

**Roles:**
- COORDINATOR - Area/ward level
- BOOTH_INCHARGE - 1-2 booths
- VOLUNTEER - Support role
- AGENT - Poll day agent

#### Feature 8: Dashboard & Analytics

**Dashboard Types:**

1. **Election Dashboard**
   - Total voters, parts, booths
   - Voter category distribution (pie chart)
   - Age group distribution (bar chart)
   - Gender ratio (donut chart)
   - Caste distribution
   - Booth-wise statistics table

2. **Cadre Dashboard**
   - Active cadres count
   - Performance leaderboard
   - Booth coverage map
   - Activity timeline

3. **Poll Day Dashboard**
   - Live turnout percentage
   - Hourly turnout graph
   - Booth-wise turnout table
   - Family voting status
   - Target vs actual

#### Feature 9: Poll Day Operations

**Key Capabilities:**
- Vote marking with GPS verification
- Booth-wise turnout tracking
- Hourly statistics
- Family voting status
- Real-time Socket.IO updates
- Booth agent coordination
- Problem escalation

**Vote Marking Flow:**
1. Cadre searches voter
2. Confirms voter identity
3. Marks vote with GPS location
4. System updates turnout statistics
5. Real-time broadcast to dashboard

#### Feature 10: Campaign Management

**Communication Channels:**
- SMS (MSG91 integration)
- WhatsApp (template messages)
- Voice calls
- Email

**Features:**
- Template library
- Contact list segmentation
- Scheduled campaigns
- Delivery tracking
- Response tracking
- Cost management

#### Feature 11: Survey System

**Key Capabilities:**
- Custom question builder
- Question types (text, choice, rating, photo)
- Conditional logic (branching)
- Booth/cadre assignment
- Response collection (mobile app)
- Analytics dashboard
- Export responses

#### Feature 12: Reports & Exports

**Report Types:**
1. Voter List (booth-wise, part-wise)
2. Voter Slips (printable)
3. Cadre Performance Report
4. Poll Day Turnout Report
5. Demographic Analysis Report
6. Campaign Performance Report

**Export Formats:**
- PDF (formatted reports)
- Excel (data export)
- CSV (bulk data)

#### Feature 13: Master Data Management

**Master Tables:**
- Religion
- Caste Category (General, OBC, SC, ST, EWS)
- Caste
- Sub-Caste
- Language
- Political Party
- Government Schemes
- Voter Category (custom)

**Operations:**
- CRUD for all master tables
- Import from Excel
- Default data seeding
- Tenant-specific customization

#### Feature 14: AI Analytics (ElectionCaffe Only)

**AI Features:**
1. **Turnout Prediction**
   - ML model trained on historical data
   - Weather data integration
   - Demographic factors
   - Confidence intervals

2. **Swing Voter Identification**
   - Behavioral analysis
   - Demographic patterns
   - Influence network mapping
   - Targeting recommendations

3. **Booth Risk Assessment**
   - Historical incident data
   - Vulnerability scoring
   - Opposition strength analysis
   - Security deployment recommendations

4. **Result Forecasting**
   - Vote share prediction
   - Win probability
   - Scenario analysis

**AI Providers:**
- OpenAI (GPT-4 for analysis)
- Anthropic (Claude for reasoning)
- Custom models for predictions

#### Feature 15: News & Broadcast System (ElectionCaffe Only)

**Components:**
1. **News Parsing** - Automated news collection
2. **AI Analysis** - Sentiment, topics, implications
3. **Party Line Generation** - Official response suggestions
4. **Speech Points** - Talking points for candidates
5. **Action Plans** - Recommended actions based on news
6. **Broadcasting** - Multi-channel message distribution

#### Feature 16: Fund Management (ElectionCaffe Only)

**Features:**
- Fund accounts (multiple accounts)
- Donation tracking (donor, amount, date, mode)
- Expense management (category, vendor, receipts)
- Transaction history
- Financial reports
- Compliance tracking

#### Feature 17: Inventory Management (ElectionCaffe Only)

**Features:**
- Item categories (banners, flags, pamphlets, etc.)
- Stock tracking
- Movement logging (in/out)
- Booth/event allocation
- Consumption reports
- Low stock alerts

#### Feature 18: Mobile Application

**Target Users:** Cadres (Booth Incharge, Volunteers)

**Key Features:**
- Offline-first architecture
- Voter search & update
- Photo capture
- GPS-tagged data entry
- Family grouping
- Survey responses
- Poll day vote marking
- Performance dashboard

**Technology:**
- React Native (iOS + Android)
- SQLite for offline storage
- Background sync

---

## 7. Data Model & Information Architecture

### 7.1 Entity Relationship Overview

**Core Entities & Relationships:**

```
Tenant (1) ──────── (*) User
Tenant (1) ──────── (*) Election
Tenant (1) ──────── (*) Subscription

Election (1) ────── (*) Part
Election (1) ────── (*) Voter
Election (1) ────── (*) Cadre
Election (1) ────── (*) Survey
Election (1) ────── (*) Campaign

Part (1) ────────── (*) Section
Part (1) ────────── (*) Booth
Part (1) ────────── (*) Voter

Booth (1) ──────── (*) Voter
Booth (1) ──────── (*) Cadre (assignment)

Voter (*) ─────── (1) Family
Voter (*) ─────── (1) Religion
Voter (*) ─────── (1) Caste
Voter (*) ─────── (1) Language
Voter (*) ─────── (1) Party

Family (1) ───── (*) Voter
Family (1) ───── (1) Voter (captain)

Cadre (*) ────── (*) Booth (assignment)
Cadre (1) ────── (*) PollDayVote

Survey (1) ────── (*) SurveyResponse
Voter (1) ────────── (*) SurveyResponse
Cadre (1) ────────── (*) SurveyResponse
```

### 7.2 Database Schema Design Principles

1. **Normalization**: 3NF for transactional data
2. **Denormalization**: Computed fields for performance (totalVoters, counts)
3. **Soft Deletes**: `deletedAt` timestamp instead of hard deletes
4. **Audit Trail**: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
5. **Tenant Isolation**: `tenantId` on all tenant-scoped tables
6. **UUID Primary Keys**: For distributed systems and security
7. **Indexes**: Strategic indexes on foreign keys and search fields
8. **JSON Fields**: Flexible data storage for surveys, settings

### 7.3 Key Tables (Prisma Schema)

*[Refer to comprehensive codebase analysis section for complete schema]*

**High-Priority Indexes:**
```sql
-- Voter table
CREATE INDEX idx_voter_booth ON Voter(boothId);
CREATE INDEX idx_voter_part ON Voter(partId);
CREATE INDEX idx_voter_family ON Voter(familyId);
CREATE INDEX idx_voter_category ON Voter(voterCategory);
CREATE INDEX idx_voter_mobile ON Voter(mobile);
CREATE INDEX idx_voter_epic ON Voter(epicNo);

-- Cadre table
CREATE INDEX idx_cadre_booth ON Cadre(boothId);
CREATE INDEX idx_cadre_status ON Cadre(status);

-- Poll Day Vote
CREATE INDEX idx_poll_vote_timestamp ON PollDayVote(markedAt);
CREATE INDEX idx_poll_vote_booth ON PollDayVote(boothId);
```

---

## 8. User Experience & Interface Design

### 8.1 Design System

**Visual Design:**
- **Style**: Modern, clean, professional
- **Color Scheme**:
  - Primary: Blue (#3B82F6)
  - Secondary: Purple (#8B5CF6)
  - Success: Green (#10B981)
  - Warning: Yellow (#F59E0B)
  - Danger: Red (#EF4444)
- **Typography**: Inter font family
- **Icons**: Lucide React icons
- **Components**: Radix UI + shadcn/ui

**Layout:**
- Sidebar navigation (collapsible)
- Top header (user menu, notifications)
- Breadcrumb navigation
- Page header (title + actions)
- Content area (main content)

### 8.2 Key User Flows

**Flow 1: Adding a Voter**
```
Dashboard → Voters → Add Voter →
Fill Personal Info → Fill Contact → Fill Demographics →
Upload Photo → Review → Save →
Success Toast → View Voter Profile
```

**Flow 2: Poll Day Vote Marking**
```
Mobile App → Poll Day → Search Voter →
Confirm Identity → Mark Voted → Capture GPS →
Sync to Server → Update Turnout →
Show Success Animation
```

**Flow 3: Creating a Campaign**
```
Dashboard → Campaigns → Create Campaign →
Select Channel (SMS) → Choose Template →
Select Audience (filters) → Preview →
Schedule → Confirm → Launch
```

### 8.3 Responsive Design

- **Desktop**: Full sidebar, multi-column layouts
- **Tablet**: Collapsed sidebar, adaptive layouts
- **Mobile**: Bottom navigation, single column, touch-optimized

### 8.4 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode
- Focus indicators
- Aria labels

---

## 9. Technical Requirements

### 9.1 Technology Stack Summary

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + Radix UI
- Zustand + TanStack Query
- React Router 6
- React Hook Form + Zod
- Axios

**Backend:**
- Node.js 18+ + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL 14+
- Redis 7+
- Socket.IO
- Meilisearch

**Infrastructure:**
- Docker + Docker Compose
- NGINX (reverse proxy)
- AWS S3 (file storage)
- AWS RDS / Self-hosted PostgreSQL

### 9.2 Development Environment

**Prerequisites:**
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker Desktop (optional)

**Setup:**
```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### 9.3 Code Quality Standards

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode
- **Testing**: Jest + React Testing Library (target: 80% coverage)
- **Git Hooks**: Husky (pre-commit lint, pre-push test)

---

## 10. Security & Compliance

### 10.1 Security Requirements

1. **Authentication**: JWT with refresh tokens, bcrypt password hashing
2. **Authorization**: Role-based + permission-based access control
3. **Data Encryption**:
   - TLS 1.3 for data in transit
   - AES-256 for sensitive data at rest
4. **SQL Injection**: Prevented by Prisma ORM
5. **XSS**: React auto-escaping + CSP headers
6. **CSRF**: Token-based protection
7. **Rate Limiting**: 100 req/min per IP, 1000 req/min per user
8. **Secrets Management**: Environment variables, AWS Secrets Manager (production)
9. **Audit Logging**: All sensitive operations logged

### 10.2 Data Privacy

- **Personal Data**: Name, mobile, address, photos (PII)
- **Consent**: User consent for data collection
- **Retention**: Data deleted after election + 1 year
- **Access Control**: Strict role-based access
- **Data Portability**: Export user data on request
- **Right to Erasure**: Delete user data on request

### 10.3 Compliance

- **Election Commission Guidelines**: Adherence to EC regulations
- **IT Act 2000**: Compliance with Indian cyber laws
- **Data Protection**: GDPR-inspired practices (no formal GDPR requirement in India)

---

## 11. Performance & Scalability

### 11.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | < 2 seconds | Lighthouse |
| API Response Time | < 500ms (p95) | APM |
| Database Query | < 100ms (p95) | Query logs |
| Voter Search | < 200ms | User measurement |
| Poll Day Vote Mark | < 1 second | End-to-end |
| Concurrent Users | 10,000+ | Load testing |
| Uptime (Election Day) | 99.99% | Monitoring |

### 11.2 Scalability Strategy

**Horizontal Scaling:**
- Stateless API servers (can add more instances)
- Load balancer distribution
- Database read replicas
- Redis cluster for cache

**Vertical Scaling:**
- Database (16-32 GB RAM, 8-16 vCPU)
- API servers (4-8 GB RAM, 2-4 vCPU)

**Caching:**
- Redis for session, queries, dashboards
- CDN for static assets
- Browser caching (1 year for assets)

**Database Optimization:**
- Strategic indexes
- Connection pooling (100 connections)
- Query optimization
- Partitioning for large tables (voters)

---

## 12. Integration Requirements

### 12.1 Third-Party Integrations

| Service | Purpose | Priority |
|---------|---------|----------|
| MSG91 | SMS/WhatsApp | Must Have |
| AWS S3 | File storage | Must Have |
| Google Maps | Geocoding, maps | Should Have |
| DataCaffe.ai | Analytics dashboards | Could Have |
| OpenAI | AI analysis | Could Have |
| Razorpay | Payment gateway | Should Have |

### 12.2 API Design

**RESTful Principles:**
- Resource-based URLs
- HTTP methods (GET, POST, PUT, DELETE)
- HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- JSON request/response

**Versioning:**
- URL versioning: `/api/v1/voters`

**Documentation:**
- OpenAPI 3.0 specification
- Swagger UI for interactive docs

---

## 13. Deployment & Operations

### 13.1 Deployment Architecture

**Production Environment:**
```
Internet → Cloudflare CDN →
Load Balancer (NGINX) →
API Servers (3 instances) →
Database (Primary + 2 Replicas) →
Redis Cluster →
S3 Storage
```

### 13.2 CI/CD Pipeline

```
Code Push →
GitHub Actions →
Lint & Test →
Build Docker Images →
Push to Registry →
Deploy to Staging →
Manual Approval →
Deploy to Production →
Health Check
```

### 13.3 Monitoring & Observability

- **APM**: New Relic / Datadog
- **Logging**: Pino + Elasticsearch + Kibana
- **Metrics**: Prometheus + Grafana
- **Uptime**: Pingdom
- **Error Tracking**: Sentry

### 13.4 Backup & Disaster Recovery

- **Database Backup**: Daily full backup, hourly incremental
- **Retention**: 30 days
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour
- **Backup Location**: AWS S3 (different region)

---

## 14. Analytics & Reporting

### 14.1 Product Analytics

**Metrics to Track:**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Feature adoption rates
- User retention (D1, D7, D30)
- Session duration
- Bounce rate
- Conversion funnel (signup → first voter added)

**Tools:**
- Google Analytics
- Mixpanel (product analytics)
- Hotjar (heatmaps)

### 14.2 Business Metrics

- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- Net Promoter Score (NPS)

---

## 15. Mobile Strategy

### 15.1 Mobile App Requirements

**Platform:** iOS + Android (React Native)

**Core Features:**
- Offline-first voter data entry
- Photo capture with compression
- GPS-tagged updates
- Barcode scanner (EPIC QR codes)
- Push notifications
- Background sync

**Offline Capability:**
- SQLite local database
- Queue pending changes
- Auto-sync when online
- Conflict resolution

**Performance:**
- App size < 50 MB
- Startup time < 3 seconds
- Smooth 60 fps scrolling
- Battery optimization

---

## 16. Roadmap & Phases

### Phase 1: MVP (Months 1-3)

**Goal**: Launch functional platform for first 10 pilot customers

**Features:**
- ✅ Authentication & authorization
- ✅ Multi-tenant management
- ✅ Election management
- ✅ Voter database (add, edit, search)
- ✅ Geographic hierarchy (parts, booths)
- ✅ Basic dashboard
- ✅ Master data management
- ✅ Poll day vote marking

**Success Criteria:**
- 10 pilot customers onboarded
- 100,000+ voters in database
- 8/10 customers satisfied (NPS > 30)

---

### Phase 2: Feature Expansion (Months 4-9)

**Goal**: Add advanced features and scale to 100 customers

**Features:**
- ✅ Family management
- ✅ Cadre management
- ✅ Advanced analytics dashboard
- ✅ Bulk import/export
- ✅ Reports (PDF/Excel)
- ✅ Mobile app (MVP)
- ✅ Campaign management (SMS)
- ✅ Survey system

**Success Criteria:**
- 100 paying customers
- 5 million+ voters
- Mobile app: 5,000+ DAU
- NPS > 50

---

### Phase 3: AI & Advanced Features (Months 10-18)

**Goal**: Differentiate with AI and become market leader

**Features:**
- ✅ AI turnout prediction
- ✅ Swing voter identification
- ✅ Booth risk assessment
- ✅ News intelligence system
- ✅ Fund management
- ✅ Inventory management
- ✅ Real-time cadre tracking
- ✅ WhatsApp integration
- ✅ DataCaffe integration

**Success Criteria:**
- 500 customers
- 25 million+ voters
- AI models: 80%+ accuracy
- Market leadership established

---

### Phase 4: Scale & Expansion (Months 19-36)

**Goal**: Scale to 1,000 customers, expand to new geographies

**Features:**
- Multi-language support (22 languages)
- Website builder
- Video communication
- Chatbot support
- International expansion (Bangladesh, Sri Lanka, etc.)

**Success Criteria:**
- 1,000 customers
- 100 million+ voters
- ₹50 Cr ARR
- Expansion to 2 new countries

---

## 17. Success Metrics

### 17.1 Product Metrics

| Metric | Current | Year 1 | Year 2 | Year 3 |
|--------|---------|--------|--------|--------|
| **Customers** | 0 | 100 | 500 | 1,000 |
| **Voters in DB** | 0 | 5M | 25M | 100M |
| **DAU** | 0 | 2,000 | 10,000 | 50,000 |
| **Mobile DAU** | 0 | 1,000 | 5,000 | 25,000 |
| **Elections Managed** | 0 | 50 | 250 | 1,000 |
| **Booths Covered** | 0 | 5,000 | 25,000 | 100,000 |

### 17.2 Business Metrics

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| **ARR** | ₹6.7 Cr | ₹25 Cr | ₹50 Cr |
| **MRR** | ₹56 L | ₹2.1 Cr | ₹4.2 Cr |
| **Churn Rate** | 20% | 15% | 10% |
| **CAC** | ₹50,000 | ₹30,000 | ₹20,000 |
| **LTV** | ₹2.5 L | ₹5 L | ₹10 L |
| **LTV/CAC** | 5x | 16x | 50x |

### 17.3 Quality Metrics

| Metric | Target |
|--------|--------|
| **Uptime** | 99.9% |
| **API Response Time (p95)** | < 500ms |
| **Bug Density** | < 1 per 1000 LOC |
| **Security Incidents** | 0 |
| **NPS** | > 50 |
| **Customer Satisfaction** | > 4.5/5 |

---

## 18. Risk Assessment

### 18.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Database scalability** | High | Medium | Sharding, read replicas, caching |
| **Poll day traffic spike** | High | High | Load testing, auto-scaling, CDN |
| **Data loss** | Critical | Low | Daily backups, replication, testing |
| **Security breach** | Critical | Low | Penetration testing, audits, encryption |
| **Third-party API failure** | Medium | Medium | Fallbacks, circuit breakers, retries |

### 18.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Election Commission ban** | Critical | Low | Proactive compliance, legal counsel |
| **Competitor launches** | High | Medium | Fast innovation, customer lock-in |
| **Market adoption slow** | High | Medium | Pilot programs, case studies, marketing |
| **Regulatory changes** | Medium | Medium | Monitor regulations, agile adaptation |
| **Funding shortage** | High | Low | Revenue-first model, bootstrap-friendly |

### 18.3 Operational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Key employee leaving** | Medium | Medium | Documentation, knowledge sharing, backup |
| **Customer data breach** | Critical | Low | Security audits, encryption, compliance |
| **Vendor lock-in** | Medium | Medium | Multi-cloud, open standards |
| **Technical debt** | Medium | High | Code reviews, refactoring sprints |

---

## 19. Appendix

### 19.1 Glossary

| Term | Definition |
|------|------------|
| **EPIC** | Electoral Photo Identity Card (Voter ID) |
| **Part** | Geographic division (ward, mandal, area) |
| **Section** | Subdivision within a part |
| **Booth** | Polling booth/station |
| **Cadre** | Field worker (volunteer, coordinator, etc.) |
| **Loyal Voter** | Party supporter |
| **Swing Voter** | Undecided voter |
| **Turnout** | Percentage of voters who voted |
| **GOTV** | Get Out The Vote (poll day mobilization) |
| **EMC** | Election Management Company |

### 19.2 References

- ElectPro PRD documents (v1-v4)
- ElectionCaffe README
- Prisma schema files
- API route implementations
- React component library

### 19.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Initial | Complete PRD based on codebase analysis |

---

## Document Approval

**Prepared by**: AI Analysis Team
**Date**: January 20, 2026
**Status**: Ready for Review

**Stakeholders**:
- [ ] Product Owner
- [ ] Engineering Lead
- [ ] Design Lead
- [ ] Business Owner

---

**END OF DOCUMENT**

*This PRD represents a comprehensive analysis of the ElectionSoft platform based on deep codebase exploration. It serves as the definitive reference for product requirements, technical specifications, and strategic direction.*
