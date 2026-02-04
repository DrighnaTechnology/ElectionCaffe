# Fund & Inventory Management - Implementation Guide

## Overview
This document provides a complete implementation guide for enabling Fund Management and Inventory Management features for all tenants in the ElectionCaffe platform.

## Current Status

### ✅ Already Completed
1. **Backend APIs** - Fully implemented and functional
   - Fund Management API: `/api/funds/*` (630 lines)
   - Inventory Management API: `/api/inventory/*` (829 lines)

2. **Database Schema** - Complete with all required tables
   - Fund tables: FundAccount, FundDonation, FundExpense, FundTransaction
   - Inventory tables: InventoryCategory, InventoryItem, InventoryMovement, InventoryAllocation

3. **Feature Flags** - Configured in seed data
   - `fund_management`: enabled by default for all tenants
   - `inventory_management`: enabled by default for all tenants

4. **API Service Layer** - Created in frontend
   - File: `apps/web/src/services/api.ts`
   - `fundsAPI` - Complete CRUD operations
   - `inventoryAPI` - Complete CRUD operations

### 🚧 In Progress
5. **Frontend UI Components** - Partially created
   - Fund Management Dashboard page
   - Fund Accounts List component
   - Utility functions for currency formatting

## Implementation Tasks

### Task 1: Complete Fund Management UI Components

Create the following components in `apps/web/src/components/funds/`:

#### 1.1 DonationsList.tsx
```typescript
// Display list of donations with filters
// Features:
- Search by donor name
- Filter by date range, status, account
- Pagination
- View donation details
- Delete donation (admin only)
```

#### 1.2 ExpensesList.tsx
```typescript
// Display list of expenses with approval workflow
// Features:
- Search by vendor, description
- Filter by status (pending/approved/rejected), category
- Approve/Reject expenses (admin only)
- View expense details with attachments
- Status badges
```

#### 1.3 TransactionsList.tsx
```typescript
// Display complete transaction history
// Features:
- Filter by account, transaction type, date range
- Show balance after each transaction
- Color-coded (green for inflow, red for outflow)
- Export functionality
```

#### 1.4 CreateFundAccountDialog.tsx
```typescript
// Dialog form to create new fund account
// Fields:
- accountName (required)
- accountNameLocal (optional)
- accountType (dropdown: main, campaign, constituency, etc.)
- description
- initialBalance
- bankName, accountNumber, ifscCode
- upiId
- isDefault checkbox
```

#### 1.5 CreateDonationDialog.tsx
```typescript
// Dialog form to record donation
// Fields:
- accountId (dropdown from active accounts)
- donorName (required)
- donorEmail, donorPhone
- donorAddress
- donorPanNumber
- isAnonymous checkbox
- donationType (dropdown: INDIVIDUAL, CORPORATE, ANONYMOUS, etc.)
- amount (required)
- paymentMethod (dropdown: cash, upi, bank_transfer, cheque, online)
- transactionRef
- purpose
- remarks
```

#### 1.6 CreateExpenseDialog.tsx
```typescript
// Dialog form to submit expense request
// Fields:
- accountId (dropdown)
- expenseCategory (dropdown: CAMPAIGN_MATERIAL, TRAVEL, VENUE, ADVERTISING, etc.)
- description (required)
- amount (required)
- vendorName
- vendorContact
- invoiceNumber
- invoiceUrl (file upload)
- paymentMethod
- remarks
```

### Task 2: Complete Inventory Management UI Components

Create main page: `apps/web/src/pages/InventoryPage.tsx`

Create components in `apps/web/src/components/inventory/`:

#### 2.1 InventoryDashboard.tsx
```typescript
// Summary dashboard
// Stats:
- Total items count
- Total stock value
- Low stock alerts count
- Active allocations count
- Category distribution chart
- Recent movements table
```

#### 2.2 CategoryList.tsx
```typescript
// Hierarchical category display
// Features:
- Tree view with parent-child relationships
- Create/Edit/Delete categories
- Sort order management
- Icon display
```

#### 2.3 ItemsList.tsx
```typescript
// Inventory items with stock levels
// Features:
- Search by name, item code
- Filter by category, status, low stock
- Display: image, name, code, quantity, unit, value
- Stock level indicators (color-coded)
- Quick stock in/out actions
- Vehicle flag indicator
```

#### 2.4 AllocationsList.tsx
```typescript
// Item allocations tracking
// Features:
- Filter by status, item, event
- Overdue returns highlighted
- Return functionality
- Allocation history
```

#### 2.5 CreateItemDialog.tsx
```typescript
// Dialog form to create inventory item
// Fields:
- categoryId (dropdown)
- itemCode (auto-generated or manual)
- name (required)
- nameLocal
- description
- initialQuantity
- unit (dropdown: pcs, kg, liters, meters, etc.)
- minStockLevel, maxStockLevel, reorderLevel
- unitCost
- location
- isVehicle checkbox
- vehicleNumber (if vehicle)
- vehicleType (if vehicle)
- imageUrl (file upload)
- notes
```

#### 2.6 StockMovementDialog.tsx
```typescript
// Dialog for stock in/out/adjust
// Tabs: Stock In | Stock Out | Adjust
// Fields (per tab):
- quantity (required)
- referenceType, referenceId
- reason/purpose
- remarks
- location (from/to)
```

#### 2.7 CreateAllocationDialog.tsx
```typescript
// Dialog to allocate items
// Fields:
- itemId (dropdown with stock info)
- quantity (validated against available stock)
- allocatedTo (user picker or free text)
- allocatedToName
- eventId (optional, from events)
- purpose
- allocatedFrom (date, default today)
- allocatedUntil (date)
- remarks
```

### Task 3: Add Navigation Menu Items

Edit file: `apps/web/src/layouts/DashboardLayout.tsx`

Add to `navItems` array:

```typescript
{
  to: '/funds',
  icon: WalletIcon, // from lucide-react
  label: 'Fund Management',
  subItems: [
    { to: '/funds/accounts', icon: BanknoteIcon, label: 'Accounts' },
    { to: '/funds/donations', icon: TrendingUpIcon, label: 'Donations' },
    { to: '/funds/expenses', icon: ReceiptIcon, label: 'Expenses' },
    { to: '/funds/transactions', icon: ArrowRightLeftIcon, label: 'Transactions' },
  ],
},
{
  to: '/inventory',
  icon: PackageIcon, // from lucide-react
  label: 'Inventory',
  subItems: [
    { to: '/inventory/items', icon: BoxIcon, label: 'Items' },
    { to: '/inventory/categories', icon: FoldersIcon, label: 'Categories' },
    { to: '/inventory/allocations', icon: ClipboardListIcon, label: 'Allocations' },
    { to: '/inventory/movements', icon: TruckIcon, label: 'Movements' },
  ],
},
```

### Task 4: Add Routes

Edit file: `apps/web/src/App.tsx`

Add import:
```typescript
import FundsPage from './pages/FundsPage';
import InventoryPage from './pages/InventoryPage';
```

Add routes inside `<Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>`:

```typescript
{/* Fund Management Routes */}
<Route path="/funds" element={<FundsPage />} />
<Route path="/funds/accounts" element={<FundsPage />} />
<Route path="/funds/donations" element={<FundsPage />} />
<Route path="/funds/expenses" element={<FundsPage />} />
<Route path="/funds/transactions" element={<FundsPage />} />

{/* Inventory Management Routes */}
<Route path="/inventory" element={<InventoryPage />} />
<Route path="/inventory/items" element={<InventoryPage />} />
<Route path="/inventory/categories" element={<InventoryPage />} />
<Route path="/inventory/allocations" element={<InventoryPage />} />
<Route path="/inventory/movements" element={<InventoryPage />} />
```

### Task 5: Enhanced Backend Capabilities

#### 5.1 Fund Management Enhancements

Add to `services/auth-service/src/routes/fund-management.ts`:

**New Endpoints:**

1. **Fund Transfers Between Accounts**
```typescript
POST /api/funds/transfers
{
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string,
  remarks?: string
}
```

2. **Bulk Donation Import**
```typescript
POST /api/funds/donations/bulk
{
  accountId: string,
  donations: Array<DonationData>
}
```

3. **Expense Reports by Category**
```typescript
GET /api/funds/reports/expenses-by-category
Params: startDate, endDate, format (pdf|excel|csv)
```

4. **Donation Receipts**
```typescript
GET /api/funds/donations/:id/receipt
Response: PDF receipt with tenant branding
```

5. **Budget Tracking**
```typescript
POST /api/funds/budgets
{
  accountId: string,
  category: string,
  amount: number,
  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  startDate: string
}

GET /api/funds/budgets/status
Response: Budget vs actual spend comparison
```

#### 5.2 Inventory Management Enhancements

Add to `services/auth-service/src/routes/inventory-management.ts`:

**New Endpoints:**

1. **Bulk Item Import**
```typescript
POST /api/inventory/items/bulk
{
  categoryId: string,
  items: Array<ItemData>
}
```

2. **Low Stock Alerts**
```typescript
GET /api/inventory/alerts/low-stock
Response: Items below reorder level with recommendations
```

3. **Inventory Valuation Report**
```typescript
GET /api/inventory/reports/valuation
Params: categoryId?, format (pdf|excel)
Response: Total inventory value, category breakdown
```

4. **QR Code Generation for Items**
```typescript
GET /api/inventory/items/:id/qr-code
Response: QR code image for item tracking
```

5. **Allocation Reminders**
```typescript
GET /api/inventory/allocations/due-soon
Params: days (default 7)
Response: Allocations due for return within N days
```

6. **Stock Audit Trail**
```typescript
GET /api/inventory/audit/:itemId
Response: Complete movement history with user details
```

### Task 6: Permission Controls

#### 6.1 Create Permission Middleware

File: `services/auth-service/src/middleware/featurePermission.ts`

```typescript
export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user.tenantId;

    const tenantFeature = await prisma.tenantFeature.findFirst({
      where: {
        tenantId,
        feature: { featureKey },
        isEnabled: true,
      },
    });

    if (!tenantFeature) {
      return res.status(403).json({
        error: 'Feature not enabled for your organization',
      });
    }

    next();
  };
};

export const requireRoleFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const role = req.user.role;

    const roleFeature = await prisma.organizationRoleFeature.findFirst({
      where: {
        role,
        feature: { featureKey },
        isEnabled: true,
      },
    });

    if (!roleFeature) {
      return res.status(403).json({
        error: 'You do not have permission to access this feature',
      });
    }

    next();
  };
};
```

#### 6.2 Apply Permissions to Routes

Update routes to use permission middleware:

```typescript
// Fund Management Routes
router.use('/funds', requireFeature('fund_management'));
router.post('/funds/accounts', requireRoleFeature('fund_management'), allowedRoles(['TENANT_ADMIN']));
router.patch('/funds/expenses/:id/status', requireRoleFeature('fund_management'), allowedRoles(['TENANT_ADMIN', 'CENTRAL_ADMIN']));

// Inventory Management Routes
router.use('/inventory', requireFeature('inventory_management'));
router.post('/inventory/items/:id/adjust', requireRoleFeature('inventory_management'), allowedRoles(['TENANT_ADMIN']));
```

#### 6.3 Frontend Permission Checks

Create hook: `apps/web/src/hooks/useFeatureAccess.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { organizationAPI } from '../services/api';

export function useFeatureAccess(featureKey: string) {
  const { data } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => organizationAPI.getMyFeatures(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const features = data?.data?.data?.features || [];
  const hasAccess = features.some((f: any) => f.featureKey === featureKey && f.isEnabled);

  return { hasAccess, features };
}
```

Usage in components:

```typescript
function FundsPage() {
  const { hasAccess } = useFeatureAccess('fund_management');

  if (!hasAccess) {
    return <div>Feature not available</div>;
  }

  // ... rest of component
}
```

### Task 7: User Documentation

Create file: `docs/FUND_MANAGEMENT_USER_GUIDE.md`

**Contents:**
1. Overview of Fund Management
2. Creating Fund Accounts
3. Recording Donations
4. Managing Expenses
5. Approving Expense Requests
6. Viewing Transaction History
7. Generating Reports
8. Best Practices
9. FAQs

Create file: `docs/INVENTORY_MANAGEMENT_USER_GUIDE.md`

**Contents:**
1. Overview of Inventory Management
2. Setting up Categories
3. Adding Inventory Items
4. Stock In/Out Operations
5. Item Allocations
6. Tracking Returns
7. Low Stock Alerts
8. Reports and Analytics
9. Vehicle Tracking
10. Best Practices
11. FAQs

### Task 8: Testing Checklist

#### Fund Management Tests
- [ ] Create fund account
- [ ] Record donation (all payment methods)
- [ ] Submit expense request
- [ ] Approve expense (check balance deduction)
- [ ] Reject expense (with reason)
- [ ] View transactions
- [ ] Check dashboard summary
- [ ] Test permissions (non-admin cannot approve)
- [ ] Test low balance prevention
- [ ] Generate reports

#### Inventory Management Tests
- [ ] Create categories (with hierarchy)
- [ ] Add inventory items
- [ ] Stock in operation
- [ ] Stock out operation
- [ ] Stock adjustment (admin only)
- [ ] Create allocation
- [ ] Return allocation
- [ ] View low stock alerts
- [ ] Test vehicle tracking
- [ ] Generate valuation report

## Database Migration Steps

### If starting fresh:

```bash
cd packages/database
npx prisma migrate dev --name add_fund_inventory_features
npx prisma generate
npx tsx prisma/seed-core.ts
```

### If database exists:

```bash
# The tables already exist in schema.prisma
# Just ensure migrations are applied
npx prisma migrate deploy
```

## Quick Start Commands

```bash
# Install dependencies (if not already)
yarn install

# Generate Prisma client
cd packages/database
npx prisma generate

# Start auth service (contains fund & inventory APIs)
cd services/auth-service
yarn dev

# Start web app
cd apps/web
yarn dev
```

## API Endpoints Summary

### Fund Management
```
GET    /api/funds/accounts              # List accounts
POST   /api/funds/accounts              # Create account
PUT    /api/funds/accounts/:id          # Update account
DELETE /api/funds/accounts/:id          # Delete account

GET    /api/funds/donations             # List donations
POST   /api/funds/donations             # Record donation
PUT    /api/funds/donations/:id         # Update donation
DELETE /api/funds/donations/:id         # Delete donation

GET    /api/funds/expenses              # List expenses
POST   /api/funds/expenses              # Submit expense
PATCH  /api/funds/expenses/:id/status   # Approve/Reject
PUT    /api/funds/expenses/:id          # Update expense
DELETE /api/funds/expenses/:id          # Delete expense

GET    /api/funds/transactions          # Transaction history
GET    /api/funds/summary               # Dashboard summary
GET    /api/funds/reports               # Generate reports
```

### Inventory Management
```
GET    /api/inventory/categories        # List categories
POST   /api/inventory/categories        # Create category
PUT    /api/inventory/categories/:id    # Update category
DELETE /api/inventory/categories/:id    # Delete category

GET    /api/inventory/items             # List items
GET    /api/inventory/items/:id         # Get item details
POST   /api/inventory/items             # Create item
PUT    /api/inventory/items/:id         # Update item
DELETE /api/inventory/items/:id         # Delete item

POST   /api/inventory/items/:id/stock-in    # Add stock
POST   /api/inventory/items/:id/stock-out   # Remove stock
POST   /api/inventory/items/:id/adjust      # Adjust stock (admin)

GET    /api/inventory/allocations       # List allocations
POST   /api/inventory/allocations       # Create allocation
POST   /api/inventory/allocations/:id/return  # Return items
PUT    /api/inventory/allocations/:id   # Update allocation
DELETE /api/inventory/allocations/:id   # Delete allocation

GET    /api/inventory/movements         # Movement history
GET    /api/inventory/summary           # Dashboard summary
GET    /api/inventory/reports           # Generate reports
```

## File Structure

```
ElectionCaffe/
├── services/
│   └── auth-service/
│       └── src/
│           ├── routes/
│           │   ├── fund-management.ts          # Fund APIs (630 lines)
│           │   └── inventory-management.ts     # Inventory APIs (829 lines)
│           └── middleware/
│               └── featurePermission.ts        # Permission checks
│
├── apps/
│   └── web/
│       └── src/
│           ├── pages/
│           │   ├── FundsPage.tsx              # Main fund management page
│           │   └── InventoryPage.tsx          # Main inventory page
│           ├── components/
│           │   ├── funds/
│           │   │   ├── FundAccountsList.tsx
│           │   │   ├── DonationsList.tsx
│           │   │   ├── ExpensesList.tsx
│           │   │   ├── TransactionsList.tsx
│           │   │   ├── CreateFundAccountDialog.tsx
│           │   │   ├── CreateDonationDialog.tsx
│           │   │   └── CreateExpenseDialog.tsx
│           │   └── inventory/
│           │       ├── InventoryDashboard.tsx
│           │       ├── CategoryList.tsx
│           │       ├── ItemsList.tsx
│           │       ├── AllocationsList.tsx
│           │       ├── CreateItemDialog.tsx
│           │       ├── StockMovementDialog.tsx
│           │       └── CreateAllocationDialog.tsx
│           ├── services/
│           │   └── api.ts                     # API client with fundsAPI & inventoryAPI
│           ├── hooks/
│           │   └── useFeatureAccess.ts        # Permission check hook
│           ├── layouts/
│           │   └── DashboardLayout.tsx        # Navigation (add menu items)
│           ├── lib/
│           │   └── utils.ts                   # Utility functions
│           └── App.tsx                        # Routes (add fund/inventory routes)
│
├── packages/
│   └── database/
│       └── prisma/
│           ├── schema.prisma                  # Database schema (lines 3330-3669)
│           └── seed-core.ts                   # Feature flags (lines 156-157)
│
└── docs/
    ├── FUND_MANAGEMENT_USER_GUIDE.md         # User guide for fund management
    └── INVENTORY_MANAGEMENT_USER_GUIDE.md    # User guide for inventory
```

## Next Steps

1. **Complete remaining UI components** (see Task 1 & 2)
2. **Add navigation menu items** (see Task 3)
3. **Configure routes** (see Task 4)
4. **Implement enhanced backend features** (see Task 5)
5. **Apply permission controls** (see Task 6)
6. **Create user documentation** (see Task 7)
7. **Run comprehensive tests** (see Task 8)

## Notes

- All backend APIs are already functional
- Database schema is complete
- Features are enabled by default for all tenants
- Permission system uses role-based and feature-based access control
- Frontend uses React Query for data fetching
- UI built with Radix UI + Tailwind CSS
- Currency formatted for INR (Indian Rupees)

## Support

For issues or questions:
- Check the API documentation in the route files
- Review the database schema in `schema.prisma`
- Test API endpoints using Postman or curl
- Check browser console for frontend errors
