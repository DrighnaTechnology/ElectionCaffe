import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTenantDb } from '../utils/tenantDb.js';
import { logger } from '../index.js';
import { withCreditCheck } from '../utils/ai-credit-gate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolve prompts dir relative to project root
// index.ts (in src/) uses ../../../.env → project root is 3 levels from src/
// We're in src/routes/ → project root is 4 levels up
const PROMPTS_DIR = resolve(__dirname, '../../../../prompts/caffe-ai-report');

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

// Language name map (same as caffe-ai.ts)
const LANG_NAMES: Record<string, string> = {
  hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati',
  pa: 'Punjabi', or: 'Odia', ur: 'Urdu', as: 'Assamese',
};

// ── Router ────────────────────────────────────────────────────────────────────
export const caffeAiReportRoutes = Router();

/**
 * GET /api/caffe-ai/report/:electionId?lang=hi
 * Generates a strategic election report from aggregated data + OpenAI
 */
caffeAiReportRoutes.get('/report/:electionId', async (req: Request, res: Response) => {
  const { electionId } = req.params;
  const lang = (req.query.lang as string) || '';
  const langName = lang && lang !== 'en' ? LANG_NAMES[lang] : null;

  if (!electionId) {
    return res.status(400).json({ success: false, error: 'electionId is required' });
  }

  try {
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    // ── Step 1: Parallel aggregation queries (counts only, no raw rows) ──────
    const [
      election,
      totalVoters,
      maleVoters,
      femaleVoters,
      otherVoters,
      loyalVoters,
      swingVoters,
      oppositionVoters,
      unknownLeaningVoters,
      highInfluence,
      mediumInfluence,
      lowInfluence,
      noneInfluence,
      age18to25,
      age26to35,
      age36to50,
      age51to65,
      age65plus,
      totalBooths,
      urbanBooths,
      ruralBooths,
      vulnerableBooths,
      topBooths,
      totalFamilies,
      familyAvg,
      totalCadres,
      activeCadres,
      cadreTypeGroups,
      candidateCount,
      religionGroups,
      casteCategoryGroups,
    ] = await Promise.all([
      // Election details
      db.election.findUnique({
        where: { id: electionId },
        select: {
          name: true, electionType: true, state: true, constituency: true,
          status: true, pollDate: true, district: true,
        },
      }),
      // Voter counts
      db.voter.count({ where: { electionId } }),
      db.voter.count({ where: { electionId, gender: 'MALE' } }),
      db.voter.count({ where: { electionId, gender: 'FEMALE' } }),
      db.voter.count({ where: { electionId, gender: 'OTHER' } }),
      // Political leaning
      db.voter.count({ where: { electionId, politicalLeaning: 'LOYAL' } }),
      db.voter.count({ where: { electionId, politicalLeaning: 'SWING' } }),
      db.voter.count({ where: { electionId, politicalLeaning: 'OPPOSITION' } }),
      db.voter.count({ where: { electionId, politicalLeaning: 'UNKNOWN' } }),
      // Influence levels
      db.voter.count({ where: { electionId, influenceLevel: 'HIGH' } }),
      db.voter.count({ where: { electionId, influenceLevel: 'MEDIUM' } }),
      db.voter.count({ where: { electionId, influenceLevel: 'LOW' } }),
      db.voter.count({ where: { electionId, influenceLevel: 'NONE' } }),
      // Age distribution (5 buckets)
      db.voter.count({ where: { electionId, age: { gte: 18, lte: 25 } } }),
      db.voter.count({ where: { electionId, age: { gte: 26, lte: 35 } } }),
      db.voter.count({ where: { electionId, age: { gte: 36, lte: 50 } } }),
      db.voter.count({ where: { electionId, age: { gte: 51, lte: 65 } } }),
      db.voter.count({ where: { electionId, age: { gt: 65 } } }),
      // Booth counts
      db.part.count({ where: { electionId } }),
      db.part.count({ where: { electionId, partType: 'URBAN' } }),
      db.part.count({ where: { electionId, partType: 'RURAL' } }),
      db.part.count({ where: { electionId, isVulnerable: true } }),
      // Top 10 booths by voter count
      db.part.findMany({
        where: { electionId },
        orderBy: { totalVoters: 'desc' },
        take: 10,
        select: { boothName: true, partNumber: true, totalVoters: true, isVulnerable: true, vulnerability: true },
      }),
      // Family stats
      db.family.count({ where: { electionId } }),
      db.family.aggregate({ where: { electionId }, _avg: { totalMembers: true } }),
      // Cadre stats
      db.cadre.count({ where: { electionId } }),
      db.cadre.count({ where: { electionId, isActive: true } }),
      db.cadre.groupBy({ by: ['cadreType'], where: { electionId }, _count: true }),
      // Candidates
      db.candidate.count({ where: { electionId } }),
      // Top religions (groupBy religionId → lookup names)
      db.voter.groupBy({
        by: ['religionId'],
        where: { electionId, religionId: { not: null } },
        _count: true,
        orderBy: { _count: { religionId: 'desc' } },
        take: 5,
      }),
      // Top caste categories
      db.voter.groupBy({
        by: ['casteCategoryId'],
        where: { electionId, casteCategoryId: { not: null } },
        _count: true,
        orderBy: { _count: { casteCategoryId: 'desc' } },
        take: 5,
      }),
    ]);

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }

    // ── Step 2: Resolve religion & caste names ───────────────────────────────
    const religionIds = religionGroups.map((r: any) => r.religionId).filter(Boolean);
    const casteCategoryIds = casteCategoryGroups.map((c: any) => c.casteCategoryId).filter(Boolean);

    const [religions, casteCategories] = await Promise.all([
      religionIds.length > 0
        ? db.religion.findMany({ where: { id: { in: religionIds } }, select: { id: true, religionName: true } })
        : [],
      casteCategoryIds.length > 0
        ? db.casteCategory.findMany({ where: { id: { in: casteCategoryIds } }, select: { id: true, categoryName: true } })
        : [],
    ]);

    const religionNameMap = new Map(religions.map((r: any) => [r.id, r.religionName]));
    const casteCategoryNameMap = new Map(casteCategories.map((c: any) => [c.id, c.categoryName]));

    // ── Step 3: Format aggregated data for template ──────────────────────────
    const topReligionsStr = religionGroups.length > 0
      ? religionGroups.map((r: any) => `- ${religionNameMap.get(r.religionId) || 'Unknown'}: ${r._count}`).join('\n')
      : '- No religion data available';

    const topCastesStr = casteCategoryGroups.length > 0
      ? casteCategoryGroups.map((c: any) => `- ${casteCategoryNameMap.get(c.casteCategoryId) || 'Unknown'}: ${c._count}`).join('\n')
      : '- No caste category data available';

    const boothDetailsStr = topBooths.length > 0
      ? topBooths.map((b: any) =>
          `- Part ${b.partNumber} (${b.boothName}): ${b.totalVoters} voters${b.isVulnerable ? ` [VULNERABLE - ${b.vulnerability}]` : ''}`
        ).join('\n')
      : '- No booth data available';

    const cadreTypeStr = cadreTypeGroups.length > 0
      ? cadreTypeGroups.map((c: any) => `- ${c.cadreType}: ${c._count}`).join('\n')
      : '- No cadre data available';

    const avgFamilySize = familyAvg._avg?.totalMembers
      ? familyAvg._avg.totalMembers.toFixed(1)
      : '0';

    const cadreBoothRatio = totalBooths > 0
      ? (totalCadres / totalBooths).toFixed(1)
      : '0';

    const ageDistStr = [
      `- 18-25: ${age18to25}`,
      `- 26-35: ${age26to35}`,
      `- 36-50: ${age36to50}`,
      `- 51-65: ${age51to65}`,
      `- 65+: ${age65plus}`,
    ].join('\n');

    // ── Step 4: Build the prompt from template ───────────────────────────────
    const systemPrompt = loadPrompt('system.txt');
    let userPrompt = loadPrompt('user-template.txt');

    const replacements: Record<string, string> = {
      '{{electionName}}': election.name,
      '{{electionType}}': election.electionType,
      '{{state}}': election.state,
      '{{constituency}}': election.constituency,
      '{{status}}': election.status,
      '{{pollDate}}': election.pollDate ? new Date(election.pollDate).toLocaleDateString('en-IN') : 'Not set',
      '{{candidateCount}}': String(candidateCount),
      '{{totalVoters}}': totalVoters.toLocaleString('en-IN'),
      '{{maleVoters}}': maleVoters.toLocaleString('en-IN'),
      '{{femaleVoters}}': femaleVoters.toLocaleString('en-IN'),
      '{{otherVoters}}': otherVoters.toLocaleString('en-IN'),
      '{{loyalVoters}}': loyalVoters.toLocaleString('en-IN'),
      '{{swingVoters}}': swingVoters.toLocaleString('en-IN'),
      '{{oppositionVoters}}': oppositionVoters.toLocaleString('en-IN'),
      '{{unknownLeaningVoters}}': unknownLeaningVoters.toLocaleString('en-IN'),
      '{{highInfluence}}': highInfluence.toLocaleString('en-IN'),
      '{{mediumInfluence}}': mediumInfluence.toLocaleString('en-IN'),
      '{{lowInfluence}}': lowInfluence.toLocaleString('en-IN'),
      '{{noneInfluence}}': noneInfluence.toLocaleString('en-IN'),
      '{{ageDistribution}}': ageDistStr,
      '{{topReligions}}': topReligionsStr,
      '{{topCastes}}': topCastesStr,
      '{{totalBooths}}': String(totalBooths),
      '{{urbanBooths}}': String(urbanBooths),
      '{{ruralBooths}}': String(ruralBooths),
      '{{vulnerableBooths}}': String(vulnerableBooths),
      '{{boothDetails}}': boothDetailsStr,
      '{{totalFamilies}}': totalFamilies.toLocaleString('en-IN'),
      '{{avgFamilySize}}': avgFamilySize,
      '{{totalCadres}}': String(totalCadres),
      '{{activeCadres}}': String(activeCadres),
      '{{cadreBoothRatio}}': cadreBoothRatio,
      '{{cadreTypeBreakdown}}': cadreTypeStr,
    };

    for (const [key, value] of Object.entries(replacements)) {
      userPrompt = userPrompt.replaceAll(key, value);
    }

    // ── Step 5: Language instruction ─────────────────────────────────────────
    const langInstruction = langName
      ? `\n\nLANGUAGE: You MUST write the entire report in ${langName}. Translate all section titles, analysis, and recommendations into ${langName}. Keep only technical terms and numbers in English.`
      : '';

    // ── Step 6: Call OpenAI (with credit check) ──────────────────────────────
    logger.info({
      electionId, lang, totalVoters, totalBooths,
      promptsDir: PROMPTS_DIR,
      systemPromptLen: systemPrompt.length,
      userPromptLen: userPrompt.length,
    }, '[CaffeAI Report] Generating strategic report');

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'caffe_ai_report',
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt + langInstruction },
            { role: 'user', content: userPrompt + '\n\nRespond with valid json only.' },
          ],
          temperature: 0.4,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        });
        return {
          output: completion.choices[0]?.message?.content?.trim() || '{}',
          tokens: {
            input: completion.usage?.prompt_tokens || 0,
            output: completion.usage?.completion_tokens || 0,
          },
        };
      },
    });

    const raw = creditResult.output;
    logger.info({ rawLength: raw.length, rawPreview: raw.substring(0, 200) }, '[CaffeAI Report] OpenAI raw response');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.error({ raw }, '[CaffeAI Report] Failed to parse OpenAI JSON response');
      return res.status(500).json({ success: false, error: 'Failed to parse AI response' });
    }

    // OpenAI may wrap sections in various keys — find the array
    const sections = parsed.sections || parsed.report?.sections || parsed.report || [];
    logger.info({ parsedKeys: Object.keys(parsed), sectionCount: Array.isArray(sections) ? sections.length : 0 }, '[CaffeAI Report] Parsed response');

    // Build religion/caste label arrays for charts
    const religionLabels = religionGroups.map((r: any) => ({
      name: religionNameMap.get(r.religionId) || 'Unknown',
      count: r._count,
    }));
    const casteLabels = casteCategoryGroups.map((c: any) => ({
      name: casteCategoryNameMap.get(c.casteCategoryId) || 'Unknown',
      count: c._count,
    }));

    return res.json({
      success: true,
      data: {
        report: Array.isArray(sections) ? sections : [],
        election: {
          name: election.name,
          type: election.electionType,
          state: election.state,
          constituency: election.constituency,
          district: election.district,
          status: election.status,
          pollDate: election.pollDate,
          totalVoters,
          totalBooths,
          candidateCount,
        },
        // Raw aggregated numbers for chart rendering
        chartData: {
          gender: { male: maleVoters, female: femaleVoters, other: otherVoters },
          politicalLeaning: { loyal: loyalVoters, swing: swingVoters, opposition: oppositionVoters, unknown: unknownLeaningVoters },
          influence: { high: highInfluence, medium: mediumInfluence, low: lowInfluence, none: noneInfluence },
          age: { '18-25': age18to25, '26-35': age26to35, '36-50': age36to50, '51-65': age51to65, '65+': age65plus },
          booths: { total: totalBooths, urban: urbanBooths, rural: ruralBooths, vulnerable: vulnerableBooths },
          topBooths: topBooths.map((b: any) => ({
            name: `Part ${b.partNumber}`,
            boothName: b.boothName,
            voters: b.totalVoters || 0,
            vulnerable: b.isVulnerable || false,
          })),
          families: { total: totalFamilies, avgSize: parseFloat(avgFamilySize) },
          cadres: { total: totalCadres, active: activeCadres, boothRatio: parseFloat(cadreBoothRatio) },
          religions: religionLabels,
          castes: casteLabels,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error({ err, electionId }, '[CaffeAI Report] Report generation failed');
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to generate report. Please try again.' });
  }
});

// ── Save a generated AI report ─────────────────────────────────────────────
caffeAiReportRoutes.post('/report/save', async (req: Request, res: Response) => {
  try {
    const { electionId, title, generatedData } = req.body;
    if (!electionId || !generatedData) {
      return res.status(400).json({ success: false, error: 'electionId and generatedData are required' });
    }

    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;
    const generatedBy = req.headers['x-user-id'] as string || null;

    const report = await db.report.create({
      data: {
        electionId,
        reportType: 'AI_STRATEGIC',
        title: title || 'AI Strategic Report',
        generatedData,
        status: 'completed',
        generatedBy,
        generatedAt: new Date(),
      },
    });

    logger.info({ reportId: report.id, electionId }, '[CaffeAI Report] Report saved');
    return res.json({ success: true, data: report });
  } catch (err: any) {
    logger.error({ err }, '[CaffeAI Report] Failed to save report');
    return res.status(500).json({ success: false, error: 'Failed to save report' });
  }
});

// ── List saved AI reports for an election ───────────────────────────────────
caffeAiReportRoutes.get('/reports/:electionId', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    const reports = await db.report.findMany({
      where: { electionId, reportType: 'AI_STRATEGIC' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        generatedAt: true,
        createdAt: true,
      },
    });

    return res.json({ success: true, data: reports });
  } catch (err: any) {
    logger.error({ err }, '[CaffeAI Report] Failed to list reports');
    return res.status(500).json({ success: false, error: 'Failed to list reports' });
  }
});

// ── Get a single saved AI report (full data) ───────────────────────────────
caffeAiReportRoutes.get('/report/saved/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    const report = await db.report.findUnique({ where: { id } });
    if (!report || report.reportType !== 'AI_STRATEGIC') {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    return res.json({ success: true, data: report });
  } catch (err: any) {
    logger.error({ err }, '[CaffeAI Report] Failed to get report');
    return res.status(500).json({ success: false, error: 'Failed to get report' });
  }
});

// ── Delete a saved AI report ────────────────────────────────────────────────
caffeAiReportRoutes.delete('/report/saved/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    const report = await db.report.findUnique({ where: { id } });
    if (!report || report.reportType !== 'AI_STRATEGIC') {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    await db.report.delete({ where: { id } });
    logger.info({ reportId: id }, '[CaffeAI Report] Report deleted');
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, '[CaffeAI Report] Failed to delete report');
    return res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
});
