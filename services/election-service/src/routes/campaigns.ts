import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createPaginationMeta, calculateSkip, paginationSchema, createLogger, getProviderFromConfig } from '@electioncaffe/shared';
import type { NotificationProvider, MessageResult } from '@electioncaffe/shared';

const logger = createLogger('campaigns');
const router = Router();

// ==================== GET /campaigns ====================
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, status } = req.query;
    const validation = paginationSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
      return;
    }

    const { page, limit, search, sort, order } = validation.data;
    const skip = calculateSkip(page, limit);

    const where: any = {};
    if (electionId) where.electionId = electionId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { campaignName: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      (tenantDb as any).campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
      }),
      (tenantDb as any).campaign.count({ where }),
    ]);

    res.json(successResponse(campaigns, createPaginationMeta(total, page, limit)));
  } catch (error) {
    logger.error({ err: error }, 'Get campaigns error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== GET /campaigns/stats ====================
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { electionId } = req.query;

    const where: any = { tenantId };
    if (electionId) where.electionId = electionId;

    const [total, sent, delivered, active] = await Promise.all([
      (tenantDb as any).campaign.count({ where }),
      (tenantDb as any).campaign.aggregate({ where, _sum: { sentCount: true } }),
      (tenantDb as any).campaign.aggregate({ where, _sum: { deliveredCount: true } }),
      (tenantDb as any).campaign.count({ where: { ...where, status: { in: ['SENDING', 'SCHEDULED'] } } }),
    ]);

    res.json(successResponse({
      totalCampaigns: total,
      messagesSent: sent._sum.sentCount || 0,
      delivered: delivered._sum.deliveredCount || 0,
      active,
    }));
  } catch (error) {
    logger.error({ err: error }, 'Get campaign stats error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== GET /campaigns/provider-status ====================
router.get('/provider-status', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;

    const providers = await (tenantDb as any).messagingProvider.findMany({
      where: { tenantId, isActive: true },
      select: { channel: true, provider: true, isDefault: true },
    });

    const configured: Record<string, boolean> = {
      SMS: false,
      WHATSAPP: false,
      EMAIL: false,
      VOICE: false,
    };

    for (const p of providers) {
      configured[p.channel] = true;
    }

    res.json(successResponse(configured));
  } catch (error) {
    logger.error({ err: error }, 'Get provider status error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== GET /campaigns/:id ====================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const campaign = await (tenantDb as any).campaign.findUnique({
      where: { id },
      include: {
        _count: { select: { messages: true } },
      },
    });

    if (!campaign) {
      res.status(404).json(errorResponse('E3001', 'Campaign not found'));
      return;
    }

    res.json(successResponse(campaign));
  } catch (error) {
    logger.error({ err: error }, 'Get campaign error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== POST /campaigns ====================
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { electionId } = req.query;

    const {
      campaignName,
      campaignType,
      message,
      subject,
      mediaUrl,
      targetAudience,
      scheduledAt,
    } = req.body;

    if (!campaignName || !campaignType || !message || !electionId) {
      res.status(400).json(errorResponse('E2001', 'campaignName, campaignType, message, and electionId are required'));
      return;
    }

    // Count target voters based on audience filter
    const voterWhere = buildVoterFilter(electionId as string, targetAudience);
    const targetCount = await (tenantDb as any).voter.count({ where: voterWhere });

    const campaign = await (tenantDb as any).campaign.create({
      data: {
        tenantId,
        electionId: electionId as string,
        campaignName,
        campaignType,
        message,
        subject: subject || null,
        mediaUrl: mediaUrl || null,
        targetAudience: targetAudience || {},
        targetCount,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: userId,
      },
    });

    res.status(201).json(successResponse(campaign));
  } catch (error) {
    logger.error({ err: error }, 'Create campaign error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== PUT /campaigns/:id ====================
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const existing = await (tenantDb as any).campaign.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(errorResponse('E3001', 'Campaign not found'));
      return;
    }
    if (existing.status !== 'DRAFT') {
      res.status(400).json(errorResponse('E2001', 'Only DRAFT campaigns can be edited'));
      return;
    }

    const { campaignName, campaignType, message, subject, mediaUrl, targetAudience, scheduledAt } = req.body;

    // Recount targets if audience changed
    let targetCount = existing.targetCount;
    if (targetAudience) {
      const voterWhere = buildVoterFilter(existing.electionId, targetAudience);
      targetCount = await (tenantDb as any).voter.count({ where: voterWhere });
    }

    const updated = await (tenantDb as any).campaign.update({
      where: { id },
      data: {
        ...(campaignName && { campaignName }),
        ...(campaignType && { campaignType }),
        ...(message && { message }),
        ...(subject !== undefined && { subject }),
        ...(mediaUrl !== undefined && { mediaUrl }),
        ...(targetAudience && { targetAudience, targetCount }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      },
    });

    res.json(successResponse(updated));
  } catch (error) {
    logger.error({ err: error }, 'Update campaign error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== DELETE /campaigns/:id ====================
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const existing = await (tenantDb as any).campaign.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(errorResponse('E3001', 'Campaign not found'));
      return;
    }

    await (tenantDb as any).campaign.delete({ where: { id } });
    res.json(successResponse({ message: 'Campaign deleted' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete campaign error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== POST /campaigns/:id/send ====================
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const campaign = await (tenantDb as any).campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      res.status(404).json(errorResponse('E3001', 'Campaign not found'));
      return;
    }

    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      res.status(400).json(errorResponse('E2001', `Campaign is ${campaign.status}, cannot send`));
      return;
    }

    // Get messaging provider for this channel
    const providerRecord = await (tenantDb as any).messagingProvider.findFirst({
      where: { tenantId, channel: campaign.campaignType, isActive: true, isDefault: true },
    });

    const provider = getProviderFromConfig(providerRecord);
    const isMockProvider = !providerRecord;

    // Get target voters
    const voterWhere = buildVoterFilter(campaign.electionId, campaign.targetAudience);
    const contactField = campaign.campaignType === 'EMAIL' ? 'email' : 'mobile';

    const voters = await (tenantDb as any).voter.findMany({
      where: {
        ...voterWhere,
        [contactField]: { not: null },
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
      },
    });

    if (voters.length === 0) {
      res.status(400).json(errorResponse('E2001', 'No voters match the target audience with valid contact info'));
      return;
    }

    // Update campaign status to SENDING
    await (tenantDb as any).campaign.update({
      where: { id },
      data: { status: 'SENDING', startedAt: new Date(), targetCount: voters.length },
    });

    // Create campaign messages for all target voters
    const messageRecords = voters.map((voter: any) => ({
      campaignId: id,
      voterId: voter.id,
      voterName: voter.name,
      phone: voter.mobile,
      email: voter.email,
      channel: campaign.campaignType,
      status: 'QUEUED',
    }));

    await (tenantDb as any).campaignMessage.createMany({ data: messageRecords });

    // Send immediately and return success (processing happens async-like in batches)
    res.json(successResponse({
      message: isMockProvider
        ? `Campaign sending started (MOCK MODE - no real provider configured for ${campaign.campaignType}). ${voters.length} messages queued.`
        : `Campaign sending started. ${voters.length} messages queued.`,
      campaignId: id,
      totalTargets: voters.length,
      mockMode: isMockProvider,
    }));

    // Process messages in background (after response sent)
    processCampaignMessages(tenantDb, id, campaign, provider, logger).catch((err) => {
      logger.error({ err, campaignId: id }, 'Background campaign processing failed');
    });

  } catch (error) {
    logger.error({ err: error }, 'Send campaign error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== GET /campaigns/:id/messages ====================
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const validation = paginationSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
      return;
    }

    const { page, limit } = validation.data;
    const skip = calculateSkip(page, limit);
    const { status } = req.query;

    const where: any = { campaignId: id };
    if (status) where.status = status;

    const [messages, total] = await Promise.all([
      (tenantDb as any).campaignMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (tenantDb as any).campaignMessage.count({ where }),
    ]);

    res.json(successResponse(messages, createPaginationMeta(total, page, limit)));
  } catch (error) {
    logger.error({ err: error }, 'Get campaign messages error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== HELPER FUNCTIONS ====================

function buildVoterFilter(electionId: string, targetAudience: any): any {
  const where: any = {
    electionId,
    isDead: false,
    isShifted: false,
  };

  if (!targetAudience || typeof targetAudience !== 'object') {
    return where;
  }

  // Filter by political leaning
  if (targetAudience.politicalLeaning) {
    if (Array.isArray(targetAudience.politicalLeaning)) {
      where.politicalLeaning = { in: targetAudience.politicalLeaning };
    } else {
      where.politicalLeaning = targetAudience.politicalLeaning;
    }
  }

  // Preset target audience filters
  if (targetAudience.preset) {
    switch (targetAudience.preset) {
      case 'all':
        break;
      case 'loyal':
        where.politicalLeaning = 'LOYAL';
        break;
      case 'swing':
        where.politicalLeaning = 'SWING';
        break;
      case 'opposition':
        where.politicalLeaning = 'OPPOSITION';
        break;
      case 'youth':
        where.age = { gte: 18, lte: 35 };
        break;
      case 'seniors':
        where.age = { gte: 60 };
        break;
      case 'female':
        where.gender = 'FEMALE';
        break;
      case 'male':
        where.gender = 'MALE';
        break;
    }
  }

  // Filter by gender
  if (targetAudience.gender) {
    where.gender = targetAudience.gender;
  }

  // Filter by age range
  if (targetAudience.minAge || targetAudience.maxAge) {
    where.age = {};
    if (targetAudience.minAge) where.age.gte = targetAudience.minAge;
    if (targetAudience.maxAge) where.age.lte = targetAudience.maxAge;
  }

  // Filter by part/booth
  if (targetAudience.partId) {
    where.partId = targetAudience.partId;
  }
  if (targetAudience.boothId) {
    where.boothId = targetAudience.boothId;
  }

  // Filter by influence level
  if (targetAudience.influenceLevel) {
    if (Array.isArray(targetAudience.influenceLevel)) {
      where.influenceLevel = { in: targetAudience.influenceLevel };
    } else {
      where.influenceLevel = targetAudience.influenceLevel;
    }
  }

  return where;
}

async function processCampaignMessages(
  tenantDb: any,
  campaignId: string,
  campaign: any,
  provider: NotificationProvider,
  log: any,
): Promise<void> {
  const BATCH_SIZE = 50;
  const BATCH_DELAY_MS = 1000;

  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;

  // Personalize message with voter name
  function personalizeMessage(template: string, voter: any): string {
    return template
      .replace(/\{\{voter_name\}\}/gi, voter.voterName || 'Voter')
      .replace(/\{\{name\}\}/gi, voter.voterName || 'Voter');
  }

  try {
    // Process in batches
    let offset = 0;
    while (true) {
      const batch = await tenantDb.campaignMessage.findMany({
        where: { campaignId, status: 'QUEUED' },
        take: BATCH_SIZE,
        skip: offset,
      });

      if (batch.length === 0) break;

      for (const msg of batch) {
        const personalizedMessage = personalizeMessage(campaign.message, msg);
        let result: MessageResult;

        try {
          switch (campaign.campaignType) {
            case 'SMS':
              result = await provider.sendSMS(msg.phone, personalizedMessage);
              break;
            case 'WHATSAPP':
              result = await provider.sendWhatsApp(msg.phone, personalizedMessage, campaign.mediaUrl);
              break;
            case 'EMAIL':
              result = await provider.sendEmail(msg.email, campaign.subject || campaign.campaignName, personalizedMessage);
              break;
            case 'VOICE':
              result = await provider.sendVoice(msg.phone, personalizedMessage);
              break;
            default:
              result = { success: false, error: `Unknown channel: ${campaign.campaignType}`, provider: 'unknown' };
          }
        } catch (err: any) {
          result = { success: false, error: err.message, provider: 'error' };
        }

        // Update individual message status
        if (result.success) {
          sentCount++;
          deliveredCount++;
          await tenantDb.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: 'SENT',
              providerMessageId: result.messageId,
              sentAt: new Date(),
            },
          });
        } else {
          failedCount++;
          await tenantDb.campaignMessage.update({
            where: { id: msg.id },
            data: {
              status: 'FAILED',
              errorMessage: result.error,
            },
          });
        }
      }

      // Update campaign counts periodically
      await tenantDb.campaign.update({
        where: { id: campaignId },
        data: { sentCount, deliveredCount, failedCount },
      });

      // Rate limiting delay between batches
      if (batch.length === BATCH_SIZE) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // Mark campaign as completed
    await tenantDb.campaign.update({
      where: { id: campaignId },
      data: {
        status: failedCount === sentCount + failedCount ? 'FAILED' : 'COMPLETED',
        sentCount,
        deliveredCount,
        failedCount,
        completedAt: new Date(),
      },
    });

    log.info({ campaignId, sentCount, failedCount }, 'Campaign processing completed');
  } catch (error) {
    log.error({ err: error, campaignId }, 'Campaign processing error');
    await tenantDb.campaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' },
    }).catch(() => {});
  }
}

export { router as campaignRoutes };
