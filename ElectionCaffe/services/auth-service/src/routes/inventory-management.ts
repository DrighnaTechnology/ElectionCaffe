import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse } from '@electioncaffe/shared';

const router = Router();

// ==================== CATEGORIES ====================

// Get all inventory categories
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
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

    const categories = await prisma.inventoryCategory.findMany({
      where: { tenantId: user.tenant.id },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { items: true, children: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json(successResponse(categories));
  } catch (error) {
    console.error('Get inventory categories error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create category
router.post('/categories', async (req: Request, res: Response): Promise<void> => {
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

    const { name, nameLocal, parentId, description, icon, sortOrder } = req.body;

    if (!name) {
      res.status(400).json(errorResponse('E2001', 'Category name is required'));
      return;
    }

    const category = await prisma.inventoryCategory.create({
      data: {
        tenantId: user.tenant.id,
        name,
        nameLocal,
        parentId,
        description,
        icon,
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json(successResponse({ category, message: 'Category created successfully' }));
  } catch (error) {
    console.error('Create inventory category error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== INVENTORY ITEMS ====================

// Get all inventory items
router.get('/items', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { categoryId, status, search, page = '1', limit = '20' } = req.query;

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
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { itemCode: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { stockMovements: true, allocations: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json(successResponse({ items, total, page: parseInt(page as string), limit: parseInt(limit as string) }));
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single item
router.get('/items/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: {
        category: true,
        stockMovements: {
          orderBy: { movedAt: 'desc' },
          take: 20,
        },
        allocations: {
          where: { status: { in: ['allocated', 'in_use'] } },
          include: {
            event: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!item) {
      res.status(404).json(errorResponse('E3001', 'Item not found'));
      return;
    }

    res.json(successResponse(item));
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create item
router.post('/items', async (req: Request, res: Response): Promise<void> => {
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
      categoryId, name, nameLocal, itemCode, description, unit, quantity, minStockLevel,
      maxStockLevel, reorderLevel, unitCost, location, warehouseId, imageUrl, images,
      isVehicle, vehicleNumber, vehicleType, notes,
    } = req.body;

    if (!name || !categoryId) {
      res.status(400).json(errorResponse('E2001', 'Item name and category are required'));
      return;
    }

    // Generate item code if not provided
    const code = itemCode || `INV-${user.tenant.slug.toUpperCase()}-${Date.now()}`;

    const item = await prisma.inventoryItem.create({
      data: {
        tenantId: user.tenant.id,
        categoryId,
        name,
        nameLocal,
        itemCode: code,
        description,
        unit: unit || 'pcs',
        quantity: quantity || 0,
        minStockLevel: minStockLevel || 0,
        maxStockLevel,
        reorderLevel,
        unitCost,
        location,
        warehouseId,
        imageUrl,
        images: images || [],
        isVehicle: isVehicle || false,
        vehicleNumber,
        vehicleType,
        notes,
      },
      include: { category: true },
    });

    // Create initial stock movement if initial quantity provided
    if (quantity && quantity > 0) {
      await prisma.inventoryMovement.create({
        data: {
          tenantId: user.tenant.id,
          itemId: item.id,
          movementType: 'in',
          quantity,
          previousQuantity: 0,
          newQuantity: quantity,
          reason: 'Initial stock entry',
          movedBy: userId,
        },
      });
    }

    res.status(201).json(successResponse({ item, message: 'Item created successfully' }));
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update item
router.put('/items/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!item) {
      res.status(404).json(errorResponse('E3001', 'Item not found'));
      return;
    }

    const {
      categoryId, name, nameLocal, description, unit, minStockLevel, maxStockLevel,
      reorderLevel, unitCost, location, warehouseId, imageUrl, images, notes, status,
    } = req.body;

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(name !== undefined && { name }),
        ...(nameLocal !== undefined && { nameLocal }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(minStockLevel !== undefined && { minStockLevel }),
        ...(maxStockLevel !== undefined && { maxStockLevel }),
        ...(reorderLevel !== undefined && { reorderLevel }),
        ...(unitCost !== undefined && { unitCost }),
        ...(location !== undefined && { location }),
        ...(warehouseId !== undefined && { warehouseId }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(images !== undefined && { images }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
      include: { category: true },
    });

    res.json(successResponse({ item: updatedItem, message: 'Item updated successfully' }));
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== STOCK MOVEMENTS ====================

// Add stock (stock in)
router.post('/items/:id/stock-in', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!item) {
      res.status(404).json(errorResponse('E3001', 'Item not found'));
      return;
    }

    const { quantity, reason, referenceType, referenceId, remarks } = req.body;

    if (!quantity || quantity <= 0) {
      res.status(400).json(errorResponse('E2001', 'Valid quantity is required'));
      return;
    }

    const newQuantity = item.quantity + quantity;

    // Update item stock
    await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: newQuantity },
    });

    // Create movement record
    const movement = await prisma.inventoryMovement.create({
      data: {
        tenant: { connect: { id: user.tenant.id } },
        item: { connect: { id } },
        movementType: 'in',
        quantity,
        previousQuantity: item.quantity,
        newQuantity,
        reason: reason || 'Stock replenishment',
        referenceType,
        referenceId,
        remarks,
        movedBy: userId,
      },
    });

    res.status(201).json(successResponse({ movement, message: 'Stock added successfully' }));
  } catch (error) {
    console.error('Stock in error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Remove stock (stock out)
router.post('/items/:id/stock-out', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!item) {
      res.status(404).json(errorResponse('E3001', 'Item not found'));
      return;
    }

    const { quantity, reason, referenceType, referenceId, remarks } = req.body;

    if (!quantity || quantity <= 0) {
      res.status(400).json(errorResponse('E2001', 'Valid quantity is required'));
      return;
    }

    if (item.quantity < quantity) {
      res.status(400).json(errorResponse('E2010', 'Insufficient stock'));
      return;
    }

    const newQuantity = item.quantity - quantity;

    // Update item stock
    await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: newQuantity },
    });

    // Create movement record
    const movement = await prisma.inventoryMovement.create({
      data: {
        tenant: { connect: { id: user.tenant.id } },
        item: { connect: { id } },
        movementType: 'out',
        quantity,
        previousQuantity: item.quantity,
        newQuantity,
        reason: reason || 'Stock issued',
        referenceType,
        referenceId,
        remarks,
        movedBy: userId,
      },
    });

    res.status(201).json(successResponse({ movement, message: 'Stock removed successfully' }));
  } catch (error) {
    console.error('Stock out error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Stock adjustment
router.post('/items/:id/adjust', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Only admins can adjust stock'));
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

    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!item) {
      res.status(404).json(errorResponse('E3001', 'Item not found'));
      return;
    }

    const { newQuantity, reason, remarks } = req.body;

    if (newQuantity === undefined || newQuantity < 0) {
      res.status(400).json(errorResponse('E2001', 'Valid new quantity is required'));
      return;
    }

    const difference = Math.abs(newQuantity - item.quantity);

    // Update item stock
    await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: newQuantity },
    });

    // Create adjustment movement
    const movement = await prisma.inventoryMovement.create({
      data: {
        tenant: { connect: { id: user.tenant.id } },
        item: { connect: { id } },
        movementType: 'adjustment',
        quantity: difference,
        previousQuantity: item.quantity,
        newQuantity,
        reason: reason || 'Stock count adjustment',
        remarks: remarks || `Adjusted from ${item.quantity} to ${newQuantity}`,
        movedBy: userId,
      },
    });

    res.status(201).json(successResponse({ movement, message: 'Stock adjusted successfully' }));
  } catch (error) {
    console.error('Stock adjustment error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== ALLOCATIONS ====================

// Allocate items to event or person
router.post('/allocations', async (req: Request, res: Response): Promise<void> => {
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

    const { itemId, quantity, eventId, electionId, allocatedTo, allocatedToName, purpose, allocatedUntil, remarks } = req.body;

    if (!itemId || !quantity) {
      res.status(400).json(errorResponse('E2001', 'Item ID and quantity are required'));
      return;
    }

    // Verify item
    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, tenantId: user.tenant.id },
    });

    if (!item) {
      res.status(404).json(errorResponse('E3001', 'Item not found'));
      return;
    }

    if (item.quantity < quantity) {
      res.status(400).json(errorResponse('E2010', 'Insufficient stock'));
      return;
    }

    // Create allocation
    const allocation = await prisma.inventoryAllocation.create({
      data: {
        tenantId: user.tenant.id,
        itemId,
        quantity,
        eventId,
        electionId,
        allocatedTo,
        allocatedToName,
        purpose,
        allocatedFrom: new Date(),
        allocatedUntil: allocatedUntil ? new Date(allocatedUntil) : undefined,
        remarks,
        status: 'allocated',
        createdBy: userId,
      },
      include: {
        item: { select: { name: true, itemCode: true } },
        event: { select: { id: true, title: true } },
      },
    });

    // Update stock and create movement
    const newQuantity = item.quantity - quantity;
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
    });

    await prisma.inventoryMovement.create({
      data: {
        tenantId: user.tenant.id,
        itemId,
        movementType: 'out',
        quantity,
        previousQuantity: item.quantity,
        newQuantity,
        reason: `Allocated for ${eventId ? 'event' : 'use'}`,
        referenceType: 'allocation',
        referenceId: allocation.id,
        movedBy: userId,
      },
    });

    res.status(201).json(successResponse({ allocation, message: 'Items allocated successfully' }));
  } catch (error) {
    console.error('Create allocation error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Return allocated items
router.post('/allocations/:id/return', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const allocation = await prisma.inventoryAllocation.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: { item: true },
    });

    if (!allocation) {
      res.status(404).json(errorResponse('E3001', 'Allocation not found'));
      return;
    }

    if (allocation.status === 'returned') {
      res.status(400).json(errorResponse('E2011', 'Items already returned'));
      return;
    }

    const { returnedQuantity, condition, remarks } = req.body;

    const qtyToReturn = returnedQuantity || allocation.quantity;

    // Update allocation
    await prisma.inventoryAllocation.update({
      where: { id },
      data: {
        status: 'returned',
        returnedAt: new Date(),
        returnedQuantity: qtyToReturn,
        condition: condition || 'good',
        remarks: remarks ? `${allocation.remarks || ''}\nReturn notes: ${remarks}` : allocation.remarks,
      },
    });

    // Return stock
    const newQuantity = allocation.item.quantity + qtyToReturn;
    await prisma.inventoryItem.update({
      where: { id: allocation.itemId },
      data: { quantity: newQuantity },
    });

    // Create return movement
    await prisma.inventoryMovement.create({
      data: {
        tenantId: user.tenant.id,
        itemId: allocation.itemId,
        movementType: 'in',
        quantity: qtyToReturn,
        previousQuantity: allocation.item.quantity,
        newQuantity,
        reason: 'Allocation returned',
        referenceType: 'return',
        referenceId: id,
        movedBy: userId,
      },
    });

    res.json(successResponse({ message: 'Items returned successfully' }));
  } catch (error) {
    console.error('Return allocation error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get allocations
router.get('/allocations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { itemId, eventId, status, page = '1', limit = '20' } = req.query;

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
    if (itemId) where.itemId = itemId;
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;

    const [allocations, total] = await Promise.all([
      prisma.inventoryAllocation.findMany({
        where,
        include: {
          item: { select: { id: true, name: true, itemCode: true } },
          event: { select: { id: true, title: true } },
        },
        orderBy: { allocatedFrom: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.inventoryAllocation.count({ where }),
    ]);

    res.json(successResponse({ allocations, total, page: parseInt(page as string), limit: parseInt(limit as string) }));
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== INVENTORY SUMMARY ====================

// Get inventory summary/dashboard
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

    // Total items and value
    const itemStats = await prisma.inventoryItem.aggregate({
      where: { tenantId, status: 'AVAILABLE' },
      _count: true,
      _sum: { quantity: true },
    });

    // Low stock items (where quantity <= minStockLevel)
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        status: 'AVAILABLE',
      },
      select: { id: true, name: true, quantity: true, minStockLevel: true },
      take: 10,
    });

    // Filter low stock items in application
    const lowStock = lowStockItems.filter(item => item.quantity <= item.minStockLevel);

    // Active allocations
    const activeAllocations = await prisma.inventoryAllocation.count({
      where: { tenantId, status: { in: ['allocated', 'in_use'] } },
    });

    // Overdue returns
    const overdueReturns = await prisma.inventoryAllocation.findMany({
      where: {
        tenantId,
        status: { in: ['allocated', 'in_use'] },
        allocatedUntil: { lt: new Date() },
      },
      include: {
        item: { select: { name: true } },
      },
      take: 10,
    });

    // Categories with item counts
    const categoryCounts = await prisma.inventoryCategory.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        _count: { select: { items: true } },
      },
    });

    // Recent movements
    const recentMovements = await prisma.inventoryMovement.findMany({
      where: { tenantId },
      include: {
        item: { select: { name: true } },
      },
      orderBy: { movedAt: 'desc' },
      take: 10,
    });

    res.json(successResponse({
      totalItems: itemStats._count,
      totalStock: itemStats._sum.quantity || 0,
      lowStockItems: lowStock,
      activeAllocations,
      overdueReturns,
      categoryCounts,
      recentMovements,
    }));
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as inventoryManagementRoutes };
