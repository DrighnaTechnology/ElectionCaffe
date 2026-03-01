import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, calculatePercentage, createLogger } from '@electioncaffe/shared';

const logger = createLogger('analytics-service');
const router = Router();

// ============ OVERVIEW ============
// Frontend expects: { totalVoters, totalParts, dataCoverage, averageAge }
router.get('/overview/:electionId', async (req: Request, res: Response) => {
  try {
    const db = await getTenantDb(req) as any;
    const electionId = req.params.electionId;

    const [totalVoters, totalParts, avgAge, withMobile, withAge, withAddress] = await Promise.all([
      db.voter.count({ where: { electionId, deletedAt: null } }),
      db.part.count({ where: { electionId } }),
      db.voter.aggregate({ where: { electionId, deletedAt: null, age: { not: null } }, _avg: { age: true } }),
      db.voter.count({ where: { electionId, deletedAt: null, mobile: { not: null } } }),
      db.voter.count({ where: { electionId, deletedAt: null, age: { not: null } } }),
      db.voter.count({ where: { electionId, deletedAt: null, address: { not: null } } }),
    ]);

    const dataCoverage = totalVoters === 0 ? 0 :
      Math.round(((calculatePercentage(withMobile, totalVoters) + calculatePercentage(withAge, totalVoters) + calculatePercentage(withAddress, totalVoters)) / 3) * 10) / 10;

    res.json(successResponse({
      totalVoters,
      totalParts,
      dataCoverage,
      averageAge: Math.round(avgAge._avg.age || 0),
    }));
  } catch (error: any) {
    logger.error({ err: error }, 'Overview error');
    res.status(500).json(errorResponse('E5001', error?.message || 'Internal server error'));
  }
});

// ============ VOTERS (Demographics tab) ============
// Frontend expects: { genderDistribution: {MALE:n, FEMALE:n}, casteDistribution: [{category, count}], boothDistribution: [{partNumber, voters}] }
router.get('/voters/:electionId', async (req: Request, res: Response) => {
  try {
    const db = await getTenantDb(req) as any;
    const electionId = req.params.electionId;

    // Gender distribution - groupBy returns _count as number with tenant client
    const byGender = await db.voter.groupBy({
      by: ['gender'],
      where: { electionId, deletedAt: null },
      _count: true,
    });
    const genderDistribution: Record<string, number> = {};
    byGender.forEach((g: any) => {
      const count = typeof g._count === 'object' ? (g._count._all ?? 0) : g._count;
      genderDistribution[g.gender] = count;
    });

    // Caste category distribution
    const casteCats = await db.voter.groupBy({
      by: ['casteCategoryId'],
      where: { electionId, deletedAt: null, casteCategoryId: { not: null } },
      _count: { id: true },
    });
    const casteCatIds = casteCats.map((c: any) => c.casteCategoryId).filter(Boolean);
    const casteCatNames = casteCatIds.length > 0
      ? await db.casteCategory.findMany({ where: { id: { in: casteCatIds } }, select: { id: true, categoryName: true } })
      : [];
    const catNameMap = Object.fromEntries(casteCatNames.map((c: any) => [c.id, c.categoryName]));
    const casteDistribution = casteCats.map((c: any) => ({
      category: catNameMap[c.casteCategoryId] || 'Unknown',
      count: c._count.id,
    }));

    // Booth (part) distribution
    const parts = await db.part.findMany({
      where: { electionId },
      select: { partNumber: true, totalVoters: true },
      orderBy: { partNumber: 'asc' },
    });
    const boothDistribution = parts.map((p: any) => ({
      partNumber: p.partNumber,
      voters: p.totalVoters || 0,
    }));

    res.json(successResponse({ genderDistribution, casteDistribution, boothDistribution }));
  } catch (error: any) {
    logger.error({ err: error }, 'Voters error');
    res.status(500).json(errorResponse('E5001', error?.message || 'Internal server error'));
  }
});

// ============ AGE GROUPS ============
// Frontend expects: [{ ageGroup, count }]
router.get('/age-groups/:electionId', async (req: Request, res: Response) => {
  try {
    const db = await getTenantDb(req) as any;
    const electionId = req.params.electionId;

    const voters = await db.voter.findMany({
      where: { electionId, deletedAt: null, age: { not: null } },
      select: { age: true },
    });

    const groups: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56-65': 0, '65+': 0 };
    voters.forEach((v: any) => {
      const age = v.age as number;
      if (age <= 25) groups['18-25'] = (groups['18-25'] || 0) + 1;
      else if (age <= 35) groups['26-35'] = (groups['26-35'] || 0) + 1;
      else if (age <= 45) groups['36-45'] = (groups['36-45'] || 0) + 1;
      else if (age <= 55) groups['46-55'] = (groups['46-55'] || 0) + 1;
      else if (age <= 65) groups['56-65'] = (groups['56-65'] || 0) + 1;
      else groups['65+'] = (groups['65+'] || 0) + 1;
    });

    const result = Object.entries(groups).map(([ageGroup, count]) => ({ ageGroup, count }));
    res.json(successResponse(result));
  } catch (error: any) {
    logger.error({ err: error }, 'Age groups error');
    res.status(500).json(errorResponse('E5001', error?.message || 'Internal server error'));
  }
});

// ============ POLITICAL LEANING ============
// Frontend expects: [{ leaning, count }]
router.get('/political-leaning/:electionId', async (req: Request, res: Response) => {
  try {
    const db = await getTenantDb(req) as any;
    const electionId = req.params.electionId;

    const stats = await db.voter.groupBy({
      by: ['politicalLeaning'],
      where: { electionId, deletedAt: null },
      _count: { id: true },
    });

    const result = stats.map((s: any) => ({
      leaning: s.politicalLeaning,
      count: s._count.id,
    }));

    res.json(successResponse(result));
  } catch (error: any) {
    logger.error({ err: error }, 'Political leaning error');
    res.status(500).json(errorResponse('E5001', error?.message || 'Internal server error'));
  }
});

// ============ DATA QUALITY ============
// Frontend expects: { mobilePercent, agePercent, castePercent, religionPercent, voterIdPercent, overallPercent }
router.get('/data-quality/:electionId', async (req: Request, res: Response) => {
  try {
    const db = await getTenantDb(req) as any;
    const electionId = req.params.electionId;

    const [totalVoters, withMobile, withDOB, withCaste, withReligion, withEpic] = await Promise.all([
      db.voter.count({ where: { electionId, deletedAt: null } }),
      db.voter.count({ where: { electionId, deletedAt: null, mobile: { not: null } } }),
      db.voter.count({ where: { electionId, deletedAt: null, dateOfBirth: { not: null } } }),
      db.voter.count({ where: { electionId, deletedAt: null, casteId: { not: null } } }),
      db.voter.count({ where: { electionId, deletedAt: null, religionId: { not: null } } }),
      db.voter.count({ where: { electionId, deletedAt: null, epicNumber: { not: null } } }),
    ]);

    const mobilePercent = calculatePercentage(withMobile, totalVoters);
    const agePercent = calculatePercentage(withDOB, totalVoters);
    const castePercent = calculatePercentage(withCaste, totalVoters);
    const religionPercent = calculatePercentage(withReligion, totalVoters);
    const voterIdPercent = calculatePercentage(withEpic, totalVoters);
    const overallPercent = Math.round(((mobilePercent + agePercent + castePercent + religionPercent + voterIdPercent) / 5) * 10) / 10;

    res.json(successResponse({ mobilePercent, agePercent, castePercent, religionPercent, voterIdPercent, overallPercent }));
  } catch (error: any) {
    logger.error({ err: error }, 'Data quality error');
    res.status(500).json(errorResponse('E5001', error?.message || 'Internal server error'));
  }
});

// ============ BOOTH DISTRIBUTION (standalone) ============
router.get('/booth-distribution/:electionId', async (req: Request, res: Response) => {
  try {
    const db = await getTenantDb(req) as any;
    const parts = await db.part.findMany({
      where: { electionId: req.params.electionId },
      select: { id: true, partNumber: true, boothName: true, totalVoters: true, maleVoters: true, femaleVoters: true, otherVoters: true },
      orderBy: { partNumber: 'asc' },
    });
    res.json(successResponse(parts));
  } catch (error: any) {
    res.status(500).json(errorResponse('E5001', error?.message || 'Internal server error'));
  }
});

// ============ BOOTHS (standalone) ============
router.get('/booths/:electionId', async (req: Request, res: Response) => {
  try {
    const db = await getTenantDb(req) as any;
    const electionId = req.params.electionId;
    const [totalParts, totalBooths] = await Promise.all([
      db.part.count({ where: { electionId } }),
      db.booth.count({ where: { electionId } }),
    ]);
    res.json(successResponse({ total: totalParts, totalBooths }));
  } catch (error: any) {
    res.status(500).json(errorResponse('E5001', error?.message || 'Internal server error'));
  }
});

export { router as analyticsRoutes };
