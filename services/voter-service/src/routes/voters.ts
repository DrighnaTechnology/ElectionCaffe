import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  createVoterSchema,
  updateVoterSchema,
  paginationSchema,
  successResponse,
  errorResponse,
  createPaginationMeta,
  calculateSkip,
  toCSV,
  createLogger,
} from '@electioncaffe/shared';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const logger = createLogger('voter-service');

const router = Router();

// Map gender values from UI (M/F/O) to Prisma enum (MALE/FEMALE/OTHER)
const mapGenderToEnum = (gender: string | undefined): string | undefined => {
  if (!gender) return undefined;
  const genderMap: Record<string, string> = {
    'M': 'MALE',
    'F': 'FEMALE',
    'O': 'OTHER',
    'MALE': 'MALE',
    'FEMALE': 'FEMALE',
    'OTHER': 'OTHER',
  };
  return genderMap[gender.toUpperCase()] || gender;
};

// Get voters with pagination and filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, partId, sectionId, boothId, familyId, gender, politicalLeaning } = req.query;
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
    if (sectionId) where.sectionId = sectionId;
    if (boothId) where.boothId = boothId;
    if (familyId) where.familyId = familyId;
    if (gender) where.gender = mapGenderToEnum(gender as string);
    if (politicalLeaning) where.politicalLeaning = politicalLeaning;

    // Exclude soft-deleted voters
    where.deletedAt = null;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameLocal: { contains: search, mode: 'insensitive' } },
        { epicNumber: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [voters, total] = await Promise.all([
      (tenantDb as any).voter.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort]: order } : { slNumber: 'asc' },
        include: {
          part: { select: { partNumber: true, boothName: true } },
          religion: { select: { id: true, religionName: true } },
          caste: { select: { id: true, casteName: true } },
          casteCategory: { select: { id: true, categoryName: true } },
          language: { select: { id: true, languageName: true } },
          family: { select: { id: true, familyName: true, totalMembers: true } },
        },
      }),
      (tenantDb as any).voter.count({ where }),
    ]);

    res.json(successResponse(voters, createPaginationMeta(total, page, limit)));
  } catch (error) {
    logger.error({ err: error }, 'Get voters error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Export voters as CSV
router.get('/export', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, partId, gender } = req.query;

    const where: any = { deletedAt: null };
    if (electionId) where.electionId = electionId;
    if (partId) where.partId = partId;
    if (gender) where.gender = mapGenderToEnum(gender as string);

    const voters = await (tenantDb as any).voter.findMany({
      where,
      select: {
        slNumber: true,
        name: true,
        nameLocal: true,
        epicNumber: true,
        gender: true,
        age: true,
        mobile: true,
        address: true,
        politicalLeaning: true,
        part: { select: { partNumber: true, boothName: true } },
        religion: { select: { religionName: true } },
        caste: { select: { casteName: true } },
        casteCategory: { select: { categoryName: true } },
      },
      orderBy: { slNumber: 'asc' },
      take: 50000,
    });

    const data = voters.map((v: any) => ({
      slNumber: v.slNumber,
      name: v.name,
      nameLocal: v.nameLocal,
      epicNumber: v.epicNumber,
      gender: v.gender,
      age: v.age,
      mobile: v.mobile,
      address: v.address,
      partNumber: v.part?.partNumber,
      boothName: v.part?.boothName,
      religion: v.religion?.religionName,
      caste: v.caste?.casteName,
      category: v.casteCategory?.categoryName,
      politicalLeaning: v.politicalLeaning,
    }));

    const csv = toCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=voters_export.csv');
    res.send(csv);
  } catch (error) {
    logger.error({ err: error }, 'Export voters error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Download CSV import template
router.get('/template', async (_req: Request, res: Response) => {
  const headers = [
    'name', 'nameLocal', 'epicNumber', 'gender', 'age', 'mobile',
    'address', 'slNumber', 'relationType', 'relativeName',
    'houseNo', 'latitude', 'longitude',
  ];
  const csv = headers.join(',') + '\n' + 'John Doe,,ABC1234567,MALE,35,9876543210,123 Main St,1,FATHER,Father Name,101,,\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=voter_import_template.csv');
  res.send(csv);
});

// Import voters from CSV
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;

    if (!electionId) {
      res.status(400).json(errorResponse('E2001', 'electionId query parameter is required'));
      return;
    }

    if (!req.file) {
      res.status(400).json(errorResponse('E2001', 'CSV file is required'));
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim());

    if (lines.length < 2) {
      res.status(400).json(errorResponse('E2001', 'CSV file must have a header row and at least one data row'));
      return;
    }

    const headers = lines[0]!.split(',').map(h => h.trim());
    const results = { total: lines.length - 1, created: 0, failed: 0, errors: [] as any[] };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i]!.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, idx) => {
          if (values[idx] && values[idx] !== '') {
            row[h] = values[idx];
          }
        });

        // Map gender
        if (row.gender) {
          row.gender = mapGenderToEnum(row.gender);
        }

        // Convert numeric fields
        if (row.age) row.age = parseInt(row.age, 10);
        if (row.slNumber) row.slNumber = parseInt(row.slNumber, 10);
        if (row.latitude) row.latitude = parseFloat(row.latitude);
        if (row.longitude) row.longitude = parseFloat(row.longitude);

        await (tenantDb as any).voter.create({
          data: {
            electionId: electionId as string,
            ...row,
          },
        });

        results.created++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message,
        });
      }
    }

    // Update election voter count
    await updateElectionVoterCount(tenantDb, electionId as string);

    res.json(successResponse(results));
  } catch (error) {
    logger.error({ err: error }, 'Import voters error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get voter by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const voter = await (tenantDb as any).voter.findUnique({
      where: { id },
      include: {
        part: true,
        section: true,
        booth: true,
        family: { include: { voters: { select: { id: true, name: true, gender: true, age: true } } } },
        religion: true,
        casteCategory: true,
        caste: true,
        subCaste: true,
        language: true,
        votingHistories: { include: { history: true } },
        surveyResponses: { include: { survey: true } },
      },
    });

    if (!voter) {
      res.status(404).json(errorResponse('E3001', 'Voter not found'));
      return;
    }

    res.json(successResponse(voter));
  } catch (error) {
    logger.error({ err: error }, 'Get voter error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create voter
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const validation = createVoterSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
      return;
    }

    const voter = await (tenantDb as any).voter.create({
      data: {
        electionId: electionId as string,
        ...validation.data,
      },
    });

    // Update election voter count
    await updateElectionVoterCount(tenantDb, electionId as string);

    res.status(201).json(successResponse(voter));
  } catch (error) {
    logger.error({ err: error }, 'Create voter error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Bulk create voters
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const { voters: votersData } = req.body;

    if (!Array.isArray(votersData)) {
      res.status(400).json(errorResponse('E2003', 'Voters array is required'));
      return;
    }

    const results = {
      total: votersData.length,
      created: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const [index, voterData] of votersData.entries()) {
      try {
        const validation = createVoterSchema.safeParse(voterData);

        if (!validation.success) {
          results.failed++;
          results.errors.push({
            row: index + 1,
            field: validation.error.errors[0]?.path.join('.'),
            error: validation.error.errors[0]?.message,
          });
          continue;
        }

        await (tenantDb as any).voter.create({
          data: {
            electionId: electionId as string,
            ...validation.data,
          },
        });

        results.created++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: index + 1,
          error: error.message,
        });
      }
    }

    // Update election voter count
    await updateElectionVoterCount(tenantDb, electionId as string);

    res.json(successResponse(results));
  } catch (error) {
    logger.error({ err: error }, 'Bulk create voters error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update voter
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const existingVoter = await (tenantDb as any).voter.findUnique({ where: { id } });
    if (!existingVoter) {
      res.status(404).json(errorResponse('E3001', 'Voter not found'));
      return;
    }

    const validation = updateVoterSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
      return;
    }

    const voter = await (tenantDb as any).voter.update({
      where: { id },
      data: validation.data,
    });

    res.json(successResponse(voter));
  } catch (error) {
    logger.error({ err: error }, 'Update voter error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete voter (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const voter = await (tenantDb as any).voter.findUnique({ where: { id } });
    if (!voter) {
      res.status(404).json(errorResponse('E3001', 'Voter not found'));
      return;
    }

    await (tenantDb as any).voter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Update election voter count
    await updateElectionVoterCount(tenantDb, voter.electionId);

    res.json(successResponse({ message: 'Voter deleted successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete voter error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get voter schemes
router.get('/:id/schemes', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const schemes = await (tenantDb as any).voterScheme.findMany({
      where: { voterId: id },
      include: { scheme: true },
    });

    res.json(successResponse(schemes));
  } catch (error) {
    logger.error({ err: error }, 'Get voter schemes error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Add scheme to voter
router.post('/:id/schemes', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { schemeId, enrollmentDate, notes } = req.body;

    if (!schemeId) {
      res.status(400).json(errorResponse('E2001', 'schemeId is required'));
      return;
    }

    const voterScheme = await (tenantDb as any).$transaction(async (tx: any) => {
      const created = await tx.voterScheme.create({
        data: {
          voterId: id,
          schemeId,
          enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
          notes,
        },
        include: { scheme: true },
      });

      await tx.scheme.update({
        where: { id: schemeId },
        data: { beneficiaryCount: { increment: 1 } },
      });

      return created;
    });

    res.status(201).json(successResponse(voterScheme));
  } catch (error) {
    logger.error({ err: error }, 'Add voter scheme error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Remove scheme from voter
router.delete('/:id/schemes/:schemeId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id, schemeId } = req.params;

    await (tenantDb as any).$transaction(async (tx: any) => {
      await tx.voterScheme.delete({
        where: {
          voterId_schemeId: { voterId: id, schemeId },
        },
      });

      await tx.scheme.update({
        where: { id: schemeId },
        data: { beneficiaryCount: { decrement: 1 } },
      });
    });

    res.json(successResponse({ message: 'Scheme removed from voter' }));
  } catch (error) {
    logger.error({ err: error }, 'Remove voter scheme error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get voters for map
router.get('/map/locations', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, partId } = req.query;

    const where: any = {
      deletedAt: null,
      latitude: { not: null },
      longitude: { not: null },
    };
    if (electionId) where.electionId = electionId;
    if (partId) where.partId = partId;

    const voters = await (tenantDb as any).voter.findMany({
      where,
      select: {
        id: true,
        name: true,
        epicNumber: true,
        latitude: true,
        longitude: true,
        gender: true,
        partyId: true,
        politicalLeaning: true,
        part: { select: { partNumber: true, boothName: true } },
      },
      take: 1000, // Limit for performance
    });

    res.json(successResponse(voters));
  } catch (error) {
    logger.error({ err: error }, 'Get voters for map error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Helper function to update election voter count
async function updateElectionVoterCount(tenantDb: any, electionId: string): Promise<void> {
  const [total, male, female, other] = await Promise.all([
    tenantDb.voter.count({ where: { electionId, deletedAt: null } }),
    tenantDb.voter.count({ where: { electionId, deletedAt: null, gender: 'MALE' } }),
    tenantDb.voter.count({ where: { electionId, deletedAt: null, gender: 'FEMALE' } }),
    tenantDb.voter.count({ where: { electionId, deletedAt: null, gender: 'OTHER' } }),
  ]);

  await tenantDb.election.update({
    where: { id: electionId },
    data: {
      totalVoters: total,
      totalMaleVoters: male,
      totalFemaleVoters: female,
      totalOtherVoters: other,
    },
  });
}

export { router as voterRoutes };
