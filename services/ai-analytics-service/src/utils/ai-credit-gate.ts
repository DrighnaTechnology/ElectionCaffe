import { verifyCredits } from '@electioncaffe/database';

// Feature key → credits per call mapping
export const FEATURE_CREDIT_COSTS: Record<string, number> = {
  caffe_ai_chat: 1,
  caffe_ai_translate: 1,
  campaign_compose: 2,
  campaign_audience: 2,
  dashboard_narrative: 3,
  survey_generate: 2,
  survey_analyze: 3,
  caffe_ai_report: 5,
  nb_parse_news: 2,
  news_analysis: 2,
  action_generation: 2,
  battle_card: 3,
  ai_theme: 2,
};

interface CreditCheckOptions {
  tenantDb: any; // Tenant-scoped Prisma client for tenant isolation
  tenantId: string;
  userId: string;
  featureKey: string;
  creditsPerCall?: number; // override from FEATURE_CREDIT_COSTS
  callAI: () => Promise<{
    output: string;
    tokens: { input: number; output: number };
  }>;
}

interface CreditCheckResult {
  output: string;
  tokens: { input: number; output: number };
  creditsUsed: number;
  creditsRemaining: number;
}

/**
 * Wraps an AI call with credit check + deduction.
 * ALL operations use the TENANT database only (tenant isolation / SOC2 compliant).
 * No cross-database writes — super admin monitors credits via polling/sync.
 *
 * Tenant schema fields:
 *   TenantAICredits: { id, tenantId, totalCredits, usedCredits, bonusCredits, expiresAt }
 *   AICreditTransaction: { tenantCreditsId, transactionType, credits, description, referenceType, referenceId, createdBy }
 *   AIUsageLog: { tenantCreditsId, userId, featureKey, creditsUsed, inputTokens, outputTokens, modelUsed, responseTime, status, errorMessage }
 */
export async function withCreditCheck(opts: CreditCheckOptions): Promise<CreditCheckResult> {
  const { tenantDb, tenantId, userId, featureKey, callAI } = opts;
  const creditsPerCall = opts.creditsPerCall ?? FEATURE_CREDIT_COSTS[featureKey] ?? 1;

  // Step 1: Check balance in tenant's own database
  const credits = await tenantDb.tenantAICredits.findUnique({
    where: { tenantId },
  });

  const availableCredits = credits
    ? (credits.totalCredits - credits.usedCredits + (credits.bonusCredits || 0))
    : 0;

  // Verify HMAC signature — detect if tenant tampered with credit values
  if (credits) {
    const isValid = verifyCredits({
      tenantId,
      totalCredits: credits.totalCredits,
      bonusCredits: credits.bonusCredits || 0,
      expiresAt: credits.expiresAt ? new Date(credits.expiresAt).toISOString() : null,
      creditSignature: credits.creditSignature,
    });

    if (!isValid) {
      console.error(`[credit-gate] TAMPER DETECTED for tenant ${tenantId}! Signature mismatch.`);
      const error: any = new Error('Credit verification failed. Please contact support.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Check expiry
  if (credits?.expiresAt && new Date() > new Date(credits.expiresAt)) {
    const error: any = new Error('AI credits have expired. Please renew your subscription.');
    error.statusCode = 403;
    throw error;
  }

  if (!credits || availableCredits < creditsPerCall) {
    const error: any = new Error(
      `Insufficient AI credits. Required: ${creditsPerCall}, Available: ${availableCredits}. Please purchase more credits.`
    );
    error.statusCode = 403;
    throw error;
  }

  // Step 2: Execute AI call
  const startTime = Date.now();
  let result: { output: string; tokens: { input: number; output: number } };

  try {
    result = await callAI();
  } catch (err) {
    // Log failed usage in tenant DB (no credits deducted)
    try {
      await tenantDb.aIUsageLog.create({
        data: {
          tenantCreditsId: credits.id,
          userId,
          featureKey,
          creditsUsed: 0,
          inputTokens: 0,
          outputTokens: 0,
          modelUsed: process.env.OPENAI_MODEL || 'gpt-4o',
          responseTime: Date.now() - startTime,
          status: 'error',
          errorMessage: (err as Error).message?.substring(0, 500),
        },
      });
    } catch {
      // Logging is non-critical
    }
    throw err;
  }

  const responseTime = Date.now() - startTime;

  // Step 3: Deduct credits and log usage atomically in tenant DB
  const updatedCredits = await tenantDb.$transaction(async (tx: any) => {
    // Deduct credits
    const updated = await tx.tenantAICredits.update({
      where: { tenantId },
      data: {
        usedCredits: { increment: creditsPerCall },
      },
    });

    // Create usage log in tenant DB
    await tx.aIUsageLog.create({
      data: {
        tenantCreditsId: credits.id,
        userId,
        featureKey,
        creditsUsed: creditsPerCall,
        inputTokens: result.tokens.input,
        outputTokens: result.tokens.output,
        modelUsed: process.env.OPENAI_MODEL || 'gpt-4o',
        responseTime,
        status: 'success',
      },
    });

    // Create credit transaction in tenant DB
    await tx.aICreditTransaction.create({
      data: {
        tenantCreditsId: credits.id,
        transactionType: 'USAGE',
        credits: -creditsPerCall,
        description: `Used ${creditsPerCall} credits for ${featureKey}`,
        referenceType: 'AI_FEATURE',
        referenceId: featureKey,
        createdBy: userId,
      },
    });

    return updated;
  });

  const remainingCredits = updatedCredits.totalCredits - updatedCredits.usedCredits + (updatedCredits.bonusCredits || 0);

  return {
    output: result.output,
    tokens: result.tokens,
    creditsUsed: creditsPerCall,
    creditsRemaining: remainingCredits,
  };
}
