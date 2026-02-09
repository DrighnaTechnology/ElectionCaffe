import { Router, Request, Response } from 'express';
import { coreDb as prisma } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';
import { z } from 'zod';
import { superAdminAuth } from '../middleware/superAdminAuth.js';

const logger = createLogger('super-admin-service');

const createNewsSchema = z.object({
  tenantId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(500),
  titleLocal: z.string().max(500).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  content: z.string().optional().nullable(),
  contentLocal: z.string().optional().nullable(),
  category: z.string().default('OTHER'),
  subCategory: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  source: z.string().default('MANUAL_ENTRY'),
  sourceUrl: z.string().url().optional().nullable(),
  sourceName: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  geographicLevel: z.string().default('NATIONAL'),
  state: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  constituency: z.string().optional().nullable(),
  section: z.string().optional().nullable(),
  booth: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'FLAGGED']).default('DRAFT'),
  imageUrls: z.array(z.string()).default([]),
  videoUrls: z.array(z.string()).default([]),
  documentUrls: z.array(z.string()).default([]),
});

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
    const parsed = createNewsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const data = parsed.data;

    const news = await (prisma as any).newsInformation.create({
      data: {
        tenantId: data.tenantId || null,
        title: data.title,
        titleLocal: data.titleLocal,
        summary: data.summary,
        content: data.content,
        contentLocal: data.contentLocal,
        category: data.category,
        subCategory: data.subCategory,
        tags: data.tags,
        keywords: data.keywords,
        source: data.source,
        sourceUrl: data.sourceUrl,
        sourceName: data.sourceName,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        geographicLevel: data.geographicLevel,
        state: data.state,
        region: data.region,
        district: data.district,
        constituency: data.constituency,
        section: data.section,
        booth: data.booth,
        priority: data.priority,
        status: data.status,
        imageUrls: data.imageUrls,
        videoUrls: data.videoUrls,
        documentUrls: data.documentUrls,
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
