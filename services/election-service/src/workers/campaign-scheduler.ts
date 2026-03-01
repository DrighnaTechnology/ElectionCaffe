import { coreDb } from '../utils/tenantDb.js';
import { getTenantClientBySlug } from '@electioncaffe/database';
import { createLogger, getProviderFromConfig } from '@electioncaffe/shared';
import type { NotificationProvider, MessageResult } from '@electioncaffe/shared';

const logger = createLogger('campaign-scheduler');

const POLL_INTERVAL_MS = 60_000; // Check every 60 seconds
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

/**
 * Starts the campaign scheduler that polls for scheduled campaigns
 * and triggers sending when their scheduledAt time has passed.
 */
export function startCampaignScheduler(): void {
  logger.info('Campaign scheduler started');

  setInterval(async () => {
    try {
      await processScheduledCampaigns();
    } catch (error) {
      logger.error({ err: error }, 'Campaign scheduler tick error');
    }
  }, POLL_INTERVAL_MS);
}

async function processScheduledCampaigns(): Promise<void> {
  // Get all tenants
  const tenants = await coreDb.tenant.findMany({
    where: { status: 'ACTIVE' },
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

  for (const tenant of tenants) {
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
        tenant.id,
      );

      // Find campaigns that are SCHEDULED and due
      const dueCampaigns = await (tenantDb as any).campaign.findMany({
        where: {
          tenantId: tenant.id,
          status: 'SCHEDULED',
          scheduledAt: { lte: new Date() },
        },
      });

      for (const campaign of dueCampaigns) {
        logger.info({ campaignId: campaign.id, tenantId: tenant.id }, 'Processing scheduled campaign');
        await executeCampaign(tenantDb, tenant.id, campaign);
      }
    } catch (error) {
      logger.error({ err: error, tenantId: tenant.id }, 'Error processing tenant campaigns');
    }
  }
}

async function executeCampaign(tenantDb: any, tenantId: string, campaign: any): Promise<void> {
  try {
    // Get provider
    const providerRecord = await tenantDb.messagingProvider.findFirst({
      where: { tenantId, channel: campaign.campaignType, isActive: true, isDefault: true },
    });

    const provider: NotificationProvider = getProviderFromConfig(providerRecord);

    // Get target voters
    const contactField = campaign.campaignType === 'EMAIL' ? 'email' : 'mobile';
    const voters = await tenantDb.voter.findMany({
      where: {
        electionId: campaign.electionId,
        isDead: false,
        isShifted: false,
        [contactField]: { not: null },
      },
      select: { id: true, name: true, mobile: true, email: true },
    });

    if (voters.length === 0) {
      await tenantDb.campaign.update({
        where: { id: campaign.id },
        data: { status: 'FAILED' },
      });
      return;
    }

    // Update status to SENDING
    await tenantDb.campaign.update({
      where: { id: campaign.id },
      data: { status: 'SENDING', startedAt: new Date(), targetCount: voters.length },
    });

    // Create message records
    const messageRecords = voters.map((voter: any) => ({
      campaignId: campaign.id,
      voterId: voter.id,
      voterName: voter.name,
      phone: voter.mobile,
      email: voter.email,
      channel: campaign.campaignType,
      status: 'QUEUED',
    }));

    await tenantDb.campaignMessage.createMany({ data: messageRecords });

    // Process messages
    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    let offset = 0;
    while (true) {
      const batch = await tenantDb.campaignMessage.findMany({
        where: { campaignId: campaign.id, status: 'QUEUED' },
        take: BATCH_SIZE,
        skip: offset,
      });

      if (batch.length === 0) break;

      for (const msg of batch) {
        const personalizedMessage = campaign.message
          .replace(/\{\{voter_name\}\}/gi, msg.voterName || 'Voter')
          .replace(/\{\{name\}\}/gi, msg.voterName || 'Voter');

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
              result = { success: false, error: 'Unknown channel', provider: 'unknown' };
          }
        } catch (err: any) {
          result = { success: false, error: err.message, provider: 'error' };
        }

        if (result.success) {
          sentCount++;
          deliveredCount++;
          await tenantDb.campaignMessage.update({
            where: { id: msg.id },
            data: { status: 'SENT', providerMessageId: result.messageId, sentAt: new Date() },
          });
        } else {
          failedCount++;
          await tenantDb.campaignMessage.update({
            where: { id: msg.id },
            data: { status: 'FAILED', errorMessage: result.error },
          });
        }
      }

      await tenantDb.campaign.update({
        where: { id: campaign.id },
        data: { sentCount, deliveredCount, failedCount },
      });

      if (batch.length === BATCH_SIZE) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    await tenantDb.campaign.update({
      where: { id: campaign.id },
      data: {
        status: failedCount === sentCount + failedCount ? 'FAILED' : 'COMPLETED',
        sentCount,
        deliveredCount,
        failedCount,
        completedAt: new Date(),
      },
    });

    logger.info({ campaignId: campaign.id, sentCount, failedCount }, 'Scheduled campaign completed');
  } catch (error) {
    logger.error({ err: error, campaignId: campaign.id }, 'Scheduled campaign execution error');
    await tenantDb.campaign.update({
      where: { id: campaign.id },
      data: { status: 'FAILED' },
    }).catch(() => {});
  }
}
