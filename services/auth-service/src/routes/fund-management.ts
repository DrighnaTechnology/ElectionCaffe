import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';
import { Decimal } from '@prisma/client/runtime/library';

const logger = createLogger('auth-service');
const router = Router();

// ==================== FUND ACCOUNTS ====================

// Get all fund accounts for tenant
router.get('/accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const accounts = await prisma.fundAccount.findMany({
      where: { tenantId: user.tenant.id },
      include: {
        _count: {
          select: {
            donations: true,
            expenses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(successResponse(accounts));
  } catch (error) {
    logger.error({ err: error }, 'Get fund accounts error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create fund account
router.post('/accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { accountName, accountNameLocal, accountType, description, bankName, accountNumber, ifscCode, upiId, initialBalance } = req.body;

    if (!accountName || !accountType) {
      res.status(400).json(errorResponse('E2001', 'Account name and type are required'));
      return;
    }

    const account = await prisma.fundAccount.create({
      data: {
        tenantId: user.tenant.id,
        accountName,
        accountNameLocal,
        accountType,
        description,
        bankName,
        accountNumber,
        ifscCode,
        upiId,
        currentBalance: initialBalance || 0,
      },
    });

    res.status(201).json(successResponse({ account, message: 'Fund account created successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Create fund account error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update fund account
router.put('/accounts/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const account = await prisma.fundAccount.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!account) {
      res.status(404).json(errorResponse('E3001', 'Account not found'));
      return;
    }

    const { accountName, accountNameLocal, description, bankName, accountNumber, ifscCode, upiId, isActive, isDefault } = req.body;

    const updatedAccount = await prisma.fundAccount.update({
      where: { id },
      data: {
        ...(accountName !== undefined && { accountName }),
        ...(accountNameLocal !== undefined && { accountNameLocal }),
        ...(description !== undefined && { description }),
        ...(bankName !== undefined && { bankName }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(ifscCode !== undefined && { ifscCode }),
        ...(upiId !== undefined && { upiId }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.json(successResponse({ account: updatedAccount, message: 'Account updated successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Update fund account error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== DONATIONS ====================

// Get donations
router.get('/donations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { accountId, status, startDate, endDate, page = '1', limit = '20' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenant.id };
    if (accountId) where.accountId = accountId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.donatedAt = {};
      if (startDate) where.donatedAt.gte = new Date(startDate as string);
      if (endDate) where.donatedAt.lte = new Date(endDate as string);
    }

    const [donations, total] = await Promise.all([
      prisma.fundDonation.findMany({
        where,
        include: {
          account: { select: { accountName: true, accountType: true } },
        },
        orderBy: { donatedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.fundDonation.count({ where }),
    ]);

    res.json(successResponse({ donations, total, page: parseInt(page as string), limit: parseInt(limit as string) }));
  } catch (error) {
    logger.error({ err: error }, 'Get donations error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create donation
router.post('/donations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const {
      accountId, amount, donorName, donorPhone, donorEmail, donorAddress,
      donorPanNumber, donationType, donatedAt, paymentMethod, transactionRef,
      purpose, remarks, isAnonymous,
    } = req.body;

    if (!accountId || !amount || !donorName || !donationType) {
      res.status(400).json(errorResponse('E2001', 'Account ID, amount, donor name, and donation type are required'));
      return;
    }

    // Verify account belongs to tenant
    const account = await prisma.fundAccount.findFirst({
      where: { id: accountId, tenantId: user.tenant.id },
    });

    if (!account) {
      res.status(404).json(errorResponse('E3001', 'Account not found'));
      return;
    }

    // Generate receipt number
    const receiptNumber = `DON-${user.tenant.slug.toUpperCase()}-${Date.now()}`;

    const donation = await prisma.fundDonation.create({
      data: {
        tenantId: user.tenant.id,
        accountId,
        amount,
        donorName,
        donorPhone,
        donorEmail,
        donorAddress,
        donorPanNumber,
        donationType,
        donatedAt: donatedAt ? new Date(donatedAt) : new Date(),
        paymentMethod,
        transactionRef,
        receiptNumber,
        purpose,
        remarks,
        isAnonymous: isAnonymous || false,
        status: 'APPROVED',
      },
      include: {
        account: true,
      },
    });

    // Update account balance
    await prisma.fundAccount.update({
      where: { id: accountId },
      data: { currentBalance: { increment: amount } },
    });

    // Create transaction record
    const newBalance = new Decimal(account.currentBalance.toString()).add(amount);
    await prisma.fundTransaction.create({
      data: {
        tenantId: user.tenant.id,
        accountId,
        transactionType: 'DONATION',
        amount,
        balanceAfter: newBalance,
        description: `Donation from ${isAnonymous ? 'Anonymous' : donorName}`,
        referenceType: 'donation',
        referenceId: donation.id,
        createdBy: userId,
      },
    });

    res.status(201).json(successResponse({ donation, message: 'Donation recorded successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Create donation error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== EXPENSES ====================

// Get expenses
router.get('/expenses', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { accountId, expenseCategory, status, startDate, endDate, page = '1', limit = '20' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenant.id };
    if (accountId) where.accountId = accountId;
    if (expenseCategory) where.expenseCategory = expenseCategory;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate as string);
      if (endDate) where.expenseDate.lte = new Date(endDate as string);
    }

    const [expenses, total] = await Promise.all([
      prisma.fundExpense.findMany({
        where,
        include: {
          account: { select: { accountName: true, accountType: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.fundExpense.count({ where }),
    ]);

    res.json(successResponse({ expenses, total, page: parseInt(page as string), limit: parseInt(limit as string) }));
  } catch (error) {
    logger.error({ err: error }, 'Get expenses error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create expense request
router.post('/expenses', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const {
      accountId, amount, expenseCategory, description, vendorName, vendorContact,
      expenseDate, paymentMethod, invoiceNumber, invoiceUrl, attachments, remarks,
    } = req.body;

    if (!accountId || !amount || !expenseCategory || !description) {
      res.status(400).json(errorResponse('E2001', 'Account ID, amount, category, and description are required'));
      return;
    }

    // Verify account belongs to tenant
    const account = await prisma.fundAccount.findFirst({
      where: { id: accountId, tenantId: user.tenant.id },
    });

    if (!account) {
      res.status(404).json(errorResponse('E3001', 'Account not found'));
      return;
    }

    const expense = await prisma.fundExpense.create({
      data: {
        tenantId: user.tenant.id,
        accountId,
        amount,
        expenseCategory,
        description,
        vendorName,
        vendorContact,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethod,
        invoiceNumber,
        invoiceUrl,
        attachments: attachments || [],
        remarks,
        requestedBy: userId,
        status: 'PENDING',
      },
      include: {
        account: true,
      },
    });

    res.status(201).json(successResponse({ expense, message: 'Expense request submitted' }));
  } catch (error) {
    logger.error({ err: error }, 'Create expense error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Approve/Reject expense
router.patch('/expenses/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Only admins can approve expenses'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const expense = await prisma.fundExpense.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: { account: true },
    });

    if (!expense) {
      res.status(404).json(errorResponse('E3001', 'Expense not found'));
      return;
    }

    if (expense.status !== 'PENDING') {
      res.status(400).json(errorResponse('E2009', 'This expense has already been processed'));
      return;
    }

    const { status, rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json(errorResponse('E2001', 'Invalid status'));
      return;
    }

    if (status === 'APPROVED') {
      // Check if account has sufficient balance
      if (new Decimal(expense.account.currentBalance.toString()).lessThan(expense.amount)) {
        res.status(400).json(errorResponse('E2010', 'Insufficient balance in account'));
        return;
      }

      // Update account balance
      await prisma.fundAccount.update({
        where: { id: expense.accountId },
        data: { currentBalance: { decrement: expense.amount } },
      });

      // Create transaction record
      const newBalance = new Decimal(expense.account.currentBalance.toString()).minus(expense.amount);
      await prisma.fundTransaction.create({
        data: {
          tenantId: user.tenant.id,
          accountId: expense.accountId,
          transactionType: 'EXPENSE',
          amount: expense.amount,
          balanceAfter: newBalance,
          description: expense.description,
          referenceType: 'expense',
          referenceId: expense.id,
          createdBy: userId,
        },
      });
    }

    const updatedExpense = await prisma.fundExpense.update({
      where: { id },
      data: {
        status,
        approvedBy: userId,
        approvedAt: new Date(),
        ...(rejectionReason && { rejectionReason }),
      },
      include: {
        account: true,
      },
    });

    res.json(successResponse({ expense: updatedExpense, message: `Expense ${status.toLowerCase()}` }));
  } catch (error) {
    logger.error({ err: error }, 'Update expense status error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== TRANSACTIONS ====================

// Get transaction history
router.get('/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { accountId, transactionType, startDate, endDate, page = '1', limit = '50' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenant.id };
    if (accountId) where.accountId = accountId;
    if (transactionType) where.transactionType = transactionType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      prisma.fundTransaction.findMany({
        where,
        include: {
          account: { select: { accountName: true, accountType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.fundTransaction.count({ where }),
    ]);

    res.json(successResponse({ transactions, total, page: parseInt(page as string), limit: parseInt(limit as string) }));
  } catch (error) {
    logger.error({ err: error }, 'Get transactions error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== FUND SUMMARY ====================

// Get fund summary/dashboard
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantId = user.tenant.id;

    // Get account balances
    const accounts = await prisma.fundAccount.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, accountName: true, accountType: true, currentBalance: true },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum.add(acc.currentBalance), new Decimal(0));

    // Get donation stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const donationStats = await prisma.fundDonation.aggregate({
      where: { tenantId, donatedAt: { gte: thirtyDaysAgo }, status: 'APPROVED' },
      _sum: { amount: true },
      _count: true,
    });

    // Get expense stats (last 30 days)
    const expenseStats = await prisma.fundExpense.aggregate({
      where: { tenantId, expenseDate: { gte: thirtyDaysAgo }, status: 'APPROVED' },
      _sum: { amount: true },
      _count: true,
    });

    // Get pending expenses
    const pendingExpenses = await prisma.fundExpense.count({
      where: { tenantId, status: 'PENDING' },
    });

    // Recent transactions
    const recentTransactions = await prisma.fundTransaction.findMany({
      where: { tenantId },
      include: { account: { select: { accountName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json(successResponse({
      accounts,
      totalBalance,
      donations: {
        last30Days: donationStats._sum.amount || 0,
        count: donationStats._count,
      },
      expenses: {
        last30Days: expenseStats._sum.amount || 0,
        count: expenseStats._count,
        pending: pendingExpenses,
      },
      recentTransactions,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get fund summary error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as fundManagementRoutes };
