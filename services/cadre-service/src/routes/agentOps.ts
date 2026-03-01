import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  successResponse,
  errorResponse,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('cadre-service');

const router = Router();

// Create a booth agent
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, boothId, name, mobile, agentType } = req.body;

    if (!electionId || !boothId || !name || !mobile) {
      res.status(400).json(errorResponse('E2001', 'electionId, boothId, name, and mobile are required'));
      return;
    }

    const agent = await (tenantDb as any).boothAgent.create({
      data: {
        electionId,
        boothId,
        name,
        mobile,
        agentType: agentType || 'POLLING',
        isActive: true,
      },
    });

    res.status(201).json(successResponse(agent));
  } catch (error: any) {
    logger.error({ err: error }, 'Create agent error');
    if (error.code === 'P2002') {
      res.status(409).json(errorResponse('E4001', 'Agent with this mobile already exists for this election'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update agent
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { name, mobile, agentType, isActive } = req.body;

    const agent = await (tenantDb as any).boothAgent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(mobile !== undefined && { mobile }),
        ...(agentType !== undefined && { agentType }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(successResponse(agent));
  } catch (error: any) {
    logger.error({ err: error }, 'Update agent error');
    if (error.code === 'P2025') {
      res.status(404).json(errorResponse('E3001', 'Agent not found'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Soft delete agent (set isActive = false)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const agent = await (tenantDb as any).boothAgent.update({
      where: { id },
      data: { isActive: false },
    });

    res.json(successResponse({ message: 'Agent deactivated successfully', agent }));
  } catch (error: any) {
    logger.error({ err: error }, 'Soft delete agent error');
    if (error.code === 'P2025') {
      res.status(404).json(errorResponse('E3001', 'Agent not found'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Bulk create agents
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, agents } = req.body;

    if (!electionId) {
      res.status(400).json(errorResponse('E2001', 'electionId is required'));
      return;
    }

    if (!Array.isArray(agents) || agents.length === 0) {
      res.status(400).json(errorResponse('E2001', 'agents array is required'));
      return;
    }

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const agentData of agents) {
      try {
        const { boothId, name, mobile, agentType } = agentData;

        if (!boothId || !name || !mobile) {
          failed++;
          errors.push(`Agent "${name || 'Unknown'}": boothId, name, and mobile are required`);
          continue;
        }

        await (tenantDb as any).boothAgent.create({
          data: {
            electionId,
            boothId,
            name,
            mobile,
            agentType: agentType || 'POLLING',
            isActive: true,
          },
        });
        created++;
      } catch (err: any) {
        failed++;
        if (err.code === 'P2002') {
          errors.push(`Agent "${agentData.name}": Mobile number already exists`);
        } else {
          errors.push(`Agent "${agentData.name}": ${err.message}`);
        }
      }
    }

    res.status(201).json(successResponse({ created, failed, errors }));
  } catch (error) {
    logger.error({ err: error }, 'Bulk create agents error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Agent check-in
router.post('/:id/check-in', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const now = new Date();

    const agent = await (tenantDb as any).boothAgent.update({
      where: { id },
      data: {
        checkedInAt: now,
        checkedOutAt: null,
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastActiveAt: now,
      },
    });

    await (tenantDb as any).agentActivity.create({
      data: {
        electionId: agent.electionId,
        agentId: id,
        activityType: 'CHECK_IN',
        boothId: agent.boothId,
        latitude,
        longitude,
      },
    });

    res.json(successResponse(agent));
  } catch (error: any) {
    logger.error({ err: error }, 'Agent check-in error');
    if (error.code === 'P2025') {
      res.status(404).json(errorResponse('E3001', 'Agent not found'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Agent check-out
router.post('/:id/check-out', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const now = new Date();

    const agent = await (tenantDb as any).boothAgent.update({
      where: { id },
      data: {
        checkedOutAt: now,
      },
    });

    await (tenantDb as any).agentActivity.create({
      data: {
        electionId: agent.electionId,
        agentId: id,
        activityType: 'CHECK_OUT',
        boothId: agent.boothId,
      },
    });

    res.json(successResponse(agent));
  } catch (error: any) {
    logger.error({ err: error }, 'Agent check-out error');
    if (error.code === 'P2025') {
      res.status(404).json(errorResponse('E3001', 'Agent not found'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Submit mood report
router.post('/:id/mood-report', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { electionId, boothId, mood, confidence, notes } = req.body;

    if (!electionId || !boothId || !mood) {
      res.status(400).json(errorResponse('E2001', 'electionId, boothId, and mood are required'));
      return;
    }

    if (!['GREEN', 'YELLOW', 'RED'].includes(mood)) {
      res.status(400).json(errorResponse('E2001', 'mood must be GREEN, YELLOW, or RED'));
      return;
    }

    const moodReport = await (tenantDb as any).agentMoodReport.create({
      data: {
        electionId,
        agentId: id,
        boothId,
        mood,
        confidence: confidence || null,
        notes: notes || null,
      },
    });

    await (tenantDb as any).agentActivity.create({
      data: {
        electionId,
        agentId: id,
        activityType: 'MOOD_REPORT',
        boothId,
        metadata: { mood },
      },
    });

    await (tenantDb as any).boothAgent.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });

    res.status(201).json(successResponse(moodReport));
  } catch (error: any) {
    logger.error({ err: error }, 'Submit mood report error');
    if (error.code === 'P2025') {
      res.status(404).json(errorResponse('E3001', 'Agent not found'));
      return;
    }
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Safe query helper
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (err.code === 'P2021' || err.code === 'P2022' || err.message?.includes('does not exist')) {
      return fallback;
    }
    throw err;
  }
}

// Agent leaderboard — uses Cadre + CadreAssignment (Parts-based)
router.get('/leaderboard/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    // Get cadres assigned to this election with their part assignments
    const cadres = await (tenantDb as any).cadre.findMany({
      where: { electionId, isActive: true },
      include: {
        user: { select: { firstName: true, lastName: true, mobile: true } },
        assignments: {
          where: { isActive: true },
          select: { entityId: true, entityType: true },
        },
      },
    });

    // Get part names for assigned entities
    const partIds = cadres.flatMap((c: any) =>
      (c.assignments || []).filter((a: any) => a.entityType === 'PART').map((a: any) => a.entityId)
    );
    const parts = partIds.length > 0
      ? await (tenantDb as any).part.findMany({
          where: { id: { in: partIds } },
          select: { id: true, partNumber: true, boothName: true },
        })
      : [];
    const partMap = new Map(parts.map((p: any) => [p.id, p]));

    const leaderboard = cadres.map((cadre: any) => {
      const assignment = cadre.assignments?.[0];
      const part = assignment ? partMap.get(assignment.entityId) : null;
      const name = `${cadre.user?.firstName || ''} ${cadre.user?.lastName || ''}`.trim() || cadre.cadreType;

      return {
        id: cadre.id,
        agentId: cadre.id,
        name,
        boothName: part?.boothName || null,
        boothNumber: part?.partNumber?.toString() || null,
        mobile: cadre.user?.mobile || null,
        votesMarked: 0,
        score: cadre.isActive ? 10 : 0,
        battleRating: null,
        lastActiveAt: cadre.updatedAt,
        latestMood: null,
      };
    });

    leaderboard.sort((a: any, b: any) => b.score - a.score);

    const ranked = leaderboard.map((entry: any, index: number) => ({
      rank: index + 1,
      ...entry,
    }));

    res.json(successResponse(ranked));
  } catch (error) {
    logger.error({ err: error }, 'Get leaderboard error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Agent GPS trail
router.get('/:id/trail', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const hours = parseInt(req.query.hours as string) || 8;

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const activities = await (tenantDb as any).agentActivity.findMany({
      where: {
        agentId: id,
        createdAt: { gte: since },
        latitude: { not: null },
      },
      select: {
        latitude: true,
        longitude: true,
        activityType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const trail = activities.map((a: any) => ({
      latitude: a.latitude,
      longitude: a.longitude,
      activityType: a.activityType,
      timestamp: a.createdAt,
    }));

    res.json(successResponse(trail));
  } catch (error) {
    logger.error({ err: error }, 'Get agent trail error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Silent agents (no activity for 30 minutes) — uses Cadre model
router.get('/silent/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const thirtyMinAgo = new Date();
    thirtyMinAgo.setMinutes(thirtyMinAgo.getMinutes() - 30);

    const cadres = await (tenantDb as any).cadre.findMany({
      where: {
        electionId,
        isActive: true,
        OR: [
          { updatedAt: { lt: thirtyMinAgo } },
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true, mobile: true } },
        assignments: {
          where: { isActive: true },
          select: { entityId: true, entityType: true },
        },
      },
    });

    // Get part names
    const partIds = cadres.flatMap((c: any) =>
      (c.assignments || []).filter((a: any) => a.entityType === 'PART').map((a: any) => a.entityId)
    );
    const parts = partIds.length > 0
      ? await (tenantDb as any).part.findMany({
          where: { id: { in: partIds } },
          select: { id: true, partNumber: true, boothName: true },
        })
      : [];
    const partMap = new Map(parts.map((p: any) => [p.id, p]));

    const now = new Date();
    const result = cadres.map((cadre: any) => {
      const assignment = cadre.assignments?.[0];
      const part = assignment ? partMap.get(assignment.entityId) : null;
      const name = `${cadre.user?.firstName || ''} ${cadre.user?.lastName || ''}`.trim();
      const minutesSilent = Math.round((now.getTime() - new Date(cadre.updatedAt).getTime()) / 60000);

      return {
        id: cadre.id,
        agentId: cadre.id,
        name,
        boothName: part?.boothName || null,
        boothNumber: part?.partNumber?.toString() || null,
        mobile: cadre.user?.mobile || null,
        lastActiveAt: cadre.updatedAt,
        minutesSilent,
      };
    });

    res.json(successResponse(result));
  } catch (error) {
    logger.error({ err: error }, 'Get silent agents error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as agentOpsRoutes };
