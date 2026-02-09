import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@electioncaffe/database';

const router = Router();

// Middleware to check user auth headers from gateway
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-user-id'] as string;
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!userId || !tenantId) {
    res.status(401).json({
      success: false,
      error: { code: 'E1001', message: 'Authentication required' },
    });
    return;
  }

  next();
};

router.use(requireAuth);

// Check if tenant has access to a feature and sufficient credits
async function checkFeatureAccess(
  tenantId: string,
  userId: string,
  featureId: string
): Promise<{ allowed: boolean; error?: string; subscription?: any; credits?: any; feature?: any }> {
  // Get feature details
  const feature = await prisma.aIFeature.findUnique({
    where: { id: featureId },
    include: { provider: true },
  });

  if (!feature || feature.status !== 'PUBLISHED' || !(feature as any).isActive) {
    return { allowed: false, error: 'Feature not available' };
  }

  // Check if tenant has subscription to this feature (legacy schema)
  const subscription = await prisma.tenantAISubscription.findUnique({
    where: {
      tenantId_featureId: { tenantId, featureId },
    },
  });

  if (!subscription || !subscription.isEnabled) {
    return { allowed: false, error: 'Tenant does not have access to this feature' };
  }

  // Check expiry
  if (subscription.expiresAt && new Date() > subscription.expiresAt) {
    return { allowed: false, error: 'Feature subscription has expired' };
  }

  // Check if user has access (if user-level access control is configured, legacy schema)
  const userAccess = await prisma.tenantUserAIAccess.findUnique({
    where: {
      userId_featureId: { userId, featureId },
    } as any,
  });

  if (userAccess && !userAccess.isEnabled) {
    return { allowed: false, error: 'User does not have access to this feature' };
  }

  // Check user daily/monthly limits if configured
  if (userAccess?.maxUsagePerDay || userAccess?.maxUsagePerMonth) {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyUsage, monthlyUsage] = await Promise.all([
      prisma.aIUsageLog.count({
        where: {
          userId,
          featureId,
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.aIUsageLog.count({
        where: {
          userId,
          featureId,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    if (userAccess.maxUsagePerDay && dailyUsage >= userAccess.maxUsagePerDay) {
      return { allowed: false, error: 'Daily usage limit reached' };
    }
    if (userAccess.maxUsagePerMonth && monthlyUsage >= userAccess.maxUsagePerMonth) {
      return { allowed: false, error: 'Monthly usage limit reached' };
    }
  }

  // Check tenant credits (legacy schema)
  const credits = await prisma.tenantAICredits.findUnique({
    where: { tenantId },
  });

  const creditsRequired = (subscription as any).customCreditsPerUse ?? (feature as any).creditsPerUse ?? 1;

  if (!credits || credits.balance < creditsRequired) {
    // Create alert for depleted credits
    await prisma.aIAdminAlert.create({
      data: {
        tenantId,
        alertType: 'CREDITS_DEPLETED',
        severity: 'HIGH',
        message: `Tenant credits depleted. Cannot use feature: ${feature.displayName}`,
        details: {
          featureId,
          featureName: feature.displayName,
          creditsRequired,
          creditsAvailable: credits?.balance ?? 0,
        },
      } as any,
    });

    return { allowed: false, error: 'Insufficient credits. Please contact your administrator.' };
  }

  return { allowed: true, subscription, credits, feature };
}

// Deduct credits and log usage
async function logUsage(
  tenantId: string,
  userId: string,
  featureId: string,
  providerId: string,
  input: string,
  output: string,
  processingTimeMs: number,
  tokensUsed: { input: number; output: number },
  creditsUsed: number,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Create usage log
    await tx.aIUsageLog.create({
      data: {
        tenantId,
        userId,
        featureId,
        providerId,
        inputText: input.substring(0, 1000), // Truncate for storage
        outputText: output.substring(0, 1000),
        inputTokens: tokensUsed.input,
        outputTokens: tokensUsed.output,
        processingTimeMs,
        creditsUsed,
        success,
        errorMessage,
      } as any,
    });

    if (success && creditsUsed > 0) {
      // Deduct credits
      await tx.tenantAICredits.update({
        where: { tenantId },
        data: {
          balance: { decrement: creditsUsed },
          totalUsed: { increment: creditsUsed },
          lastUsedAt: new Date(),
        } as any,
      });

      // Create credit transaction
      await tx.aICreditTransaction.create({
        data: {
          tenantId,
          transactionType: 'USAGE',
          creditsAmount: -creditsUsed,
          featureId,
          notes: `Used ${creditsUsed} credits for AI feature`,
        } as any,
      });

      // Check for low balance and create alert if needed
      const updatedCredits = await tx.tenantAICredits.findUnique({
        where: { tenantId },
      });

      if (updatedCredits && updatedCredits.balance <= ((updatedCredits as any).lowBalanceAlert || 100)) {
        // Check if alert already exists
        const existingAlert = await tx.aIAdminAlert.findFirst({
          where: {
            tenantId,
            alertType: 'LOW_BALANCE',
            isResolved: false,
          },
        });

        if (!existingAlert) {
          await tx.aIAdminAlert.create({
            data: {
              tenantId,
              alertType: 'LOW_BALANCE',
              severity: 'MEDIUM',
              message: `Tenant credits are low: ${updatedCredits.balance} remaining`,
              details: {
                currentBalance: updatedCredits.balance,
                threshold: (updatedCredits as any).lowBalanceAlert,
              },
            } as any,
          });
        }
      }
    }
  });
}

// List available AI features for tenant
router.get('/available', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const subscriptions = await prisma.tenantAISubscription.findMany({
      where: {
        tenantId,
        isEnabled: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        feature: {
          include: {
            provider: {
              select: {
                id: true,
                providerType: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    const availableFeatures = subscriptions
      .filter(s => s.feature.status === 'PUBLISHED' && (s.feature as any).isActive)
      .map(s => ({
        id: s.feature.id,
        featureName: s.feature.featureName,
        displayName: s.feature.displayName,
        description: s.feature.description,
        category: s.feature.category,
        provider: s.feature.provider.displayName,
        creditsPerUse: (s as any).customCreditsPerUse ?? (s.feature as any).creditsPerUse,
        requiresFileUpload: (s.feature as any).requiresFileUpload,
        allowedFileTypes: (s.feature as any).allowedFileTypes,
        maxFileSizeMB: (s.feature as any).maxFileSizeMB,
      }));

    // Get tenant credits (legacy schema)
    const credits = await prisma.tenantAICredits.findUnique({
      where: { tenantId },
      select: {
        balance: true,
        totalPurchased: true,
        totalUsed: true,
      } as any,
    });

    res.json({
      success: true,
      data: {
        features: availableFeatures,
        credits: credits || { balance: 0, totalPurchased: 0, totalUsed: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get feature details
router.get('/:featureId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { featureId } = req.params;

    const accessCheck = await checkFeatureAccess(tenantId, userId, featureId!);

    if (!accessCheck.allowed) {
      res.status(403).json({
        success: false,
        error: { code: 'E4001', message: accessCheck.error },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        feature: {
          id: accessCheck.feature.id,
          featureName: accessCheck.feature.featureName,
          displayName: accessCheck.feature.displayName,
          description: accessCheck.feature.description,
          category: accessCheck.feature.category,
          creditsPerUse: accessCheck.subscription.customCreditsPerUse ?? accessCheck.feature.creditsPerUse,
          requiresFileUpload: accessCheck.feature.requiresFileUpload,
          allowedFileTypes: accessCheck.feature.allowedFileTypes,
          maxFileSizeMB: accessCheck.feature.maxFileSizeMB,
        },
        creditsAvailable: accessCheck.credits.balance,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Execute AI feature
router.post('/:featureId/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { featureId } = req.params;

    const schema = z.object({
      input: z.string().min(1),
      fileBase64: z.string().optional(), // For file uploads (OCR, etc.)
      fileName: z.string().optional(),
      options: z.record(z.any()).optional(),
    });

    const data = schema.parse(req.body);

    const accessCheck = await checkFeatureAccess(tenantId, userId, featureId!);

    if (!accessCheck.allowed) {
      res.status(403).json({
        success: false,
        error: { code: 'E4001', message: accessCheck.error },
      });
      return;
    }

    const { feature, subscription, credits } = accessCheck;
    const startTime = Date.now();

    // Calculate credits required
    const creditsRequired = subscription.customCreditsPerUse ?? feature.creditsPerUse ?? 1;

    try {
      // Execute AI based on provider type
      let result: { output: string; tokens: { input: number; output: number } };

      switch (feature.provider.providerType) {
        case 'OPENAI':
          result = await executeOpenAI(feature, data.input, data.fileBase64);
          break;
        case 'ANTHROPIC':
          result = await executeAnthropic(feature, data.input, data.fileBase64);
          break;
        case 'GOOGLE':
          result = await executeGoogle(feature, data.input, data.fileBase64);
          break;
        case 'XAI':
          result = await executeXAI(feature, data.input, data.fileBase64);
          break;
        default:
          result = await executeCustom(feature, data.input, data.fileBase64);
      }

      const processingTimeMs = Date.now() - startTime;

      // Log usage and deduct credits
      await logUsage(
        tenantId,
        userId,
        featureId!,
        feature.providerId,
        data.input,
        result.output,
        processingTimeMs,
        result.tokens,
        creditsRequired,
        true
      );

      res.json({
        success: true,
        data: {
          output: result.output,
          tokensUsed: result.tokens,
          processingTimeMs,
          creditsUsed: creditsRequired,
          creditsRemaining: credits.balance - creditsRequired,
        },
      });
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;

      // Log failed usage (no credits deducted)
      await logUsage(
        tenantId,
        userId,
        featureId!,
        feature.providerId,
        data.input,
        '',
        processingTimeMs,
        { input: 0, output: 0 },
        0,
        false,
        error.message
      );

      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Get usage history for current user
router.get('/usage/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [usageLogs, total] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where: { tenantId, userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          feature: {
            select: {
              displayName: true,
              category: true,
            },
          },
        },
      }),
      prisma.aIUsageLog.count({ where: { tenantId, userId } }),
    ]);

    res.json({
      success: true,
      data: usageLogs.map(log => ({
        id: log.id,
        featureName: log.feature.displayName,
        category: log.feature.category,
        creditsUsed: log.creditsUsed,
        processingTimeMs: log.processingTimeMs,
        success: (log as any).success,
        createdAt: log.createdAt,
      })),
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

// AI Provider execution functions (simplified - would need actual API calls in production)
async function executeOpenAI(
  feature: any,
  input: string,
  fileBase64?: string
): Promise<{ output: string; tokens: { input: number; output: number } }> {
  const provider = feature.provider;

  if (!provider.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const messages = [
    ...(feature.systemPrompt ? [{ role: 'system', content: feature.systemPrompt }] : []),
    {
      role: 'user',
      content: feature.userPromptTemplate
        ? feature.userPromptTemplate.replace('{{input}}', input)
        : input,
    },
  ];

  // Add image if provided and feature supports vision
  if (fileBase64 && provider.supportsVision) {
    (messages[messages.length - 1] as any).content = [
      { type: 'text', text: input },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${fileBase64}` } },
    ];
  }

  const response = await fetch(provider.apiEndpoint || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
      ...(provider.organizationId && { 'OpenAI-Organization': provider.organizationId }),
    },
    body: JSON.stringify({
      model: feature.modelName || provider.defaultModel || 'gpt-4o',
      messages,
      max_tokens: feature.maxOutputTokens || 4096,
      temperature: feature.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const result: any = await response.json();
  return {
    output: result.choices[0]?.message?.content || '',
    tokens: {
      input: result.usage?.prompt_tokens || 0,
      output: result.usage?.completion_tokens || 0,
    },
  };
}

async function executeAnthropic(
  feature: any,
  input: string,
  fileBase64?: string
): Promise<{ output: string; tokens: { input: number; output: number } }> {
  const provider = feature.provider;

  if (!provider.apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const content: any[] = [];

  // Add image if provided
  if (fileBase64 && provider.supportsVision) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: fileBase64 },
    });
  }

  content.push({
    type: 'text',
    text: feature.userPromptTemplate
      ? feature.userPromptTemplate.replace('{{input}}', input)
      : input,
  });

  const response = await fetch(provider.apiEndpoint || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': provider.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': provider.apiVersion || '2024-01-01',
    },
    body: JSON.stringify({
      model: feature.modelName || provider.defaultModel || 'claude-3-sonnet-20240229',
      max_tokens: feature.maxOutputTokens || 4096,
      system: feature.systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const result: any = await response.json();
  return {
    output: result.content?.[0]?.text || '',
    tokens: {
      input: result.usage?.input_tokens || 0,
      output: result.usage?.output_tokens || 0,
    },
  };
}

async function executeGoogle(
  feature: any,
  input: string,
  fileBase64?: string
): Promise<{ output: string; tokens: { input: number; output: number } }> {
  const provider = feature.provider;

  if (!provider.apiKey) {
    throw new Error('Google API key not configured');
  }

  const parts: any[] = [];

  // Add image if provided
  if (fileBase64 && provider.supportsVision) {
    parts.push({
      inline_data: { mime_type: 'image/png', data: fileBase64 },
    });
  }

  parts.push({
    text: feature.userPromptTemplate
      ? feature.userPromptTemplate.replace('{{input}}', input)
      : input,
  });

  const model = feature.modelName || provider.defaultModel || 'gemini-pro';
  const endpoint = provider.apiEndpoint || 'https://generativelanguage.googleapis.com/v1beta';

  const response = await fetch(`${endpoint}/models/${model}:generateContent?key=${provider.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      systemInstruction: feature.systemPrompt ? { parts: [{ text: feature.systemPrompt }] } : undefined,
      generationConfig: {
        maxOutputTokens: feature.maxOutputTokens || 4096,
        temperature: feature.temperature || 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'Google API error');
  }

  const result: any = await response.json();
  return {
    output: result.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokens: {
      input: result.usageMetadata?.promptTokenCount || 0,
      output: result.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

async function executeXAI(
  feature: any,
  input: string,
  _fileBase64?: string
): Promise<{ output: string; tokens: { input: number; output: number } }> {
  const provider = feature.provider;

  if (!provider.apiKey) {
    throw new Error('xAI API key not configured');
  }

  const messages = [
    ...(feature.systemPrompt ? [{ role: 'system', content: feature.systemPrompt }] : []),
    {
      role: 'user',
      content: feature.userPromptTemplate
        ? feature.userPromptTemplate.replace('{{input}}', input)
        : input,
    },
  ];

  const response = await fetch(provider.apiEndpoint || 'https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: feature.modelName || provider.defaultModel || 'grok-beta',
      messages,
      max_tokens: feature.maxOutputTokens || 4096,
      temperature: feature.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const error: any = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'xAI API error');
  }

  const result: any = await response.json();
  return {
    output: result.choices[0]?.message?.content || '',
    tokens: {
      input: result.usage?.prompt_tokens || 0,
      output: result.usage?.completion_tokens || 0,
    },
  };
}

async function executeCustom(
  feature: any,
  input: string,
  _fileBase64?: string
): Promise<{ output: string; tokens: { input: number; output: number } }> {
  const provider = feature.provider;

  if (!provider.apiEndpoint) {
    throw new Error('Custom API endpoint not configured');
  }

  const response = await fetch(provider.apiEndpoint, {
    method: 'POST',
    headers: {
      ...(provider.apiKey && { 'Authorization': `Bearer ${provider.apiKey}` }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      systemPrompt: feature.systemPrompt,
      userPromptTemplate: feature.userPromptTemplate,
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom API error: ${response.status}`);
  }

  const result: any = await response.json();
  return {
    output: result.output || result.text || result.result || JSON.stringify(result),
    tokens: {
      input: result.inputTokens || 0,
      output: result.outputTokens || 0,
    },
  };
}

export { router as aiFeaturesRoutes };
