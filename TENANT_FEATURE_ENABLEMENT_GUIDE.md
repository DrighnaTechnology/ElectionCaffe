# Tenant-Specific Feature Enablement Guide
## Fund Management & Inventory Management as Optional Services

## Overview

This guide explains how to implement Fund Management and Inventory Management as optional, tenant-specific services that can be enabled/disabled by Super Admin. When enabled for a tenant, the corresponding database tables are created in that tenant's local database.

## Architecture

### Multi-Tenant Database Strategy

The system supports multiple database configurations per tenant:
1. **SHARED** - All tenants share the main database
2. **DEDICATED_MANAGED** - Each tenant has a dedicated database managed by the platform
3. **DEDICATED_SELF** - Tenant manages their own database

For tenant-specific feature tables, we need to:
1. Store feature schema definitions
2. Dynamically create tables when features are enabled
3. Handle migrations for feature-specific tables
4. Clean up tables when features are disabled (optional)

## Implementation Steps

### Step 1: Super Admin Feature Toggle UI

#### 1.1 Create Super Admin Tenant Feature Management Page

File: `apps/super-admin/src/pages/TenantFeaturesPage.tsx`

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { superAdminAPI } from '../services/api';
import { toast } from 'sonner';

export default function TenantFeaturesPage({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();

  // Get tenant details with features
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => superAdminAPI.getTenantById(tenantId),
  });

  // Get all available features
  const { data: featuresData } = useQuery({
    queryKey: ['features'],
    queryFn: () => superAdminAPI.getFeatures(),
  });

  // Toggle feature for tenant
  const toggleMutation = useMutation({
    mutationFn: ({ featureId, isEnabled }: { featureId: string; isEnabled: boolean }) =>
      superAdminAPI.toggleTenantFeature(tenantId, featureId, isEnabled),
    onSuccess: () => {
      toast.success('Feature updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update feature');
    },
  });

  const tenantData = tenant?.data?.data;
  const features = featuresData?.data?.data?.features || [];
  const enabledFeatureIds = tenantData?.tenantFeatures?.map((tf: any) => tf.featureId) || [];

  // Group features by category
  const featuresByCategory = features.reduce((acc: any, feature: any) => {
    const category = feature.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {});

  const handleToggle = (featureId: string, currentlyEnabled: boolean) => {
    toggleMutation.mutate({ featureId, isEnabled: !currentlyEnabled });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Features for {tenantData?.name}</h1>
        <p className="text-gray-500 mt-1">Enable or disable features for this tenant</p>
      </div>

      {Object.entries(featuresByCategory).map(([category, categoryFeatures]: [string, any]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="capitalize">{category.replace('_', ' ')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryFeatures.map((feature: any) => {
              const isEnabled = enabledFeatureIds.includes(feature.id);
              const isModuleFeature = ['fund_management', 'inventory_management'].includes(feature.featureKey);

              return (
                <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{feature.featureName}</h3>
                      {isModuleFeature && (
                        <Badge variant="secondary">Requires DB Tables</Badge>
                      )}
                    </div>
                    {feature.description && (
                      <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(feature.id, isEnabled)}
                    disabled={toggleMutation.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### 1.2 Add Super Admin API Endpoints

File: `services/super-admin-service/src/routes/tenants.ts`

Add new endpoint:

```typescript
// Toggle tenant feature (with table creation for fund/inventory)
router.patch('/:id/features/:featureId/toggle',
  superAdminAuth,
  async (req: Request, res: Response) => {
    const { id: tenantId, featureId } = req.params;
    const { isEnabled } = req.body;

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { tenantFeatures: true },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const feature = await prisma.featureFlag.findUnique({
        where: { id: featureId },
      });

      if (!feature) {
        return res.status(404).json({ error: 'Feature not found' });
      }

      // Check if this feature requires database tables
      const requiresDbTables = ['fund_management', 'inventory_management'].includes(feature.featureKey);

      if (isEnabled && requiresDbTables) {
        // Create database tables for this feature
        await createFeatureTables(tenant, feature.featureKey);
      }

      // Upsert tenant feature
      const tenantFeature = await prisma.tenantFeature.upsert({
        where: {
          tenantId_featureId: {
            tenantId,
            featureId,
          },
        },
        update: { isEnabled },
        create: {
          tenantId,
          featureId,
          isEnabled,
        },
      });

      res.json({
        success: true,
        data: { tenantFeature },
      });
    } catch (error) {
      console.error('Error toggling tenant feature:', error);
      res.status(500).json({ error: 'Failed to toggle feature' });
    }
  }
);
```

### Step 2: Dynamic Table Creation

#### 2.1 Create Feature Table Schema Definitions

File: `packages/database/src/feature-schemas/fund-management.schema.ts`

```typescript
export const fundManagementSchema = {
  tables: [
    {
      name: 'FundAccount',
      sql: `
        CREATE TABLE IF NOT EXISTS "FundAccount" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "accountName" TEXT NOT NULL,
          "accountNameLocal" TEXT,
          "accountType" TEXT NOT NULL,
          "description" TEXT,
          "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
          "currency" TEXT NOT NULL DEFAULT 'INR',
          "bankName" TEXT,
          "accountNumber" TEXT,
          "ifscCode" TEXT,
          "upiId" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "isDefault" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "FundAccount_tenantId_idx" ON "FundAccount"("tenantId");
        CREATE INDEX IF NOT EXISTS "FundAccount_accountType_idx" ON "FundAccount"("accountType");
      `,
    },
    {
      name: 'FundDonation',
      sql: `
        CREATE TABLE IF NOT EXISTS "FundDonation" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "electionId" TEXT,
          "donorName" TEXT NOT NULL,
          "donorEmail" TEXT,
          "donorPhone" TEXT,
          "donorAddress" TEXT,
          "donorPanNumber" TEXT,
          "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
          "donationType" TEXT NOT NULL,
          "amount" DECIMAL(15,2) NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'INR',
          "paymentMethod" TEXT,
          "transactionRef" TEXT,
          "receiptNumber" TEXT UNIQUE,
          "receiptUrl" TEXT,
          "purpose" TEXT,
          "remarks" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "approvedBy" TEXT,
          "approvedAt" TIMESTAMP,
          "donatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
          FOREIGN KEY ("accountId") REFERENCES "FundAccount"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "FundDonation_tenantId_idx" ON "FundDonation"("tenantId");
        CREATE INDEX IF NOT EXISTS "FundDonation_accountId_idx" ON "FundDonation"("accountId");
        CREATE INDEX IF NOT EXISTS "FundDonation_status_idx" ON "FundDonation"("status");
      `,
    },
    {
      name: 'FundExpense',
      sql: `
        CREATE TABLE IF NOT EXISTS "FundExpense" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "electionId" TEXT,
          "expenseCategory" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "amount" DECIMAL(15,2) NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'INR',
          "vendorName" TEXT,
          "vendorContact" TEXT,
          "invoiceNumber" TEXT,
          "invoiceUrl" TEXT,
          "paymentMethod" TEXT,
          "paymentRef" TEXT,
          "paidAt" TIMESTAMP,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "requestedBy" TEXT,
          "approvedBy" TEXT,
          "approvedAt" TIMESTAMP,
          "rejectionReason" TEXT,
          "attachments" TEXT DEFAULT '[]',
          "remarks" TEXT,
          "expenseDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
          FOREIGN KEY ("accountId") REFERENCES "FundAccount"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "FundExpense_tenantId_idx" ON "FundExpense"("tenantId");
        CREATE INDEX IF NOT EXISTS "FundExpense_accountId_idx" ON "FundExpense"("accountId");
        CREATE INDEX IF NOT EXISTS "FundExpense_status_idx" ON "FundExpense"("status");
      `,
    },
    {
      name: 'FundTransaction',
      sql: `
        CREATE TABLE IF NOT EXISTS "FundTransaction" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "transactionType" TEXT NOT NULL,
          "amount" DECIMAL(15,2) NOT NULL,
          "balanceAfter" DECIMAL(15,2) NOT NULL,
          "referenceType" TEXT,
          "referenceId" TEXT,
          "description" TEXT NOT NULL,
          "remarks" TEXT,
          "createdBy" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
          FOREIGN KEY ("accountId") REFERENCES "FundAccount"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "FundTransaction_tenantId_idx" ON "FundTransaction"("tenantId");
        CREATE INDEX IF NOT EXISTS "FundTransaction_accountId_idx" ON "FundTransaction"("accountId");
        CREATE INDEX IF NOT EXISTS "FundTransaction_transactionType_idx" ON "FundTransaction"("transactionType");
      `,
    },
  ],
};
```

File: `packages/database/src/feature-schemas/inventory-management.schema.ts`

```typescript
export const inventoryManagementSchema = {
  tables: [
    {
      name: 'InventoryCategory',
      sql: `
        CREATE TABLE IF NOT EXISTS "InventoryCategory" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "nameLocal" TEXT,
          "description" TEXT,
          "icon" TEXT,
          "parentId" TEXT,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
          FOREIGN KEY ("parentId") REFERENCES "InventoryCategory"("id") ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS "InventoryCategory_tenantId_idx" ON "InventoryCategory"("tenantId");
        CREATE INDEX IF NOT EXISTS "InventoryCategory_parentId_idx" ON "InventoryCategory"("parentId");
      `,
    },
    {
      name: 'InventoryItem',
      sql: `
        CREATE TABLE IF NOT EXISTS "InventoryItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "categoryId" TEXT NOT NULL,
          "itemCode" TEXT NOT NULL UNIQUE,
          "name" TEXT NOT NULL,
          "nameLocal" TEXT,
          "description" TEXT,
          "quantity" INTEGER NOT NULL DEFAULT 0,
          "unit" TEXT NOT NULL DEFAULT 'pcs',
          "minStockLevel" INTEGER NOT NULL DEFAULT 0,
          "maxStockLevel" INTEGER,
          "reorderLevel" INTEGER,
          "unitCost" DECIMAL(12,2),
          "totalValue" DECIMAL(15,2),
          "currency" TEXT NOT NULL DEFAULT 'INR',
          "location" TEXT,
          "warehouseId" TEXT,
          "serialNumbers" TEXT DEFAULT '[]',
          "batchNumber" TEXT,
          "isVehicle" BOOLEAN NOT NULL DEFAULT false,
          "vehicleNumber" TEXT,
          "vehicleType" TEXT,
          "imageUrl" TEXT,
          "images" TEXT DEFAULT '[]',
          "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
          "notes" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
          FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_tenantId_itemCode_key" ON "InventoryItem"("tenantId", "itemCode");
        CREATE INDEX IF NOT EXISTS "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");
        CREATE INDEX IF NOT EXISTS "InventoryItem_categoryId_idx" ON "InventoryItem"("categoryId");
        CREATE INDEX IF NOT EXISTS "InventoryItem_status_idx" ON "InventoryItem"("status");
      `,
    },
    {
      name: 'InventoryMovement',
      sql: `
        CREATE TABLE IF NOT EXISTS "InventoryMovement" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "itemId" TEXT NOT NULL,
          "movementType" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "previousQuantity" INTEGER NOT NULL,
          "newQuantity" INTEGER NOT NULL,
          "referenceType" TEXT,
          "referenceId" TEXT,
          "reason" TEXT,
          "remarks" TEXT,
          "fromLocation" TEXT,
          "toLocation" TEXT,
          "movedBy" TEXT,
          "movedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
          FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_idx" ON "InventoryMovement"("tenantId");
        CREATE INDEX IF NOT EXISTS "InventoryMovement_itemId_idx" ON "InventoryMovement"("itemId");
        CREATE INDEX IF NOT EXISTS "InventoryMovement_movementType_idx" ON "InventoryMovement"("movementType");
      `,
    },
    {
      name: 'InventoryAllocation',
      sql: `
        CREATE TABLE IF NOT EXISTS "InventoryAllocation" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tenantId" TEXT NOT NULL,
          "itemId" TEXT NOT NULL,
          "eventId" TEXT,
          "electionId" TEXT,
          "quantity" INTEGER NOT NULL,
          "allocatedTo" TEXT,
          "allocatedToName" TEXT,
          "purpose" TEXT,
          "allocatedFrom" TIMESTAMP NOT NULL,
          "allocatedUntil" TIMESTAMP,
          "returnedAt" TIMESTAMP,
          "returnedQuantity" INTEGER,
          "status" TEXT NOT NULL DEFAULT 'allocated',
          "condition" TEXT,
          "remarks" TEXT,
          "createdBy" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
          FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "InventoryAllocation_tenantId_idx" ON "InventoryAllocation"("tenantId");
        CREATE INDEX IF NOT EXISTS "InventoryAllocation_itemId_idx" ON "InventoryAllocation"("itemId");
        CREATE INDEX IF NOT EXISTS "InventoryAllocation_status_idx" ON "InventoryAllocation"("status");
      `,
    },
  ],
};
```

#### 2.2 Create Table Creation Utility

File: `services/super-admin-service/src/utils/createFeatureTables.ts`

```typescript
import { Tenant } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { fundManagementSchema } from '@electioncaffe/database/src/feature-schemas/fund-management.schema';
import { inventoryManagementSchema } from '@electioncaffe/database/src/feature-schemas/inventory-management.schema';

const schemaMap: Record<string, any> = {
  fund_management: fundManagementSchema,
  inventory_management: inventoryManagementSchema,
};

export async function createFeatureTables(tenant: Tenant, featureKey: string): Promise<void> {
  const schema = schemaMap[featureKey];

  if (!schema) {
    console.log(`No schema definition found for feature: ${featureKey}`);
    return;
  }

  // Get tenant database connection
  const tenantDbUrl = getTenantDatabaseUrl(tenant);
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: { url: tenantDbUrl },
    },
  });

  try {
    console.log(`Creating tables for feature ${featureKey} in tenant ${tenant.name}`);

    for (const table of schema.tables) {
      console.log(`Creating table: ${table.name}`);

      // Execute raw SQL to create table
      await tenantPrisma.$executeRawUnsafe(table.sql);

      console.log(`✓ Table ${table.name} created successfully`);
    }

    console.log(`✓ All tables for ${featureKey} created successfully`);
  } catch (error) {
    console.error(`Error creating tables for ${featureKey}:`, error);
    throw error;
  } finally {
    await tenantPrisma.$disconnect();
  }
}

function getTenantDatabaseUrl(tenant: Tenant): string {
  switch (tenant.databaseType) {
    case 'SHARED':
      // Use main database
      return process.env.DATABASE_URL!;

    case 'DEDICATED_MANAGED':
      // Construct tenant-specific database URL
      return `postgresql://${tenant.databaseUser}:${tenant.databasePassword}@${tenant.databaseHost}:${tenant.databasePort || 5432}/${tenant.databaseName}`;

    case 'DEDICATED_SELF':
      // Use tenant-provided connection string
      return tenant.databaseConnectionString!;

    default:
      throw new Error(`Unsupported database type: ${tenant.databaseType}`);
  }
}

export async function dropFeatureTables(tenant: Tenant, featureKey: string): Promise<void> {
  const schema = schemaMap[featureKey];

  if (!schema) {
    console.log(`No schema definition found for feature: ${featureKey}`);
    return;
  }

  const tenantDbUrl = getTenantDatabaseUrl(tenant);
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: { url: tenantDbUrl },
    },
  });

  try {
    console.log(`Dropping tables for feature ${featureKey} in tenant ${tenant.name}`);

    // Drop tables in reverse order to handle foreign keys
    for (const table of schema.tables.reverse()) {
      console.log(`Dropping table: ${table.name}`);
      await tenantPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.name}" CASCADE;`);
      console.log(`✓ Table ${table.name} dropped successfully`);
    }

    console.log(`✓ All tables for ${featureKey} dropped successfully`);
  } catch (error) {
    console.error(`Error dropping tables for ${featureKey}:`, error);
    throw error;
  } finally {
    await tenantPrisma.$disconnect();
  }
}
```

### Step 3: API Middleware for Feature Checks

File: `services/auth-service/src/middleware/requireFeature.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@electioncaffe/database';

export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Check if feature is enabled for this tenant
      const tenantFeature = await prisma.tenantFeature.findFirst({
        where: {
          tenantId,
          feature: {
            featureKey,
          },
          isEnabled: true,
        },
        include: {
          feature: true,
        },
      });

      if (!tenantFeature) {
        return res.status(403).json({
          error: 'This feature is not enabled for your organization',
          featureKey,
        });
      }

      // Attach feature info to request for later use
      req.enabledFeature = tenantFeature.feature;
      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      return res.status(500).json({ error: 'Failed to verify feature access' });
    }
  };
};
```

Update routes to use middleware:

File: `services/auth-service/src/index.ts`

```typescript
import { requireFeature } from './middleware/requireFeature.js';

// Apply feature check middleware to fund management routes
app.use('/api/funds', requireFeature('fund_management'), fundManagementRoutes);

// Apply feature check middleware to inventory management routes
app.use('/api/inventory', requireFeature('inventory_management'), inventoryManagementRoutes);
```

### Step 4: Frontend Conditional Rendering

#### 4.1 Create Feature Hook

File: `apps/web/src/hooks/useFeature.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { organizationAPI } from '../services/api';

export function useFeature(featureKey: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => organizationAPI.getMyFeatures(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const features = data?.data?.data?.features || [];
  const feature = features.find((f: any) => f.featureKey === featureKey);
  const isEnabled = feature?.isEnabled || false;

  return { isEnabled, isLoading, feature };
}
```

#### 4.2 Update Navigation to Show/Hide Menu Items

File: `apps/web/src/layouts/DashboardLayout.tsx`

```typescript
import { useFeature } from '../hooks/useFeature';

function DashboardLayout() {
  const { isEnabled: fundEnabled } = useFeature('fund_management');
  const { isEnabled: inventoryEnabled } = useFeature('inventory_management');

  const navItems: NavItem[] = [
    // ... existing items

    // Fund Management (conditionally shown)
    ...(fundEnabled ? [{
      to: '/funds',
      icon: WalletIcon,
      label: 'Fund Management',
      subItems: [
        { to: '/funds/accounts', icon: BanknoteIcon, label: 'Accounts' },
        { to: '/funds/donations', icon: TrendingUpIcon, label: 'Donations' },
        { to: '/funds/expenses', icon: ReceiptIcon, label: 'Expenses' },
        { to: '/funds/transactions', icon: ArrowRightLeftIcon, label: 'Transactions' },
      ],
    }] : []),

    // Inventory Management (conditionally shown)
    ...(inventoryEnabled ? [{
      to: '/inventory',
      icon: PackageIcon,
      label: 'Inventory',
      subItems: [
        { to: '/inventory/items', icon: BoxIcon, label: 'Items' },
        { to: '/inventory/categories', icon: FoldersIcon, label: 'Categories' },
        { to: '/inventory/allocations', icon: ClipboardListIcon, label: 'Allocations' },
      ],
    }] : []),
  ];

  // ... rest of component
}
```

### Step 5: Update Feature Descriptions

File: `packages/database/prisma/seed-core.ts`

Update feature definitions:

```typescript
const featureFlags = [
  // ... existing features

  {
    featureKey: 'fund_management',
    featureName: 'Fund Management',
    description: 'Manage donations, expenses, and financial accounts. Creates dedicated tables in tenant database.',
    category: 'modules',
    isGlobal: true,
    defaultEnabled: false, // Changed to false - must be explicitly enabled
  },
  {
    featureKey: 'inventory_management',
    featureName: 'Inventory Management',
    description: 'Track inventory items, stock movements, and allocations. Creates dedicated tables in tenant database.',
    category: 'modules',
    isGlobal: true,
    defaultEnabled: false, // Changed to false - must be explicitly enabled
  },
];
```

## Workflow

### Enabling a Feature for a Tenant

1. **Super Admin** navigates to Tenant Management
2. Selects a tenant and clicks "Manage Features"
3. Toggles "Fund Management" or "Inventory Management" to ON
4. Backend:
   - Connects to tenant's database
   - Executes CREATE TABLE statements for all feature tables
   - Creates indexes
   - Updates `TenantFeature` record with `isEnabled: true`
5. Tenant users see the new menu items appear in navigation
6. Tenant users can now access fund/inventory features

### Disabling a Feature for a Tenant

1. **Super Admin** toggles feature to OFF
2. Backend:
   - Updates `TenantFeature` record with `isEnabled: false`
   - Optionally: Drops tables (or just hides them)
3. Tenant users no longer see the menu items
4. API requests to feature endpoints return 403 Forbidden

## Testing Checklist

- [ ] Create test tenant with DEDICATED_MANAGED database
- [ ] Enable fund_management feature via Super Admin
- [ ] Verify tables are created in tenant database
- [ ] Test fund management operations (create account, donation, expense)
- [ ] Disable fund_management feature
- [ ] Verify feature is no longer accessible
- [ ] Enable inventory_management feature
- [ ] Verify inventory tables are created
- [ ] Test inventory operations
- [ ] Test with SHARED database tenant
- [ ] Test with DEDICATED_SELF database tenant

## Database Migration Strategy

### For Existing Tenants

If you want to provide these features to existing tenants:

```sql
-- Run this migration to add feature tables to all tenants who have the feature enabled

-- Option 1: Add to all tenants
SELECT id, name, databaseType FROM "Tenant" WHERE "isActive" = true;

-- Option 2: Add only to tenants who have explicitly enabled the feature
SELECT t.id, t.name, t.databaseType
FROM "Tenant" t
INNER JOIN "TenantFeature" tf ON t.id = tf."tenantId"
INNER JOIN "FeatureFlag" ff ON tf."featureId" = ff.id
WHERE ff."featureKey" = 'fund_management'
AND tf."isEnabled" = true;
```

Then run `createFeatureTables()` for each tenant.

## Notes

- Feature tables are tenant-isolated
- Tables are only created when features are enabled
- Middleware ensures API access control
- Frontend conditionally shows/hides features
- Super Admin has full control over tenant features
- No changes to existing application functionality

## Next Steps

1. Implement Super Admin UI for feature management
2. Create table schema definitions
3. Implement dynamic table creation utility
4. Add API middleware for feature checks
5. Update frontend to conditionally render features
6. Test with multiple tenants and database types
7. Document rollback procedures
8. Create tenant migration guide
