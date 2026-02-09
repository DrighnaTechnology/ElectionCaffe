import { Router } from 'express';
import { z } from 'zod';
import { coreDb as prisma } from '@electioncaffe/database';
import { superAdminAuthMiddleware } from '../middleware/superAdminAuth.js';

const router = Router();

// All AI provider routes require super admin authentication
router.use(superAdminAuthMiddleware);

// Validation schemas
const createProviderSchema = z.object({
  providerType: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE', 'XAI', 'CUSTOM']),
  providerName: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  description: z.string().optional(),
  apiKey: z.string().optional(),
  apiEndpoint: z.string().url().optional(),
  apiVersion: z.string().optional(),
  organizationId: z.string().optional(),
  region: z.string().optional(),
  defaultModel: z.string().optional(),
  availableModels: z.array(z.string()).optional(),
  maxRequestsPerMinute: z.number().min(1).max(10000).default(60),
  maxTokensPerRequest: z.number().min(100).max(1000000).default(4096),
  costPerInputToken: z.number().min(0).default(0),
  costPerOutputToken: z.number().min(0).default(0),
  costPerImage: z.number().min(0).default(0),
  costPerPage: z.number().min(0).default(0),
  currency: z.string().default('USD'),
  supportsVision: z.boolean().default(false),
  supportsStreaming: z.boolean().default(false),
  supportsAsync: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const updateProviderSchema = createProviderSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'TESTING', 'ERROR']).optional(),
});

// List all AI providers
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const providerType = req.query.providerType as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (providerType) {
      where.providerType = providerType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [providers, total] = await Promise.all([
      prisma.aIProvider.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] as any,
        select: {
          id: true,
          providerType: true,
          providerName: true,
          displayName: true,
          description: true,
          apiEndpoint: true,
          apiVersion: true,
          region: true,
          defaultModel: true,
          availableModels: true,
          maxRequestsPerMinute: true,
          maxTokensPerRequest: true,
          costPerInputToken: true,
          costPerOutputToken: true,
          costPerImage: true,
          costPerPage: true,
          currency: true,
          status: true,
          lastHealthCheck: true,
          lastError: true,
          errorCount: true,
          successRate: true,
          supportsVision: true,
          supportsStreaming: true,
          supportsAsync: true,
          isDefault: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              features: true,
              usageLogs: true,
            },
          },
        } as any,
      }),
      prisma.aIProvider.count({ where }),
    ]);

    res.json({
      success: true,
      data: providers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get AI provider by ID
router.get('/:id', async (req, res, next) => {
  try {
    const provider = await prisma.aIProvider.findUnique({
      where: { id: req.params.id },
      include: {
        features: {
          select: {
            id: true,
            featureName: true,
            displayName: true,
            category: true,
            status: true,
          } as any,
        },
        _count: {
          select: {
            features: true,
            usageLogs: true,
          },
        },
      } as any,
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Provider not found',
        },
      });
    }

    // Mask API key for security
    const maskedProvider = {
      ...provider,
      apiKey: provider.apiKey ? `***${provider.apiKey.slice(-4)}` : null,
    };

    res.json({
      success: true,
      data: maskedProvider,
    });
  } catch (error) {
    next(error);
  }
});

// Create new AI provider
router.post('/', async (req, res, next) => {
  try {
    const data = createProviderSchema.parse(req.body);

    // Check if provider name already exists
    const existingProvider = await prisma.aIProvider.findUnique({
      where: { providerName: data.providerName },
    });

    if (existingProvider) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2004',
          message: 'AI Provider with this name already exists',
        },
      });
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true } as any,
        data: { isDefault: false } as any,
      });
    }

    const provider = await prisma.aIProvider.create({
      data: {
        ...data,
        availableModels: data.availableModels || [],
        status: 'INACTIVE',
      } as any,
    });

    res.status(201).json({
      success: true,
      data: {
        ...provider,
        apiKey: provider.apiKey ? `***${provider.apiKey.slice(-4)}` : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update AI provider
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateProviderSchema.parse(req.body);

    const existingProvider = await prisma.aIProvider.findUnique({
      where: { id: req.params.id },
    });

    if (!existingProvider) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Provider not found',
        },
      });
    }

    // Check if new provider name already exists (if changing name)
    if (data.providerName && data.providerName !== existingProvider.providerName) {
      const nameExists = await prisma.aIProvider.findUnique({
        where: { providerName: data.providerName },
      });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'E2004',
            message: 'AI Provider with this name already exists',
          },
        });
      }
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true, id: { not: req.params.id } } as any,
        data: { isDefault: false } as any,
      });
    }

    const provider = await prisma.aIProvider.update({
      where: { id: req.params.id },
      data: {
        ...data,
        availableModels: data.availableModels || undefined,
      } as any,
    });

    res.json({
      success: true,
      data: {
        ...provider,
        apiKey: provider.apiKey ? `***${provider.apiKey.slice(-4)}` : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Delete AI provider
router.delete('/:id', async (req, res, next) => {
  try {
    const provider: any = await prisma.aIProvider.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            features: true,
            usageLogs: true,
          },
        },
      } as any,
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Provider not found',
        },
      });
    }

    // If provider has features, don't delete, just deactivate
    if (provider._count.features > 0) {
      await prisma.aIProvider.update({
        where: { id: req.params.id },
        data: { isActive: false, status: 'INACTIVE' } as any,
      });

      return res.json({
        success: true,
        message: 'AI Provider deactivated (has associated features)',
      });
    }

    await prisma.aIProvider.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'AI Provider deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Test AI provider connection
router.post('/:id/test', async (req, res, next) => {
  try {
    const provider = await prisma.aIProvider.findUnique({
      where: { id: req.params.id },
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Provider not found',
        },
      });
    }

    if (!provider.apiKey) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'E2001',
          message: 'API key is required to test the provider',
        },
      });
    }

    let testResult = { success: false, message: '', latency: 0 };
    const startTime = Date.now();

    try {
      switch ((provider as any).providerType) {
        case 'OPENAI':
          testResult = await testOpenAI(provider);
          break;
        case 'ANTHROPIC':
          testResult = await testAnthropic(provider);
          break;
        case 'GOOGLE':
          testResult = await testGoogle(provider);
          break;
        case 'XAI':
          testResult = await testXAI(provider);
          break;
        case 'CUSTOM':
          testResult = await testCustom(provider);
          break;
        default:
          testResult = { success: false, message: 'Unknown provider type', latency: 0 };
      }
    } catch (error: any) {
      testResult = { success: false, message: error.message, latency: Date.now() - startTime };
    }

    // Update provider status based on test result
    await prisma.aIProvider.update({
      where: { id: req.params.id },
      data: {
        status: testResult.success ? 'ACTIVE' : 'ERROR',
        lastHealthCheck: new Date(),
        lastError: testResult.success ? null : testResult.message,
        errorCount: testResult.success ? 0 : (provider as any).errorCount + 1,
      } as any,
    });

    res.json({
      success: true,
      data: {
        testPassed: testResult.success,
        message: testResult.message,
        latencyMs: testResult.latency,
        testedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get provider statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const provider = await prisma.aIProvider.findUnique({
      where: { id: req.params.id },
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'E3001',
          message: 'AI Provider not found',
        },
      });
    }

    // Get usage statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsage, _dailyUsage, featureCount] = await Promise.all([
      (prisma as any).aIUsageLog.aggregate({
        where: {
          providerId: req.params.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalCost: true,
          creditsUsed: true,
        },
        _count: true,
      }),
      (prisma as any).aIUsageLog.groupBy({
        by: ['createdAt'],
        where: {
          providerId: req.params.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
        _sum: {
          creditsUsed: true,
        },
      }),
      prisma.aIFeature.count({
        where: { providerId: req.params.id },
      }),
    ]);

    res.json({
      success: true,
      data: {
        provider: {
          id: provider.id,
          displayName: (provider as any).displayName,
          status: (provider as any).status,
          successRate: (provider as any).successRate,
          errorCount: (provider as any).errorCount,
        },
        usage: {
          totalRequests: totalUsage._count,
          totalInputTokens: totalUsage._sum.inputTokens || 0,
          totalOutputTokens: totalUsage._sum.outputTokens || 0,
          totalCost: totalUsage._sum.totalCost || 0,
          totalCreditsUsed: totalUsage._sum.creditsUsed || 0,
        },
        featureCount,
        period: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions for testing different AI providers
async function testOpenAI(provider: any): Promise<{ success: boolean; message: string; latency: number }> {
  const startTime = Date.now();
  const endpoint = provider.apiEndpoint || 'https://api.openai.com/v1';

  const response = await fetch(`${endpoint}/models`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
      ...(provider.organizationId && { 'OpenAI-Organization': provider.organizationId }),
    },
  });

  const latency = Date.now() - startTime;

  if (response.ok) {
    return { success: true, message: 'OpenAI connection successful', latency };
  } else {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    return { success: false, message: error.error?.message || 'Connection failed', latency };
  }
}

async function testAnthropic(provider: any): Promise<{ success: boolean; message: string; latency: number }> {
  const startTime = Date.now();
  const endpoint = provider.apiEndpoint || 'https://api.anthropic.com/v1';

  // Test with a minimal message request
  const response = await fetch(`${endpoint}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': provider.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': provider.apiVersion || '2024-01-01',
    },
    body: JSON.stringify({
      model: provider.defaultModel || 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  });

  const latency = Date.now() - startTime;

  if (response.ok) {
    return { success: true, message: 'Anthropic connection successful', latency };
  } else {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    return { success: false, message: error.error?.message || 'Connection failed', latency };
  }
}

async function testGoogle(provider: any): Promise<{ success: boolean; message: string; latency: number }> {
  const startTime = Date.now();
  const endpoint = provider.apiEndpoint || 'https://generativelanguage.googleapis.com/v1beta';
  const model = provider.defaultModel || 'gemini-pro';

  const response = await fetch(`${endpoint}/models/${model}:generateContent?key=${provider.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hi' }] }],
      generationConfig: { maxOutputTokens: 10 },
    }),
  });

  const latency = Date.now() - startTime;

  if (response.ok) {
    return { success: true, message: 'Google Gemini connection successful', latency };
  } else {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    return { success: false, message: error.error?.message || 'Connection failed', latency };
  }
}

async function testXAI(provider: any): Promise<{ success: boolean; message: string; latency: number }> {
  const startTime = Date.now();
  const endpoint = provider.apiEndpoint || 'https://api.x.ai/v1';

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.defaultModel || 'grok-beta',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 10,
    }),
  });

  const latency = Date.now() - startTime;

  if (response.ok) {
    return { success: true, message: 'xAI Grok connection successful', latency };
  } else {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    return { success: false, message: error.error?.message || 'Connection failed', latency };
  }
}

async function testCustom(provider: any): Promise<{ success: boolean; message: string; latency: number }> {
  const startTime = Date.now();

  if (!provider.apiEndpoint) {
    return { success: false, message: 'Custom provider requires an API endpoint', latency: 0 };
  }

  const response = await fetch(provider.apiEndpoint, {
    method: 'GET',
    headers: {
      ...(provider.apiKey && { 'Authorization': `Bearer ${provider.apiKey}` }),
      'Content-Type': 'application/json',
    },
  });

  const latency = Date.now() - startTime;

  if (response.ok) {
    return { success: true, message: 'Custom provider connection successful', latency };
  } else {
    return { success: false, message: `Connection failed with status ${response.status}`, latency };
  }
}

export { router as aiProvidersRoutes };
