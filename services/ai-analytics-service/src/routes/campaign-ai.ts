import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTenantDb } from '../utils/tenantDb.js';
import { logger } from '../index.js';
import { withCreditCheck } from '../utils/ai-credit-gate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, '../../../../../prompts/campaign-composer');

// ── OpenAI client (lazy) ─────────────────────────────────────────────────────
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function loadPrompt(filename: string): string {
  const fp = resolve(PROMPTS_DIR, filename);
  if (!existsSync(fp)) return '';
  return readFileSync(fp, 'utf-8').trim();
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati',
  pa: 'Punjabi', or: 'Odia', ur: 'Urdu', as: 'Assamese',
};

const router = Router();

// ==================== POST /campaign/compose ====================
// AI generates campaign messages based on user intent
router.post('/campaign/compose', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const {
      intent,
      channel = 'SMS',
      language = 'en',
      tone = 'formal',
      electionId,
    } = req.body;

    if (!intent) {
      res.status(400).json({ success: false, error: { message: 'intent is required' } });
      return;
    }

    // Load election context
    let electionContext = {
      electionName: 'Election',
      constituency: '',
      state: '',
      electionType: '',
      candidateName: '',
    };

    if (electionId) {
      const election = await (tenantDb as any).election.findUnique({
        where: { id: electionId },
        select: { name: true, constituency: true, state: true, electionType: true, candidateName: true },
      });
      if (election) {
        electionContext = {
          electionName: election.name || 'Election',
          constituency: election.constituency || '',
          state: election.state || '',
          electionType: election.electionType || '',
          candidateName: election.candidateName || '',
        };
      }
    }

    // Load and hydrate prompts
    const systemPrompt = loadPrompt('system.txt');
    let userTemplate = loadPrompt('user-template.txt');

    const langName = LANG_NAMES[language] || language;
    userTemplate = userTemplate
      .replace('{{channel}}', channel)
      .replace('{{electionName}}', electionContext.electionName)
      .replace('{{constituency}}', electionContext.constituency)
      .replace('{{state}}', electionContext.state)
      .replace('{{electionType}}', electionContext.electionType)
      .replace('{{candidateName}}', electionContext.candidateName)
      .replace('{{intent}}', intent)
      .replace('{{tone}}', tone)
      .replace('{{language}}', langName);

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'campaign_compose',
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userTemplate },
          ],
        });
        return {
          output: completion.choices[0]?.message?.content || '{}',
          tokens: {
            input: completion.usage?.prompt_tokens || 0,
            output: completion.usage?.completion_tokens || 0,
          },
        };
      },
    });

    const raw = creditResult.output;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.error({ raw }, 'Failed to parse AI compose response');
      parsed = { message: raw, variants: [], subject: '' };
    }

    res.json({
      success: true,
      data: {
        message: parsed.message || '',
        variants: parsed.variants || [],
        subject: parsed.subject || '',
        language: langName,
        channel,
        tone,
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Campaign compose error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'AI compose failed' } });
  }
});

// ==================== POST /campaign/audience ====================
// AI suggests optimal target audience based on campaign goal
router.post('/campaign/audience', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { goal, electionId } = req.body;

    if (!goal || !electionId) {
      res.status(400).json({ success: false, error: { message: 'goal and electionId are required' } });
      return;
    }

    // Aggregate voter data (no PII)
    const [
      totalVoters,
      leaningCounts,
      genderCounts,
      influenceCounts,
      ageBuckets,
    ] = await Promise.all([
      (tenantDb as any).voter.count({ where: { electionId, isDead: false, isShifted: false } }),
      (tenantDb as any).voter.groupBy({
        by: ['politicalLeaning'],
        where: { electionId, isDead: false, isShifted: false },
        _count: true,
      }),
      (tenantDb as any).voter.groupBy({
        by: ['gender'],
        where: { electionId, isDead: false, isShifted: false },
        _count: true,
      }),
      (tenantDb as any).voter.groupBy({
        by: ['influenceLevel'],
        where: { electionId, isDead: false, isShifted: false },
        _count: true,
      }),
      Promise.all([
        (tenantDb as any).voter.count({ where: { electionId, isDead: false, isShifted: false, age: { gte: 18, lte: 25 } } }),
        (tenantDb as any).voter.count({ where: { electionId, isDead: false, isShifted: false, age: { gte: 26, lte: 35 } } }),
        (tenantDb as any).voter.count({ where: { electionId, isDead: false, isShifted: false, age: { gte: 36, lte: 50 } } }),
        (tenantDb as any).voter.count({ where: { electionId, isDead: false, isShifted: false, age: { gte: 51, lte: 65 } } }),
        (tenantDb as any).voter.count({ where: { electionId, isDead: false, isShifted: false, age: { gte: 66 } } }),
      ]),
    ]);

    const voterProfile = {
      total: totalVoters,
      leaning: Object.fromEntries(leaningCounts.map((l: any) => [l.politicalLeaning, l._count])),
      gender: Object.fromEntries(genderCounts.map((g: any) => [g.gender, g._count])),
      influence: Object.fromEntries(influenceCounts.map((i: any) => [i.influenceLevel, i._count])),
      ageBuckets: { '18-25': ageBuckets[0], '26-35': ageBuckets[1], '36-50': ageBuckets[2], '51-65': ageBuckets[3], '66+': ageBuckets[4] },
    };

    const systemPrompt = `You are an Indian election campaign strategist. Given voter demographics and a campaign goal, suggest the optimal target audience segment.

Return valid JSON:
{
  "suggestion": "descriptive text of who to target and why",
  "filter": {
    "preset": "all|loyal|swing|opposition|youth|seniors|female|male"
  },
  "estimatedReach": number,
  "confidence": "high|medium|low",
  "reasoning": "brief explanation"
}

Use the preset filter values that match the available targeting options.`;

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'campaign_audience',
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          temperature: 0.4,
          max_tokens: 800,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Campaign goal: ${goal}\n\nVoter demographics:\n${JSON.stringify(voterProfile, null, 2)}` },
          ],
        });
        return {
          output: completion.choices[0]?.message?.content || '{}',
          tokens: {
            input: completion.usage?.prompt_tokens || 0,
            output: completion.usage?.completion_tokens || 0,
          },
        };
      },
    });

    const raw = creditResult.output;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { suggestion: raw, filter: { preset: 'all' }, estimatedReach: totalVoters, confidence: 'low' };
    }

    res.json({ success: true, data: { ...parsed, creditsUsed: creditResult.creditsUsed, creditsRemaining: creditResult.creditsRemaining } });
  } catch (error: any) {
    logger.error({ err: error }, 'Campaign audience suggestion error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'AI audience suggestion failed' } });
  }
});

// ==================== GET /dashboard-narrative/:electionId ====================
// AI generates a daily briefing narrative from election data
router.get('/dashboard-narrative/:electionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const lang = (req.query.lang as string) || 'en';

    // Aggregate election data (no PII)
    const [election, totalVoters, leaningCounts, genderCounts, totalCadres, activeCadres, totalParts, campaignCount] = await Promise.all([
      (tenantDb as any).election.findUnique({
        where: { id: electionId },
        select: { name: true, constituency: true, state: true, electionType: true, status: true, pollDate: true, totalBooths: true },
      }),
      (tenantDb as any).voter.count({ where: { electionId, isDead: false, isShifted: false } }),
      (tenantDb as any).voter.groupBy({
        by: ['politicalLeaning'],
        where: { electionId, isDead: false, isShifted: false },
        _count: true,
      }),
      (tenantDb as any).voter.groupBy({
        by: ['gender'],
        where: { electionId, isDead: false, isShifted: false },
        _count: true,
      }),
      (tenantDb as any).cadre.count({ where: { electionId } }),
      (tenantDb as any).cadre.count({ where: { electionId, status: 'ACTIVE' } }),
      (tenantDb as any).part.count({ where: { electionId } }),
      (tenantDb as any).campaign.count({ where: { electionId } }).catch(() => 0),
    ]);

    if (!election) {
      res.status(404).json({ success: false, error: { message: 'Election not found' } });
      return;
    }

    const leaningMap = Object.fromEntries(leaningCounts.map((l: any) => [l.politicalLeaning, l._count]));
    const genderMap = Object.fromEntries(genderCounts.map((g: any) => [g.gender, g._count]));

    const dataSnapshot = {
      election: { name: election.name, constituency: election.constituency, state: election.state, type: election.electionType, status: election.status, pollDate: election.pollDate, booths: election.totalBooths },
      voters: { total: totalVoters, loyal: leaningMap['LOYAL'] || 0, swing: leaningMap['SWING'] || 0, opposition: leaningMap['OPPOSITION'] || 0, unknown: leaningMap['UNKNOWN'] || 0, male: genderMap['MALE'] || 0, female: genderMap['FEMALE'] || 0 },
      cadres: { total: totalCadres, active: activeCadres },
      parts: totalParts,
      campaigns: campaignCount,
    };

    const langName = LANG_NAMES[lang] || 'English';
    const systemPrompt = `You are a senior Indian election strategist providing a daily briefing. Given aggregated election data, generate:
1. A concise 2-3 paragraph narrative summary of the campaign's current state
2. Up to 3 key alerts (things that need immediate attention)
3. Up to 3 actionable recommendations

Return valid JSON:
{
  "narrative": "2-3 paragraph summary",
  "alerts": ["alert 1", "alert 2"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

${lang !== 'en' ? `Write the ENTIRE response in ${langName}.` : ''}
Use actual numbers from the data. Be specific and actionable.`;

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'dashboard_narrative',
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          temperature: 0.5,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Election data snapshot:\n${JSON.stringify(dataSnapshot, null, 2)}` },
          ],
        });
        return {
          output: completion.choices[0]?.message?.content || '{}',
          tokens: {
            input: completion.usage?.prompt_tokens || 0,
            output: completion.usage?.completion_tokens || 0,
          },
        };
      },
    });

    const raw = creditResult.output;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { narrative: raw, alerts: [], recommendations: [] };
    }

    res.json({ success: true, data: { ...parsed, creditsUsed: creditResult.creditsUsed, creditsRemaining: creditResult.creditsRemaining } });
  } catch (error: any) {
    logger.error({ err: error }, 'Dashboard narrative error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'AI narrative failed' } });
  }
});

// ==================== POST /voter/pulse-score ====================
// Compute pulse scores for voters (pure computation, no AI API call)
router.post('/voter/pulse-score', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.body;

    if (!electionId) {
      res.status(400).json({ success: false, error: { message: 'electionId is required' } });
      return;
    }

    // Get all voters with minimal fields for scoring
    const voters = await (tenantDb as any).voter.findMany({
      where: { electionId, isDead: false, isShifted: false },
      select: {
        id: true,
        politicalLeaning: true,
        influenceLevel: true,
        mobile: true,
        isFamilyCaptain: true,
      },
    });

    // Compute pulse scores
    const LEANING_SCORES: Record<string, number> = { LOYAL: 40, SWING: 20, OPPOSITION: 5, UNKNOWN: 15 };
    const INFLUENCE_SCORES: Record<string, number> = { HIGH: 25, MEDIUM: 15, LOW: 5, NONE: 0 };

    let updateCount = 0;
    const BATCH = 100;

    for (let i = 0; i < voters.length; i += BATCH) {
      const batch = voters.slice(i, i + BATCH);
      const updates = batch.map((v: any) => {
        let score = 0;
        score += LEANING_SCORES[v.politicalLeaning] || 15;
        score += INFLUENCE_SCORES[v.influenceLevel] || 0;
        score += v.mobile ? 10 : 0;
        score += v.isFamilyCaptain ? 10 : 0;
        // Cap at 100
        score = Math.min(score, 100);

        return (tenantDb as any).voter.update({
          where: { id: v.id },
          data: { pulseScore: score },
        });
      });

      await Promise.all(updates);
      updateCount += batch.length;
    }

    res.json({
      success: true,
      data: {
        message: `Pulse scores computed for ${updateCount} voters`,
        totalProcessed: updateCount,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Pulse score computation error');
    res.status(500).json({ success: false, error: { message: error.message || 'Pulse score computation failed' } });
  }
});

export { router as campaignAiRoutes };
