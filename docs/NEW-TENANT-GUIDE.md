# ElectionCaffe — New Tenant Onboarding Guide

> Step-by-step guide for a political party setting up and using ElectionCaffe for election management.

---

## Phase 1: Account & Organization Setup

### Step 1 — Login / Register
- Admin registers via `/register` (name, mobile, email, password)
- Login at `/login` with credentials
- System issues JWT tokens, redirects to Dashboard

### Step 2 — Branding & Organization
- Go to **Settings > Organization Setup**
- Set party name, logo URL, primary/secondary colors, favicon
- Configure user roles and feature access (Funds, Inventory, AI Tools, etc.)
- Invite team members and assign roles:
  - **Tenant Admin** — full access
  - **Constituency Admin** — election-level control
  - **Campaign Manager** — campaigns, surveys, cadres
  - **Coordinator / Sector Officer** — field operations
  - **Booth In-charge** — booth-level management
  - **Volunteer / Agent** — limited data entry

---

## Phase 2: Election Setup

### Step 3 — Create an Election
- Go to **Elections** page → Click **Create Election**
- Fill in:
  - Election Name (e.g. "Bihar Assembly 2025")
  - Election Type (Assembly / Parliament / Municipal / Panchayat / By-Election)
  - Constituency Name
  - State & District
  - Poll Date
- Election starts in **Draft** status

### Step 4 — Select the Election
- Click the election from the list or use the **header dropdown**
- This sets the active election — all subsequent data is tied to it
- The election must be selected before accessing any data pages

---

## Phase 3: Master Data Configuration

### Step 5 — Configure Master Data
Go to **Master Data** and set up reference data before importing voters:

| Data Type | Example |
|-----------|---------|
| Religions | Hindu, Muslim, Christian, Sikh, Buddhist, Jain |
| Caste Categories | General, OBC, SC, ST, EWS |
| Castes & Sub-castes | Yadav, Rajput, Paswan, Kushwaha, etc. |
| Languages | Hindi, Bhojpuri, Maithili, Urdu |
| Parties | BJP, INC, RJD, JDU, etc. |
| Voter Categories | Regular, NRI, Service, New Voter |
| Schemes | PM Kisan, MGNREGA, Ujjwala, etc. |

> Master data must exist **before** bulk importing voters so voter records can reference them.

---

## Phase 4: Constituency Structure (Parts / Booths)

### Step 6 — Import Polling Booths
- Go to **Parts / Booths** page
- Click **Bulk Upload** → Download CSV template
- Fill in for each booth:
  - Part Number (unique, from EC data)
  - Booth Name (English + Local)
  - Address, Landmark, Pincode
  - Type (URBAN / RURAL)
- Upload CSV → system validates and creates all booths
- Alternatively, create booths one-by-one via **Add Part**

### Step 7 — Verify Booth Data
- Click any booth row to view its detail page
- Check: address, type, voter counts (will populate after voter import)
- Edit any incorrect information
- Set vulnerability status (HIGH / MEDIUM / LOW) for sensitive booths

---

## Phase 5: Voter Data

### Step 8 — Bulk Import Voters
- Go to **Voters** page → Click **Bulk Upload**
- Download CSV template, fill in:
  - Full Name (required)
  - Name in Local Language
  - Gender (MALE / FEMALE / TRANSGENDER)
  - Age
  - EPIC Number (Voter ID)
  - Mobile Number
  - Serial Number (SL No in voter list)
  - **Part Number** (required — must match an existing booth)
- Upload CSV → system validates and creates voters
- Voter counts automatically reflect on booth/part pages

### Step 9 — Verify Voter Data
- Check Dashboard for total voter count, gender split, age distribution
- Click any voter row to view full profile
- Upload voter photos if available
- Link voters to religion, caste, language, schemes via edit form

---

## Phase 6: Family Organization

### Step 10 — Create Families
- Go to **Families** page → Bulk Upload or create manually
- Families group voters by household
- Each family has:
  - Family Name
  - House Number
  - Address
  - Captain (head of family)
- Template supports `captainEpic` to auto-link captain by Voter ID

### Step 11 — Manage Family Members
- Click any family row → Family Detail Page
- **Add Member**: Search voters by name (min 2 chars) → click to select → confirm
- **Remove Member**: Click remove icon next to any member
- **Change Captain**: Edit family → select new captain
- Click any member to jump to their voter profile

---

## Phase 7: Party Workers (Cadres)

### Step 12 — Import Cadres
- Go to **Cadres** page → Bulk Upload
- Template columns:
  - Full Name (required)
  - Mobile (required, 10-digit)
  - Role: `Coordinator`, `Booth In-Charge`, `Volunteer`, `Agent`
  - Email (optional)
- Upload CSV to create all cadre records

### Step 13 — Assign Cadres to Booths
- On Cadres page, select a cadre → assign to specific booth/part
- Or go to **Parts > Booth Committee** (see Step 15)

---

## Phase 8: Booth Operations

### Step 14 — Booth Committee Setup
- Go to **Parts > Booth Committee**
- For each booth, assign cadres to committee roles:
  - Booth President
  - Booth Agent (BLA)
  - Relief Agent
  - Polling Agent
  - Transport In-charge
  - Social Media In-charge
  - Volunteer
- Each booth can have multiple committee members

### Step 15 — BLA-2 Assignment
- Go to **Parts > BLA-2**
- Assign primary Booth Level Agent to each booth
- Track agent coverage across all booths

### Step 16 — Vulnerability Assessment
- Go to **Parts > Vulnerability**
- Flag sensitive/high-risk booths
- Add vulnerability notes
- Helps prioritize security and resource allocation

---

## Phase 9: Candidates

### Step 17 — Add Candidates
- Go to **Candidates** page → Create Candidate
- Fill in:
  - Name, party, contact details
  - Upload photo and documents
  - Add social media profiles (Twitter, Facebook, Instagram)
- Track social media engagement metrics

### Step 18 — Battle Cards (Optional)
- Create comparative analysis vs opponent candidates
- AI can generate battle card content
- Key issues, strengths/weaknesses, talking points

---

## Phase 10: Campaign & Outreach

### Step 19 — Create Surveys
- Go to **Surveys** → Create Survey
- Add questions:
  - Text input
  - Radio button (single choice)
  - Checkbox (multi-choice)
  - Scale (1-10)
- Set start/end dates → Activate
- Track response counts and analyze results

### Step 20 — Campaign Management
- Go to **Campaigns**
- Create campaign initiatives
- Track messaging and activities
- Monitor engagement

---

## Phase 11: Analytics & Reporting

### Step 21 — Dashboard Review
- **Dashboard** shows real-time KPIs:
  - Total voters, booths, cadres, families
  - Days until poll
  - Gender distribution (pie chart)
  - Religion / Caste / Party / Language / Age breakdowns
  - Booth operations status
  - Data completeness score

### Step 22 — Deep Analytics
- **Analytics** page — demographics, age groups, political leaning, data quality
- **AI Analytics** — predictive turnout, swing voter identification, booth risk
- **Locality Analysis** — area-wise demographics, competitor analysis

### Step 23 — Generate Reports
- Go to **Reports**
- Available report types:
  - Voter Demographics
  - Booth Statistics
  - Cadre Performance
  - Feedback Summary
- Export as PDF or Excel

---

## Phase 12: Election Day

### Step 24 — Lock Election
- Go to **Elections** → Lock election
- Freezes all data to prevent accidental edits

### Step 25 — Print Voter Slips
- Go to **Poll Day > Voter Slips**
- Configure slip options:
  - Show/hide photo
  - Include QR code
  - Show address
  - Paper size (A4)
- Batch print for booth-wise distribution

### Step 26 — Poll Day Operations
- Use **Poll Day** dashboard for election day monitoring
- Track booth-level status
- Coordinate with booth committees via the app

---

## Optional Modules

### Fund Management (if enabled)
1. **Accounts** — Create bank/UPI/cash accounts
2. **Donations** — Record donations (donor name, PAN, amount, payment method)
3. **Expenses** — Submit expenses (category, vendor, invoice, approval workflow)
4. **Transactions** — View complete financial history
5. **Fund Reports** — Period-based financial reports

### Inventory Management (if enabled)
1. **Categories** — Organize items (banners, pamphlets, vehicles, etc.)
2. **Items** — Track stock with min/max/reorder levels
3. **Stock In/Out** — Record movements with reasons
4. **Allocations** — Allocate items to events/booths, track returns
5. **Reports** — Stock levels, movement history, allocation reports

### AI Tools (credit-based)
- OCR for document scanning
- Text generation for campaign content
- Data analysis and predictions
- Credit balance tracked in Settings

---

## Quick Reference — Recommended Setup Order

```
1.  Register / Login
2.  Organization Setup (branding, roles, features)
3.  Create Election
4.  Configure Master Data (religions, castes, languages, parties)
5.  Import Booths/Parts (bulk CSV)
6.  Import Voters (bulk CSV with part numbers)
7.  Create Families & map voters
8.  Import Cadres (party workers)
9.  Assign Booth Committees
10. Add Candidates
11. Create Surveys
12. Review Dashboard & Analytics
13. Generate Reports
14. Lock Election before poll day
15. Print Voter Slips
16. Poll Day operations
```

---

## Tips for Success

- **Always select an election** before accessing any data page
- **Import master data first** — voters reference religions, castes, etc.
- **Booths before voters** — voter import needs valid part numbers
- **Use bulk upload** for large datasets (voters, families, cadres, booths)
- **Check Dashboard regularly** to spot data quality issues early
- **Lock the election** before poll day to prevent accidental changes
- **Assign booth committees early** — ensures every booth has coverage
- **Run analytics** after major imports to verify data distribution looks realistic
