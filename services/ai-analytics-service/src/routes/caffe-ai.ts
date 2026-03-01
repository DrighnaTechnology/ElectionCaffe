import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../index.js';
import { getTenantDb } from '../utils/tenantDb.js';
import { withCreditCheck, FEATURE_CREDIT_COSTS } from '../utils/ai-credit-gate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(__dirname, '../../../../../prompts/caffe-ai');

// ── OpenAI client (lazy) ─────────────────────────────────────────────────────
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function loadPrompt(relativePath: string): string {
  const fp = resolve(PROMPTS_DIR, relativePath);
  if (!existsSync(fp)) return '';
  return readFileSync(fp, 'utf-8').trim();
}

// ── Identity leak protection ─────────────────────────────────────────────────
const IDENTITY_LEAK_PATTERNS = [
  /I(?:'m| am) (?:an? )?(?:AI|language model|LLM)(?:\s+(?:developed|created|made|built|designed|trained))?\s+(?:by|from)\s+(?:OpenAI|Google|Anthropic|Meta|Microsoft)/gi,
  /(?:developed|created|made|built|designed|trained|powered)\s+by\s+(?:OpenAI|Google|Anthropic|Meta|Microsoft)/gi,
  /I(?:'m| am)\s+(?:GPT|ChatGPT|GPT-4|GPT-4o|Claude|Gemini|Llama|Copilot)/gi,
  /(?:OpenAI|ChatGPT|GPT-4|GPT-4o|Anthropic|Claude|Google Gemini|Meta Llama)(?:'s)?\s+(?:AI|model|assistant|language model)/gi,
  /not\s+(?:specifically\s+)?(?:affiliated|associated|branded|related)\s+(?:with|to)\s+(?:ElectionCaff?e|Election\s+Caff?e)/gi,
];

const IDENTITY_REPLACEMENT = 'I am CaffeAI, the AI assistant built by ElectionCaffe to help you manage your election campaigns.';

function sanitizeIdentityLeak(text: string): string {
  let sanitized = text;
  for (const pattern of IDENTITY_LEAK_PATTERNS) {
    if (pattern.test(sanitized)) {
      // If the AI leaked its identity, replace the entire response
      logger.warn('[CaffeAI] Identity leak detected and sanitized');
      return IDENTITY_REPLACEMENT;
    }
  }
  return sanitized;
}

// Strip identity leaks from conversation history to prevent GPT from doubling down
function sanitizeMessages(msgs: Message[]): Message[] {
  return msgs.map((m) => {
    if (m.role === 'assistant') {
      for (const pattern of IDENTITY_LEAK_PATTERNS) {
        if (pattern.test(m.content)) {
          return { ...m, content: IDENTITY_REPLACEMENT };
        }
      }
    }
    return m;
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant'; content: string; }

interface ElectionContext {
  electionName?: string;
  electionType?: string;
  constituency?: string;
  state?: string;
  status?: string;
  totalVoters?: number;
  totalBooths?: number;
  pollDate?: string;
}

interface Action { label: string; to: string; }

// Language name map for Google Translate codes
const LANG_NAMES: Record<string, string> = {
  hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', gu: 'Gujarati',
  pa: 'Punjabi', or: 'Odia', ur: 'Urdu', as: 'Assamese',
};

// ── Guide step definitions ────────────────────────────────────────────────────
// Each step maps to a prompt file in steps/ and a set of action buttons
const GUIDE_STEPS: { file: string; title: string; actions: Action[] }[] = [
  {
    file: 'steps/step-03.txt',
    title: 'Step 3 — Create & Select Election',
    actions: [{ label: 'Go to Elections', to: '/elections' }],
  },
  {
    file: 'steps/step-04.txt',
    title: 'Step 4 — Configure Master Data',
    actions: [{ label: 'Go to Master Data', to: '/master-data' }],
  },
  {
    file: 'steps/step-05.txt',
    title: 'Step 5 — Import Polling Booths',
    actions: [{ label: 'Parts / Booths', to: '/parts' }, { label: 'Add Single Booth', to: '/parts/add' }],
  },
  {
    file: 'steps/step-06.txt',
    title: 'Step 6 — Import Voters',
    actions: [{ label: 'Go to Voters', to: '/voters' }],
  },
  {
    file: 'steps/step-07.txt',
    title: 'Step 7 — Create Families',
    actions: [{ label: 'Go to Families', to: '/families' }],
  },
  {
    file: 'steps/step-08.txt',
    title: 'Step 8 — Import Cadres',
    actions: [{ label: 'Go to Cadres', to: '/cadres' }],
  },
  {
    file: 'steps/step-09.txt',
    title: 'Step 9 — Assign Booth Committees',
    actions: [
      { label: 'Booth Committee', to: '/parts/booth-committee' },
      { label: 'BLA-2 Assignment', to: '/parts/bla2' },
      { label: 'Vulnerability', to: '/parts/vulnerability' },
    ],
  },
  {
    file: 'steps/step-10.txt',
    title: 'Step 10 — Add Candidates',
    actions: [{ label: 'Go to Candidates', to: '/candidates' }],
  },
  {
    file: 'steps/step-11.txt',
    title: 'Step 11 — Surveys & Campaigns',
    actions: [{ label: 'Surveys', to: '/surveys' }, { label: 'Campaigns', to: '/campaigns' }],
  },
  {
    file: 'steps/step-12.txt',
    title: 'Step 12 — Dashboard & Analytics',
    actions: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Analytics', to: '/analytics' },
      { label: 'AI Analytics', to: '/ai-analytics' },
      { label: 'Reports', to: '/reports' },
    ],
  },
  {
    file: 'steps/step-13.txt',
    title: 'Step 13 — Lock Election & Poll Day',
    actions: [
      { label: 'Elections', to: '/elections' },
      { label: 'Voter Slips', to: '/poll-day/voter-slips' },
      { label: 'Poll Day', to: '/poll-day' },
    ],
  },
];

// ── Auto-detect starting step from election context ───────────────────────────
function autoDetectStepIndex(ctx?: ElectionContext): number {
  if (!ctx?.electionName) return 0;               // No election → step 3
  if ((ctx.totalBooths ?? 0) === 0) return 1;     // No booths → step 4 (master data)
  if ((ctx.totalVoters ?? 0) === 0) return 3;     // No voters → step 6
  return 4;                                        // Has voters → step 7 (families)
}

// ── Guided intent detection ───────────────────────────────────────────────────
// Matches ANY "what's next / guide me / I'm new / next step" type intent
const GUIDED_START = /\b(new here|i.?m new|guide me|what.?s (my |the )?next|what next|what should i|what do i (do|start)|where (should|do) i start|help me start|just started|first time|next step|walk me through|setup guide|how do i start|what.?s first|where to start)\b/i;
// ONLY explicit confirmations that the CURRENT STEP is done — "next" removed to avoid "what next?" confusion
const STEP_DONE    = /\b(done|completed|finish(ed)?|moved on|proceed|i.?ve done|it.?s done|step done|all done)\b/i;

// ── Topic intent → section files ──────────────────────────────────────────────
const INTENT_MAP: [RegExp, string][] = [
  [/voter|epic|voter.*csv|csv.*voter|voter list/i,      'voters.txt'],
  [/booth|part\b|bla\b|committee|vulnerability/i,       'booths.txt'],
  [/family|families|captain|household/i,                'families.txt'],
  [/cadre|worker|volunteer|agent|coordinator/i,         'cadres.txt'],
  [/lock|poll.?day|voter slip|slip/i,                   'election.txt'],
  [/analytic|dashboard|report|turnout|swing|insight/i,  'analytics.txt'],
  [/candidate|nomination|battle.?card/i,                'candidates.txt'],
  [/fund|donation|expense|finance/i,                    'funds.txt'],
  [/inventory|stock|item|banner|material/i,             'inventory.txt'],
  [/survey|campaign|news|action|ai.?tool/i,             'campaigns.txt'],
];

function detectSections(messages: Message[]): string[] {
  const text = messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.content).join(' ');
  const matched: string[] = [];
  for (const [re, section] of INTENT_MAP) {
    if (re.test(text) && !matched.includes(section)) matched.push(section);
    if (matched.length >= 2) break;
  }
  return matched;
}

// ── Navigation intent ─────────────────────────────────────────────────────────
const NAV_TRIGGERS = /take me|go to|open|navigate|show me|bring me/i;
const NAV_MAP: [RegExp, string][] = [
  [/voter/i, '/voters'], [/booth|part\b/i, '/parts'], [/family/i, '/families'],
  [/cadre/i, '/cadres'], [/election/i, '/elections'], [/analytic/i, '/analytics'],
  [/dashboard/i, '/dashboard'], [/report/i, '/reports'], [/candidate/i, '/candidates'],
  [/survey/i, '/surveys'], [/campaign/i, '/campaigns'], [/fund/i, '/funds'],
  [/inventory/i, '/inventory'], [/master.?data/i, '/master-data'],
  [/setting/i, '/settings'], [/poll.?day/i, '/poll-day'], [/news/i, '/news'],
  [/ai.?analytic/i, '/ai-analytics'], [/ai.?tool/i, '/ai-tools'],
];

function detectNavIntent(messages: Message[]): string | null {
  const last = messages.at(-1)?.content || '';
  if (!NAV_TRIGGERS.test(last)) return null;
  for (const [re, path] of NAV_MAP) if (re.test(last)) return path;
  return null;
}

// ── Section action buttons ────────────────────────────────────────────────────
const SECTION_ACTIONS: Record<string, Action[]> = {
  'voters.txt':    [{ label: 'Voters', to: '/voters' }],
  'booths.txt':    [{ label: 'Parts / Booths', to: '/parts' }, { label: 'Booth Committee', to: '/parts/booth-committee' }, { label: 'BLA-2', to: '/parts/bla2' }],
  'families.txt':  [{ label: 'Families', to: '/families' }, { label: 'Family Captains', to: '/families/captains' }],
  'cadres.txt':    [{ label: 'Cadres', to: '/cadres' }],
  'election.txt':  [{ label: 'Elections', to: '/elections' }, { label: 'Poll Day', to: '/poll-day' }, { label: 'Voter Slips', to: '/poll-day/voter-slips' }],
  'analytics.txt': [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Analytics', to: '/analytics' }, { label: 'AI Analytics', to: '/ai-analytics' }, { label: 'Reports', to: '/reports' }],
  'candidates.txt':[{ label: 'Candidates', to: '/candidates' }],
  'funds.txt':     [{ label: 'Funds', to: '/funds' }],
  'inventory.txt': [{ label: 'Inventory', to: '/inventory' }],
  'campaigns.txt': [{ label: 'Surveys', to: '/surveys' }, { label: 'Campaigns', to: '/campaigns' }, { label: 'AI Tools', to: '/ai-tools' }],
};

// ── Router ────────────────────────────────────────────────────────────────────
export const caffeAiRoutes = Router();

/**
 * POST /api/caffe-ai/chat
 * Body: { messages, context?, guidedStep? }
 *   guidedStep: current step index (0-based) the frontend is tracking
 *               -1 means "just entered guided mode, auto-detect"
 * Response: { reply, actions, navTo?, nextGuidedStep?, isLastStep? }
 */
caffeAiRoutes.post('/chat', async (req: Request, res: Response) => {
  const { messages, context, guidedStep, lang } = req.body as {
    messages: Message[];
    context?: ElectionContext;
    guidedStep?: number;  // undefined = not in guided mode
    lang?: string;        // e.g. 'hi', 'bn', 'ta' — from googtrans cookie
  };
  const langName = lang && lang !== 'en' ? LANG_NAMES[lang] : null; // null = English (default)

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'messages array is required' });
  }

  try {
    const tenantDb = await getTenantDb(req);
    const lastMsg = messages.at(-1)?.content || '';
    const navTo = detectNavIntent(messages);

    // ── Determine if we're in guided mode ───────────────────────────────────
    const enteringGuided = guidedStep === undefined && GUIDED_START.test(lastMsg);
    const inGuided = guidedStep !== undefined || enteringGuided;

    // ── Determine current step index ────────────────────────────────────────
    let stepIndex: number;
    let nextGuidedStep: number | undefined;

    if (inGuided) {
      if (guidedStep === undefined || guidedStep === -1) {
        // First entry — auto-detect from context
        stepIndex = autoDetectStepIndex(context);
      } else if (STEP_DONE.test(lastMsg) || /\b(yes|ok|okay|yep|sure|next)\b/i.test(lastMsg)) {
        // User explicitly confirmed step is done → advance
        // Guard: ensure guidedStep is a valid number before incrementing
        const currentValid = Number.isFinite(guidedStep) ? guidedStep : autoDetectStepIndex(context);
        stepIndex = Math.min(currentValid + 1, GUIDE_STEPS.length - 1);
        nextGuidedStep = stepIndex;
      } else {
        // Same step, user asking a question — guard against bad index
        stepIndex = Number.isFinite(guidedStep) ? guidedStep : autoDetectStepIndex(context);
      }
    } else {
      stepIndex = -1; // not used in non-guided mode
    }

    // ── Build system prompt ─────────────────────────────────────────────────
    const basePrompt = loadPrompt('base.txt');

    // Election context block
    const contextBlock = context?.electionName
      ? [
          'ELECTION CONTEXT:',
          `- Election: ${context.electionName}`,
          context.electionType   ? `- Type: ${context.electionType}`   : '',
          context.constituency   ? `- Constituency: ${context.constituency}` : '',
          context.state          ? `- State: ${context.state}`         : '',
          context.status         ? `- Status: ${context.status}`       : '',
          context.totalVoters   != null ? `- Voters: ${context.totalVoters.toLocaleString('en-IN')}` : '',
          context.totalBooths   != null ? `- Booths: ${context.totalBooths.toLocaleString('en-IN')}` : '',
        ].filter(Boolean).join('\n')
      : 'ELECTION CONTEXT: No election selected. Ask user to select one from header dropdown.';

    // Language instruction — added to system prompt when non-English
    const langInstruction = langName
      ? `LANGUAGE: You MUST respond entirely in ${langName}. Translate all text including step titles, instructions, and prompts into ${langName}. Keep only technical terms (CSV column names, field names, route paths) in English.`
      : '';

    let reply: string;
    let actions: Action[];
    const isLastStep = inGuided && stepIndex === GUIDE_STEPS.length - 1;
    let lastCreditResult: { creditsUsed: number; creditsRemaining: number } | null = null;

    if (inGuided) {
      const step = GUIDE_STEPS[stepIndex];
      const stepContent = loadPrompt(step.file);
      actions = step.actions;

      // Detect if user is asking a question about this step (vs just entering/confirming)
      const isQuestion = messages.length > 1 && !STEP_DONE.test(lastMsg) && !GUIDED_START.test(lastMsg);

      if (isQuestion) {
        // User asked a question — use AI but lock it to only the step content
        const systemPrompt = [
          basePrompt,
          langInstruction,
          contextBlock,
          `STRICT: Answer ONLY questions about the step below. Do NOT mention any other steps.\n\n` + stepContent,
        ].filter(Boolean).join('\n\n---\n\n');

        logger.info({ inGuided, stepIndex, mode: 'question', lang }, '[CaffeAI] step question');

        const tenantId = req.headers['x-tenant-id'] as string;
        const userId = req.headers['x-user-id'] as string || 'system';

        const creditResult = await withCreditCheck({
          tenantDb, tenantId, userId,
          featureKey: 'caffe_ai_chat',
          callAI: async () => {
            const completion = await getOpenAI().chat.completions.create({
              model: process.env.OPENAI_MODEL || 'gpt-4o',
              messages: [{ role: 'system', content: systemPrompt }, ...sanitizeMessages(messages)],
              temperature: 0.3,
              max_tokens: 400,
            });
            return {
              output: completion.choices[0]?.message?.content?.trim() || 'Sorry, could not generate a response.',
              tokens: {
                input: completion.usage?.prompt_tokens || 0,
                output: completion.usage?.completion_tokens || 0,
              },
            };
          },
        });
        reply = creditResult.output;
        lastCreditResult = { creditsUsed: creditResult.creditsUsed, creditsRemaining: creditResult.creditsRemaining };
        reply += '\n\nReply **done** when you\'ve completed this step to continue.';
      } else {
        // Entering guided mode OR user confirmed step done → return hardcoded step
        const displayNum = stepIndex + 1;
        const cleanTitle = step.title.replace(/^Step \d+ — /, '');
        const prefix = nextGuidedStep !== undefined
          ? `Great! Moving on.\n\n`
          : `Here's your next step:\n\n`;
        const rawReply = `${prefix}**Step ${displayNum} of ${GUIDE_STEPS.length} — ${cleanTitle}**\n\n${stepContent}\n\n---\nReply **done** when complete to move to the next step, or ask me any question about this step.`;

        if (langName) {
          // Non-English: translate the hardcoded step through OpenAI
          logger.info({ stepIndex, lang }, '[CaffeAI] translating step');
          const tenantId = req.headers['x-tenant-id'] as string;
          const userId = req.headers['x-user-id'] as string || 'system';

          const creditResult = await withCreditCheck({
            tenantDb, tenantId, userId,
            featureKey: 'caffe_ai_translate',
            callAI: async () => {
              const completion = await getOpenAI().chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                messages: [
                  {
                    role: 'system',
                    content: `Translate the following ElectionCaffe guide step into ${langName}. Keep the exact same markdown formatting (bold, headings, bullets, dividers). Keep CSV column names, field names, and route paths in English. Translate everything else.`,
                  },
                  { role: 'user', content: rawReply },
                ],
                temperature: 0.2,
                max_tokens: 600,
              });
              return {
                output: completion.choices[0]?.message?.content?.trim() || rawReply,
                tokens: {
                  input: completion.usage?.prompt_tokens || 0,
                  output: completion.usage?.completion_tokens || 0,
                },
              };
            },
          });
          reply = creditResult.output;
          lastCreditResult = { creditsUsed: creditResult.creditsUsed, creditsRemaining: creditResult.creditsRemaining };
        } else {
          reply = rawReply;
        }
      }
    } else {
      // Normal Q&A mode
      const sections = detectSections(messages);
      const sectionContent = sections.map((f) => loadPrompt(f)).filter(Boolean).join('\n\n---\n\n');
      const systemPrompt = [basePrompt, langInstruction, contextBlock, sectionContent].filter(Boolean).join('\n\n---\n\n');
      const seen = new Set<string>();
      actions = sections.flatMap((f) => SECTION_ACTIONS[f] || []).filter((a) => {
        if (seen.has(a.to)) return false;
        seen.add(a.to);
        return true;
      }).slice(0, 5);

      logger.info({ sections, navTo }, '[CaffeAI] Q&A');

      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';

      const creditResult = await withCreditCheck({
        tenantDb, tenantId, userId,
        featureKey: 'caffe_ai_chat',
        callAI: async () => {
          const completion = await getOpenAI().chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, ...sanitizeMessages(messages)],
            temperature: 0.35,
            max_tokens: 600,
          });
          return {
            output: completion.choices[0]?.message?.content?.trim() || 'Sorry, could not generate a response.',
            tokens: {
              input: completion.usage?.prompt_tokens || 0,
              output: completion.usage?.completion_tokens || 0,
            },
          };
        },
      });
      reply = creditResult.output;
      lastCreditResult = { creditsUsed: creditResult.creditsUsed, creditsRemaining: creditResult.creditsRemaining };
    }

    return res.json({
      success: true,
      data: {
        reply: sanitizeIdentityLeak(reply),
        actions,
        navTo: navTo || undefined,
        guidedStep: inGuided ? stepIndex : undefined,
        nextGuidedStep,
        isLastStep,
        ...(lastCreditResult && { creditsUsed: lastCreditResult.creditsUsed, creditsRemaining: lastCreditResult.creditsRemaining }),
      },
    });
  } catch (err: any) {
    logger.error({ err }, '[CaffeAI] OpenAI call failed');
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'AI service error. Please try again.' });
  }
});
