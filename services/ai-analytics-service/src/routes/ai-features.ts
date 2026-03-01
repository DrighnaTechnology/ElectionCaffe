import { Router, Request, Response, NextFunction } from 'express';
import { verifyCredits, signCredits, coreDb } from '@electioncaffe/database';
import { getTenantDb } from '../utils/tenantDb.js';
import { FEATURE_CREDIT_COSTS } from '../utils/ai-credit-gate.js';
import crypto from 'crypto';

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

// Feature metadata for the AI Tools UI
const FEATURE_METADATA: Record<string, {
  displayName: string;
  description: string;
  category: string;
}> = {
  caffe_ai_chat: {
    displayName: 'CaffeAI Chat',
    description: 'Ask questions and get AI-powered answers about your election data',
    category: 'General',
  },
  caffe_ai_translate: {
    displayName: 'CaffeAI Translate',
    description: 'Translate text between languages using AI',
    category: 'General',
  },
  campaign_compose: {
    displayName: 'Campaign Message Composer',
    description: 'Generate compelling campaign messages and communications',
    category: 'Campaign',
  },
  campaign_audience: {
    displayName: 'Audience Analysis',
    description: 'AI-powered voter audience segmentation and targeting',
    category: 'Campaign',
  },
  dashboard_narrative: {
    displayName: 'Dashboard Narrative',
    description: 'Generate narrative summaries from your dashboard analytics',
    category: 'Analytics',
  },
  survey_generate: {
    displayName: 'Survey Generator',
    description: 'Generate survey questions using AI based on your objectives',
    category: 'Survey',
  },
  survey_analyze: {
    displayName: 'Survey Analyzer',
    description: 'Analyze survey responses with AI-powered insights',
    category: 'Survey',
  },
  caffe_ai_report: {
    displayName: 'AI Report Generator',
    description: 'Generate comprehensive analytical reports from your data',
    category: 'Reports',
  },
  nb_parse_news: {
    displayName: 'News Parser',
    description: 'Parse and extract key information from news articles',
    category: 'News',
  },
  news_analysis: {
    displayName: 'News Analysis',
    description: 'Analyze news articles for sentiment and political impact',
    category: 'News',
  },
  action_generation: {
    displayName: 'Action Generator',
    description: 'Generate strategic action items from news and data insights',
    category: 'Actions',
  },
  battle_card: {
    displayName: 'Battle Card Generator',
    description: 'Generate competitive battle cards for candidates',
    category: 'Election',
  },
};

// Get available balance from tenant DB
async function getTenantCredits(tenantDb: any, tenantId: string) {
  const credits = await tenantDb.tenantAICredits.findUnique({
    where: { tenantId },
  });

  if (!credits) {
    return { balance: 0, totalCredits: 0, usedCredits: 0, bonusCredits: 0, id: null };
  }

  // Verify HMAC signature
  const isValid = verifyCredits({
    tenantId,
    totalCredits: credits.totalCredits,
    bonusCredits: credits.bonusCredits || 0,
    expiresAt: credits.expiresAt ? new Date(credits.expiresAt).toISOString() : null,
    creditSignature: credits.creditSignature,
  });

  if (!isValid) {
    console.error(`[ai-features] TAMPER DETECTED for tenant ${tenantId}!`);
    return { balance: 0, totalCredits: 0, usedCredits: 0, bonusCredits: 0, id: null, tampered: true };
  }

  // Check expiry
  if (credits.expiresAt && new Date() > new Date(credits.expiresAt)) {
    return { balance: 0, totalCredits: 0, usedCredits: 0, bonusCredits: 0, id: credits.id, expired: true };
  }

  const balance = credits.totalCredits - credits.usedCredits + (credits.bonusCredits || 0);

  return {
    balance,
    totalCredits: credits.totalCredits,
    usedCredits: credits.usedCredits,
    bonusCredits: credits.bonusCredits || 0,
    id: credits.id,
  };
}

// GET /api/ai/features — list features + credits (frontend: aiAPI.getAvailableFeatures)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantDb = await getTenantDb(req);

    const features = Object.entries(FEATURE_CREDIT_COSTS).map(([featureKey, creditsPerUse]) => {
      const meta = FEATURE_METADATA[featureKey] || {
        displayName: featureKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: '',
        category: 'Other',
      };
      return {
        id: featureKey,
        featureName: featureKey,
        displayName: meta.displayName,
        description: meta.description,
        category: meta.category,
        creditsPerUse,
      };
    });

    const credits = await getTenantCredits(tenantDb, tenantId);

    res.json({
      success: true,
      data: {
        features,
        credits: {
          balance: credits.balance,
          totalCredits: credits.totalCredits,
          usedCredits: credits.usedCredits,
          bonusCredits: credits.bonusCredits,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/features/credits — credits only (frontend: aiAPI.getCredits)
router.get('/credits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantDb = await getTenantDb(req);

    const credits = await getTenantCredits(tenantDb, tenantId);

    res.json({
      success: true,
      data: {
        balance: credits.balance,
        totalCredits: credits.totalCredits,
        usedCredits: credits.usedCredits,
        bonusCredits: credits.bonusCredits,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/features/usage/history — usage history from tenant DB
router.get('/usage/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const tenantDb = await getTenantDb(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const credits = await tenantDb.tenantAICredits.findUnique({
      where: { tenantId },
    });

    if (!credits) {
      res.json({ success: true, data: [], meta: { page, limit, total: 0, totalPages: 0 } });
      return;
    }

    const [usageLogs, total] = await Promise.all([
      tenantDb.aIUsageLog.findMany({
        where: { tenantCreditsId: credits.id, ...(userId ? { userId } : {}) },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      tenantDb.aIUsageLog.count({
        where: { tenantCreditsId: credits.id, ...(userId ? { userId } : {}) },
      }),
    ]);

    res.json({
      success: true,
      data: usageLogs.map((log: any) => ({
        id: log.id,
        featureName: FEATURE_METADATA[log.featureKey]?.displayName || log.featureKey,
        category: FEATURE_METADATA[log.featureKey]?.category || 'Other',
        featureKey: log.featureKey,
        creditsUsed: log.creditsUsed,
        responseTime: log.responseTime,
        status: log.status,
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

// GET /api/ai/features/packages — list active credit packages for purchase (from core DB)
router.get('/packages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const packages = await coreDb.aICreditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        packageName: true,
        displayName: true,
        description: true,
        credits: true,
        price: true,
        currency: true,
        bonusCredits: true,
        validityDays: true,
        discountPercent: true,
        isPopular: true,
      },
    });

    res.json({ success: true, data: packages });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/features/purchase/create-order — create Razorpay order
router.post('/purchase/create-order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { packageId } = req.body;

    if (!packageId) {
      res.status(400).json({ success: false, error: { message: 'packageId is required' } });
      return;
    }

    // Fetch the package from core DB
    const pkg = await coreDb.aICreditPackage.findUnique({
      where: { id: packageId, isActive: true },
    });

    if (!pkg) {
      res.status(404).json({ success: false, error: { message: 'Credit package not found' } });
      return;
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      res.status(500).json({ success: false, error: { message: 'Payment gateway not configured' } });
      return;
    }

    // Create Razorpay order via API (no SDK needed)
    const amountInPaise = Math.round(Number(pkg.price) * 100);
    const orderData = {
      amount: amountInPaise,
      currency: pkg.currency === 'USD' ? 'INR' : pkg.currency, // Default to INR for Razorpay
      receipt: `credits_${tenantId}_${Date.now()}`,
      notes: {
        tenantId,
        userId,
        packageId: pkg.id,
        packageName: pkg.packageName,
        credits: pkg.credits.toString(),
        bonusCredits: pkg.bonusCredits.toString(),
      },
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!razorpayResponse.ok) {
      const errBody = await razorpayResponse.text();
      console.error('[ai-features] Razorpay order creation failed:', errBody);
      res.status(500).json({ success: false, error: { message: 'Failed to create payment order' } });
      return;
    }

    const order = await razorpayResponse.json() as any;

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
        packageName: pkg.displayName || pkg.packageName,
        credits: pkg.credits,
        bonusCredits: pkg.bonusCredits,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/features/purchase/verify — verify Razorpay payment and add credits
router.post('/purchase/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId) {
      res.status(400).json({ success: false, error: { message: 'Missing payment verification fields' } });
      return;
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      res.status(500).json({ success: false, error: { message: 'Payment gateway not configured' } });
      return;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ success: false, error: { message: 'Payment verification failed — invalid signature' } });
      return;
    }

    // Fetch the package
    const pkg = await coreDb.aICreditPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      res.status(404).json({ success: false, error: { message: 'Credit package not found' } });
      return;
    }

    const creditsToAdd = pkg.credits + pkg.bonusCredits;
    const tenantDb = await getTenantDb(req);

    // Add credits to tenant DB with HMAC signature
    const updatedCredits = await tenantDb.$transaction(async (tx: any) => {
      // Upsert tenant credits
      let existing = await tx.tenantAICredits.findUnique({ where: { tenantId } });

      const newTotal = (existing?.totalCredits || 0) + pkg.credits;
      const newBonus = (existing?.bonusCredits || 0) + pkg.bonusCredits;
      const expiresAt = existing?.expiresAt
        ? new Date(Math.max(new Date(existing.expiresAt).getTime(), Date.now()) + pkg.validityDays * 86400000)
        : new Date(Date.now() + pkg.validityDays * 86400000);

      // Compute HMAC signature for tamper detection
      const creditSignature = signCredits({
        tenantId,
        totalCredits: newTotal,
        bonusCredits: newBonus,
        expiresAt: expiresAt.toISOString(),
      });

      let credits;
      if (existing) {
        credits = await tx.tenantAICredits.update({
          where: { tenantId },
          data: {
            totalCredits: newTotal,
            bonusCredits: newBonus,
            expiresAt,
            creditSignature,
            lastPurchasedAt: new Date(),
          },
        });
      } else {
        credits = await tx.tenantAICredits.create({
          data: {
            tenantId,
            totalCredits: newTotal,
            usedCredits: 0,
            bonusCredits: newBonus,
            expiresAt,
            creditSignature,
            lastPurchasedAt: new Date(),
          },
        });
      }

      // Log the transaction in tenant DB
      await tx.aICreditTransaction.create({
        data: {
          tenantCreditsId: credits.id,
          transactionType: 'PURCHASE',
          credits: creditsToAdd,
          description: `Purchased ${pkg.displayName || pkg.packageName} — ${pkg.credits} credits + ${pkg.bonusCredits} bonus`,
          referenceType: 'RAZORPAY',
          referenceId: razorpay_payment_id,
          createdBy: userId,
        },
      });

      return credits;
    });

    // Also log in core DB for super-admin visibility
    try {
      await coreDb.aICreditTransaction.create({
        data: {
          tenantId,
          transactionType: 'PURCHASE',
          creditsAmount: creditsToAdd,
          creditsBalance: updatedCredits.totalCredits - updatedCredits.usedCredits + updatedCredits.bonusCredits,
          packageId: pkg.id,
          paymentReference: razorpay_payment_id,
          paymentAmount: Number(pkg.price),
          paymentCurrency: pkg.currency,
          notes: `Razorpay order: ${razorpay_order_id}`,
          processedBy: userId,
        },
      });
    } catch (coreErr) {
      // Non-critical — tenant credits already updated
      console.error('[ai-features] Failed to log transaction in core DB:', coreErr);
    }

    const balance = updatedCredits.totalCredits - updatedCredits.usedCredits + updatedCredits.bonusCredits;

    res.json({
      success: true,
      data: {
        message: 'Credits purchased successfully',
        creditsAdded: creditsToAdd,
        balance,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as aiFeaturesRoutes };
