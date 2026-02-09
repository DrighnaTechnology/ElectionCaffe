import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  successResponse,
  errorResponse,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('cadre-service');

const router = Router();

// Get turnout statistics
router.get('/turnout', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;

    if (!electionId) {
      res.status(400).json(errorResponse('E2001', 'electionId is required'));
      return;
    }

    const [totalVoters, totalVoted, boothTurnout] = await Promise.all([
      (tenantDb as any).voter.count({
        where: { electionId: electionId as string, deletedAt: null },
      }),
      (tenantDb as any).pollDayVote.count({
        where: { electionId: electionId as string, hasVoted: true },
      }),
      (tenantDb as any).booth.findMany({
        where: { electionId: electionId as string },
        select: {
          id: true,
          boothNumber: true,
          boothName: true,
          totalVoters: true,
          _count: {
            select: {
              pollDayVotes: { where: { hasVoted: true } },
            },
          },
        },
        orderBy: { boothNumber: 'asc' },
      }),
    ]);

    const turnoutPercentage = totalVoters > 0
      ? Math.round((totalVoted / totalVoters) * 1000) / 10
      : 0;

    const boothStats = boothTurnout.map((booth: any) => ({
      boothId: booth.id,
      boothNumber: booth.boothNumber,
      boothName: booth.boothName,
      totalVoters: booth.totalVoters,
      voted: booth._count.pollDayVotes,
      turnout: booth.totalVoters > 0
        ? Math.round((booth._count.pollDayVotes / booth.totalVoters) * 1000) / 10
        : 0,
    }));

    res.json(successResponse({
      totalVoters,
      totalVoted,
      turnoutPercentage,
      booths: boothStats,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get turnout error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get booth agents
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, boothId } = req.query;

    const where: any = {};
    if (electionId) where.electionId = electionId;
    if (boothId) where.boothId = boothId;

    const agents = await (tenantDb as any).boothAgent.findMany({
      where,
      include: {
        booth: {
          select: {
            boothNumber: true,
            boothName: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    res.json(successResponse(agents));
  } catch (error) {
    logger.error({ err: error }, 'Get agents error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Record a poll-day vote
router.post('/vote', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, boothId, voterId, epicNo, serialNo, latitude, longitude } = req.body;
    const markedBy = req.headers['x-user-id'] as string;

    if (!electionId || !boothId) {
      res.status(400).json(errorResponse('E2001', 'electionId and boothId are required'));
      return;
    }

    const vote = await (tenantDb as any).pollDayVote.upsert({
      where: {
        electionId_boothId_epicNo: {
          electionId,
          boothId,
          epicNo: epicNo || '',
        },
      },
      update: {
        hasVoted: true,
        votedAt: new Date(),
        markedBy,
        latitude,
        longitude,
      },
      create: {
        electionId,
        boothId,
        voterId: voterId || null,
        epicNo: epicNo || null,
        serialNo: serialNo || null,
        hasVoted: true,
        votedAt: new Date(),
        markedBy,
        latitude,
        longitude,
      },
    });

    res.status(201).json(successResponse(vote));
  } catch (error) {
    logger.error({ err: error }, 'Record vote error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Hourly turnout breakdown
router.get('/hourly/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const votes = await (tenantDb as any).pollDayVote.findMany({
      where: { electionId, hasVoted: true, votedAt: { not: null } },
      select: { votedAt: true },
      orderBy: { votedAt: 'asc' },
    });

    // Group by hour
    const hourlyMap: Record<string, number> = {};
    for (const vote of votes) {
      if (vote.votedAt) {
        const hour = new Date(vote.votedAt).getHours();
        const key = `${hour.toString().padStart(2, '0')}:00`;
        hourlyMap[key] = (hourlyMap[key] || 0) + 1;
      }
    }

    // Build cumulative hourly data
    const totalVoters = await (tenantDb as any).voter.count({
      where: { electionId, deletedAt: null },
    });

    let cumulative = 0;
    const hourlyData = Object.entries(hourlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => {
        cumulative += count;
        return {
          hour,
          votes: count,
          cumulative,
          percentage: totalVoters > 0
            ? Math.round((cumulative / totalVoters) * 1000) / 10
            : 0,
        };
      });

    res.json(successResponse({
      electionId,
      totalVoters,
      totalVoted: cumulative,
      hourly: hourlyData,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get hourly turnout error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get voter slip data
router.get('/voter-slips/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const { boothId } = req.query;

    const templates = await (tenantDb as any).voterSlipTemplate.findMany({
      where: { electionId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Get voters for slip generation
    const voterWhere: any = { electionId, deletedAt: null };
    if (boothId) voterWhere.boothId = boothId;

    const voters = await (tenantDb as any).voter.findMany({
      where: voterWhere,
      select: {
        id: true,
        name: true,
        nameLocal: true,
        epicNumber: true,
        slNumber: true,
        gender: true,
        age: true,
        address: true,
        part: { select: { partNumber: true, boothName: true } },
        booth: { select: { boothNumber: true, boothName: true, address: true } },
      },
      orderBy: { slNumber: 'asc' },
      take: 500,
    });

    res.json(successResponse({
      templates,
      voters,
      total: voters.length,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get voter slips error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as pollDayRoutes };
