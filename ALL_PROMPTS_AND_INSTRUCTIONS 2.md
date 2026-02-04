# Complete Collection of Prompts & Instructions Used to Build ElectionSoft

**Document Purpose**: This document collates ALL prompts, instructions, specifications, and requirements documents used to build the ElectionSoft Election Management Platform.

**Last Updated**: February 2, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Product Requirements Documents (PRDs)](#product-requirements-documents-prds)
3. [Reference Application Analysis](#reference-application-analysis)
4. [Technical Specifications](#technical-specifications)
5. [Product Catalog & Marketing](#product-catalog--marketing)
6. [Implementation Instructions](#implementation-instructions)
7. [Setup & Configuration Guides](#setup--configuration-guides)
8. [All Documented Prompts](#all-documented-prompts)

---

## Overview

The ElectionSoft project consists of **two major implementations**:

1. **ElectPro** - Monolithic architecture (Turborepo-based)
2. **ElectionCaffe** - Microservices architecture with AI analytics

Both were built based on detailed analysis of the **Thedal TEAM App** (team.thedal.co.in), serving as a reference implementation for Indian election management.

---

## Product Requirements Documents (PRDs)

### 1. ElectPro PRD - Enhanced Version v2.0

**Source File**: `/PRD/ElectPro_PRD_Enhanced_v2.md`
**Lines**: 1,541 lines
**Date**: January 2026

#### Key Prompts & Instructions from PRD Part 1:

**Executive Summary Prompt**:
```
Build a comprehensive, multi-tenant Election Campaign Management Platform
designed for the Indian electoral ecosystem.

Reference Application: Thedal TEAM App (team.thedal.co.in)
Sample Data: Karaikudi BJP, Tamil Nadu
Scale: 2,93,285 voters across 388 booths

Target Features:
- Multi-tenant architecture with schema-per-tenant
- Complete voter database management
- Cadre and field worker coordination
- Poll day real-time monitoring
- Campaign management and communication
- Analytics and reporting
```

**Technology Stack Requirements**:
```
Frontend:
- React 18 + TypeScript + Vite
- Ant Design (antd) UI framework
- Zustand for state management
- React Query for server state
- ECharts/Recharts for visualizations
- Mapbox/Google Maps for mapping

Backend:
- Node.js + Express + TypeScript
- PostgreSQL 15+ for database
- Redis 7+ for caching
- Meilisearch for search
- AWS S3 for file storage

Architecture:
- Multi-tenancy: Schema-per-tenant approach
- Public schema: tenants, users, plans
- Tenant schema: elections, voters, cadres, campaigns
```

**Module Structure Prompt**:
```
Implement the following module hierarchy:

Dashboard
Election Manager
├── Your Elections
├── App Banner
├── Voting History
├── Voter Category
├── Voter Slip
├── Party
├── Religion
├── Caste Category
├── Caste
├── Sub-Caste
├── Language
├── Schemes
└── Feedback

Part Manager
├── Part List
├── Add Part
├── Section List
├── Add Section
├── Part Map
├── Vulnerability
├── Booth Committee
└── BLA-2

Voter Manager
├── Voters List
├── Add Voter
├── Voters Map
├── Double Entry Voters
├── Enroll Voter
├── SIR
├── Voter Photo
└── Aadhaar Verified

Family Manager
├── Family
├── Family Captain List
├── Add Family Captain
└── Family Captain Map

Cadre Manager
├── Cadre List
├── Add Cadre
├── Cadre Map
└── Cadre Tracking List

Campaign Manager
├── Communication Manager
└── Create Campaign

Poll Day Manager
├── Voter Turnout
└── Booth Agent

Survey Manager
└── Survey Forms

Member Manager
├── Members List
└── Add Member

Report
Settings
```

**Database Schema Instructions - User Profile**:
```sql
-- Instruction: Create users table with the following structure

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),

    -- Profile (from screenshot 011)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    profile_photo_url TEXT,

    -- Authentication
    password_hash VARCHAR(255) NOT NULL,

    -- Role & Permissions
    role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '[]',

    -- Status
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,

    UNIQUE(tenant_id, mobile)
);

-- Index for fast lookups
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_status ON users(status);
```

**Elections Table Schema**:
```sql
-- Instruction: Create elections table with bilingual support

CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    name_local VARCHAR(255),
    election_type VARCHAR(50) NOT NULL, -- ASSEMBLY, PARLIAMENT, LOCAL_BODY

    -- Dates
    poll_date DATE NOT NULL,
    counting_date DATE,

    -- Constituency
    constituency_name VARCHAR(255),
    constituency_code VARCHAR(50),

    -- Candidate
    candidate_name VARCHAR(255),
    candidate_party VARCHAR(100),
    candidate_photo_url TEXT,
    candidate_symbol VARCHAR(100),

    -- Statistics
    total_voters INTEGER DEFAULT 0,
    total_booths INTEGER DEFAULT 0,
    total_parts INTEGER DEFAULT 0,

    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);
```

**Voter Database Schema - Core**:
```sql
-- Instruction: Create comprehensive voter database with 40+ fields

CREATE TABLE voters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    election_id UUID REFERENCES elections(id),

    -- Identity
    epic_no VARCHAR(20) UNIQUE, -- Voter ID
    serial_no VARCHAR(20),

    -- Personal Info (Bilingual)
    name_english VARCHAR(255) NOT NULL,
    name_local VARCHAR(255),
    father_name_english VARCHAR(255),
    father_name_local VARCHAR(255),
    mother_name_english VARCHAR(255),
    mother_name_local VARCHAR(255),
    husband_name_english VARCHAR(255),
    husband_name_local VARCHAR(255),

    -- Demographics
    age INTEGER,
    date_of_birth DATE,
    gender VARCHAR(20), -- MALE, FEMALE, TRANSGENDER
    photo_url TEXT,

    -- Contact
    mobile VARCHAR(15),
    alternate_mobile VARCHAR(15),
    email VARCHAR(255),
    address TEXT,
    address_local TEXT,

    -- Location
    part_id UUID REFERENCES parts(id),
    section_id UUID REFERENCES sections(id),
    booth_id UUID REFERENCES booths(id),
    house_no VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Religion & Caste
    religion_id UUID REFERENCES religions(id),
    caste_category_id UUID REFERENCES caste_categories(id),
    caste_id UUID REFERENCES castes(id),
    sub_caste_id UUID REFERENCES sub_castes(id),

    -- Political
    language_id UUID REFERENCES languages(id),
    party_id UUID REFERENCES parties(id),
    voter_category VARCHAR(50), -- LOYAL, SWING, OPPOSITION
    influence_level VARCHAR(20), -- HIGH, MEDIUM, LOW

    -- Family
    family_id UUID REFERENCES families(id),
    is_family_captain BOOLEAN DEFAULT FALSE,

    -- Schemes & Benefits
    schemes JSONB DEFAULT '[]', -- Array of scheme IDs

    -- Status Flags
    is_dead BOOLEAN DEFAULT FALSE,
    is_shifted BOOLEAN DEFAULT FALSE,
    is_double_entry BOOLEAN DEFAULT FALSE,
    is_aadhaar_verified BOOLEAN DEFAULT FALSE,
    aadhaar_verified_at TIMESTAMP,

    -- Voting History
    voting_history JSONB DEFAULT '{}', -- {2024_pc: voted, 2021_ac: not_voted}

    -- Metadata
    added_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,

    -- Indexes
    INDEX idx_voters_tenant (tenant_id),
    INDEX idx_voters_election (election_id),
    INDEX idx_voters_part (part_id),
    INDEX idx_voters_booth (booth_id),
    INDEX idx_voters_family (family_id),
    INDEX idx_voters_epic (epic_no),
    INDEX idx_voters_mobile (mobile),
    INDEX idx_voters_category (voter_category)
);
```

---

### 2. ElectPro PRD Part 2 - Dashboard & Part Manager

**Source File**: `/PRD/ElectPro_PRD_Part2_PartManager_Dashboard.md`
**Lines**: 871 lines

#### Dashboard Implementation Prompts:

**Dashboard KPI Cards Specification**:
```
Create Election Dashboard with 20 KPI cards arranged in 4 rows x 5 columns:

Row 1 - Core Metrics (Blue cards #1890FF):
1. Total Booth: 388
2. Total School: 1
3. Total Voters: 2,93,285
4. Date Of Birth: 1,38,646 (47%)
5. Mobile Number: 1,16,099 (40%)

Row 2 - Family Metrics (Green cards #52C41A):
6. Total Family: count of families
7. Cross Booth Family: families spanning multiple booths
8. 1-Voter Family: single-member families
9. Addressed Voters: voters with addresses
10. Unaddressed Voters: voters without addresses

Row 3 - Demographic Metrics (Yellow cards #FAAD14):
11. Religion: voters with religion data
12. Caste Category: 5 categories
13. Caste: voters with caste data
14. Sub-Caste: 16 sub-castes
15. Language: 7 languages

Row 4 - Campaign Metrics (Peach cards #FFA07A):
16. Party Affiliation: voters with party data
17. Schemes: scheme beneficiaries
18. Voter Slip: generated slips
19. Family Slip: family slips
20. Benefit Slip: benefit slips

Features:
- Refresh button to reload data
- Clickable cards navigate to detailed view
- Responsive grid layout
- Loading skeleton on data fetch
```

**Statistics Dashboard with Charts**:
```
Implement Statistics Dashboard with 8 tabs:
1. Voter Category
2. Religion
3. Caste Category
4. Caste
5. Sub-Caste
6. Language
7. Schemes
8. Relation

Each tab displays:
- Total Items and Total Count header
- Pie chart (default) with configurable colors
- Toggle between pie/bar/line charts
- "Show Unknown" checkbox
- Download, filter, broadcast options
- Full-screen chart view
- Color picker for chart customization

API Endpoints:
GET /api/dashboard/stats/voter-category
GET /api/dashboard/stats/religion
GET /api/dashboard/stats/caste-category
GET /api/dashboard/stats/caste
GET /api/dashboard/stats/sub-caste
GET /api/dashboard/stats/language
GET /api/dashboard/stats/schemes
GET /api/dashboard/stats/relation

Response Format:
{
  "totalItems": 6,
  "totalCount": 293285,
  "data": [
    { "name": "Hindu", "count": 250000, "percentage": 85.2 },
    { "name": "Muslim", "count": 35000, "percentage": 11.9 },
    ...
  ]
}
```

**Cadre Dashboard Specification**:
```
Build Cadre Performance Dashboard with 4 widgets:

1. Activity Metrics Cards:
   - No. of Cadres (count icon)
   - Logged In (green check)
   - Not Logged (red cross)
   - Booths Assigned (map pin)

2. Performance Scorecard (grid layout):
   - Mobile Nos Updated
   - DoBs Updated
   - Parties Updated
   - Castes Updated
   - Religions Updated
   - Languages Updated

3. Top 10 Cadre Leaderboard:
   - Ranked list with scores
   - Name, booth, performance metrics
   - Badge for top 3

4. Least 10 Cadre Chart:
   - Horizontal bar chart
   - Identify underperformers
   - Coaching/training alerts

Real-time updates via WebSocket
```

**Poll Day Dashboard Real-Time Monitoring**:
```
Create Poll Day Dashboard with dual-panel layout:

LEFT PANEL - Voter Tracking:
Header: "Total Voters: 2,93,285 | Voted: X | Not Voted: Y | Turnout: Z%"

Features:
- Part filter dropdown (all parts by default)
- Time-series line chart: Polled Votes over time
- X-axis: Time (hourly from 7 AM to 6 PM)
- Y-axis: Cumulative voter count
- Color picker for chart (#1890FF default)
- Auto-refresh every 30 seconds
- Real-time WebSocket updates

RIGHT PANEL - Family Tracking:
Header: "Total Families: X | Voted Families: Y | Not Voted: Z | Partially Voted: P"

Features:
- Same controls as voter panel
- Time-series chart: Voted Families over time
- Family status indicator (green=all voted, yellow=partial, red=none)
- Drill-down to family details

WebSocket Events:
- vote:marked
- turnout:updated
- family:status:changed

API Endpoints:
GET /api/poll-day/turnout/:electionId
POST /api/poll-day/mark-vote
GET /api/poll-day/family-status/:electionId
```

**Part Manager Module Prompts**:
```
Implement Part List Page (/part-list):

Table Columns:
1. Checkbox - Bulk selection
2. Image - Part/booth thumbnail image
3. Part No - Numeric part number (6, 7, 8...)
4. Booth Name - English name
5. Name Local - Tamil/regional name
6. Coordinates - Lat, Lng display
7. Count - Voter count or other metric
8. Actions - View 👁️, Edit ✏️, External Link 🔗, Delete 🗑️

Features:
- Search bar (search by part name, booth name)
- Import button (bulk CSV/Excel upload)
- Add Part button
- Actions dropdown for bulk operations
- Pagination (10/20/50/100 per page)
- Sortable columns
- Responsive table design

Sample Data Row:
Part No: 6
Booth Name: "PANCHAYAT UNION PRIMARY SCHOOL, KALAIYAPPA NAGAR"
Name Local: "ஊராட்சி ஒன்றிய தொடக்கப்பள்ளி காளையப்பா நகர்"
Coordinates: "10.0905, 78.7713"
Count: 1,500 voters
```

**Bulk Upload System Pattern**:
```
Standard Bulk Upload Flow for all modules:

1. Upload Page Components:
   - Radio toggle: "Bulk Upload" | "Manual"
   - Drag & drop area with folder icon
   - "Browse files" button
   - "Download Sample File" link
   - "Download Excel Template" link
   - Upload button

2. File Validation:
   - Accept .csv, .xlsx, .xls
   - Max file size: 10 MB
   - Validate columns match template
   - Check for required fields
   - Detect duplicates

3. Preview & Confirm:
   - Show first 10 rows
   - Highlight errors in red
   - Display validation summary
   - Allow row-by-row editing
   - Skip invalid rows option

4. Import Process:
   - Progress bar with percentage
   - Real-time row processing count
   - Success/error counts
   - Generate error report (downloadable)

5. Post-Import:
   - Success toast notification
   - Redirect to list page
   - Display import summary
   - Email report to user

API Endpoint Pattern:
POST /api/{resource}/bulk-upload
Content-Type: multipart/form-data
Body: { file: File, election_id: string }

Response:
{
  "success": true,
  "total": 1500,
  "created": 1450,
  "updated": 40,
  "skipped": 10,
  "errors": [
    { "row": 15, "field": "part_number", "error": "Invalid part" }
  ]
}
```

---

### 3. ElectPro PRD Part 3 - Maps & Vulnerability

**Source File**: `/PRD/ElectPro_PRD_Part3_Maps_Vulnerability_Languages.md`
**Lines**: 980 lines

#### Map Implementation Prompt:

**Part Map with Leaflet.js**:
```
Implement Interactive Part Distribution Map:

Technology: Leaflet.js with OpenStreetMap tiles

Map Configuration:
const mapConfig = {
  center: [10.0905, 78.7713], // Constituency center
  zoom: 11,
  minZoom: 8,
  maxZoom: 18,
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors'
};

Features:
- Multi-select part filter dropdown
- Refresh button to reload markers
- Fullscreen toggle (⛶ icon)
- Zoom controls (+/-)
- Marker clustering for dense areas
- Custom booth markers (colored by vulnerability)
- Popup on marker click with booth details

Marker Clustering Config:
const clusterConfig = {
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true
};

Popup Content:
<div class="booth-popup">
  <h4>Part {partNumber}: {boothName}</h4>
  <p>Total Voters: {totalVoters}</p>
  <p>Male: {male} | Female: {female}</p>
  <p>Coordinates: {lat}, {lng}</p>
  <a href="/part-list?part={partNumber}">View Details →</a>
</div>

API:
GET /api/parts/map?election_id=xxx&part_numbers[]=1&part_numbers[]=2

Response:
{
  "center": { "lat": 10.0905, "lng": 78.7713 },
  "bounds": { "north": 10.2, "south": 9.9, "east": 79.0, "west": 78.5 },
  "markers": [
    {
      "id": "uuid",
      "partNumber": 6,
      "boothName": "Panchayat Union Primary School",
      "lat": 10.0905,
      "lng": 78.7713,
      "totalVoters": 1500,
      "isVulnerable": false
    }
  ]
}

Caching:
- Cache map data in localStorage
- TTL: 1 hour
- Show "Map data cached" notification
```

**Vulnerability Module Specification**:
```
Build Vulnerability/Booth Type Management:

URL: /boothType (labeled as "Vulnerability")

Table Structure:
- Booth Number (1-388)
- Vulnerability (dropdown selection)
- Action (Edit ✏️)

Vulnerability Types:
1. Not Assigned (Gray) - Default
2. Critical (Red #FF4D4F) - High-risk booth
3. Communal (Orange #FF7A45) - History of communal tension
4. Political (Yellow #FAAD14) - Political violence history
5. Naxal (Dark Red #A61D24) - Naxal-affected area
6. Border (Blue #1890FF) - Near state/country border
7. Remote (Purple #722ED1) - Difficult terrain/access

Features:
- Sortable by booth number
- Filter by vulnerability type
- Bulk assign vulnerability
- Export to Excel
- Visual map integration (color-coded markers)
- Access control: Admin and Campaign Manager only
- Warning message: "Contact your admin for access"

Edit Modal:
- Booth Number (read-only)
- Vulnerability Type (dropdown)
- Notes (textarea)
- Last Updated By (read-only)
- Save/Cancel buttons

API:
GET /api/vulnerability?election_id=xxx&page=1&limit=10
PUT /api/vulnerability/:boothId
Body: { vulnerabilityType: "CRITICAL", notes: "Previous incidents" }

Database:
ALTER TABLE booths ADD COLUMN vulnerability_type VARCHAR(50);
ALTER TABLE booths ADD COLUMN vulnerability_notes TEXT;
ALTER TABLE booths ADD COLUMN vulnerability_updated_by UUID;
ALTER TABLE booths ADD COLUMN vulnerability_updated_at TIMESTAMP;

CREATE INDEX idx_booths_vulnerability ON booths(vulnerability_type);
```

**Languages Module with Bilingual Support**:
```
Implement Languages Master Data Module:

Supported Languages (7):
1. Tamil (தமிழ்) - ISO: ta
2. Telugu (తెలుగు) - ISO: te
3. Kannada (ಕನ್ನಡ) - ISO: kn
4. Malayalam (മലയാളം) - ISO: ml
5. Saurashtra - ISO: saz
6. Hindi (हिन्दी) - ISO: hi
7. Urdu (اردو) - ISO: ur

Table Schema:
CREATE TABLE languages (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,

    name_english VARCHAR(100) NOT NULL,
    name_local VARCHAR(100) NOT NULL,
    iso_code VARCHAR(10),
    script VARCHAR(50), -- Devanagari, Tamil, Telugu, etc.

    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

UI Features:
- Search languages
- Import from CSV
- Add language form (English + Local name)
- Activate/deactivate toggle
- Reorder via drag-and-drop
- Voter count per language
- Color-coded badges

Voter Language Selection:
- Single language per voter
- Dropdown with both English and local script
- Auto-detect from name script (AI)
- Used for personalized communication

API:
GET /api/languages?tenant_id=xxx
POST /api/languages
PUT /api/languages/:id
DELETE /api/languages/:id

Seed Data:
INSERT INTO languages (name_english, name_local, iso_code) VALUES
('Tamil', 'தமிழ்', 'ta'),
('Telugu', 'తెలుగు', 'te'),
('Kannada', 'ಕನ್ನಡ', 'kn'),
('Malayalam', 'മലയാളം', 'ml'),
('Hindi', 'हिन्दी', 'hi'),
('Urdu', 'اردو', 'ur');
```

**Government Schemes Module**:
```
Build Schemes Management for Beneficiary Tracking:

Scheme Table Structure:
CREATE TABLE schemes (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,

    -- Bilingual
    scheme_name_english VARCHAR(255) NOT NULL,
    scheme_name_local VARCHAR(255),

    -- Details
    scheme_code VARCHAR(50),
    scheme_provider VARCHAR(100), -- UNION_GOVT, STATE_GOVT, LOCAL_BODY
    benefit_amount DECIMAL(10,2),
    benefit_type VARCHAR(50), -- ONE_TIME, MONTHLY, YEARLY

    -- Eligibility
    eligible_categories JSONB, -- ['SC', 'ST', 'OBC']
    age_min INTEGER,
    age_max INTEGER,
    gender VARCHAR(20),
    income_limit DECIMAL(10,2),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,

    -- Description
    description_english TEXT,
    description_local TEXT,
    application_url TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

Sample Schemes:
1. PMUY (Free LPG) - ₹10,000 one-time
2. PMMY (Mudra Yojana) - ₹50,000 one-time
3. PMKISAN - ₹6,000 yearly (₹60,000 over 10 years)
4. PMAY (Housing) - ₹50,000 one-time

Beneficiary Tracking:
CREATE TABLE voter_schemes (
    id UUID PRIMARY KEY,
    voter_id UUID REFERENCES voters(id),
    scheme_id UUID REFERENCES schemes(id),

    status VARCHAR(50), -- APPLIED, APPROVED, RECEIVED, REJECTED
    application_date DATE,
    approval_date DATE,
    benefit_received_date DATE,
    amount_received DECIMAL(10,2),

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

UI Features:
- Scheme list with filters (provider, benefit type, active status)
- Add/Edit scheme form
- Beneficiary list per scheme
- Mark voters as beneficiaries
- Track application → approval → receipt
- Generate beneficiary reports
- SMS campaigns to beneficiaries

API:
GET /api/schemes
POST /api/schemes
GET /api/schemes/:id/beneficiaries
POST /api/voter-schemes
```

---

### 4. ElectPro PRD Part 4 - Sections & Sub-Castes

**Source File**: `/PRD/ElectPro_PRD_Part4_Section_SubCaste_PartForm.md`
**Lines**: 883 lines

#### Section Management Prompts:

**Add Section Page Specification**:
```
Implement Add Section Page with Bulk Upload:

URL: /add-section

UI Layout:
┌─────────────────────────────────────┐
│         Add Section                 │
│                                     │
│  Choose a method to add section     │
│                                     │
│  ● Bulk Upload    ○ Manual          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   Section Bulk Upload               │
│                                     │
│   Upload a CSV file with section    │
│   details here.                     │
│                                     │
│   [Drag & Drop Area]                │
│   📁                                │
│   Drag your CSV file to start       │
│   or [Browse files]                 │
│                                     │
│   Download Sample File              │
│   Download Excel Template           │
│                                     │
│   [Upload Button]                   │
│                                     │
└─────────────────────────────────────┘

CSV Template Fields:
part_number, section_number, section_name, section_name_local

Sample CSV:
6,1,"Ward 1 - Area Name","வார்டு 1 - பகுதி பெயர்"
6,2,"Ward 2 - Area Name","வார்டு 2 - பகுதி பெயர்"
7,1,"Ward 1 - Different Area","வார்டு 1 - வேறு பகுதி"
8,999,"Overseas Voters","வெளிநாட்டு வாக்காளர்"

Validation Rules:
- part_number: Must exist in parts table
- section_number: Unique within part
- section_name: Required, 3-500 chars
- section_name_local: Optional, 3-500 chars

API:
POST /api/sections/bulk-upload
Content-Type: multipart/form-data
Body: { file: File, election_id: string }

Response:
{
  "success": true,
  "data": {
    "total": 1792,
    "created": 1780,
    "updated": 10,
    "failed": 2,
    "errors": [
      { "row": 15, "field": "section_number", "message": "Duplicate section" }
    ]
  }
}

Template Download:
GET /api/sections/template
Response: Excel file with headers and sample data
```

**Sub-Caste Module with Hierarchy**:
```
Build Sub-Caste Management with Parent Relationships:

URL: /sub-caste

Table Columns:
- Checkbox (bulk selection)
- Sub-Caste Name (bilingual: English + Tamil)
- Religion (parent religion with local script)
- Caste (parent caste name)
- Actions (Edit, Delete menu ⋯)

Sub-Caste to Caste Mapping:

Mukkulathor (முக்குலத்தோர்) Parent:
├── Kallar (கள்ளர்)
├── Maravar (மறவர்)
└── Agamudaiyar (அகமுடையார்)

Devendra Kula Velaalar (தேவேந்திர குல வேளாளர்) Parent:
├── Devendrakulathar (தேவேந்திரகுலத்தர்)
├── Kadaiyar (கடையர்)
├── Kaalaadi (காலாடி)
└── Kudumbar (குடும்பர்)

Vanniyar (வன்னியர்) Parent:
├── Vanniyar (வன்னியர்)
└── Vanniya Gounder (வன்னிய கவுண்டர்)

Database Schema:
CREATE TABLE sub_castes (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,

    sub_caste_name VARCHAR(255) NOT NULL,
    sub_caste_name_local VARCHAR(255),

    caste_id UUID REFERENCES castes(id),
    religion_id UUID REFERENCES religions(id),

    voter_count INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

Features:
- Search sub-castes
- Filter by religion or caste
- Import from CSV
- Add sub-caste form:
  - Sub-caste name (English + Local)
  - Select religion (auto-loads castes)
  - Select caste (parent)
  - Display order
- Voter count per sub-caste
- Hierarchical tree view option

API:
GET /api/sub-castes?election_id=xxx&search=&caste_id=
POST /api/sub-castes
PUT /api/sub-castes/:id
DELETE /api/sub-castes/:id

Response Format:
{
  "id": "uuid",
  "subCasteName": "Kallar",
  "subCasteNameLocal": "கள்ளர்",
  "religionId": "uuid",
  "religionName": "Hindu",
  "religionNameLocal": "இந்து",
  "casteId": "uuid",
  "casteName": "Mukkulathor",
  "casteNameLocal": "முக்குலத்தோர்",
  "voterCount": 5000
}
```

**Create Part Manual Form**:
```
Build Create Part Manual Form:

Form Fields:
1. Part Number
   - Type: Number
   - Validation: Unique, positive integer
   - Placeholder: "Enter part number"

2. Part Name (English)
   - Type: Text
   - Validation: Required, 3-500 chars
   - Placeholder: "Enter part name in English"

3. Part Name (Local - Tamil)
   - Type: Text
   - Validation: Optional, 3-500 chars
   - Placeholder: "பகுதி பெயரை உள்ளிடவும்"

4. Total Voters (from EC)
   - Type: Number
   - Validation: Positive integer
   - Info: "As per Election Commission data"

5. Image Upload
   - Type: File
   - Accept: .jpg, .png, .jpeg
   - Max Size: 1 MB
   - Preview thumbnail after upload
   - Compress before saving

6. GPS Coordinates
   - Latitude: Number (-90 to 90)
   - Longitude: Number (-180 to 180)
   - Map picker button (opens modal)
   - Auto-detect location button

7. Vulnerability Type
   - Type: Dropdown
   - Options: Not Assigned, Critical, Communal, Political, Naxal, Border, Remote
   - Default: Not Assigned

Form Layout:
┌─────────────────────────────────────┐
│    Create Part Manually             │
│                                     │
│  Part Number: [____]                │
│  Part Name (English): [___________] │
│  Part Name (Tamil): [_____________] │
│  Total Voters: [____]               │
│                                     │
│  Image Upload:                      │
│  [Choose File] No file chosen       │
│  Max 1MB (JPG, PNG)                 │
│                                     │
│  GPS Coordinates:                   │
│  Latitude: [____] Longitude: [____] │
│  [📍 Pick on Map] [📍 Use Current]  │
│                                     │
│  Vulnerability: [Not Assigned ▼]    │
│                                     │
│  [Cancel] [Save Part]               │
└─────────────────────────────────────┘

Validation:
- Part number: Must be unique within election
- Part name: Cannot be empty, min 3 chars
- Latitude: Range -90 to 90
- Longitude: Range -180 to 180
- Image: Max 1MB, compress if larger

Image Compression:
- Use browser Canvas API
- Max dimensions: 800x600
- Quality: 0.8
- Convert to JPEG if PNG

API:
POST /api/parts
Body: {
  "partNumber": "6",
  "partName": "Malad West",
  "partNameLocal": "மலாட் மேற்கு",
  "totalVoters": 45000,
  "imageUrl": "https://s3.../part-6.jpg",
  "latitude": 10.0905,
  "longitude": 78.7713,
  "vulnerabilityType": "NOT_ASSIGNED",
  "electionId": "uuid"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "partNumber": "6",
    ...
  }
}

Success Flow:
1. Validate form
2. Upload image to S3
3. Create part record
4. Show success toast
5. Redirect to part list
6. Highlight new part
```

---

## Reference Application Analysis

### Thedal TEAM App (team.thedal.co.in)

**Source**: 100+ UI screenshots captured for analysis
**Location**: `/Video Frame Extractor 2026-01-17 10_40_06 GMT+5_30/`

#### Key Insights from Screenshots:

**Application Scale (Karaikudi BJP, Tamil Nadu)**:
```
Total Statistics:
- Total Voters: 2,93,285
- Male Voters: 1,43,498 (48.9%)
- Female Voters: 1,49,761 (51.1%)
- Transgender Voters: 26 (0.01%)
- Total Booths: 388
- Total Parts: 388
- Total Sections: 1,792
- Religions: 6
- Caste Categories: 5 (OC, BC, MBC, SC, ST)
- Castes: 19
- Sub-Castes: 16
- Languages: 7
- Schemes: 15+

These numbers serve as reference scale for testing and validation.
```

**UI/UX Patterns Observed**:
```
Standard Page Layout:
┌────────────────────────────────────┐
│ [Page Title]  [Import] [+ Add]     │
├────────────────────────────────────┤
│ [Search____] [🔍] [Clear] [Actions▼]│
├────────────────────────────────────┤
│ ☐ │ Column 1 ↕│ Column 2│ ... │ ⋯ │
├───┼────────────┼─────────┼─────┼───┤
│ ☐ │ Data       │ Data    │ ... │ ⋯ │
│ ☐ │ Data       │ Data    │ ... │ ⋯ │
├────────────────────────────────────┤
│ 1-10 of 388 items  < [1][2][3] >  │
│ 10/page ▼                     Go to│
└────────────────────────────────────┘

Color Scheme:
- Primary Blue: #1890FF
- Success Green: #52C41A
- Warning Yellow: #FAAD14
- Error Red: #FF4D4F
- Info Cyan: #13C2C2

Icons (Lucide React):
- View: Eye icon
- Edit: Edit icon
- Delete: Trash2 icon
- Search: Search icon
- Download: Download icon
- Upload: Upload icon
- Map: Map icon
- Filter: Filter icon

Typography:
- Font Family: Inter, system-ui, sans-serif
- Headings: 24px/28px bold
- Body: 14px/20px regular
- Small: 12px/18px regular
```

---

## Technical Specifications

### ElectionCaffe Architecture

**Source**: `/ElectionCaffe/README.md`

#### Microservices Setup Prompt:

**Complete Architecture Instructions**:
```
Build ElectionCaffe with microservices architecture:

Services Required:
1. API Gateway (Port 3000)
   - Route requests to services
   - JWT validation
   - Rate limiting
   - WebSocket proxy

2. Auth Service (Port 3001)
   - User authentication
   - Tenant management
   - Invitations
   - Organization settings
   - News & Broadcast
   - Fund management
   - Inventory management
   - Events
   - Internal chat
   - Notifications

3. Election Service (Port 3002)
   - Election CRUD
   - Parts, sections, booths
   - Master data (religion, caste, language, party, schemes)
   - Candidates
   - Surveys
   - Voting history
   - Vulnerability

4. Voter Service (Port 3003)
   - Voter CRUD
   - Voter search
   - Bulk import/export
   - Duplicate detection
   - Family management
   - Family auto-grouping
   - Voter slip generation

5. Cadre Service (Port 3004)
   - Cadre management
   - Booth assignments
   - Performance tracking
   - Location tracking
   - Poll day vote marking
   - Turnout monitoring

6. Analytics Service (Port 3005)
   - Voter analytics
   - Demographic analysis
   - Cadre performance
   - Dashboard aggregations
   - Booth-wise statistics

7. Reporting Service (Port 3006)
   - Report generation (PDF, Excel)
   - DataCaffe.ai integration
   - Embedded dashboards
   - Data synchronization

8. AI Analytics Service (Port 3007)
   - Turnout prediction
   - Election forecasting
   - Swing voter analysis
   - Booth risk assessment
   - Campaign recommendations

9. Super Admin Service (Port 3008)
   - Tenant provisioning
   - Database management
   - License management
   - Feature flags
   - System health
   - EC data integration

Technology Stack:
- Runtime: Node.js 18+
- Framework: Express.js
- Language: TypeScript
- Database: PostgreSQL 14+
- ORM: Prisma
- Authentication: JWT
- Real-time: Socket.IO
- Process Manager: Turborepo

Directory Structure:
ElectionCaffe/
├── apps/
│   ├── web/                 # React frontend
│   └── super-admin/         # Super admin portal
├── packages/
│   ├── database/            # Prisma schemas
│   └── shared/              # Shared utilities
├── services/
│   ├── gateway/
│   ├── auth-service/
│   ├── election-service/
│   ├── voter-service/
│   ├── cadre-service/
│   ├── analytics-service/
│   ├── reporting-service/
│   ├── ai-analytics-service/
│   └── super-admin-service/
└── scripts/
```

**Database Configuration Prompt**:
```
Setup Multi-Database Architecture:

Core Database (ElectionCaffeCore):
- SuperAdmins
- Tenants
- FeatureFlags
- TenantFeature
- SystemConfig

Tenant Database Options:
1. Shared Database (ElectionCaffe)
   - All tenant data in single DB
   - Filtered by tenant_id

2. Dedicated Database per Tenant
   - Separate DB: tenant_{slug}_db
   - Complete data isolation

Environment Variables:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ElectionCaffe"
CORE_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ElectionCaffeCore"

Prisma Schema Structure:
packages/database/
├── prisma/
│   ├── schema.prisma        # Legacy unified schema
│   ├── core/
│   │   └── schema.prisma    # Core tables
│   └── tenant/
│       └── schema.prisma    # Tenant tables

Client Generation:
npm run db:generate:core     # Generates @prisma/core-client
npm run db:generate:tenant   # Generates @prisma/tenant-client

Usage in Code:
import { coreDb } from '@electioncaffe/database/core';
import { tenantDb } from '@electioncaffe/database/tenant';

// Core operations
const tenant = await coreDb.tenant.findUnique({ where: { id } });

// Tenant operations (with tenant context)
const voters = await tenantDb(tenantId).voter.findMany();
```

---

## Product Catalog & Marketing

**Source**: `/ElectionCaffe/PRODUCT_CATALOG.md`

### Product Positioning Prompts:

**Marketing Copy Instructions**:
```
Position ElectionCaffe as:

Tagline: "Transforming Political Campaign Management"

Key Messages:
1. All-in-one solution for modern political campaigns
2. Multi-tenant SaaS platform for parties, candidates, consultants
3. Real-time operations with AI-powered insights
4. Secure, scalable, modular platform

Value Propositions by User:

Campaign Managers:
- Complete campaign visibility
- Data-driven decision making
- Efficient team coordination
- Reduced operational complexity

Field Workers:
- Easy-to-use mobile interface
- Clear task assignments
- Real-time communication
- Performance tracking

Party Leadership:
- Strategic insights
- Resource optimization
- Risk management
- Competitive advantage

IT Administrators:
- Secure infrastructure
- Scalable architecture
- Easy integration
- Minimal maintenance

Success Metrics to Highlight:
- 50% reduction in campaign coordination time
- 3x increase in voter contact efficiency
- Real-time visibility of all activities
- 40% improvement in resource utilization
- 80% faster report generation
- 70% faster issue resolution

Competitive Advantages:
1. Dual architecture (monolith + microservices)
2. AI-powered analytics built-in
3. Family intelligence with cross-booth tracking
4. Multi-tenant flexibility (shared/dedicated/self-hosted)
5. News intelligence system
6. Integrated fund & inventory management
7. Real-time poll day operations
8. DataCaffe.ai integration

Pricing Tiers:

Starter Plan:
- Up to 50,000 voters
- 50 cadre members
- 5 concurrent users
- Core features included
- Email support

Professional Plan:
- Up to 200,000 voters
- 200 cadre members
- 25 concurrent users
- Core features + 3 add-ons
- Priority support + training

Enterprise Plan:
- Unlimited voters
- Unlimited cadre
- Unlimited users
- All features included
- Dedicated support
- On-site training
- Custom integrations
- White-label options

Optional Add-Ons:
✓ Fund Management
✓ Inventory Management
✓ Event Management
✓ AI Analytics
✓ Website Builder
✓ Advanced Reporting
```

**Feature Descriptions**:
```
Core Modules Marketing Copy:

1. Election Management:
   "Organize and structure your electoral campaigns with
   multi-level election support, geographic organization,
   and comprehensive party management."

2. Voter Management:
   "Build comprehensive voter databases with 360° voter
   understanding. Track demographics, family networks,
   engagement history, and enable targeted outreach."

3. Cadre & Field Force:
   "Empower your ground team with digital tools. Manage
   hierarchies, assign tasks, track performance, and ensure
   100% accountability of field operations."

4. Poll Day Management:
   "Real-time monitoring and rapid response on election day.
   Track live turnout, distribute voter slips, report issues,
   and coordinate field deployment with WebSocket integration."

5. Analytics & Reporting:
   "Make data-driven campaign decisions with comprehensive
   voter analytics, cadre performance tracking, real-time
   dashboards, and custom report generation."

6. AI-Powered Intelligence:
   "Harness artificial intelligence for competitive advantage.
   Sentiment analysis, predictive analytics, smart
   recommendations, and AI-powered insights."

7. Communication & Outreach:
   "Multi-channel voter engagement through Neighborhood
   Broadcasting (SMS/Voice), internal notifications, team
   chat, news distribution, and action items."

8. Website Builder:
   "Create professional campaign websites instantly with
   templates, drag-and-drop editor, SEO optimization, and
   multi-page support."

9. Fund Management:
   "Transparent campaign finance tracking with donation
   management, expense tracking, financial reports, and
   compliance adherence."

10. Inventory Management:
    "Track campaign materials and assets. Manage banners,
    posters, vehicles, distribution, stock monitoring, and
    vendor management."

11. Event Management:
    "Organize rallies, meetings, and public events. Plan
    events, track attendance, assign tasks, and measure
    impact with event analytics."
```

---

## Implementation Instructions

### Development Setup Prompts:

**Complete Setup Instructions**:
```bash
# Step 1: Prerequisites
Install the following:
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm 9 or higher

# Step 2: Clone and Install
cd ElectionCaffe
npm install

# Step 3: Configure Environment
cp .env.example .env

# Edit .env with your configuration:
DATABASE_URL="postgresql://postgres:password@localhost:5432/ElectionCaffe"
CORE_DATABASE_URL="postgresql://postgres:password@localhost:5432/ElectionCaffeCore"

JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars"

# Service Ports (default)
GATEWAY_PORT=3000
AUTH_PORT=3001
ELECTION_PORT=3002
VOTER_PORT=3003
CADRE_PORT=3004
ANALYTICS_PORT=3005
REPORTING_PORT=3006
AI_ANALYTICS_PORT=3007
WEB_PORT=5173

# Step 4: Setup Database
npm run db:generate    # Generate Prisma clients
npm run db:push        # Create database schema
npm run db:seed        # Seed with sample data

# Step 5: Start Development Server
npm run dev            # Starts all services

# Access URLs:
# Web App: http://localhost:5173
# API Gateway: http://localhost:3000
# Super Admin: http://localhost:5174

# Step 6: Default Login Credentials
Mobile: 9876543210
Password: admin123

# Super Admin:
Email: superadmin@electioncaffe.com
Password: SuperAdmin@123
```

**Multi-Tenant Portal Setup**:
```bash
# Start all tenant portals (separate ports)
./start-all-tenants.sh

# Or manually:
cd apps/web
npm run dev:all-tenants

# Tenant URLs (Development):
http://localhost:5180/  # Demo
http://localhost:5181/  # BJP Tamil Nadu
http://localhost:5182/  # BJP Uttar Pradesh
http://localhost:5183/  # AIDMK Tamil Nadu

# Production (Subdomains):
https://demo.electioncaffe.com
https://bjp-tn.electioncaffe.com
https://bjp-up.electioncaffe.com
https://aidmk-tn.electioncaffe.com

# Each tenant portal automatically detects
# organization from URL - no tenant slug needed!
```

---

## Setup & Configuration Guides

### Tenant Access Guide

**Source**: `/ElectionCaffe/TENANT_ACCESS_GUIDE.md`

**Multi-Tenant Access Configuration**:
```
ElectionCaffe Multi-Tenant Access Pattern:

Port-Based Isolation (Development):
Each tenant gets dedicated port for complete isolation.

Tenant Portals:
├── Demo (localhost:5180)
│   └── Email: demo@electioncaffe.com | Password: Admin@123
├── BJP Tamil Nadu (localhost:5181)
│   └── Email: admin.bjp-tn@electioncaffe.com | Password: Admin@123
├── BJP Uttar Pradesh (localhost:5182)
│   └── Email: admin.bjp-up@electioncaffe.com | Password: Admin@123
└── AIDMK Tamil Nadu (localhost:5183)
    └── Email: admin.aidmk-tn@electioncaffe.com | Password: Admin@123

Subdomain-Based Isolation (Production):
├── demo.electioncaffe.com
├── bjp-tn.electioncaffe.com
├── bjp-up.electioncaffe.com
└── aidmk-tn.electioncaffe.com

Auto-Detection Logic:
1. Extract hostname from request
2. Parse subdomain or port
3. Map to tenant slug
4. Load tenant configuration
5. Apply tenant branding
6. Enforce tenant quotas

Frontend Configuration:
// apps/web/src/utils/tenant.ts
export function getTenantFromURL(): string {
  const hostname = window.location.hostname;
  const port = window.location.port;

  // Port-based (dev)
  const portToTenant = {
    '5180': 'demo',
    '5181': 'bjp-tn',
    '5182': 'bjp-up',
    '5183': 'aidmk-tn'
  };

  if (port && portToTenant[port]) {
    return portToTenant[port];
  }

  // Subdomain-based (prod)
  const subdomain = hostname.split('.')[0];
  return subdomain;
}

Backend Middleware:
// services/gateway/src/middleware/tenant.ts
export function tenantMiddleware(req, res, next) {
  const hostname = req.hostname;
  const port = req.headers['x-forwarded-port'] || req.socket.localPort;

  const tenant = resolveTenant(hostname, port);

  if (!tenant) {
    return res.status(404).json({
      error: 'Tenant not found'
    });
  }

  req.tenant = tenant;
  next();
}
```

---

## All Documented Prompts

### Database Seeding Prompts

**Comprehensive Seed Data Instructions**:
```typescript
// Prompt: Create seed data for 10 tenants across 8 Indian states

const seedInstructions = {
  tenants: {
    count: 10,
    types: ['POLITICAL_PARTY', 'INDIVIDUAL_CANDIDATE', 'ELECTION_MANAGEMENT'],
    states: ['Tamil Nadu', 'Karnataka', 'Maharashtra', 'Gujarat',
             'Uttar Pradesh', 'Andhra Pradesh', 'West Bengal', 'Kerala'],
    distribution: {
      parties: 6,   // Major state parties
      candidates: 3, // Individual candidates
      emc: 1        // Election management company
    }
  },

  users: {
    perTenant: 3,  // Admin + 2 users
    roles: ['TENANT_ADMIN', 'CAMPAIGN_MANAGER', 'COORDINATOR']
  },

  elections: {
    perTenant: 3,
    types: ['ASSEMBLY', 'PARLIAMENT', 'LOCAL_BODY'],
    status: 'ACTIVE',
    dates: {
      pollDate: 'Future date (3-6 months)',
      countingDate: 'Poll date + 3 days'
    }
  },

  geography: {
    partsPerElection: 20,
    sectionsPerPart: 3,
    boothsPerSection: 2,
    naming: 'Local area names in respective languages'
  },

  voters: {
    perElection: 3000,
    distribution: {
      male: 48,
      female: 51,
      transgender: 1
    },
    dataCompleteness: {
      mobile: 40,      // 40% have mobile
      dob: 47,         // 47% have DOB
      religion: 60,    // 60% have religion
      caste: 55,       // 55% have caste
      party: 30        // 30% have party affiliation
    },
    categories: {
      LOYAL: 30,
      SWING: 25,
      OPPOSITION: 20,
      UNKNOWN: 25
    }
  },

  families: {
    perElection: 600,  // ~5 members per family
    avgSize: 5,
    captains: 600,     // 1 captain per family
    crossBooth: 5      // 5% families span booths
  },

  cadres: {
    perElection: 60,
    roles: {
      COORDINATOR: 10,
      BOOTH_INCHARGE: 40,
      VOLUNTEER: 10
    },
    assignments: 'Assign to booths with performance metrics'
  },

  masterData: {
    religions: 6,      // Hindu, Muslim, Christian, Buddhist, Sikh, Jain
    casteCategories: 5, // OC, BC, MBC, SC, ST
    castes: 19,
    subCastes: 16,
    languages: 7,
    parties: 15,
    schemes: 20,
    voterCategories: 5 // Available, Shifted, Double Entry, Outstation, Not Home
  },

  features: {
    surveys: 3,
    feedbackIssues: 15,
    voterSlipTemplates: 1,
    appBanners: 5,
    datacaffeEmbeds: 1,
    aiAnalytics: 1
  }
};

// Expected Output Summary:
// ✓ 10 tenants created
// ✓ 35 users (10 admins + 25 staff)
// ✓ 25 elections (avg 2-3 per tenant)
// ✓ 165 parts/booths
// ✓ 24,200 voters
// ✓ 4,800 families
// ✓ 485 cadres
```

---

## Summary: Key Instruction Patterns

### 1. Multi-Tenancy Pattern
```
FOR EVERY TABLE:
- Add tenant_id column (UUID NOT NULL)
- Add INDEX on tenant_id
- Filter ALL queries by tenant_id
- Use schema-per-tenant OR shared DB with row-level filtering
```

### 2. Bilingual Support Pattern
```
FOR MASTER DATA & KEY ENTITIES:
- name_english VARCHAR(255)
- name_local VARCHAR(255)
- Display: "English (Local Script)"
- Example: "Hindu (இந்து)"
```

### 3. Soft Delete Pattern
```
FOR IMPORTANT TABLES:
- Add deleted_at TIMESTAMP NULL
- Filter: WHERE deleted_at IS NULL
- Soft delete: UPDATE SET deleted_at = NOW()
- Hard delete: Only for admin operations
```

### 4. Audit Trail Pattern
```
FOR ALL TABLES:
- created_by UUID REFERENCES users(id)
- created_at TIMESTAMP DEFAULT NOW()
- updated_by UUID REFERENCES users(id)
- updated_at TIMESTAMP DEFAULT NOW()
```

### 5. Bulk Upload Pattern
```
FOR ALL MODULES:
1. Download template endpoint
2. Upload with validation
3. Preview with errors
4. Confirm and import
5. Generate error report
6. Success summary
```

### 6. Pagination Pattern
```
FOR ALL LIST APIs:
- page: number (default 1)
- limit: number (default 10, options: 10/20/50/100)
- sort: field name
- order: asc/desc
- search: string
- filters: object

Response:
{
  data: [],
  meta: {
    total: number,
    page: number,
    limit: number,
    pages: number
  }
}
```

### 7. WebSocket Pattern
```
FOR REAL-TIME FEATURES:
- Namespace: /ws/poll-day, /ws/cadres, /ws/notifications
- Rooms: election:{id}, booth:{id}, user:{id}
- Events: {entity}:{action} (vote:marked, turnout:updated)
- Auth: Verify JWT on connection
```

---

## Conclusion

This document captures **ALL prompts, instructions, specifications, and requirements** used to build the ElectionSoft platform. It serves as:

1. **Historical Record**: Complete documentation of build instructions
2. **Training Data**: Reference for similar projects
3. **Onboarding Guide**: New developers can understand decisions
4. **Prompt Library**: Reusable prompts for future features

**Total Documentation**:
- 4 PRD documents (~3,500 lines)
- 100+ UI screenshots analyzed
- 2 complete implementations (ElectPro + ElectionCaffe)
- 15+ database schemas
- 200+ API endpoints
- Complete setup guides

**Last Updated**: February 2, 2026
**Maintained By**: ElectionSoft Development Team
**Version**: 1.0
