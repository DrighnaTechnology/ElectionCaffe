# Quick Start - Fund & Inventory Management

## 🚀 Start the Application

```bash
# Terminal 1 - Auth Service (port 3000)
cd services/auth-service
yarn dev

# Terminal 2 - Super Admin Service (port 3002)
cd services/super-admin-service
yarn dev

# Terminal 3 - Web App (port 5175)
cd apps/web
yarn dev
```

**Tenant App URL**: http://localhost:5175/

## ⚡ Quick Enable Features

### Option 1: Using Prisma Studio (Easiest)

```bash
cd packages/database
npx prisma studio
```

1. Open `TenantFeature` table
2. Create new record:
   - tenantId: (your tenant ID)
   - featureId: (fund_management feature ID)
   - isEnabled: true

### Option 2: Using SQL

```sql
-- Get your tenant ID
SELECT id, name FROM "Tenant";

-- Get feature IDs
SELECT id, featureKey FROM "FeatureFlag"
WHERE featureKey IN ('fund_management', 'inventory_management');

-- Enable fund management
INSERT INTO "TenantFeature" ("id", "tenantId", "featureId", "isEnabled")
VALUES (
  gen_random_uuid(),
  'YOUR_TENANT_ID',
  'FUND_FEATURE_ID',
  true
);

-- Enable inventory management
INSERT INTO "TenantFeature" ("id", "tenantId", "featureId", "isEnabled")
VALUES (
  gen_random_uuid(),
  'YOUR_TENANT_ID',
  'INVENTORY_FEATURE_ID',
  true
);
```

### Option 3: Using Node Script

Create `enable-features.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enable() {
  const tenant = await prisma.tenant.findFirst();
  const fund = await prisma.featureFlag.findUnique({
    where: { featureKey: 'fund_management' }
  });

  await prisma.tenantFeature.upsert({
    where: {
      tenantId_featureId: {
        tenantId: tenant.id,
        featureId: fund.id
      }
    },
    update: { isEnabled: true },
    create: {
      tenantId: tenant.id,
      featureId: fund.id,
      isEnabled: true
    }
  });

  console.log('✓ Fund management enabled');
}

enable();
```

Run: `node enable-features.js`

## ✅ Verify It's Working

1. **Login** to tenant app: http://localhost:5175/login

2. **Check navigation** - You should see:
   - "Funds" menu item (if fund_management enabled)
   - "Inventory" menu item (if inventory_management enabled)

3. **Test Fund Management**:
   - Click "Funds" → Should see dashboard
   - Click "Create Account" → Create a fund account
   - Record a donation
   - Submit an expense

## 🔧 Troubleshooting

### Menu items not showing?

**Check 1**: Is feature enabled?
```sql
SELECT tf.*, ff.featureKey
FROM "TenantFeature" tf
JOIN "FeatureFlag" ff ON tf."featureId" = ff.id
WHERE ff.featureKey = 'fund_management';
```

**Check 2**: Clear browser cache and refresh

### Getting 403 errors?

Feature is not enabled for your tenant. Enable it using one of the methods above.

### Tables not created?

Check super-admin-service logs for errors. Tables are created automatically when you enable the feature.

## 📚 Documentation

- **Setup Guide**: [SETUP_FUND_INVENTORY_FEATURES.md](SETUP_FUND_INVENTORY_FEATURES.md)
- **Testing Guide**: [TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md)
- **Implementation Details**: [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
- **Architecture Guide**: [TENANT_FEATURE_ENABLEMENT_GUIDE.md](TENANT_FEATURE_ENABLEMENT_GUIDE.md)

## 🎯 What You Get

### Fund Management
- ✅ Multiple fund accounts (main, campaign, constituency)
- ✅ Donation tracking with donor details
- ✅ Expense submission and approval workflow
- ✅ Complete transaction history
- ✅ Financial dashboard

### Inventory Management (Backend Ready)
- ✅ Backend APIs complete
- ⏳ Frontend UI pending (coming soon)

## 🔐 Default Features

By default, these features are **DISABLED**:
- fund_management
- inventory_management

You must enable them per tenant using Super Admin.

## 📊 API Endpoints

### Fund Management
```
GET  /api/funds/accounts
POST /api/funds/accounts
GET  /api/funds/donations
POST /api/funds/donations
GET  /api/funds/expenses
POST /api/funds/expenses
PATCH /api/funds/expenses/:id/status
GET  /api/funds/transactions
GET  /api/funds/summary
```

### Inventory Management
```
GET  /api/inventory/categories
POST /api/inventory/categories
GET  /api/inventory/items
POST /api/inventory/items
POST /api/inventory/items/:id/stock-in
POST /api/inventory/items/:id/stock-out
GET  /api/inventory/allocations
POST /api/inventory/allocations
GET  /api/inventory/summary
```

## ⚡ Quick Tips

1. **Start with one feature** - Enable fund_management first, test it, then enable inventory_management

2. **Use Prisma Studio** - Easiest way to enable features during development

3. **Check logs** - Super admin service logs show table creation progress

4. **Test with multiple tenants** - Features are tenant-specific, great for testing isolation

5. **Backup before testing** - Although tables are created safely, always good practice

## 🎉 Success Indicators

When everything is working:
- ✅ Services running without errors
- ✅ Can login to tenant app
- ✅ "Funds" menu visible in navigation
- ✅ Can create fund account
- ✅ Can record donation
- ✅ Can submit expense
- ✅ Dashboard shows data correctly

**You're all set!** 🚀
