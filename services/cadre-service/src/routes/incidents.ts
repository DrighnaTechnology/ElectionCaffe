import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  successResponse,
  errorResponse,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('cadre-service');

const router = Router();

// SLA deadlines in milliseconds by severity
const SLA_DEADLINES: Record<string, number> = {
  CRITICAL: 30 * 60 * 1000,      // 30 minutes
  HIGH: 60 * 60 * 1000,           // 1 hour
  MEDIUM: 2 * 60 * 60 * 1000,     // 2 hours
  LOW: 4 * 60 * 60 * 1000,        // 4 hours
};

// List incidents
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, boothId, status, severity, page = '1', limit = '50' } = req.query;

    if (!electionId) {
      res.status(400).json(errorResponse('E2001', 'electionId is required'));
      return;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = { electionId: electionId as string };
    if (boothId) where.boothId = boothId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [incidents, total] = await Promise.all([
      (tenantDb as any).pollDayIncident.findMany({
        where,
        include: {
          booth: {
            select: {
              boothNumber: true,
              boothName: true,
            },
          },
        },
        orderBy: [
          { severity: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limitNum,
      }),
      (tenantDb as any).pollDayIncident.count({ where }),
    ]);

    res.json(successResponse(incidents, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    }));
  } catch (error) {
    logger.error({ err: error }, 'List incidents error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create incident
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const {
      electionId,
      boothId,
      incidentType,
      severity,
      title,
      description,
      latitude,
      longitude,
      attachments,
    } = req.body;
    const reportedBy = req.headers['x-user-id'] as string;

    if (!electionId || !incidentType || !severity || !title) {
      res.status(400).json(errorResponse('E2001', 'electionId, incidentType, severity, and title are required'));
      return;
    }

    // Calculate SLA deadline based on severity
    const slaMs = SLA_DEADLINES[severity] ?? 4 * 60 * 60 * 1000;
    const slaDeadline = new Date(Date.now() + slaMs);

    const incident = await (tenantDb as any).pollDayIncident.create({
      data: {
        electionId,
        boothId: boothId || null,
        reportedBy: reportedBy || 'SYSTEM',
        incidentType,
        severity,
        title,
        description: description || null,
        status: 'OPEN',
        escalationLevel: 0,
        slaDeadline,
        latitude: latitude || null,
        longitude: longitude || null,
        attachments: attachments || null,
      },
    });

    res.status(201).json(successResponse(incident));
  } catch (error) {
    logger.error({ err: error }, 'Create incident error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update incident
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { status, assignedTo, resolution, escalationLevel, severity } = req.body;

    const existing = await (tenantDb as any).pollDayIncident.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json(errorResponse('E3001', 'Incident not found'));
      return;
    }

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (resolution !== undefined) updateData.resolution = resolution;
    if (escalationLevel !== undefined) updateData.escalationLevel = escalationLevel;
    if (severity !== undefined) {
      updateData.severity = severity;
      // Recalculate SLA deadline if severity changes
      const slaMs = SLA_DEADLINES[severity] ?? 4 * 60 * 60 * 1000;
      updateData.slaDeadline = new Date(new Date(existing.createdAt).getTime() + slaMs);
    }

    // If resolved, set resolvedAt
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await (tenantDb as any).pollDayIncident.update({
      where: { id },
      data: updateData,
    });

    res.json(successResponse(updated));
  } catch (error) {
    logger.error({ err: error }, 'Update incident error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Incident timeline
router.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const incident = await (tenantDb as any).pollDayIncident.findUnique({
      where: { id },
      include: {
        booth: {
          select: {
            boothNumber: true,
            boothName: true,
          },
        },
      },
    });

    if (!incident) {
      res.status(404).json(errorResponse('E3001', 'Incident not found'));
      return;
    }

    const now = new Date();
    const createdAt = new Date(incident.createdAt);
    const slaDeadline = new Date(incident.slaDeadline);

    // Time elapsed since creation in milliseconds
    const elapsedMs = now.getTime() - createdAt.getTime();
    const elapsedMinutes = Math.round(elapsedMs / 60000);

    // SLA status
    const slaTotalMs = slaDeadline.getTime() - createdAt.getTime();
    const slaUsedPercent = slaTotalMs > 0 ? (elapsedMs / slaTotalMs) * 100 : 100;

    let slaStatus: string;
    if (incident.status === 'RESOLVED') {
      const resolvedAt = new Date(incident.resolvedAt);
      slaStatus = resolvedAt <= slaDeadline ? 'ON_TRACK' : 'BREACHED';
    } else if (now > slaDeadline) {
      slaStatus = 'BREACHED';
    } else if (slaUsedPercent > 75) {
      slaStatus = 'AT_RISK';
    } else {
      slaStatus = 'ON_TRACK';
    }

    // Build timeline events
    const timeline: any[] = [];

    timeline.push({
      event: 'CREATED',
      timestamp: incident.createdAt,
      detail: `Reported by ${incident.reportedBy}`,
    });

    if (incident.assignedTo) {
      timeline.push({
        event: 'ASSIGNED',
        timestamp: incident.updatedAt,
        detail: `Assigned to ${incident.assignedTo}`,
      });
    }

    if (incident.escalationLevel > 0) {
      timeline.push({
        event: 'ESCALATED',
        timestamp: incident.updatedAt,
        detail: `Escalated to level ${incident.escalationLevel}`,
      });
    }

    if (incident.resolvedAt) {
      timeline.push({
        event: 'RESOLVED',
        timestamp: incident.resolvedAt,
        detail: incident.resolution || 'Resolved',
      });
    }

    res.json(successResponse({
      incident,
      elapsedMinutes,
      slaStatus,
      slaDeadline: incident.slaDeadline,
      slaUsedPercent: Math.round(slaUsedPercent * 10) / 10,
      timeline,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get incident timeline error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Incident summary
router.get('/summary/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;

    const [
      bySeverity,
      byStatus,
      byType,
      resolvedIncidents,
      allIncidents,
      boothIncidents,
    ] = await Promise.all([
      (tenantDb as any).pollDayIncident.groupBy({
        by: ['severity'],
        where: { electionId },
        _count: { id: true },
      }),
      (tenantDb as any).pollDayIncident.groupBy({
        by: ['status'],
        where: { electionId },
        _count: { id: true },
      }),
      (tenantDb as any).pollDayIncident.groupBy({
        by: ['incidentType'],
        where: { electionId },
        _count: { id: true },
      }),
      // Resolved incidents for avg resolution time
      (tenantDb as any).pollDayIncident.findMany({
        where: { electionId, status: 'RESOLVED', resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
      // All incidents for SLA compliance
      (tenantDb as any).pollDayIncident.findMany({
        where: { electionId },
        select: { createdAt: true, resolvedAt: true, slaDeadline: true, status: true },
      }),
      // Booths with most incidents
      (tenantDb as any).pollDayIncident.groupBy({
        by: ['boothId'],
        where: { electionId, boothId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Format severity counts
    const severityCounts: Record<string, number> = {};
    for (const s of bySeverity) {
      severityCounts[s.severity] = s._count.id;
    }

    // Format status counts
    const statusCounts: Record<string, number> = {};
    for (const s of byStatus) {
      statusCounts[s.status] = s._count.id;
    }

    // Format type counts
    const typeCounts: Record<string, number> = {};
    for (const t of byType) {
      typeCounts[t.incidentType] = t._count.id;
    }

    // Average resolution time in minutes
    let avgResolutionMinutes = 0;
    if (resolvedIncidents.length > 0) {
      const totalMs = resolvedIncidents.reduce((sum: number, inc: any) => {
        const created = new Date(inc.createdAt).getTime();
        const resolved = new Date(inc.resolvedAt).getTime();
        return sum + (resolved - created);
      }, 0);
      avgResolutionMinutes = Math.round(totalMs / resolvedIncidents.length / 60000);
    }

    // SLA compliance rate
    const now = new Date();
    let slaCompliant = 0;
    let slaTotal = 0;
    for (const inc of allIncidents) {
      slaTotal++;
      const deadline = new Date(inc.slaDeadline);
      if (inc.status === 'RESOLVED' && inc.resolvedAt) {
        if (new Date(inc.resolvedAt) <= deadline) slaCompliant++;
      } else if (inc.status !== 'RESOLVED' && now <= deadline) {
        slaCompliant++;
      }
    }
    const slaComplianceRate = slaTotal > 0
      ? Math.round((slaCompliant / slaTotal) * 1000) / 10
      : 100;

    // Booths with most incidents - get booth names
    const boothIdsWithIncidents = boothIncidents
      .filter((b: any) => b.boothId)
      .map((b: any) => b.boothId);

    const boothNames = boothIdsWithIncidents.length > 0
      ? await (tenantDb as any).booth.findMany({
          where: { id: { in: boothIdsWithIncidents } },
          select: { id: true, boothNumber: true, boothName: true },
        })
      : [];

    const boothNameMap: Record<string, any> = {};
    for (const b of boothNames) {
      boothNameMap[b.id] = { boothNumber: b.boothNumber, boothName: b.boothName };
    }

    const topBooths = boothIncidents
      .filter((b: any) => b.boothId)
      .map((b: any) => ({
        boothId: b.boothId,
        boothNumber: boothNameMap[b.boothId]?.boothNumber || null,
        boothName: boothNameMap[b.boothId]?.boothName || null,
        incidentCount: b._count.id,
      }));

    res.json(successResponse({
      bySeverity: severityCounts,
      byStatus: statusCounts,
      byType: typeCounts,
      avgResolutionMinutes,
      slaComplianceRate,
      boothsWithMostIncidents: topBooths,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get incident summary error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as incidentRoutes };
