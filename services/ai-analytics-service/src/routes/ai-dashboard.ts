import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTenantDb } from '../utils/tenantDb.js';
import { logger } from '../index.js';
import { withCreditCheck } from '../utils/ai-credit-gate.js';
import {
  executeAllWidgets,
  validateDashboardConfig,
  type DashboardWidget,
} from '../utils/dashboard-query-executor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, '../../../../prompts/ai-dashboard');

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

// ── Router ────────────────────────────────────────────────────────────────────
export const aiDashboardRoutes = Router();

/**
 * POST /api/ai-analytics/:electionId/dashboard/generate
 * Generate a dashboard config from a natural language prompt
 */
aiDashboardRoutes.post('/:electionId/dashboard/generate', async (req: Request, res: Response) => {
  const { electionId } = req.params;
  const { prompt } = req.body;

  if (!electionId || !prompt) {
    return res.status(400).json({ success: false, error: 'electionId and prompt are required' });
  }

  try {
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'unknown';

    // Get election context
    const election = await db.election.findUnique({
      where: { id: electionId },
      select: {
        id: true, name: true, electionType: true, state: true,
        constituency: true, totalVoters: true, totalBooths: true,
        totalMaleVoters: true, totalFemaleVoters: true,
      },
    });

    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }

    const systemPrompt = loadPrompt('system.txt');
    if (!systemPrompt) {
      return res.status(500).json({ success: false, error: 'System prompt not found' });
    }

    const electionContext = `
Current Election Context:
- Name: ${election.name}
- Type: ${election.electionType}
- State: ${election.state}
- Constituency: ${election.constituency}
- Total Voters: ${election.totalVoters}
- Male Voters: ${election.totalMaleVoters}
- Female Voters: ${election.totalFemaleVoters}
- Total Booths: ${election.totalBooths}
`;

    const creditResult = await withCreditCheck({
      tenantDb: db,
      tenantId,
      userId,
      featureKey: 'ai_dashboard_generate',
      callAI: async () => {
        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt + '\n\n' + electionContext },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        });

        const output = completion.choices[0]?.message?.content || '{}';
        return {
          output,
          tokens: {
            input: completion.usage?.prompt_tokens || 0,
            output: completion.usage?.completion_tokens || 0,
          },
        };
      },
    });

    // Parse and validate the AI response
    let dashboardConfig: any;
    try {
      dashboardConfig = JSON.parse(creditResult.output);
    } catch {
      logger.error({ raw: creditResult.output }, '[AI Dashboard] Failed to parse AI response');
      return res.status(500).json({ success: false, error: 'AI returned invalid JSON' });
    }

    // Validate structure
    try {
      dashboardConfig = validateDashboardConfig(dashboardConfig);
    } catch (err: any) {
      logger.error({ err, config: dashboardConfig }, '[AI Dashboard] Validation failed');
      return res.status(500).json({ success: false, error: `Invalid dashboard config: ${err.message}` });
    }

    return res.json({
      success: true,
      data: {
        dashboardConfig,
        prompt,
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (err: any) {
    logger.error({ err, electionId }, '[AI Dashboard] Generation failed');
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to generate dashboard. Please try again.' });
  }
});

/**
 * POST /api/ai-analytics/:electionId/dashboard/execute
 * Execute widget queries and return data
 */
aiDashboardRoutes.post('/:electionId/dashboard/execute', async (req: Request, res: Response) => {
  const { electionId } = req.params;
  const { widgets } = req.body;

  if (!electionId || !Array.isArray(widgets) || widgets.length === 0) {
    return res.status(400).json({ success: false, error: 'electionId and widgets array are required' });
  }

  try {
    const tenantDb = await getTenantDb(req);
    const widgetData = await executeAllWidgets(tenantDb as any, electionId, widgets as DashboardWidget[]);

    return res.json({ success: true, data: widgetData });
  } catch (err: any) {
    logger.error({ err, electionId }, '[AI Dashboard] Execution failed');
    return res.status(500).json({ success: false, error: 'Failed to execute dashboard queries' });
  }
});

/**
 * POST /api/ai-analytics/:electionId/dashboard/save
 * Save dashboard config to database
 */
aiDashboardRoutes.post('/:electionId/dashboard/save', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const { title, description, prompt, dashboardConfig, tags } = req.body;

    if (!electionId || !dashboardConfig) {
      return res.status(400).json({ success: false, error: 'electionId and dashboardConfig are required' });
    }

    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;
    const createdBy = req.headers['x-user-id'] as string || null;

    const dashboard = await db.aIDashboard.create({
      data: {
        electionId,
        title: title || dashboardConfig.title || 'Untitled Dashboard',
        description: description || dashboardConfig.description || null,
        prompt: prompt || null,
        dashboardConfig,
        tags: tags || [],
        createdBy,
      },
    });

    logger.info({ dashboardId: dashboard.id, electionId }, '[AI Dashboard] Dashboard saved');
    return res.json({ success: true, data: dashboard });
  } catch (err: any) {
    logger.error({ err }, '[AI Dashboard] Failed to save dashboard');
    return res.status(500).json({ success: false, error: 'Failed to save dashboard' });
  }
});

/**
 * GET /api/ai-analytics/:electionId/dashboard/library
 * List saved dashboards for an election
 */
aiDashboardRoutes.get('/:electionId/dashboard/library', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    const dashboards = await db.aIDashboard.findMany({
      where: { electionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        prompt: true,
        tags: true,
        createdBy: true,
        creditsUsed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ success: true, data: dashboards });
  } catch (err: any) {
    logger.error({ err }, '[AI Dashboard] Failed to list dashboards');
    return res.status(500).json({ success: false, error: 'Failed to list dashboards' });
  }
});

/**
 * GET /api/ai-analytics/:electionId/dashboard/:id
 * Get a single saved dashboard config
 */
aiDashboardRoutes.get('/:electionId/dashboard/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    const dashboard = await db.aIDashboard.findUnique({ where: { id } });
    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }

    return res.json({ success: true, data: dashboard });
  } catch (err: any) {
    logger.error({ err }, '[AI Dashboard] Failed to get dashboard');
    return res.status(500).json({ success: false, error: 'Failed to get dashboard' });
  }
});

/**
 * DELETE /api/ai-analytics/:electionId/dashboard/:id
 * Delete a saved dashboard
 */
aiDashboardRoutes.delete('/:electionId/dashboard/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantDb = await getTenantDb(req);
    const db = tenantDb as any;

    const dashboard = await db.aIDashboard.findUnique({ where: { id } });
    if (!dashboard) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }

    await db.aIDashboard.delete({ where: { id } });
    logger.info({ dashboardId: id }, '[AI Dashboard] Dashboard deleted');
    return res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, '[AI Dashboard] Failed to delete dashboard');
    return res.status(500).json({ success: false, error: 'Failed to delete dashboard' });
  }
});
