import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  paginationSchema,
  successResponse,
  errorResponse,
  createPaginationMeta,
  calculateSkip,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('voter-service');

const router = Router();

// Get families
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
        { familyName: { contains: search, mode: 'insensitive' } },
        { houseNo: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [families, total] = await Promise.all([
      (tenantDb as any).family.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
        include: {
          voters: {
            select: {
              id: true,
              name: true,
              gender: true,
              age: true,
              mobile: true,
              part: { select: { partNumber: true, boothName: true } },
            },
          },
        },
      }),
      (tenantDb as any).family.count({ where }),
    ]);

    res.json(successResponse(families, createPaginationMeta(total, page, limit)));
  } catch (error) {
    logger.error({ err: error }, 'Get families error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get family by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const family = await (tenantDb as any).family.findUnique({
      where: { id },
      include: {
        voters: {
          include: {
            part: { select: { partNumber: true, boothName: true } },
            religion: { select: { religionName: true } },
            caste: { select: { casteName: true } },
          },
        },
      },
    });

    if (!family) {
      res.status(404).json(errorResponse('E3001', 'Family not found'));
      return;
    }

    res.json(successResponse(family));
  } catch (error) {
    logger.error({ err: error }, 'Get family error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create family
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const { familyName, houseNo, address, captainId, memberIds, latitude, longitude } = req.body;

    const family = await (tenantDb as any).family.create({
      data: {
        electionId: electionId as string,
        familyName,
        houseNo,
        address,
        captainId,
        latitude,
        longitude,
        totalMembers: memberIds?.length || 0,
      },
    });

    // If member IDs provided, assign them to this family
    if (memberIds && memberIds.length > 0) {
      await (tenantDb as any).voter.updateMany({
        where: { id: { in: memberIds } },
        data: { familyId: family.id },
      });

      // Set captain
      if (captainId) {
        await (tenantDb as any).voter.update({
          where: { id: captainId },
          data: { isFamilyCaptain: true },
        });
      }
    }

    res.status(201).json(successResponse(family));
  } catch (error) {
    logger.error({ err: error }, 'Create family error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Bulk create families
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const { families } = req.body;

    if (!Array.isArray(families) || families.length === 0) {
      res.status(400).json(errorResponse('E2001', 'Families array is required'));
      return;
    }

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const familyData of families) {
      try {
        const { familyName, captainId, address, contactNumber, houseNo, latitude, longitude } = familyData;

        await (tenantDb as any).family.create({
          data: {
            electionId: electionId as string,
            familyName,
            captainId: captainId || null,
            address: address || null,
            contactNumber: contactNumber || null,
            houseNo: houseNo || null,
            latitude: latitude || null,
            longitude: longitude || null,
            totalMembers: 0,
          },
        });
        created++;
      } catch (err: any) {
        failed++;
        errors.push(`Family "${familyData.familyName}": ${err.message}`);
      }
    }

    res.status(201).json(successResponse({ created, failed, errors }));
  } catch (error) {
    logger.error({ err: error }, 'Bulk create families error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update family
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { familyName, houseNo, address, captainId, latitude, longitude } = req.body;

    const family = await (tenantDb as any).family.update({
      where: { id },
      data: {
        ...(familyName !== undefined && { familyName }),
        ...(houseNo !== undefined && { houseNo }),
        ...(address !== undefined && { address }),
        ...(captainId !== undefined && { captainId }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
      },
    });

    // Update captain status
    if (captainId) {
      // Remove captain status from all family members
      await (tenantDb as any).voter.updateMany({
        where: { familyId: id },
        data: { isFamilyCaptain: false },
      });

      // Set new captain
      await (tenantDb as any).voter.update({
        where: { id: captainId },
        data: { isFamilyCaptain: true },
      });
    }

    res.json(successResponse(family));
  } catch (error) {
    logger.error({ err: error }, 'Update family error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Add member to family
router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { voterId, isCaptain } = req.body;

    // Update voter's family
    await (tenantDb as any).voter.update({
      where: { id: voterId },
      data: {
        familyId: id,
        isFamilyCaptain: isCaptain || false,
      },
    });

    // Update family member count
    const memberCount = await (tenantDb as any).voter.count({ where: { familyId: id } });
    await (tenantDb as any).family.update({
      where: { id },
      data: { totalMembers: memberCount },
    });

    res.json(successResponse({ message: 'Member added to family' }));
  } catch (error) {
    logger.error({ err: error }, 'Add family member error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Remove member from family
router.delete('/:id/members/:voterId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id, voterId } = req.params;

    await (tenantDb as any).voter.update({
      where: { id: voterId },
      data: {
        familyId: null,
        isFamilyCaptain: false,
      },
    });

    // Update family member count
    const memberCount = await (tenantDb as any).voter.count({ where: { familyId: id } });
    await (tenantDb as any).family.update({
      where: { id },
      data: { totalMembers: memberCount },
    });

    res.json(successResponse({ message: 'Member removed from family' }));
  } catch (error) {
    logger.error({ err: error }, 'Remove family member error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete family
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    // Remove family reference from all voters
    await (tenantDb as any).voter.updateMany({
      where: { familyId: id },
      data: { familyId: null, isFamilyCaptain: false },
    });

    // Delete family
    await (tenantDb as any).family.delete({ where: { id } });

    res.json(successResponse({ message: 'Family deleted successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete family error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get family captains
router.get('/captains/list', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const validation = paginationSchema.safeParse(req.query);
    const { page, limit } = validation.success ? validation.data : { page: 1, limit: 10 };
    const skip = calculateSkip(page, limit);

    const where = {
      electionId: electionId as string,
      isFamilyCaptain: true,
      deletedAt: null,
    };

    const [captains, total] = await Promise.all([
      (tenantDb as any).voter.findMany({
        where,
        skip,
        take: limit,
        include: {
          family: true,
          part: { select: { partNumber: true, boothName: true } },
        },
      }),
      (tenantDb as any).voter.count({ where }),
    ]);

    res.json(successResponse(captains, createPaginationMeta(total, page, limit)));
  } catch (error) {
    logger.error({ err: error }, 'Get family captains error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as familyRoutes };
