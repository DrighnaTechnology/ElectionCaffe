import { Router, Request, Response } from 'express';
import { prisma } from '@electioncaffe/database';
import { successResponse, errorResponse, calculatePercentage, createLogger } from '@electioncaffe/shared';

const logger = createLogger('ai-analytics-service');

const router = Router();

// Get all AI analytics for an election
router.get('/:electionId', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;

    const analyses = await prisma.aIAnalyticsResult.findMany({
      where: { electionId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(successResponse(analyses));
  } catch (error) {
    logger.error({ err: error }, 'Get AI analytics error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get specific analysis
router.get('/:electionId/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const analysis = await prisma.aIAnalyticsResult.findUnique({
      where: { id },
    });

    if (!analysis) {
      res.status(404).json(errorResponse('E3001', 'Analysis not found'));
      return;
    }

    res.json(successResponse(analysis));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Create new AI analysis
router.post('/:electionId', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const { analysisType, analysisName, description, parameters } = req.body;

    // Create pending analysis
    const analysis = await prisma.aIAnalyticsResult.create({
      data: {
        electionId,
        analysisType,
        analysisName,
        description,
        parameters: parameters || {},
        status: 'PENDING',
      } as any,
    });

    // Process the analysis asynchronously
    processAnalysis(analysis.id, electionId!, analysisType, parameters);

    res.status(201).json(successResponse(analysis));
  } catch (error) {
    logger.error({ err: error }, 'Create AI analysis error');
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get turnout prediction
router.get('/:electionId/predict/turnout', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const prediction = await generateTurnoutPrediction(electionId!);
    res.json(successResponse(prediction));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get swing voter analysis
router.get('/:electionId/analyze/swing-voters', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const analysis = await analyzeSwingVoters(electionId!);
    res.json(successResponse(analysis));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get booth risk assessment
router.get('/:electionId/assess/booth-risk', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const assessment = await assessBoothRisk(electionId!);
    res.json(successResponse(assessment));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Get demographic insights
router.get('/:electionId/insights/demographic', async (req: Request, res: Response) => {
  try {
    const { electionId } = req.params;
    const insights = await getDemographicInsights(electionId!);
    res.json(successResponse(insights));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Delete analysis
router.delete('/:electionId/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.aIAnalyticsResult.delete({ where: { id } });
    res.json(successResponse({ message: 'Analysis deleted' }));
  } catch (error) {
    res.status(500).json(errorResponse('E5001', 'Internal server error'));
  }
});

// Calculate confidence based on data completeness
async function calculateConfidence(electionId: string): Promise<number> {
  const [total, withMobile, withAge, withReligion, withCaste, historicalCount] = await Promise.all([
    prisma.voter.count({ where: { electionId, deletedAt: null } }),
    prisma.voter.count({ where: { electionId, deletedAt: null, mobile: { not: null } } }),
    prisma.voter.count({ where: { electionId, deletedAt: null, age: { not: null } } }),
    prisma.voter.count({ where: { electionId, deletedAt: null, religionId: { not: null } } }),
    prisma.voter.count({ where: { electionId, deletedAt: null, casteId: { not: null } } }),
    prisma.votingHistory.count({ where: { electionId } }),
  ]);

  if (total === 0) return 0.1;

  const mobileRate = withMobile / total;
  const ageRate = withAge / total;
  const religionRate = withReligion / total;
  const casteRate = withCaste / total;
  const hasHistory = historicalCount > 0 ? 0.15 : 0;

  // Weighted average of data completeness factors (max ~0.95)
  const confidence = Math.min(0.95,
    0.10 + // base
    mobileRate * 0.15 +
    ageRate * 0.25 +
    religionRate * 0.15 +
    casteRate * 0.15 +
    hasHistory
  );

  return Math.round(confidence * 100) / 100;
}

// AI Processing Functions
async function processAnalysis(analysisId: string, electionId: string, analysisType: string, _parameters: any) {
  try {
    await prisma.aIAnalyticsResult.update({
      where: { id: analysisId },
      data: { status: 'PROCESSING' },
    });

    let results: any = {};
    let insights: any[] = [];
    let confidence = await calculateConfidence(electionId);

    switch (analysisType) {
      case 'TURNOUT_PREDICTION':
        const turnout = await generateTurnoutPrediction(electionId);
        results = turnout;
        insights = turnout.insights;
        confidence = turnout.confidence;
        break;

      case 'SWING_VOTER_ANALYSIS':
        const swing = await analyzeSwingVoters(electionId);
        results = swing;
        insights = swing.insights;
        break;

      case 'BOOTH_RISK_ASSESSMENT':
        const risk = await assessBoothRisk(electionId);
        results = risk;
        insights = risk.insights;
        break;

      case 'DEMOGRAPHIC_INSIGHTS':
        const demo = await getDemographicInsights(electionId);
        results = demo;
        insights = demo.insights;
        break;

      default:
        results = { message: 'Analysis type not supported' };
    }

    await prisma.aIAnalyticsResult.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        results,
        insights,
        confidence,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Process analysis error');
    await prisma.aIAnalyticsResult.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message,
      },
    });
  }
}

async function generateTurnoutPrediction(electionId: string) {
  const [totalVoters, votersByGender, votersByAge, historicalData] = await Promise.all([
    prisma.voter.count({ where: { electionId, deletedAt: null } }),
    prisma.voter.groupBy({
      by: ['gender'],
      where: { electionId, deletedAt: null },
      _count: true,
    }),
    prisma.voter.findMany({
      where: { electionId, deletedAt: null, age: { not: null } },
      select: { age: true },
    }),
    prisma.votingHistory.findMany({ where: { electionId } }),
  ]);

  // Calculate age-based turnout factors
  const ageDistribution = {
    young: votersByAge.filter(v => v.age! < 35).length,
    middle: votersByAge.filter(v => v.age! >= 35 && v.age! < 55).length,
    senior: votersByAge.filter(v => v.age! >= 55).length,
  };

  // Calculate base turnout from historical data if available
  const baseTurnout = historicalData.length > 0
    ? Math.min(85, Math.max(50, (historicalData.filter((h: any) => h.hasVoted).length / Math.max(historicalData.length, 1)) * 100))
    : 60;

  const ageAdjustment = totalVoters > 0 ? (ageDistribution.senior / totalVoters) * 10 : 0;
  const genderBalance = votersByGender.length > 1 ? 2 : 0;

  const predictedTurnout = Math.min(85, baseTurnout + ageAdjustment + genderBalance);
  const predictedVotes = Math.round((predictedTurnout / 100) * totalVoters);

  const confidence = await calculateConfidence(electionId);

  return {
    totalVoters,
    predictedTurnout: Math.round(predictedTurnout * 10) / 10,
    predictedVotes,
    confidence,
    factors: [
      { name: 'Age Distribution', impact: 'positive', weight: ageAdjustment },
      { name: 'Gender Balance', impact: genderBalance > 0 ? 'positive' : 'neutral', weight: genderBalance },
    ],
    hourlyPrediction: [
      { hour: '07:00', percentage: 5 },
      { hour: '09:00', percentage: 20 },
      { hour: '11:00', percentage: 40 },
      { hour: '13:00', percentage: 55 },
      { hour: '15:00', percentage: 70 },
      { hour: '17:00', percentage: predictedTurnout },
    ],
    insights: [
      {
        title: 'Expected High Turnout',
        description: `Based on demographic analysis, we predict ${predictedTurnout.toFixed(1)}% voter turnout`,
        severity: 'info',
        actionable: true,
        recommendation: 'Ensure adequate booth staff during peak hours (10 AM - 2 PM)',
      },
      {
        title: 'Senior Voter Participation',
        description: `${calculatePercentage(ageDistribution.senior, totalVoters)}% of voters are 55+ years, historically high turnout segment`,
        severity: 'info',
        actionable: true,
        recommendation: 'Arrange transportation for senior voters',
      },
    ],
  };
}

async function analyzeSwingVoters(electionId: string) {
  const [swingVoters, totalVoters, swingByPart] = await Promise.all([
    prisma.voter.count({ where: { electionId, deletedAt: null, politicalLeaning: 'SWING' } }),
    prisma.voter.count({ where: { electionId, deletedAt: null } }),
    prisma.voter.groupBy({
      by: ['partId'],
      where: { electionId, deletedAt: null, politicalLeaning: 'SWING' },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const partDetails = await prisma.part.findMany({
    where: { id: { in: swingByPart.map(p => p.partId) } },
    select: { id: true, partNumber: true, boothName: true, totalVoters: true },
  });

  const hotspots = swingByPart.map(p => {
    const part = partDetails.find(pd => pd.id === p.partId);
    return {
      partId: p.partId,
      partNumber: part?.partNumber,
      boothName: part?.boothName,
      swingCount: p._count,
      percentage: calculatePercentage(p._count, part?.totalVoters || 1),
    };
  });

  return {
    totalSwingVoters: swingVoters,
    percentage: calculatePercentage(swingVoters, totalVoters),
    hotspots,
    recommendations: [
      'Focus campaign resources on high swing voter concentration areas',
      'Deploy experienced cadres to swing voter booths',
      'Prioritize direct voter contact in identified hotspots',
    ],
    insights: [
      {
        title: 'Swing Voter Concentration',
        description: `${calculatePercentage(swingVoters, totalVoters)}% of voters are classified as swing voters`,
        severity: swingVoters > totalVoters * 0.2 ? 'warning' : 'info',
        actionable: true,
        recommendation: 'Intensify ground-level campaigning in swing voter areas',
      },
    ],
  };
}

async function assessBoothRisk(electionId: string) {
  const [vulnerableBooths, allBooths, boothStats] = await Promise.all([
    prisma.part.findMany({
      where: { electionId, isVulnerable: true },
      select: {
        id: true,
        partNumber: true,
        boothName: true,
        vulnerability: true,
        vulnerabilityNotes: true,
        totalVoters: true,
      },
    }),
    prisma.part.count({ where: { electionId } }),
    prisma.part.groupBy({
      by: ['vulnerability'],
      where: { electionId },
      _count: true,
    }),
  ]);

  const riskScore = (vulnerableBooths.length / allBooths) * 100;

  return {
    totalBooths: allBooths,
    vulnerableBooths: vulnerableBooths.length,
    riskScore: Math.round(riskScore * 10) / 10,
    byCategory: boothStats.map(s => ({
      category: s.vulnerability,
      count: s._count,
    })),
    criticalBooths: vulnerableBooths.filter(b => b.vulnerability === 'CRITICAL'),
    recommendations: [
      'Deploy additional security at critical booths',
      'Ensure mobile connectivity for real-time reporting',
      'Pre-position response teams near vulnerable areas',
    ],
    insights: [
      {
        title: 'Booth Risk Assessment',
        description: `${vulnerableBooths.length} out of ${allBooths} booths are marked as vulnerable`,
        severity: riskScore > 20 ? 'critical' : riskScore > 10 ? 'warning' : 'info',
        actionable: true,
        recommendation: 'Review and update security arrangements for vulnerable booths',
      },
    ],
  };
}

async function getDemographicInsights(electionId: string) {
  const [religionStats, casteStats, ageStats, genderRatio] = await Promise.all([
    prisma.voter.groupBy({
      by: ['religionId'],
      where: { electionId, deletedAt: null },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.voter.groupBy({
      by: ['casteCategoryId'],
      where: { electionId, deletedAt: null },
      _count: true,
    }),
    prisma.voter.findMany({
      where: { electionId, deletedAt: null, age: { not: null } },
      select: { age: true },
    }),
    prisma.voter.groupBy({
      by: ['gender'],
      where: { electionId, deletedAt: null },
      _count: true,
    }),
  ]);

  const avgAge = ageStats.length > 0
    ? ageStats.reduce((sum, v) => sum + v.age!, 0) / ageStats.length
    : 0;

  const religions = await prisma.religion.findMany({
    where: { id: { in: religionStats.map(r => r.religionId).filter(Boolean) as string[] } },
  });

  const casteCategories = await prisma.casteCategory.findMany({
    where: { id: { in: casteStats.map(c => c.casteCategoryId).filter(Boolean) as string[] } },
  });

  const total = genderRatio.reduce((sum, g) => sum + g._count, 0);

  return {
    averageAge: Math.round(avgAge),
    religionBreakdown: religionStats.map(r => ({
      religion: religions.find(rel => rel.id === r.religionId)?.religionName || 'Unknown',
      count: r._count,
      percentage: calculatePercentage(r._count, total),
    })),
    casteBreakdown: casteStats.map(c => ({
      category: casteCategories.find(cat => cat.id === c.casteCategoryId)?.categoryName || 'Unknown',
      count: c._count,
      percentage: calculatePercentage(c._count, total),
    })),
    genderRatio: genderRatio.map(g => ({
      gender: g.gender,
      count: g._count,
      percentage: calculatePercentage(g._count, total),
    })),
    insights: [
      {
        title: 'Age Demographics',
        description: `Average voter age is ${Math.round(avgAge)} years`,
        severity: 'info',
        actionable: false,
      },
      {
        title: 'Diversity Index',
        description: `Constituency has ${religions.length} major religious groups and ${casteCategories.length} caste categories`,
        severity: 'info',
        actionable: true,
        recommendation: 'Ensure inclusive campaign messaging for diverse demographics',
      },
    ],
  };
}

export { router as aiAnalyticsRoutes };
