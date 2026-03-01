import { Router, Request, Response } from 'express';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getTenantDb } from '../utils/tenantDb.js';
import { verifyCredits } from '@electioncaffe/database';

// Feature credit cost for news analysis
const NEWS_ANALYSIS_CREDIT_COST = 2;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptsDir = resolve(__dirname, '../../../../../prompts');

const logger = createLogger('auth-service');
const router = Router();

// ─── RSS XML Parser ────────────────────────────────────────
interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  sourceName?: string;
}

function extractTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1].trim() : undefined;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function stripHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, ' ')   // remove all HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Some tenant DBs use WIN1252 encoding — strip characters outside that range
function sanitizeForDb(str: string): string {
  return str
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x00-\xFF]/g, '');
}

function parseRSSXml(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const pubDate = extractTag(itemXml, 'pubDate');
    const sourceName = extractTag(itemXml, 'source');

    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title),
        link: link.trim(),
        description: description ? stripHtml(decodeHtmlEntities(description)) : undefined,
        pubDate,
        sourceName: sourceName ? decodeHtmlEntities(sourceName) : undefined,
      });
    }
  }

  return items;
}

// Helper to get tenantId from request headers (set by JWT middleware)
function getTenantId(req: Request): string | null {
  return (req.headers['x-tenant-id'] as string) || null;
}

// ─── Fetch news from Google News RSS ────────────────────
router.post('/fetch', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    // Auto-lookup constituency and state from tenant's election table
    let constituency: string | undefined = req.body.constituency;
    let state: string | undefined = req.body.state;

    if (!constituency || !state) {
      try {
        const election = await (tenantDb as any).election.findFirst({
          where: { status: 'ACTIVE' },
          select: { constituency: true, state: true, name: true },
          orderBy: { createdAt: 'desc' },
        });

        // If no ACTIVE election, try any election
        const electionData = election || await (tenantDb as any).election.findFirst({
          select: { constituency: true, state: true, name: true },
          orderBy: { createdAt: 'desc' },
        });

        if (electionData) {
          constituency = constituency || electionData.constituency;
          state = state || electionData.state;
          logger.info({ constituency, state, electionName: electionData.name }, 'Auto-resolved constituency from tenant election');
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to auto-resolve constituency from tenant DB, checking request body');
      }
    }

    if (!constituency || !state) {
      res.status(400).json(errorResponse('E2001', 'No election found for this tenant. Please create an election first.'));
      return;
    }

    const requestCategory = req.body.category as string | undefined;
    const requestScope = req.body.scope as string | undefined;

    // Build category-specific keywords
    const categoryKeywords: Record<string, string> = {
      ELECTION: 'election voting results candidates',
      POLITICAL: 'politics party leader alliance',
      ECONOMIC: 'economy development projects budget',
      HEALTH: 'health hospital medical scheme',
      EDUCATION: 'education school college university',
      INFRASTRUCTURE: 'infrastructure roads highways construction',
      SOCIAL: 'social welfare scheme community',
      GOVERNMENT: 'government policy administration minister',
      LOCAL: 'local civic municipal corporation',
      NATIONAL: 'national India parliament',
      CONTROVERSY: 'controversy protest agitation scandal',
      POLICY: 'policy reform announcement scheme',
      DEVELOPMENT: 'development project progress growth',
    };

    // Build scope-based base query
    let baseQuery: string;
    if (requestScope === 'NATIONAL') {
      baseQuery = `India election news 2026`;
    } else if (requestScope === 'STATE') {
      baseQuery = `${state} election news 2026`;
    } else if (requestScope === 'DISTRICT') {
      baseQuery = `${state} district election news`;
    } else {
      baseQuery = `${constituency} ${state} election news India`;
    }

    const categorySuffix = requestCategory && categoryKeywords[requestCategory]
      ? ` ${categoryKeywords[requestCategory]}`
      : '';

    const searchQuery = encodeURIComponent(`${baseQuery}${categorySuffix}`);
    const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=en-IN&gl=IN&ceid=IN:en`;

    logger.info({ requestCategory, requestScope, baseQuery, categorySuffix }, 'Fetch filters applied');

    logger.info({ constituency, state, rssUrl }, 'Fetching news from Google News RSS');

    const rssResponse = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ElectionCaffe/1.0)',
      },
    });

    if (!rssResponse.ok) {
      logger.error({ status: rssResponse.status }, 'Google News RSS fetch failed');
      res.status(502).json(errorResponse('E5003', 'Failed to fetch news from source'));
      return;
    }

    const rssText = await rssResponse.text();
    const items = parseRSSXml(rssText);

    logger.info({ itemCount: items.length }, 'Parsed RSS items');

    let created = 0;
    let skipped = 0;

    for (const item of items) {
      // Check for duplicates by sourceUrl
      const existing = await (tenantDb as any).newsInformation.findFirst({
        where: { sourceUrl: item.link, tenantId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Map scope filter to schema values
      const geoLevel = requestScope === 'NATIONAL' ? 'NATIONAL'
        : requestScope === 'STATE' ? 'STATE'
        : requestScope === 'DISTRICT' ? 'DISTRICT'
        : 'CONSTITUENCY';
      const scopeValue = geoLevel.toLowerCase();

      const categoryValue = requestCategory || 'POLITICAL';

      await (tenantDb as any).newsInformation.create({
        data: {
          tenantId,
          title: sanitizeForDb(item.title),
          content: sanitizeForDb(item.description || item.title),
          summary: item.description ? sanitizeForDb(item.description) : null,
          source: 'MEDIA',
          sourceUrl: item.link,
          sourceName: item.sourceName || 'Google News',
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          category: categoryValue,
          priority: 'MEDIUM',
          geographicLevel: geoLevel,
          scope: scopeValue,
          state,
          constituency,
          status: 'PUBLISHED',
          createdBy: userId,
        },
      });
      created++;
    }

    logger.info({ created, skipped, total: items.length }, 'News fetch complete');

    res.json(successResponse({
      message: `Fetched ${created} new articles, ${skipped} duplicates skipped`,
      created,
      skipped,
      total: items.length,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Fetch news error');
    res.status(500).json(errorResponse('E5001', 'Failed to fetch news'));
  }
});

// Get news relevant to tenant's geographic area
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      priority,
      status = 'PUBLISHED',
      geographicLevel,
      search,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    // Build where clause - news for this tenant OR global news (no tenantId)
    const where: any = {
      OR: [
        { tenantId },
        { tenantId: null, geographicLevel: 'NATIONAL' },
      ],
      status: status as string,
    };

    // Add filters
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (geographicLevel) where.geographicLevel = geographicLevel;

    // Search in title and summary
    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { summary: { contains: search as string, mode: 'insensitive' } },
            { titleLocal: { contains: search as string, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [news, total] = await Promise.all([
      (tenantDb as any).newsInformation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          titleLocal: true,
          summary: true,
          category: true,
          subCategory: true,
          priority: true,
          status: true,
          geographicLevel: true,
          state: true,
          district: true,
          constituency: true,
          publishedAt: true,
          imageUrls: true,
          tags: true,
          source: true,
          sourceName: true,
          viewCount: true,
          createdAt: true,
        },
      }),
      (tenantDb as any).newsInformation.count({ where }),
    ]);

    res.json(successResponse({
      data: news,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get tenant news error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single news item
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    const news = await (tenantDb as any).newsInformation.findFirst({
      where: {
        id,
        OR: [
          { tenantId },
          { tenantId: null },
        ],
      },
      include: {
        actions: {
          where: { tenantId },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            actionType: true,
          },
        },
      },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    // Increment view count
    await (tenantDb as any).newsInformation.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json(successResponse(news));
  } catch (error) {
    logger.error({ err: error }, 'Get news detail error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get news categories with counts
router.get('/stats/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    const categoryStats = await (tenantDb as any).newsInformation.groupBy({
      by: ['category'],
      where: {
        OR: [
          { tenantId },
          { tenantId: null },
        ],
        status: 'PUBLISHED',
      },
      _count: { id: true },
    });

    const priorityStats = await (tenantDb as any).newsInformation.groupBy({
      by: ['priority'],
      where: {
        OR: [
          { tenantId },
          { tenantId: null },
        ],
        status: 'PUBLISHED',
      },
      _count: { id: true },
    });

    res.json(successResponse({
      categories: categoryStats.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      priorities: priorityStats.map((p) => ({
        priority: p.priority,
        count: p._count.id,
      })),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get news stats error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get AI analysis for a news item (tenant-specific insights)
router.get('/:id/analysis', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    const news = await (tenantDb as any).newsInformation.findFirst({
      where: {
        id,
        OR: [
          { tenantId },
          { tenantId: null },
        ],
      },
      select: {
        id: true,
        title: true,
        aiAnalysis: true,
        sentimentScore: true,
        impactScore: true,
        relevanceScore: true,
        suggestedActions: true,
        analyzedAt: true,
      },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    if (!news.aiAnalysis) {
      res.json(successResponse({
        analyzed: false,
        message: 'AI analysis is not yet available for this news item.',
      }));
      return;
    }

    res.json(successResponse({
      analyzed: true,
      newsId: news.id,
      title: news.title,
      analysis: news.aiAnalysis,
      sentimentScore: news.sentimentScore,
      impactScore: news.impactScore,
      relevanceScore: news.relevanceScore,
      suggestedActions: (news as any).suggestedActions,
      analyzedAt: (news as any).analyzedAt,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get news analysis error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Request AI analysis for a news item
router.post('/:id/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    // Only allow admin roles
    if (userRole !== 'CENTRAL_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    const news = await (tenantDb as any).newsInformation.findFirst({
      where: {
        id,
        OR: [
          { tenantId },
          { tenantId: null },
        ],
      },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      res.status(500).json(errorResponse('E5002', 'No OpenAI API key configured'));
      return;
    }

    // Load prompts from files
    let systemPrompt: string;
    let userPromptTemplate: string;
    try {
      systemPrompt = readFileSync(resolve(promptsDir, 'news-analysis-system.txt'), 'utf-8');
      userPromptTemplate = readFileSync(resolve(promptsDir, 'news-analysis-user.txt'), 'utf-8');
    } catch (err) {
      logger.error({ err }, 'Failed to load prompt files');
      res.status(500).json(errorResponse('E5004', 'Prompt files not found'));
      return;
    }

    const userPrompt = userPromptTemplate
      .replace('{{newsTitle}}', news.title || '')
      .replace('{{newsContent}}', news.content || news.summary || '')
      .replace('{{constituency}}', news.constituency || 'N/A')
      .replace('{{state}}', news.state || 'N/A')
      .replace('{{sourceName}}', news.sourceName || 'Unknown')
      .replace('{{category}}', news.category || 'POLITICAL');

    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    logger.info({ model, newsId: news.id }, 'Requesting AI news analysis');

    // Credit check before AI call (using tenant DB for isolation)
    const credits = await (tenantDb as any).tenantAICredits.findUnique({ where: { tenantId: tenantId! } });
    const availableCredits = credits
      ? (credits.totalCredits - credits.usedCredits + (credits.bonusCredits || 0))
      : 0;

    // Verify HMAC signature — detect tampering
    if (credits && !verifyCredits({
      tenantId: tenantId!,
      totalCredits: credits.totalCredits,
      bonusCredits: credits.bonusCredits || 0,
      expiresAt: credits.expiresAt ? new Date(credits.expiresAt).toISOString() : null,
      creditSignature: credits.creditSignature,
    })) {
      res.status(403).json(errorResponse('E4003', 'Credit verification failed. Please contact support.'));
      return;
    }

    // Check expiry
    if (credits?.expiresAt && new Date() > new Date(credits.expiresAt)) {
      res.status(403).json(errorResponse('E4003', 'AI credits have expired. Please renew your subscription.'));
      return;
    }

    if (!credits || availableCredits < NEWS_ANALYSIS_CREDIT_COST) {
      res.status(403).json(errorResponse('E4003', `Insufficient AI credits. Required: ${NEWS_ANALYSIS_CREDIT_COST}, Available: ${availableCredits}`));
      return;
    }

    const startTime = Date.now();
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      logger.error({ status: aiResponse.status, error: errorData }, 'OpenAI API error');
      res.status(502).json(errorResponse('E5003', 'AI analysis failed'));
      return;
    }

    const result: any = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content;

    let analysisData: any;
    try {
      analysisData = JSON.parse(content);
    } catch {
      logger.error({ content }, 'Failed to parse AI response');
      res.status(502).json(errorResponse('E5003', 'Invalid AI response format'));
      return;
    }

    // Update the news item with AI analysis
    await (tenantDb as any).newsInformation.update({
      where: { id },
      data: {
        aiAnalysis: analysisData,
        sentimentScore: typeof analysisData.sentimentScore === 'number' ? analysisData.sentimentScore : null,
        impactScore: typeof analysisData.impactScore === 'number' ? analysisData.impactScore : null,
        relevanceScore: typeof analysisData.relevanceScore === 'number' ? analysisData.relevanceScore : null,
        suggestedActions: analysisData.suggestedActions || null,
        category: analysisData.category || news.category,
        analyzedAt: new Date(),
      },
    });

    logger.info({ newsId: news.id }, 'AI news analysis complete');

    // Deduct credits in tenant DB (tenant isolation)
    const responseTime = Date.now() - startTime;
    try {
      await (tenantDb as any).$transaction(async (tx: any) => {
        await tx.tenantAICredits.update({
          where: { tenantId: tenantId! },
          data: { usedCredits: { increment: NEWS_ANALYSIS_CREDIT_COST } },
        });
        await tx.aIUsageLog.create({
          data: {
            tenantCreditsId: credits.id,
            userId,
            featureKey: 'news_analysis',
            creditsUsed: NEWS_ANALYSIS_CREDIT_COST,
            inputTokens: result.usage?.prompt_tokens || 0,
            outputTokens: result.usage?.completion_tokens || 0,
            modelUsed: model,
            responseTime,
            status: 'success',
          },
        });
        await tx.aICreditTransaction.create({
          data: {
            tenantCreditsId: credits.id,
            transactionType: 'USAGE',
            credits: -NEWS_ANALYSIS_CREDIT_COST,
            description: `Used ${NEWS_ANALYSIS_CREDIT_COST} credits for news_analysis`,
            referenceType: 'AI_FEATURE',
            referenceId: 'news_analysis',
            createdBy: userId,
          },
        });
      });
    } catch (creditErr) {
      logger.warn({ err: creditErr }, 'Failed to deduct credits for news analysis');
    }

    res.json(successResponse({
      analyzed: true,
      newsId: news.id,
      analysis: analysisData,
      sentiment: analysisData.sentiment,
      sentimentScore: analysisData.sentimentScore,
      impactScore: analysisData.impactScore,
      relevanceScore: analysisData.relevanceScore,
      suggestedActions: analysisData.suggestedActions,
      analyzedAt: new Date().toISOString(),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Request news analysis error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as tenantNewsRoutes };
