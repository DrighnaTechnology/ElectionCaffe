import { Router, Request, Response } from 'express';
import { coreDb as prisma } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';
import { z } from 'zod';
import { superAdminAuth } from '../middleware/superAdminAuth.js';
import { auditLog } from '../utils/auditLog.js';

const logger = createLogger('super-admin-service');

const createNewsSchema = z.object({
  tenantId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().max(2000).optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  sourceName: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
  scope: z.string().default('national'),
  state: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  constituency: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  isPinned: z.boolean().default(false),
});

const router = Router();

// Apply super admin auth to all routes
router.use(superAdminAuth);

// Get all news with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      tenantId,
      scope,
      category,
      status,
      state,
      district,
      constituency,
      search,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (scope) where.scope = scope;
    if (category) where.category = category;
    if (status) where.status = status;
    if (state) where.state = state;
    if (district) where.district = district;
    if (constituency) where.constituency = constituency;

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { summary: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [news, total] = await Promise.all([
      prisma.newsInformation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.newsInformation.count({ where }),
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

    const news = await prisma.newsInformation.findUnique({
      where: { id },
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    // Increment view count
    await prisma.newsInformation.update({
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

    const news = await prisma.newsInformation.create({
      data: {
        tenantId: data.tenantId || null,
        title: data.title,
        content: data.content,
        summary: data.summary,
        category: data.category,
        tags: data.tags,
        imageUrl: data.imageUrl,
        sourceUrl: data.sourceUrl,
        sourceName: data.sourceName,
        author: data.author,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        scope: data.scope,
        state: data.state,
        district: data.district,
        constituency: data.constituency,
        status: data.status,
        isPinned: data.isPinned,
        createdBy: superAdminId,
      },
    });

    auditLog(req, 'CREATE_NEWS', 'news', news.id, data.tenantId, { title: data.title });

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

    const existing = await prisma.newsInformation.findUnique({
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
      content,
      summary,
      category,
      tags,
      imageUrl,
      sourceUrl,
      sourceName,
      author,
      publishedAt,
      scope,
      state,
      district,
      constituency,
      status,
      isPinned,
    } = req.body;

    const news = await prisma.newsInformation.update({
      where: { id },
      data: {
        title,
        content,
        summary,
        category,
        tags,
        imageUrl,
        sourceUrl,
        sourceName,
        author,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        scope,
        state,
        district,
        constituency,
        status,
        isPinned,
      },
    });

    auditLog(req, 'UPDATE_NEWS', 'news', id);

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

    const news = await prisma.newsInformation.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    auditLog(req, 'PUBLISH_NEWS', 'news', id);

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

    const news = await prisma.newsInformation.update({
      where: { id },
      data: {
        status: 'archived',
        isActive: false,
      },
    });

    auditLog(req, 'ARCHIVE_NEWS', 'news', id);

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

// Delete news
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const news = await prisma.newsInformation.findUnique({
      where: { id },
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    await prisma.newsInformation.delete({
      where: { id },
    });

    auditLog(req, 'DELETE_NEWS', 'news', id, null, { title: news.title });

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
    const { tenantId } = req.query;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    const [totalNews, publishedCount, draftCount] = await Promise.all([
      prisma.newsInformation.count({ where }),
      prisma.newsInformation.count({ where: { ...where, status: 'published' } }),
      prisma.newsInformation.count({ where: { ...where, status: 'draft' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalNews,
        published: publishedCount,
        draft: draftCount,
        archived: totalNews - publishedCount - draftCount,
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

export const newsRoutes = router;
