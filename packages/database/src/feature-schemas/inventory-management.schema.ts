export const inventoryManagementSchema = {
  featureKey: 'inventory_management',
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
          CONSTRAINT "InventoryCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "InventoryCategory"("id") ON DELETE SET NULL
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
          "itemCode" TEXT NOT NULL,
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
          CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT
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
          CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "InventoryMovement_tenantId_idx" ON "InventoryMovement"("tenantId");
        CREATE INDEX IF NOT EXISTS "InventoryMovement_itemId_idx" ON "InventoryMovement"("itemId");
        CREATE INDEX IF NOT EXISTS "InventoryMovement_movementType_idx" ON "InventoryMovement"("movementType");
        CREATE INDEX IF NOT EXISTS "InventoryMovement_movedAt_idx" ON "InventoryMovement"("movedAt");
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
          CONSTRAINT "InventoryAllocation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "InventoryAllocation_tenantId_idx" ON "InventoryAllocation"("tenantId");
        CREATE INDEX IF NOT EXISTS "InventoryAllocation_itemId_idx" ON "InventoryAllocation"("itemId");
        CREATE INDEX IF NOT EXISTS "InventoryAllocation_eventId_idx" ON "InventoryAllocation"("eventId");
        CREATE INDEX IF NOT EXISTS "InventoryAllocation_status_idx" ON "InventoryAllocation"("status");
      `,
    },
  ],
};
