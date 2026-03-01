import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  successResponse,
  errorResponse,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('cadre-service');

const router = Router();

// Generate wave targets
router.post('/:electionId/generate-wave/:waveNum', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, waveNum } = req.params;
    const wave = parseInt(waveNum || '0', 10);

    if (![1, 2, 3].includes(wave)) {
      res.status(400).json(errorResponse('E2001', 'Wave must be 1, 2, or 3'));
      return;
    }

    // Get voters who have NOT voted yet with favorable leanings
    const voters = await (tenantDb as any).voter.findMany({
      where: {
        electionId,
        deletedAt: null,
        politicalLeaning: { in: ['LOYAL', 'FAVORABLE', 'SWING'] },
      },
      select: {
        id: true,
        boothId: true,
        familyId: true,
        age: true,
        mobile: true,
        influenceLevel: true,
        pulseScore: true,
        politicalLeaning: true,
      },
    });

    // Get voters who have already voted
    const votedRecords = await (tenantDb as any).pollDayVote.findMany({
      where: { electionId, hasVoted: true, voterId: { not: null } },
      select: { voterId: true },
    });
    const votedSet = new Set(votedRecords.map((v: any) => v.voterId));

    // Filter out those who already voted
    const nonVotedVoters = voters.filter((v: any) => !votedSet.has(v.id));

    // Get existing GOTV targets to avoid duplicates
    const existingTargets = await (tenantDb as any).gOTVTarget.findMany({
      where: { electionId },
      select: { voterId: true },
    });
    const existingSet = new Set(existingTargets.map((t: any) => t.voterId));

    // Filter based on wave criteria
    let waveVoters: any[];
    if (wave === 1) {
      // Wave 1: prioritize age > 60, influenceLevel HIGH
      waveVoters = nonVotedVoters.filter((v: any) =>
        (v.age > 60 || v.influenceLevel === 'HIGH') && !existingSet.has(v.id)
      );
    } else if (wave === 2) {
      // Wave 2: prioritize age 30-60, has mobile
      waveVoters = nonVotedVoters.filter((v: any) =>
        (v.age >= 30 && v.age <= 60 && v.mobile) && !existingSet.has(v.id)
      );
    } else {
      // Wave 3: ALL remaining favorable non-voted voters
      waveVoters = nonVotedVoters.filter((v: any) => !existingSet.has(v.id));
    }

    // Build family chain map
    const familyChainMap: Record<string, string> = {};
    for (const v of waveVoters) {
      if (v.familyId) {
        familyChainMap[v.id] = v.familyId;
      }
    }

    // Calculate priority and create records
    const targetData = waveVoters.map((v: any) => {
      let priority = 0;
      if (v.influenceLevel === 'HIGH') priority = 100;
      else if (v.influenceLevel === 'MEDIUM') priority = 50;
      else if (v.influenceLevel === 'LOW') priority = 25;

      // pulseScore adds to priority
      if (v.pulseScore) {
        priority += v.pulseScore;
      }

      return {
        electionId,
        voterId: v.id,
        boothId: v.boothId || null,
        wave,
        priority,
        status: 'PENDING',
        familyChainId: familyChainMap[v.id] || null,
        needsTransport: false,
        needsAssistance: false,
      };
    });

    // Upsert to avoid duplicates
    let created = 0;
    const priorityCounts = { high: 0, medium: 0, low: 0 };

    for (const data of targetData) {
      try {
        await (tenantDb as any).gOTVTarget.upsert({
          where: {
            electionId_voterId: {
              electionId,
              voterId: data.voterId,
            },
          },
          update: {
            wave: data.wave,
            priority: data.priority,
            familyChainId: data.familyChainId,
          },
          create: data,
        });
        created++;

        if (data.priority >= 100) priorityCounts.high++;
        else if (data.priority >= 50) priorityCounts.medium++;
        else priorityCounts.low++;
      } catch (err: any) {
        // Skip duplicate errors silently
        if (err.code !== 'P2002') {
          logger.error({ err }, 'Error creating GOTV target');
        }
      }
    }

    res.status(201).json(successResponse({
      wave,
      totalEligible: waveVoters.length,
      created,
      byPriority: priorityCounts,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Generate GOTV wave error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// List targets
router.get('/:electionId/targets', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const { wave, status, boothId, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = { electionId };
    if (wave) where.wave = parseInt(wave as string, 10);
    if (status) where.status = status;
    if (boothId) where.boothId = boothId;

    const [targets, total] = await Promise.all([
      (tenantDb as any).gOTVTarget.findMany({
        where,
        include: {
          voter: {
            select: {
              name: true,
              mobile: true,
              epicNumber: true,
              age: true,
              gender: true,
              politicalLeaning: true,
              family: {
                select: { headName: true },
              },
            },
          },
          booth: {
            select: {
              boothNumber: true,
              boothName: true,
            },
          },
        },
        orderBy: { priority: 'desc' },
        skip,
        take: limitNum,
      }),
      (tenantDb as any).gOTVTarget.count({ where }),
    ]);

    const formattedTargets = targets.map((t: any) => ({
      id: t.id,
      wave: t.wave,
      priority: t.priority,
      status: t.status,
      contactMethod: t.contactMethod,
      contactedAt: t.contactedAt,
      contactedBy: t.contactedBy,
      needsTransport: t.needsTransport,
      needsAssistance: t.needsAssistance,
      familyChainId: t.familyChainId,
      notes: t.notes,
      voter: {
        name: t.voter?.name || null,
        mobile: t.voter?.mobile || null,
        epicNumber: t.voter?.epicNumber || null,
        age: t.voter?.age || null,
        gender: t.voter?.gender || null,
        politicalLeaning: t.voter?.politicalLeaning || null,
        familyHeadName: t.voter?.family?.headName || null,
      },
      booth: {
        boothNumber: t.booth?.boothNumber || null,
        boothName: t.booth?.boothName || null,
      },
    }));

    res.json(successResponse(formattedTargets, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    }));
  } catch (error) {
    logger.error({ err: error }, 'List GOTV targets error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update target status
router.put('/targets/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { status, contactMethod, notes, needsTransport, needsAssistance } = req.body;
    const contactedBy = req.headers['x-user-id'] as string;

    // Get existing target
    const existing = await (tenantDb as any).gOTVTarget.findUnique({
      where: { id },
      select: { id: true, voterId: true, electionId: true },
    });

    if (!existing) {
      res.status(404).json(errorResponse('E3001', 'GOTV target not found'));
      return;
    }

    // If marking as VOTED, verify against PollDayVote
    if (status === 'VOTED') {
      const voteRecord = await (tenantDb as any).pollDayVote.findFirst({
        where: {
          electionId: existing.electionId,
          voterId: existing.voterId,
          hasVoted: true,
        },
      });

      if (!voteRecord) {
        res.status(400).json(errorResponse('E2002', 'Voter has not been marked as voted in poll day records'));
        return;
      }
    }

    const updated = await (tenantDb as any).gOTVTarget.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(contactMethod !== undefined && { contactMethod }),
        ...(notes !== undefined && { notes }),
        ...(needsTransport !== undefined && { needsTransport }),
        ...(needsAssistance !== undefined && { needsAssistance }),
        contactedAt: new Date(),
        contactedBy: contactedBy || null,
      },
    });

    res.json(successResponse(updated));
  } catch (error) {
    logger.error({ err: error }, 'Update GOTV target error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// GOTV statistics
router.get('/:electionId/stats', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const [
      totalTargets,
      byWave,
      byStatus,
      boothBreakdown,
      allTargets,
      transportNeeds,
      assistanceNeeds,
    ] = await Promise.all([
      (tenantDb as any).gOTVTarget.count({ where: { electionId } }),
      (tenantDb as any).gOTVTarget.groupBy({
        by: ['wave'],
        where: { electionId },
        _count: { id: true },
      }),
      (tenantDb as any).gOTVTarget.groupBy({
        by: ['status'],
        where: { electionId },
        _count: { id: true },
      }),
      // Per-booth breakdown
      (tenantDb as any).gOTVTarget.groupBy({
        by: ['boothId', 'status'],
        where: { electionId, boothId: { not: null } },
        _count: { id: true },
      }),
      // For family chain stats
      (tenantDb as any).gOTVTarget.findMany({
        where: { electionId, familyChainId: { not: null } },
        select: { familyChainId: true, status: true },
      }),
      (tenantDb as any).gOTVTarget.count({
        where: { electionId, needsTransport: true },
      }),
      (tenantDb as any).gOTVTarget.count({
        where: { electionId, needsAssistance: true },
      }),
    ]);

    // Format wave counts
    const waveStats: Record<number, number> = {};
    for (const w of byWave) {
      waveStats[w.wave] = w._count.id;
    }

    // Format status counts
    const statusStats: Record<string, number> = {};
    for (const s of byStatus) {
      statusStats[s.status] = s._count.id;
    }

    // Per-booth breakdown: aggregate
    const boothMap: Record<string, { totalTargets: number; contacted: number; voted: number }> = {};
    for (const entry of boothBreakdown) {
      if (!entry.boothId) continue;
      const bm = boothMap[entry.boothId] ?? (boothMap[entry.boothId] = { totalTargets: 0, contacted: 0, voted: 0 });
      bm.totalTargets += entry._count.id;
      if (entry.status === 'CONTACTED' || entry.status === 'CONFIRMED') {
        bm.contacted += entry._count.id;
      }
      if (entry.status === 'VOTED') {
        bm.voted += entry._count.id;
      }
    }

    // Get booth names
    const boothIdsWithTargets = Object.keys(boothMap);
    const boothNames = boothIdsWithTargets.length > 0
      ? await (tenantDb as any).booth.findMany({
          where: { id: { in: boothIdsWithTargets } },
          select: { id: true, boothName: true },
        })
      : [];

    const boothNameMap: Record<string, string> = {};
    for (const b of boothNames) {
      boothNameMap[b.id] = b.boothName;
    }

    const perBoothStats = Object.entries(boothMap).map(([boothId, stats]) => ({
      boothId,
      boothName: boothNameMap[boothId] || null,
      ...stats,
    }));

    // Family chain stats
    const familyIds = new Set(allTargets.map((t: any) => t.familyChainId));
    const familiesWithVoted = new Set(
      allTargets.filter((t: any) => t.status === 'VOTED').map((t: any) => t.familyChainId)
    );

    res.json(successResponse({
      totalTargets,
      byWave: waveStats,
      byStatus: statusStats,
      perBooth: perBoothStats,
      familyChain: {
        totalFamilies: familyIds.size,
        familiesWithVoted: familiesWithVoted.size,
      },
      transportNeeds,
      assistanceNeeds,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get GOTV stats error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Family chain
router.post('/:electionId/family-chain/:voterId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, voterId } = req.params;

    // Get the voter to find their familyId
    const voter = await (tenantDb as any).voter.findUnique({
      where: { id: voterId },
      select: { id: true, name: true, familyId: true },
    });

    if (!voter) {
      res.status(404).json(errorResponse('E3001', 'Voter not found'));
      return;
    }

    if (!voter.familyId) {
      res.status(400).json(errorResponse('E2001', 'Voter does not belong to any family'));
      return;
    }

    // Get all family members
    const familyMembers = await (tenantDb as any).voter.findMany({
      where: { electionId, familyId: voter.familyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        age: true,
        gender: true,
        mobile: true,
        politicalLeaning: true,
      },
    });

    // Get family info
    const family = await (tenantDb as any).family.findUnique({
      where: { id: voter.familyId },
      select: { id: true, familyName: true, headName: true },
    });

    // Get GOTV target status for each family member
    const memberIds = familyMembers.map((m: any) => m.id);
    const [gotvTargets, voteRecords] = await Promise.all([
      (tenantDb as any).gOTVTarget.findMany({
        where: { electionId, voterId: { in: memberIds } },
        select: { voterId: true, status: true, wave: true, priority: true, contactedAt: true },
      }),
      (tenantDb as any).pollDayVote.findMany({
        where: { electionId, voterId: { in: memberIds }, hasVoted: true },
        select: { voterId: true },
      }),
    ]);

    const targetMap: Record<string, any> = {};
    for (const t of gotvTargets) {
      targetMap[t.voterId] = t;
    }

    const votedSet = new Set(voteRecords.map((v: any) => v.voterId));

    const familyChain = familyMembers.map((member: any) => ({
      id: member.id,
      name: member.name,
      age: member.age,
      gender: member.gender,
      mobile: member.mobile,
      politicalLeaning: member.politicalLeaning,
      hasVoted: votedSet.has(member.id),
      gotvTarget: targetMap[member.id] || null,
    }));

    const votedCount = familyChain.filter((m: any) => m.hasVoted).length;

    res.json(successResponse({
      family: family || { id: voter.familyId, familyName: null, headName: null },
      totalMembers: familyChain.length,
      votedCount,
      pendingCount: familyChain.length - votedCount,
      members: familyChain,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get family chain error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as gotvRoutes };
