import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';
import { Decimal } from '@prisma/client/runtime/library';
import * as XLSX from 'xlsx';

const logger = createLogger('auth-service');
const router = Router();

// ==================== FUND ACCOUNTS ====================

// Get all fund accounts for tenant
router.get('/accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const accounts = await (await getTenantDb(req)).fundAccount.findMany({
      where: { tenantId: user.tenantId },
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

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const { accountName, accountNameLocal, accountType, description, bankName, accountNumber, ifscCode, upiId, initialBalance } = req.body;

    if (!accountName || !accountType) {
      res.status(400).json(errorResponse('E2001', 'Account name and type are required'));
      return;
    }

    const account = await (await getTenantDb(req)).fundAccount.create({
      data: {
        tenantId: user.tenantId,
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

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const account = await (await getTenantDb(req)).fundAccount.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!account) {
      res.status(404).json(errorResponse('E3001', 'Account not found'));
      return;
    }

    const { accountName, accountNameLocal, description, bankName, accountNumber, ifscCode, upiId, isActive, isDefault } = req.body;

    const updatedAccount = await (await getTenantDb(req)).fundAccount.update({
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
    const { accountId, paymentMode, search, startDate, endDate, page = '1', limit = '20' } = req.query;

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenantId };
    if (accountId) where.accountId = accountId;
    if (paymentMode) where.paymentMode = paymentMode;
    if (search) {
      where.OR = [
        { donorName: { contains: search as string, mode: 'insensitive' } },
        { donorContact: { contains: search as string, mode: 'insensitive' } },
        { purpose: { contains: search as string, mode: 'insensitive' } },
        { receiptNo: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.donationDate = {};
      if (startDate) where.donationDate.gte = new Date(startDate as string);
      if (endDate) where.donationDate.lte = new Date(endDate as string);
    }

    const [donations, total] = await Promise.all([
      (await getTenantDb(req)).fundDonation.findMany({
        where,
        include: {
          account: { select: { accountName: true, accountType: true } },
        },
        orderBy: { donationDate: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      (await getTenantDb(req)).fundDonation.count({ where }),
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

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const {
      accountId, amount, donorName, donorPhone, donorEmail, donorAddress,
      donorPanNumber, donationDate, paymentMethod, transactionRef,
      purpose, remarks, isAnonymous,
    } = req.body;

    if (!accountId || !amount || !donorName) {
      res.status(400).json(errorResponse('E2001', 'Account ID, amount, and donor name are required'));
      return;
    }

    // Verify account belongs to tenant
    const account = await (await getTenantDb(req)).fundAccount.findFirst({
      where: { id: accountId, tenantId: user.tenantId },
    });

    if (!account) {
      res.status(404).json(errorResponse('E3001', 'Account not found'));
      return;
    }

    // Generate receipt number
    const receiptNumber = `DON-${user.tenantId.substring(0, 8).toUpperCase()}-${Date.now()}`;

    const donation = await (await getTenantDb(req)).fundDonation.create({
      data: {
        tenantId: user.tenantId,
        accountId,
        amount,
        donorName,
        donorContact: donorPhone || null,
        donorEmail: donorEmail || null,
        donorAddress: donorAddress || null,
        donorPan: donorPanNumber || null,
        donationDate: donationDate ? new Date(donationDate) : new Date(),
        paymentMode: paymentMethod || 'CASH',
        paymentRef: transactionRef || null,
        receiptNo: receiptNumber || null,
        purpose: purpose || null,
        remarks: remarks || null,
        isAnonymous: isAnonymous || false,
      },
      include: {
        account: true,
      },
    });

    // Update account balance
    await (await getTenantDb(req)).fundAccount.update({
      where: { id: accountId },
      data: { currentBalance: { increment: amount } },
    });

    // Create transaction record
    const newBalance = new Decimal(account.currentBalance.toString()).add(amount);
    await (await getTenantDb(req)).fundTransaction.create({
      data: {
        tenantId: user.tenantId,
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

// ==================== BULK DONATIONS ====================

// Download donation XLSX template
router.get('/donations/template', async (_req: Request, res: Response): Promise<void> => {
  const data = [
    {
      donorName: 'Rajesh Kumar', amount: 5000, donorContact: '9876543210',
      donorEmail: 'rajesh@email.com', donorAddress: '123 Main St, Delhi',
      donorPan: 'ABCPK1234A', paymentMode: 'UPI', paymentRef: 'UTR123456',
      donationDate: '2025-06-15', purpose: 'Campaign Support',
      remarks: 'Monthly donation', isAnonymous: 'false',
    },
    {
      donorName: 'Priya Sharma', amount: 10000, donorContact: '9123456789',
      donorEmail: '', donorAddress: '',
      donorPan: '', paymentMode: 'CASH', paymentRef: '',
      donationDate: '2025-06-16', purpose: 'Rally expenses',
      remarks: '', isAnonymous: 'false',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 24 }, { wch: 30 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 20 },
    { wch: 20 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Donations');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=donation_template.xlsx');
  res.send(Buffer.from(buf));
});

// Bulk import donations
router.post('/donations/bulk', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const { accountId, donations } = req.body;

    if (!accountId || !Array.isArray(donations) || donations.length === 0) {
      res.status(400).json(errorResponse('E2001', 'Account ID and non-empty donations array are required'));
      return;
    }

    if (donations.length > 500) {
      res.status(400).json(errorResponse('E2001', 'Maximum 500 donations per batch'));
      return;
    }

    // Verify account belongs to tenant
    const account = await (await getTenantDb(req)).fundAccount.findFirst({
      where: { id: accountId, tenantId: user.tenantId },
    });

    if (!account) {
      res.status(404).json(errorResponse('E3001', 'Account not found'));
      return;
    }

    // Validate each row
    const errors: { row: number; message: string }[] = [];
    const validRows: any[] = [];

    for (let i = 0; i < donations.length; i++) {
      const row = donations[i];
      const rowNum = i + 1;

      if (!row.donorName || !row.donorName.toString().trim()) {
        errors.push({ row: rowNum, message: 'Donor name is required' });
        continue;
      }
      const amount = parseFloat(row.amount);
      if (!amount || isNaN(amount) || amount <= 0) {
        errors.push({ row: rowNum, message: 'Valid amount > 0 is required' });
        continue;
      }

      validRows.push({
        tenantId: user.tenantId,
        accountId,
        donorName: row.donorName.toString().trim(),
        amount,
        donorContact: row.donorContact?.toString().trim() || null,
        donorEmail: row.donorEmail?.toString().trim() || null,
        donorAddress: row.donorAddress?.toString().trim() || null,
        donorPan: row.donorPan?.toString().trim() || null,
        paymentMode: row.paymentMode?.toString().trim() || 'CASH',
        paymentRef: row.paymentRef?.toString().trim() || null,
        donationDate: row.donationDate ? new Date(row.donationDate) : new Date(),
        receiptNo: `DON-${user.tenantId.substring(0, 8).toUpperCase()}-${Date.now()}-${i}`,
        purpose: row.purpose?.toString().trim() || null,
        remarks: row.remarks?.toString().trim() || null,
        isAnonymous: row.isAnonymous === true || row.isAnonymous === 'true',
        createdBy: userId,
      });
    }

    if (validRows.length === 0) {
      res.status(400).json(errorResponse('E2001', 'No valid donations to import', { errors }));
      return;
    }

    // Bulk insert donations
    const created = await (await getTenantDb(req)).fundDonation.createMany({
      data: validRows,
    });

    // Update account balance with total amount
    const totalAmount = validRows.reduce((sum, r) => sum + r.amount, 0);
    await (await getTenantDb(req)).fundAccount.update({
      where: { id: accountId },
      data: { currentBalance: { increment: totalAmount } },
    });

    // Create a single summary transaction record
    const newBalance = new Decimal(account.currentBalance.toString()).add(totalAmount);
    await (await getTenantDb(req)).fundTransaction.create({
      data: {
        tenantId: user.tenantId,
        accountId,
        transactionType: 'DONATION',
        amount: totalAmount,
        balanceAfter: newBalance,
        description: `Bulk import: ${created.count} donations`,
        referenceType: 'bulk_donation',
        referenceId: `bulk-${Date.now()}`,
        createdBy: userId,
      },
    });

    res.status(201).json(successResponse({
      imported: created.count,
      errors,
      totalAmount,
      message: `${created.count} donations imported successfully${errors.length > 0 ? `, ${errors.length} rows skipped` : ''}`,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Bulk import donations error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== EXPENSES ====================

// Get expenses
router.get('/expenses', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { accountId, category, status, search, startDate, endDate, page = '1', limit = '20' } = req.query;

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenantId };
    if (accountId) where.accountId = accountId;
    if (category) where.category = category;
    if (status) where.status = { in: [status as string, (status as string).toLowerCase(), (status as string).toUpperCase()] };
    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { vendorName: { contains: search as string, mode: 'insensitive' } },
        { invoiceNo: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate as string);
      if (endDate) where.expenseDate.lte = new Date(endDate as string);
    }

    const [expenses, total] = await Promise.all([
      (await getTenantDb(req)).fundExpense.findMany({
        where,
        include: {
          account: { select: { accountName: true, accountType: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      (await getTenantDb(req)).fundExpense.count({ where }),
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

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
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
    const account = await (await getTenantDb(req)).fundAccount.findFirst({
      where: { id: accountId, tenantId: user.tenantId },
    });

    if (!account) {
      res.status(404).json(errorResponse('E3001', 'Account not found'));
      return;
    }

    const expense = await (await getTenantDb(req)).fundExpense.create({
      data: {
        tenantId: user.tenantId,
        accountId,
        amount,
        category: expenseCategory || 'GENERAL',
        description,
        vendorName: vendorName || null,
        vendorContact: vendorContact || null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMode: paymentMethod || 'CASH',
        invoiceNo: invoiceNumber || null,
        attachments: attachments || [],
        status: 'pending',
        createdBy: userId,
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

// Download expense XLSX template
router.get('/expenses/template', async (_req: Request, res: Response): Promise<void> => {
  const data = [
    {
      category: 'TRANSPORT', description: 'Vehicle rental for rally', amount: 15000,
      vendorName: 'ABC Transport', vendorContact: '9876543210',
      paymentMode: 'BANK_TRANSFER', paymentRef: 'TXN789',
      expenseDate: '2025-06-15', invoiceNo: 'INV-001',
    },
    {
      category: 'PRINTING', description: 'Pamphlet printing 5000 copies', amount: 8000,
      vendorName: 'Quick Print', vendorContact: '9123456789',
      paymentMode: 'CASH', paymentRef: '',
      expenseDate: '2025-06-16', invoiceNo: 'INV-002',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 16 }, { wch: 36 }, { wch: 10 }, { wch: 20 }, { wch: 14 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=expense_template.xlsx');
  res.send(Buffer.from(buf));
});

// Bulk import expenses
router.post('/expenses/bulk', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const { accountId, expenses } = req.body;

    if (!accountId || !Array.isArray(expenses) || expenses.length === 0) {
      res.status(400).json(errorResponse('E2001', 'Account ID and non-empty expenses array are required'));
      return;
    }

    if (expenses.length > 500) {
      res.status(400).json(errorResponse('E2001', 'Maximum 500 expenses per batch'));
      return;
    }

    // Verify account belongs to tenant
    const account = await (await getTenantDb(req)).fundAccount.findFirst({
      where: { id: accountId, tenantId: user.tenantId },
    });

    if (!account) {
      res.status(404).json(errorResponse('E3001', 'Account not found'));
      return;
    }

    // Validate each row
    const errors: { row: number; message: string }[] = [];
    const validRows: any[] = [];

    for (let i = 0; i < expenses.length; i++) {
      const row = expenses[i];
      const rowNum = i + 1;

      if (!row.description || !row.description.toString().trim()) {
        errors.push({ row: rowNum, message: 'Description is required' });
        continue;
      }
      const amount = parseFloat(row.amount);
      if (!amount || isNaN(amount) || amount <= 0) {
        errors.push({ row: rowNum, message: 'Valid amount > 0 is required' });
        continue;
      }
      if (!row.category || !row.category.toString().trim()) {
        errors.push({ row: rowNum, message: 'Category is required' });
        continue;
      }

      validRows.push({
        tenantId: user.tenantId,
        accountId,
        category: row.category.toString().trim(),
        description: row.description.toString().trim(),
        amount,
        vendorName: row.vendorName?.toString().trim() || null,
        vendorContact: row.vendorContact?.toString().trim() || null,
        paymentMode: row.paymentMode?.toString().trim() || 'CASH',
        paymentRef: row.paymentRef?.toString().trim() || null,
        expenseDate: row.expenseDate ? new Date(row.expenseDate) : new Date(),
        invoiceNo: row.invoiceNo?.toString().trim() || null,
        attachments: [],
        status: 'pending',
        createdBy: userId,
      });
    }

    if (validRows.length === 0) {
      res.status(400).json(errorResponse('E2001', 'No valid expenses to import', { errors }));
      return;
    }

    // Bulk insert expenses (all as pending — need approval)
    const created = await (await getTenantDb(req)).fundExpense.createMany({
      data: validRows,
    });

    res.status(201).json(successResponse({
      imported: created.count,
      errors,
      message: `${created.count} expenses imported (pending approval)${errors.length > 0 ? `, ${errors.length} rows skipped` : ''}`,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Bulk import expenses error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Approve/Reject expense
router.patch('/expenses/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Only admins can approve expenses'));
      return;
    }

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const expense = await (await getTenantDb(req)).fundExpense.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { account: true },
    });

    if (!expense) {
      res.status(404).json(errorResponse('E3001', 'Expense not found'));
      return;
    }

    if (expense.status !== 'pending' && expense.status !== 'PENDING') {
      res.status(400).json(errorResponse('E2009', 'This expense has already been processed'));
      return;
    }

    const { status, rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED', 'approved', 'rejected'].includes(status)) {
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
      await (await getTenantDb(req)).fundAccount.update({
        where: { id: expense.accountId },
        data: { currentBalance: { decrement: expense.amount } },
      });

      // Create transaction record
      const newBalance = new Decimal(expense.account.currentBalance.toString()).minus(expense.amount);
      await (await getTenantDb(req)).fundTransaction.create({
        data: {
          tenantId: user.tenantId,
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

    const updatedExpense = await (await getTenantDb(req)).fundExpense.update({
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

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenantId };
    if (accountId) where.accountId = accountId;
    if (transactionType) where.transactionType = transactionType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      (await getTenantDb(req)).fundTransaction.findMany({
        where,
        include: {
          account: { select: { accountName: true, accountType: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      (await getTenantDb(req)).fundTransaction.count({ where }),
    ]);

    res.json(successResponse({ transactions, total, page: parseInt(page as string), limit: parseInt(limit as string) }));
  } catch (error) {
    logger.error({ err: error }, 'Get transactions error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== OVERVIEW METRICS ====================

// Get overview metrics with period filter (monthly/quarterly/half-yearly/yearly)
router.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { period = 'monthly' } = req.query; // monthly | quarterly | half-yearly | yearly

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const tenantId = user.tenantId;
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'quarterly':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'half-yearly':
        startDate = new Date(now.getFullYear(), now.getMonth() >= 6 ? 6 : 0, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'monthly':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const db = await getTenantDb(req);

    // All queries scoped to tenantId
    const [
      totalDonations,
      periodDonations,
      totalExpensesApproved,
      periodExpensesApproved,
      periodExpensesPending,
      accounts,
      highestDonation,
      topDonors,
      topExpenseCategories,
      donationCount,
      expenseCount,
      monthlyTrend,
    ] = await Promise.all([
      // All-time total donations
      db.fundDonation.aggregate({
        where: { tenantId },
        _sum: { amount: true },
        _count: true,
      }),
      // Period donations
      db.fundDonation.aggregate({
        where: { tenantId, donationDate: { gte: startDate } },
        _sum: { amount: true },
        _count: true,
        _max: { amount: true },
        _avg: { amount: true },
      }),
      // All-time approved expenses
      db.fundExpense.aggregate({
        where: { tenantId, status: { in: ['APPROVED', 'approved'] } },
        _sum: { amount: true },
        _count: true,
      }),
      // Period approved expenses
      db.fundExpense.aggregate({
        where: { tenantId, expenseDate: { gte: startDate }, status: { in: ['APPROVED', 'approved'] } },
        _sum: { amount: true },
        _count: true,
      }),
      // Period pending expenses
      db.fundExpense.aggregate({
        where: { tenantId, expenseDate: { gte: startDate }, status: { in: ['PENDING', 'pending'] } },
        _sum: { amount: true },
        _count: true,
      }),
      // Account balances
      db.fundAccount.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, accountName: true, accountType: true, currentBalance: true, isDefault: true },
      }),
      // Highest single donation in period
      db.fundDonation.findFirst({
        where: { tenantId, donationDate: { gte: startDate } },
        orderBy: { amount: 'desc' },
        select: { donorName: true, amount: true, donationDate: true, isAnonymous: true },
      }),
      // Top 5 donors in period (by total amount)
      db.fundDonation.groupBy({
        by: ['donorName'],
        where: { tenantId, donationDate: { gte: startDate }, isAnonymous: false },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      // Top expense categories in period
      db.fundExpense.groupBy({
        by: ['category'],
        where: { tenantId, expenseDate: { gte: startDate }, status: { in: ['APPROVED', 'approved'] } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      // Donation count in period
      db.fundDonation.count({
        where: { tenantId, donationDate: { gte: startDate } },
      }),
      // Expense count in period
      db.fundExpense.count({
        where: { tenantId, expenseDate: { gte: startDate } },
      }),
      // Monthly donation vs expense trend (last 6 months)
      (async () => {
        const months: { month: string; donations: number; expenses: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
          const label = mStart.toLocaleString('en-US', { month: 'short', year: '2-digit' });

          const [donAgg, expAgg] = await Promise.all([
            db.fundDonation.aggregate({
              where: { tenantId, donationDate: { gte: mStart, lte: mEnd } },
              _sum: { amount: true },
            }),
            db.fundExpense.aggregate({
              where: { tenantId, expenseDate: { gte: mStart, lte: mEnd }, status: { in: ['APPROVED', 'approved'] } },
              _sum: { amount: true },
            }),
          ]);

          months.push({
            month: label,
            donations: parseFloat(donAgg._sum.amount?.toString() || '0'),
            expenses: parseFloat(expAgg._sum.amount?.toString() || '0'),
          });
        }
        return months;
      })(),
    ]);

    const totalBalance = accounts.reduce((sum, acc) => sum.add(acc.currentBalance), new Decimal(0));
    const periodDonationTotal = parseFloat(periodDonations._sum.amount?.toString() || '0');
    const periodExpenseTotal = parseFloat(periodExpensesApproved._sum.amount?.toString() || '0');

    res.json(successResponse({
      period,
      startDate: startDate.toISOString(),

      // Key metrics
      totalBalance: parseFloat(totalBalance.toString()),
      availableBalance: parseFloat(totalBalance.toString()),
      totalDonationsAllTime: parseFloat(totalDonations._sum.amount?.toString() || '0'),
      totalExpensesAllTime: parseFloat(totalExpensesApproved._sum.amount?.toString() || '0'),

      // Period metrics
      periodDonations: periodDonationTotal,
      periodDonationCount: periodDonations._count,
      periodExpenses: periodExpenseTotal,
      periodExpenseCount: periodExpensesApproved._count,
      periodPendingExpenses: parseFloat(periodExpensesPending._sum.amount?.toString() || '0'),
      periodPendingCount: periodExpensesPending._count,

      // Net = donations - expenses in period
      periodNet: periodDonationTotal - periodExpenseTotal,

      // Donation highlights
      highestDonation: highestDonation ? {
        donor: highestDonation.isAnonymous ? 'Anonymous' : highestDonation.donorName,
        amount: parseFloat(highestDonation.amount.toString()),
        date: highestDonation.donationDate,
      } : null,
      averageDonation: parseFloat(periodDonations._avg.amount?.toString() || '0'),

      // Top donors
      topDonors: topDonors.map((d) => ({
        name: d.donorName,
        total: parseFloat(d._sum.amount?.toString() || '0'),
        count: d._count,
      })),

      // Top expense categories
      topExpenseCategories: topExpenseCategories.map((c) => ({
        category: c.category,
        total: parseFloat(c._sum.amount?.toString() || '0'),
        count: c._count,
      })),

      // Accounts
      accounts,

      // 6-month trend
      monthlyTrend,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get overview metrics error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== FUND SUMMARY ====================

// Get fund summary/dashboard
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await (await getTenantDb(req)).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json(errorResponse('E3001', 'User not found'));
      return;
    }

    const tenantId = user.tenantId;

    // Get account balances
    const accounts = await (await getTenantDb(req)).fundAccount.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, accountName: true, accountType: true, currentBalance: true },
    });

    const totalBalance = accounts.reduce((sum, acc) => sum.add(acc.currentBalance), new Decimal(0));

    // Get donation stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const donationStats = await (await getTenantDb(req)).fundDonation.aggregate({
      where: { tenantId, donationDate: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
      _count: true,
    });

    // Get expense stats (last 30 days)
    const expenseStats = await (await getTenantDb(req)).fundExpense.aggregate({
      where: { tenantId, expenseDate: { gte: thirtyDaysAgo }, status: 'APPROVED' },
      _sum: { amount: true },
      _count: true,
    });

    // Get pending expenses
    const pendingExpenses = await (await getTenantDb(req)).fundExpense.count({
      where: { tenantId, status: 'PENDING' },
    });

    // Recent transactions
    const recentTransactions = await (await getTenantDb(req)).fundTransaction.findMany({
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
