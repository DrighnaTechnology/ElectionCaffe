import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';
import { withCreditCheck } from '../utils/ai-credit-gate.js';

const logger = createLogger('ai-analytics-service');
const router = Router();

// ============================================
// OPENAI HELPER
// ============================================

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// Normalize DB rows to match field names expected by the frontend
function normalizeParsedNews(item: any) {
  return { ...item, parsedTitle: item.title, parsedAt: item.createdAt, parsedSummary: item.summary, status: item.isProcessed ? 'ANALYZED' : 'PENDING' };
}

function normalizeAnalysis(item: any) {
  return { ...item, analyzedAt: item.createdAt, status: 'COMPLETED', parsedNews: item.news ? { ...item.news, parsedTitle: item.news.title } : null };
}

function normalizeActionPlan(item: any) {
  const meta = (item.assignedTo as any) || {};
  return { ...item, targetRole: meta.role || 'GENERAL', actionItems: meta.tasks || [], timeline: meta.timeline || '', priority: (item.priority || 'medium').toUpperCase() };
}

function normalizePartyLine(item: any) {
  const refs = Array.isArray(item.sourceRefs) ? item.sourceRefs : [];
  const level = refs[0]?.level || '';
  const talkingPoints = Array.isArray(item.talkingPoints) ? item.talkingPoints : [];
  const counterPoints = Array.isArray(item.counterPoints) ? item.counterPoints : [];
  // tone is stored in sourceRefs alongside level, or fallback to partyLine field
  const tone = refs[0]?.tone || '';
  return {
    ...item,
    level,
    whatToSay: talkingPoints,
    whatNotToSay: counterPoints,
    toneGuidance: tone || item.partyLine || '',
  };
}

function normalizeSpeechPoint(item: any) {
  const meta = (item.tags as any) || {};
  return { ...item, pointType: item.category, isApproved: item.isActive, impactScore: meta.impactScore || 50, supportingFacts: meta.supportingFacts || [], deliveryGuidance: meta.deliveryTips || '' };
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
  const completion = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  return JSON.parse(completion.choices[0]?.message?.content || '{}');
}

// ============================================
// PARSED NEWS ROUTES
// Actual schema: NBParsedNews { id, tenantId, originalUrl, title, content, summary,
//   source, publishedAt, language, category, sentiment, relevanceScore, entities,
//   keywords, imageUrl, isProcessed, createdAt, updatedAt }
// ============================================

router.get('/parsed-news', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { page = 1, limit = 20, category, sentiment } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (category) where.category = category;
    if (sentiment) where.sentiment = sentiment;

    const [data, total] = await Promise.all([
      tenantDb.nBParsedNews.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ relevanceScore: 'desc' }, { createdAt: 'desc' }],
      }),
      tenantDb.nBParsedNews.count({ where }),
    ]);

    res.json(successResponse({ data: data.map(normalizeParsedNews), pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } }));
  } catch (error) {
    logger.error({ err: error }, 'Get parsed news error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Parse a news item using AI — takes newsId from newsInformation table
router.post('/parse-news/:newsId', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { newsId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    // Get source news from newsInformation
    const news = await tenantDb.newsInformation.findFirst({
      where: { id: newsId },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    // Check if already parsed (use originalUrl to store the source newsId as a link)
    const existing = await tenantDb.nBParsedNews.findFirst({
      where: { tenantId, originalUrl: `news://${newsId}` },
    });

    if (existing) {
      res.json(successResponse({ ...normalizeParsedNews(existing), message: 'News already parsed' }));
      return;
    }

    // AI parse (with credit check)
    let aiResult: any = {};
    let parseCreditInfo: { creditsUsed: number; creditsRemaining: number } | null = null;
    try {
      const creditResult = await withCreditCheck({
        tenantDb, tenantId, userId,
        featureKey: 'nb_parse_news',
        callAI: async () => {
          const systemPromptText = `You are a political news analyst for Indian elections. Analyze the news and return JSON:
{
  "summary": "2-3 sentence electoral relevance summary",
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED",
  "relevanceScore": 0-100,
  "entities": ["politicians, parties, govt bodies mentioned"],
  "keywords": ["5-10 key political keywords"],
  "category": "one of: ELECTION | POLITICAL | POLICY | ECONOMIC | SOCIAL | CONTROVERSY"
}`;
          const completion = await getOpenAI().chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o',
            messages: [
              { role: 'system', content: systemPromptText },
              { role: 'user', content: `Title: ${news.title}\nContent: ${news.content || news.summary || ''}` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          });
          const content = completion.choices[0]?.message?.content || '{}';
          return {
            output: content,
            tokens: {
              input: completion.usage?.prompt_tokens || 0,
              output: completion.usage?.completion_tokens || 0,
            },
          };
        },
      });
      aiResult = JSON.parse(creditResult.output);
      parseCreditInfo = { creditsUsed: creditResult.creditsUsed, creditsRemaining: creditResult.creditsRemaining };
    } catch (aiErr: any) {
      if (aiErr.statusCode === 403) {
        res.status(403).json(errorResponse('E4003', aiErr.message));
        return;
      }
      logger.warn({ err: aiErr }, 'OpenAI parse failed, using defaults');
    }

    const parsed = await tenantDb.nBParsedNews.create({
      data: {
        tenantId,
        originalUrl: `news://${newsId}`,
        title: news.title,
        content: news.content || news.summary || '',
        summary: aiResult.summary || news.summary || '',
        source: news.sourceName || news.source || '',
        publishedAt: news.publishedAt || null,
        category: aiResult.category || news.category || 'POLITICAL',
        sentiment: aiResult.sentiment || 'NEUTRAL',
        relevanceScore: aiResult.relevanceScore || 50,
        entities: aiResult.entities || [],
        keywords: aiResult.keywords || [],
        isProcessed: true,
      } as any,
    });

    res.status(201).json(successResponse({ ...normalizeParsedNews(parsed), message: 'News parsed successfully', ...(parseCreditInfo && { creditsUsed: parseCreditInfo.creditsUsed, creditsRemaining: parseCreditInfo.creditsRemaining }) }));
  } catch (error) {
    logger.error({ err: error }, 'Parse news error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// AI NEWS ANALYSIS ROUTES
// Actual schema: NBNewsAnalysis { id, tenantId, newsId, analysisType, analysis (JSON),
//   confidence, createdAt, updatedAt }
// All AI analysis data lives inside the `analysis` JSON field
// ============================================

router.get('/analyses', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      tenantDb.nBNewsAnalysis.findMany({
        where: { tenantId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { news: { select: { id: true, title: true, category: true, sentiment: true } } },
      }),
      tenantDb.nBNewsAnalysis.count({ where: { tenantId } }),
    ]);

    res.json(successResponse({ data: data.map(normalizeAnalysis), pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } }));
  } catch (error) {
    logger.error({ err: error }, 'Get analyses error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.get('/analyses/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const analysis = await tenantDb.nBNewsAnalysis.findFirst({
      where: { id, tenantId },
      include: { news: true },
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    res.json(successResponse(normalizeAnalysis(analysis)));
  } catch (error) {
    logger.error({ err: error }, 'Get analysis error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Trigger AI analysis for parsed news — parsedNewsId is NBParsedNews.id
router.post('/analyze/:parsedNewsId', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { parsedNewsId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const parsedNews = await tenantDb.nBParsedNews.findFirst({
      where: { id: parsedNewsId, tenantId },
    });

    if (!parsedNews) {
      res.status(404).json(errorResponse('E3001', 'Parsed news not found'));
      return;
    }

    let aiResult: any = {};
    try {
      aiResult = await callOpenAI(
        `You are a senior political strategist for an Indian election campaign. Analyze this news from an electoral strategy perspective and return JSON:
{
  "electoralImpact": "how this news affects the election",
  "strategicRecommendations": ["3-5 specific actionable campaign recommendations"],
  "counterStrategies": ["how to counter negative or leverage positive news"],
  "riskAssessment": "risk if campaign ignores this",
  "opportunityAssessment": "opportunity this creates",
  "keyTalkingPoints": ["5 talking points for campaign workers"],
  "voterSegmentsAffected": ["voter segments most affected"],
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`,
        `Title: ${parsedNews.title}\nSummary: ${parsedNews.summary || ''}\nSentiment: ${parsedNews.sentiment || 'NEUTRAL'}\nKeywords: ${JSON.stringify(parsedNews.keywords)}`
      );
    } catch (aiErr) {
      logger.warn({ err: aiErr }, 'OpenAI analysis failed');
    }

    const analysis = await tenantDb.nBNewsAnalysis.create({
      data: {
        tenantId,
        newsId: parsedNewsId,
        analysisType: 'ELECTORAL_ANALYSIS',
        analysis: aiResult,
        confidence: aiResult.urgency === 'CRITICAL' ? 0.95 : aiResult.urgency === 'HIGH' ? 0.85 : 0.75,
      },
    });

    res.status(201).json(successResponse({ analysis: normalizeAnalysis(analysis), message: 'AI analysis completed' }));
  } catch (error) {
    logger.error({ err: error }, 'Trigger analysis error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// ACTION PLAN ROUTES
// Actual schema: NBActionPlan { id, tenantId, title, description, priority (string),
//   dueDate, assignedTo (JSON), status, completedAt, createdBy, createdAt, updatedAt }
// ============================================

router.get('/action-plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { page = 1, limit = 20, status, priority } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [data, total] = await Promise.all([
      tenantDb.nBActionPlan.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      tenantDb.nBActionPlan.count({ where }),
    ]);

    res.json(successResponse({ data: data.map(normalizeActionPlan), pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } }));
  } catch (error) {
    logger.error({ err: error }, 'Get action plans error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate action plans from analysis using AI
// analysisId = NBNewsAnalysis.id
router.post('/generate-action-plans/:analysisId', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { analysisId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const analysis = await tenantDb.nBNewsAnalysis.findFirst({
      where: { id: analysisId, tenantId },
      include: { news: true },
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    const analysisData = analysis.analysis as any;
    const newsTitle = analysis.news?.title || '';
    const context = `News: ${newsTitle}\nElectoral Impact: ${analysisData?.electoralImpact || ''}\nRecommendations: ${(analysisData?.strategicRecommendations || []).join('; ')}`;

    const roles = ['CENTRAL_COMMITTEE', 'CONSTITUENCY_HEAD', 'SECTOR_OFFICER', 'BOOTH_INCHARGE', 'VOLUNTEER'];
    const actionPlans = [];

    for (const role of roles) {
      let aiResult: any = {};
      try {
        aiResult = await callOpenAI(
          `Create an action plan for a ${role} in an Indian election campaign. Return JSON:
{
  "title": "specific action plan title",
  "description": "what this role must do (2-3 sentences)",
  "tasks": ["5-7 specific concrete tasks"],
  "timeline": "when to complete (e.g. next 48 hours / this week)",
  "priority": "low" | "medium" | "high" | "critical"
}`,
          `Role: ${role}\n${context}`
        );
      } catch (aiErr) {
        logger.warn({ err: aiErr, role }, 'OpenAI action plan generation failed');
      }

      const plan = await tenantDb.nBActionPlan.create({
        data: {
          tenantId,
          title: aiResult.title || `Action Plan — ${role}`,
          description: aiResult.description || '',
          priority: aiResult.priority || 'medium',
          status: 'pending',
          assignedTo: { role, analysisId, tasks: aiResult.tasks || [], timeline: aiResult.timeline || '' },
          createdBy: userId,
        } as any,
      });
      actionPlans.push(plan);
    }

    res.status(201).json(successResponse({ actionPlans: actionPlans.map(normalizeActionPlan), message: `Generated ${actionPlans.length} AI-powered action plans` }));
  } catch (error) {
    logger.error({ err: error }, 'Generate action plans error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.patch('/action-plans/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const plan = await tenantDb.nBActionPlan.findFirst({ where: { id, tenantId } });
    if (!plan) { res.status(404).json(errorResponse('E3001', 'Action plan not found')); return; }

    const updated = await tenantDb.nBActionPlan.update({
      where: { id },
      data: { status: 'approved' },
    });

    res.json(successResponse({ ...updated, message: 'Action plan approved' }));
  } catch (error) {
    logger.error({ err: error }, 'Approve action plan error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// PARTY LINE ROUTES
// Actual schema: NBPartyLine { id, tenantId, topic, partyLine, talkingPoints (JSON),
//   counterPoints (JSON), sourceRefs (JSON), isActive, validFrom, validUntil,
//   createdBy, createdAt, updatedAt }
// ============================================

router.get('/party-lines', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { page = 1, limit = 20, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [data, total] = await Promise.all([
      tenantDb.nBPartyLine.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      tenantDb.nBPartyLine.count({ where }),
    ]);

    res.json(successResponse({ data: data.map(normalizePartyLine), pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } }));
  } catch (error) {
    logger.error({ err: error }, 'Get party lines error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate party lines from analysis using AI
router.post('/generate-party-lines/:analysisId', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { analysisId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const analysis = await tenantDb.nBNewsAnalysis.findFirst({
      where: { id: analysisId, tenantId },
      include: { news: true },
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    const analysisData = analysis.analysis as any;
    const context = `News: ${analysis.news?.title || ''}\nTalking Points: ${(analysisData?.keyTalkingPoints || []).join('; ')}\nCounter Strategies: ${(analysisData?.counterStrategies || []).join('; ')}`;

    const levels = ['CENTRAL_COMMITTEE', 'CONSTITUENCY_HEAD', 'SECTOR_OFFICER', 'BOOTH_INCHARGE', 'VOLUNTEER'];
    const partyLines = [];

    for (const level of levels) {
      let aiResult: any = {};
      try {
        aiResult = await callOpenAI(
          `Create party messaging guidelines for the ${level} level in an Indian election campaign. Return JSON:
{
  "topic": "one-line topic",
  "partyLine": "the official party position/stance on this issue (2-3 sentences)",
  "talkingPoints": ["4-5 key points to communicate"],
  "counterPoints": ["3-4 responses to likely opposition arguments"],
  "tone": "brief tone guidance"
}`,
          `Level: ${level}\n${context}`
        );
      } catch (aiErr) {
        logger.warn({ err: aiErr, level }, 'OpenAI party line generation failed');
      }

      const partyLine = await tenantDb.nBPartyLine.create({
        data: {
          tenantId,
          topic: aiResult.topic || analysis.news?.category || 'General',
          partyLine: aiResult.partyLine || '',
          talkingPoints: aiResult.talkingPoints || [],
          counterPoints: aiResult.counterPoints || [],
          sourceRefs: [{ analysisId, level, tone: aiResult.tone || '' }],
          isActive: false,
          createdBy: userId,
        } as any,
      });
      partyLines.push(partyLine);
    }

    res.status(201).json(successResponse({ partyLines: partyLines.map(normalizePartyLine), message: `Generated ${partyLines.length} AI-powered party line guidelines` }));
  } catch (error) {
    logger.error({ err: error }, 'Generate party lines error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.patch('/party-lines/:id/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const line = await tenantDb.nBPartyLine.findFirst({ where: { id, tenantId } });
    if (!line) { res.status(404).json(errorResponse('E3001', 'Party line not found')); return; }

    const updated = await tenantDb.nBPartyLine.update({
      where: { id },
      data: { isActive: true },
    });

    res.json(successResponse({ ...updated, message: 'Party line published' }));
  } catch (error) {
    logger.error({ err: error }, 'Publish party line error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// SPEECH POINTS ROUTES
// Actual schema: NBSpeechPoint { id, tenantId, category, title, content, language,
//   targetAudience, tags (JSON), usageCount, isActive, createdBy, createdAt, updatedAt }
// ============================================

router.get('/speech-points', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { page = 1, limit = 20, category, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [data, total] = await Promise.all([
      tenantDb.nBSpeechPoint.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      tenantDb.nBSpeechPoint.count({ where }),
    ]);

    res.json(successResponse({ data: data.map(normalizeSpeechPoint), pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } }));
  } catch (error) {
    logger.error({ err: error }, 'Get speech points error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate speech points from analysis using AI
router.post('/generate-speech-points/:analysisId', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { analysisId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const analysis = await tenantDb.nBNewsAnalysis.findFirst({
      where: { id: analysisId, tenantId },
      include: { news: true },
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    const analysisData = analysis.analysis as any;
    const context = `News: ${analysis.news?.title || ''}\nElectoral Impact: ${analysisData?.electoralImpact || ''}\nTalking Points: ${(analysisData?.keyTalkingPoints || []).join('; ')}`;

    const speechTypes = [
      { category: 'KEY_MESSAGE', audience: 'General voters' },
      { category: 'COUNTER_NARRATIVE', audience: 'Swing voters' },
      { category: 'LOCAL_ISSUE', audience: 'Local community' },
      { category: 'SCHEME_HIGHLIGHT', audience: 'Beneficiaries' },
      { category: 'EMOTIONAL_APPEAL', audience: 'Youth and women' },
      { category: 'FACT_STAT', audience: 'Educated voters' },
    ];
    const speechPoints = [];

    for (const { category, audience } of speechTypes) {
      let aiResult: any = {};
      try {
        aiResult = await callOpenAI(
          `Write a ${category.replace(/_/g, ' ')} speech point for an Indian election candidate targeting ${audience}. Return JSON:
{
  "title": "catchy title",
  "content": "what the candidate should say (3-4 sentences, natural spoken language)",
  "supportingFacts": ["2-3 facts or statistics"],
  "deliveryTips": "how to deliver this (pace, emphasis, tone)"
}`,
          `Target Audience: ${audience}\n${context}`
        );
      } catch (aiErr) {
        logger.warn({ err: aiErr, category }, 'OpenAI speech point generation failed');
      }

      const sp = await tenantDb.nBSpeechPoint.create({
        data: {
          tenantId,
          category,
          title: aiResult.title || `${category.replace(/_/g, ' ')} — ${analysis.news?.category || 'General'}`,
          content: aiResult.content || '',
          targetAudience: audience,
          tags: { analysisId, supportingFacts: aiResult.supportingFacts || [], deliveryTips: aiResult.deliveryTips || '' },
          isActive: false,
          createdBy: userId,
        } as any,
      });
      speechPoints.push(sp);
    }

    res.status(201).json(successResponse({ speechPoints: speechPoints.map(normalizeSpeechPoint), message: `Generated ${speechPoints.length} AI-powered speech points` }));
  } catch (error) {
    logger.error({ err: error }, 'Generate speech points error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.patch('/speech-points/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const sp = await tenantDb.nBSpeechPoint.findFirst({ where: { id, tenantId } });
    if (!sp) { res.status(404).json(errorResponse('E3001', 'Speech point not found')); return; }

    const updated = await tenantDb.nBSpeechPoint.update({
      where: { id },
      data: { isActive: true },
    });

    res.json(successResponse({ ...updated, message: 'Speech point approved' }));
  } catch (error) {
    logger.error({ err: error }, 'Approve speech point error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// BROADCAST ROUTES
// Actual schema: NBBroadcast { id, tenantId, title, content, broadcastType,
//   targetAudience (JSON), channels (JSON), scheduledAt, sentAt, status,
//   recipientCount, deliveredCount, readCount, createdBy, createdAt, updatedAt }
// ============================================

// Generate AI broadcast suggestion from analysis + action plans + party lines
router.post('/generate-broadcast/:analysisId', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { analysisId } = req.params;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    // Fetch analysis with news
    const analysis = await tenantDb.nBNewsAnalysis.findFirst({
      where: { id: analysisId, tenantId },
      include: { news: true },
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    // Fetch related action plans and party lines (those referencing this analysisId in JSON)
    const [allActionPlans, allPartyLines] = await Promise.all([
      tenantDb.nBActionPlan.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      tenantDb.nBPartyLine.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    // Filter to those related to this analysis
    const relatedActionPlans = allActionPlans.filter((p: any) => {
      const meta = (p.assignedTo as any) || {};
      return meta.analysisId === analysisId;
    });
    const relatedPartyLines = allPartyLines.filter((l: any) => {
      const refs = Array.isArray(l.sourceRefs) ? l.sourceRefs : [];
      return refs.some((r: any) => r.analysisId === analysisId);
    });

    const analysisData = analysis.analysis as any;
    const newsTitle = analysis.news?.title || '';
    const electoralImpact = analysisData?.electoralImpact || '';
    const recommendations = (analysisData?.strategicRecommendations || []).join('; ');
    const talkingPoints = (analysisData?.keyTalkingPoints || []).join('; ');

    const actionPlanSummary = relatedActionPlans.slice(0, 3).map((p: any) => {
      const meta = (p.assignedTo as any) || {};
      const tasks = (meta.tasks || []).slice(0, 3).join(', ');
      return `${meta.role || 'General'}: ${p.title} — Tasks: ${tasks}`;
    }).join('\n');

    const partyLineSummary = relatedPartyLines.slice(0, 3).map((l: any) => {
      const refs = Array.isArray(l.sourceRefs) ? l.sourceRefs : [];
      const level = refs[0]?.level || '';
      const points = Array.isArray(l.talkingPoints) ? l.talkingPoints.slice(0, 2).join(', ') : '';
      return `${level}: ${l.topic} — ${points}`;
    }).join('\n');

    let aiResult: any = {};
    try {
      aiResult = await callOpenAI(
        `You are a senior election campaign communications director for an Indian election. Based on the AI research provided, generate a broadcast message for campaign workers. Return JSON:
{
  "title": "broadcast title (concise, action-oriented)",
  "content": "main broadcast content (3-4 paragraphs) covering: key news, electoral impact, what workers should do, key talking points to use with voters",
  "summary": "one-line broadcast summary for preview",
  "broadcastType": "CAMPAIGN_UPDATE" | "ALERT" | "STRATEGY" | "MOBILIZATION",
  "targetAudience": ["CENTRAL_COMMITTEE", "CONSTITUENCY_HEAD", "SECTOR_OFFICER", "BOOTH_INCHARGE", "VOLUNTEER"],
  "channels": ["APP", "SMS", "WHATSAPP"],
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "callToAction": "specific action workers should take immediately"
}`,
        `News: ${newsTitle}
Electoral Impact: ${electoralImpact}
Strategic Recommendations: ${recommendations}
Key Talking Points: ${talkingPoints}
Action Plans Summary:
${actionPlanSummary || 'No action plans yet'}
Party Lines Summary:
${partyLineSummary || 'No party lines yet'}`
      );
    } catch (aiErr) {
      logger.warn({ err: aiErr }, 'OpenAI broadcast generation failed, using defaults');
      aiResult = {
        title: `Campaign Update — ${newsTitle}`,
        content: `Important campaign update regarding: ${newsTitle}.\n\nElectoral Impact: ${electoralImpact}\n\nRecommendations: ${recommendations}\n\nKey Talking Points: ${talkingPoints}`,
        summary: `Campaign update on: ${newsTitle}`,
        broadcastType: 'CAMPAIGN_UPDATE',
        targetAudience: ['CENTRAL_COMMITTEE', 'CONSTITUENCY_HEAD', 'SECTOR_OFFICER', 'BOOTH_INCHARGE', 'VOLUNTEER'],
        channels: ['APP'],
        urgency: 'MEDIUM',
        callToAction: 'Review and distribute to your team',
      };
    }

    const broadcast = await tenantDb.nBBroadcast.create({
      data: {
        tenantId,
        title: aiResult.title || `Campaign Broadcast — ${newsTitle}`,
        content: aiResult.content || '',
        broadcastType: aiResult.broadcastType || 'CAMPAIGN_UPDATE',
        targetAudience: { segments: aiResult.targetAudience || [], callToAction: aiResult.callToAction || '', urgency: aiResult.urgency || 'MEDIUM', summary: aiResult.summary || '', analysisId },
        channels: aiResult.channels || ['APP'],
        scheduledAt: new Date(),
        status: 'draft',
        createdBy: userId,
      },
    });

    res.status(201).json(successResponse({ broadcast, message: 'AI broadcast suggestion generated', aiSuggestion: { urgency: aiResult.urgency, callToAction: aiResult.callToAction, summary: aiResult.summary } }));
  } catch (error) {
    logger.error({ err: error }, 'Generate broadcast error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.get('/broadcasts', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      tenantDb.nBBroadcast.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      tenantDb.nBBroadcast.count({ where }),
    ]);

    res.json(successResponse({ data, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } }));
  } catch (error) {
    logger.error({ err: error }, 'Get broadcasts error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/broadcasts', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { title, content, broadcastType, targetAudience, channels, scheduledAt } = req.body;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const broadcast = await tenantDb.nBBroadcast.create({
      data: {
        tenantId,
        title: title || 'Campaign Broadcast',
        content: content || '',
        broadcastType: broadcastType || 'GENERAL',
        targetAudience: targetAudience || {},
        channels: channels || ['APP'],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: 'draft',
        createdBy: userId,
      },
    });

    res.status(201).json(successResponse({ ...broadcast, message: 'Broadcast created' }));
  } catch (error) {
    logger.error({ err: error }, 'Create broadcast error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Patch broadcast fields (title, content, channels) before sending
router.patch('/broadcasts/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { title, content, channels } = req.body;

    const broadcast = await tenantDb.nBBroadcast.findFirst({ where: { id, tenantId } });
    if (!broadcast) { res.status(404).json(errorResponse('E3001', 'Broadcast not found')); return; }

    const updated = await tenantDb.nBBroadcast.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(channels !== undefined ? { channels } : {}),
      },
    });

    res.json(successResponse({ ...updated, message: 'Broadcast updated' }));
  } catch (error) {
    logger.error({ err: error }, 'Update broadcast error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/broadcasts/:id/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const broadcast = await tenantDb.nBBroadcast.findFirst({ where: { id, tenantId } });
    if (!broadcast) { res.status(404).json(errorResponse('E3001', 'Broadcast not found')); return; }

    const updated = await tenantDb.nBBroadcast.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() } as any,
    });

    res.json(successResponse({ ...updated, message: 'Broadcast sent successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Send broadcast error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// AI THEME GENERATOR (2 credits per call)
// ============================================

router.post('/generate-theme', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      res.status(400).json(errorResponse('E4002', 'A descriptive prompt is required'));
      return;
    }

    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const systemPrompt = `You are an expert UI/UX designer specialising in election management software. Generate a complete colour theme based on the user's description.

Return ONLY valid JSON matching this exact shape (no comments, no extra fields):
{
  "mode": "light" | "dark",
  "radius": <number 0.25–1.5>,
  "brandPrimary": "<hex>",
  "brandMuted": "<hex — lighter tint of brandPrimary>",
  "brandSecondary": "<hex — complementary accent>",
  "background": "<hex — main page bg>",
  "surface": "<hex — card/panel bg, slightly different from background>",
  "foreground": "<hex — primary text>",
  "mutedFg": "<hex — secondary/muted text>",
  "cardForeground": "<hex — text on cards>",
  "border": "<hex — borders and dividers>",
  "input": "<hex — input field bg>",
  "sidebarBg": "<hex>",
  "sidebarFg": "<hex>",
  "sidebarFgActive": "<hex>",
  "sidebarBorder": "<hex>",
  "sidebarActiveBg": "<hex>",
  "sidebarHoverBg": "<hex>",
  "cardShadow": "none" | "sm" | "md" | "lg" | "xl",
  "cardBorder": true | false,
  "cardBorderRadius": <number 0.25–1.5>,
  "fontFamily": "inter" | "geist" | "system" | "poppins" | "nunito",
  "fontScale": 0.875 | 1.0 | 1.0625 | 1.125,
  "density": "compact" | "default" | "comfortable",
  "themeName": "<short catchy name for this theme>",
  "themeDescription": "<one sentence describing the visual style>"
}

Rules:
- All hex values must be valid 6-digit hex codes (e.g. #1a2b3c)
- Ensure sufficient contrast between foreground and background (WCAG AA minimum)
- The sidebar should feel visually distinct from the main content area
- Dark mode: backgrounds should be dark (#0f0f0f–#2a2a3a range), text should be light
- Light mode: backgrounds should be light (#f5f5f5–#ffffff range), text should be dark
- Brand colours should be vibrant and match the theme description
- Make the theme cohesive — all colours should feel like they belong together`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'ai_theme',
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Create a UI theme for: ${prompt.trim()}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        });
        const usage = completion.usage;
        return {
          output: completion.choices[0]?.message?.content || '{}',
          tokens: { input: usage?.prompt_tokens || 0, output: usage?.completion_tokens || 0 },
        };
      },
    });

    const aiResult = JSON.parse(creditResult.output);

    // Validate required fields exist
    const required = ['mode', 'brandPrimary', 'background', 'surface', 'foreground', 'sidebarBg', 'sidebarFg'];
    const missing = required.filter((k) => !aiResult[k]);
    if (missing.length > 0) {
      logger.warn({ missing, aiResult }, 'AI theme generation returned incomplete result');
      res.status(500).json(errorResponse('E5002', 'AI returned an incomplete theme, please try again'));
      return;
    }

    res.json(successResponse({
      tokens: aiResult,
      themeName: aiResult.themeName || 'AI Generated',
      themeDescription: aiResult.themeDescription || '',
      creditsUsed: creditResult.creditsUsed,
      creditsRemaining: creditResult.creditsRemaining,
    }));
  } catch (error: any) {
    if (error.statusCode === 403) {
      res.status(403).json(errorResponse('E4003', error.message));
      return;
    }
    logger.error({ err: error }, 'Generate AI theme error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// SAVED THEMES (stored in TenantConfig as configKey = 'ui_saved_themes')
// Value shape: { themes: SavedTheme[] }
// SavedTheme: { id, name, description, tokens, createdAt }
// ============================================

const THEMES_CONFIG_KEY = 'ui_saved_themes';

router.get('/themes', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;

    const config = await tenantDb.tenantConfig.findFirst({
      where: { tenantId, configKey: THEMES_CONFIG_KEY },
    });

    const themes = (config?.configValue as any)?.themes || [];
    res.json(successResponse({ themes }));
  } catch (error) {
    logger.error({ err: error }, 'Get saved themes error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.post('/themes', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { name, description, tokens } = req.body;

    if (!name || !tokens) {
      res.status(400).json(errorResponse('E4002', 'name and tokens are required'));
      return;
    }

    // Load existing saved themes
    const config = await tenantDb.tenantConfig.findFirst({
      where: { tenantId, configKey: THEMES_CONFIG_KEY },
    });
    const existing: any[] = (config?.configValue as any)?.themes || [];

    const newTheme = {
      id: `theme_${Date.now()}`,
      name,
      description: description || '',
      tokens,
      createdAt: new Date().toISOString(),
    };

    const updatedThemes = [...existing, newTheme];

    await tenantDb.tenantConfig.upsert({
      where: { tenantId_configKey: { tenantId, configKey: THEMES_CONFIG_KEY } },
      create: { tenantId, configKey: THEMES_CONFIG_KEY, configValue: { themes: updatedThemes } },
      update: { configValue: { themes: updatedThemes } },
    });

    res.status(201).json(successResponse({ theme: newTheme, message: 'Theme saved successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Save theme error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

router.delete('/themes/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const config = await tenantDb.tenantConfig.findFirst({
      where: { tenantId, configKey: THEMES_CONFIG_KEY },
    });
    const existing: any[] = (config?.configValue as any)?.themes || [];
    const updatedThemes = existing.filter((t: any) => t.id !== id);

    if (config) {
      await tenantDb.tenantConfig.update({
        where: { id: config.id },
        data: { configValue: { themes: updatedThemes } },
      });
    }

    res.json(successResponse({ message: 'Theme deleted' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete theme error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ============================================
// DASHBOARD
// ============================================

router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;

    const [
      parsedNewsCount,
      analysesCount,
      actionPlansCount,
      approvedActionPlansCount,
      partyLinesCount,
      activePartyLinesCount,
      speechPointsCount,
      activeSpeechPointsCount,
      broadcastsCount,
      sentBroadcastsCount,
      recentParsedNews,
      recentAnalyses,
      recentActionPlans,
    ] = await Promise.all([
      tenantDb.nBParsedNews.count({ where: { tenantId } }),
      tenantDb.nBNewsAnalysis.count({ where: { tenantId } }),
      tenantDb.nBActionPlan.count({ where: { tenantId } }),
      tenantDb.nBActionPlan.count({ where: { tenantId, status: 'approved' } }),
      tenantDb.nBPartyLine.count({ where: { tenantId } }),
      tenantDb.nBPartyLine.count({ where: { tenantId, isActive: true } }),
      tenantDb.nBSpeechPoint.count({ where: { tenantId } }),
      tenantDb.nBSpeechPoint.count({ where: { tenantId, isActive: true } }),
      tenantDb.nBBroadcast.count({ where: { tenantId } }),
      tenantDb.nBBroadcast.count({ where: { tenantId, status: 'sent' } }),
      tenantDb.nBParsedNews.findMany({ where: { tenantId }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, category: true, sentiment: true, isProcessed: true, createdAt: true } }),
      tenantDb.nBNewsAnalysis.findMany({ where: { tenantId }, take: 5, orderBy: { createdAt: 'desc' }, include: { news: { select: { title: true } } } }),
      tenantDb.nBActionPlan.findMany({ where: { tenantId }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, priority: true, status: true, createdAt: true } }),
    ]);

    res.json(successResponse({
      stats: {
        parsedNews: { total: parsedNewsCount },
        analyses: { total: analysesCount },
        actionPlans: { total: actionPlansCount, approved: approvedActionPlansCount },
        partyLines: { total: partyLinesCount, active: activePartyLinesCount },
        speechPoints: { total: speechPointsCount, active: activeSpeechPointsCount },
        broadcasts: { total: broadcastsCount, sent: sentBroadcastsCount },
      },
      recent: { parsedNews: recentParsedNews.map(normalizeParsedNews), analyses: recentAnalyses.map(normalizeAnalysis), actionPlans: recentActionPlans.map(normalizeActionPlan) },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get NB dashboard error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as nbBroadcastRoutes };
