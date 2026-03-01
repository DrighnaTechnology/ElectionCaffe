import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTenantDb } from '../utils/tenantDb.js';
import { logger } from '../index.js';
import { withCreditCheck } from '../utils/ai-credit-gate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, '../../../../prompts/survey-ai');

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

// Language name map
const LANG_NAMES: Record<string, string> = {
  hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati',
  pa: 'Punjabi', or: 'Odia', ur: 'Urdu', as: 'Assamese',
};

// ── Router ────────────────────────────────────────────────────────────────────
export const surveyAiRoutes = Router();

/**
 * POST /api/caffe-ai/survey/generate
 * AI generates a structured survey from user's natural language prompt
 */
surveyAiRoutes.post('/survey/generate', async (req: Request, res: Response) => {
  const { electionId, prompt, lang } = req.body;

  if (!electionId || !prompt) {
    return res.status(400).json({ success: false, error: 'electionId and prompt are required' });
  }

  try {
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    // Fetch election context
    const election = await db.election.findUnique({
      where: { id: electionId },
      select: { name: true, electionType: true, state: true, constituency: true },
    });

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }

    const systemPrompt = loadPrompt('system.txt');
    let userPrompt = loadPrompt('user-template.txt');

    const replacements: Record<string, string> = {
      '{{electionName}}': election.name || '',
      '{{electionType}}': election.electionType || '',
      '{{state}}': election.state || '',
      '{{constituency}}': election.constituency || '',
      '{{userPrompt}}': prompt,
    };

    for (const [key, value] of Object.entries(replacements)) {
      userPrompt = userPrompt.replaceAll(key, value);
    }

    const langName = lang && lang !== 'en' ? LANG_NAMES[lang] : null;
    const langInstruction = langName
      ? `\n\nLANGUAGE: Write the question text in ${langName}. Keep the JSON structure keys in English but translate the question "text" and "options" values into ${langName}.`
      : '';

    logger.info({ electionId, promptLength: prompt.length }, '[Survey AI] Generating survey');

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'survey_generate',
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt + langInstruction },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 3000,
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
    logger.info({ rawLength: raw.length }, '[Survey AI] OpenAI response received');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.error({ raw }, '[Survey AI] Failed to parse OpenAI JSON');
      return res.status(500).json({ success: false, error: 'Failed to parse AI response' });
    }

    return res.json({
      success: true,
      data: {
        title: parsed.title || '',
        description: parsed.description || '',
        questions: parsed.questions || [],
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (err: any) {
    logger.error({ err, electionId }, '[Survey AI] Generation failed');
    if ((err as any).statusCode === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to generate survey' });
  }
});

/**
 * GET /api/caffe-ai/survey/analyze/:surveyId?electionId=xxx&lang=hi
 * AI analyzes aggregated survey responses
 */
surveyAiRoutes.get('/survey/analyze/:surveyId', async (req: Request, res: Response) => {
  const { surveyId } = req.params;
  const electionId = req.query.electionId as string;
  const lang = (req.query.lang as string) || '';

  if (!surveyId || !electionId) {
    return res.status(400).json({ success: false, error: 'surveyId and electionId are required' });
  }

  try {
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    // Fetch survey with all responses
    const [survey, responses, election] = await Promise.all([
      db.survey.findUnique({ where: { id: surveyId } }),
      db.surveyResponse.findMany({
        where: { surveyId },
        orderBy: { createdAt: 'desc' },
      }),
      db.election.findUnique({
        where: { id: electionId },
        select: { name: true, electionType: true, state: true, constituency: true },
      }),
    ]);

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }

    if (responses.length < 1) {
      return res.status(400).json({ success: false, error: 'Survey has no responses to analyze' });
    }

    const questions: any[] = Array.isArray(survey.questions) ? survey.questions : [];

    // ── Aggregate responses (never send raw text to OpenAI) ──────────────────
    const aggregated: string[] = [];
    const chartData: any[] = [];

    for (const q of questions) {
      const qId = q.id;
      const qText = q.text || q.question || `Question ${qId}`;
      const qType = q.type || 'text';
      const qOptions = q.options || [];

      // Collect all answers for this question
      const answers: any[] = [];
      for (const r of responses) {
        const ans = r.answers;
        if (ans && ans[qId] !== undefined && ans[qId] !== null && ans[qId] !== '') {
          answers.push(ans[qId]);
        }
      }

      const totalAnswered = answers.length;

      if (qType === 'text') {
        // For text: extract top keywords/themes (don't send raw text)
        const wordFreq: Record<string, number> = {};
        for (const a of answers) {
          const words = String(a).toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
          for (const w of words) {
            wordFreq[w] = (wordFreq[w] || 0) + 1;
          }
        }
        const topWords = Object.entries(wordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([word, count]) => `${word} (${count})`);

        aggregated.push(
          `Q: ${qText} [Type: text, Answered: ${totalAnswered}/${responses.length}]\n` +
          `Top keywords: ${topWords.join(', ') || 'No text responses'}\n` +
          `Sample themes: ${answers.slice(0, 5).map((a: any) => String(a).substring(0, 80)).join(' | ')}`
        );

        chartData.push({
          questionId: qId,
          question: qText,
          type: 'text',
          totalAnswered,
          topWords: topWords.slice(0, 10),
        });

      } else if (qType === 'scale' || qType === 'rating') {
        // For scale: average, distribution
        const nums = answers.map(Number).filter((n: number) => !isNaN(n));
        const avg = nums.length > 0 ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(1) : '0';
        const dist: Record<string, number> = {};
        for (const n of nums) {
          dist[String(n)] = (dist[String(n)] || 0) + 1;
        }

        aggregated.push(
          `Q: ${qText} [Type: scale, Answered: ${totalAnswered}/${responses.length}]\n` +
          `Average: ${avg}/5\n` +
          `Distribution: ${Object.entries(dist).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => `${k}★=${v}`).join(', ')}`
        );

        chartData.push({
          questionId: qId,
          question: qText,
          type: 'scale',
          totalAnswered,
          average: parseFloat(avg as string),
          distribution: dist,
        });

      } else if (qType === 'yes_no') {
        const yes = answers.filter((a: any) => String(a).toLowerCase() === 'yes' || a === true).length;
        const no = totalAnswered - yes;

        aggregated.push(
          `Q: ${qText} [Type: yes_no, Answered: ${totalAnswered}/${responses.length}]\n` +
          `Yes: ${yes} (${totalAnswered > 0 ? ((yes / totalAnswered) * 100).toFixed(1) : 0}%), No: ${no} (${totalAnswered > 0 ? ((no / totalAnswered) * 100).toFixed(1) : 0}%)`
        );

        chartData.push({
          questionId: qId,
          question: qText,
          type: 'yes_no',
          totalAnswered,
          distribution: { Yes: yes, No: no },
        });

      } else {
        // radio, checkbox, multiple_select, ranking, multiple_choice
        const optionCounts: Record<string, number> = {};
        for (const opt of qOptions) {
          optionCounts[opt] = 0;
        }

        for (const a of answers) {
          const vals = Array.isArray(a) ? a : [a];
          for (const v of vals) {
            const key = String(v);
            optionCounts[key] = (optionCounts[key] || 0) + 1;
          }
        }

        const sorted = Object.entries(optionCounts).sort((a, b) => b[1] - a[1]);
        const optionStr = sorted
          .map(([opt, count]) => `${opt}: ${count} (${totalAnswered > 0 ? ((count / totalAnswered) * 100).toFixed(1) : 0}%)`)
          .join(', ');

        aggregated.push(
          `Q: ${qText} [Type: ${qType}, Answered: ${totalAnswered}/${responses.length}]\n` +
          `Results: ${optionStr}`
        );

        chartData.push({
          questionId: qId,
          question: qText,
          type: qType,
          totalAnswered,
          distribution: Object.fromEntries(sorted),
        });
      }
    }

    // ── Build prompt for OpenAI ──────────────────────────────────────────────
    const systemPrompt = loadPrompt('analysis-system.txt');
    let userPrompt = loadPrompt('analysis-user-template.txt');

    const dates = responses.map((r: any) => new Date(r.createdAt || r.submittedAt));
    const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
    const dateRange = `${minDate.toLocaleDateString('en-IN')} to ${maxDate.toLocaleDateString('en-IN')}`;

    const replacements: Record<string, string> = {
      '{{surveyTitle}}': survey.title || 'Untitled Survey',
      '{{surveyDescription}}': survey.description || '',
      '{{totalResponses}}': String(responses.length),
      '{{dateRange}}': dateRange,
      '{{electionName}}': election.name || '',
      '{{electionType}}': election.electionType || '',
      '{{state}}': election.state || '',
      '{{constituency}}': election.constituency || '',
      '{{aggregatedData}}': aggregated.join('\n\n'),
    };

    for (const [key, value] of Object.entries(replacements)) {
      userPrompt = userPrompt.replaceAll(key, value);
    }

    const langName = lang && lang !== 'en' ? LANG_NAMES[lang] : null;
    const langInstruction = langName
      ? `\n\nLANGUAGE: Write the entire analysis in ${langName}. Keep technical terms in English.`
      : '';

    logger.info({
      surveyId, electionId, totalResponses: responses.length,
      questionsCount: questions.length,
    }, '[Survey AI] Analyzing survey responses');

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'survey_analyze',
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
    logger.info({ rawLength: raw.length }, '[Survey AI] Analysis response received');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.error({ raw }, '[Survey AI] Failed to parse analysis JSON');
      return res.status(500).json({ success: false, error: 'Failed to parse AI analysis' });
    }

    return res.json({
      success: true,
      data: {
        survey: {
          title: survey.title,
          description: survey.description,
          totalResponses: responses.length,
          dateRange,
        },
        election: {
          name: election.name,
          type: election.electionType,
          state: election.state,
          constituency: election.constituency,
        },
        analysis: {
          summary: parsed.summary || '',
          sections: parsed.sections || [],
          keyFindings: parsed.keyFindings || [],
          riskAreas: parsed.riskAreas || [],
          recommendations: parsed.recommendations || [],
        },
        chartData,
        generatedAt: new Date().toISOString(),
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (err: any) {
    logger.error({ err, surveyId }, '[Survey AI] Analysis failed');
    if ((err as any).statusCode === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to analyze survey' });
  }
});
