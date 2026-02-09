import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';

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

// Get news relevant to tenant's geographic area
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
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

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    // Build where clause - news for this tenant OR global news (no tenantId)
    const where: any = {
      OR: [
        { tenantId: tenant.id },
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
      prisma.newsInformation.findMany({
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
      prisma.newsInformation.count({ where }),
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
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const news = await prisma.newsInformation.findFirst({
      where: {
        id,
        OR: [
          { tenantId: tenant.id },
          { tenantId: null },
        ],
      },
      include: {
        actions: {
          where: { tenantId: tenant.id },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            actionType: true,
          },
        },
      } as any,
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    // Increment view count
    await prisma.newsInformation.update({
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
    const userId = req.headers['x-user-id'] as string;

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const categoryStats = await prisma.newsInformation.groupBy({
      by: ['category'],
      where: {
        OR: [
          { tenantId: tenant.id },
          { tenantId: null },
        ],
        status: 'PUBLISHED',
      },
      _count: { id: true },
    });

    const priorityStats = await prisma.newsInformation.groupBy({
      by: ['priority'],
      where: {
        OR: [
          { tenantId: tenant.id },
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
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const tenant = await getTenantFromUser(userId);
    if (!tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const news = await prisma.newsInformation.findFirst({
      where: {
        id,
        OR: [
          { tenantId: tenant.id },
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
      } as any,
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

    const news = await prisma.newsInformation.findFirst({
      where: {
        id,
        OR: [
          { tenantId: tenant.id },
          { tenantId: null },
        ],
      },
    });

    if (!news) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    // TODO: Trigger AI analysis job
    // For now, return a placeholder response
    res.json(successResponse({
      message: 'AI analysis request submitted. Results will be available shortly.',
      newsId: news.id,
      requestedAt: new Date().toISOString(),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Request news analysis error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as tenantNewsRoutes };
