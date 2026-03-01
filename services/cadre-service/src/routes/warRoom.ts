import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  successResponse,
  errorResponse,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('cadre-service');

const router = Router();

// Safe query helper — returns fallback if table/relation doesn't exist yet
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    // P2021 = table doesn't exist, P2022 = column doesn't exist
    if (err.code === 'P2021' || err.code === 'P2022' || err.message?.includes('does not exist')) {
      logger.debug({ err: err.message }, 'Table/column not yet created, using fallback');
      return fallback;
    }
    throw err;
  }
}

/**
 * Resolve booth-level data.
 * In Indian elections, "Parts" (voter list pages) are the real operational unit.
 * Voters link to Parts via partId, not to Booths via boothId.
 * Booths may exist but have no voters or coordinates.
 * This function returns Parts-as-booths when booth data is empty.
 */
async function resolveBoothUnits(tenantDb: any, electionId: string) {
  // Try booths first
  const booths = await (tenantDb as any).booth.findMany({
    where: { electionId },
    select: {
      id: true,
      boothNumber: true,
      boothName: true,
      totalVoters: true,
      latitude: true,
      longitude: true,
      partId: true,
      part: {
        select: {
          latitude: true,
          longitude: true,
          schoolLatitude: true,
          schoolLongitude: true,
        },
      },
      _count: {
        select: {
          voters: { where: { deletedAt: null } },
          pollDayVotes: { where: { hasVoted: true } },
        },
      },
    },
    orderBy: { boothNumber: 'asc' },
  });

  // Check if booths have any voter data
  const boothsHaveVoters = booths.some(
    (b: any) => b.totalVoters > 0 || b._count.voters > 0
  );

  if (boothsHaveVoters) {
    // Booths have data — use them directly
    return {
      units: booths.map((b: any) => ({
        id: b.id,
        unitType: 'booth' as const,
        number: b.boothNumber,
        name: b.boothName || `Booth ${b.boothNumber}`,
        totalVoters: b.totalVoters > 0 ? b.totalVoters : b._count.voters,
        voted: b._count.pollDayVotes,
        latitude: b.latitude ?? b.part?.latitude ?? b.part?.schoolLatitude ?? null,
        longitude: b.longitude ?? b.part?.longitude ?? b.part?.schoolLongitude ?? null,
      })),
      unitIds: booths.map((b: any) => b.id),
      unitType: 'booth' as const,
    };
  }

  // Booths have no voter data — use Parts instead
  const parts = await (tenantDb as any).part.findMany({
    where: { electionId },
    select: {
      id: true,
      partNumber: true,
      boothName: true,
      latitude: true,
      longitude: true,
      schoolLatitude: true,
      schoolLongitude: true,
      _count: {
        select: {
          voters: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { partNumber: 'asc' },
  });

  if (parts.length > 0) {
    return {
      units: parts.map((p: any) => ({
        id: p.id,
        unitType: 'part' as const,
        number: String(p.partNumber),
        name: p.boothName || `Part ${p.partNumber}`,
        totalVoters: p._count.voters,
        voted: 0, // PollDayVotes link to booths, not parts — will be 0 for part-based
        latitude: p.latitude ?? p.schoolLatitude ?? null,
        longitude: p.longitude ?? p.schoolLongitude ?? null,
      })),
      unitIds: parts.map((p: any) => p.id),
      unitType: 'part' as const,
    };
  }

  // Neither booths nor parts — return empty booths
  return {
    units: booths.map((b: any) => ({
      id: b.id,
      unitType: 'booth' as const,
      number: b.boothNumber,
      name: b.boothName || `Booth ${b.boothNumber}`,
      totalVoters: 0,
      voted: 0,
      latitude: null,
      longitude: null,
    })),
    unitIds: booths.map((b: any) => b.id),
    unitType: 'booth' as const,
  };
}

// Full aggregated war room dashboard
router.get('/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const electionId = req.params['electionId'] as string;

    // Resolve booth units (uses Parts if booths have no voters)
    const { units, unitIds, unitType } = await resolveBoothUnits(tenantDb, electionId);

    // Core queries
    const [totalVoters, totalVoted] = await Promise.all([
      (tenantDb as any).voter.count({
        where: { electionId, deletedAt: null },
      }),
      (tenantDb as any).pollDayVote.count({
        where: { electionId, hasVoted: true },
      }),
    ]);

    // Gender votes
    const genderVotes: any[] = await safeQuery(
      () => (tenantDb as any).pollDayVote.findMany({
        where: { electionId, hasVoted: true, voterId: { not: null } },
        select: { voter: { select: { gender: true } } },
      }),
      []
    );

    // Agent count — try BoothAgent first, fall back to Cadre count
    const boothAgentCount: number = await safeQuery(
      () => (tenantDb as any).boothAgent.count({
        where: { electionId, isActive: true },
      }),
      0
    );
    const cadreCount: number = await safeQuery(
      () => (tenantDb as any).cadre.count({
        where: { electionId, isActive: true },
      }),
      0
    );
    const activeAgents = boothAgentCount > 0 ? boothAgentCount : cadreCount;

    // New War Room tables — may not exist yet
    const [openIncidents, gotvTargets, recentBattleOrders] = await Promise.all([
      safeQuery(
        () => (tenantDb as any).pollDayIncident.groupBy({
          by: ['severity'],
          where: { electionId, status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
          _count: { id: true },
        }),
        []
      ),
      safeQuery(
        () => (tenantDb as any).gOTVTarget.findMany({
          where: { electionId },
          select: { wave: true, status: true },
        }),
        []
      ),
      safeQuery(
        () => (tenantDb as any).battleOrder.findMany({
          where: { electionId },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          take: 10,
        }),
        []
      ),
    ]);

    // Count gender votes
    let maleVoted = 0;
    let femaleVoted = 0;
    let otherVoted = 0;
    for (const v of genderVotes) {
      if (v.voter?.gender === 'MALE') maleVoted++;
      else if (v.voter?.gender === 'FEMALE') femaleVoted++;
      else otherVoted++;
    }

    const turnoutPercentage = totalVoters > 0
      ? Math.round((totalVoted / totalVoters) * 1000) / 10
      : 0;

    // Build incident counts map
    const incidentsBySeverity: Record<string, number> = {};
    for (const g of openIncidents as any[]) {
      incidentsBySeverity[g.severity] = g._count.id;
    }

    // GOTV progress
    const gotvProgress = {
      total: gotvTargets.length,
      contacted: gotvTargets.filter((t: any) => t.status === 'CONTACTED').length,
      confirmed: gotvTargets.filter((t: any) => t.status === 'CONFIRMED').length,
      voted: gotvTargets.filter((t: any) => t.status === 'VOTED').length,
      unreachable: gotvTargets.filter((t: any) => t.status === 'UNREACHABLE').length,
      byWave: {
        1: gotvTargets.filter((t: any) => t.wave === 1).length,
        2: gotvTargets.filter((t: any) => t.wave === 2).length,
        3: gotvTargets.filter((t: any) => t.wave === 3).length,
      },
    };

    // Fetch classifications, agents, and moods (only relevant for booth-based units)
    const boothIds = unitType === 'booth' ? unitIds : [];

    const [classifications, boothAgents, moodReports] = await Promise.all([
      boothIds.length > 0 ? safeQuery(
        () => (tenantDb as any).boothClassification.findMany({
          where: { electionId, boothId: { in: boothIds } },
          select: { boothId: true, classification: true },
        }),
        []
      ) : Promise.resolve([]),
      boothIds.length > 0 ? safeQuery(
        () => (tenantDb as any).boothAgent.findMany({
          where: { electionId, boothId: { in: boothIds }, isActive: true },
          select: { boothId: true, name: true, checkedInAt: true, checkedOutAt: true },
        }),
        []
      ) : Promise.resolve([]),
      boothIds.length > 0 ? safeQuery(
        () => (tenantDb as any).agentMoodReport.findMany({
          where: { electionId, boothId: { in: boothIds } },
          orderBy: { createdAt: 'desc' },
          select: { boothId: true, mood: true },
        }),
        []
      ) : Promise.resolve([]),
    ]);

    // Fetch cadre assignments — for booths use entityType BOOTH, for parts use PART
    const assignmentEntityType = unitType === 'part' ? 'PART' : 'BOOTH';
    const cadreAssignments: any[] = await safeQuery(
      () => (tenantDb as any).cadreAssignment.findMany({
        where: {
          cadre: { electionId, isActive: true },
          entityType: assignmentEntityType,
          entityId: { in: unitIds },
          isActive: true,
        },
        select: {
          entityId: true,
          cadre: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      []
    );

    const classificationMap: Record<string, string> = {};
    for (const c of classifications as any[]) {
      classificationMap[c.boothId] = c.classification;
    }

    // Build agent map
    const agentMap: Record<string, any> = {};
    for (const a of boothAgents as any[]) {
      if (!agentMap[a.boothId]) {
        agentMap[a.boothId] = {
          name: a.name,
          isCheckedIn: !!a.checkedInAt && !a.checkedOutAt,
        };
      }
    }
    for (const ca of cadreAssignments as any[]) {
      const boothId = ca.entityId;
      if (!agentMap[boothId] && ca.cadre?.user) {
        agentMap[boothId] = {
          name: `${ca.cadre.user.firstName} ${ca.cadre.user.lastName || ''}`.trim(),
          isCheckedIn: false,
        };
      }
    }

    const moodMap: Record<string, string> = {};
    for (const m of moodReports as any[]) {
      if (!moodMap[m.boothId]) {
        moodMap[m.boothId] = m.mood;
      }
    }

    const boothStats = units.map((unit: any) => {
      return {
        boothId: unit.id,
        boothNumber: unit.number,
        boothName: unit.name,
        totalVoters: unit.totalVoters,
        voted: unit.voted,
        turnout: unit.totalVoters > 0
          ? Math.round((unit.voted / unit.totalVoters) * 1000) / 10
          : 0,
        classification: classificationMap[unit.id] || null,
        agent: agentMap[unit.id] || null,
        latestMood: moodMap[unit.id] || null,
        latitude: unit.latitude,
        longitude: unit.longitude,
      };
    });

    res.json(successResponse({
      overall: {
        totalVoters,
        totalVoted,
        turnoutPercentage,
        maleVoted,
        femaleVoted,
        otherVoted,
      },
      activeAgents,
      openIncidents: incidentsBySeverity,
      gotvProgress,
      booths: boothStats,
      recentBattleOrders,
      unitType, // tell frontend whether we're showing 'booth' or 'part' data
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get war room dashboard error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// GIS-optimized map data
router.get('/:electionId/map-data', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const electionId = req.params['electionId'] as string;

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Resolve booth units (uses Parts if booths have no voters)
    const { units, unitType } = await resolveBoothUnits(tenantDb, electionId);

    // Recent votes for pulse effect
    const recentVotes = await safeQuery(
      () => (tenantDb as any).pollDayVote.groupBy({
        by: ['boothId'],
        where: {
          electionId,
          hasVoted: true,
          votedAt: { gte: fifteenMinutesAgo },
        },
        _count: { id: true },
      }),
      []
    );

    // Agents, classifications, moods, incidents — only for booth-based
    const boothIds = unitType === 'booth' ? units.map((u: any) => u.id) : [];

    const [agents, classifications, moodReports, openIncidentBooths] = await Promise.all([
      boothIds.length > 0 ? safeQuery(
        () => (tenantDb as any).boothAgent.findMany({
          where: { electionId, isActive: true },
          select: {
            id: true, name: true, boothId: true,
            lastLatitude: true, lastLongitude: true, lastActiveAt: true,
            checkedInAt: true, checkedOutAt: true,
            booth: { select: { boothNumber: true } },
          },
        }),
        []
      ) : Promise.resolve([]),
      boothIds.length > 0 ? safeQuery(
        () => (tenantDb as any).boothClassification.findMany({
          where: { electionId },
          select: { boothId: true, classification: true },
        }),
        []
      ) : Promise.resolve([]),
      boothIds.length > 0 ? safeQuery(
        () => (tenantDb as any).agentMoodReport.findMany({
          where: { electionId },
          orderBy: { createdAt: 'desc' },
          select: { boothId: true, mood: true },
        }),
        []
      ) : Promise.resolve([]),
      safeQuery(
        () => (tenantDb as any).pollDayIncident.findMany({
          where: {
            electionId,
            status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] },
            boothId: { not: null },
          },
          select: { boothId: true },
          distinct: ['boothId'],
        }),
        []
      ),
    ]);

    const classificationMap: Record<string, string> = {};
    for (const c of classifications as any[]) {
      classificationMap[c.boothId] = c.classification;
    }

    const moodMap: Record<string, string> = {};
    for (const m of moodReports as any[]) {
      if (!moodMap[m.boothId]) {
        moodMap[m.boothId] = m.mood;
      }
    }

    const agentByBooth: Record<string, any> = {};
    for (const a of agents as any[]) {
      if (!agentByBooth[a.boothId]) {
        agentByBooth[a.boothId] = {
          name: a.name,
          isCheckedIn: !!a.checkedInAt && !a.checkedOutAt,
        };
      }
    }

    const openIncidentBoothSet = new Set(
      (openIncidentBooths as any[]).map((i: any) => i.boothId)
    );

    const pulseRateMap: Record<string, number> = {};
    for (const rv of recentVotes as any[]) {
      pulseRateMap[rv.boothId] = rv._count.id;
    }

    const boothData = units.map((unit: any) => {
      return {
        id: unit.id,
        boothNumber: unit.number,
        boothName: unit.name,
        latitude: unit.latitude,
        longitude: unit.longitude,
        totalVoters: unit.totalVoters,
        votedCount: unit.voted,
        turnoutPercent: unit.totalVoters > 0
          ? Math.round((unit.voted / unit.totalVoters) * 1000) / 10
          : 0,
        classification: classificationMap[unit.id] || null,
        agentName: agentByBooth[unit.id]?.name || null,
        agentIsCheckedIn: agentByBooth[unit.id]?.isCheckedIn || false,
        latestMood: moodMap[unit.id] || null,
        hasOpenIncident: openIncidentBoothSet.has(unit.id),
        pulseRate: pulseRateMap[unit.id] || 0,
      };
    });

    const agentData = (agents as any[]).map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      lastLatitude: agent.lastLatitude,
      lastLongitude: agent.lastLongitude,
      lastActiveAt: agent.lastActiveAt,
      isCheckedIn: !!agent.checkedInAt && !agent.checkedOutAt,
      boothNumber: agent.booth?.boothNumber || null,
    }));

    res.json(successResponse({
      booths: boothData,
      agents: agentData,
      unitType,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get map data error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Victory calculator
router.get('/:electionId/victory-calc', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const electionId = req.params['electionId'] as string;

    // Use Parts since voters are linked to parts
    const parts = await (tenantDb as any).part.findMany({
      where: { electionId },
      select: {
        id: true,
        partNumber: true,
        boothName: true,
      },
      orderBy: { partNumber: 'asc' },
    });

    const partIds = parts.map((p: any) => p.id);

    // Get all voters with their leaning
    const voters = await (tenantDb as any).voter.findMany({
      where: { electionId, deletedAt: null, partId: { in: partIds } },
      select: {
        id: true,
        partId: true,
        politicalLeaning: true,
      },
    });

    const votedVoterIds = await (tenantDb as any).pollDayVote.findMany({
      where: { electionId, hasVoted: true, voterId: { not: null } },
      select: { voterId: true },
    });

    const votedSet = new Set(votedVoterIds.map((v: any) => v.voterId));

    // Per-part calculations
    const boothCalcs: any[] = [];
    let totalLoyalVoters = 0;
    let totalLoyalVoted = 0;
    let totalSwingVoters = 0;
    let totalSwingVoted = 0;
    let totalOppositionVoters = 0;
    let totalOppositionVoted = 0;
    let totalAllVoters = 0;
    let totalAllVoted = 0;

    for (const part of parts) {
      const partVoters = voters.filter((v: any) => v.partId === part.id);
      const loyal = partVoters.filter((v: any) =>
        v.politicalLeaning === 'LOYAL' || v.politicalLeaning === 'FAVORABLE'
      );
      const swing = partVoters.filter((v: any) => v.politicalLeaning === 'SWING');
      const opposition = partVoters.filter((v: any) => v.politicalLeaning === 'OPPOSITION');

      const loyalVoted = loyal.filter((v: any) => votedSet.has(v.id)).length;
      const swingVoted = swing.filter((v: any) => votedSet.has(v.id)).length;
      const oppositionVoted = opposition.filter((v: any) => votedSet.has(v.id)).length;
      const partTotalVoted = partVoters.filter((v: any) => votedSet.has(v.id)).length;

      totalLoyalVoters += loyal.length;
      totalLoyalVoted += loyalVoted;
      totalSwingVoters += swing.length;
      totalSwingVoted += swingVoted;
      totalOppositionVoters += opposition.length;
      totalOppositionVoted += oppositionVoted;
      totalAllVoters += partVoters.length;
      totalAllVoted += partTotalVoted;

      boothCalcs.push({
        boothId: part.id,
        boothNumber: String(part.partNumber),
        boothName: part.boothName || `Part ${part.partNumber}`,
        totalVoters: partVoters.length,
        loyalVotersTotal: loyal.length,
        loyalVotersVoted: loyalVoted,
        swingVotersTotal: swing.length,
        swingVotersVoted: swingVoted,
        oppositionVotersTotal: opposition.length,
        oppositionVotersVoted: oppositionVoted,
      });
    }

    // Victory math
    const estimatedVotes = totalLoyalVoted + Math.round(totalSwingVoted * 0.5);
    const estimatedOpposition = totalOppositionVoted + Math.round(totalSwingVoted * 0.5);
    const winMargin = estimatedVotes - estimatedOpposition;

    const dataCompleteness = totalAllVoters > 0
      ? Math.round((totalAllVoted / totalAllVoters) * 100)
      : 0;
    const confidence = Math.min(dataCompleteness, 100);

    // Key swing booths/parts
    const keySwingBooths = boothCalcs.filter((b: any) => {
      const swingPct = b.totalVoters > 0 ? (b.swingVotersTotal / b.totalVoters) * 100 : 0;
      const boothVoted = b.loyalVotersVoted + b.swingVotersVoted + b.oppositionVotersVoted;
      const turnout = b.totalVoters > 0 ? (boothVoted / b.totalVoters) * 100 : 0;
      return swingPct > 10 && turnout < 50;
    }).map((b: any) => ({
      boothId: b.boothId,
      boothNumber: b.boothNumber,
      boothName: b.boothName,
      swingVoters: b.swingVotersTotal,
      turnout: b.totalVoters > 0
        ? Math.round(((b.loyalVotersVoted + b.swingVotersVoted + b.oppositionVotersVoted) / b.totalVoters) * 1000) / 10
        : 0,
    }));

    const turnoutTarget = totalAllVoters > 0 && totalLoyalVoters > 0
      ? Math.round(((totalOppositionVoters + 1) / (totalLoyalVoters + totalSwingVoters * 0.5)) * 1000) / 10
      : 0;

    res.json(successResponse({
      estimatedVotes,
      estimatedOpposition,
      winMargin,
      confidence,
      keySwingBooths,
      turnoutTarget,
      breakdown: {
        loyalVotersTotal: totalLoyalVoters,
        loyalVotersVoted: totalLoyalVoted,
        swingVotersTotal: totalSwingVoters,
        swingVotersVoted: totalSwingVoted,
        oppositionVotersTotal: totalOppositionVoters,
        oppositionVotersVoted: totalOppositionVoted,
      },
      booths: boothCalcs,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Victory calculator error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Manual snapshot trigger
router.post('/:electionId/snapshot', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const electionId = req.params['electionId'] as string;
    const snapshotTime = new Date();

    // Get parts with voter counts (since voters are linked to parts)
    const parts = await (tenantDb as any).part.findMany({
      where: { electionId },
      select: {
        id: true,
        partNumber: true,
        _count: {
          select: {
            voters: { where: { deletedAt: null } },
          },
        },
      },
    });

    // Get voted counts from PollDayVote
    const votes: any[] = await safeQuery(
      () => (tenantDb as any).pollDayVote.findMany({
        where: { electionId, hasVoted: true },
        select: {
          boothId: true,
          voter: { select: { gender: true, partId: true } },
        },
      }),
      []
    );

    // Group votes by part
    const partVoteMap: Record<string, { total: number; male: number; female: number; other: number }> = {};
    for (const v of votes) {
      const partId = v.voter?.partId;
      if (!partId) continue;
      const entry = partVoteMap[partId] ?? (partVoteMap[partId] = { total: 0, male: 0, female: 0, other: 0 });
      entry.total++;
      if (v.voter?.gender === 'MALE') entry.male++;
      else if (v.voter?.gender === 'FEMALE') entry.female++;
      else entry.other++;
    }

    const snapshotData: any[] = [];
    let electionTotalVoters = 0;
    let electionTotalVoted = 0;
    let electionMaleVoted = 0;
    let electionFemaleVoted = 0;
    let electionOtherVoted = 0;

    for (const part of parts) {
      const voterCount = part._count.voters;
      const pv = partVoteMap[part.id] || { total: 0, male: 0, female: 0, other: 0 };
      const percentage = voterCount > 0
        ? Math.round((pv.total / voterCount) * 1000) / 10
        : 0;

      snapshotData.push({
        electionId,
        boothId: null, // parts aren't booths; store at election level
        snapshotTime,
        totalVoters: voterCount,
        totalVoted: pv.total,
        maleVoted: pv.male,
        femaleVoted: pv.female,
        otherVoted: pv.other,
        percentage,
      });

      electionTotalVoters += voterCount;
      electionTotalVoted += pv.total;
      electionMaleVoted += pv.male;
      electionFemaleVoted += pv.female;
      electionOtherVoted += pv.other;
    }

    // Election-wide snapshot
    const electionPercentage = electionTotalVoters > 0
      ? Math.round((electionTotalVoted / electionTotalVoters) * 1000) / 10
      : 0;

    snapshotData.push({
      electionId,
      boothId: null,
      snapshotTime,
      totalVoters: electionTotalVoters,
      totalVoted: electionTotalVoted,
      maleVoted: electionMaleVoted,
      femaleVoted: electionFemaleVoted,
      otherVoted: electionOtherVoted,
      percentage: electionPercentage,
    });

    const created = await safeQuery(
      () => (tenantDb as any).turnoutSnapshot.createMany({ data: snapshotData }),
      { count: 0 }
    );

    res.status(201).json(successResponse({
      snapshotTime,
      boothSnapshots: parts.length,
      totalRecords: created.count,
      summary: {
        totalVoters: electionTotalVoters,
        totalVoted: electionTotalVoted,
        turnoutPercentage: electionPercentage,
        maleVoted: electionMaleVoted,
        femaleVoted: electionFemaleVoted,
        otherVoted: electionOtherVoted,
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Create snapshot error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as warRoomRoutes };
