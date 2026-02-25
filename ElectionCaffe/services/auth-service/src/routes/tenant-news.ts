import { Router, Request, Response } from 'express';
import { coreDb, getTenantClientBySlug } from '@electioncaffe/database';
import { successResponse, errorResponse } from '@electioncaffe/shared';

const router = Router();

// Helper to get tenant DB client from request
async function getTenantDb(req: Request) {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) return null;

  const tenant = await coreDb.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      databaseHost: true,
      databaseName: true,
      databaseUser: true,
      databasePassword: true,
      databasePort: true,
      databaseSSL: true,
      databaseConnectionUrl: true,
    },
  });

  if (!tenant) return null;

  try {
    const tenantDb = await getTenantClientBySlug(
      tenant.slug,
      {
        databaseHost: tenant.databaseHost,
        databaseName: tenant.databaseName,
        databaseUser: tenant.databaseUser,
        databasePassword: tenant.databasePassword,
        databasePort: tenant.databasePort,
        databaseSSL: tenant.databaseSSL,
        databaseConnectionUrl: tenant.databaseConnectionUrl,
      },
      tenant.id
    );
    return { tenant, tenantDb };
  } catch {
    return { tenant, tenantDb: null };
  }
}

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

    const result = await getTenantDb(req);
    if (!result || !result.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { tenant, tenantDb } = result;

    // If tenant DB is not available, return empty (news feature not yet configured)
    if (!tenantDb) {
      res.json(successResponse({
        data: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0,
        },
      }));
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

    // Check if newsInformation model exists in tenant DB
    try {
      const [news, total] = await Promise.all([
        tenantDb.newsInformation.findMany({
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
        tenantDb.newsInformation.count({ where }),
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
    } catch {
      // News model might not exist in tenant DB schema
      res.json(successResponse({
        data: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0,
        },
      }));
    }
  } catch (error) {
    console.error('Get tenant news error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single news item
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await getTenantDb(req);
    if (!result || !result.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { tenant, tenantDb } = result;

    if (!tenantDb) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    try {
      const news = await tenantDb.newsInformation.findFirst({
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

      // Increment view count
      await tenantDb.newsInformation.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });

      res.json(successResponse(news));
    } catch {
      res.status(404).json(errorResponse('E3001', 'News not found'));
    }
  } catch (error) {
    console.error('Get news detail error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get news categories with counts
router.get('/stats/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await getTenantDb(req);
    if (!result || !result.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { tenant, tenantDb } = result;

    if (!tenantDb) {
      res.json(successResponse({
        categories: [],
        priorities: [],
      }));
      return;
    }

    try {
      const categoryStats = await tenantDb.newsInformation.groupBy({
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

      const priorityStats = await tenantDb.newsInformation.groupBy({
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
        categories: categoryStats.map((c: any) => ({
          category: c.category,
          count: c._count.id,
        })),
        priorities: priorityStats.map((p: any) => ({
          priority: p.priority,
          count: p._count.id,
        })),
      }));
    } catch {
      res.json(successResponse({
        categories: [],
        priorities: [],
      }));
    }
  } catch (error) {
    console.error('Get news stats error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get AI analysis for a news item (tenant-specific insights)
router.get('/:id/analysis', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await getTenantDb(req);
    if (!result || !result.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { tenant, tenantDb } = result;

    if (!tenantDb) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    try {
      const news = await tenantDb.newsInformation.findFirst({
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
        suggestedActions: news.suggestedActions,
        analyzedAt: news.analyzedAt,
      }));
    } catch {
      res.status(404).json(errorResponse('E3001', 'News not found'));
    }
  } catch (error) {
    console.error('Get news analysis error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Request AI analysis for a news item
router.post('/:id/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

    // Only allow admin roles
    const allowedRoles = ['TENANT_ADMIN', 'CENTRAL_ADMIN', 'CANDIDATE_ADMIN', 'EMC_ADMIN', 'CAMPAIGN_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json(errorResponse('E4001', 'Access denied'));
      return;
    }

    const result = await getTenantDb(req);
    if (!result || !result.tenant) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const { tenant, tenantDb } = result;

    if (!tenantDb) {
      res.status(404).json(errorResponse('E3001', 'News not found'));
      return;
    }

    try {
      const news = await tenantDb.newsInformation.findFirst({
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
    } catch {
      res.status(404).json(errorResponse('E3001', 'News not found'));
    }
  } catch (error) {
    console.error('Request news analysis error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as tenantNewsRoutes };
