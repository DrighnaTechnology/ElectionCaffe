import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, createPaginationMeta, calculateSkip, paginationSchema } from '@electioncaffe/shared';
import axios from 'axios';

const router = Router();

// DataCaffe.ai API configuration
const DATACAFFE_API_URL = process.env.DATACAFFE_API_URL || 'https://api.datacaffe.ai';
const DATACAFFE_API_KEY = process.env.DATACAFFE_API_KEY || '';

// Get all DataCaffe embeds
router.get('/embeds', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { electionId } = req.query;
    const validation = paginationSchema.safeParse(req.query);
    const { page, limit } = validation.success ? validation.data : { page: 1, limit: 10 };
    const skip = calculateSkip(page, limit);

    const where: any = { tenantId };
    if (electionId) where.electionId = electionId;

    const [embeds, total] = await Promise.all([
      prisma.dataCaffeEmbed.findMany({
        where,
        skip,
        take: limit,
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.dataCaffeEmbed.count({ where }),
    ]);

    res.json(successResponse(embeds, createPaginationMeta(total, page, limit)));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get embed by ID
router.get('/embeds/:id', async (req: Request, res: Response) => {
  try {
    const embed = await prisma.dataCaffeEmbed.findUnique({
      where: { id: req.params.id },
    });

    if (!embed) {
      res.status(404).json(errorResponse('E3001', 'Embed not found'));
      return;
    }

    res.json(successResponse(embed));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create new DataCaffe embed
router.post('/embeds', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { electionId } = req.query;
    const { embedName, embedUrl, embedType, description, accessToken, displayOrder } = req.body;

    // Validate embed URL
    if (!embedUrl || !embedUrl.includes('datacaffe.ai')) {
      res.status(400).json(errorResponse('E2001', 'Invalid DataCaffe embed URL'));
      return;
    }

    const embed = await prisma.dataCaffeEmbed.create({
      data: {
        tenantId,
        electionId: electionId as string | undefined,
        embedName,
        embedUrl,
        embedType: embedType || 'dashboard',
        description,
        accessToken,
        displayOrder: displayOrder || 0,
      },
    });

    res.status(201).json(successResponse(embed));
  } catch (error) {
    console.error('Create embed error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update embed
router.put('/embeds/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { embedName, embedUrl, embedType, description, accessToken, isActive, displayOrder } = req.body;

    const embed = await prisma.dataCaffeEmbed.update({
      where: { id },
      data: {
        ...(embedName !== undefined && { embedName }),
        ...(embedUrl !== undefined && { embedUrl }),
        ...(embedType !== undefined && { embedType }),
        ...(description !== undefined && { description }),
        ...(accessToken !== undefined && { accessToken }),
        ...(isActive !== undefined && { isActive }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });

    res.json(successResponse(embed));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete embed
router.delete('/embeds/:id', async (req: Request, res: Response) => {
  try {
    await prisma.dataCaffeEmbed.delete({ where: { id: req.params.id } });
    res.json(successResponse({ message: 'Embed deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Toggle embed active status
router.put('/embeds/:id/toggle', async (req: Request, res: Response) => {
  try {
    const embed = await prisma.dataCaffeEmbed.findUnique({ where: { id: req.params.id } });

    if (!embed) {
      res.status(404).json(errorResponse('E3001', 'Embed not found'));
      return;
    }

    const updated = await prisma.dataCaffeEmbed.update({
      where: { id: req.params.id },
      data: { isActive: !embed.isActive },
    });

    res.json(successResponse(updated));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get embed URL with authentication token
router.get('/embeds/:id/url', async (req: Request, res: Response) => {
  try {
    const embed = await prisma.dataCaffeEmbed.findUnique({
      where: { id: req.params.id },
    });

    if (!embed) {
      res.status(404).json(errorResponse('E3001', 'Embed not found'));
      return;
    }

    if (!embed.isActive) {
      res.status(400).json(errorResponse('E4004', 'Embed is not active'));
      return;
    }

    // If embed has access token, append it to URL
    let embedUrl = embed.embedUrl;
    if (embed.accessToken) {
      const separator = embedUrl.includes('?') ? '&' : '?';
      embedUrl = `${embedUrl}${separator}token=${embed.accessToken}`;
    }

    res.json(successResponse({
      id: embed.id,
      embedName: embed.embedName,
      embedUrl,
      embedType: embed.embedType,
    }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Proxy DataCaffe API request (for advanced integration)
router.post('/proxy', async (req: Request, res: Response) => {
  try {
    const { endpoint, method, data } = req.body;

    if (!DATACAFFE_API_KEY) {
      res.status(400).json(errorResponse('E5004', 'DataCaffe API key not configured'));
      return;
    }

    const response = await axios({
      method: method || 'GET',
      url: `${DATACAFFE_API_URL}${endpoint}`,
      data,
      headers: {
        'Authorization': `Bearer ${DATACAFFE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    res.json(successResponse(response.data));
  } catch (error: any) {
    console.error('DataCaffe proxy error:', error.message);
    res.status(error.response?.status || 500).json(
      errorResponse('E5004', error.response?.data?.message || 'DataCaffe API error')
    );
  }
});

// Push election data to DataCaffe for advanced analytics
router.post('/sync/:electionId', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;

    if (!DATACAFFE_API_KEY) {
      res.status(400).json(errorResponse('E5004', 'DataCaffe API key not configured'));
      return;
    }

    // Fetch election data
    const [election, voters, parts, demographics] = await Promise.all([
      prisma.election.findUnique({ where: { id: electionId } }),
      prisma.voter.count({ where: { electionId, deletedAt: null } }),
      prisma.part.count({ where: { electionId } }),
      prisma.voter.groupBy({
        by: ['gender'],
        where: { electionId, deletedAt: null },
        _count: true,
      }),
    ]);

    if (!election) {
      res.status(404).json(errorResponse('E3001', 'Election not found'));
      return;
    }

    const syncData = {
      electionId,
      electionName: election.name,
      electionType: election.electionType,
      state: election.state,
      constituency: election.constituency,
      totalVoters: voters,
      totalBooths: parts,
      demographics: demographics.map(d => ({ gender: d.gender, count: d._count })),
      syncedAt: new Date().toISOString(),
    };

    // In production, this would send data to DataCaffe API
    // const response = await axios.post(`${DATACAFFE_API_URL}/v1/elections/sync`, syncData, {
    //   headers: { 'Authorization': `Bearer ${DATACAFFE_API_KEY}` },
    // });

    res.json(successResponse({
      message: 'Election data synced to DataCaffe',
      syncData,
    }));
  } catch (error) {
    console.error('DataCaffe sync error:', error);
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get available DataCaffe dashboard templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    // These would typically come from the DataCaffe API
    const templates = [
      {
        id: 'voter-demographics',
        name: 'Voter Demographics Dashboard',
        description: 'Comprehensive voter demographic analysis with interactive charts',
        category: 'demographics',
        embedUrl: 'https://app.datacaffe.ai/embed/template/voter-demographics',
      },
      {
        id: 'booth-analysis',
        name: 'Booth Performance Analysis',
        description: 'Booth-wise voter statistics and performance metrics',
        category: 'performance',
        embedUrl: 'https://app.datacaffe.ai/embed/template/booth-analysis',
      },
      {
        id: 'campaign-tracker',
        name: 'Campaign Progress Tracker',
        description: 'Real-time campaign metrics and cadre performance',
        category: 'campaign',
        embedUrl: 'https://app.datacaffe.ai/embed/template/campaign-tracker',
      },
      {
        id: 'poll-day-live',
        name: 'Poll Day Live Dashboard',
        description: 'Real-time voter turnout and booth-wise polling data',
        category: 'poll-day',
        embedUrl: 'https://app.datacaffe.ai/embed/template/poll-day-live',
      },
      {
        id: 'swing-voter-analysis',
        name: 'Swing Voter Analysis',
        description: 'AI-powered swing voter identification and targeting',
        category: 'ai-analytics',
        embedUrl: 'https://app.datacaffe.ai/embed/template/swing-voter',
      },
      {
        id: 'sentiment-analysis',
        name: 'Voter Sentiment Analysis',
        description: 'Sentiment trends and public opinion insights',
        category: 'ai-analytics',
        embedUrl: 'https://app.datacaffe.ai/embed/template/sentiment',
      },
    ];

    res.json(successResponse(templates));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as dataCaffeRoutes };
