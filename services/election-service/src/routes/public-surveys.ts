import { Router, Request, Response } from 'express';
import { coreDb, getTenantClientBySlug } from '@electioncaffe/database';
import { createLogger } from '@electioncaffe/shared';

const router = Router();
const logger = createLogger('election-service');

/**
 * Resolve tenant DB from slug (no auth required)
 */
async function getTenantDbBySlug(slug: string) {
  const tenant = await coreDb.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      databaseHost: true,
      databaseName: true,
      databaseUser: true,
      databasePassword: true,
      databasePort: true,
      databaseSSL: true,
      databaseConnectionUrl: true,
    },
  });

  if (!tenant) return null;

  return getTenantClientBySlug(
    tenant.slug,
    {
      databaseHost: tenant.databaseHost,
      databaseName: tenant.databaseName,
      databaseUser: tenant.databaseUser,
      databasePassword: tenant.databasePassword,
      databasePort: tenant.databasePort,
      databaseSSL: tenant.databaseSSL,
      databaseConnectionUrl: tenant.databaseConnectionUrl,
    },
    tenant.id
  );
}

/**
 * GET /api/public/surveys/:tenantSlug/:surveyId
 * Public endpoint — returns survey questions (no responses, no auth)
 */
router.get('/:tenantSlug/:surveyId', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.params.tenantSlug as string;
    const surveyId = req.params.surveyId as string;

    const tenantDb = await getTenantDbBySlug(tenantSlug);
    if (!tenantDb) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const db = tenantDb as any;
    const survey = await db.survey.findUnique({
      where: { id: surveyId },
      select: {
        id: true,
        title: true,
        titleLocal: true,
        description: true,
        questions: true,
        isActive: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    if (!survey.isActive) {
      return res.status(400).json({ success: false, error: 'This survey is no longer accepting responses' });
    }

    // Check date range
    const now = new Date();
    if (survey.endDate && new Date(survey.endDate) < now) {
      return res.status(400).json({ success: false, error: 'This survey has ended' });
    }

    return res.json({
      success: true,
      data: {
        id: survey.id,
        title: survey.title,
        titleLocal: survey.titleLocal,
        description: survey.description,
        questions: survey.questions,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Public survey fetch error');
    return res.status(500).json({ success: false, error: 'Failed to load survey' });
  }
});

/**
 * POST /api/public/surveys/:tenantSlug/:surveyId/respond
 * Public endpoint — submit a survey response (no auth)
 */
router.post('/:tenantSlug/:surveyId/respond', async (req: Request, res: Response) => {
  try {
    const tenantSlug = req.params.tenantSlug as string;
    const surveyId = req.params.surveyId as string;
    const { answers, respondentInfo } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, error: 'answers object is required' });
    }

    const tenantDb = await getTenantDbBySlug(tenantSlug);
    if (!tenantDb) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const db = tenantDb as any;
    const survey = await db.survey.findUnique({
      where: { id: surveyId },
      select: { id: true, isActive: true, endDate: true },
    });

    if (!survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    if (!survey.isActive) {
      return res.status(400).json({ success: false, error: 'This survey is no longer accepting responses' });
    }

    const now = new Date();
    if (survey.endDate && new Date(survey.endDate) < now) {
      return res.status(400).json({ success: false, error: 'This survey has ended' });
    }

    // Create the response
    await db.surveyResponse.create({
      data: {
        surveyId,
        answers,
        respondentInfo: respondentInfo || {},
      },
    });

    // Increment total responses
    await db.survey.update({
      where: { id: surveyId },
      data: { totalResponses: { increment: 1 } },
    });

    return res.json({ success: true, data: { message: 'Response submitted successfully' } });
  } catch (err) {
    logger.error({ err }, 'Public survey response error');
    return res.status(500).json({ success: false, error: 'Failed to submit response' });
  }
});

export { router as publicSurveyRoutes };
