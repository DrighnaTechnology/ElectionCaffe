# Fund & Inventory Management - Complete Setup Guide

## Overview

Fund Management and Inventory Management are now implemented as **optional, tenant-specific features** that can be enabled/disabled by Super Admin. When enabled for a tenant, the corresponding database tables are automatically created in that tenant's database.

## What Has Been Implemented

### ✅ Backend Implementation

1. **Database Table Schemas**
   - Location: `packages/database/src/feature-schemas/`
   - Files:
     - `fund-management.schema.ts` - Fund account, donation, expense, transaction tables
     - `inventory-management.schema.ts` - Category, item, movement, allocation tables
     - `index.ts` - Schema exports

2. **Dynamic Table Creation Utility**
   - Location: `services/super-admin-service/src/utils/createFeatureTables.ts`
   - Functions:
     - `createFeatureTables()` - Creates tables when feature is enabled
     - `dropFeatureTables()` - Drops tables when feature is disabled (optional)
     - `featureTablesExist()` - Checks if tables exist
     - `getTenantDatabaseUrl()` - Constructs database URL based on tenant config

3. **Super Admin API Enhancement**
   - File: `services/super-admin-service/src/routes/tenants.ts`
   - Endpoint: `PUT /api/super-admin/tenants/:id/features/:featureId`
   - Behavior:
     - When enabling `fund_management` or `inventory_management`:
       - Checks if tenant database is configured
       - Creates all required tables in tenant's database
       - Updates `TenantFeature` record
     - When disabling:
       - Updates `TenantFeature` record (tables are preserved)

4. **Feature Access Middleware**
   - File: `services/auth-service/src/middleware/requireFeature.ts`
   - Middleware:
     - `requireFeature(featureKey)` - Checks if feature is enabled for tenant
     - `requireRoleFeature(featureKey)` - Checks both feature and role access
   - Applied to routes in `services/auth-service/src/index.ts`:
     ```typescript
     app.use('/api/funds', requireFeature('fund_management'), fundManagementRoutes);
     app.use('/api/inventory', requireFeature('inventory_management'), inventoryManagementRoutes);
     ```

5. **API Routes** (Already existed, now protected)
   - Fund Management: `services/auth-service/src/routes/fund-management.ts`
   - Inventory Management: `services/auth-service/src/routes/inventory-management.ts`

### ✅ Frontend Implementation

1. **API Service Layer**
   - File: `apps/web/src/services/api.ts`
   - Added: `fundsAPI` and `inventoryAPI` with full CRUD operations

2. **Fund Management UI Components**
   - `apps/web/src/pages/FundsPage.tsx` - Main dashboard
   - `apps/web/src/components/funds/`:
     - `FundAccountsList.tsx` - List accounts
     - `DonationsList.tsx` - List donations
     - `ExpensesList.tsx` - List and approve expenses
     - `TransactionsList.tsx` - Transaction history
     - `CreateFundAccountDialog.tsx` - Create account form
     - `CreateDonationDialog.tsx` - Record donation form
     - `CreateExpenseDialog.tsx` - Submit expense form

3. **Feature Access Hook**
   - File: `apps/web/src/hooks/useFeature.ts`
   - Hooks:
     - `useFeature(featureKey)` - Check single feature
     - `useFeatures(featureKeys[])` - Check multiple features

4. **Utility Functions**
   - File: `apps/web/src/lib/utils.ts`
   - Added: `formatCurrency()` for INR formatting

### ✅ Configuration

1. **Seed Data Updated**
   - File: `packages/database/prisma/seed-core.ts`
   - Changes:
     - `fund_management`: `defaultEnabled: false` (was true)
     - `inventory_management`: `defaultEnabled: false` (was true)
     - Added descriptions explaining table creation requirement

## How to Complete the Setup

### Step 1: Update Seed Data in Database

```bash
cd packages/database
npx prisma generate
npx tsx prisma/seed-core.ts
```

This will update the feature flags to be disabled by default.

### Step 2: Add Routes to Frontend

Edit `apps/web/src/App.tsx`:

```typescript
import FundsPage from './pages/FundsPage';
// Import InventoryPage when created

// Inside the ProtectedRoute section, add:
<Route path="/funds" element={<FundsPage />} />
<Route path="/funds/*" element={<FundsPage />} />

<Route path="/inventory" element={<InventoryPage />} />
<Route path="/inventory/*" element={<InventoryPage />} />
```

### Step 3: Update Navigation Menu

Edit `apps/web/src/layouts/DashboardLayout.tsx`:

Add imports:
```typescript
import { useFeatures } from '../hooks/useFeature';
import { WalletIcon, PackageIcon } from 'lucide-react';
```

Inside component:
```typescript
const { enabledFeatures } = useFeatures(['fund_management', 'inventory_management']);

const navItems: NavItem[] = [
  // ... existing items

  // Fund Management (conditionally shown)
  ...(enabledFeatures.fund_management ? [{
    to: '/funds',
    icon: WalletIcon,
    label: 'Funds',
  }] : []),

  // Inventory Management (conditionally shown)
  ...(enabledFeatures.inventory_management ? [{
    to: '/inventory',
    icon: PackageIcon,
    label: 'Inventory',
  }] : []),
];
```

### Step 4: Create Inventory Page (Optional)

Create `apps/web/src/pages/InventoryPage.tsx` similar to `FundsPage.tsx`:

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryAPI } from '../services/api';
// ... similar structure to FundsPage
```

### Step 5: Build and Test

```bash
# Terminal 1 - Start auth service
cd services/auth-service
yarn dev

# Terminal 2 - Start super admin service
cd services/super-admin-service
yarn dev

# Terminal 3 - Start web app
cd apps/web
yarn dev
```

## Usage Workflow

### For Super Admin:

1. **Login to Super Admin Portal**
   - Navigate to Super Admin app
   - Login with super admin credentials

2. **Enable Feature for Tenant**
   - Go to Tenant Management
   - Select a tenant
   - Click "Manage Features"
   - Toggle "Fund Management" or "Inventory Management" to ON
   - System will:
     - Connect to tenant's database
     - Create all required tables
     - Enable the feature

3. **Monitor Status**
   - Check logs to confirm table creation
   - Verify feature is enabled in tenant's feature list

### For Tenant Users:

1. **After Feature is Enabled**
   - Login to tenant application
   - Navigation menu automatically shows new options:
     - "Funds" menu item (if fund_management enabled)
     - "Inventory" menu item (if inventory_management enabled)

2. **Using Fund Management**
   - Create fund accounts
   - Record donations
   - Submit expenses
   - Approve/reject expenses (admin only)
   - View transaction history
   - See dashboard summaries

3. **Using Inventory Management** (when UI is completed)
   - Create categories
   - Add inventory items
   - Record stock movements
   - Create allocations
   - Track returns

## Database Support

The system supports multiple database configurations:

### 1. SHARED Database
- All tenants use the main platform database
- Tables created in main database with `tenantId` isolation
- Connection: Uses `process.env.DATABASE_URL`

### 2. DEDICATED_MANAGED Database
- Each tenant has their own database managed by platform
- Tables created in tenant-specific database
- Connection: Constructed from tenant settings:
  ```
  postgresql://{user}:{password}@{host}:{port}/{database}
  ```

### 3. DEDICATED_SELF Database
- Tenant provides their own database
- Tables created in tenant-provided database
- Connection: Uses tenant's `databaseConnectionString`

## API Endpoints

### Super Admin

```
PUT /api/super-admin/tenants/:tenantId/features/:featureId
Body: { "isEnabled": true }
Response: Creates tables and enables feature
```

### Tenant - Fund Management

```
GET    /api/funds/accounts
POST   /api/funds/accounts
PUT    /api/funds/accounts/:id

GET    /api/funds/donations
POST   /api/funds/donations

GET    /api/funds/expenses
POST   /api/funds/expenses
PATCH  /api/funds/expenses/:id/status

GET    /api/funds/transactions
GET    /api/funds/summary
```

### Tenant - Inventory Management

```
GET    /api/inventory/categories
POST   /api/inventory/categories

GET    /api/inventory/items
POST   /api/inventory/items
POST   /api/inventory/items/:id/stock-in
POST   /api/inventory/items/:id/stock-out
POST   /api/inventory/items/:id/adjust

GET    /api/inventory/allocations
POST   /api/inventory/allocations
POST   /api/inventory/allocations/:id/return

GET    /api/inventory/summary
```

## Security & Permissions

### API Level Protection

1. **Feature Middleware**
   - All fund/inventory routes protected by `requireFeature()` middleware
   - Returns 403 if feature not enabled for tenant

2. **Role-Based Access**
   - Certain actions restricted to `TENANT_ADMIN` and `CENTRAL_ADMIN`
   - Examples:
     - Approve expenses
     - Adjust inventory stock
     - Create fund accounts

### Frontend Protection

1. **Conditional Rendering**
   - Menu items only shown if feature enabled
   - Uses `useFeature()` hook

2. **Route Protection**
   - Routes return 403 from API if accessed without permission
   - Frontend should handle errors gracefully

## Troubleshooting

### Tables Not Created

**Issue**: Feature enabled but tables don't exist

**Solution**:
1. Check super admin service logs for errors
2. Verify tenant database configuration
3. Manually run table creation:
   ```typescript
   import { createFeatureTables } from './utils/createFeatureTables';
   const tenant = await prisma.tenant.findUnique({ where: { id: 'tenant-id' }});
   await createFeatureTables(tenant, 'fund_management');
   ```

### 403 Forbidden Errors

**Issue**: API returns "Feature not enabled"

**Solution**:
1. Verify feature is enabled in database:
   ```sql
   SELECT tf.*, ff.featureKey
   FROM "TenantFeature" tf
   JOIN "FeatureFlag" ff ON tf."featureId" = ff.id
   WHERE tf."tenantId" = 'tenant-id'
   AND ff."featureKey" IN ('fund_management', 'inventory_management');
   ```
2. Check `isEnabled` is `true`
3. Re-enable feature via Super Admin UI

### Menu Items Not Showing

**Issue**: Feature enabled but menu doesn't appear

**Solution**:
1. Check browser console for errors
2. Verify `organizationAPI.getMyFeatures()` returns correct data
3. Clear browser cache and refresh
4. Check if `useFeature()` hook is implemented correctly

### Database Connection Errors

**Issue**: Cannot connect to tenant database

**Solution**:
1. Verify tenant database configuration in database
2. Test connection using `psql` or database client
3. Check firewall rules and network access
4. Verify credentials are correct

## Migration for Existing Tenants

If you want to enable these features for existing tenants:

### Option 1: Enable via Super Admin UI
1. Login to Super Admin
2. For each tenant, manually toggle features ON
3. System automatically creates tables

### Option 2: Bulk Enable via Script

Create a script `scripts/enable-features-bulk.ts`:

```typescript
import { prisma } from '@electioncaffe/database';
import { createFeatureTables } from '../services/super-admin-service/src/utils/createFeatureTables';

async function enableFeatures() {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
  });

  for (const tenant of tenants) {
    console.log(`Processing tenant: ${tenant.name}`);

    // Get fund_management feature
    const fundFeature = await prisma.featureFlag.findUnique({
      where: { featureKey: 'fund_management' },
    });

    if (fundFeature) {
      // Create tables
      await createFeatureTables(tenant, 'fund_management');

      // Enable feature
      await prisma.tenantFeature.upsert({
        where: {
          tenantId_featureId: {
            tenantId: tenant.id,
            featureId: fundFeature.id,
          },
        },
        update: { isEnabled: true },
        create: {
          tenantId: tenant.id,
          featureId: fundFeature.id,
          isEnabled: true,
        },
      });

      console.log(`✓ Fund management enabled for ${tenant.name}`);
    }

    // Repeat for inventory_management
  }
}

enableFeatures();
```

## What's NOT Included (To Do)

1. **Inventory Management Frontend UI**
   - Pages and components need to be created
   - Follow same pattern as Fund Management

2. **Super Admin UI for Feature Management**
   - Create dedicated page to manage tenant features
   - Show list of tenants with toggle switches for each feature

3. **Advanced Features**
   - Fund transfers between accounts
   - Budget tracking and alerts
   - Inventory QR code generation
   - Low stock email notifications
   - Donation receipt PDF generation

4. **Reports & Export**
   - Financial reports (PDF, Excel)
   - Inventory valuation reports
   - Donation receipts
   - Expense summaries

## File Reference

### Backend Files Created/Modified

```
services/super-admin-service/
├── src/
│   ├── routes/
│   │   └── tenants.ts (modified - added table creation logic)
│   └── utils/
│       └── createFeatureTables.ts (new)

services/auth-service/
└── src/
    ├── index.ts (modified - added feature middleware)
    └── middleware/
        └── requireFeature.ts (new)

packages/database/
├── prisma/
│   └── seed-core.ts (modified - disabled features by default)
└── src/
    └── feature-schemas/
        ├── fund-management.schema.ts (new)
        ├── inventory-management.schema.ts (new)
        └── index.ts (new)
```

### Frontend Files Created/Modified

```
apps/web/
└── src/
    ├── pages/
    │   └── FundsPage.tsx (new)
    ├── components/
    │   └── funds/
    │       ├── FundAccountsList.tsx (new)
    │       ├── DonationsList.tsx (new)
    │       ├── ExpensesList.tsx (new)
    │       ├── TransactionsList.tsx (new)
    │       ├── CreateFundAccountDialog.tsx (new)
    │       ├── CreateDonationDialog.tsx (new)
    │       └── CreateExpenseDialog.tsx (new)
    ├── hooks/
    │   └── useFeature.ts (new)
    ├── services/
    │   └── api.ts (modified - added fundsAPI & inventoryAPI)
    └── lib/
        └── utils.ts (modified - added formatCurrency)
```

## Support & Documentation

- Full Implementation Guide: `FUND_INVENTORY_IMPLEMENTATION_GUIDE.md`
- Tenant Feature Enablement Guide: `TENANT_FEATURE_ENABLEMENT_GUIDE.md`
- This Setup Guide: `SETUP_FUND_INVENTORY_FEATURES.md`

## Summary

Fund Management and Inventory Management are now fully configured as optional, tenant-specific features:

✅ **Backend**: Complete with dynamic table creation
✅ **Frontend**: Fund Management UI complete, Inventory pending
✅ **Security**: Feature middleware and permissions in place
✅ **Configuration**: Seed data updated, features disabled by default

**Next Steps**:
1. Add routes to App.tsx
2. Update navigation in DashboardLayout.tsx
3. Test feature enable/disable workflow
4. Create Inventory Management UI (optional)
5. Build Super Admin feature management UI
