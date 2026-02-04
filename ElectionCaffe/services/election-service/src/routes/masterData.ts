import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createPaginationMeta, calculateSkip, paginationSchema } from '@electioncaffe/shared';

const router = Router();

// ==================== RELIGIONS ====================
router.get('/religions', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const religions = await (tenantDb as any).religion.findMany({
      where: { electionId: electionId as string },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(successResponse(religions));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/religions', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const religion = await (tenantDb as any).religion.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(religion));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/religions/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const religion = await (tenantDb as any).religion.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(religion));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/religions/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).religion.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Religion deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== CASTE CATEGORIES ====================
router.get('/caste-categories', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const categories = await (tenantDb as any).casteCategory.findMany({
      where: { electionId: electionId as string },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(successResponse(categories));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/caste-categories', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const category = await (tenantDb as any).casteCategory.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(category));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/caste-categories/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const category = await (tenantDb as any).casteCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(category));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/caste-categories/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).casteCategory.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Caste category deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== CASTES ====================
router.get('/castes', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, casteCategoryId, religionId } = req.query;
    const where: any = { electionId: electionId as string };
    if (casteCategoryId) where.casteCategoryId = casteCategoryId;
    if (religionId) where.religionId = religionId;

    const castes = await (tenantDb as any).caste.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        casteCategory: { select: { categoryName: true } },
        religion: { select: { religionName: true } },
      },
    });
    res.json(successResponse(castes));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/castes', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const caste = await (tenantDb as any).caste.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(caste));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/castes/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const caste = await (tenantDb as any).caste.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(caste));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/castes/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).caste.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Caste deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== SUB-CASTES ====================
router.get('/sub-castes', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, casteId } = req.query;
    const where: any = { electionId: electionId as string };
    if (casteId) where.casteId = casteId;

    const subCastes = await (tenantDb as any).subCaste.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: { caste: { select: { casteName: true } } },
    });
    res.json(successResponse(subCastes));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/sub-castes', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const subCaste = await (tenantDb as any).subCaste.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(subCaste));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/sub-castes/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const subCaste = await (tenantDb as any).subCaste.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(subCaste));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/sub-castes/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).subCaste.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Sub-caste deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== LANGUAGES ====================
router.get('/languages', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const languages = await (tenantDb as any).language.findMany({
      where: { electionId: electionId as string },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(successResponse(languages));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/languages', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const language = await (tenantDb as any).language.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(language));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/languages/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const language = await (tenantDb as any).language.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(language));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/languages/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).language.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Language deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== PARTIES ====================
router.get('/parties', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const parties = await (tenantDb as any).party.findMany({
      where: electionId ? { electionId: electionId as string } : {},
      orderBy: { displayOrder: 'asc' },
    });
    res.json(successResponse(parties));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/parties', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const party = await (tenantDb as any).party.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(party));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/parties/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const party = await (tenantDb as any).party.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(party));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/parties/:id/set-default', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    // Remove default from all parties
    await (tenantDb as any).party.updateMany({
      where: { electionId: electionId as string },
      data: { isDefault: false },
    });
    // Set this party as default
    const party = await (tenantDb as any).party.update({
      where: { id: req.params.id },
      data: { isDefault: true },
    });
    res.json(successResponse(party));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/parties/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).party.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Party deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== SCHEMES ====================
router.get('/schemes', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const schemes = await (tenantDb as any).scheme.findMany({
      where: { electionId: electionId as string },
      orderBy: { createdAt: 'desc' },
    });
    res.json(successResponse(schemes));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/schemes', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const scheme = await (tenantDb as any).scheme.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(scheme));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/schemes/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const scheme = await (tenantDb as any).scheme.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(scheme));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/schemes/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).scheme.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Scheme deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== VOTER CATEGORIES ====================
router.get('/voter-categories', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const categories = await (tenantDb as any).voterCategory.findMany({
      where: { electionId: electionId as string },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(successResponse(categories));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/voter-categories', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const category = await (tenantDb as any).voterCategory.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(category));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/voter-categories/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const category = await (tenantDb as any).voterCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(category));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/voter-categories/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).voterCategory.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Voter category deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== FEEDBACK ====================
router.get('/feedback', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, status, priority } = req.query;
    const validation = paginationSchema.safeParse(req.query);
    const { page, limit } = validation.success ? validation.data : { page: 1, limit: 10 };
    const skip = calculateSkip(page, limit);

    const where: any = { electionId: electionId as string };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [feedbacks, total] = await Promise.all([
      (tenantDb as any).feedbackIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { part: { select: { partNumber: true, partName: true } } },
      }),
      (tenantDb as any).feedbackIssue.count({ where }),
    ]);

    res.json(successResponse(feedbacks, createPaginationMeta(total, page, limit)));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const feedback = await (tenantDb as any).feedbackIssue.create({
      data: { electionId: electionId as string, ...req.body },
    });
    res.status(201).json(successResponse(feedback));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/feedback/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const feedback = await (tenantDb as any).feedbackIssue.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(successResponse(feedback));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.put('/feedback/:id/status', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { status, resolutionNotes } = req.body;
    const feedback = await (tenantDb as any).feedbackIssue.update({
      where: { id: req.params.id },
      data: {
        status,
        resolutionNotes,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
      },
    });
    res.json(successResponse(feedback));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/feedback/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).feedbackIssue.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Feedback deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as masterDataRoutes };
