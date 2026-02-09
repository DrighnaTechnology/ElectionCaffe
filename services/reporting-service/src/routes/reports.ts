import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createPaginationMeta, calculateSkip, paginationSchema, toCSV, createLogger } from '@electioncaffe/shared';

const logger = createLogger('reporting-service');

const router = Router();

// Get all reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const validation = paginationSchema.safeParse(req.query);
    const { page, limit } = validation.success ? validation.data : { page: 1, limit: 10 };
    const skip = calculateSkip(page, limit);

    const where: any = {};
    if (electionId) where.electionId = electionId;

    const [reports, total] = await Promise.all([
      (tenantDb as any).report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (tenantDb as any).report.count({ where }),
    ]);

    res.json(successResponse(reports, createPaginationMeta(total, page, limit)));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get report by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const report = await (tenantDb as any).report.findUnique({
      where: { id: req.params.id },
    });

    if (!report) {
      res.status(404).json(errorResponse('E3001', 'Report not found'));
      return;
    }

    res.json(successResponse(report));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create report
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.query;
    const { reportName, reportType, format, filters, isScheduled, scheduleExpr } = req.body;
    const generatedBy = req.headers['x-user-id'] as string;

    const report = await (tenantDb as any).report.create({
      data: {
        electionId: electionId as string,
        reportName,
        reportType,
        format: format || 'PDF',
        filters: filters || {},
        isScheduled: isScheduled || false,
        scheduleExpr,
        generatedBy,
      },
    });

    // Generate report asynchronously
    generateReport(req, report.id, electionId as string, reportType, filters);

    res.status(201).json(successResponse(report));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate voter demographics report
router.get('/generate/voter-demographics/:electionId', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const { format } = req.query;

    const data = await getVoterDemographicsData(req, electionId!);

    if (format === 'csv') {
      const csv = toCSV(data.voters);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=voter_demographics.csv');
      res.send(csv);
      return;
    }

    res.json(successResponse(data));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate booth statistics report
router.get('/generate/booth-statistics/:electionId', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const { format } = req.query;

    const data = await getBoothStatisticsData(req, electionId!);

    if (format === 'csv') {
      const csv = toCSV(data.booths);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=booth_statistics.csv');
      res.send(csv);
      return;
    }

    res.json(successResponse(data));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate cadre performance report
router.get('/generate/cadre-performance/:electionId', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const { format } = req.query;

    const data = await getCadrePerformanceData(req, electionId!);

    if (format === 'csv') {
      const csv = toCSV(data.cadres);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=cadre_performance.csv');
      res.send(csv);
      return;
    }

    res.json(successResponse(data));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate scheme beneficiaries report
router.get('/generate/scheme-beneficiaries/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const { schemeId, format } = req.query;

    const where: any = { voter: { electionId, deletedAt: null } };
    if (schemeId) where.schemeId = schemeId;

    const beneficiaries = await (tenantDb as any).voterScheme.findMany({
      where,
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            epicNumber: true,
            mobile: true,
            address: true,
            part: { select: { partNumber: true, boothName: true } },
          },
        },
        scheme: { select: { schemeName: true, schemeValue: true } },
      },
    });

    const data = beneficiaries.map((b: any) => ({
      voterName: b.voter.name,
      epicNumber: b.voter.epicNumber,
      mobile: b.voter.mobile,
      address: b.voter.address,
      boothNumber: b.voter.part.partNumber,
      boothName: b.voter.part.boothName,
      schemeName: b.scheme.schemeName,
      schemeValue: b.scheme.schemeValue,
      enrollmentDate: b.enrollmentDate,
    }));

    if (format === 'csv') {
      const csv = toCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=scheme_beneficiaries.csv');
      res.send(csv);
      return;
    }

    res.json(successResponse({ beneficiaries: data, total: data.length }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate feedback summary report
router.get('/generate/feedback-summary/:electionId', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const { format } = req.query;

    const [feedbacks, byStatus, byPriority, byCategory] = await Promise.all([
      (tenantDb as any).feedbackIssue.findMany({
        where: { electionId },
        include: { part: { select: { partNumber: true, boothName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      (tenantDb as any).feedbackIssue.groupBy({
        by: ['status'],
        where: { electionId },
        _count: true,
      }),
      (tenantDb as any).feedbackIssue.groupBy({
        by: ['priority'],
        where: { electionId },
        _count: true,
      }),
      (tenantDb as any).feedbackIssue.groupBy({
        by: ['category'],
        where: { electionId },
        _count: true,
      }),
    ]);

    const data = {
      total: feedbacks.length,
      byStatus: byStatus.map((s: any) => ({ status: s.status, count: s._count })),
      byPriority: byPriority.map((p: any) => ({ priority: p.priority, count: p._count })),
      byCategory: byCategory.map((c: any) => ({ category: c.category, count: c._count })),
      issues: feedbacks.map((f: any) => ({
        issueName: f.issueName,
        category: f.category,
        status: f.status,
        priority: f.priority,
        boothNumber: f.part?.partNumber,
        boothName: f.part?.boothName,
        reportedCount: f.reportedCount,
        createdAt: f.createdAt,
      })),
    };

    if (format === 'csv') {
      const csv = toCSV(data.issues);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=feedback_summary.csv');
      res.send(csv);
      return;
    }

    res.json(successResponse(data));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete report
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    await (tenantDb as any).report.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Report deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Helper functions
async function generateReport(req: Request, reportId: string, electionId: string, reportType: string, _filters: any) {
  try {
    const tenantDb = await getTenantDb(req);

    switch (reportType) {
      case 'VOTER_DEMOGRAPHICS':
        await getVoterDemographicsData(req, electionId);
        break;
      case 'BOOTH_STATISTICS':
        await getBoothStatisticsData(req, electionId);
        break;
      case 'CADRE_PERFORMANCE':
        await getCadrePerformanceData(req, electionId);
        break;
      default:
        break;
    }

    await (tenantDb as any).report.update({
      where: { id: reportId },
      data: {
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error({ err: error, reportId }, 'Report generation failed');
  }
}

async function getVoterDemographicsData(req: Request, electionId: string) {
  const tenantDb = await getTenantDb(req);

  const voters = await (tenantDb as any).voter.findMany({
    where: { electionId, deletedAt: null },
    select: {
      id: true,
      name: true,
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
      language: { select: { languageName: true } },
    },
    take: 10000, // Limit for performance
  });

  return {
    total: voters.length,
    voters: voters.map((v: any) => ({
      name: v.name,
      epicNumber: v.epicNumber,
      gender: v.gender,
      age: v.age,
      mobile: v.mobile,
      address: v.address,
      boothNumber: v.part?.partNumber,
      boothName: v.part?.boothName,
      religion: v.religion?.religionName,
      caste: v.caste?.casteName,
      casteCategory: v.casteCategory?.categoryName,
      language: v.language?.languageName,
      politicalLeaning: v.politicalLeaning,
    })),
  };
}

async function getBoothStatisticsData(req: Request, electionId: string) {
  const tenantDb = await getTenantDb(req);

  const booths = await (tenantDb as any).part.findMany({
    where: { electionId },
    select: {
      id: true,
      partNumber: true,
      boothName: true,
      boothNameLocal: true,
      totalVoters: true,
      maleVoters: true,
      femaleVoters: true,
      otherVoters: true,
      isVulnerable: true,
      vulnerability: true,
      address: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { partNumber: 'asc' },
  });

  return {
    total: booths.length,
    booths: booths.map((b: any) => ({
      partNumber: b.partNumber,
      boothName: b.boothName,
      boothNameLocal: b.boothNameLocal,
      totalVoters: b.totalVoters,
      maleVoters: b.maleVoters,
      femaleVoters: b.femaleVoters,
      otherVoters: b.otherVoters,
      isVulnerable: b.isVulnerable,
      vulnerability: b.vulnerability,
      address: b.address,
      latitude: b.latitude,
      longitude: b.longitude,
    })),
  };
}

async function getCadrePerformanceData(req: Request, electionId: string) {
  const tenantDb = await getTenantDb(req);

  const cadres = await (tenantDb as any).cadre.findMany({
    where: { electionId },
    select: {
      id: true,
      name: true,
      mobile: true,
      role: true,
      isLoggedIn: true,
      votersUpdated: true,
      surveysCompleted: true,
      votesMarked: true,
      lastActiveAt: true,
      assignments: {
        include: { part: { select: { partNumber: true, boothName: true } } },
      },
    },
    orderBy: { votersUpdated: 'desc' },
  });

  return {
    total: cadres.length,
    cadres: cadres.map((c: any, index: number) => ({
      rank: index + 1,
      name: c.name,
      mobile: c.mobile,
      role: c.role,
      isLoggedIn: c.isLoggedIn,
      votersUpdated: c.votersUpdated,
      surveysCompleted: c.surveysCompleted,
      votesMarked: c.votesMarked,
      lastActiveAt: c.lastActiveAt,
      assignedBooths: c.assignments.map((a: any) => a.part.partNumber).join(', '),
    })),
  };
}

export { router as reportRoutes };
