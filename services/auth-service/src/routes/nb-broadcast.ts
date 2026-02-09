import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, getNotificationProvider, createLogger } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// Helper to get tenant from user
async function getTenantFromUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });
  return user?.tenant;
}

// ============================================
// PARSED NEWS ROUTES
// ============================================

// Get all parsed news for tenant
router.get('/parsed-news', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const {
      page = 1,
      limit = 20,
      status,
      sentiment,
      category,
      geographicRelevance,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const where: any = { tenantId: tenant.id };
    if (status) where.status = status;
    if (sentiment) where.sentiment = sentiment;
    if (category) where.category = category;
    if (geographicRelevance) where.geographicRelevance = geographicRelevance;

    const [parsedNews, total] = await Promise.all([
      prisma.nBParsedNews.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ relevanceScore: 'desc' }, { parsedAt: 'desc' }],
        include: {
          sourceNews: {
            select: {
              id: true,
              title: true,
              source: true,
              publishedAt: true,
            },
          },
        } as any,
      }),
      prisma.nBParsedNews.count({ where }),
    ]);

    res.json(successResponse({
      data: parsedNews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get parsed news error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Parse a news item into NB format
router.post('/parse-news/:newsId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { newsId } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Get the source news
    const news = await prisma.newsInformation.findFirst({
      where: {
        id: newsId,
        OR: [{ tenantId: tenant.id }, { tenantId: null }],
      },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    // Check if already parsed
    const existingParsed = await prisma.nBParsedNews.findFirst({
      where: { sourceNewsId: newsId, tenantId: tenant.id } as any,
    });

    if (existingParsed) {
      res.json(successResponse({ ...existingParsed, message: 'News already parsed' }));
      return;
    }

    // Create parsed news entry (AI will fill in details later)
    const parsedNews = await prisma.nBParsedNews.create({
      data: {
        tenantId: tenant.id,
        sourceNewsId: newsId,
        originalTitle: news.title,
        originalContent: news.content || news.summary || '',
        parsedTitle: news.title,
        parsedSummary: news.summary || '',
        category: news.category || 'GENERAL',
        sentiment: 'NEUTRAL',
        sentimentScore: 0,
        relevanceScore: 50,
        impactScore: 50,
        urgencyLevel: 'MEDIUM',
        geographicRelevance: news.geographicLevel || 'STATE',
        status: 'PENDING',
        extractedEntities: [],
        extractedKeywords: [],
        relatedParties: [],
        relatedCandidates: [],
        affectedAreas: [],
        parsedBy: userId,
      } as any,
      include: {
        sourceNews: {
          select: {
            id: true,
            title: true,
            source: true,
          },
        },
      } as any,
    });

    res.status(201).json(successResponse({ ...parsedNews, message: 'News queued for parsing' }));
  } catch (error) {
    logger.error({ err: error }, 'Parse news error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// AI NEWS ANALYSIS ROUTES
// ============================================

// Get all news analyses for tenant
router.get('/analyses', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const where: any = { tenantId: tenant.id };
    if (status) where.status = status;

    const [analyses, total] = await Promise.all([
      prisma.nBNewsAnalysis.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { analyzedAt: 'desc' } as any,
        include: {
          parsedNews: {
            select: {
              id: true,
              parsedTitle: true,
              category: true,
              sentiment: true,
            },
          },
        } as any,
      }),
      prisma.nBNewsAnalysis.count({ where }),
    ]);

    res.json(successResponse({
      data: analyses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get analyses error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Trigger AI analysis for parsed news
router.post('/analyze/:parsedNewsId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { parsedNewsId } = req.params;
    const { electionId } = req.body;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const parsedNews = await prisma.nBParsedNews.findFirst({
      where: { id: parsedNewsId, tenantId: tenant.id },
    });

    if (!parsedNews) {
      res.status(404).json(errorResponse('E3001', 'Parsed news not found'));
      return;
    }

    // Get tenant context for AI analysis
    const tenantContext = await getTenantContext(tenant.id, electionId);

    // Create analysis record
    const analysis = await prisma.nBNewsAnalysis.create({
      data: {
        tenantId: tenant.id,
        parsedNewsId,
        electionId,
        status: 'PENDING',
        localDemographics: tenantContext.demographics,
        casteAnalysis: tenantContext.casteAnalysis,
        partyContext: tenantContext.partyContext,
        historicalContext: tenantContext.historicalContext,
        analyzedBy: userId,
      } as any,
    });

    // Update parsed news status
    await prisma.nBParsedNews.update({
      where: { id: parsedNewsId },
      data: { status: 'PROCESSING' } as any,
    });

    res.status(201).json(successResponse({
      analysis,
      message: 'AI analysis started. Results will be available shortly.',
    }));
  } catch (error) {
    logger.error({ err: error }, 'Trigger analysis error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get analysis by ID
router.get('/analyses/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const analysis = await prisma.nBNewsAnalysis.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
        parsedNews: true,
        actionPlans: true,
        partyLines: true,
        speechPoints: true,
      } as any,
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    res.json(successResponse(analysis));
  } catch (error) {
    logger.error({ err: error }, 'Get analysis error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// ACTION PLAN ROUTES
// ============================================

// Get all action plans for tenant
router.get('/action-plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, limit = 20, targetRole, priority, status, analysisId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const where: any = { tenantId: tenant.id };
    if (targetRole) where.targetRole = targetRole;
    if (priority) where.priority = priority;
    if (status) where.status = status;
    if (analysisId) where.analysisId = analysisId;

    const [actionPlans, total] = await Promise.all([
      prisma.nBActionPlan.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] as any,
        include: {
          analysis: {
            select: {
              id: true,
              parsedNews: {
                select: { parsedTitle: true },
              },
            },
          },
          executions: {
            where: { status: { not: 'CANCELLED' } },
            select: {
              id: true,
              status: true,
              progress: true,
            },
          },
        } as any,
      }),
      prisma.nBActionPlan.count({ where }),
    ]);

    res.json(successResponse({
      data: actionPlans,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get action plans error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate action plans from analysis
router.post('/generate-action-plans/:analysisId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { analysisId } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const analysis = await prisma.nBNewsAnalysis.findFirst({
      where: { id: analysisId, tenantId: tenant.id },
      include: { parsedNews: true } as any,
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    // Generate action plans for each role level
    const roles = ['CENTRAL_COMMITTEE', 'CONSTITUENCY_HEAD', 'SECTOR_OFFICER', 'BOOTH_INCHARGE', 'VOLUNTEER'];
    const actionPlans = [];

    for (const role of roles) {
      const actionPlan = await prisma.nBActionPlan.create({
        data: {
          tenantId: tenant.id,
          analysisId,
          electionId: (analysis as any).electionId,
          targetRole: role as any,
          title: `Action Plan for ${role.replace(/_/g, ' ')}`,
          titleLocal: '',
          description: `AI-generated action plan based on news analysis`,
          priority: (analysis as any).parsedNews?.urgencyLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
          status: 'DRAFT',
          actionItems: [],
          timeline: {},
          resources: [],
          kpis: [],
          risks: [],
          dependencies: [],
          estimatedImpact: (analysis as any).parsedNews?.impactScore || 50,
          createdBy: userId,
        } as any,
      });
      actionPlans.push(actionPlan);
    }

    res.status(201).json(successResponse({
      actionPlans,
      message: `Generated ${actionPlans.length} action plans for different roles`,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Generate action plans error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Approve action plan
router.patch('/action-plans/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const actionPlan = await prisma.nBActionPlan.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!actionPlan) {
      res.status(404).json(errorResponse('E3001', 'Action plan not found'));
      return;
    }

    const updated = await prisma.nBActionPlan.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      } as any,
    });

    res.json(successResponse({ ...updated, message: 'Action plan approved' }));
  } catch (error) {
    logger.error({ err: error }, 'Approve action plan error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// PARTY LINE ROUTES
// ============================================

// Get all party lines for tenant
router.get('/party-lines', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, limit = 20, level, isActive, analysisId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const where: any = { tenantId: tenant.id };
    if (level) where.level = level;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (analysisId) where.analysisId = analysisId;

    const [partyLines, total] = await Promise.all([
      prisma.nBPartyLine.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] as any,
        include: {
          analysis: {
            select: {
              id: true,
              parsedNews: {
                select: { parsedTitle: true, category: true },
              },
            },
          },
        } as any,
      }),
      prisma.nBPartyLine.count({ where }),
    ]);

    res.json(successResponse({
      data: partyLines,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get party lines error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate party lines from analysis
router.post('/generate-party-lines/:analysisId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { analysisId } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const analysis = await prisma.nBNewsAnalysis.findFirst({
      where: { id: analysisId, tenantId: tenant.id },
      include: { parsedNews: true } as any,
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    // Generate party lines for each hierarchy level
    const levels = ['CENTRAL_COMMITTEE', 'CONSTITUENCY_HEAD', 'SECTOR_OFFICER', 'BOOTH_INCHARGE', 'VOLUNTEER'];
    const partyLines = [];

    for (const level of levels) {
      const partyLine = await prisma.nBPartyLine.create({
        data: {
          tenantId: tenant.id,
          analysisId,
          electionId: (analysis as any).electionId,
          level: level as any,
          topic: (analysis as any).parsedNews?.category || 'General',
          whatToSay: [],
          howToSay: {},
          whatNotToSay: [],
          keyMessages: [],
          keyMessagesLocal: [],
          counterPoints: [],
          counterPointsLocal: [],
          targetAudience: getTargetAudienceForLevel(level),
          toneGuidance: getToneGuidanceForLevel(level),
          localContext: {},
          priority: 5,
          isActive: false,
          createdBy: userId,
        } as any,
      });
      partyLines.push(partyLine);
    }

    res.status(201).json(successResponse({
      partyLines,
      message: `Generated ${partyLines.length} party line guidelines for different levels`,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Generate party lines error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Activate/Publish party line
router.patch('/party-lines/:id/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const partyLine = await prisma.nBPartyLine.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!partyLine) {
      res.status(404).json(errorResponse('E3001', 'Party line not found'));
      return;
    }

    const updated = await prisma.nBPartyLine.update({
      where: { id },
      data: {
        isActive: true,
        publishedAt: new Date(),
        approvedBy: userId,
        approvedAt: new Date(),
      } as any,
    });

    res.json(successResponse({ ...updated, message: 'Party line published' }));
  } catch (error) {
    logger.error({ err: error }, 'Publish party line error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// SPEECH POINTS ROUTES
// ============================================

// Get all speech points for tenant
router.get('/speech-points', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, limit = 20, pointType, priority, isApproved, analysisId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const where: any = { tenantId: tenant.id };
    if (pointType) where.pointType = pointType;
    if (priority) where.priority = priority;
    if (isApproved !== undefined) where.isApproved = isApproved === 'true';
    if (analysisId) where.analysisId = analysisId;

    const [speechPoints, total] = await Promise.all([
      prisma.nBSpeechPoint.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'asc' }, { impactScore: 'desc' }] as any,
        include: {
          analysis: {
            select: {
              id: true,
              parsedNews: {
                select: { parsedTitle: true },
              },
            },
          },
        } as any,
      }),
      prisma.nBSpeechPoint.count({ where }),
    ]);

    res.json(successResponse({
      data: speechPoints,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get speech points error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate speech points from analysis
router.post('/generate-speech-points/:analysisId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { analysisId } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const analysis = await prisma.nBNewsAnalysis.findFirst({
      where: { id: analysisId, tenantId: tenant.id },
      include: { parsedNews: true } as any,
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    // Generate different types of speech points
    const pointTypes = ['KEY_MESSAGE', 'COUNTER_NARRATIVE', 'LOCAL_ISSUE', 'SCHEME_HIGHLIGHT', 'EMOTIONAL_APPEAL', 'FACT_STAT'];
    const speechPoints = [];

    for (const pointType of pointTypes) {
      const speechPoint = await prisma.nBSpeechPoint.create({
        data: {
          tenantId: tenant.id,
          analysisId,
          electionId: (analysis as any).electionId,
          pointType: pointType as any,
          title: `${pointType.replace(/_/g, ' ')} - ${(analysis as any).parsedNews?.category || 'General'}`,
          titleLocal: '',
          content: '',
          contentLocal: '',
          priority: pointType === 'KEY_MESSAGE' ? 'MUST_MENTION' : 'RECOMMENDED',
          targetAudience: [],
          emotionalTone: 'CONFIDENT',
          supportingFacts: [],
          localRelevance: {},
          deliveryGuidance: getDeliveryGuidance(pointType),
          impactScore: (analysis as any).parsedNews?.impactScore || 50,
          isApproved: false,
          createdBy: userId,
        } as any,
      });
      speechPoints.push(speechPoint);
    }

    res.status(201).json(successResponse({
      speechPoints,
      message: `Generated ${speechPoints.length} speech points for candidate`,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Generate speech points error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Approve speech point
router.patch('/speech-points/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const speechPoint = await prisma.nBSpeechPoint.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!speechPoint) {
      res.status(404).json(errorResponse('E3001', 'Speech point not found'));
      return;
    }

    const updated = await prisma.nBSpeechPoint.update({
      where: { id },
      data: {
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date(),
      } as any,
    });

    res.json(successResponse({ ...updated, message: 'Speech point approved' }));
  } catch (error) {
    logger.error({ err: error }, 'Approve speech point error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// CAMPAIGN SPEECH ROUTES
// ============================================

// Get all campaign speeches
router.get('/campaign-speeches', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, limit = 20, status, speechType } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const where: any = { tenantId: tenant.id };
    if (status) where.status = status;
    if (speechType) where.speechType = speechType;

    const [speeches, total] = await Promise.all([
      prisma.nBCampaignSpeech.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { scheduledAt: 'desc' } as any,
        include: {
          speechPoint: {
            select: {
              id: true,
              title: true,
              pointType: true,
            },
          },
        } as any,
      }),
      prisma.nBCampaignSpeech.count({ where }),
    ]);

    res.json(successResponse({
      data: speeches,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get campaign speeches error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create campaign speech from approved speech point
router.post('/campaign-speeches', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const {
      speechPointId,
      electionId,
      speechType,
      venue,
      scheduledAt,
      targetAudience,
      estimatedAudienceSize,
      notes,
    } = req.body;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Verify speech point is approved
    const speechPoint = await prisma.nBSpeechPoint.findFirst({
      where: { id: speechPointId, tenantId: tenant.id, isApproved: true } as any,
    });

    if (!speechPoint) {
      res.status(400).json(errorResponse('E2001', 'Speech point must be approved before adding to campaign'));
      return;
    }

    const campaignSpeech = await prisma.nBCampaignSpeech.create({
      data: {
        tenantId: tenant.id,
        speechPointId,
        electionId,
        speechType: speechType || 'RALLY',
        venue: venue || '',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        targetAudience: targetAudience || [],
        estimatedAudienceSize: estimatedAudienceSize || 0,
        status: 'SCHEDULED',
        notes,
        createdBy: userId,
      } as any,
      include: {
        speechPoint: true,
      } as any,
    });

    // Mark speech point as used
    await prisma.nBSpeechPoint.update({
      where: { id: speechPointId },
      data: { usedInCampaigns: { increment: 1 } } as any,
    });

    res.status(201).json(successResponse({ ...campaignSpeech, message: 'Campaign speech created' }));
  } catch (error) {
    logger.error({ err: error }, 'Create campaign speech error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// BROADCAST ROUTES
// ============================================

// Get all broadcasts
router.get('/broadcasts', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, limit = 20, status, channel, targetLevel } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const where: any = { tenantId: tenant.id };
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (targetLevel) where.targetLevel = targetLevel;

    const [broadcasts, total] = await Promise.all([
      prisma.nBBroadcast.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          partyLine: {
            select: {
              id: true,
              topic: true,
              level: true,
            },
          },
        } as any,
      }),
      prisma.nBBroadcast.count({ where }),
    ]);

    res.json(successResponse({
      data: broadcasts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get broadcasts error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create broadcast from party line
router.post('/broadcasts', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const {
      partyLineId,
      channel,
      targetLevel,
      targetAreas,
      message,
      messageLocal,
      scheduledAt,
      priority,
    } = req.body;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Verify party line is active
    const partyLine = await prisma.nBPartyLine.findFirst({
      where: { id: partyLineId, tenantId: tenant.id, isActive: true },
    });

    if (!partyLine) {
      res.status(400).json(errorResponse('E2001', 'Party line must be active before broadcasting'));
      return;
    }

    const broadcast = await prisma.nBBroadcast.create({
      data: {
        tenantId: tenant.id,
        partyLineId,
        channel: channel || 'APP',
        targetLevel: targetLevel || partyLine.level,
        targetAreas: targetAreas || [],
        message: message || (partyLine as any).keyMessages?.join('\n\n') || '',
        messageLocal: messageLocal || (partyLine as any).keyMessagesLocal?.join('\n\n') || '',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        priority: priority || 'NORMAL',
        status: 'PENDING',
        createdBy: userId,
      } as any,
      include: {
        partyLine: true,
      } as any,
    });

    res.status(201).json(successResponse({ ...broadcast, message: 'Broadcast created' }));
  } catch (error) {
    logger.error({ err: error }, 'Create broadcast error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Send broadcast
router.post('/broadcasts/:id/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const broadcast = await prisma.nBBroadcast.findFirst({
      where: { id, tenantId: tenant.id },
    });

    if (!broadcast) {
      res.status(404).json(errorResponse('E3001', 'Broadcast not found'));
      return;
    }

    // Send broadcast notifications via configured channels
    const notifier = getNotificationProvider();
    const channels = (broadcast.channels as string[]) || [];
    // Note: Full recipient resolution from targetAudience/targetLevels requires
    // querying the voter/cadre database. For now, mark as sent and log via provider.
    if (channels.includes('sms') || channels.includes('whatsapp')) {
      await notifier.sendSMS('broadcast', `[Broadcast: ${broadcast.title}] ${(broadcast as any).message || (broadcast as any).content || ''}`);
    }
    if (channels.includes('email')) {
      await notifier.sendEmail('broadcast', broadcast.title, (broadcast as any).message || (broadcast as any).content || '');
    }

    const updated = await prisma.nBBroadcast.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentBy: userId,
      } as any,
    });

    res.json(successResponse({ ...updated, message: 'Broadcast sent successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Send broadcast error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// DASHBOARD / STATS ROUTES
// ============================================

// Get NB dashboard stats
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const [
      parsedNewsCount,
      pendingAnalysisCount,
      completedAnalysisCount,
      actionPlansCount,
      approvedActionPlansCount,
      partyLinesCount,
      activePartyLinesCount,
      speechPointsCount,
      approvedSpeechPointsCount,
      campaignSpeechesCount,
      broadcastsCount,
      sentBroadcastsCount,
    ] = await Promise.all([
      prisma.nBParsedNews.count({ where: { tenantId: tenant.id } }),
      prisma.nBNewsAnalysis.count({ where: { tenantId: tenant.id, status: 'PENDING' } }),
      prisma.nBNewsAnalysis.count({ where: { tenantId: tenant.id, status: 'COMPLETED' } }),
      prisma.nBActionPlan.count({ where: { tenantId: tenant.id } }),
      prisma.nBActionPlan.count({ where: { tenantId: tenant.id, status: 'APPROVED' } }),
      prisma.nBPartyLine.count({ where: { tenantId: tenant.id } }),
      prisma.nBPartyLine.count({ where: { tenantId: tenant.id, isActive: true } }),
      prisma.nBSpeechPoint.count({ where: { tenantId: tenant.id } }),
      prisma.nBSpeechPoint.count({ where: { tenantId: tenant.id, isApproved: true } as any }),
      prisma.nBCampaignSpeech.count({ where: { tenantId: tenant.id } }),
      prisma.nBBroadcast.count({ where: { tenantId: tenant.id } }),
      prisma.nBBroadcast.count({ where: { tenantId: tenant.id, status: 'SENT' } }),
    ]);

    // Get recent items
    const [recentParsedNews, recentAnalyses, recentActionPlans] = await Promise.all([
      prisma.nBParsedNews.findMany({
        where: { tenantId: tenant.id },
        take: 5,
        orderBy: { parsedAt: 'desc' },
        select: {
          id: true,
          parsedTitle: true,
          category: true,
          sentiment: true,
          status: true,
          parsedAt: true,
        } as any,
      }),
      prisma.nBNewsAnalysis.findMany({
        where: { tenantId: tenant.id },
        take: 5,
        orderBy: { analyzedAt: 'desc' } as any,
        select: {
          id: true,
          status: true,
          analyzedAt: true,
          parsedNews: {
            select: { parsedTitle: true },
          },
        } as any,
      }),
      prisma.nBActionPlan.findMany({
        where: { tenantId: tenant.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          targetRole: true,
          priority: true,
          status: true,
          createdAt: true,
        } as any,
      }),
    ]);

    res.json(successResponse({
      stats: {
        parsedNews: {
          total: parsedNewsCount,
        },
        analyses: {
          total: pendingAnalysisCount + completedAnalysisCount,
          pending: pendingAnalysisCount,
          completed: completedAnalysisCount,
        },
        actionPlans: {
          total: actionPlansCount,
          approved: approvedActionPlansCount,
        },
        partyLines: {
          total: partyLinesCount,
          active: activePartyLinesCount,
        },
        speechPoints: {
          total: speechPointsCount,
          approved: approvedSpeechPointsCount,
        },
        campaignSpeeches: {
          total: campaignSpeechesCount,
        },
        broadcasts: {
          total: broadcastsCount,
          sent: sentBroadcastsCount,
        },
      },
      recent: {
        parsedNews: recentParsedNews,
        analyses: recentAnalyses,
        actionPlans: recentActionPlans,
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get NB dashboard error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getTenantContext(tenantId: string, electionId?: string) {
  // Get tenant demographics and context for AI analysis
  // Tenant lookup reserved for future use
  await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  let demographics: any = {};
  let casteAnalysis: any = {};
  let partyContext: any = {};
  let historicalContext: any = {};

  if (electionId) {
    // Get election-specific data
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        parts: {
          select: { id: true, partNo: true, partName: true } as any,
          take: 100,
        },
      } as any,
    });

    if (election) {
      demographics = {
        state: election.state,
        district: election.district,
        constituency: (election as any).constituencyName,
        totalParts: election.totalParts,
        totalVoters: election.totalVoters,
      };
    }

    // Get caste category distribution if available
    const casteCategories = await prisma.casteCategory.findMany({
      where: { electionId },
      include: {
        castes: {
          select: { id: true, name: true },
        },
      } as any,
    });

    casteAnalysis = {
      categories: casteCategories.map((c: any) => ({
        name: c.name,
        castes: c.castes?.map((caste: any) => caste.name) || [],
      })),
    };

    // Get party information
    const parties = await prisma.party.findMany({
      where: { electionId },
      select: { id: true, name: true, symbol: true } as any,
    });

    partyContext = {
      parties: parties.map((p: any) => ({
        name: p.name,
        symbol: p.symbol,
      })),
    };
  }

  return {
    demographics,
    casteAnalysis,
    partyContext,
    historicalContext,
  };
}

function getTargetAudienceForLevel(level: string): string[] {
  const audiences: Record<string, string[]> = {
    CENTRAL_COMMITTEE: ['Senior Leaders', 'State Presidents', 'Policy Makers'],
    CONSTITUENCY_HEAD: ['MLA/MP Candidates', 'Constituency Leaders', 'Core Committee'],
    SECTOR_OFFICER: ['Zone Heads', 'Mandal Presidents', 'District Coordinators'],
    BOOTH_INCHARGE: ['Booth Workers', 'Polling Agents', 'Local Leaders'],
    VOLUNTEER: ['Ground Workers', 'Voters', 'Community Members'],
  };
  return audiences[level] || [];
}

function getToneGuidanceForLevel(level: string): string {
  const guidance: Record<string, string> = {
    CENTRAL_COMMITTEE: 'Authoritative, strategic, policy-focused',
    CONSTITUENCY_HEAD: 'Leadership-oriented, motivational, locally relevant',
    SECTOR_OFFICER: 'Instructional, practical, action-oriented',
    BOOTH_INCHARGE: 'Clear, simple, task-focused',
    VOLUNTEER: 'Friendly, conversational, relatable',
  };
  return guidance[level] || 'Clear and professional';
}

function getDeliveryGuidance(pointType: string): string {
  const guidance: Record<string, string> = {
    KEY_MESSAGE: 'Deliver with confidence and clarity. Repeat key phrases for emphasis.',
    COUNTER_NARRATIVE: 'Use facts firmly but avoid aggressive tone. Stay positive.',
    LOCAL_ISSUE: 'Connect personally with audience. Use local examples and names.',
    SCHEME_HIGHLIGHT: 'Be specific with numbers and benefits. Use success stories.',
    EMOTIONAL_APPEAL: 'Speak from the heart. Pause for effect. Connect with shared values.',
    FACT_STAT: 'State clearly and confidently. Cite sources when possible.',
  };
  return guidance[pointType] || 'Deliver clearly and confidently';
}

export { router as nbBroadcastRoutes };
