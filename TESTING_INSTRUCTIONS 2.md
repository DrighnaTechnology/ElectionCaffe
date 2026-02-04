# Testing Fund & Inventory Management Features

## Quick Test Guide

### Step 1: Start the Services

```bash
# Terminal 1 - Auth Service (has fund/inventory APIs)
cd services/auth-service
yarn dev

# Terminal 2 - Super Admin Service
cd services/super-admin-service
yarn dev

# Terminal 3 - Web App
cd apps/web
yarn dev
```

The web app should now be running at **http://localhost:5175/**

### Step 2: Update Database (One-time setup)

```bash
cd packages/database

# Generate Prisma client
npx prisma generate

# Update seed data (sets fund/inventory features to disabled by default)
npx tsx prisma/seed-core.ts
```

### Step 3: Enable Features for a Tenant (Via Super Admin)

Since we don't have the Super Admin UI yet, enable features via API:

```bash
# Get tenant ID and feature IDs from database
# Then make API call to enable feature:

curl -X PUT http://localhost:3002/api/super-admin/tenants/{TENANT_ID}/features/{FEATURE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {SUPER_ADMIN_TOKEN}" \
  -d '{"isEnabled": true}'
```

Or use Prisma Studio to enable features:

```bash
cd packages/database
npx prisma studio

# Navigate to TenantFeature table
# Find or create records for:
# - fund_management feature
# - inventory_management feature
# Set isEnabled = true
```

### Step 4: Test in Tenant Application

1. **Login to Tenant App**: http://localhost:5175/login

2. **Check Navigation Menu**:
   - If `fund_management` is enabled → "Funds" menu item should appear
   - If `inventory_management` is enabled → "Inventory" menu item should appear

3. **Test Fund Management**:
   - Click "Funds" in navigation
   - You should see the Fund Management dashboard with:
     - Summary cards (Total Balance, Donations, Expenses)
     - Tabs: Overview, Accounts, Donations, Expenses, Transactions
   - Try creating a fund account
   - Try recording a donation
   - Try submitting an expense

4. **Test Feature Protection**:
   - Disable the feature in database
   - Refresh the page
   - "Funds" menu should disappear
   - API calls should return 403 Forbidden

## Database Tables Check

After enabling a feature, verify tables were created:

```sql
-- Connect to tenant database
-- Check if fund tables exist:
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('FundAccount', 'FundDonation', 'FundExpense', 'FundTransaction');

-- Check if inventory tables exist:
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('InventoryCategory', 'InventoryItem', 'InventoryMovement', 'InventoryAllocation');
```

## Expected Behavior

### When Feature is ENABLED:
✅ Menu item appears in navigation
✅ User can access the feature pages
✅ API calls work normally
✅ Database tables exist in tenant DB

### When Feature is DISABLED:
✅ Menu item does NOT appear
✅ Direct URL access returns 403 from API
✅ API calls return "Feature not enabled" error

## Troubleshooting

### Menu Items Not Showing

**Check 1**: Feature is enabled in database
```sql
SELECT tf.*, ff.featureKey
FROM "TenantFeature" tf
JOIN "FeatureFlag" ff ON tf."featureId" = ff.id
WHERE tf."tenantId" = '{YOUR_TENANT_ID}'
AND ff."featureKey" IN ('fund_management', 'inventory_management');
```

**Check 2**: Clear browser cache and refresh

**Check 3**: Check browser console for errors

### 403 Forbidden Errors

This means the feature is not enabled for your tenant. Enable it via:
1. Super Admin API (when UI is ready)
2. Prisma Studio (manual enable)
3. Database query (manual enable)

### Tables Not Created

**Check logs** in super-admin-service terminal for errors during table creation.

**Manually create tables**:
```bash
# In super-admin-service directory
node -e "
const { createFeatureTables } = require('./dist/utils/createFeatureTables.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'your-tenant-slug' }
  });

  await createFeatureTables(tenant, 'fund_management');
  await createFeatureTables(tenant, 'inventory_management');
}

run();
"
```

## Testing Checklist

- [ ] Fund Management menu appears when enabled
- [ ] Inventory Management menu appears when enabled
- [ ] Can create fund account
- [ ] Can record donation
- [ ] Can submit expense request
- [ ] Can approve/reject expense (as admin)
- [ ] Can view transactions
- [ ] Dashboard shows correct summaries
- [ ] Menu items disappear when features disabled
- [ ] API returns 403 when feature disabled
- [ ] Tables created in correct database (SHARED/DEDICATED)

## Quick Enable Features Script

Save as `enable-features.js` in project root:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableFeatures() {
  // Get your tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'your-tenant-slug' } // Change this
  });

  if (!tenant) {
    console.log('Tenant not found');
    return;
  }

  // Get features
  const fundFeature = await prisma.featureFlag.findUnique({
    where: { featureKey: 'fund_management' }
  });

  const inventoryFeature = await prisma.featureFlag.findUnique({
    where: { featureKey: 'inventory_management' }
  });

  // Enable fund management
  if (fundFeature) {
    await prisma.tenantFeature.upsert({
      where: {
        tenantId_featureId: {
          tenantId: tenant.id,
          featureId: fundFeature.id
        }
      },
      update: { isEnabled: true },
      create: {
        tenantId: tenant.id,
        featureId: fundFeature.id,
        isEnabled: true
      }
    });
    console.log('✓ Fund management enabled');
  }

  // Enable inventory management
  if (inventoryFeature) {
    await prisma.tenantFeature.upsert({
      where: {
        tenantId_featureId: {
          tenantId: tenant.id,
          featureId: inventoryFeature.id
        }
      },
      update: { isEnabled: true },
      create: {
        tenantId: tenant.id,
        featureId: inventoryFeature.id,
        isEnabled: true
      }
    });
    console.log('✓ Inventory management enabled');
  }

  console.log('Done!');
  await prisma.$disconnect();
}

enableFeatures().catch(console.error);
```

Run with:
```bash
node enable-features.js
```

## Screenshots to Verify

Take screenshots of:
1. Navigation menu with "Funds" and "Inventory" items
2. Fund Management dashboard
3. Create Fund Account dialog
4. Donations list
5. Expenses list with approval buttons
6. Navigation menu WITHOUT items (when disabled)

## Notes

- Both features work independently - you can enable one without the other
- Features are tenant-specific - enabling for one tenant doesn't affect others
- Tables are created automatically when feature is enabled
- Data is isolated per tenant (via tenantId)
- No existing functionality is affected
