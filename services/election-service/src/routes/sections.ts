import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createPaginationMeta, calculateSkip, paginationSchema, createSectionSchema, createLogger } from '@electioncaffe/shared';

const logger = createLogger('election-service');

const router = Router();

// Get sections
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, partId } = req.query;
    const validation = paginationSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
      return;
    }

    const { page, limit, search, sort, order } = validation.data;
    const skip = calculateSkip(page, limit);

    const where: any = {};
    if (electionId) where.electionId = electionId;
    if (partId) where.partId = partId;

    if (search) {
      where.OR = [
        { sectionName: { contains: search, mode: 'insensitive' } },
        { sectionNameLocal: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [sections, total] = await Promise.all([
      (tenantDb as any).section.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort]: order } : { sectionNumber: 'asc' },
        include: {
          part: { select: { id: true, partNumber: true, boothName: true } },
        },
      }),
      (tenantDb as any).section.count({ where }),
    ]);

    res.json(successResponse(sections, createPaginationMeta(total, page, limit)));
  } catch (error) {
    logger.error({ err: error }, 'Get sections error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get section by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const section = await (tenantDb as any).section.findUnique({
      where: { id },
      include: { part: true },
    });

    if (!section) {
      res.status(404).json(errorResponse('E3001', 'Section not found'));
      return;
    }

    res.json(successResponse(section));
  } catch (error) {
    logger.error({ err: error }, 'Get section error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create section
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const validation = createSectionSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
      return;
    }

    const section = await (tenantDb as any).section.create({
      data: {
        electionId: electionId as string,
        ...validation.data,
      },
    });

    res.status(201).json(successResponse(section));
  } catch (error) {
    logger.error({ err: error }, 'Create section error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Bulk create sections
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const { sections } = req.body;

    if (!Array.isArray(sections) || sections.length === 0) {
      res.status(400).json(errorResponse('E2001', 'Sections array is required'));
      return;
    }

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const sectionData of sections) {
      try {
        const { partId, sectionNumber, sectionName, sectionNameLocal, isOverseas } = sectionData;

        await (tenantDb as any).section.create({
          data: {
            electionId: electionId as string,
            partId,
            sectionNumber,
            sectionName,
            sectionNameLocal: sectionNameLocal || null,
            isOverseas: isOverseas || false,
          },
        });
        created++;
      } catch (err: any) {
        failed++;
        errors.push(`Section "${sectionData.sectionName}": ${err.message}`);
      }
    }

    res.status(201).json(successResponse({ created, failed, errors }));
  } catch (error) {
    logger.error({ err: error }, 'Bulk create sections error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update section
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { sectionName, sectionNameLocal, isOverseas } = req.body;

    const section = await (tenantDb as any).section.update({
      where: { id },
      data: {
        ...(sectionName && { sectionName }),
        ...(sectionNameLocal !== undefined && { sectionNameLocal }),
        ...(isOverseas !== undefined && { isOverseas }),
      },
    });

    res.json(successResponse(section));
  } catch (error) {
    logger.error({ err: error }, 'Update section error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete section
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    await (tenantDb as any).section.delete({ where: { id } });
    res.json(successResponse({ message: 'Section deleted successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete section error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as sectionRoutes };
