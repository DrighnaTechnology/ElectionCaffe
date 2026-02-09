import { Router, Request, Response } from 'express';
import { coreDb as prisma } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';
import { superAdminAuth } from '../middleware/superAdminAuth.js';

const logger = createLogger('super-admin-service');

const router = Router();

// Apply super admin auth to all routes
router.use(superAdminAuth);

// Get all news/information with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      tenantId,
      geographicLevel,
      category,
      status,
      priority,
      state,
      district,
      constituency,
      search,
      startDate,
      endDate,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (geographicLevel) where.geographicLevel = geographicLevel;
    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (state) where.state = state;
    if (district) where.district = district;
    if (constituency) where.constituency = constituency;

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { summary: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [news, total] = await Promise.all([
      (prisma as any).newsInformation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { actions: true },
          },
        },
      }),
      (prisma as any).newsInformation.count({ where }),
    ]);

    res.json({
      success: true,
      data: news,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching news');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
      message: error.message,
    });
  }
});

// Get news by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const news = await (prisma as any).newsInformation.findUnique({
      where: { id },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    // Increment view count
    await (prisma as any).newsInformation.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: news,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching news');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
      message: error.message,
    });
  }
});

// Create news
router.post('/', async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).superAdmin?.id;
    const {
      tenantId,
      title,
      titleLocal,
      summary,
      content,
      contentLocal,
      category,
      subCategory,
      tags,
      keywords,
      source,
      sourceUrl,
      sourceName,
      publishedAt,
      geographicLevel,
      state,
      region,
      district,
      constituency,
      section,
      booth,
      priority,
      status,
      imageUrls,
      videoUrls,
      documentUrls,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      });
    }

    const news = await (prisma as any).newsInformation.create({
      data: {
        tenantId: tenantId || null,
        title,
        titleLocal,
        summary,
        content,
        contentLocal,
        category: category || 'OTHER',
        subCategory,
        tags: tags || [],
        keywords: keywords || [],
        source: source || 'MANUAL_ENTRY',
        sourceUrl,
        sourceName,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        geographicLevel: geographicLevel || 'NATIONAL',
        state,
        region,
        district,
        constituency,
        section,
        booth,
        priority: priority || 'MEDIUM',
        status: status || 'DRAFT',
        imageUrls: imageUrls || [],
        videoUrls: videoUrls || [],
        documentUrls: documentUrls || [],
        createdBy: superAdminId,
      },
    });

    res.status(201).json({
      success: true,
      data: news,
      message: 'News created successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error creating news');
    res.status(500).json({
      success: false,
      error: 'Failed to create news',
      message: error.message,
    });
  }
});

// Update news
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;

    const existing = await (prisma as any).newsInformation.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    const {
      title,
      titleLocal,
      summary,
      content,
      contentLocal,
      category,
      subCategory,
      tags,
      keywords,
      source,
      sourceUrl,
      sourceName,
      publishedAt,
      geographicLevel,
      state,
      region,
      district,
      constituency,
      section,
      booth,
      priority,
      status,
      imageUrls,
      videoUrls,
      documentUrls,
    } = req.body;

    const news = await (prisma as any).newsInformation.update({
      where: { id },
      data: {
        title,
        titleLocal,
        summary,
        content,
        contentLocal,
        category,
        subCategory,
        tags,
        keywords,
        source,
        sourceUrl,
        sourceName,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        geographicLevel,
        state,
        region,
        district,
        constituency,
        section,
        booth,
        priority,
        status,
        imageUrls,
        videoUrls,
        documentUrls,
        updatedBy: superAdminId,
      },
    });

    res.json({
      success: true,
      data: news,
      message: 'News updated successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating news');
    res.status(500).json({
      success: false,
      error: 'Failed to update news',
      message: error.message,
    });
  }
});

// Publish news
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;

    const news = await (prisma as any).newsInformation.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        updatedBy: superAdminId,
      },
    });

    res.json({
      success: true,
      data: news,
      message: 'News published successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error publishing news');
    res.status(500).json({
      success: false,
      error: 'Failed to publish news',
      message: error.message,
    });
  }
});

// Archive news
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;

    const news = await (prisma as any).newsInformation.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        archivedBy: superAdminId,
      },
    });

    res.json({
      success: true,
      data: news,
      message: 'News archived successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error archiving news');
    res.status(500).json({
      success: false,
      error: 'Failed to archive news',
      message: error.message,
    });
  }
});

// Flag news
router.post('/:id/flag', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;

    const news = await (prisma as any).newsInformation.update({
      where: { id },
      data: {
        status: 'FLAGGED',
        updatedBy: superAdminId,
      },
    });

    res.json({
      success: true,
      data: news,
      message: 'News flagged for review',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error flagging news');
    res.status(500).json({
      success: false,
      error: 'Failed to flag news',
      message: error.message,
    });
  }
});

// Analyze news with AI
router.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const news = await (prisma as any).newsInformation.findUnique({
      where: { id },
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    // Check if AI provider is configured
    const aiProvider = await prisma.aIProvider.findFirst({
      where: { status: 'ACTIVE', apiKey: { not: null } } as any,
    });

    if (!aiProvider) {
      return res.status(503).json({
        success: false,
        error: 'No AI provider configured. Please configure an AI provider with a valid API key to analyze news.',
      });
    }

    // TODO: Implement actual AI analysis integration using the configured provider
    return res.status(503).json({
      success: false,
      error: 'AI news analysis integration is not yet implemented. An AI provider is configured but the analysis pipeline is pending.',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error analyzing news');
    res.status(500).json({
      success: false,
      error: 'Failed to analyze news',
      message: error.message,
    });
  }
});

// Delete news
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const news = await (prisma as any).newsInformation.findUnique({
      where: { id },
      include: { _count: { select: { actions: true } } },
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    if (news._count.actions > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete news with associated actions',
      });
    }

    await (prisma as any).newsInformation.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'News deleted successfully',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error deleting news');
    res.status(500).json({
      success: false,
      error: 'Failed to delete news',
      message: error.message,
    });
  }
});

// Get news statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const { tenantId, startDate, endDate } = req.query;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [
      totalNews,
      byStatus,
      byCategory,
      byPriority,
      byGeographicLevel,
      recentNews,
    ] = await Promise.all([
      (prisma as any).newsInformation.count({ where }),
      (prisma as any).newsInformation.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      (prisma as any).newsInformation.groupBy({
        by: ['category'],
        where,
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 10,
      }),
      (prisma as any).newsInformation.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      (prisma as any).newsInformation.groupBy({
        by: ['geographicLevel'],
        where,
        _count: true,
      }),
      (prisma as any).newsInformation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          priority: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalNews,
        byStatus: byStatus.reduce((acc: any, item: any) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byCategory: byCategory.map((item: any) => ({
          category: item.category,
          count: item._count,
        })),
        byPriority: byPriority.reduce((acc: any, item: any) => {
          acc[item.priority] = item._count;
          return acc;
        }, {}),
        byGeographicLevel: byGeographicLevel.reduce((acc: any, item: any) => {
          acc[item.geographicLevel] = item._count;
          return acc;
        }, {}),
        recentNews,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching news stats');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news statistics',
      message: error.message,
    });
  }
});

// Get geographic hierarchy options
router.get('/options/geographic', async (req: Request, res: Response) => {
  try {
    const { state, district } = req.query;

    // Get distinct values based on existing data
    const [states, districts, constituencies] = await Promise.all([
      (prisma as any).newsInformation.findMany({
        where: { state: { not: null } },
        select: { state: true },
        distinct: ['state'],
      }),
      state
        ? (prisma as any).newsInformation.findMany({
            where: { state: state as string, district: { not: null } },
            select: { district: true },
            distinct: ['district'],
          })
        : Promise.resolve([]),
      district
        ? (prisma as any).newsInformation.findMany({
            where: {
              state: state as string,
              district: district as string,
              constituency: { not: null },
            },
            select: { constituency: true },
            distinct: ['constituency'],
          })
        : Promise.resolve([]),
    ]);

    res.json({
      success: true,
      data: {
        states: states.map((s: any) => s.state).filter(Boolean),
        districts: districts.map((d: any) => d.district).filter(Boolean),
        constituencies: constituencies.map((c: any) => c.constituency).filter(Boolean),
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching geographic options');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch geographic options',
      message: error.message,
    });
  }
});

export const newsRoutes = router;
