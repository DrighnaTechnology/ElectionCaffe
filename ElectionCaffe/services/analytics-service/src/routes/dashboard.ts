import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, calculatePercentage, CHART_COLORS } from '@electioncaffe/shared';

const router = Router();

// Get election dashboard data
router.get('/election/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const election = await (tenantDb as any).election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      res.status(404).json(errorResponse('E3001', 'Election not found'));
      return;
    }

    // Get all counts in parallel
    const [
      totalVoters,
      maleVoters,
      femaleVoters,
      otherVoters,
      totalParts,
      totalFamilies,
      totalCadres,
      votersWithMobile,
      votersWithDOB,
      crossBoothFamilies,
      singleMemberFamilies,
      religionStats,
      casteStats,
      languageStats,
      partyStats,
      genderStats,
      voterCategoryStats,
    ] = await Promise.all([
      (tenantDb as any).voter.count({ where: { electionId, isDeleted: false } }),
      (tenantDb as any).voter.count({ where: { electionId, isDeleted: false, gender: 'MALE' } }),
      (tenantDb as any).voter.count({ where: { electionId, isDeleted: false, gender: 'FEMALE' } }),
      (tenantDb as any).voter.count({ where: { electionId, isDeleted: false, gender: 'OTHER' } }),
      (tenantDb as any).part.count({ where: { electionId } }),
      (tenantDb as any).family.count({ where: { electionId } }),
      (tenantDb as any).cadre.count({ where: { electionId, isActive: true } }),
      (tenantDb as any).voter.count({ where: { electionId, isDeleted: false, mobile: { not: null } } }),
      (tenantDb as any).voter.count({ where: { electionId, isDeleted: false, dateOfBirth: { not: null } } }),
      Promise.resolve(0), // isCrossBooth field not in tenant schema
      (tenantDb as any).family.count({ where: { electionId, totalMembers: 1 } }),
      getReligionStats(tenantDb, electionId as string),
      getCasteStats(tenantDb, electionId as string),
      getLanguageStats(tenantDb, electionId as string),
      getPartyStats(tenantDb, electionId as string),
      getGenderStats(tenantDb, electionId as string),
      getVoterCategoryStats(tenantDb, electionId as string),
    ]);

    const dashboard = {
      election: {
        id: election.id,
        name: election.name,
        status: election.status,
        pollDate: election.pollDate,
      },
      kpis: {
        totalVoters: { label: 'Total Voters', value: totalVoters, color: '#1890FF' },
        totalBooths: { label: 'Total Booths', value: totalParts, color: '#52C41A' },
        totalFamilies: { label: 'Total Families', value: totalFamilies, color: '#FAAD14' },
        totalCadres: { label: 'Total Cadres', value: totalCadres, color: '#722ED1' },
        mobileUpdated: {
          label: 'Mobile Updated',
          value: votersWithMobile,
          percentage: calculatePercentage(votersWithMobile, totalVoters),
          color: '#13C2C2',
        },
        dobUpdated: {
          label: 'DOB Updated',
          value: votersWithDOB,
          percentage: calculatePercentage(votersWithDOB, totalVoters),
          color: '#EB2F96',
        },
      },
      demographics: {
        gender: genderStats,
        religion: religionStats,
        caste: casteStats,
        language: languageStats,
        party: partyStats,
        voterCategory: voterCategoryStats,
      },
      familyMetrics: {
        total: totalFamilies,
        crossBooth: crossBoothFamilies,
        singleMember: singleMemberFamilies,
      },
      genderBreakdown: {
        male: { count: maleVoters, percentage: calculatePercentage(maleVoters, totalVoters) },
        female: { count: femaleVoters, percentage: calculatePercentage(femaleVoters, totalVoters) },
        other: { count: otherVoters, percentage: calculatePercentage(otherVoters, totalVoters) },
      },
    };

    res.json(successResponse(dashboard));
  } catch (error) {
    console.error('Get election dashboard error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get cadre dashboard
router.get('/cadre/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const [
      totalCadres,
      loggedInCadres,
      boothsAssigned,
      topPerformers,
      leastPerformers,
    ] = await Promise.all([
      (tenantDb as any).cadre.count({ where: { electionId, isActive: true } }),
      (tenantDb as any).cadre.count({ where: { electionId, isActive: true, isLoggedIn: true } }),
      (tenantDb as any).cadreAssignment.count({ where: { cadre: { electionId } } }),
      (tenantDb as any).cadre.findMany({
        where: { electionId, isActive: true },
        orderBy: { votersUpdated: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          mobile: true,
          votersUpdated: true,
          surveysCompleted: true,
          votesMarked: true,
        },
      }),
      (tenantDb as any).cadre.findMany({
        where: { electionId, isActive: true },
        orderBy: { votersUpdated: 'asc' },
        take: 10,
        select: {
          id: true,
          name: true,
          mobile: true,
          votersUpdated: true,
          surveysCompleted: true,
          votesMarked: true,
        },
      }),
    ]);

    const dashboard = {
      metrics: {
        totalCadres,
        loggedInCadres,
        notLoggedCadres: totalCadres - loggedInCadres,
        boothsAssigned,
      },
      topPerformers: topPerformers.map((c: any, i: number) => ({ ...c, rank: i + 1 })),
      leastPerformers: leastPerformers.map((c: any, i: number) => ({ ...c, rank: i + 1 })),
    };

    res.json(successResponse(dashboard));
  } catch (error) {
    console.error('Get cadre dashboard error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get poll day dashboard
router.get('/poll-day/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const [totalVoters, votedCount, hourlyTurnout, boothTurnout] = await Promise.all([
      (tenantDb as any).voter.count({ where: { electionId, isDeleted: false } }),
      (tenantDb as any).pollDayVote.count({ where: { electionId } }),
      getHourlyTurnout(tenantDb, electionId as string),
      getBoothTurnout(tenantDb, electionId as string),
    ]);

    const dashboard = {
      totalVoters,
      votedCount,
      turnoutPercentage: calculatePercentage(votedCount, totalVoters),
      hourlyTurnout,
      boothTurnout,
    };

    res.json(successResponse(dashboard));
  } catch (error) {
    console.error('Get poll day dashboard error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Statistics endpoints for charts
router.get('/stats/religion/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const stats = await getReligionStats(tenantDb, req.params.electionId as string);
    res.json(successResponse(stats));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.get('/stats/caste/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const stats = await getCasteStats(tenantDb, req.params.electionId as string);
    res.json(successResponse(stats));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.get('/stats/caste-category/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const stats = await getCasteCategoryStats(tenantDb, req.params.electionId as string);
    res.json(successResponse(stats));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.get('/stats/language/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const stats = await getLanguageStats(tenantDb, req.params.electionId as string);
    res.json(successResponse(stats));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.get('/stats/party/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const stats = await getPartyStats(tenantDb, req.params.electionId as string);
    res.json(successResponse(stats));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.get('/stats/schemes/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const stats = await getSchemeStats(tenantDb, req.params.electionId as string);
    res.json(successResponse(stats));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Helper functions for statistics
async function getReligionStats(tenantDb: any, electionId: string) {
  const stats = await tenantDb.voter.groupBy({
    by: ['religionId'],
    where: { electionId, isDeleted: false },
    _count: { id: true },
  });

  const religions = await tenantDb.religion.findMany({
    where: { electionId },
    select: { id: true, name: true },
  });

  const total = stats.reduce((sum: number, s: any) => sum + s._count.id, 0);

  return stats.map((s: any, i: number) => {
    const religion = religions.find((r: any) => r.id === s.religionId);
    return {
      label: religion?.name || 'Unknown',
      value: s._count.id,
      color: CHART_COLORS[i % CHART_COLORS.length],
      percentage: calculatePercentage(s._count.id, total),
    };
  });
}

async function getCasteStats(tenantDb: any, electionId: string) {
  const stats = await tenantDb.voter.groupBy({
    by: ['casteId'],
    where: { electionId, isDeleted: false },
    _count: { id: true },
  });

  const castes = await tenantDb.caste.findMany({
    where: { electionId },
    select: { id: true, name: true },
  });

  const total = stats.reduce((sum: number, s: any) => sum + s._count.id, 0);

  return stats.map((s: any, i: number) => {
    const caste = castes.find((c: any) => c.id === s.casteId);
    return {
      label: caste?.name || 'Unknown',
      value: s._count.id,
      color: CHART_COLORS[i % CHART_COLORS.length],
      percentage: calculatePercentage(s._count.id, total),
    };
  });
}

async function getCasteCategoryStats(tenantDb: any, electionId: string) {
  const stats = await tenantDb.voter.groupBy({
    by: ['casteCategoryId'],
    where: { electionId, isDeleted: false },
    _count: { id: true },
  });

  const categories = await tenantDb.casteCategory.findMany({
    where: { electionId },
    select: { id: true, name: true },
  });

  const total = stats.reduce((sum: number, s: any) => sum + s._count.id, 0);

  return stats.map((s: any, i: number) => {
    const category = categories.find((c: any) => c.id === s.casteCategoryId);
    return {
      label: category?.name || 'Unknown',
      value: s._count.id,
      color: CHART_COLORS[i % CHART_COLORS.length],
      percentage: calculatePercentage(s._count.id, total),
    };
  });
}

async function getLanguageStats(tenantDb: any, electionId: string) {
  const stats = await tenantDb.voter.groupBy({
    by: ['languageId'],
    where: { electionId, isDeleted: false },
    _count: { id: true },
  });

  const languages = await tenantDb.language.findMany({
    where: { electionId },
    select: { id: true, name: true },
  });

  const total = stats.reduce((sum: number, s: any) => sum + s._count.id, 0);

  return stats.map((s: any, i: number) => {
    const language = languages.find((l: any) => l.id === s.languageId);
    return {
      label: language?.name || 'Unknown',
      value: s._count.id,
      color: CHART_COLORS[i % CHART_COLORS.length],
      percentage: calculatePercentage(s._count.id, total),
    };
  });
}

async function getPartyStats(tenantDb: any, electionId: string) {
  // Note: Voter model uses partyAffiliation (string) not partyId (relation)
  const stats = await tenantDb.voter.groupBy({
    by: ['partyAffiliation'],
    where: { electionId, isDeleted: false, partyAffiliation: { not: null } },
    _count: { id: true },
  });

  const total = stats.reduce((sum: number, s: any) => sum + s._count.id, 0);

  return stats.map((s: any, i: number) => ({
    label: s.partyAffiliation || 'Unknown',
    value: s._count.id,
    color: CHART_COLORS[i % CHART_COLORS.length],
    percentage: calculatePercentage(s._count.id, total),
  }));
}

async function getGenderStats(tenantDb: any, electionId: string) {
  const stats = await tenantDb.voter.groupBy({
    by: ['gender'],
    where: { electionId, isDeleted: false },
    _count: { id: true },
  });

  const total = stats.reduce((sum: number, s: any) => sum + s._count.id, 0);
  const colors = { MALE: '#1890FF', FEMALE: '#EB2F96', OTHER: '#722ED1' };

  return stats.map((s: any) => ({
    label: s.gender,
    value: s._count.id,
    color: colors[s.gender as keyof typeof colors] || '#808080',
    percentage: calculatePercentage(s._count.id, total),
  }));
}

async function getVoterCategoryStats(tenantDb: any, electionId: string) {
  // Note: Voter model stores categories in JSON field 'categories', not as a relation
  // This function returns voter categories from the VoterCategory table with voter counts
  const categories = await tenantDb.voterCategory.findMany({
    where: { electionId },
    select: { id: true, name: true, color: true },
  });

  // Since categories is a JSON array in Voter, we can't easily groupBy
  // Return categories without voter count for now
  return categories.map((cat: any, i: number) => ({
    label: cat.name || 'Unknown',
    value: 0, // Would need to parse JSON to count
    color: cat.color || CHART_COLORS[i % CHART_COLORS.length],
    percentage: 0,
  }));
}

async function getSchemeStats(tenantDb: any, electionId: string) {
  const schemes = await tenantDb.scheme.findMany({
    where: { electionId },
    include: {
      _count: { select: { voterSchemes: true } },
    },
  });

  const total = schemes.reduce((sum: number, s: any) => sum + (s._count?.voterSchemes || 0), 0);

  return schemes.map((s: any, i: number) => ({
    label: s.name,
    value: s._count?.voterSchemes || 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
    percentage: calculatePercentage(s._count?.voterSchemes || 0, total),
  }));
}

async function getHourlyTurnout(tenantDb: any, electionId: string) {
  const votes = await tenantDb.pollDayVote.findMany({
    where: { electionId },
    select: { votedAt: true },
  });

  const hourlyData: Record<string, number> = {};
  votes.forEach((vote: any) => {
    const hour = vote.votedAt.getHours().toString().padStart(2, '0') + ':00';
    hourlyData[hour] = (hourlyData[hour] || 0) + 1;
  });

  const totalVoters = await tenantDb.voter.count({ where: { electionId, isDeleted: false } });
  let cumulative = 0;

  return Object.entries(hourlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => {
      cumulative += count;
      return {
        hour,
        count,
        cumulative,
        percentage: calculatePercentage(cumulative, totalVoters),
      };
    });
}

async function getBoothTurnout(tenantDb: any, electionId: string) {
  const booths = await tenantDb.booth.findMany({
    where: { electionId },
    select: {
      id: true,
      boothNumber: true,
      boothName: true,
      totalVoters: true,
      _count: { select: { pollDayVotes: true } },
    },
  });

  return booths.map((booth: any) => ({
    boothId: booth.id,
    boothNumber: booth.boothNumber,
    boothName: booth.boothName,
    totalVoters: booth.totalVoters,
    votedCount: booth._count.pollDayVotes,
    percentage: calculatePercentage(booth._count.pollDayVotes, booth.totalVoters),
  }));
}

export { router as dashboardRoutes };
