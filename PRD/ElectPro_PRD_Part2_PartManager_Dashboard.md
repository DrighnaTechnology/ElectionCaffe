# ElectPro PRD - Additional Module Specifications (Part 2)
## Based on Screenshots 032-041

This document supplements the main PRD with detailed specifications for:
- Dashboard Analytics Tabs
- Part Manager Module
- Section Manager Module
- Bulk Upload System

---

## 1. Dashboard Module - Complete Specification

### 1.1 Dashboard Tabs Structure

**URL:** `/static-dashboard`

The dashboard has **3 main tabs**:

| Tab | Icon | Purpose |
|-----|------|---------|
| Election Dashboard | 📊 | Overall election metrics and KPIs |
| Cadre Dashboard | 👥 | Field worker performance tracking |
| PollDay Dashboard | 📅 | Real-time voting day monitoring |

### 1.2 Election Dashboard (from screenshot 034)

**KPI Cards Layout (5 columns x 4 rows):**

**Row 1 - Core Metrics (Blue cards):**
| Metric | Sample Value | Description |
|--------|--------------|-------------|
| Total Booth | 388 | Number of polling stations |
| Total School | 1 | Polling center buildings |
| Total Voters | 2,93,285 | Registered voters |
| Date Of Birth | 1,38,646 | Voters with DOB (47%) |
| Mobile Number | 1,16,099 | Voters with mobile (40%) |

**Row 2 - Family Metrics (Green cards):**
| Metric | Sample Value | Description |
|--------|--------------|-------------|
| Total Family | 0 | Mapped families |
| Cross Booth Family | 0 | Families spanning booths |
| 1-Voter Family | 0 | Single-member families |
| Addressed Voters | 0 | Voters with addresses |
| Unaddressed Voters | 0 | Voters without addresses |

**Row 3 - Demographic Metrics (Yellow cards):**
| Metric | Sample Value | Description |
|--------|--------------|-------------|
| Religion | 0 | Voters with religion data |
| Caste Category | 5 | Active caste categories |
| Caste | 0 | Voters with caste data |
| Sub-Caste | 16 | Active sub-castes |
| Language | 7 | Active languages |

**Row 4 - Campaign Metrics (Peach cards):**
| Metric | Sample Value | Description |
|--------|--------------|-------------|
| Party Affiliation | - | Voters with party data |
| Schemes | - | Scheme beneficiaries |
| Voter Slip | - | Generated voter slips |
| Family Slip | - | Generated family slips |
| Benefit Slip | - | Generated benefit slips |

**Features:**
- "Refresh" button to reload data
- Click on card navigates to detailed view
- Color-coded by category

### 1.3 Statistics Dashboard - Demographic Tabs (from screenshots 032-033)

**URL:** `/static-dashboard` (scrolled down)

**Header:** "Total Items: X | Total Count: Y"

**Tab Navigation:**
| Tab | Purpose |
|-----|---------|
| Voter Category | Distribution by availability status |
| Religion | Distribution by religion |
| Caste Category | Distribution by SC/ST/OBC/General |
| Caste | Distribution by specific caste |
| Sub-Caste | Distribution by sub-caste |
| Language | Distribution by language |
| Schemes | Beneficiary distribution |
| Relation | Distribution by relation type |

**Chart Controls:**
- Color picker (#1890FF default blue)
- Filter icon
- Broadcast/share icon
- Download icon
- Sort options
- Chart type toggle (pie/bar/line)
- "Show Unknown" checkbox
- Fullscreen chart button

**API Endpoints:**
```
GET /api/dashboard/stats/voter-category
GET /api/dashboard/stats/religion
GET /api/dashboard/stats/caste-category
GET /api/dashboard/stats/caste
GET /api/dashboard/stats/sub-caste
GET /api/dashboard/stats/language
GET /api/dashboard/stats/schemes
GET /api/dashboard/stats/relation
```

### 1.4 Cadre Dashboard (from screenshot 035)

**Widgets:**

1. **Cadre Activity Metrics:**
   - No. of Cadres
   - Logged In
   - Not Logged
   - Booths Assigned

2. **Performance Scorecard:**
   - Mobile Nos Updated
   - DoBs Updated
   - Parties Updated
   - Castes Updated
   - Religions Updated
   - Languages Updated

3. **Top 10 Cadre Leaderboard:**
   - Ranked list of best performers

4. **Least 10 Cadre Chart:**
   - Bar chart showing underperformers
   - "value" legend

### 1.5 PollDay Dashboard (from screenshot 036)

**Left Panel - Voter Tracking:**
```
Total Voters: 2,93,285 | Voted: 0 | Not Voted: 2,93,285 | Turnout: 0.00%
```

**Features:**
- Part filter dropdown ("Select Parts - All by default")
- Color picker (#1890FF)
- Toolbar: Filter, Broadcast, Sort, Download, Grid, Chart type
- "Polled Votes" time-series chart (X: Time, Y: Voter Count)
- "Auto-saved" indicator

**Right Panel - Family Tracking:**
```
Total Families: 0 | Voted Families: 0 | Not Voted: 0 | Partially Voted: 0
```

**Features:**
- Same filter and toolbar options
- "Voted Families" time-series chart (X: Time, Y: Family Count)

**Real-time Updates:**
- WebSocket connection for live vote counts
- Auto-refresh every 30 seconds
- Manual refresh option

---

## 2. Part Manager Module - Complete Specification

### 2.1 Module Overview

**URL Base:** `/part-*`

**Submenu Items:**
| Menu Item | URL | Purpose |
|-----------|-----|---------|
| Part List | `/part-list` | View all parts/booths |
| Add Part | `/add-part` | Bulk/Manual part creation |
| Section List | `/section-list` | View all sections |
| Add Section | `/add-section` | Bulk/Manual section creation |
| Part Map | `/part-map` | Geographic visualization |
| Vulnerability | `/vulnerability` | Mark sensitive booths |
| Booth Committee | `/booth-committee` | Manage booth teams |
| BLA-2 | `/bla-2` | Booth Level Agent forms |

### 2.2 Part List Page (from screenshot 038)

**URL:** `/part-list`

**Table Columns:**
| Column | Type | Description |
|--------|------|-------------|
| Checkbox | Selection | Bulk actions |
| Image | Avatar | Part/Booth image |
| Part No | Number | Part number (6, 7, 8...) |
| Booth Name | Text | English name (e.g., "PANCHAYAT UNION PRIMARY SCHOOL, KALAIYAPPA NAGAR") |
| Name Local | Text | Tamil name (e.g., "ஊராட்சி ஒன்றிய தொடக்கப்பள்ளி காளையப்பா நகர்") |
| Coordinates | Text | Lat, Lng (e.g., "10.0905, 78.7713") |
| Count | Number | Voter count or other metric (0, 0) |
| Actions | Buttons | View 👁️, Edit ✏️, External Link 🔗, Delete 🗑️ |

**Sample Data:**
| Part No | Booth Name | Location |
|---------|------------|----------|
| 6 | PANCHAYAT UNION PRIMARY SCHOOL, KALAIYAPPA NAGAR | 10.0905, 78.7713 |
| 7 | PANCHAYAT UNION PRIMARY SCHOOL KALAIYAPPA NAGAR, CENTRE BUILDING | 0, 0 |
| 8 | SAKKOTTAI PANCHAYAT UNION CHILD CENTRE KALAIYAPPA NAGAR | 10.0907, 78.7712 |

### 2.3 Add Part Page (from screenshot 039)

**URL:** `/add-part`

**Input Mode Selection:**
```
○ Bulk Upload    ○ Manual
```

**Bulk Upload Interface:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Part Bulk Upload                         │
│                                                             │
│         Upload a CSV file with part details here.          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │              📁 [Folder Icon]                        │ │
│  │                                                       │ │
│  │      Drag your CSV file to start uploading           │ │
│  │                                                       │ │
│  │                      or                               │ │
│  │                                                       │ │
│  │              [ Browse files ]                         │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Download Sample File                                       │
│  Download Excel Template (link)                             │
│                                                             │
│  [ Upload ] (disabled until file selected)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**CSV Template Columns:**
```csv
part_number,booth_name,booth_name_local,address,latitude,longitude
```

**API Endpoints:**
```
GET    /api/parts                    - List all parts
POST   /api/parts                    - Create part (manual)
POST   /api/parts/bulk               - Bulk upload parts
GET    /api/parts/:id                - Get part details
PUT    /api/parts/:id                - Update part
DELETE /api/parts/:id                - Delete part
GET    /api/parts/template           - Download CSV template
```

### 2.4 Section List Page (from screenshot 040)

**URL:** `/section-list`

**Statistics:** "1-10 of 1792 items"

**Table Columns:**
| Column | Type | Description |
|--------|------|-------------|
| Checkbox | Selection | Bulk actions |
| Part No | Number | Parent part number |
| Section No | Number | Section number within part |
| Section Name | Text | Tamil section name |
| Actions | Buttons | Edit ✏️, Delete 🗑️ |

**Sample Data:**
| Part No | Section No | Section Name (Tamil) |
|---------|------------|----------------------|
| 4 | 1 | கோவிலூர் (ஊ) (வ.கி), வார்டு -2 கோவிலூர் |
| 5 | 1 | கோவிலூர் (ஊ) (வ.கி), வார்டு -3 சங்கன்திடல் |
| 6 | 1 | சங்கராபுரம் (ஊ) கலணிவாசல் (வ.கி) அசோக்நகர் |
| 7 | 1 | 1.சங்கராபுரம் (ஊ) கலணிவாசல் (வ.கி) காளையப்பாநகர் வார்டு 2 |
| 7 | 2 | சங்கராபுரம் (ஊ) கலணிவாசல் (வ.கி) ராசிநகர் |
| 8 | 1 | சங்கராபுரம் (ஊ) கலணிவாசல் (வ.கி), வார்டு -2 பாண்டியன்நகர் |
| 8 | 999 | வெளிநாட்டு வாக்காளர் |

**Note:** Section 999 appears to be "Overseas Voters" (வெளிநாட்டு வாக்காளர்)

**Pagination:**
- Page numbers: 1, 2, 3, 4, 5, ..., 180
- "Go to Page" input
- 10 items per page default

### 2.5 Add Section Page (from screenshot 041)

**URL:** `/add-section`

**Same interface as Add Part with:**
- Bulk Upload / Manual radio buttons
- "Section Bulk Upload" title
- Drag & drop CSV upload
- Download Sample File link
- Download Excel Template link
- Upload button

**CSV Template Columns:**
```csv
part_number,section_number,section_name,section_name_local
```

**API Endpoints:**
```
GET    /api/sections                 - List all sections
POST   /api/sections                 - Create section (manual)
POST   /api/sections/bulk            - Bulk upload sections
GET    /api/sections/:id             - Get section details
PUT    /api/sections/:id             - Update section
DELETE /api/sections/:id             - Delete section
GET    /api/sections/template        - Download CSV template
GET    /api/sections/by-part/:partId - Get sections by part
```

---

## 3. Bulk Upload System - Standard Pattern

### 3.1 Upload Interface Pattern

All bulk upload pages follow the same pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ○ Bulk Upload    ○ Manual                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              {Entity} Bulk Upload                           │
│                                                             │
│      Upload a CSV file with {entity} details here.         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                   📁                                  │ │
│  │                                                       │ │
│  │       Drag your CSV file to start uploading          │ │
│  │                                                       │ │
│  │                      or                               │ │
│  │                                                       │ │
│  │              [ Browse files ]                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Download Sample File                                       │
│  Download Excel Template                                    │
│                                                             │
│  [ Upload ]                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Supported Entities for Bulk Upload

| Entity | Endpoint | Template Fields |
|--------|----------|-----------------|
| Parts | `/api/parts/bulk` | part_number, booth_name, booth_name_local, address, lat, lng |
| Sections | `/api/sections/bulk` | part_number, section_number, section_name, section_name_local |
| Voters | `/api/voters/bulk` | epic_number, name, father_name, gender, age, booth_id, etc. |
| Castes | `/api/castes/bulk` | caste_name, caste_name_local, category_id, religion_id |
| Religions | `/api/religions/bulk` | religion_name, religion_name_local, color |
| Parties | `/api/parties/bulk` | party_name, short_name, alliance, color |
| Schemes | `/api/schemes/bulk` | scheme_name, scheme_by, scheme_value |
| Cadres | `/api/cadres/bulk` | name, mobile, email, role |
| Voting History | `/api/voting-history/bulk` | voter_epic, history_id, voted |
| Feedback | `/api/feedback/bulk` | issue_name, category, location |

### 3.3 Bulk Upload Response Format

```json
{
  "success": true,
  "data": {
    "total": 1000,
    "created": 950,
    "updated": 30,
    "skipped": 10,
    "failed": 10,
    "errors": [
      {
        "row": 15,
        "field": "part_number",
        "value": "ABC",
        "error": "Must be a number"
      },
      {
        "row": 23,
        "field": "epic_number",
        "value": "XYZ123",
        "error": "Duplicate EPIC number"
      }
    ]
  }
}
```

---

## 4. Database Schema Updates

### 4.1 Parts Table (Enhanced)

```sql
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
    
    part_number INTEGER NOT NULL,
    
    -- Booth/Location Info
    booth_name VARCHAR(500) NOT NULL,
    booth_name_local VARCHAR(500),
    
    -- Address
    address TEXT,
    landmark VARCHAR(255),
    
    -- Coordinates
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Building Info
    building_type VARCHAR(50), -- school, community_hall, etc.
    building_name VARCHAR(255),
    
    -- Statistics (denormalized)
    total_voters INTEGER DEFAULT 0,
    total_sections INTEGER DEFAULT 0,
    male_voters INTEGER DEFAULT 0,
    female_voters INTEGER DEFAULT 0,
    other_voters INTEGER DEFAULT 0,
    
    -- Vulnerability
    is_vulnerable BOOLEAN DEFAULT FALSE,
    vulnerability_reason TEXT,
    
    -- Images
    image_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(election_id, part_number)
);

CREATE INDEX idx_parts_election ON parts(election_id);
CREATE INDEX idx_parts_location ON parts USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

### 4.2 Sections Table (Enhanced)

```sql
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
    election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
    
    section_number INTEGER NOT NULL,
    
    -- Section Info
    section_name VARCHAR(500) NOT NULL,
    section_name_local VARCHAR(500),
    
    -- Special markers
    is_overseas BOOLEAN DEFAULT FALSE, -- Section 999 = Overseas voters
    
    -- Statistics
    total_voters INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(part_id, section_number)
);

CREATE INDEX idx_sections_part ON sections(part_id);
CREATE INDEX idx_sections_election ON sections(election_id);
```

### 4.3 Dashboard Statistics Materialized View

```sql
-- Materialized view for faster dashboard queries
CREATE MATERIALIZED VIEW election_dashboard_stats AS
SELECT 
    e.id as election_id,
    
    -- Core metrics
    COUNT(DISTINCT p.id) as total_booths,
    COUNT(DISTINCT CASE WHEN p.building_type = 'school' THEN p.id END) as total_schools,
    COUNT(DISTINCT v.id) as total_voters,
    
    -- Data coverage
    COUNT(DISTINCT CASE WHEN v.date_of_birth IS NOT NULL THEN v.id END) as voters_with_dob,
    COUNT(DISTINCT CASE WHEN v.mobile IS NOT NULL THEN v.id END) as voters_with_mobile,
    
    -- Family metrics
    COUNT(DISTINCT f.id) as total_families,
    COUNT(DISTINCT CASE WHEN f.is_cross_booth THEN f.id END) as cross_booth_families,
    COUNT(DISTINCT CASE WHEN f.total_members = 1 THEN f.id END) as single_voter_families,
    
    -- Address metrics
    COUNT(DISTINCT CASE WHEN v.address IS NOT NULL THEN v.id END) as addressed_voters,
    COUNT(DISTINCT CASE WHEN v.address IS NULL THEN v.id END) as unaddressed_voters,
    
    -- Demographic counts
    COUNT(DISTINCT CASE WHEN v.religion_id IS NOT NULL THEN v.id END) as voters_with_religion,
    COUNT(DISTINCT cc.id) as caste_categories_count,
    COUNT(DISTINCT CASE WHEN v.caste_id IS NOT NULL THEN v.id END) as voters_with_caste,
    COUNT(DISTINCT sc.id) as sub_castes_count,
    COUNT(DISTINCT l.id) as languages_count,
    
    -- Gender breakdown
    COUNT(DISTINCT CASE WHEN v.gender = 'male' THEN v.id END) as male_voters,
    COUNT(DISTINCT CASE WHEN v.gender = 'female' THEN v.id END) as female_voters,
    COUNT(DISTINCT CASE WHEN v.gender = 'other' THEN v.id END) as other_voters

FROM elections e
LEFT JOIN parts p ON p.election_id = e.id
LEFT JOIN voters v ON v.election_id = e.id AND v.deleted_at IS NULL
LEFT JOIN families f ON f.election_id = e.id
LEFT JOIN caste_categories cc ON cc.election_id = e.id AND cc.is_active = TRUE
LEFT JOIN sub_castes sc ON sc.election_id = e.id AND sc.is_active = TRUE
LEFT JOIN languages l ON l.election_id = e.id AND l.is_active = TRUE
GROUP BY e.id;

-- Refresh materialized view (run periodically or on data changes)
REFRESH MATERIALIZED VIEW election_dashboard_stats;
```

---

## 5. API Endpoints - Dashboard

### 5.1 Election Dashboard

```
GET /api/dashboard/election/:electionId

Response:
{
  "success": true,
  "data": {
    "coreMetrics": {
      "totalBooths": 388,
      "totalSchools": 1,
      "totalVoters": 293285,
      "votersWithDob": 138646,
      "votersWithMobile": 116099
    },
    "familyMetrics": {
      "totalFamilies": 0,
      "crossBoothFamilies": 0,
      "singleVoterFamilies": 0,
      "addressedVoters": 0,
      "unaddressedVoters": 0
    },
    "demographicMetrics": {
      "religionCount": 0,
      "casteCategoryCount": 5,
      "casteCount": 0,
      "subCasteCount": 16,
      "languageCount": 7
    },
    "campaignMetrics": {
      "partyAffiliationCount": 0,
      "schemeBeneficiaries": 0,
      "voterSlipsGenerated": 0,
      "familySlipsGenerated": 0,
      "benefitSlipsGenerated": 0
    }
  }
}
```

### 5.2 Statistics by Demographic

```
GET /api/dashboard/stats/:type?electionId=xxx&partId=xxx&showUnknown=true

Types: voter-category, religion, caste-category, caste, sub-caste, language, schemes, relation

Response:
{
  "success": true,
  "data": {
    "totalItems": 6,
    "totalCount": 293285,
    "items": [
      { "id": "uuid", "name": "Hindu", "nameLocal": "இந்து", "count": 250000, "color": "#FF6600" },
      { "id": "uuid", "name": "Muslim", "nameLocal": "இஸ்லாம்", "count": 30000, "color": "#00AA00" },
      { "id": "uuid", "name": "Christian", "nameLocal": "கிறிஸ்தவம்", "count": 10000, "color": "#6600CC" }
    ],
    "unknownCount": 3285
  }
}
```

### 5.3 Poll Day Dashboard

```
GET /api/dashboard/poll-day/:electionId

Response:
{
  "success": true,
  "data": {
    "voterTracking": {
      "totalVoters": 293285,
      "voted": 0,
      "notVoted": 293285,
      "turnoutPercent": 0.00
    },
    "familyTracking": {
      "totalFamilies": 0,
      "votedFamilies": 0,
      "notVotedFamilies": 0,
      "partiallyVotedFamilies": 0
    },
    "hourlyTurnout": [
      { "hour": "08:00", "count": 0 },
      { "hour": "09:00", "count": 0 },
      // ... up to 18:00
    ],
    "lastUpdated": "2026-01-17T10:04:00Z",
    "autoSaved": true
  }
}

WebSocket: /ws/poll-day/:electionId
Events:
- vote_marked: { voterId, boothId, timestamp }
- turnout_update: { totalVoted, turnoutPercent }
```

### 5.4 Cadre Dashboard

```
GET /api/dashboard/cadre/:electionId

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalCadres": 50,
      "loggedIn": 12,
      "notLogged": 38,
      "boothsAssigned": 388
    },
    "performance": {
      "mobilesUpdated": 5000,
      "dobsUpdated": 3000,
      "partiesUpdated": 1000,
      "castesUpdated": 2000,
      "religionsUpdated": 1500,
      "languagesUpdated": 1000
    },
    "top10Cadres": [
      { "id": "uuid", "name": "Name", "score": 500, "rank": 1 }
    ],
    "least10Cadres": [
      { "id": "uuid", "name": "Name", "score": 10, "rank": 50 }
    ]
  }
}
```

---

## 6. React Component Structure

### 6.1 Dashboard Components

```
src/features/dashboard/
├── DashboardPage.tsx
├── components/
│   ├── DashboardTabs.tsx
│   ├── ElectionDashboard/
│   │   ├── ElectionDashboard.tsx
│   │   ├── KPICard.tsx
│   │   ├── KPIGrid.tsx
│   │   └── StatisticsSection.tsx
│   ├── CadreDashboard/
│   │   ├── CadreDashboard.tsx
│   │   ├── CadreMetrics.tsx
│   │   ├── PerformanceCard.tsx
│   │   └── LeaderboardTable.tsx
│   ├── PollDayDashboard/
│   │   ├── PollDayDashboard.tsx
│   │   ├── VoterTrackingPanel.tsx
│   │   ├── FamilyTrackingPanel.tsx
│   │   ├── TurnoutChart.tsx
│   │   └── AutoSaveIndicator.tsx
│   └── StatisticsPanel/
│       ├── StatisticsPanel.tsx
│       ├── StatisticsTabs.tsx
│       ├── DemographicChart.tsx
│       └── ChartToolbar.tsx
├── hooks/
│   ├── useElectionDashboard.ts
│   ├── useCadreDashboard.ts
│   ├── usePollDayDashboard.ts
│   └── useStatistics.ts
└── types/
    └── dashboard.types.ts
```

### 6.2 Part Manager Components

```
src/features/part-manager/
├── PartListPage.tsx
├── AddPartPage.tsx
├── SectionListPage.tsx
├── AddSectionPage.tsx
├── PartMapPage.tsx
├── VulnerabilityPage.tsx
├── BoothCommitteePage.tsx
├── BLA2Page.tsx
├── components/
│   ├── PartTable.tsx
│   ├── SectionTable.tsx
│   ├── BulkUploadForm.tsx
│   ├── ManualEntryForm.tsx
│   ├── PartMap.tsx
│   └── FileDropzone.tsx
├── hooks/
│   ├── useParts.ts
│   ├── useSections.ts
│   └── useBulkUpload.ts
└── types/
    └── part.types.ts
```

### 6.3 Bulk Upload Component

```tsx
// BulkUploadForm.tsx
interface BulkUploadFormProps {
  entityType: 'part' | 'section' | 'voter' | 'caste' | etc.;
  title: string;
  description: string;
  templateEndpoint: string;
  uploadEndpoint: string;
  onSuccess: (result: BulkUploadResult) => void;
}

const BulkUploadForm: React.FC<BulkUploadFormProps> = ({
  entityType,
  title,
  description,
  templateEndpoint,
  uploadEndpoint,
  onSuccess
}) => {
  const [mode, setMode] = useState<'bulk' | 'manual'>('bulk');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  return (
    <div>
      <Radio.Group value={mode} onChange={e => setMode(e.target.value)}>
        <Radio value="bulk">Bulk Upload</Radio>
        <Radio value="manual">Manual</Radio>
      </Radio.Group>
      
      {mode === 'bulk' && (
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
          
          <Dragger
            accept=".csv,.xlsx"
            beforeUpload={file => { setFile(file); return false; }}
          >
            <p><InboxOutlined /></p>
            <p>Drag your CSV file to start uploading</p>
            <p>or</p>
            <Button>Browse files</Button>
          </Dragger>
          
          <div>
            <h4>Download Sample File</h4>
            <a href={templateEndpoint}>Download Excel Template</a>
          </div>
          
          <Button 
            type="primary" 
            disabled={!file}
            loading={uploading}
            onClick={handleUpload}
          >
            Upload
          </Button>
        </div>
      )}
      
      {mode === 'manual' && <ManualEntryForm entityType={entityType} />}
    </div>
  );
};
```

---

## 7. URL Route Map (Complete)

```typescript
const routes = [
  // Dashboard
  { path: '/static-dashboard', component: DashboardPage },
  
  // Part Manager
  { path: '/part-list', component: PartListPage },
  { path: '/add-part', component: AddPartPage },
  { path: '/section-list', component: SectionListPage },
  { path: '/add-section', component: AddSectionPage },
  { path: '/part-map', component: PartMapPage },
  { path: '/vulnerability', component: VulnerabilityPage },
  { path: '/booth-committee', component: BoothCommitteePage },
  { path: '/bla-2', component: BLA2Page },
  
  // Election Manager
  { path: '/elections', component: ElectionsPage },
  { path: '/app-banner', component: AppBannerPage },
  { path: '/voterHistory', component: VotingHistoryPage },
  { path: '/availability', component: VoterCategoryPage },
  { path: '/booth-slip', component: VoterSlipPage },
  { path: '/parties', component: PartiesPage },
  { path: '/religion', component: ReligionPage },
  { path: '/caste-category', component: CasteCategoryPage },
  { path: '/caste', component: CastePage },
  { path: '/sub-caste', component: SubCastePage },
  { path: '/language', component: LanguagePage },
  { path: '/benefit-scheme', component: SchemesPage },
  { path: '/feedback', component: FeedbackPage },
  
  // Voter Manager
  { path: '/voters', component: VotersListPage },
  { path: '/add-voter', component: AddVoterPage },
  { path: '/voters-map', component: VotersMapPage },
  { path: '/double-entry', component: DoubleEntryPage },
  { path: '/enroll-voter', component: EnrollVoterPage },
  { path: '/sir', component: SIRPage },
  { path: '/voter-photo', component: VoterPhotoPage },
  { path: '/aadhaar-verified', component: AadhaarVerifiedPage },
  
  // Family Manager
  { path: '/family', component: FamilyPage },
  { path: '/family-captain', component: FamilyCaptainPage },
  { path: '/add-family-captain', component: AddFamilyCaptainPage },
  { path: '/family-captain-map', component: FamilyCaptainMapPage },
  
  // Settings
  { path: '/profile', component: ProfilePage },
];
```

---

*Document Version: 2.1 | Part Manager & Dashboard Specifications | January 2026*
