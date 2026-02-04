# Tenant Access Guide - ElectionCaffe

This guide explains how to access each tenant organization's portal using separate URLs (ports in development, subdomains in production).

## 🎯 Multi-Tenant Architecture

ElectionCaffe uses a **port-based tenant isolation** system for local development and **subdomain-based** tenant isolation for production. Each tenant has their own dedicated URL - no tenant slug field required!

## 🌐 Development Access (Localhost)

Each tenant runs on a different port for complete isolation:

### Demo Organization
- **URL:** http://localhost:5180/
- **Tenant:** Demo
- **Email:** demo@electioncaffe.com
- **Password:** Admin@123

### BJP Tamil Nadu
- **URL:** http://localhost:5181/
- **Tenant:** BJP Tamil Nadu
- **Email:** admin.bjp-tn@electioncaffe.com
- **Password:** Admin@123

### BJP Uttar Pradesh
- **URL:** http://localhost:5182/
- **Tenant:** BJP Uttar Pradesh
- **Email:** admin.bjp-up@electioncaffe.com
- **Password:** Admin@123

### AIDMK Tamil Nadu
- **URL:** http://localhost:5183/
- **Tenant:** AIDMK Tamil Nadu
- **Email:** admin.aidmk-tn@electioncaffe.com
- **Password:** Admin@123

**Note:** The default tenant web app (when started with `npm run dev`) runs on port **5177** and is mapped to Demo tenant. Super Admin app runs on port **5176**.

## 🚀 Running Tenant Instances

### Start All Tenants Simultaneously

```bash
cd apps/web
npm run dev:all-tenants
```

This will start 4 separate Vite instances, one for each tenant on their respective ports.

### Start Individual Tenants

```bash
# Start Demo tenant only
npm run dev:demo

# Start BJP Tamil Nadu only
npm run dev:bjp-tn

# Start BJP Uttar Pradesh only
npm run dev:bjp-up

# Start AIDMK Tamil Nadu only
npm run dev:aidmk-tn
```

### Start Default Instance (Port 5173)
```bash
npm run dev
```

## 🏭 Production Access (Subdomains)

In production, each tenant is accessed via subdomain:

### Demo Organization
- **URL:** https://demo.electioncaffe.com
- **Email:** demo@electioncaffe.com
- **Password:** [Production Password]

### BJP Tamil Nadu
- **URL:** https://bjp-tn.electioncaffe.com
- **Email:** admin.bjp-tn@electioncaffe.com
- **Password:** [Production Password]

### BJP Uttar Pradesh
- **URL:** https://bjp-up.electioncaffe.com
- **Email:** admin.bjp-up@electioncaffe.com
- **Password:** [Production Password]

### AIDMK Tamil Nadu
- **URL:** https://aidmk-tn.electioncaffe.com
- **Email:** admin.aidmk-tn@electioncaffe.com
- **Password:** [Production Password]

## 🔐 How Tenant Detection Works

The system automatically detects the tenant based on:

1. **Port (Development):** The browser's port number (5173, 5174, 5175, 5176)
2. **Subdomain (Production):** The subdomain in the URL (demo.electioncaffe.com, bjp-tn.electioncaffe.com, etc.)
3. **Path-based (Fallback):** URL path like `/tenant/bjp-tn`

### Login Experience

When you visit a tenant URL:
1. The system detects the tenant automatically from the URL
2. The login page displays: **"Sign in to [Tenant Name]"**
3. You only need to enter **Email/Mobile** and **Password**
4. **No tenant slug field required!**

## 📋 Available Features by Tenant

All tenants have the following features enabled:

### ✅ Core Features
- 🗳️ **Election Management** - Create and manage elections
- 👥 **Voter Database** - Comprehensive voter records
- 🎯 **Cadre Management** - Track party workers and volunteers
- 📊 **Analytics & Reports** - Real-time insights
- 🤖 **AI Analytics** - Advanced AI-powered insights
- 📱 **Campaign Management** - Track campaigns and events
- 📋 **Surveys & Feedback** - Voter sentiment analysis
- 🗺️ **Booth Mapping** - Geographic visualization

### ✅ Fund & Inventory (Newly Enabled)
- 💰 **Fund Management**
  - Track donations and expenses
  - Multiple account types (Bank, UPI, Cash)
  - Automated receipt generation
  - Transaction history and statements

- 📦 **Inventory Management**
  - Campaign material tracking
  - Stock-in/Stock-out management
  - Category-based organization
  - Allocation to elections/events

## 🛠️ Technical Details

### Port Mapping Configuration

Located in: `apps/web/src/utils/tenant.ts`

```typescript
const TENANT_CONFIGS: Record<string, TenantConfig> = {
  'demo': { slug: 'demo', name: 'Demo Organization', port: 5180 },
  'bjp-tn': { slug: 'bjp-tn', name: 'BJP Tamil Nadu', port: 5181 },
  'bjp-up': { slug: 'bjp-up', name: 'BJP Uttar Pradesh', port: 5182 },
  'aidmk-tn': { slug: 'aidmk-tn', name: 'AIDMK Tamil Nadu', port: 5183 },
};
```

### Database Architecture

**Core Database (ElectionCaffeCore):**
- Stores tenant metadata and configuration
- Feature flags and licenses
- Super admin data

**Tenant Databases:**
- Each tenant has a dedicated database schema
- Complete data isolation
- Independent backups and scaling

## 🔧 Adding New Tenants

To add a new tenant:

1. **Create Tenant in Core Database:**
   ```sql
   INSERT INTO "Tenant" (name, slug, status, "databaseType", "databaseStatus")
   VALUES ('New Org', 'new-org', 'ACTIVE', 'DEDICATED_MANAGED', 'READY');
   ```

2. **Enable Features:**
   ```bash
   node enable-fund-inventory.js
   ```

3. **Update Tenant Config** in `apps/web/src/utils/tenant.ts`:
   ```typescript
   'new-org': { slug: 'new-org', name: 'New Organization', port: 5178 },
   ```

4. **Add Dev Script** in `apps/web/package.json`:
   ```json
   "dev:new-org": "vite --port 5178"
   ```

5. **Create Admin User** (via Super Admin portal or script)

## 🎨 Tenant Branding

Each tenant can have custom branding:
- Logo
- Primary colors
- Organization name
- Banner images

Configure via: **Settings → Organization Setup**

## 📞 Support

For issues accessing any tenant:
1. Verify the backend services are running
2. Check that PostgreSQL databases are accessible
3. Ensure feature flags are enabled for the tenant
4. Check browser console for any errors

---

**Last Updated:** January 21, 2026
**Version:** 1.0.0
**Status:** ✅ All 4 tenants configured and ready
