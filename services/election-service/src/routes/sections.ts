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

    const results = {
      total: sections.length,
      created: 0,
      failed: 0,
      errors: [] as Array<{ row: number; field?: string; error: string }>,
    };

    for (const [index, sectionData] of sections.entries()) {
      try {
        // Validate with Zod schema
        const validation = createSectionSchema.safeParse(sectionData);

        if (!validation.success) {
          results.failed++;
          results.errors.push({
            row: index + 1,
            field: validation.error.errors[0]?.path.join('.'),
            error: validation.error.errors[0]?.message || 'Validation failed',
          });
          continue;
        }

        await (tenantDb as any).section.create({
          data: {
            electionId: electionId as string,
            ...validation.data,
          },
        });
        results.created++;
      } catch (err: any) {
        results.failed++;
        // Handle unique constraint violations
        const errorMsg = err.code === 'P2002'
          ? `Duplicate section number ${sectionData.sectionNumber} in this election`
          : err.message;
        results.errors.push({
          row: index + 1,
          field: err.code === 'P2002' ? 'sectionNumber' : undefined,
          error: errorMsg,
        });
      }
    }

    // Update election section count
    if (results.created > 0) {
      try {
        const totalSections = await (tenantDb as any).section.count({
          where: { electionId: electionId as string },
        });
        await (tenantDb as any).election.update({
          where: { id: electionId as string },
          data: { totalSections },
        });
      } catch (statsErr) {
        logger.warn({ err: statsErr }, 'Failed to update election section count (non-critical)');
      }
    }

    res.status(201).json(successResponse(results));
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
