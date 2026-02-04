import { Router, Request, Response } from 'express';
import { coreDb as prisma } from '@electioncaffe/database';
import { superAdminAuth } from '../middleware/superAdminAuth.js';

const router = Router();

// Apply super admin auth to all routes
router.use(superAdminAuth);

// Get all actions with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      tenantId,
      newsId,
      status,
      priority,
      actionType,
      assignedTo,
      isAiGenerated,
      geographicLevel,
      state,
      district,
      constituency,
      startDate,
      endDate,
      search,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (newsId) where.newsId = newsId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (actionType) where.actionType = actionType;
    if (assignedTo) where.assignedTo = assignedTo;
    if (isAiGenerated !== undefined) where.isAiGenerated = isAiGenerated === 'true';
    if (geographicLevel) where.geographicLevel = geographicLevel;
    if (state) where.state = state;
    if (district) where.district = district;
    if (constituency) where.constituency = constituency;

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [actions, total] = await Promise.all([
      prisma.actionItem.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          news: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
          _count: {
            select: { impactLogs: true },
          },
        },
      }),
      prisma.actionItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: actions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch actions',
      message: error.message,
    });
  }
});

// Get action by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const action = await prisma.actionItem.findUnique({
      where: { id },
      include: {
        news: true,
        impactLogs: {
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    res.json({
      success: true,
      data: action,
    });
  } catch (error: any) {
    console.error('Error fetching action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch action',
      message: error.message,
    });
  }
});

// Create action manually
router.post('/', async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).superAdmin?.id;
    const {
      tenantId,
      newsId,
      title,
      titleLocal,
      description,
      descriptionLocal,
      actionType,
      priority,
      geographicLevel,
      state,
      district,
      constituency,
      section,
      booth,
      targetAudience,
      targetCount,
      targetRoles,
      assignedTo,
      assignedToName,
      suggestedDeadline,
      deadline,
      executionSteps,
    } = req.body;

    if (!tenantId || !title) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID and title are required',
      });
    }

    const action = await prisma.actionItem.create({
      data: {
        tenantId,
        newsId: newsId || null,
        title,
        titleLocal,
        description,
        descriptionLocal,
        actionType: actionType || 'OTHER',
        priority: priority || 'MEDIUM',
        status: 'PENDING_REVIEW',
        geographicLevel: geographicLevel || 'CONSTITUENCY',
        state,
        district,
        constituency,
        section,
        booth,
        targetAudience,
        targetCount,
        targetRoles: targetRoles || [],
        assignedTo,
        assignedToName,
        assignedBy: assignedTo ? superAdminId : null,
        assignedAt: assignedTo ? new Date() : null,
        suggestedDeadline: suggestedDeadline ? new Date(suggestedDeadline) : null,
        deadline: deadline ? new Date(deadline) : null,
        executionSteps: executionSteps || [],
        isAiGenerated: false,
        createdBy: superAdminId,
      },
    });

    res.status(201).json({
      success: true,
      data: action,
      message: 'Action created successfully',
    });
  } catch (error: any) {
    console.error('Error creating action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create action',
      message: error.message,
    });
  }
});

// Generate AI actions for a news item
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const superAdminId = (req as any).superAdmin?.id;
    const { newsId, tenantId } = req.body;

    if (!newsId || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'News ID and Tenant ID are required',
      });
    }

    const news = await prisma.newsInformation.findUnique({
      where: { id: newsId },
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    // TODO: Integrate with actual AI service (OpenAI, Claude, etc.)
    // For now, generate simulated AI actions based on news content
    const aiActions = generateSimulatedAIActions(news, tenantId, superAdminId);

    // Create all AI-generated actions
    const createdActions = await Promise.all(
      aiActions.map((action: any) =>
        prisma.actionItem.create({
          data: action,
        })
      )
    );

    res.status(201).json({
      success: true,
      data: createdActions,
      message: `${createdActions.length} AI actions generated successfully`,
    });
  } catch (error: any) {
    console.error('Error generating AI actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI actions',
      message: error.message,
    });
  }
});

// Update action
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;

    const existing = await prisma.actionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
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
      district,
      constituency,
      section,
      booth,
      targetAudience,
      targetCount,
      targetRoles,
      deadline,
      executionSteps,
      executionNotes,
      attachments,
    } = req.body;

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        title,
        titleLocal,
        description,
        descriptionLocal,
        actionType,
        priority,
        geographicLevel,
        state,
        district,
        constituency,
        section,
        booth,
        targetAudience,
        targetCount,
        targetRoles,
        deadline: deadline ? new Date(deadline) : undefined,
        executionSteps,
        executionNotes,
        attachments,
        updatedBy: superAdminId,
      },
    });

    res.json({
      success: true,
      data: action,
      message: 'Action updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update action',
      message: error.message,
    });
  }
});

// Approve action
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;
    const { reviewNotes } = req.body;

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: superAdminId,
        reviewedAt: new Date(),
        reviewNotes,
      },
    });

    res.json({
      success: true,
      data: action,
      message: 'Action approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve action',
      message: error.message,
    });
  }
});

// Reject action
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;
    const { rejectionReason, reviewNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
      });
    }

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: superAdminId,
        reviewedAt: new Date(),
        reviewNotes,
        rejectionReason,
      },
    });

    res.json({
      success: true,
      data: action,
      message: 'Action rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject action',
      message: error.message,
    });
  }
});

// Assign action
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;
    const { assignedTo, assignedToName } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'Assigned user is required',
      });
    }

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        assignedTo,
        assignedToName,
        assignedBy: superAdminId,
        assignedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: action,
      message: 'Action assigned successfully',
    });
  } catch (error: any) {
    console.error('Error assigning action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign action',
      message: error.message,
    });
  }
});

// Start action execution
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.actionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    if (existing.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Only approved actions can be started',
      });
    }

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: action,
      message: 'Action execution started',
    });
  } catch (error: any) {
    console.error('Error starting action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start action',
      message: error.message,
    });
  }
});

// Complete action
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;
    const { outcome, outcomeRating, impactMeasured, lessonsLearned } = req.body;

    const existing = await prisma.actionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    if (existing.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        error: 'Only in-progress actions can be completed',
      });
    }

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        outcome,
        outcomeRating,
        impactMeasured,
        lessonsLearned,
        updatedBy: superAdminId,
      },
    });

    res.json({
      success: true,
      data: action,
      message: 'Action completed successfully',
    });
  } catch (error: any) {
    console.error('Error completing action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete action',
      message: error.message,
    });
  }
});

// Cancel action
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;
    const { reason } = req.body;

    const action = await prisma.actionItem.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        reviewNotes: reason,
        updatedBy: superAdminId,
      },
    });

    res.json({
      success: true,
      data: action,
      message: 'Action cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel action',
      message: error.message,
    });
  }
});

// Add impact log to action
router.post('/:id/impact', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdminId = (req as any).superAdmin?.id;
    const {
      impactType,
      impactCategory,
      metricName,
      metricValue,
      metricUnit,
      previousValue,
      description,
      evidence,
    } = req.body;

    if (!metricName || metricValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Metric name and value are required',
      });
    }

    const changePercent =
      previousValue !== undefined && previousValue !== 0
        ? ((metricValue - previousValue) / previousValue) * 100
        : null;

    const impactLog = await prisma.actionImpactLog.create({
      data: {
        actionId: id,
        impactType: impactType || 'neutral',
        impactCategory,
        metricName,
        metricValue,
        metricUnit,
        previousValue,
        changePercent,
        description,
        evidence: evidence || [],
        recordedBy: superAdminId,
      },
    });

    res.status(201).json({
      success: true,
      data: impactLog,
      message: 'Impact logged successfully',
    });
  } catch (error: any) {
    console.error('Error logging impact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log impact',
      message: error.message,
    });
  }
});

// Get impact logs for an action
router.get('/:id/impact', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const impactLogs = await prisma.actionImpactLog.findMany({
      where: { actionId: id },
      orderBy: { recordedAt: 'desc' },
    });

    res.json({
      success: true,
      data: impactLogs,
    });
  } catch (error: any) {
    console.error('Error fetching impact logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch impact logs',
      message: error.message,
    });
  }
});

// Delete action
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const action = await prisma.actionItem.findUnique({
      where: { id },
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
      });
    }

    if (['IN_PROGRESS', 'COMPLETED'].includes(action.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete in-progress or completed actions',
      });
    }

    await prisma.actionItem.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Action deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete action',
      message: error.message,
    });
  }
});

// Get action statistics
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
      totalActions,
      byStatus,
      byPriority,
      byType,
      aiGenerated,
      recentActions,
    ] = await Promise.all([
      prisma.actionItem.count({ where }),
      prisma.actionItem.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.actionItem.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      prisma.actionItem.groupBy({
        by: ['actionType'],
        where,
        _count: true,
        orderBy: { _count: { actionType: 'desc' } },
        take: 10,
      }),
      prisma.actionItem.count({
        where: { ...where, isAiGenerated: true },
      }),
      prisma.actionItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          actionType: true,
          priority: true,
          status: true,
          isAiGenerated: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalActions,
        aiGeneratedCount: aiGenerated,
        byStatus: byStatus.reduce((acc: any, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc: any, item) => {
          acc[item.priority] = item._count;
          return acc;
        }, {}),
        byType: byType.map((item) => ({
          type: item.actionType,
          count: item._count,
        })),
        recentActions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching action stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch action statistics',
      message: error.message,
    });
  }
});

// Analyze impact of actions (AI-powered)
router.post('/analyze-impact', async (req: Request, res: Response) => {
  try {
    const { tenantId, newsId, actionId } = req.body;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (newsId) where.newsId = newsId;
    if (actionId) where.id = actionId;

    const actions = await prisma.actionItem.findMany({
      where: {
        ...where,
        status: 'COMPLETED',
      },
      include: {
        news: true,
        impactLogs: true,
      },
    });

    // TODO: Integrate with actual AI service for impact analysis
    // For now, generate simulated analysis
    const analysis = {
      totalActionsAnalyzed: actions.length,
      overallImpactScore: 72,
      summary:
        'Based on the completed actions, there has been a moderate positive impact on voter engagement and community outreach. Field visits and communication activities showed the highest effectiveness.',
      insights: [
        {
          type: 'positive',
          title: 'Strong Community Response',
          description:
            'Field visits resulted in 35% higher engagement than expected',
          confidence: 0.85,
        },
        {
          type: 'improvement',
          title: 'Communication Timing',
          description:
            'Evening communications had 2x higher engagement than morning ones',
          confidence: 0.78,
        },
        {
          type: 'warning',
          title: 'Resource Allocation',
          description:
            'Some areas received less coverage due to uneven resource distribution',
          confidence: 0.65,
        },
      ],
      recommendations: [
        'Focus field visits on high-impact areas identified in analysis',
        'Schedule communications during peak engagement hours (6-8 PM)',
        'Reallocate resources to underserved constituencies',
      ],
      impactByType: {
        FIELD_VISIT: { score: 85, actions: 3 },
        COMMUNICATION: { score: 72, actions: 5 },
        MEETING: { score: 68, actions: 2 },
        VOTER_OUTREACH: { score: 78, actions: 4 },
      },
    };

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('Error analyzing impact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze impact',
      message: error.message,
    });
  }
});

// Helper function to generate simulated AI actions
function generateSimulatedAIActions(news: any, tenantId: string, createdBy: string) {
  const actionTypes = [
    {
      type: 'FIELD_VISIT',
      title: `Site assessment for: ${news.title.substring(0, 50)}`,
      description: `Conduct field visit to assess the situation related to: ${news.summary || news.title}`,
      priority: 'HIGH',
      steps: [
        'Identify key stakeholders to meet',
        'Prepare assessment checklist',
        'Conduct field visit',
        'Document findings with photos',
        'Submit field report',
      ],
    },
    {
      type: 'COMMUNICATION',
      title: `Issue communication regarding: ${news.title.substring(0, 50)}`,
      description: `Prepare and disseminate official communication addressing the matter`,
      priority: 'MEDIUM',
      steps: [
        'Draft communication content',
        'Get approval from leadership',
        'Translate to local language',
        'Distribute via WhatsApp groups',
        'Follow up on reach metrics',
      ],
    },
    {
      type: 'VOTER_OUTREACH',
      title: `Voter engagement for: ${news.title.substring(0, 50)}`,
      description: `Reach out to affected voters to understand their concerns and provide support`,
      priority: 'MEDIUM',
      steps: [
        'Identify affected voter groups',
        'Prepare talking points',
        'Organize door-to-door visits',
        'Record feedback and concerns',
        'Report findings to central team',
      ],
    },
    {
      type: 'MONITORING',
      title: `Monitor developments: ${news.title.substring(0, 50)}`,
      description: `Set up monitoring mechanism to track situation developments`,
      priority: 'LOW',
      steps: [
        'Set up news alerts',
        'Assign monitoring responsibility',
        'Create daily update schedule',
        'Establish escalation triggers',
        'Document all developments',
      ],
    },
  ];

  // Select appropriate actions based on news category and priority
  let selectedActions = actionTypes;
  if (news.priority === 'CRITICAL') {
    selectedActions = actionTypes.slice(0, 3); // Include field visit, communication, outreach
  } else if (news.priority === 'HIGH') {
    selectedActions = actionTypes.slice(0, 2);
  } else {
    selectedActions = [actionTypes[1], actionTypes[3]]; // Communication and monitoring
  }

  return selectedActions.map((action, index) => ({
    tenantId,
    newsId: news.id,
    title: action.title,
    description: action.description,
    actionType: action.type as any,
    priority: action.priority as any,
    status: 'SUGGESTED' as const,
    geographicLevel: news.geographicLevel,
    state: news.state,
    district: news.district,
    constituency: news.constituency,
    section: news.section,
    booth: news.booth,
    targetRoles: ['COORDINATOR', 'BOOTH_INCHARGE'],
    suggestedDeadline: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000), // Staggered deadlines
    isAiGenerated: true,
    aiConfidence: 75 + Math.random() * 20, // 75-95%
    aiReasoning: `This action was suggested based on the news category (${news.category}), priority level (${news.priority}), and geographic scope (${news.geographicLevel}). Historical data shows this type of action is effective for similar situations.`,
    aiSuggestedSteps: action.steps,
    expectedImpact: {
      voterEngagement: '+15-25%',
      awareness: '+30-40%',
      sentiment: 'Positive shift expected',
    },
    riskAssessment: {
      level: 'Low to Medium',
      factors: ['Resource availability', 'Timing constraints'],
      mitigation: 'Early planning and resource allocation recommended',
    },
    resourceEstimate: {
      personnel: 2 + index,
      days: 1 + index,
      budget: 5000 + index * 2000,
    },
    createdBy,
  }));
}

export const actionsRoutes = router;
