import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  paginationSchema,
  successResponse,
  errorResponse,
  createPaginationMeta,
  calculateSkip,
} from '@electioncaffe/shared';

const router = Router();

// Get cadres
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const validation = paginationSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
      return;
    }

    const { page, limit, search, sort, order } = validation.data;
    const skip = calculateSkip(page, limit);

    const where: any = { electionId: electionId as string };

    if (search) {
      where.OR = [
        { designation: { contains: search, mode: 'insensitive' } },
        { cadreType: { contains: search, mode: 'insensitive' } },
        { zone: { contains: search, mode: 'insensitive' } },
        { sector: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { mobile: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [cadres, total] = await Promise.all([
      (tenantDb as any).cadre.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobile: true,
              email: true,
            },
          },
          assignments: {
            where: { isActive: true },
            select: {
              id: true,
              assignmentType: true,
              entityId: true,
              entityType: true,
              startDate: true,
            },
          },
          _count: {
            select: {
              assignments: true,
            },
          },
        },
      }),
      (tenantDb as any).cadre.count({ where }),
    ]);

    res.json(successResponse(cadres, createPaginationMeta(total, page, limit)));
  } catch (error) {
    console.error('Get cadres error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get cadre by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const cadre = await (tenantDb as any).cadre.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { isActive: true },
          select: {
            id: true,
            assignmentType: true,
            entityId: true,
            entityType: true,
            startDate: true,
          },
        },
        user: { select: { id: true, firstName: true, lastName: true, email: true, mobile: true } },
      },
    });

    if (!cadre) {
      res.status(404).json(errorResponse('E3001', 'Cadre not found'));
      return;
    }

    res.json(successResponse(cadre));
  } catch (error) {
    console.error('Get cadre error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create cadre
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const { name, mobile, email, role, address } = req.body;

    if (!name || !mobile) {
      res.status(400).json(errorResponse('E2001', 'Name and mobile are required'));
      return;
    }

    const cadre = await (tenantDb as any).cadre.create({
      data: {
        electionId: electionId as string,
        name,
        mobile,
        email: email || null,
        role: role || 'VOLUNTEER',
        address: address || null,
      },
    });

    res.status(201).json(successResponse(cadre));
  } catch (error: any) {
    console.error('Create cadre error:', error);
    if (error.code === 'P2002') {
      res.status(409).json(errorResponse('E4001', 'Cadre with this mobile already exists for this election'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Bulk create cadres
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const { cadres } = req.body;

    if (!Array.isArray(cadres) || cadres.length === 0) {
      res.status(400).json(errorResponse('E2001', 'Cadres array is required'));
      return;
    }

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const cadreData of cadres) {
      try {
        const { name, mobile, email, role, address } = cadreData;

        if (!name || !mobile) {
          failed++;
          errors.push(`Cadre "${name || 'Unknown'}": Name and mobile are required`);
          continue;
        }

        await (tenantDb as any).cadre.create({
          data: {
            electionId: electionId as string,
            name,
            mobile,
            email: email || null,
            role: role || 'VOLUNTEER',
            address: address || null,
          },
        });
        created++;
      } catch (err: any) {
        failed++;
        if (err.code === 'P2002') {
          errors.push(`Cadre "${cadreData.name}": Mobile number already exists`);
        } else {
          errors.push(`Cadre "${cadreData.name}": ${err.message}`);
        }
      }
    }

    res.status(201).json(successResponse({ created, failed, errors }));
  } catch (error) {
    console.error('Bulk create cadres error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update cadre
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { name, mobile, email, role, address, isActive } = req.body;

    const cadre = await (tenantDb as any).cadre.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(mobile !== undefined && { mobile }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(address !== undefined && { address }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(successResponse(cadre));
  } catch (error: any) {
    console.error('Update cadre error:', error);
    if (error.code === 'P2002') {
      res.status(409).json(errorResponse('E4001', 'Cadre with this mobile already exists'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete cadre
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    await (tenantDb as any).cadre.delete({ where: { id } });
    res.json(successResponse({ message: 'Cadre deleted successfully' }));
  } catch (error) {
    console.error('Delete cadre error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Assign cadre to part
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { cadreId, partId, assignmentType } = req.body;

    const assignment = await (tenantDb as any).cadreAssignment.create({
      data: {
        cadreId,
        partId,
        assignmentType: assignmentType || 'PRIMARY',
      },
    });

    res.status(201).json(successResponse(assignment));
  } catch (error: any) {
    console.error('Assign cadre error:', error);
    if (error.code === 'P2002') {
      res.status(409).json(errorResponse('E4001', 'Cadre is already assigned to this part'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Remove cadre assignment
router.delete('/:cadreId/assignments/:partId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { cadreId, partId } = req.params;

    await (tenantDb as any).cadreAssignment.delete({
      where: {
        cadreId_partId: { cadreId, partId },
      },
    });

    res.json(successResponse({ message: 'Assignment removed successfully' }));
  } catch (error) {
    console.error('Remove assignment error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as cadreRoutes };
