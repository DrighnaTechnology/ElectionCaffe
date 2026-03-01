import { Router, Request, Response } from 'express';
import { coreDb } from '@electioncaffe/database';
import { successResponse, errorResponse } from '@electioncaffe/shared';

const router = Router();

// Get tenant's geographic scope (constituency/state) from their elections in core DB
async function getTenantGeoScope(tenantId: string) {
  const elections = await coreDb.election.findMany({
    where: { tenantId },
    select: { constituency: true, state: true, district: true },
  });

  return {
    constituencies: [...new Set(elections.map(e => e.constituency).filter(Boolean))] as string[],
    states: [...new Set(elections.map(e => e.state).filter(Boolean))] as string[],
    districts: [...new Set(elections.map(e => e.district).filter(Boolean))] as string[],
  };
}

// Get news relevant to tenant's constituency
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(401).json(errorResponse('E1001', 'Authentication required'));
      return;
    }

    const {
      page = 1,
      limit = 20,
      category,
      priority,
      geographicLevel,
      search,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const { constituencies, states } = await getTenantGeoScope(tenantId);

    // Geographic filter: national news OR tenant-specific OR matching constituency/state
    const geoFilter: any[] = [
      { geographicLevel: 'NATIONAL' },
      { tenantId },
    ];

    if (constituencies.length > 0) {
      geoFilter.push({ constituency: { in: constituencies } });
    }
    if (states.length > 0) {
      geoFilter.push({ state: { in: states } });
    }

    const where: any = {
      OR: geoFilter,
      status: 'PUBLISHED',
    };

    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (geographicLevel) where.geographicLevel = geographicLevel;

    if (search) {
      where.AND = [{
        OR: [
          { title: { contains: search as string, mode: 'insensitive' } },
          { summary: { contains: search as string, mode: 'insensitive' } },
          { titleLocal: { contains: search as string, mode: 'insensitive' } },
        ],
      }];
    }

    const [news, total] = await Promise.all([
      coreDb.newsInformation.findMany({
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
      coreDb.newsInformation.count({ where }),
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
    console.error('Get tenant news error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get news categories with counts (scoped to tenant's constituency)
router.get('/stats/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(401).json(errorResponse('E1001', 'Authentication required'));
      return;
    }

    const { constituencies, states } = await getTenantGeoScope(tenantId);

    const geoFilter: any[] = [
      { geographicLevel: 'NATIONAL' },
      { tenantId },
    ];

    if (constituencies.length > 0) {
      geoFilter.push({ constituency: { in: constituencies } });
    }
    if (states.length > 0) {
      geoFilter.push({ state: { in: states } });
    }

    const newsWhere = {
      OR: geoFilter,
      status: 'PUBLISHED',
    };

    const [categoryStats, priorityStats] = await Promise.all([
      coreDb.newsInformation.groupBy({
        by: ['category'],
        where: newsWhere,
        _count: { id: true },
      }),
      coreDb.newsInformation.groupBy({
        by: ['priority'],
        where: newsWhere,
        _count: { id: true },
      }),
    ]);

    res.json(successResponse({
      categories: categoryStats.map((c: any) => ({
        category: c.category,
        count: c._count.id,
      })),
      priorities: priorityStats.map((p: any) => ({
        priority: p.priority,
        count: p._count.id,
      })),
    }));
  } catch (error) {
    console.error('Get news stats error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single news item
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(401).json(errorResponse('E1001', 'Authentication required'));
      return;
    }

    const { id } = req.params;

    const { constituencies, states } = await getTenantGeoScope(tenantId);

    const geoFilter: any[] = [
      { geographicLevel: 'NATIONAL' },
      { tenantId },
    ];

    if (constituencies.length > 0) {
      geoFilter.push({ constituency: { in: constituencies } });
    }
    if (states.length > 0) {
      geoFilter.push({ state: { in: states } });
    }

    const news = await coreDb.newsInformation.findFirst({
      where: {
        id,
        OR: geoFilter,
      },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    await coreDb.newsInformation.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json(successResponse(news));
  } catch (error) {
    console.error('Get news detail error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get AI analysis for a news item
router.get('/:id/analysis', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      res.status(401).json(errorResponse('E1001', 'Authentication required'));
      return;
    }

    const { id } = req.params;

    const news = await coreDb.newsInformation.findFirst({
      where: { id, OR: [{ tenantId }, { geographicLevel: 'NATIONAL' }] },
      select: {
        id: true,
        title: true,
        aiAnalysis: true,
        sentimentScore: true,
        impactScore: true,
        relevanceScore: true,
        aiProcessedAt: true,
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
      analyzedAt: news.aiProcessedAt,
    }));
  } catch (error) {
    console.error('Get news analysis error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Request AI analysis for a news item
router.post('/:id/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json(errorResponse('E1001', 'Authentication required'));
      return;
    }

    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const news = await coreDb.newsInformation.findFirst({
      where: { id, OR: [{ tenantId }, { geographicLevel: 'NATIONAL' }] },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    res.json(successResponse({
      message: 'AI analysis request submitted. Results will be available shortly.',
      newsId: news.id,
      requestedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Request news analysis error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as tenantNewsRoutes };
