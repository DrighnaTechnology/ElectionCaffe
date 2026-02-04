import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, calculatePercentage } from '@electioncaffe/shared';

const router = Router();

// Get comprehensive analytics
router.get('/overview/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const [
      voterStats,
      boothStats,
      cadreStats,
      familyStats,
      feedbackStats,
    ] = await Promise.all([
      getVoterAnalytics(tenantDb, electionId as string),
      getBoothAnalytics(tenantDb, electionId as string),
      getCadreAnalytics(tenantDb, electionId as string),
      getFamilyAnalytics(tenantDb, electionId as string),
      getFeedbackAnalytics(tenantDb, electionId as string),
    ]);

    res.json(successResponse({
      voters: voterStats,
      booths: boothStats,
      cadres: cadreStats,
      families: familyStats,
      feedback: feedbackStats,
    }));
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Voter analytics
router.get('/voters/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const analytics = await getVoterAnalytics(tenantDb, req.params.electionId as string);
    res.json(successResponse(analytics));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Booth analytics
router.get('/booths/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const analytics = await getBoothAnalytics(tenantDb, req.params.electionId as string);
    res.json(successResponse(analytics));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Age group distribution
router.get('/age-groups/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const voters = await (tenantDb as any).voter.findMany({
      where: { electionId, deletedAt: null, age: { not: null } },
      select: { age: true },
    });

    const ageGroups = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '65+': 0,
    };

    voters.forEach((v: any) => {
      const age = v.age!;
      if (age <= 25) ageGroups['18-25']++;
      else if (age <= 35) ageGroups['26-35']++;
      else if (age <= 45) ageGroups['36-45']++;
      else if (age <= 55) ageGroups['46-55']++;
      else if (age <= 65) ageGroups['56-65']++;
      else ageGroups['65+']++;
    });

    const total = voters.length;
    const result = Object.entries(ageGroups).map(([label, value]) => ({
      label,
      value,
      percentage: calculatePercentage(value, total),
    }));

    res.json(successResponse(result));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Political leaning distribution
router.get('/political-leaning/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const stats = await (tenantDb as any).voter.groupBy({
      by: ['politicalLeaning'],
      where: { electionId, deletedAt: null },
      _count: { id: true },
    });

    const total = stats.reduce((sum: number, s: any) => sum + s._count.id, 0);
    const colors = {
      LOYAL: '#52C41A',
      SWING: '#FAAD14',
      OPPOSITION: '#FF4D4F',
      UNKNOWN: '#8C8C8C',
    };

    const result = stats.map((s: any) => ({
      label: s.politicalLeaning,
      value: s._count.id,
      color: colors[s.politicalLeaning as keyof typeof colors],
      percentage: calculatePercentage(s._count.id, total),
    }));

    res.json(successResponse(result));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Booth-wise voter distribution
router.get('/booth-distribution/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const parts = await (tenantDb as any).part.findMany({
      where: { electionId },
      select: {
        id: true,
        partNumber: true,
        partName: true,
        pollingStation: true,
        totalVoters: true,
        maleVoters: true,
        femaleVoters: true,
        otherVoters: true,
      },
      orderBy: { partNumber: 'asc' },
    });

    res.json(successResponse(parts));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Data quality metrics
router.get('/data-quality/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const [
      totalVoters,
      withMobile,
      withDOB,
      withAddress,
      withPhoto,
      withReligion,
      withCaste,
      withLanguage,
      withParty,
    ] = await Promise.all([
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null } }),
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null, mobile: { not: null } } }),
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null, dateOfBirth: { not: null } } }),
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null, address: { not: null } } }),
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null, photoUrl: { not: null } } }),
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null, religionId: { not: null } } }),
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null, casteId: { not: null } } }),
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null, languageId: { not: null } } }),
      (tenantDb as any).voter.count({ where: { electionId, deletedAt: null, partyId: { not: null } } }),
    ]);

    const metrics = [
      { field: 'Mobile Number', count: withMobile, percentage: calculatePercentage(withMobile, totalVoters) },
      { field: 'Date of Birth', count: withDOB, percentage: calculatePercentage(withDOB, totalVoters) },
      { field: 'Address', count: withAddress, percentage: calculatePercentage(withAddress, totalVoters) },
      { field: 'Photo', count: withPhoto, percentage: calculatePercentage(withPhoto, totalVoters) },
      { field: 'Religion', count: withReligion, percentage: calculatePercentage(withReligion, totalVoters) },
      { field: 'Caste', count: withCaste, percentage: calculatePercentage(withCaste, totalVoters) },
      { field: 'Language', count: withLanguage, percentage: calculatePercentage(withLanguage, totalVoters) },
      { field: 'Party Affiliation', count: withParty, percentage: calculatePercentage(withParty, totalVoters) },
    ];

    const overallQuality = metrics.reduce((sum, m) => sum + m.percentage, 0) / metrics.length;

    res.json(successResponse({
      totalVoters,
      overallQuality: Math.round(overallQuality * 10) / 10,
      metrics,
    }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Helper functions
async function getVoterAnalytics(tenantDb: any, electionId: string) {
  const [total, withMobile, withDOB, byGender, byPoliticalLeaning] = await Promise.all([
    tenantDb.voter.count({ where: { electionId, deletedAt: null } }),
    tenantDb.voter.count({ where: { electionId, deletedAt: null, mobile: { not: null } } }),
    tenantDb.voter.count({ where: { electionId, deletedAt: null, dateOfBirth: { not: null } } }),
    tenantDb.voter.groupBy({
      by: ['gender'],
      where: { electionId, deletedAt: null },
      _count: true,
    }),
    tenantDb.voter.groupBy({
      by: ['politicalLeaning'],
      where: { electionId, deletedAt: null, politicalLeaning: { not: null } },
      _count: true,
    }),
  ]);

  return {
    total,
    mobilePercentage: calculatePercentage(withMobile, total),
    dobPercentage: calculatePercentage(withDOB, total),
    byGender: byGender.map((g: any) => ({ gender: g.gender, count: g._count })),
    byPoliticalLeaning: byPoliticalLeaning.map((l: any) => ({ leaning: l.politicalLeaning, count: l._count })),
  };
}

async function getBoothAnalytics(tenantDb: any, electionId: string) {
  const [totalParts, totalBooths, vulnerableBooths, avgVotersPerPart] = await Promise.all([
    tenantDb.part.count({ where: { electionId } }),
    tenantDb.booth.count({ where: { electionId } }),
    tenantDb.booth.count({ where: { electionId, vulnerabilityStatus: { not: 'NONE' } } }),
    tenantDb.part.aggregate({
      where: { electionId },
      _avg: { totalVoters: true },
    }),
  ]);

  return {
    total: totalParts,
    totalBooths,
    vulnerable: vulnerableBooths,
    avgVotersPerBooth: Math.round(avgVotersPerPart._avg.totalVoters || 0),
  };
}

async function getCadreAnalytics(tenantDb: any, electionId: string) {
  const [total, active, byCadreType] = await Promise.all([
    tenantDb.cadre.count({ where: { electionId } }),
    tenantDb.cadre.count({ where: { electionId, isActive: true } }),
    tenantDb.cadre.groupBy({
      by: ['cadreType'],
      where: { electionId, isActive: true },
      _count: true,
    }),
  ]);

  return {
    total,
    active,
    byRole: byCadreType.map((r: any) => ({ role: r.cadreType, count: r._count })),
  };
}

async function getFamilyAnalytics(tenantDb: any, electionId: string) {
  const [total, singleMember, avgSize] = await Promise.all([
    tenantDb.family.count({ where: { electionId } }),
    tenantDb.family.count({ where: { electionId, totalMembers: 1 } }),
    tenantDb.family.aggregate({
      where: { electionId },
      _avg: { totalMembers: true },
    }),
  ]);

  return {
    total,
    crossBooth: 0, // isCrossBooth field not in tenant schema
    singleMember,
    avgSize: Math.round((avgSize._avg.totalMembers || 0) * 10) / 10,
  };
}

async function getFeedbackAnalytics(tenantDb: any, _electionId: string) {
  // Note: Tenant schema FeedbackIssue doesn't have electionId - queries all tenant feedback
  const [total, byStatus, byPriority] = await Promise.all([
    tenantDb.feedbackIssue.count(),
    tenantDb.feedbackIssue.groupBy({
      by: ['status'],
      _count: true,
    }),
    tenantDb.feedbackIssue.groupBy({
      by: ['priority'],
      _count: true,
    }),
  ]);

  return {
    total,
    byStatus: byStatus.map((s: any) => ({ status: s.status, count: s._count })),
    byPriority: byPriority.map((p: any) => ({ priority: p.priority, count: p._count })),
  };
}

export { router as analyticsRoutes };
