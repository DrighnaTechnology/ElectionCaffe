import { Router, Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import { successResponse, errorResponse, createLogger, getSupportedProviders, getProviderConfigFields, getProviderFromConfig } from '@electioncaffe/shared';

const logger = createLogger('auth-service');
const router = Router();

// ==================== GET /messaging-settings ====================
// List all configured messaging providers for the tenant
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantDb = await getTenantDb(req);

    const providers = await (tenantDb as any).messagingProvider.findMany({
      where: { tenantId },
      orderBy: [{ channel: 'asc' }, { createdAt: 'desc' }],
    });

    // Mask sensitive fields in config (show only last 4 chars of API keys)
    const masked = providers.map((p: any) => ({
      ...p,
      config: maskConfig(p.config),
    }));

    res.json(successResponse(masked));
  } catch (error) {
    logger.error({ err: error }, 'Get messaging settings error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== GET /messaging-settings/supported ====================
// Get supported providers per channel (for UI dropdown)
router.get('/supported', async (_req: Request, res: Response): Promise<void> => {
  try {
    const channels = ['SMS', 'WHATSAPP', 'EMAIL', 'VOICE'] as const;
    const supported: Record<string, any> = {};

    for (const channel of channels) {
      const providers = getSupportedProviders(channel);
      supported[channel] = providers.map((p) => ({
        value: p,
        label: p,
        fields: getProviderConfigFields(p),
      }));
    }

    res.json(successResponse(supported));
  } catch (error) {
    logger.error({ err: error }, 'Get supported providers error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== POST /messaging-settings ====================
// Add a new messaging provider config
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const tenantDb = await getTenantDb(req);

    if (userRole !== 'CENTRAL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Only admins can configure messaging providers'));
      return;
    }

    const { channel, provider, config, providerName } = req.body;

    if (!channel || !provider || !config) {
      res.status(400).json(errorResponse('E2001', 'channel, provider, and config are required'));
      return;
    }

    // Validate that provider supports the channel
    const supportedProviders = getSupportedProviders(channel);
    if (!supportedProviders.includes(provider)) {
      res.status(400).json(errorResponse('E2001', `Provider ${provider} does not support ${channel}`));
      return;
    }

    // Check if there's already a provider for this channel
    const existing = await (tenantDb as any).messagingProvider.findFirst({
      where: { tenantId, channel },
    });

    // If this is the first provider for the channel, make it default
    const isDefault = !existing;

    const created = await (tenantDb as any).messagingProvider.create({
      data: {
        tenantId,
        channel,
        provider,
        providerName: providerName || provider,
        config,
        isActive: true,
        isDefault,
      },
    });

    res.status(201).json(successResponse({
      ...created,
      config: maskConfig(created.config),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Create messaging provider error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== PUT /messaging-settings/:id ====================
// Update a messaging provider config
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    if (userRole !== 'CENTRAL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Only admins can configure messaging providers'));
      return;
    }

    const existing = await (tenantDb as any).messagingProvider.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json(errorResponse('E3001', 'Messaging provider not found'));
      return;
    }

    const { config, providerName, isActive } = req.body;

    const updated = await (tenantDb as any).messagingProvider.update({
      where: { id },
      data: {
        ...(config && { config }),
        ...(providerName !== undefined && { providerName }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(successResponse({
      ...updated,
      config: maskConfig(updated.config),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Update messaging provider error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== PUT /messaging-settings/:id/set-default ====================
// Set a provider as the default for its channel
router.put('/:id/set-default', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    const provider = await (tenantDb as any).messagingProvider.findFirst({
      where: { id, tenantId },
    });

    if (!provider) {
      res.status(404).json(errorResponse('E3001', 'Messaging provider not found'));
      return;
    }

    // Unset default for all other providers on this channel
    await (tenantDb as any).messagingProvider.updateMany({
      where: { tenantId, channel: provider.channel },
      data: { isDefault: false },
    });

    // Set this one as default
    const updated = await (tenantDb as any).messagingProvider.update({
      where: { id },
      data: { isDefault: true },
    });

    res.json(successResponse({
      ...updated,
      config: maskConfig(updated.config),
    }));
  } catch (error) {
    logger.error({ err: error }, 'Set default provider error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== POST /messaging-settings/:id/test ====================
// Send a test message using the configured provider
router.post('/:id/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;
    const { testDestination } = req.body;

    const providerRecord = await (tenantDb as any).messagingProvider.findFirst({
      where: { id, tenantId },
    });

    if (!providerRecord) {
      res.status(404).json(errorResponse('E3001', 'Messaging provider not found'));
      return;
    }

    if (!testDestination) {
      res.status(400).json(errorResponse('E2001', 'testDestination is required (phone number or email)'));
      return;
    }

    const provider = getProviderFromConfig(providerRecord);
    const testMessage = 'This is a test message from ElectionCaffe. If you received this, your messaging provider is configured correctly!';
    let result;

    switch (providerRecord.channel) {
      case 'SMS':
        result = await provider.sendSMS(testDestination, testMessage);
        break;
      case 'WHATSAPP':
        result = await provider.sendWhatsApp(testDestination, testMessage);
        break;
      case 'EMAIL':
        result = await provider.sendEmail(testDestination, 'ElectionCaffe Test Message', `<p>${testMessage}</p>`);
        break;
      case 'VOICE':
        result = await provider.sendVoice(testDestination, testMessage);
        break;
      default:
        result = { success: false, error: 'Unknown channel', provider: 'unknown' };
    }

    if (result.success) {
      res.json(successResponse({ message: 'Test message sent successfully', result }));
    } else {
      res.status(400).json(errorResponse('E2001', `Test failed: ${result.error}`, result));
    }
  } catch (error: any) {
    logger.error({ err: error }, 'Test messaging provider error');
    res.status(500).json(errorResponse('E5001', error.message || 'Internal server error'));
  }
});

// ==================== DELETE /messaging-settings/:id ====================
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const tenantDb = await getTenantDb(req);
    const { id } = req.params;

    if (userRole !== 'CENTRAL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      res.status(403).json(errorResponse('E4001', 'Only admins can delete messaging providers'));
      return;
    }

    const existing = await (tenantDb as any).messagingProvider.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      res.status(404).json(errorResponse('E3001', 'Messaging provider not found'));
      return;
    }

    await (tenantDb as any).messagingProvider.delete({ where: { id } });
    res.json(successResponse({ message: 'Messaging provider deleted' }));
  } catch (error) {
    logger.error({ err: error }, 'Delete messaging provider error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// ==================== HELPER ====================

function maskConfig(config: any): any {
  if (!config || typeof config !== 'object') return config;

  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && (
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('pass') ||
      key.toLowerCase().includes('sid')
    )) {
      // Show only last 4 characters
      masked[key] = value.length > 4
        ? '•'.repeat(value.length - 4) + value.slice(-4)
        : '•'.repeat(value.length);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

export { router as messagingSettingsRoutes };
