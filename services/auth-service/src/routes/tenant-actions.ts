import { Router, Request, Response } from 'express';
import { successResponse, errorResponse, createLogger } from '@electioncaffe/shared';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getTenantDb } from '../utils/tenantDb.js';
import { verifyCredits } from '@electioncaffe/database';

// Feature credit cost for action generation
const ACTION_GENERATION_CREDIT_COST = 2;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptsDir = resolve(__dirname, '../../../../../prompts');

const logger = createLogger('auth-service');
const router = Router();

// Helper to get tenantId from request headers (set by JWT middleware)
function getTenantId(req: Request): string | null {
  return (req.headers['x-tenant-id'] as string) || null;
}

// Get all actions for tenant
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      actionType,
      assignedTo,
      newsId,
      geographicLevel,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    // Build where clause
    const where: any = { tenantId };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (actionType) where.actionType = actionType;
    if (assignedTo) where.assignedTo = assignedTo;
    if (newsId) where.newsId = newsId;
    if (geographicLevel) where.geographicLevel = geographicLevel;

    const [actions, total] = await Promise.all([
      (tenantDb as any).actionItem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          news: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
      }),
      (tenantDb as any).actionItem.count({ where }),
    ]);

    res.json(successResponse({
      data: actions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get tenant actions error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get single action
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    const action = await (tenantDb as any).actionItem.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        news: true,
      },
    });

    if (!action) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    res.json(successResponse(action));
  } catch (error) {
    logger.error({ err: error }, 'Get action detail error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create action
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    // Only allow certain roles to create actions
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

    const {
      newsId,
      title,
      titleLocal,
      description,
      descriptionLocal,
      actionType,
      priority = 'MEDIUM',
      geographicLevel,
      state,
      region,
      district,
      constituency,
      section,
      booth,
      assignedTo,
      assignedToName,
      dueDate,
      estimatedImpact,
      requiredResources,
      targetAudience,
      successMetrics,
    } = req.body;

    if (!title || !actionType) {
      res.status(400).json(errorResponse('E2001', 'Title and action type are required'));
      return;
    }

    const action = await (tenantDb as any).actionItem.create({
      data: {
        tenantId,
        newsId,
        title,
        titleLocal,
        description,
        descriptionLocal,
        actionType,
        priority,
        status: 'PENDING',
        geographicLevel,
        state,
        region,
        district,
        constituency,
        section,
        booth,
        assignedTo,
        assignedToName,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedImpact,
        requiredResources,
        targetAudience,
        successMetrics,
        createdBy: userId,
      },
      include: {
        news: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.status(201).json(successResponse({ ...action, message: 'Action created successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Create action error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update action
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

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

    const existingAction = await (tenantDb as any).actionItem.findFirst({
      where: { id, tenantId },
    });

    if (!existingAction) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    const {
      title,
      titleLocal,
      description,
      descriptionLocal,
      actionType,
      priority,
      geographicLevel,
      state,
      region,
      district,
      constituency,
      section,
      booth,
      assignedTo,
      assignedToName,
      dueDate,
      estimatedImpact,
      requiredResources,
      targetAudience,
      successMetrics,
    } = req.body;

    const action = await (tenantDb as any).actionItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleLocal !== undefined && { titleLocal }),
        ...(description !== undefined && { description }),
        ...(descriptionLocal !== undefined && { descriptionLocal }),
        ...(actionType !== undefined && { actionType }),
        ...(priority !== undefined && { priority }),
        ...(geographicLevel !== undefined && { geographicLevel }),
        ...(state !== undefined && { state }),
        ...(region !== undefined && { region }),
        ...(district !== undefined && { district }),
        ...(constituency !== undefined && { constituency }),
        ...(section !== undefined && { section }),
        ...(booth !== undefined && { booth }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(assignedToName !== undefined && { assignedToName }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(estimatedImpact !== undefined && { estimatedImpact }),
        ...(requiredResources !== undefined && { requiredResources }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(successMetrics !== undefined && { successMetrics }),
      },
    });

    res.json(successResponse({ ...action, message: 'Action updated successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Update action error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Update action status
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, completionNotes, outcome } = req.body;

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    const existingAction = await (tenantDb as any).actionItem.findFirst({
      where: { id, tenantId },
    });

    if (!existingAction) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json(errorResponse('E2001', 'Invalid status'));
      return;
    }

    const updateData: any = { status };

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      if (completionNotes) updateData.completionNotes = completionNotes;
      if (outcome) updateData.outcome = outcome;
    }

    if (status === 'IN_PROGRESS' && existingAction.status === 'PENDING') {
      updateData.startedAt = new Date();
    }

    const action = await (tenantDb as any).actionItem.update({
      where: { id },
      data: updateData,
    });

    res.json(successResponse({ ...action, message: `Action status updated to ${status}` }));
  } catch (error) {
    logger.error({ err: error }, 'Update action status error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Assign action to user
router.patch('/:id/assign', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;
    const { assignedTo, assignedToName } = req.body;

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

    const existingAction = await (tenantDb as any).actionItem.findFirst({
      where: { id, tenantId },
    });

    if (!existingAction) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    const action = await (tenantDb as any).actionItem.update({
      where: { id },
      data: {
        assignedTo,
        assignedToName,
        assignedAt: new Date(),
      },
    });

    res.json(successResponse({ ...action, message: 'Action assigned successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Assign action error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete action
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    const { id } = req.params;

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

    const existingAction = await (tenantDb as any).actionItem.findFirst({
      where: { id, tenantId },
    });

    if (!existingAction) {
      res.status(404).json(errorResponse('E3001', 'Action not found'));
      return;
    }

    await (tenantDb as any).actionItem.delete({ where: { id } });

    res.json(successResponse({ message: 'Action deleted successfully' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete action error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get actions dashboard/stats
router.get('/stats/dashboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    // Get counts by status
    const statusCounts = await (tenantDb as any).actionItem.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    });

    // Get counts by priority
    const priorityCounts = await (tenantDb as any).actionItem.groupBy({
      by: ['priority'],
      where: { tenantId },
      _count: { id: true },
    });

    // Get counts by action type
    const typeCounts = await (tenantDb as any).actionItem.groupBy({
      by: ['actionType'],
      where: { tenantId },
      _count: { id: true },
    });

    // Get overdue actions count
    const overdueCount = await (tenantDb as any).actionItem.count({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    // Get recent actions
    const recentActions = await (tenantDb as any).actionItem.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignedToName: true,
      },
    });

    // Get upcoming due actions
    const upcomingActions = await (tenantDb as any).actionItem.findMany({
      where: {
        tenantId,
        dueDate: { gte: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      take: 5,
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignedToName: true,
      },
    });

    res.json(successResponse({
      statusCounts: statusCounts.map((s: any) => ({ status: s.status, count: s._count.id })),
      priorityCounts: priorityCounts.map((p: any) => ({ priority: p.priority, count: p._count.id })),
      typeCounts: typeCounts.map((t: any) => ({ type: t.actionType, count: t._count.id })),
      overdueCount,
      recentActions,
      upcomingActions,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get actions stats error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get my assigned actions
router.get('/my/assigned', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(404).json(errorResponse('E3001', 'Tenant not found'));
      return;
    }

    const tenantDb = await getTenantDb(req);

    const where: any = {
      tenantId,
      assignedTo: userId,
    };

    if (status) where.status = status;

    const [actions, total] = await Promise.all([
      (tenantDb as any).actionItem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        include: {
          news: {
            select: { id: true, title: true },
          },
        },
      }),
      (tenantDb as any).actionItem.count({ where }),
    ]);

    res.json(successResponse({
      data: actions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get my actions error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Generate actions from news using AI
router.post('/generate/:newsId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { newsId } = req.params;

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

    // Check if news exists and is accessible
    const news = await (tenantDb as any).newsInformation.findFirst({
      where: {
        id: newsId,
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
      systemPrompt = readFileSync(resolve(promptsDir, 'action-generation-system.txt'), 'utf-8');
      userPromptTemplate = readFileSync(resolve(promptsDir, 'action-generation-user.txt'), 'utf-8');
    } catch (err) {
      logger.error({ err }, 'Failed to load prompt files');
      res.status(500).json(errorResponse('E5004', 'Prompt files not found'));
      return;
    }

    const userPrompt = userPromptTemplate
      .replace('{{newsTitle}}', news.title || '')
      .replace('{{newsContent}}', news.content || news.summary || '')
      .replace('{{newsCategory}}', news.category || 'POLITICAL')
      .replace('{{constituency}}', news.constituency || 'N/A')
      .replace('{{state}}', news.state || 'N/A')
      .replace('{{aiAnalysis}}', JSON.stringify(news.aiAnalysis || 'Not available'));

    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    logger.info({ model, newsId }, 'Requesting AI action generation');

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

    if (!credits || availableCredits < ACTION_GENERATION_CREDIT_COST) {
      res.status(403).json(errorResponse('E4003', `Insufficient AI credits. Required: ${ACTION_GENERATION_CREDIT_COST}, Available: ${availableCredits}`));
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
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      logger.error({ status: aiResponse.status, error: errorData }, 'OpenAI API error');
      res.status(502).json(errorResponse('E5003', 'AI action generation failed'));
      return;
    }

    const result: any = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content;

    let actionsData: any;
    try {
      actionsData = JSON.parse(content);
    } catch {
      logger.error({ content }, 'Failed to parse AI action response');
      res.status(502).json(errorResponse('E5003', 'Invalid AI response format'));
      return;
    }

    // Create action items from AI response
    const createdActions = [];
    for (const action of (actionsData.actions || [])) {
      const created = await (tenantDb as any).actionItem.create({
        data: {
          tenantId,
          newsId: newsId,
          title: action.title || 'Untitled Action',
          description: action.description || '',
          actionType: action.actionType || 'OTHER',
          priority: action.priority || 'MEDIUM',
          status: 'pending',
          geographicLevel: action.geographicLevel || news.geographicLevel || 'CONSTITUENCY',
          state: news.state,
          constituency: news.constituency,
          targetAudience: action.targetAudience || null,
          estimatedImpact: action.expectedImpact || null,
          aiGenerated: true,
          metadata: {
            confidence: action.confidence,
            reasoning: action.reasoning,
            steps: action.steps,
          },
          dueDate: action.suggestedDeadline ? new Date(action.suggestedDeadline) : null,
          createdBy: userId,
        },
      });
      createdActions.push(created);
    }

    logger.info({ newsId, actionsCreated: createdActions.length }, 'AI action generation complete');

    // Deduct credits in tenant DB (tenant isolation)
    const responseTime = Date.now() - startTime;
    try {
      await (tenantDb as any).$transaction(async (tx: any) => {
        await tx.tenantAICredits.update({
          where: { tenantId: tenantId! },
          data: { usedCredits: { increment: ACTION_GENERATION_CREDIT_COST } },
        });
        await tx.aIUsageLog.create({
          data: {
            tenantCreditsId: credits.id,
            userId,
            featureKey: 'action_generation',
            creditsUsed: ACTION_GENERATION_CREDIT_COST,
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
            credits: -ACTION_GENERATION_CREDIT_COST,
            description: `Used ${ACTION_GENERATION_CREDIT_COST} credits for action_generation`,
            referenceType: 'AI_FEATURE',
            referenceId: 'action_generation',
            createdBy: userId,
          },
        });
      });
    } catch (creditErr) {
      logger.warn({ err: creditErr }, 'Failed to deduct credits for action generation');
    }

    res.status(201).json(successResponse({
      message: `Generated ${createdActions.length} action items from news`,
      newsId,
      newsTitle: news.title,
      actions: createdActions,
      generatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Generate actions error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

export { router as tenantActionsRoutes };
