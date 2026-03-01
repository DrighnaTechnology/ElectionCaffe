import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { logger } from '../index.js';
import { getTenantDb } from '../utils/tenantDb.js';
import { withCreditCheck } from '../utils/ai-credit-gate.js';

// ── OpenAI client (lazy) ─────────────────────────────────────────────────────
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

const router = Router();

// ── Helper: safe JSON parse ──────────────────────────────────────────────────
function safeJsonParse(raw: string, fallback: any = {}): any {
  try {
    return JSON.parse(raw);
  } catch {
    logger.warn({ raw: raw.substring(0, 200) }, '[PollDayAI] Failed to parse AI JSON response');
    return fallback;
  }
}

// ── Helper: gather core poll-day data ────────────────────────────────────────
async function gatherSituationData(tenantDb: any, electionId: string) {
  const [
    booths,
    turnoutSnapshots,
    activeAgents,
    totalAgents,
    openIncidents,
    gotvTargets,
    moodReports,
    pollDayVotes,
  ] = await Promise.all([
    (tenantDb as any).booth.findMany({
      where: { electionId },
      select: { id: true, boothNumber: true, boothName: true, totalVoters: true, maleVoters: true, femaleVoters: true },
    }),
    (tenantDb as any).turnoutSnapshot.findMany({
      where: { electionId },
      orderBy: { snapshotTime: 'desc' },
    }),
    (tenantDb as any).boothAgent.count({ where: { electionId, isActive: true } }),
    (tenantDb as any).boothAgent.count({ where: { electionId } }),
    (tenantDb as any).pollDayIncident.findMany({
      where: { electionId, status: { not: 'RESOLVED' } },
      select: { id: true, boothId: true, incidentType: true, severity: true, status: true, escalationLevel: true },
    }),
    (tenantDb as any).gOTVTarget.findMany({
      where: { electionId },
      select: { id: true, boothId: true, wave: true, priority: true, status: true },
    }),
    (tenantDb as any).agentMoodReport.findMany({
      where: { electionId },
      orderBy: { createdAt: 'desc' },
    }),
    (tenantDb as any).pollDayVote.findMany({
      where: { electionId },
      select: { boothId: true, hasVoted: true },
    }),
  ]);

  // Compute per-booth turnout from PollDayVote records
  const boothVoteMap: Record<string, number> = {};
  for (const v of pollDayVotes) {
    if (v.hasVoted) {
      boothVoteMap[v.boothId] = (boothVoteMap[v.boothId] || 0) + 1;
    }
  }

  const boothTurnout = booths.map((b: any) => {
    const voted = boothVoteMap[b.id] || 0;
    const pct = b.totalVoters > 0 ? Math.round((voted / b.totalVoters) * 10000) / 100 : 0;
    return { boothId: b.id, boothNumber: b.boothNumber, boothName: b.boothName, totalVoters: b.totalVoters, voted, percentage: pct };
  });

  // Sort for best/worst
  const sorted = [...boothTurnout].sort((a, b) => a.percentage - b.percentage);
  const worst5 = sorted.slice(0, 5);
  const best5 = sorted.slice(-5).reverse();

  // Overall turnout
  const totalVoters = booths.reduce((sum: number, b: any) => sum + (b.totalVoters || 0), 0);
  const totalVoted = Object.values(boothVoteMap).reduce((sum: number, v: any) => sum + v, 0);
  const overallTurnout = totalVoters > 0 ? Math.round((totalVoted / totalVoters) * 10000) / 100 : 0;

  // GOTV progress by wave
  const gotvByWave: Record<string, { total: number; completed: number; pending: number }> = {};
  for (const t of gotvTargets) {
    const w = t.wave || 'UNASSIGNED';
    if (!gotvByWave[w]) gotvByWave[w] = { total: 0, completed: 0, pending: 0 };
    gotvByWave[w].total++;
    if (t.status === 'VOTED' || t.status === 'COMPLETED') gotvByWave[w].completed++;
    else gotvByWave[w].pending++;
  }

  // Latest mood summary
  const moodSummary: Record<string, number> = { GREEN: 0, YELLOW: 0, RED: 0 };
  const seenAgents = new Set<string>();
  for (const m of moodReports) {
    if (!seenAgents.has(m.agentId)) {
      seenAgents.add(m.agentId);
      moodSummary[m.mood] = (moodSummary[m.mood] || 0) + 1;
    }
  }

  // Incident summary
  const incidentSummary: Record<string, number> = {};
  for (const inc of openIncidents) {
    const key = `${inc.severity}_${inc.incidentType}`;
    incidentSummary[key] = (incidentSummary[key] || 0) + 1;
  }

  return {
    booths,
    boothTurnout,
    worst5,
    best5,
    overallTurnout,
    totalVoters,
    totalVoted,
    activeAgents,
    totalAgents,
    openIncidents: openIncidents.length,
    incidentSummary,
    incidentDetails: openIncidents.slice(0, 10),
    gotvByWave,
    moodSummary,
    turnoutSnapshots,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /:electionId/poll-day/situation-report (3 credits)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:electionId/poll-day/situation-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    // Gather real data
    const data = await gatherSituationData(tenantDb, electionId!);

    const dataSummary = {
      overallTurnout: `${data.overallTurnout}% (${data.totalVoted}/${data.totalVoters})`,
      worst5Booths: data.worst5.map(b => `Booth ${b.boothNumber} (${b.boothName}): ${b.percentage}%`),
      best5Booths: data.best5.map(b => `Booth ${b.boothNumber} (${b.boothName}): ${b.percentage}%`),
      activeAgents: `${data.activeAgents}/${data.totalAgents}`,
      openIncidents: data.openIncidents,
      incidentSummary: data.incidentSummary,
      gotvProgress: data.gotvByWave,
      agentMood: data.moodSummary,
    };

    const systemPrompt = `You are an expert Indian election war room analyst. Generate a concise situation report with: 1) Overall assessment (1-2 lines), 2) Critical issues (bullet points), 3) Immediate action items (bullet points), 4) Booths needing urgent attention. Be direct and actionable. Use military-style brevity.

Return valid JSON with this structure:
{
  "summary": "1-2 line overall assessment",
  "overallStatus": "GREEN" | "YELLOW" | "RED",
  "criticalIssues": ["issue1", "issue2"],
  "actionItems": ["action1", "action2"],
  "boothsNeedingAttention": [{"boothNumber": 1, "boothName": "...", "reason": "..."}]
}`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'poll_day_sitrep',
      creditsPerCall: 3,
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Current poll day situation data:\n${JSON.stringify(dataSummary, null, 2)}` },
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

    const parsed = safeJsonParse(creditResult.output, {
      summary: creditResult.output,
      overallStatus: 'YELLOW',
      criticalIssues: [],
      actionItems: [],
      boothsNeedingAttention: [],
    });

    res.json({
      success: true,
      data: {
        summary: parsed.summary || '',
        overallStatus: parsed.overallStatus || 'YELLOW',
        criticalIssues: parsed.criticalIssues || [],
        actionItems: parsed.actionItems || [],
        boothsNeedingAttention: parsed.boothsNeedingAttention || [],
        generatedAt: new Date().toISOString(),
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[PollDayAI] situation-report error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'Situation report generation failed' } });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:electionId/poll-day/battle-orders (3 credits)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:electionId/poll-day/battle-orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    // Gather situation data plus additional context
    const data = await gatherSituationData(tenantDb, electionId!);

    const [agents, classifications, swingCounts] = await Promise.all([
      (tenantDb as any).boothAgent.findMany({
        where: { electionId },
        select: { id: true, boothId: true, name: true, isActive: true, votesMarked: true, lastLatitude: true, lastLongitude: true },
      }),
      (tenantDb as any).boothClassification.findMany({
        where: { electionId },
        select: { boothId: true, classification: true, riskScore: true, priority: true },
      }),
      (tenantDb as any).voter.groupBy({
        by: ['boothId'],
        where: { electionId, politicalLeaning: 'SWING' },
        _count: true,
      }),
    ]);

    const swingByBooth: Record<string, number> = {};
    for (const s of swingCounts) {
      swingByBooth[s.boothId] = s._count;
    }

    const classificationMap: Record<string, any> = {};
    for (const c of classifications) {
      classificationMap[c.boothId] = { classification: c.classification, riskScore: c.riskScore };
    }

    const dataSummary = {
      overallTurnout: `${data.overallTurnout}%`,
      totalVoters: data.totalVoters,
      totalVoted: data.totalVoted,
      worst5Booths: data.worst5.map(b => `Booth ${b.boothNumber}: ${b.percentage}% turnout`),
      best5Booths: data.best5.map(b => `Booth ${b.boothNumber}: ${b.percentage}% turnout`),
      activeAgents: data.activeAgents,
      totalAgents: data.totalAgents,
      openIncidents: data.openIncidents,
      agentMood: data.moodSummary,
      gotvProgress: data.gotvByWave,
      agentLocations: agents.slice(0, 50).map((a: any) => ({
        name: a.name, boothId: a.boothId, isActive: a.isActive, votesMarked: a.votesMarked,
      })),
      boothClassifications: data.boothTurnout.slice(0, 30).map(b => ({
        boothNumber: b.boothNumber, boothName: b.boothName, turnout: b.percentage,
        classification: classificationMap[b.boothId]?.classification || 'UNCLASSIFIED',
        riskScore: classificationMap[b.boothId]?.riskScore || 0,
        swingVoters: swingByBooth[b.boothId] || 0,
      })),
    };

    const systemPrompt = `You are an AI election commander. Based on the data, generate specific battle orders. Each order should specify: 1) What action to take, 2) Who should do it, 3) Where (booth), 4) Expected impact. Focus on maximizing vote turnout from favorable voters. Prioritize orders by impact.

Return valid JSON:
{
  "orders": [
    {
      "orderType": "DEPLOY|REINFORCE|ESCALATE|MOBILIZE|COUNTER",
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "title": "short action title",
      "description": "detailed action description",
      "targetBoothNumber": 123,
      "targetBoothName": "booth name",
      "assignTo": "role or person type",
      "expectedImpact": "estimated impact description"
    }
  ]
}

Generate 5-10 orders, sorted by priority (CRITICAL first).`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'poll_day_battle_orders',
      creditsPerCall: 3,
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.4,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Current battlefield data:\n${JSON.stringify(dataSummary, null, 2)}` },
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

    const parsed = safeJsonParse(creditResult.output, { orders: [] });
    const orders = Array.isArray(parsed.orders) ? parsed.orders : [];

    // Save orders to BattleOrder table
    const savedOrders = [];
    for (const order of orders) {
      try {
        const saved = await (tenantDb as any).battleOrder.create({
          data: {
            electionId,
            orderType: order.orderType || 'MOBILIZE',
            priority: order.priority || 'MEDIUM',
            title: order.title || 'Untitled Order',
            description: order.description || '',
            status: 'PENDING',
            generatedBy: 'AI',
          },
        });
        savedOrders.push({
          id: saved.id,
          orderType: order.orderType,
          priority: order.priority,
          title: order.title,
          description: order.description,
          targetBoothNumber: order.targetBoothNumber,
          targetBoothName: order.targetBoothName,
          assignTo: order.assignTo,
          expectedImpact: order.expectedImpact,
        });
      } catch (saveErr) {
        logger.warn({ err: saveErr, order: order.title }, '[PollDayAI] Failed to save battle order');
      }
    }

    res.json({
      success: true,
      data: {
        orders: savedOrders,
        totalGenerated: savedOrders.length,
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[PollDayAI] battle-orders error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'Battle orders generation failed' } });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:electionId/poll-day/victory-simulation (3 credits)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:electionId/poll-day/victory-simulation', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    // Gather turnout and voter classification data per booth
    const [booths, pollDayVotes, voterLeanings] = await Promise.all([
      (tenantDb as any).booth.findMany({
        where: { electionId },
        select: { id: true, boothNumber: true, boothName: true, totalVoters: true },
      }),
      (tenantDb as any).pollDayVote.findMany({
        where: { electionId, hasVoted: true },
        select: { boothId: true, voterId: true },
      }),
      (tenantDb as any).voter.findMany({
        where: { electionId },
        select: { id: true, boothId: true, politicalLeaning: true },
      }),
    ]);

    // Build voter leaning map by voter ID
    const voterLeaningMap: Record<string, string> = {};
    for (const v of voterLeanings) {
      voterLeaningMap[v.id] = v.politicalLeaning || 'UNKNOWN';
    }

    // Build per-booth leaning counts
    const boothLeaningCounts: Record<string, Record<string, number>> = {};
    for (const v of voterLeanings) {
      if (!boothLeaningCounts[v.boothId]) boothLeaningCounts[v.boothId] = { LOYAL: 0, FAVORABLE: 0, SWING: 0, NEUTRAL: 0, OPPOSITION: 0, UNKNOWN: 0 };
      const leaning = v.politicalLeaning || 'UNKNOWN';
      boothLeaningCounts[v.boothId][leaning] = (boothLeaningCounts[v.boothId][leaning] || 0) + 1;
    }

    // Build set of voted voter IDs per booth
    const votedByBooth: Record<string, Set<string>> = {};
    for (const v of pollDayVotes) {
      if (!votedByBooth[v.boothId]) votedByBooth[v.boothId] = new Set();
      votedByBooth[v.boothId].add(v.voterId);
    }

    // Count voted by leaning per booth
    const votedLeaningCounts: Record<string, Record<string, number>> = {};
    for (const v of pollDayVotes) {
      if (!votedLeaningCounts[v.boothId]) votedLeaningCounts[v.boothId] = { LOYAL: 0, FAVORABLE: 0, SWING: 0, NEUTRAL: 0, OPPOSITION: 0, UNKNOWN: 0 };
      const leaning = voterLeaningMap[v.voterId] || 'UNKNOWN';
      votedLeaningCounts[v.boothId][leaning] = (votedLeaningCounts[v.boothId][leaning] || 0) + 1;
    }

    // Monte Carlo simulation per booth
    let totalOurVotesBase = 0;
    let totalOppVotesBase = 0;
    let totalOurVotesOptimistic = 0;
    let totalOppVotesOptimistic = 0;
    let totalOurVotesPessimistic = 0;
    let totalOppVotesPessimistic = 0;

    const boothSimulations = booths.map((booth: any) => {
      const leanings = boothLeaningCounts[booth.id] || { LOYAL: 0, FAVORABLE: 0, SWING: 0, NEUTRAL: 0, OPPOSITION: 0, UNKNOWN: 0 };
      const voted = votedLeaningCounts[booth.id] || { LOYAL: 0, FAVORABLE: 0, SWING: 0, NEUTRAL: 0, OPPOSITION: 0, UNKNOWN: 0 };
      const totalVoted = Object.values(voted).reduce((a, b) => a + b, 0);
      const turnoutRate = booth.totalVoters > 0 ? totalVoted / booth.totalVoters : 0;

      // Votes already cast — estimate from voted leaning
      const loyalVoted = voted.LOYAL || 0;
      const favorableVoted = voted.FAVORABLE || 0;
      const swingVoted = voted.SWING || 0;
      const neutralVoted = voted.NEUTRAL || 0;
      const oppositionVoted = voted.OPPOSITION || 0;
      const unknownVoted = voted.UNKNOWN || 0;

      // Our votes from already-voted
      const ourVotesCast = loyalVoted + (favorableVoted * 0.8) + (swingVoted * 0.45) + (neutralVoted * 0.3) + (unknownVoted * 0.3);
      const oppVotesCast = oppositionVoted + (swingVoted * 0.55) + (neutralVoted * 0.3) + (unknownVoted * 0.3);

      // Remaining voters by leaning
      const remainLOYAL = (leanings.LOYAL || 0) - loyalVoted;
      const remainFAVORABLE = (leanings.FAVORABLE || 0) - favorableVoted;
      const remainSWING = (leanings.SWING || 0) - swingVoted;
      const remainNEUTRAL = (leanings.NEUTRAL || 0) - neutralVoted;
      const remainOPPOSITION = (leanings.OPPOSITION || 0) - oppositionVoted;
      const remainUNKNOWN = (leanings.UNKNOWN || 0) - unknownVoted;

      // Three scenarios for remaining voter turnout
      const scenarios = {
        optimistic: 0.60,
        base: 0.40,
        pessimistic: 0.25,
      };

      const results: Record<string, { ourVotes: number; oppVotes: number }> = {};
      for (const [scenario, rate] of Object.entries(scenarios)) {
        const projLOYAL = remainLOYAL * rate;
        const projFAV = remainFAVORABLE * rate;
        const projSWING = remainSWING * rate;
        const projNEUTRAL = remainNEUTRAL * rate;
        const projOPP = remainOPPOSITION * rate;
        const projUNK = remainUNKNOWN * rate;

        const ourProjected = projLOYAL + (projFAV * 0.8) + (projSWING * 0.45) + (projNEUTRAL * 0.3) + (projUNK * 0.3);
        const oppProjected = projOPP + (projSWING * 0.55) + (projNEUTRAL * 0.3) + (projUNK * 0.3);

        results[scenario] = {
          ourVotes: Math.round(ourVotesCast + ourProjected),
          oppVotes: Math.round(oppVotesCast + oppProjected),
        };
      }

      totalOurVotesOptimistic += results.optimistic.ourVotes;
      totalOppVotesOptimistic += results.optimistic.oppVotes;
      totalOurVotesBase += results.base.ourVotes;
      totalOppVotesBase += results.base.oppVotes;
      totalOurVotesPessimistic += results.pessimistic.ourVotes;
      totalOppVotesPessimistic += results.pessimistic.oppVotes;

      return {
        boothNumber: booth.boothNumber,
        boothName: booth.boothName,
        totalVoters: booth.totalVoters,
        currentTurnout: Math.round(turnoutRate * 10000) / 100,
        leaningBreakdown: leanings,
        scenarios: results,
        margin: {
          optimistic: results.optimistic.ourVotes - results.optimistic.oppVotes,
          base: results.base.ourVotes - results.base.oppVotes,
          pessimistic: results.pessimistic.ourVotes - results.pessimistic.oppVotes,
        },
      };
    });

    // Identify critical booths (tightest margins in base scenario)
    const criticalBooths = [...boothSimulations]
      .sort((a: any, b: any) => Math.abs(a.margin.base) - Math.abs(b.margin.base))
      .slice(0, 10);

    const scenarioSummary = {
      optimistic: { ourVotes: totalOurVotesOptimistic, oppVotes: totalOppVotesOptimistic, margin: totalOurVotesOptimistic - totalOppVotesOptimistic },
      base: { ourVotes: totalOurVotesBase, oppVotes: totalOppVotesBase, margin: totalOurVotesBase - totalOppVotesBase },
      pessimistic: { ourVotes: totalOurVotesPessimistic, oppVotes: totalOppVotesPessimistic, margin: totalOurVotesPessimistic - totalOppVotesPessimistic },
      criticalBooths: criticalBooths.slice(0, 5).map((b: any) => ({
        boothNumber: b.boothNumber, boothName: b.boothName, baseMargin: b.margin.base,
      })),
    };

    const systemPrompt = `Interpret these election simulation results. Give a concise victory probability assessment, identify the 3 most critical booths that could flip the result, and suggest where to focus resources.

Return valid JSON:
{
  "winProbability": number (0-100),
  "assessment": "concise 2-3 line assessment",
  "criticalBooths": [{"boothNumber": 1, "boothName": "...", "reason": "...", "actionNeeded": "..."}],
  "resourceFocus": ["where to focus 1", "where to focus 2"],
  "interpretation": "detailed interpretation paragraph"
}`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'poll_day_victory_sim',
      creditsPerCall: 3,
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Election simulation results:\n${JSON.stringify(scenarioSummary, null, 2)}` },
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

    const parsed = safeJsonParse(creditResult.output, {
      winProbability: 50,
      assessment: creditResult.output,
      criticalBooths: [],
      resourceFocus: [],
      interpretation: '',
    });

    res.json({
      success: true,
      data: {
        winProbability: parsed.winProbability ?? 50,
        assessment: parsed.assessment || '',
        scenarios: scenarioSummary,
        criticalBooths: parsed.criticalBooths || [],
        resourceFocus: parsed.resourceFocus || [],
        interpretation: parsed.interpretation || '',
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[PollDayAI] victory-simulation error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'Victory simulation failed' } });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:electionId/poll-day/gotv-strategy/:wave (2 credits)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:electionId/poll-day/gotv-strategy/:wave', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId, wave } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    // Get GOTV targets for this wave that haven't voted yet
    const gotvTargets = await (tenantDb as any).gOTVTarget.findMany({
      where: { electionId, wave, status: { not: 'VOTED' } },
      select: { voterId: true, boothId: true, priority: true, familyChainId: true },
    });

    const voterIds = gotvTargets.map((t: any) => t.voterId);

    // Fetch voter details for these targets (favorable voters)
    const voters = await (tenantDb as any).voter.findMany({
      where: {
        id: { in: voterIds },
        electionId,
        politicalLeaning: { in: ['LOYAL', 'FAVORABLE', 'SWING'] },
      },
      select: { id: true, boothId: true, gender: true, age: true, politicalLeaning: true, familyId: true },
    });

    // Summarize by booth
    const boothBreakdown: Record<string, { total: number; byLeaning: Record<string, number>; byGender: Record<string, number>; ageGroups: Record<string, number> }> = {};
    for (const v of voters) {
      if (!boothBreakdown[v.boothId]) {
        boothBreakdown[v.boothId] = { total: 0, byLeaning: {}, byGender: {}, ageGroups: {} };
      }
      const bb = boothBreakdown[v.boothId];
      bb.total++;
      bb.byLeaning[v.politicalLeaning] = (bb.byLeaning[v.politicalLeaning] || 0) + 1;
      bb.byGender[v.gender || 'UNKNOWN'] = (bb.byGender[v.gender || 'UNKNOWN'] || 0) + 1;
      const ageGroup = v.age < 26 ? '18-25' : v.age < 36 ? '26-35' : v.age < 51 ? '36-50' : v.age < 66 ? '51-65' : '66+';
      bb.ageGroups[ageGroup] = (bb.ageGroups[ageGroup] || 0) + 1;
    }

    // Get booth names
    const boothIds = Object.keys(boothBreakdown);
    const boothDetails = await (tenantDb as any).booth.findMany({
      where: { id: { in: boothIds } },
      select: { id: true, boothNumber: true, boothName: true },
    });
    const boothNameMap: Record<string, string> = {};
    for (const b of boothDetails) {
      boothNameMap[b.id] = `Booth ${b.boothNumber} (${b.boothName})`;
    }

    const dataSummary = {
      wave,
      totalRemainingFavorable: voters.length,
      boothBreakdown: Object.entries(boothBreakdown).map(([boothId, data]) => ({
        booth: boothNameMap[boothId] || boothId,
        ...data,
      })),
    };

    const systemPrompt = `Generate a GOTV (Get Out The Vote) strategy for Wave ${wave}. We have ${voters.length} favorable voters who haven't voted. Here's the breakdown by booth. Suggest: 1) Priority order of booths, 2) Messaging approach per demographic segment, 3) Transport logistics, 4) Agent deployment. Be specific and actionable.

Return valid JSON:
{
  "priorityBooths": [{"booth": "name", "reason": "why priority", "votersToTarget": number}],
  "messagingStrategy": {
    "youth": "message approach for 18-35",
    "middleAge": "message approach for 36-50",
    "seniors": "message approach for 51+",
    "female": "specific approach for women voters",
    "general": "default messaging"
  },
  "transportPlan": "logistics plan description",
  "agentDeployment": "how to deploy agents",
  "estimatedImpact": "expected vote gain from this wave"
}`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'poll_day_gotv',
      creditsPerCall: 2,
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.4,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `GOTV Wave ${wave} data:\n${JSON.stringify(dataSummary, null, 2)}` },
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

    const parsed = safeJsonParse(creditResult.output, {
      priorityBooths: [],
      messagingStrategy: {},
      transportPlan: '',
      agentDeployment: '',
      estimatedImpact: '',
    });

    res.json({
      success: true,
      data: {
        wave,
        totalTargets: voters.length,
        priorityBooths: parsed.priorityBooths || [],
        messagingStrategy: parsed.messagingStrategy || {},
        transportPlan: parsed.transportPlan || '',
        agentDeployment: parsed.agentDeployment || '',
        estimatedImpact: parsed.estimatedImpact || '',
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[PollDayAI] gotv-strategy error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'GOTV strategy generation failed' } });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:electionId/poll-day/auto-classify (2 credits)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:electionId/poll-day/auto-classify', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    // Gather per-booth data
    const [booths, voterLeanings, pollDayVotes, existingClassifications] = await Promise.all([
      (tenantDb as any).booth.findMany({
        where: { electionId },
        select: { id: true, boothNumber: true, boothName: true, totalVoters: true, maleVoters: true, femaleVoters: true, vulnerabilityStatus: true },
      }),
      (tenantDb as any).voter.groupBy({
        by: ['boothId', 'politicalLeaning'],
        where: { electionId },
        _count: true,
      }),
      (tenantDb as any).pollDayVote.groupBy({
        by: ['boothId'],
        where: { electionId, hasVoted: true },
        _count: true,
      }),
      (tenantDb as any).boothClassification.findMany({
        where: { electionId },
        select: { boothId: true, id: true },
      }),
    ]);

    // Build leaning data per booth
    const leaningByBooth: Record<string, Record<string, number>> = {};
    for (const vl of voterLeanings) {
      if (!leaningByBooth[vl.boothId]) leaningByBooth[vl.boothId] = {};
      leaningByBooth[vl.boothId][vl.politicalLeaning || 'UNKNOWN'] = vl._count;
    }

    // Build turnout per booth
    const turnoutByBooth: Record<string, number> = {};
    for (const pv of pollDayVotes) {
      turnoutByBooth[pv.boothId] = pv._count;
    }

    // Existing classification IDs for upsert
    const existingClassMap: Record<string, string> = {};
    for (const ec of existingClassifications) {
      existingClassMap[ec.boothId] = ec.id;
    }

    const boothData = booths.map((b: any) => {
      const leanings = leaningByBooth[b.id] || {};
      const voted = turnoutByBooth[b.id] || 0;
      const turnout = b.totalVoters > 0 ? Math.round((voted / b.totalVoters) * 100) : 0;
      return {
        boothId: b.id,
        boothNumber: b.boothNumber,
        boothName: b.boothName,
        totalVoters: b.totalVoters,
        turnout: `${turnout}%`,
        vulnerability: b.vulnerabilityStatus || 'NONE',
        leanings: {
          loyal: leanings['LOYAL'] || 0,
          favorable: leanings['FAVORABLE'] || 0,
          swing: leanings['SWING'] || 0,
          neutral: leanings['NEUTRAL'] || 0,
          opposition: leanings['OPPOSITION'] || 0,
          unknown: leanings['UNKNOWN'] || 0,
        },
      };
    });

    const systemPrompt = `Classify each booth as SAFE/FAVORABLE/BATTLEGROUND/DIFFICULT/HOSTILE based on the data. Assign a risk score 0-100. Consider: political leaning distribution, current turnout, vulnerability status, and voter demographics.

Return valid JSON:
{
  "classifications": [
    {
      "boothId": "id",
      "boothNumber": 1,
      "classification": "SAFE|FAVORABLE|BATTLEGROUND|DIFFICULT|HOSTILE",
      "riskScore": 0-100,
      "reasoning": "brief reason"
    }
  ]
}`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'poll_day_classify',
      creditsPerCall: 2,
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.2,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Booth data for classification:\n${JSON.stringify(boothData, null, 2)}` },
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

    const parsed = safeJsonParse(creditResult.output, { classifications: [] });
    const classifications = Array.isArray(parsed.classifications) ? parsed.classifications : [];

    // Upsert BoothClassification records
    let upsertedCount = 0;
    for (const cls of classifications) {
      if (!cls.boothId) continue;
      try {
        const existingId = existingClassMap[cls.boothId];
        if (existingId) {
          await (tenantDb as any).boothClassification.update({
            where: { id: existingId },
            data: {
              classification: cls.classification || 'BATTLEGROUND',
              riskScore: cls.riskScore ?? 50,
              priority: cls.riskScore >= 70 ? 'HIGH' : cls.riskScore >= 40 ? 'MEDIUM' : 'LOW',
              assessedBy: 'AI',
            },
          });
        } else {
          await (tenantDb as any).boothClassification.create({
            data: {
              electionId,
              boothId: cls.boothId,
              classification: cls.classification || 'BATTLEGROUND',
              riskScore: cls.riskScore ?? 50,
              priority: cls.riskScore >= 70 ? 'HIGH' : cls.riskScore >= 40 ? 'MEDIUM' : 'LOW',
              assessedBy: 'AI',
            },
          });
        }
        upsertedCount++;
      } catch (upsertErr) {
        logger.warn({ err: upsertErr, boothId: cls.boothId }, '[PollDayAI] Failed to upsert booth classification');
      }
    }

    // Compute category counts
    const categoryCounts: Record<string, number> = {};
    for (const cls of classifications) {
      const cat = cls.classification || 'UNKNOWN';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        classifications: classifications.map((c: any) => ({
          boothId: c.boothId,
          boothNumber: c.boothNumber,
          classification: c.classification,
          riskScore: c.riskScore,
          reasoning: c.reasoning,
        })),
        categoryCounts,
        totalClassified: upsertedCount,
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[PollDayAI] auto-classify error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'Auto-classification failed' } });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:electionId/poll-day/anomaly-detect (2 credits)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:electionId/poll-day/anomaly-detect', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    // Gather turnout time-series for all booths
    const [snapshots, booths] = await Promise.all([
      (tenantDb as any).turnoutSnapshot.findMany({
        where: { electionId },
        orderBy: [{ boothId: 'asc' }, { snapshotTime: 'asc' }],
        select: { boothId: true, snapshotTime: true, totalVoters: true, totalVoted: true, percentage: true },
      }),
      (tenantDb as any).booth.findMany({
        where: { electionId },
        select: { id: true, boothNumber: true, boothName: true },
      }),
    ]);

    const boothNameMap: Record<string, string> = {};
    const boothNumberMap: Record<string, number> = {};
    for (const b of booths) {
      boothNameMap[b.id] = b.boothName;
      boothNumberMap[b.id] = b.boothNumber;
    }

    // Group snapshots by booth, summarize as time-series
    const timeSeriesByBooth: Record<string, { time: string; percentage: number; voted: number }[]> = {};
    for (const s of snapshots) {
      if (!timeSeriesByBooth[s.boothId]) timeSeriesByBooth[s.boothId] = [];
      timeSeriesByBooth[s.boothId].push({
        time: new Date(s.snapshotTime).toISOString(),
        percentage: s.percentage ?? 0,
        voted: s.totalVoted ?? 0,
      });
    }

    const dataSummary = Object.entries(timeSeriesByBooth).map(([boothId, series]) => ({
      boothNumber: boothNumberMap[boothId] || 0,
      boothName: boothNameMap[boothId] || boothId,
      dataPoints: series.length,
      series: series.slice(0, 20), // Limit to keep prompt manageable
    }));

    const systemPrompt = `Analyze these turnout time-series from polling booths. Flag any anomalies: sudden spikes (possible fraud or mass mobilization), sudden stalls (possible problems at booth), significantly above/below average patterns. Consider Indian election norms.

Return valid JSON:
{
  "anomalies": [
    {
      "boothNumber": 1,
      "boothName": "...",
      "type": "SPIKE|STALL|ABOVE_AVERAGE|BELOW_AVERAGE|IRREGULAR",
      "severity": "HIGH|MEDIUM|LOW",
      "description": "what was detected",
      "timeWindow": "when it occurred",
      "recommendation": "what to do"
    }
  ],
  "overallPattern": "summary of overall voting pattern",
  "confidence": "HIGH|MEDIUM|LOW"
}`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'poll_day_anomaly',
      creditsPerCall: 2,
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.2,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Turnout time-series data (${dataSummary.length} booths):\n${JSON.stringify(dataSummary, null, 2)}` },
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

    const parsed = safeJsonParse(creditResult.output, {
      anomalies: [],
      overallPattern: '',
      confidence: 'LOW',
    });

    res.json({
      success: true,
      data: {
        anomalies: parsed.anomalies || [],
        overallPattern: parsed.overallPattern || '',
        confidence: parsed.confidence || 'LOW',
        totalBoothsAnalyzed: dataSummary.length,
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[PollDayAI] anomaly-detect error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'Anomaly detection failed' } });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:electionId/poll-day/counter-narrative (2 credits)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:electionId/poll-day/counter-narrative', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';
    const { narrative } = req.body;

    if (!narrative || typeof narrative !== 'string') {
      res.status(400).json({ success: false, error: { message: 'narrative (string) is required in request body' } });
      return;
    }

    // Fetch minimal election context for party positioning
    const election = await (tenantDb as any).election.findUnique({
      where: { id: electionId },
      select: { name: true, constituency: true, state: true, electionType: true, candidateName: true },
    });

    const electionContext = election
      ? `Election: ${election.name}, Constituency: ${election.constituency || 'N/A'}, State: ${election.state || 'N/A'}, Candidate: ${election.candidateName || 'N/A'}`
      : 'Election context not available';

    const systemPrompt = `You are an Indian election communications strategist. An opposition narrative is circulating on poll day. Generate counter-messaging that is factual, dignified, and effective. DO NOT use inflammatory or communal language. Stay factual and positive.

Context: ${electionContext}

The opposition narrative to counter: "${narrative}"

Generate: 1) Factual rebuttal, 2) Positive counter-narrative, 3) Suggested WhatsApp/social media message (under 200 chars). Be factual and avoid inflammatory language.

Return valid JSON:
{
  "rebuttal": "factual rebuttal of the narrative",
  "counterNarrative": "positive counter-narrative to spread",
  "socialMediaMessage": "short message under 200 chars for WhatsApp/social media",
  "talkingPoints": ["point 1", "point 2", "point 3"]
}`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'poll_day_counter_narrative',
      creditsPerCall: 2,
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.5,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Counter this narrative: "${narrative}"` },
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

    const parsed = safeJsonParse(creditResult.output, {
      rebuttal: creditResult.output,
      counterNarrative: '',
      socialMediaMessage: '',
      talkingPoints: [],
    });

    res.json({
      success: true,
      data: {
        rebuttal: parsed.rebuttal || '',
        counterNarrative: parsed.counterNarrative || '',
        socialMediaMessage: parsed.socialMediaMessage || '',
        talkingPoints: parsed.talkingPoints || [],
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[PollDayAI] counter-narrative error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'Counter-narrative generation failed' } });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:electionId/poll-day/panna-optimize (2 credits)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:electionId/poll-day/panna-optimize', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantDb = await getTenantDb(req);
    const { electionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string || 'system';

    // Get voters grouped by booth and family
    const [voters, booths, agents] = await Promise.all([
      (tenantDb as any).voter.findMany({
        where: { electionId },
        select: {
          id: true, boothId: true, name: true, gender: true, age: true,
          politicalLeaning: true, influenceLevel: true, familyId: true,
        },
        orderBy: [{ boothId: 'asc' }, { familyId: 'asc' }],
      }),
      (tenantDb as any).booth.findMany({
        where: { electionId },
        select: { id: true, boothNumber: true, boothName: true, totalVoters: true },
      }),
      (tenantDb as any).boothAgent.findMany({
        where: { electionId, isActive: true },
        select: { id: true, boothId: true, name: true },
      }),
    ]);

    const boothNameMap: Record<string, string> = {};
    for (const b of booths) {
      boothNameMap[b.id] = `Booth ${b.boothNumber} (${b.boothName})`;
    }

    // Summarize voters per booth for the AI (don't send raw dump)
    const boothSummaries: Record<string, any> = {};
    for (const v of voters) {
      if (!boothSummaries[v.boothId]) {
        boothSummaries[v.boothId] = {
          booth: boothNameMap[v.boothId] || v.boothId,
          totalVoters: 0,
          families: new Set<string>(),
          leanings: { LOYAL: 0, FAVORABLE: 0, SWING: 0, NEUTRAL: 0, OPPOSITION: 0, UNKNOWN: 0 },
          influencers: 0,
        };
      }
      const bs = boothSummaries[v.boothId];
      bs.totalVoters++;
      if (v.familyId) bs.families.add(v.familyId);
      const leaning = v.politicalLeaning || 'UNKNOWN';
      bs.leanings[leaning] = (bs.leanings[leaning] || 0) + 1;
      if (v.influenceLevel === 'HIGH') bs.influencers++;
    }

    // Convert Sets to counts for JSON
    const boothData = Object.entries(boothSummaries).map(([boothId, bs]: [string, any]) => ({
      boothId,
      booth: bs.booth,
      totalVoters: bs.totalVoters,
      totalFamilies: bs.families.size,
      leanings: bs.leanings,
      influencers: bs.influencers,
      assignedAgents: agents.filter((a: any) => a.boothId === boothId).length,
    }));

    const systemPrompt = `Optimize panna (voter page) assignments for booth agents in an Indian election. Group voters into clusters of approximately 60 based on: geographic proximity (same booth), family ties, and influence networks. Each cluster should have a mix of loyal voters (anchors) and swing voters (targets).

Given the booth-wise summary data, generate an optimized clustering plan.

Return valid JSON:
{
  "clusters": [
    {
      "clusterId": 1,
      "boothId": "...",
      "boothName": "...",
      "voterCount": 60,
      "composition": {"loyal": 20, "favorable": 15, "swing": 15, "neutral": 10},
      "anchorFamilies": number,
      "strategy": "brief approach for this cluster"
    }
  ],
  "agentAssignments": [
    {
      "boothName": "...",
      "recommendedAgents": number,
      "clustersPerAgent": number,
      "notes": "deployment note"
    }
  ],
  "overallStrategy": "summary of optimization approach"
}`;

    const creditResult = await withCreditCheck({
      tenantDb, tenantId, userId,
      featureKey: 'poll_day_panna',
      creditsPerCall: 2,
      callAI: async () => {
        const completion = await getOpenAI().chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Booth-wise voter data for panna optimization:\n${JSON.stringify(boothData, null, 2)}` },
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

    const parsed = safeJsonParse(creditResult.output, {
      clusters: [],
      agentAssignments: [],
      overallStrategy: '',
    });

    res.json({
      success: true,
      data: {
        clusters: parsed.clusters || [],
        agentAssignments: parsed.agentAssignments || [],
        overallStrategy: parsed.overallStrategy || '',
        totalVoters: voters.length,
        totalBooths: booths.length,
        totalActiveAgents: agents.length,
        creditsUsed: creditResult.creditsUsed,
        creditsRemaining: creditResult.creditsRemaining,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[PollDayAI] panna-optimize error');
    if (error.statusCode === 403) {
      res.status(403).json({ success: false, error: { message: error.message } });
      return;
    }
    res.status(500).json({ success: false, error: { message: error.message || 'Panna optimization failed' } });
  }
});

export { router as pollDayAiRoutes };
