# Replace Google Translate with react-i18next

## Context

The app currently uses Google Translate widget for language support. This causes:
- Poor translation quality for election/political terminology
- UI glitches (injected styles, body offset, flickering)
- DOM patches in `main.tsx` to prevent React crashes from Google's `<font>` tag wrapping
- 22 lines of CSS hacks in `index.html` to hide Google's UI
- A MutationObserver to fight Google's `body.style.top` injection
- No offline capability, no translation control

**Goal:** Replace with `react-i18next` — proper i18n with developer-managed JSON translation files. UI-only translation (menus, buttons, labels, headings, form fields). Web app only for now. Start with English JSON structure + infrastructure; non-English translations populated later.

---

## Scope — What this plan covers

1. Install i18n packages
2. Create i18n configuration
3. Create English translation JSON files (16 namespaces)
4. Migrate the layout shell (Sidebar, Breadcrumbs, Header, LanguageSwitcher)
5. Remove Google Translate artifacts
6. Set up RTL support for Urdu
7. Migrate pages incrementally (starting with high-traffic pages)

---

## Step 1: Install packages

**File:** `apps/web/package.json`

```bash
cd apps/web
npm install i18next react-i18next i18next-http-backend i18next-browser-languagedetector
```

| Package | Purpose |
|---------|---------|
| `i18next` | Core i18n framework |
| `react-i18next` | React bindings (`useTranslation` hook) |
| `i18next-http-backend` | Lazy-loads translation JSON from `/locales/` at runtime |
| `i18next-browser-languagedetector` | Detects saved language from localStorage |

---

## Step 2: Create i18n config

**New file:** `apps/web/src/lib/i18n.ts`

- Configure i18next with `HttpBackend` + `LanguageDetector` + `initReactI18next`
- `fallbackLng: 'en'`, `defaultNS: 'common'`
- Backend `loadPath: '/locales/{{lng}}/{{ns}}.json'`
- Detection: `localStorage` key `electioncaffe-language`
- `load: 'languageOnly'` (use `en` not `en-US`)
- Export `SUPPORTED_LANGUAGES` array (13 languages with `code`, `label`, `dir`)
- On `languageChanged` event: set `document.documentElement.dir` and `document.documentElement.lang`

**Modify:** `apps/web/src/main.tsx`
- Add `import './lib/i18n';` before React renders (line 1-ish)
- Remove Google Translate DOM patches (lines 12-34)

### i18n.ts reference implementation

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
  { code: 'bn', label: 'বাংলা', dir: 'ltr' },
  { code: 'ta', label: 'தமிழ்', dir: 'ltr' },
  { code: 'te', label: 'తెలుగు', dir: 'ltr' },
  { code: 'kn', label: 'ಕನ್ನಡ', dir: 'ltr' },
  { code: 'ml', label: 'മലയാളം', dir: 'ltr' },
  { code: 'mr', label: 'मराठी', dir: 'ltr' },
  { code: 'gu', label: 'ગુજરાતી', dir: 'ltr' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'or', label: 'ଓଡ଼ିଆ', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'as', label: 'অসমীয়া', dir: 'ltr' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'electioncaffe-language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    load: 'languageOnly',
    react: {
      useSuspense: true,
    },
  });

// Set RTL/LTR direction when language changes
i18n.on('languageChanged', (lng) => {
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === lng);
  document.documentElement.dir = langConfig?.dir || 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
```

---

## Step 3: Create English translation files

**New directory:** `apps/web/public/locales/en/`

16 namespace JSON files grouped by feature area (matching sidebar nav groups):

| File | Covers |
|------|--------|
| `common.json` | Nav labels, breadcrumb labels, nav group labels, shared buttons (Save, Cancel, Delete, Edit, Search, etc.), status labels (Active, Inactive), gender options, pagination text, common form labels |
| `auth.json` | Login, Register, ForceResetPassword pages |
| `dashboard.json` | Dashboard KPIs, card titles, stat labels |
| `elections.json` | Elections, ElectionDetail |
| `voters.json` | Voters, VoterDetail, VoterSlip |
| `parts.json` | Parts, PartDetail, PartMap, AddPart, Vulnerability, BoothCommittee, BLA2 |
| `families.json` | Families, FamilyDetail, FamilyCaptains |
| `cadres.json` | Cadres page |
| `campaigns.json` | Campaigns, Surveys, PollDay |
| `analytics.json` | Analytics, AIAnalytics, AITools, LocalityAnalysis |
| `reports.json` | Reports, DataCaffe |
| `settings.json` | Settings, AppBanner, OrganizationSetup, UITheme |
| `candidates.json` | Candidates, Nominations |
| `operations.json` | Funds, Inventory |
| `data.json` | ECData, TenantNews, TenantActions |
| `admin.json` | AdminDashboard, UserDetail |

### Key structure convention

- Two-level nesting max, camelCase keys
- Example: `"nav.dashboard": "Dashboard"`, `"action.save": "Save"`, `"title": "Voters"`
- Use `{{variable}}` for interpolation (e.g., `{{tenantName}}`, `{{count}}`)
- Toast messages go in the namespace of the feature that triggers them
- Common buttons/labels go in `common.json` — no duplication across namespaces

### Example common.json

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "elections": "Elections",
    "voters": "Voters",
    "families": "Families",
    "familyCaptains": "Family Captains",
    "cadres": "Cadres",
    "parts": "Parts/Booths",
    "addPart": "Add Part",
    "partMap": "Part Map",
    "vulnerability": "Vulnerability",
    "boothCommittee": "Booth Committee",
    "bla2": "BLA-2",
    "sections": "Sections",
    "masterData": "Master Data",
    "surveys": "Surveys",
    "campaigns": "Campaigns",
    "pollDay": "Poll Day",
    "voterSlips": "Voter Slips",
    "analytics": "Analytics",
    "aiAnalytics": "AI Analytics",
    "aiTools": "AI Tools",
    "localityAnalysis": "Locality Analysis",
    "reports": "Reports",
    "dataCaffe": "DataCaffe",
    "ecData": "EC Data",
    "newsInfo": "News & Info",
    "actions": "Actions",
    "candidates": "Candidates",
    "nominations": "Nominations",
    "funds": "Funds",
    "inventory": "Inventory",
    "settings": "Settings",
    "appBanners": "App Banners",
    "organizationSetup": "Organization Setup",
    "uiTheme": "UI Theme Studio"
  },
  "navGroup": {
    "overview": "Overview",
    "voterManagement": "Voter Management",
    "constituency": "Constituency",
    "candidates": "Candidates",
    "campaignOutreach": "Campaign & Outreach",
    "analyticsAI": "Analytics & AI",
    "dataReports": "Data & Reports",
    "operations": "Operations",
    "settings": "Settings"
  },
  "action": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "import": "Import",
    "upload": "Upload",
    "download": "Download",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "submit": "Submit",
    "refresh": "Refresh",
    "signIn": "Sign In",
    "signOut": "Logout",
    "register": "Register"
  },
  "label": {
    "name": "Name",
    "email": "Email",
    "mobile": "Mobile",
    "gender": "Gender",
    "age": "Age",
    "status": "Status",
    "active": "Active",
    "inactive": "Inactive",
    "total": "Total",
    "selectElection": "Select Election",
    "noElection": "No Election Selected",
    "loading": "Loading...",
    "noData": "No data available",
    "showing": "Showing",
    "of": "of",
    "page": "Page",
    "perPage": "per page"
  },
  "header": {
    "selectLanguage": "Select Language",
    "changeLanguage": "Change Language"
  }
}
```

### Example auth.json

```json
{
  "login": {
    "title": "Welcome Back",
    "subtitle": "Sign in to your account to continue",
    "subtitleTenant": "Sign in to {{tenantName}}",
    "identifierLabel": "Mobile Number or Email",
    "identifierPlaceholder": "Enter mobile number or email",
    "passwordLabel": "Password",
    "passwordPlaceholder": "Enter your password",
    "submit": "Sign In",
    "noAccount": "Don't have an account?",
    "register": "Register",
    "success": "Login successful!",
    "failed": "Login failed",
    "fillFields": "Please enter mobile number or email and password"
  }
}
```

Also create empty stub folders for all 12 non-English languages (`hi/`, `bn/`, `ta/`, `te/`, `kn/`, `ml/`, `mr/`, `gu/`, `pa/`, `or/`, `ur/`, `as/`) with a minimal `common.json` so the backend doesn't 404.

---

## Step 4: TypeScript type safety

**New file:** `apps/web/src/types/i18next.d.ts`

```typescript
import 'i18next';
import type common from '../../public/locales/en/common.json';
import type auth from '../../public/locales/en/auth.json';
import type dashboard from '../../public/locales/en/dashboard.json';
// ... import all 16 namespace types

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      auth: typeof auth;
      dashboard: typeof dashboard;
      // ... all 16 namespaces
    };
  }
}
```

- Enables autocomplete and type-checking for `t('nav.dashboard')` calls
- Ensure `tsconfig.json` has `"resolveJsonModule": true`

---

## Step 5: Migrate layout shell

### 5a. SidebarNav.tsx
- **File:** `apps/web/src/components/layout/SidebarNav.tsx`
- Add `const { t } = useTranslation('common');`
- Replace all hardcoded `label:` strings in `NAV_GROUPS` with `t('nav.dashboard')`, `t('nav.voters')`, etc.
- Replace group `label:` strings with `t('navGroup.overview')`, `t('navGroup.voterManagement')`, etc.
- Since `NAV_GROUPS` is a static const but `t()` needs to run inside the component, move it inside the component or make it a function that takes `t`

### 5b. Breadcrumbs.tsx
- **File:** `apps/web/src/components/layout/Breadcrumbs.tsx`
- Add `const { t } = useTranslation('common');`
- Replace `ROUTE_LABELS` dict values with `t('breadcrumb.dashboard')` etc., or build the dict dynamically using `t()`

### 5c. LanguageSwitcher.tsx
- **File:** `apps/web/src/components/layout/LanguageSwitcher.tsx`
- Full rewrite: replace Google Translate cookie logic with `i18n.changeLanguage(langCode)`
- Use `SUPPORTED_LANGUAGES` from `lib/i18n.ts`
- No page reload — react-i18next re-renders reactively
- Set `document.documentElement.dir` for RTL on language change
- Show checkmark on currently active language

### 5d. Header.tsx
- **File:** `apps/web/src/components/layout/Header.tsx`
- Translate any hardcoded strings (e.g., "CaffeAI Credits")

---

## Step 6: Remove Google Translate artifacts

### 6a. index.html
- **File:** `apps/web/index.html`
- Remove `<div id="google_translate_element">` (line 45)
- Remove Google Translate CSS hacks (lines 21-42)
- Remove `googleTranslateElementInit` script (lines 48-56)
- Remove Google Translate script tag (line 58)
- Remove MutationObserver script (lines 59-67)

### 6b. main.tsx
- **File:** `apps/web/src/main.tsx`
- Remove `Node.prototype.removeChild` and `Node.prototype.insertBefore` patches (lines 12-34)

### 6c. CaffeAIWidget.tsx
- **File:** `apps/web/src/components/CaffeAIWidget.tsx`
- Replace `getAppLanguage()` (reads googtrans cookie) with `i18n.language`
- `import i18n from '../lib/i18n';`

### 6d. ReportsPage.tsx
- **File:** `apps/web/src/pages/ReportsPage.tsx`
- Replace googtrans cookie reading with `i18n.language` for AI report language parameter

---

## Step 7: Migrate pages (incremental, priority order)

Each page migration: add `useTranslation('namespace')`, replace hardcoded strings with `t()` calls.

**Priority order:**
1. Auth pages (Login, Register, ForceResetPassword) — `auth.json`
2. DashboardPage — `dashboard.json`
3. VotersPage, VoterDetailPage — `voters.json`
4. FundsPage + fund components — `operations.json`
5. ElectionsPage, ElectionDetailPage — `elections.json`
6. PartsPage + sub-pages — `parts.json`
7. Remaining pages in sidebar order

### Migration pattern for each page

```tsx
// Before:
<h1>Dashboard</h1>
<Button>Add Voter</Button>
toast.success('Voter created successfully');

// After:
const { t } = useTranslation('dashboard');
<h1>{t('title')}</h1>
<Button>{t('common:action.addVoter')}</Button>
toast.success(t('voterCreated'));
```

### String categories per page (~800-1200 total across app)

| Category | Estimated Count | Pattern |
|----------|----------------|---------|
| Toast messages | ~332 | `toast.success('...')` / `toast.error('...')` |
| Button labels | ~150+ | `<Button>Text</Button>` |
| Card titles/descriptions | ~80+ | `<CardTitle>Text</CardTitle>` |
| Form labels | ~100+ | `<Label>Text</Label>` |
| Placeholders | ~60+ | `placeholder="..."` |
| Table headers | ~40+ | `<TableHead>Text</TableHead>` |
| Select options | ~100+ | `<SelectItem>Text</SelectItem>` |
| Route/breadcrumb labels | ~40 | Centralized in `ROUTE_LABELS` |
| Page titles/subtitles | ~48+ | `<h1>Text</h1>` |
| Empty states | ~20+ | Text nodes |

---

## Step 8: RTL support for Urdu

- In `lib/i18n.ts`: on `languageChanged` event, set `document.documentElement.dir = 'rtl'` when language is `ur`
- Audit layout shell files only (Sidebar, Header, DashboardLayout, Breadcrumbs) for directional CSS:
  - `SidebarNav.tsx`: `ml-5`, `pl-3`, `border-l-2` need `rtl:` variants
  - `Breadcrumbs.tsx`: `ChevronRightIcon` needs `rtl:rotate-180`
  - `DashboardLayout.tsx`: `pl-64` needs `rtl:pr-64`
- Individual page content (cards, tables, forms) flows correctly with `dir="rtl"` automatically via flexbox/grid

---

## Files modified (summary)

| File | Action |
|------|--------|
| `apps/web/package.json` | Add 4 i18n deps |
| `apps/web/src/lib/i18n.ts` | **New** — i18n config |
| `apps/web/src/types/i18next.d.ts` | **New** — TypeScript types |
| `apps/web/public/locales/en/*.json` | **New** — 16 English translation files |
| `apps/web/public/locales/{hi,bn,...}/common.json` | **New** — stubs for 12 languages |
| `apps/web/src/main.tsx` | Import i18n, remove Google Translate patches |
| `apps/web/index.html` | Remove Google Translate script, CSS hacks, MutationObserver |
| `apps/web/src/components/layout/SidebarNav.tsx` | Use `t()` for nav labels |
| `apps/web/src/components/layout/Breadcrumbs.tsx` | Use `t()` for route labels |
| `apps/web/src/components/layout/LanguageSwitcher.tsx` | Rewrite to use react-i18next |
| `apps/web/src/components/layout/Header.tsx` | Use `t()` for header strings |
| `apps/web/src/components/CaffeAIWidget.tsx` | Replace googtrans cookie with `i18n.language` |
| `apps/web/src/pages/ReportsPage.tsx` | Replace googtrans cookie with `i18n.language` |
| `apps/web/src/pages/*.tsx` | Incrementally migrate all 48 pages |

---

## Verification

1. **Dev server:** `cd apps/web && npm run dev` — app loads without errors
2. **Default language:** App shows in English, all sidebar/breadcrumb labels render correctly
3. **Language switch:** Click language switcher, select Hindi — UI re-renders instantly (no page reload), English text stays for untranslated pages (fallback working)
4. **RTL:** Switch to Urdu — `<html dir="rtl">` is set, sidebar flips to right side
5. **No Google artifacts:** No Google Translate banner, no `<font>` tag wrapping, no body offset
6. **localStorage persistence:** Refresh page — selected language persists
7. **Lazy loading:** Network tab shows only `common.json` + current page namespace loaded (not all 16)
8. **Build:** `npm run build` succeeds without TypeScript errors

---

## Notes

- **Date/number formatting:** Currently hardcoded to `en-IN` locale in `lib/utils.ts`. Keep as-is for v1 — Indian users expect `1,23,456` formatting regardless of UI language.
- **Non-English translations:** Not part of this implementation. Create English JSON structure first. Translation to other languages is a separate content task.
- **Mobile app:** Not in scope. React Native mobile app has no language support currently — will be addressed separately.
- **Super admin:** Not in scope for now.
