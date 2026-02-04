export const fundManagementSchema = {
  featureKey: 'fund_management',
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
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
          "receiptNumber" TEXT,
          "receiptUrl" TEXT,
          "purpose" TEXT,
          "remarks" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "approvedBy" TEXT,
          "approvedAt" TIMESTAMP,
          "donatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "FundDonation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FundAccount"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "FundDonation_tenantId_idx" ON "FundDonation"("tenantId");
        CREATE INDEX IF NOT EXISTS "FundDonation_accountId_idx" ON "FundDonation"("accountId");
        CREATE INDEX IF NOT EXISTS "FundDonation_status_idx" ON "FundDonation"("status");
        CREATE INDEX IF NOT EXISTS "FundDonation_donatedAt_idx" ON "FundDonation"("donatedAt");
        CREATE UNIQUE INDEX IF NOT EXISTS "FundDonation_receiptNumber_key" ON "FundDonation"("receiptNumber") WHERE "receiptNumber" IS NOT NULL;
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
          CONSTRAINT "FundExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FundAccount"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "FundExpense_tenantId_idx" ON "FundExpense"("tenantId");
        CREATE INDEX IF NOT EXISTS "FundExpense_accountId_idx" ON "FundExpense"("accountId");
        CREATE INDEX IF NOT EXISTS "FundExpense_status_idx" ON "FundExpense"("status");
        CREATE INDEX IF NOT EXISTS "FundExpense_expenseCategory_idx" ON "FundExpense"("expenseCategory");
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
          CONSTRAINT "FundTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FundAccount"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "FundTransaction_tenantId_idx" ON "FundTransaction"("tenantId");
        CREATE INDEX IF NOT EXISTS "FundTransaction_accountId_idx" ON "FundTransaction"("accountId");
        CREATE INDEX IF NOT EXISTS "FundTransaction_transactionType_idx" ON "FundTransaction"("transactionType");
        CREATE INDEX IF NOT EXISTS "FundTransaction_createdAt_idx" ON "FundTransaction"("createdAt");
      `,
    },
  ],
};
