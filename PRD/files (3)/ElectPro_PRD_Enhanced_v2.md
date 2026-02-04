# ElectPro - Multi-Tenant Election Management Platform
## Product Requirements Document (PRD) - Enhanced Version

**Version:** 2.0  
**Date:** January 2026  
**Status:** Final Draft  
**Reference Application:** Thedal TEAM App (team.thedal.co.in)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Detailed Module Specifications](#5-detailed-module-specifications)
6. [UI/UX Specifications](#6-uiux-specifications)
7. [API Specifications](#7-api-specifications)
8. [Mobile Application](#8-mobile-application)
9. [Security & Compliance](#9-security--compliance)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Executive Summary

### 1.1 Overview

ElectPro is a comprehensive, multi-tenant Election Campaign Management Platform designed for the Indian electoral ecosystem. Based on detailed analysis of the Thedal TEAM App, this PRD outlines specifications for building a similar platform with enhanced features.

### 1.2 Reference Implementation Analysis

**Application Analyzed:** Thedal TEAM App  
**URL:** https://team.thedal.co.in  
**Sample Data:** Karaikudi BJP, Tamil Nadu  
**Constituency Size:** 2,93,285 voters across 388 booths

### 1.3 Key Statistics from Reference

| Metric | Value |
|--------|-------|
| Total Voters | 2,93,285 |
| Male Voters | 1,43,498 (48.9%) |
| Female Voters | 1,49,761 (51.1%) |
| Transgender Voters | 26 (0.01%) |
| Total Booths | 388 |
| Caste Categories | 5 (OC, BC, MBC, SC, ST) |
| Castes | 19 |
| Sub-Castes | 16 |
| Religions | 6 |
| Languages | 7 |

---

## 2. Product Overview

### 2.1 Core Modules (from Sidebar Navigation)

Based on the analyzed screenshots, the application has the following module structure:

```
├── Dashboard
├── Election Manager
│   ├── Your Elections
│   ├── App Banner
│   ├── Voting History
│   ├── Voter Category
│   ├── Voter Slip
│   ├── Party
│   ├── Religion
│   ├── Caste Category
│   ├── Caste
│   ├── Sub-Caste
│   ├── Language
│   ├── Schemes
│   └── Feedback
├── Part Manager
│   ├── Part List
│   ├── Add Part
│   ├── Section List
│   ├── Add Section
│   ├── Part Map
│   ├── Vulnerability
│   ├── Booth Committee
│   └── BLA-2
├── Voter Manager
│   ├── Voters List
│   ├── Add Voter
│   ├── Voters Map
│   ├── Double Entry Voters
│   ├── Enroll Voter
│   ├── SIR
│   ├── Voter Photo
│   └── Aadhaar Verified
├── Family Manager
│   ├── Family
│   ├── Family Captain List
│   ├── Add Family Captain
│   └── Family Captain Map
├── Cadre Manager
│   ├── Cadre List
│   ├── Add Cadre
│   ├── Cadre Map
│   └── Cadre Tracking List
├── Campaign Manager
│   ├── Communication Manager
│   └── Create Campaign
├── Poll Day Manager
│   ├── Voter Turnout
│   └── Booth Agent
├── Count Day Manager
│   └── Count Day Agent
├── Survey Manager
│   └── Survey Forms
├── Member Manager
│   ├── Members List
│   └── Add Member
├── Report
└── Settings
    ├── User Profile
    ├── Authentication
    ├── Roles
    ├── Slip Box
    ├── Dynamic Fields
    ├── Voter Basic Info
    ├── Downloads
    └── Catalogue
```

---

## 3. System Architecture

### 3.1 Technology Stack (Recommended)

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 18 + TypeScript + Vite | SPA with Ant Design components |
| State | Zustand + React Query | Server state caching |
| UI Framework | Ant Design (antd) | Based on observed UI patterns |
| Charts | ECharts / Recharts | Pie charts, bar charts |
| Maps | Mapbox / Google Maps | Voter/cadre mapping |
| Backend | Node.js + Express + TypeScript | REST API |
| Database | PostgreSQL 15+ | Multi-tenant schema |
| Cache | Redis 7+ | Sessions, real-time data |
| Search | Meilisearch | Voter search |
| Storage | AWS S3 | Photos, documents |

### 3.2 Multi-Tenancy Model

```
┌─────────────────────────────────────────────────────────────┐
│                      PUBLIC SCHEMA                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   tenants   │  │    users    │  │    plans    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               TENANT SCHEMA: tenant_bjp_karaikudi           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │elections │ │  parts   │ │  booths  │ │  voters  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ families │ │  cadres  │ │ surveys  │ │ parties  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │religions │ │  castes  │ │sub_castes│ │ schemes  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### 4.1 User Profile Table

```sql
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
    last_login_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, mobile)
);
```

### 4.2 Elections Table

```sql
-- From screenshot 012: Your Elections
CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,           -- "Karaikudi - SIR Draft"
    election_type VARCHAR(50),            -- MP, MLA, Local Body
    
    -- Location
    state VARCHAR(100) NOT NULL,          -- "Tamil Nadu"
    constituency VARCHAR(255),
    
    -- Candidate
    candidate_name VARCHAR(255),
    candidate_photo_url TEXT,
    
    -- Dates
    start_date DATE,
    end_date DATE,
    poll_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',   -- draft, active, completed, archived
    is_locked BOOLEAN DEFAULT FALSE,
    
    -- Statistics (denormalized for performance)
    total_voters INTEGER DEFAULT 0,
    total_booths INTEGER DEFAULT 0,
    total_parts INTEGER DEFAULT 0,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 App Banners Table

```sql
-- From screenshot 013: App Banners
CREATE TABLE app_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    preview_url TEXT,
    
    -- Settings
    whatsapp_forward BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Voting History Table

```sql
-- From screenshot 014: Voting History
CREATE TABLE voting_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    history_name VARCHAR(100) NOT NULL,   -- "2024-MP", "2021-MLA", "2022-Local Body"
    election_type VARCHAR(20) NOT NULL,   -- MP, MLA, ULB (Urban Local Body)
    election_year INTEGER NOT NULL,
    
    -- Badge styling
    badge_text VARCHAR(20),               -- "2024 PC", "2021 AC", "2022 ULB"
    badge_color VARCHAR(7),               -- Hex color
    
    image_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voter voting history (many-to-many)
CREATE TABLE voter_voting_history (
    voter_id UUID REFERENCES voters(id),
    history_id UUID REFERENCES voting_histories(id),
    voted BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (voter_id, history_id)
);
```

### 4.5 Voter Categories Table

```sql
-- From screenshot 015: Voter Category (Availability Status)
CREATE TABLE voter_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    -- Names (bilingual)
    category_name VARCHAR(100) NOT NULL,       -- English name
    category_name_local VARCHAR(100),          -- Tamil/local language name
    category_description TEXT,
    
    -- Visual
    category_image_url TEXT,                   -- Icon image
    category_color VARCHAR(7),                 -- Hex color
    icon_type VARCHAR(50),                     -- checkmark, arrow, x-mark, etc.
    
    -- System
    is_system BOOLEAN DEFAULT FALSE,           -- System-defined vs user-created
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories from screenshot:
-- 1. இருக்கிறார் (Available) - Green checkmark
-- 2. இடமாற்றம் (Shifted) - Arrow up icon
-- 3. இரட்டை பதிவு (Double Entry) - Person with X
-- 4. வெளியூர் (Outstation) - Double arrow
-- 5. வீட்டில் இல்லை (Not in Home) - X mark
```

### 4.6 Voter Slip Templates Table

```sql
-- From screenshots 016-017: Voter Slip Templates
CREATE TABLE voter_slip_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    slip_name VARCHAR(100) NOT NULL,           -- "Default"
    
    -- Configuration toggles
    print_status BOOLEAN DEFAULT TRUE,
    show_candidate_info BOOLEAN DEFAULT FALSE,
    show_candidate_image BOOLEAN DEFAULT FALSE,
    
    -- Template design
    template_html TEXT,                        -- HTML template
    header_image_url TEXT,
    footer_image_url TEXT,
    
    -- Paper settings
    paper_size VARCHAR(20) DEFAULT 'A4',
    orientation VARCHAR(20) DEFAULT 'portrait',
    slips_per_page INTEGER DEFAULT 4,
    
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.7 Parties Table

```sql
-- From screenshots 018-019: Party Management
CREATE TABLE parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    -- Alliance (coalition grouping)
    alliance_name VARCHAR(100),                -- "BJP", "NDA", null
    
    -- Party details
    party_name VARCHAR(255) NOT NULL,          -- Full name in local language: "பா.ஜ.க"
    party_short_name VARCHAR(50),              -- "BJP", "ADMK"
    party_full_name VARCHAR(255),              -- Full English name
    
    -- Visual
    party_image_url TEXT,                      -- Party symbol (lotus, two leaves, etc.)
    party_color VARCHAR(7),                    -- Hex color: Orange, Green, Black
    
    -- Default party flag
    is_default BOOLEAN DEFAULT FALSE,          -- "My Party" setting
    is_neutral BOOLEAN DEFAULT FALSE,          -- For "Neutral Voters"
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.8 Religions Table

```sql
-- From screenshots 020-022: Religion Management
CREATE TABLE religions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    -- Names (bilingual)
    religion_name VARCHAR(100) NOT NULL,       -- "Hindu", "Muslim", "Christian"
    religion_name_local VARCHAR(100),          -- Tamil: "இந்து", "இஸ்லாம்", "கிறிஸ்தவம்"
    
    -- Visual
    religion_image_url TEXT,                   -- Symbol: Om, Crescent, Cross, etc.
    religion_color VARCHAR(7),                 -- Hex color
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data from screenshots:
-- 1. இந்து (Hindu) - Om symbol - Orange
-- 2. இஸ்லாம் (Muslim) - Crescent & Star - Green
-- 3. கிறிஸ்தவம் (Christian) - Cross - Purple
-- 4. சமணம் (Jainism) - Jain Hand - Yellow
-- 5. சீக்கியம் (Sikhism) - Khanda - Blue
-- 6. பௌத்தம் (Buddhism) - Dharma Wheel - Olive/Yellow
```

### 4.9 Caste Categories Table

```sql
-- From screenshots 023-024: Caste Category (Reservation categories)
CREATE TABLE caste_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    category_name VARCHAR(50) NOT NULL,        -- "OC", "BC", "MBC", "SC", "ST"
    category_full_name VARCHAR(100),           -- "Other Caste", "Backward Class", etc.
    
    -- Reservation percentage (optional)
    reservation_percent DECIMAL(5,2),
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Standard Indian categories:
-- OC - Other Caste (General/Forward)
-- BC - Backward Class
-- MBC - Most Backward Class  
-- SC - Scheduled Caste
-- ST - Scheduled Tribe
```

### 4.10 Castes Table

```sql
-- From screenshot 025: Caste Management
CREATE TABLE castes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    -- Relationships
    caste_category_id UUID REFERENCES caste_categories(id),
    religion_id UUID REFERENCES religions(id),
    
    -- Names (bilingual)
    caste_name VARCHAR(100) NOT NULL,          -- "Vanniyar", "Mukkulathor"
    caste_name_local VARCHAR(100),             -- Tamil: "வன்னியர்", "முக்குலத்தோர்"
    
    caste_code VARCHAR(20),                    -- Short code
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample castes from screenshot (all Hindu):
-- Vanniyar, Mukkulathor, Devendra Kula Velaalar, Kongu Velaalar,
-- Arunthathiyar, Yadavar, Mudalaiyaar, Mutharaiyar, Vishwakarma
```

### 4.11 Sub-Castes Table

```sql
-- From screenshot 026: Sub-Caste Management
CREATE TABLE sub_castes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    -- Parent relationship
    caste_id UUID REFERENCES castes(id),
    
    -- Names (bilingual)
    sub_caste_name VARCHAR(100) NOT NULL,
    sub_caste_name_local VARCHAR(100),
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample sub-castes from screenshot:
-- Devendrakulathar → Devendra Kula Velaalar
-- Maravar → Mukkulathor
-- Kadaiyar → Devendra Kula Velaalar
-- Vanniya Gounder → Vanniyar
-- Kaalaadi → Devendra Kula Velaalar
-- Agamudaiyaar → Mukkulathor
-- Kander → Vanniyar
-- Kudumbar → Devendra Kula Velaalar
```

### 4.12 Government Schemes Table

```sql
-- From screenshot 027: Schemes (Welfare Schemes)
CREATE TABLE schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    scheme_name VARCHAR(255) NOT NULL,
    scheme_short_name VARCHAR(50),             -- "PMUY", "PMMY", "PMKISAN"
    scheme_description TEXT,
    
    -- Scheme provider
    scheme_by VARCHAR(50) NOT NULL,            -- "UNION_GOVT", "STATE_GOVT", "LOCAL_BODY"
    
    -- Visual
    scheme_image_url TEXT,
    
    -- Value
    scheme_value DECIMAL(12,2),                -- ₹10,000, ₹50,000, etc.
    value_type VARCHAR(20),                    -- "one_time", "monthly", "yearly"
    
    -- Category
    category VARCHAR(50),                      -- "Housing", "Agriculture", "LPG", etc.
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample schemes from screenshot:
-- 1. Free LPG - Pradhan Mantri Ujjwala Yojana (PMUY) - UNION_GOVT - ₹10,000
-- 2. Pradhan Mantri Mudra Yojana (PMMY) - UNION_GOVT - ₹50,000
-- 3. Pradhan Mantri Kisan Samman Nidhi (PMKISAN) - UNION_GOVT - ₹60,000
-- 4. Pradhan Mantri Awas Yojana (PMAY) - UNION_GOVT - ₹50,000
-- 5. Free Groceries - LOCAL_BODY - ₹10,000
```

### 4.13 Voter-Schemes Mapping

```sql
-- Track which voters receive which schemes
CREATE TABLE voter_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_id UUID REFERENCES voters(id),
    scheme_id UUID REFERENCES schemes(id),
    
    -- Status
    is_beneficiary BOOLEAN DEFAULT TRUE,
    enrollment_date DATE,
    
    -- Verification
    verified_by UUID REFERENCES cadres(id),
    verified_at TIMESTAMPTZ,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(voter_id, scheme_id)
);
```

### 4.14 Feedback/Grievances Table

```sql
-- From screenshots 028-029: Feedback/Issues
CREATE TABLE feedback_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    -- Issue details
    issue_name VARCHAR(255) NOT NULL,
    issue_name_local VARCHAR(255),             -- Tamil text
    issue_description TEXT,
    
    -- Category
    category VARCHAR(50),                      -- "Infrastructure", "Water", "Roads", etc.
    
    -- Location
    booth_id UUID REFERENCES booths(id),
    part_id UUID REFERENCES parts(id),
    location_address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Status
    status VARCHAR(20) DEFAULT 'open',         -- open, in_progress, resolved, closed
    priority VARCHAR(20) DEFAULT 'medium',     -- low, medium, high, urgent
    
    -- Reported by
    reported_by_voter_id UUID REFERENCES voters(id),
    reported_by_cadre_id UUID REFERENCES cadres(id),
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample issues from screenshot:
-- 1. Water issue at our village
-- 2. Need Railway Bridge at this junction
-- 3. Lake Cleaning need to do
-- 4. Underground Drainage system is require
-- 5. தண்ணீர் பிரச்சனை உள்ளது (Water problem exists)
```

### 4.15 Complete Voters Table

```sql
-- Enhanced voters table with all relationships
CREATE TABLE voters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    
    -- Location
    booth_id UUID REFERENCES booths(id) NOT NULL,
    part_id UUID REFERENCES parts(id),
    
    -- Identity (from Electoral Roll)
    epic_number VARCHAR(20),                   -- EPIC Card number
    sl_number INTEGER,                         -- Serial number in booth
    
    -- Personal Information
    name VARCHAR(255) NOT NULL,
    name_local VARCHAR(255),                   -- Name in local script (Tamil)
    
    -- Relations
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    husband_name VARCHAR(255),
    relation_type VARCHAR(20),                 -- father, mother, husband, other
    
    -- Demographics
    gender VARCHAR(10),                        -- male, female, transgender
    age INTEGER,
    date_of_birth DATE,
    
    -- Contact
    mobile VARCHAR(15),
    alternate_mobile VARCHAR(15),
    email VARCHAR(255),
    
    -- Address
    house_number VARCHAR(50),
    address TEXT,
    
    -- Photo
    photo_url TEXT,
    
    -- Demographic Relationships
    religion_id UUID REFERENCES religions(id),
    caste_category_id UUID REFERENCES caste_categories(id),
    caste_id UUID REFERENCES castes(id),
    sub_caste_id UUID REFERENCES sub_castes(id),
    language_id UUID REFERENCES languages(id),
    
    -- Professional
    profession VARCHAR(100),
    education VARCHAR(100),
    
    -- Political
    party_id UUID REFERENCES parties(id),
    voter_category_id UUID REFERENCES voter_categories(id),  -- Available, Shifted, etc.
    political_leaning VARCHAR(20),             -- loyal, swing, opposition, unknown
    influence_level VARCHAR(20),               -- high, medium, low
    
    -- Family
    family_id UUID REFERENCES families(id),
    is_family_captain BOOLEAN DEFAULT FALSE,
    
    -- Verification
    is_aadhaar_verified BOOLEAN DEFAULT FALSE,
    is_mobile_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_contacted_at TIMESTAMPTZ,
    last_contacted_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ                     -- Soft delete
);

-- Indexes
CREATE INDEX idx_voters_booth ON voters(booth_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_voters_epic ON voters(epic_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_voters_mobile ON voters(mobile) WHERE deleted_at IS NULL AND mobile IS NOT NULL;
CREATE INDEX idx_voters_name ON voters USING gin(name gin_trgm_ops);
CREATE INDEX idx_voters_gender ON voters(gender) WHERE deleted_at IS NULL;
CREATE INDEX idx_voters_category ON voters(voter_category_id) WHERE deleted_at IS NULL;
```

---

## 5. Detailed Module Specifications

### 5.1 User Profile Module

**URL:** `/profile`

**Features (from screenshot 011):**
- Profile photo with upload capability (camera icon overlay)
- Editable fields: First Name, Last Name, Mobile Number, Email
- "Edit" button to enable editing mode
- "Change Password" button for security

**API Endpoints:**
```
GET    /api/profile              - Get current user profile
PUT    /api/profile              - Update profile
POST   /api/profile/photo        - Upload profile photo
PUT    /api/profile/password     - Change password
```

**UI Components:**
- Avatar with camera overlay for upload
- Form with disabled fields (read mode)
- Edit button enables inline editing
- Password change opens modal

---

### 5.2 Your Elections Module

**URL:** `/elections`

**Features (from screenshot 012):**
- Card-based display of elections
- Each card shows:
  - Candidate photo
  - Election name
  - Data status (e.g., "No Data | No Data")
  - State name
  - Action buttons: Edit, Delete, User Assign, Lock, Team Assign
- "Merge Status" button (for combining election data)
- "Create Election" primary button

**Card Actions:**
| Icon | Action |
|------|--------|
| ✏️ Pencil | Edit election details |
| 🗑️ Trash | Delete election |
| 👤 Person | Assign users to election |
| 🔒 Lock | Lock/unlock election |
| 👥 Group | Assign team members |

**API Endpoints:**
```
GET    /api/elections                    - List all elections
POST   /api/elections                    - Create election
GET    /api/elections/:id                - Get election details
PUT    /api/elections/:id                - Update election
DELETE /api/elections/:id                - Delete election
POST   /api/elections/:id/lock           - Lock election
POST   /api/elections/:id/unlock         - Unlock election
POST   /api/elections/merge              - Merge election data
```

---

### 5.3 App Banner Module

**URL:** `/app-banner`

**Features (from screenshot 013):**
- Search bar with search and clear buttons
- "WhatsApp Footer" button
- "+ Upload Banner" primary button
- "Actions" dropdown menu
- Data table with columns:
  - Checkbox (bulk select)
  - Preview (thumbnail)
  - File Name
  - WhatsApp Forward (toggle switch)
  - Active (toggle switch)
  - Actions (View, Delete)
- Pagination: "X-Y of Z items" with page size selector

**API Endpoints:**
```
GET    /api/banners                      - List banners
POST   /api/banners                      - Upload banner
GET    /api/banners/:id                  - Get banner
DELETE /api/banners/:id                  - Delete banner
PUT    /api/banners/:id/toggle-active    - Toggle active status
PUT    /api/banners/:id/toggle-whatsapp  - Toggle WhatsApp forward
GET    /api/banners/whatsapp-footer      - Get WhatsApp footer config
PUT    /api/banners/whatsapp-footer      - Update WhatsApp footer
```

---

### 5.4 Voting History Module

**URL:** `/voterHistory`

**Features (from screenshot 014):**
- "Import Histories" button
- "Add History" primary button
- Search bar
- Data table with columns:
  - Checkbox
  - History Name (e.g., "2024-MP", "2021-MLA", "2022-Local Body")
  - History Image (badge with year and type)
  - Action (three dots menu)

**Election Type Badges:**
| Type | Badge Text | Purpose |
|------|------------|---------|
| MP | "2024 PC" | Parliamentary Constituency (Lok Sabha) |
| MLA | "2021 AC" | Assembly Constituency (State Legislature) |
| ULB | "2022 ULB" | Urban Local Body (Municipal) |

**API Endpoints:**
```
GET    /api/voting-history               - List histories
POST   /api/voting-history               - Create history
POST   /api/voting-history/import        - Bulk import
DELETE /api/voting-history/:id           - Delete history
GET    /api/voters/:id/history           - Get voter's voting history
PUT    /api/voters/:id/history           - Update voter's history
```

---

### 5.5 Voter Category Module

**URL:** `/availability`

**Features (from screenshot 015):**
- "Import Categories" button
- "Add" primary button
- Search bar with clear
- "Actions" dropdown
- Data table with columns:
  - Checkbox
  - Category Image (icon)
  - Category Name (bilingual: Tamil + English)
  - Category Description
  - Actions

**Default Categories:**

| Tamil Name | English Name | Icon | Description |
|------------|--------------|------|-------------|
| இருக்கிறார் | Available | ✓ Green checkmark | Voter is available at registered address |
| இடமாற்றம் | Shifted | ↑ Arrow up | Voter has shifted to different location |
| இரட்டை பதிவு | Double Entry | 👤❌ Person with X | Duplicate entry in voter roll |
| வெளியூர் | Outstation | ↔️ Double arrow | Voter working in different city |
| வீட்டில் இல்லை | Not in Home | ❌ X mark | Not found at home during visit |

**API Endpoints:**
```
GET    /api/voter-categories             - List categories
POST   /api/voter-categories             - Create category
PUT    /api/voter-categories/:id         - Update category
DELETE /api/voter-categories/:id         - Delete category
POST   /api/voter-categories/import      - Bulk import
```

---

### 5.6 Voter Slip Templates Module

**URL:** `/booth-slip`

**Features (from screenshots 016-017):**
- "+ Create Voter Slip" primary button
- Search bar
- "Actions" dropdown
- Empty state message when no templates
- Data table with columns:
  - Checkbox
  - S.No (serial number)
  - Voter Slip Name
  - Print Status (toggle)
  - Candidate Info Image (toggle)
  - Actions (View 👁️, Edit ✏️, Delete 🗑️)

**Slip Template Configuration:**
- Slip name
- Print status (enable/disable printing)
- Show candidate info
- Show candidate image
- Custom template HTML
- Paper size & orientation
- Slips per page

**API Endpoints:**
```
GET    /api/voter-slips                  - List templates
POST   /api/voter-slips                  - Create template
GET    /api/voter-slips/:id              - Get template
PUT    /api/voter-slips/:id              - Update template
DELETE /api/voter-slips/:id              - Delete template
GET    /api/voter-slips/:id/preview      - Preview slip
POST   /api/voter-slips/:id/generate     - Generate slips for voters
```

---

### 5.7 Party Management Module

**URL:** `/parties`

**Features (from screenshots 018-019):**
- "Import Parties" button
- "Add Party" primary button
- "My Party" dropdown with "Select Default Party" and "Set as Default" button
- "Actions" dropdown
- Data table with columns:
  - Checkbox
  - Alliance Name
  - Party Name (local language)
  - Party Short Name
  - Party Image (symbol)
  - Party Color (color swatch)
  - Default (indicator)
  - Actions

**Sample Data:**

| Alliance | Party Name | Short Name | Symbol | Color |
|----------|------------|------------|--------|-------|
| BJP | பா.ஜ.க | BJP | 🪷 Lotus | Orange |
| NDA | அ.தி.மு.க | ADMK | 🌿 Two Leaves | Green |
| null | நடுநிலை | Neutral Voters | ➖ Minus | Black |

**API Endpoints:**
```
GET    /api/parties                      - List parties
POST   /api/parties                      - Create party
PUT    /api/parties/:id                  - Update party
DELETE /api/parties/:id                  - Delete party
POST   /api/parties/import               - Bulk import
PUT    /api/parties/:id/set-default      - Set as default party
```

---

### 5.8 Religion Management Module

**URL:** `/religion`

**Features (from screenshots 020-022):**
- "Import Religions" button
- "Add Religion" primary button
- Search bar
- "Actions" dropdown
- Data table with columns:
  - Checkbox
  - Religion Name (bilingual)
  - Religion Image (symbol)
  - Religion Color (swatch)
  - Action

**Sample Data:**

| Religion Name | Symbol | Color |
|---------------|--------|-------|
| இந்து (Hindu) | 🕉️ Om | Orange |
| இஸ்லாம் (Muslim) | ☪️ Crescent & Star | Green |
| கிறிஸ்தவம் (Christian) | ✝️ Cross | Purple |
| சமணம் (Jainism) | 🤚 Jain Hand | Yellow |
| சீக்கியம் (Sikhism) | ☬ Khanda | Blue |
| பௌத்தம் (Buddhism) | ☸️ Dharma Wheel | Olive |

**API Endpoints:**
```
GET    /api/religions                    - List religions
POST   /api/religions                    - Create religion
PUT    /api/religions/:id                - Update religion
DELETE /api/religions/:id                - Delete religion
POST   /api/religions/import             - Bulk import
```

---

### 5.9 Caste Category Module

**URL:** `/caste-category`

**Features (from screenshots 023-024):**
- "Import Caste Categories" button
- "Add Caste Category" primary button
- Search bar
- "Actions" dropdown
- Data table with columns:
  - Checkbox
  - Caste Category Name
  - Actions

**Indian Reservation Categories:**

| Code | Full Name | Description |
|------|-----------|-------------|
| OC | Other Caste | General/Forward castes |
| BC | Backward Class | Backward castes |
| MBC | Most Backward Class | Most backward castes |
| SC | Scheduled Caste | Historically disadvantaged castes |
| ST | Scheduled Tribe | Indigenous tribal communities |

**API Endpoints:**
```
GET    /api/caste-categories             - List categories
POST   /api/caste-categories             - Create category
PUT    /api/caste-categories/:id         - Update category
DELETE /api/caste-categories/:id         - Delete category
POST   /api/caste-categories/import      - Bulk import
```

---

### 5.10 Caste Management Module

**URL:** `/caste`

**Features (from screenshot 025):**
- Standard CRUD interface
- Data table with columns:
  - Checkbox
  - Caste Name (bilingual: English + Tamil)
  - Religion (linked)
  - Actions
- Pagination with page numbers and "Go to Page"

**Sample Castes (Hindu):**
- Vanniyar (வன்னியர்)
- Mukkulathor (முக்குலத்தோர்)
- Devendra Kula Velaalar (தேவேந்திர குல வேளாளர்)
- Kongu Velaalar (கொங்கு வேளாளர்)
- Arunthathiyar (அருந்ததியர்)
- Yadavar (யாதவர்)
- Mudalaiyaar (முதலியார்)
- Mutharaiyar (முத்தரையர்)
- Vishwakarma (விஷ்வகர்மா)

**API Endpoints:**
```
GET    /api/castes                       - List castes
POST   /api/castes                       - Create caste
PUT    /api/castes/:id                   - Update caste
DELETE /api/castes/:id                   - Delete caste
POST   /api/castes/import                - Bulk import
GET    /api/castes/by-religion/:id       - Get castes by religion
GET    /api/castes/by-category/:id       - Get castes by category
```

---

### 5.11 Sub-Caste Management Module

**URL:** `/sub-caste`

**Features (from screenshot 026):**
- Data table with columns:
  - Checkbox
  - Sub-Caste Name (bilingual)
  - Religion
  - Parent Caste
  - Actions
- Shows hierarchical relationship: Sub-Caste → Caste → Religion

**Sample Sub-Castes:**

| Sub-Caste | Parent Caste |
|-----------|--------------|
| Devendrakulathar | Devendra Kula Velaalar |
| Vanniyar | Vanniyar |
| Maravar | Mukkulathor |
| Kadaiyar | Devendra Kula Velaalar |
| Vanniya Gounder | Vanniyar |
| Kaalaadi | Devendra Kula Velaalar |
| Agamudaiyaar | Mukkulathor |
| Kander | Vanniyar |
| Kudumbar | Devendra Kula Velaalar |

**API Endpoints:**
```
GET    /api/sub-castes                   - List sub-castes
POST   /api/sub-castes                   - Create sub-caste
PUT    /api/sub-castes/:id               - Update sub-caste
DELETE /api/sub-castes/:id               - Delete sub-caste
POST   /api/sub-castes/import            - Bulk import
GET    /api/sub-castes/by-caste/:id      - Get sub-castes by parent caste
```

---

### 5.12 Government Schemes Module

**URL:** `/benefit-scheme`

**Features (from screenshot 027):**
- "Import Schemes" button
- "Add Scheme" primary button
- Search bar
- "Actions" dropdown
- Data table with columns:
  - Checkbox
  - Scheme Name
  - Scheme By (provider)
  - Image
  - Scheme Value (₹ amount)
  - Actions

**Sample Schemes:**

| Scheme Name | Provider | Value |
|-------------|----------|-------|
| Free LPG - Pradhan Mantri Ujjwala Yojana (PMUY) | UNION_GOVT | ₹10,000 |
| Pradhan Mantri Mudra Yojana (PMMY) | UNION_GOVT | ₹50,000 |
| Pradhan Mantri Kisan Samman Nidhi (PMKISAN) | UNION_GOVT | ₹60,000 |
| Pradhan Mantri Awas Yojana (PMAY) | UNION_GOVT | ₹50,000 |
| Free Groceries | LOCAL_BODY | ₹10,000 |

**Provider Types:**
- UNION_GOVT: Central Government schemes
- STATE_GOVT: State Government schemes
- LOCAL_BODY: Municipal/Panchayat schemes

**API Endpoints:**
```
GET    /api/schemes                      - List schemes
POST   /api/schemes                      - Create scheme
PUT    /api/schemes/:id                  - Update scheme
DELETE /api/schemes/:id                  - Delete scheme
POST   /api/schemes/import               - Bulk import
GET    /api/voters/:id/schemes           - Get voter's schemes
POST   /api/voters/:id/schemes           - Add scheme to voter
DELETE /api/voters/:id/schemes/:schemeId - Remove scheme from voter
```

---

### 5.13 Feedback/Grievances Module

**URL:** `/feedback`

**Features (from screenshots 028-029):**
- "Import Feedbacks" button
- "Add Feedback Issue" primary button
- Search bar
- "Actions" dropdown
- Data table with columns:
  - Checkbox
  - Issue Name (supports Tamil text)
  - Actions

**Sample Issues:**
- Water issue at our village
- Need Railway Bridge at this junction
- Lake Cleaning need to do
- Underground Drainage system is require
- தண்ணீர் பிரச்சனை உள்ளது (Water problem exists - Tamil)

**API Endpoints:**
```
GET    /api/feedback                     - List feedback issues
POST   /api/feedback                     - Create feedback
PUT    /api/feedback/:id                 - Update feedback
DELETE /api/feedback/:id                 - Delete feedback
POST   /api/feedback/import              - Bulk import
PUT    /api/feedback/:id/status          - Update status
GET    /api/feedback/by-booth/:id        - Get feedback by booth
GET    /api/feedback/stats               - Get feedback statistics
```

---

### 5.14 Dashboard with Analytics

**URL:** `/static-dashboard`

**Features (from screenshot 030):**

#### Gender Distribution Widget
- Title: "Gender" with edit icon
- Part filter dropdown ("Select Parts - All by default")
- Statistics display: "Male: 1,43,498 | Female: 1,49,761 | Transgender: 26 | Total: 2,93,285"
- Toolbar with icons:
  - Grid view
  - Filter
  - Broadcast/share
  - Sort
  - Download
  - Chart type (pie/bar)
- Pie chart visualization with legend:
  - Male: 143498 (blue)
  - Female: 149761 (pink)
  - Transgender: 26 (dark blue)

#### Party Affiliation Widget
- Title: "Party Affiliation" with edit icon
- Part filter dropdown
- Statistics: "Total Parties: 0 | Total Voters: 0"
- Color picker (#1890FF)
- Toolbar with icons
- "Show Unknown" checkbox
- Bar chart (Voter Count vs Party Name)

#### Statistics Dashboard Section
- Part filter dropdown
- Additional demographic charts

**Chart Configuration:**
- Customizable title
- Part/booth filters
- Multiple chart types (pie, bar, line)
- Export options (download)
- Color customization
- Show/hide unknown values

**API Endpoints:**
```
GET    /api/dashboard/gender-stats       - Gender distribution
GET    /api/dashboard/party-stats        - Party affiliation
GET    /api/dashboard/age-stats          - Age distribution
GET    /api/dashboard/caste-stats        - Caste distribution
GET    /api/dashboard/religion-stats     - Religion distribution
GET    /api/dashboard/booth-stats        - Booth-wise statistics
GET    /api/dashboard/part-stats         - Part-wise statistics
```

---

## 6. UI/UX Specifications

### 6.1 Common UI Patterns

#### Standard Page Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ Page Title                              [Import] [+ Add Button] │
├─────────────────────────────────────────────────────────────────┤
│ [Search________] [🔍] [Clear]                    [Actions ▼]    │
├─────────────────────────────────────────────────────────────────┤
│ ☐ │ Column 1 ↕ │ Column 2 │ Column 3 │ Column 4 │ Actions      │
├───┼─────────────┼──────────┼──────────┼──────────┼──────────────┤
│ ☐ │ Data       │ Data     │ Data     │ Data     │ ⋯            │
│ ☐ │ Data       │ Data     │ Data     │ Data     │ ⋯            │
│ ☐ │ Data       │ Data     │ Data     │ Data     │ ⋯            │
├─────────────────────────────────────────────────────────────────┤
│                    1-10 of 100 items    < [1] [2] > │ 10/page ▼│
└─────────────────────────────────────────────────────────────────┘
```

#### Button Styles
- Primary: Blue filled button (e.g., "Add", "Create", "Save")
- Secondary: White with border (e.g., "Import", "Actions")
- Danger: Red for delete actions
- Toggle: Green/gray switch for boolean settings

#### Table Features
- Sortable columns (click header)
- Checkbox for bulk selection
- Pagination with page size selector
- "Go to Page" input for large datasets
- Three-dot menu for row actions

### 6.2 Color Scheme

```css
:root {
  /* Primary Blue */
  --primary: #1890FF;
  --primary-hover: #40A9FF;
  --primary-dark: #096DD9;
  
  /* Sidebar */
  --sidebar-bg: #FFFFFF;
  --sidebar-active: #E6F7FF;
  --sidebar-active-border: #1890FF;
  
  /* Table */
  --table-header-bg: #D6E4FF;
  --table-row-hover: #F5F5F5;
  --table-border: #E8E8E8;
  
  /* Status Colors */
  --success: #52C41A;
  --warning: #FAAD14;
  --error: #FF4D4F;
  
  /* Text */
  --text-primary: #262626;
  --text-secondary: #8C8C8C;
}
```

### 6.3 Icon Usage

| Action | Icon | Library |
|--------|------|---------|
| View | 👁️ Eye | Lucide/Ant |
| Edit | ✏️ Pencil | Lucide/Ant |
| Delete | 🗑️ Trash | Lucide/Ant |
| Search | 🔍 Magnifying glass | Lucide/Ant |
| Filter | ▼ Funnel | Lucide/Ant |
| Download | ⬇️ Download | Lucide/Ant |
| Upload | ⬆️ Upload | Lucide/Ant |
| Add | + Plus | Lucide/Ant |
| Menu | ⋯ Three dots | Lucide/Ant |

---

## 7. API Specifications

### 7.1 Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

### 7.2 Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| search | string | Search query |
| sort | string | Sort field |
| order | string | Sort order (asc/desc) |
| election_id | uuid | Filter by election |
| booth_id | uuid | Filter by booth |
| part_id | uuid | Filter by part |

### 7.3 Bulk Import Endpoint Pattern

```
POST /api/{resource}/import
Content-Type: multipart/form-data

file: CSV or Excel file
election_id: UUID

Response:
{
  "success": true,
  "data": {
    "total": 100,
    "created": 85,
    "updated": 10,
    "failed": 5,
    "errors": [
      { "row": 12, "error": "Invalid caste_id" }
    ]
  }
}
```

---

## 8. Mobile Application

### 8.1 Field App Features

Based on the admin interface, the mobile app should support:

1. **Voter Data Collection**
   - Update mobile numbers, DOB
   - Update caste, religion
   - Update voter category (availability)
   - Capture voter photo

2. **Family Mapping**
   - Link voters to families
   - Designate family captains

3. **Scheme Beneficiary Tracking**
   - Mark scheme beneficiaries

4. **Feedback Collection**
   - Submit voter grievances
   - Capture location

5. **Poll Day Operations**
   - Mark voted status
   - Real-time sync

6. **Surveys**
   - Conduct voter surveys
   - Offline capability

### 8.2 Offline Sync Requirements

- SQLite local database
- Queue-based sync
- Conflict resolution
- Retry mechanism

---

## 9. Security & Compliance

### 9.1 Data Protection

- Encrypt sensitive data (Aadhaar, mobile)
- Role-based access control
- Audit logging
- Data retention policies

### 9.2 Indian Compliance

- Aadhaar handling per UIDAI guidelines
- Election Commission regulations
- IT Act 2000 compliance
- Data localization requirements

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-6)
- Multi-tenant architecture
- Authentication system
- Election Manager module
- Master data modules (Religion, Caste, Party)

### Phase 2: Voter Management (Weeks 7-12)
- Voter Manager module
- Part/Booth Manager
- Bulk import functionality
- Search and filters

### Phase 3: Campaign Operations (Weeks 13-18)
- Family Manager
- Cadre Manager
- Campaign Manager
- Mobile app v1

### Phase 4: Poll Day & Analytics (Weeks 19-24)
- Poll Day Manager
- Dashboard & Charts
- Reports module
- Mobile app v2

### Phase 5: Polish & Scale (Weeks 25-30)
- Performance optimization
- Security audit
- Documentation
- Production deployment

---

## Appendix

### A. Tamil/English Master Data Reference

**Voter Categories:**
| Tamil | English | Icon |
|-------|---------|------|
| இருக்கிறார் | Available | ✓ |
| இடமாற்றம் | Shifted | ↑ |
| இரட்டை பதிவு | Double Entry | ✗ |
| வெளியூர் | Outstation | ↔ |
| வீட்டில் இல்லை | Not in Home | ✗ |

**Religions:**
| Tamil | English |
|-------|---------|
| இந்து | Hindu |
| இஸ்லாம் | Muslim |
| கிறிஸ்தவம் | Christian |
| சமணம் | Jainism |
| சீக்கியம் | Sikhism |
| பௌத்தம் | Buddhism |

### B. URL Route Map

| Route | Module |
|-------|--------|
| /profile | User Profile |
| /elections | Your Elections |
| /app-banner | App Banners |
| /voterHistory | Voting History |
| /availability | Voter Category |
| /booth-slip | Voter Slip Templates |
| /parties | Party Management |
| /religion | Religion |
| /caste-category | Caste Category |
| /caste | Caste |
| /sub-caste | Sub-Caste |
| /benefit-scheme | Schemes |
| /feedback | Feedback |
| /static-dashboard | Dashboard |

---

*Document Version: 2.0 | Enhanced with UI Specifications | January 2026*
