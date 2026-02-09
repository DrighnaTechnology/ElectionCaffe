import { Request, Response } from 'express';
import { getTenantDb } from '../utils/tenantDb.js';
import {
  successResponse,
  errorResponse,
  paginationSchema,
  createPaginationMeta,
  calculateSkip,
  createLogger,
} from '@electioncaffe/shared';

const logger = createLogger('election-service');

export class SurveyController {
  async getSurveys(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const validation = paginationSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const { page, limit, search, sort, order } = validation.data;
      const skip = calculateSkip(page, limit);

      const where: any = {};

      // Filter by electionId if provided
      if (req.query.electionId) {
        where.electionId = req.query.electionId;
      }

      // Filter by isActive if provided
      if (req.query.isActive !== undefined) {
        where.isActive = req.query.isActive === 'true';
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [surveys, total] = await Promise.all([
        (tenantDb as any).survey.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                responses: true,
              },
            },
          },
        }),
        (tenantDb as any).survey.count({ where }),
      ]);

      // Transform data to match frontend expectations (title -> surveyName)
      const transformedSurveys = surveys.map((survey: any) => ({
        ...survey,
        surveyName: survey.title,
      }));

      res.json(successResponse(transformedSurveys, createPaginationMeta(total, page, limit)));
    } catch (error) {
      logger.error({ err: error }, 'Get surveys error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getSurveyById(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const survey = await (tenantDb as any).survey.findUnique({
        where: { id },
        include: {
          responses: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              responses: true,
            },
          },
        },
      });

      if (!survey) {
        res.status(404).json(errorResponse('E4004', 'Survey not found'));
        return;
      }

      // Transform data to match frontend expectations
      const transformedSurvey = {
        ...survey,
        surveyName: survey.title,
      };

      res.json(successResponse(transformedSurvey));
    } catch (error) {
      logger.error({ err: error }, 'Get survey by ID error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async createSurvey(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { surveyName, description, questions, startDate, endDate, targetAudience } = req.body;
      const electionId = req.query.electionId as string;

      if (!electionId) {
        res.status(400).json(errorResponse('E2001', 'Election ID is required'));
        return;
      }

      if (!surveyName) {
        res.status(400).json(errorResponse('E2001', 'Survey name is required'));
        return;
      }

      const survey = await (tenantDb as any).survey.create({
        data: {
          electionId,
          title: surveyName,
          description: description || null,
          questions: questions || [],
          targetAudience: targetAudience || {},
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          isActive: true,
        },
        include: {
          _count: {
            select: {
              responses: true,
            },
          },
        },
      });

      // Transform data to match frontend expectations
      const transformedSurvey = {
        ...survey,
        surveyName: survey.title,
      };

      res.status(201).json(successResponse(transformedSurvey));
    } catch (error) {
      logger.error({ err: error }, 'Create survey error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async updateSurvey(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const { surveyName, description, questions, isActive, startDate, endDate, targetAudience } = req.body;

      const existingSurvey = await (tenantDb as any).survey.findUnique({
        where: { id },
      });

      if (!existingSurvey) {
        res.status(404).json(errorResponse('E4004', 'Survey not found'));
        return;
      }

      const updateData: any = {};
      if (surveyName !== undefined) updateData.title = surveyName;
      if (description !== undefined) updateData.description = description;
      if (questions !== undefined) updateData.questions = questions;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (targetAudience !== undefined) updateData.targetAudience = targetAudience;

      const survey = await (tenantDb as any).survey.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              responses: true,
            },
          },
        },
      });

      // Transform data to match frontend expectations
      const transformedSurvey = {
        ...survey,
        surveyName: survey.title,
      };

      res.json(successResponse(transformedSurvey));
    } catch (error) {
      logger.error({ err: error }, 'Update survey error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async deleteSurvey(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;

      const existingSurvey = await (tenantDb as any).survey.findUnique({
        where: { id },
      });

      if (!existingSurvey) {
        res.status(404).json(errorResponse('E4004', 'Survey not found'));
        return;
      }

      // Delete associated responses first
      await (tenantDb as any).surveyResponse.deleteMany({
        where: { surveyId: id },
      });

      await (tenantDb as any).survey.delete({
        where: { id },
      });

      res.json(successResponse({ message: 'Survey deleted successfully' }));
    } catch (error) {
      logger.error({ err: error }, 'Delete survey error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async getSurveyResponses(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const validation = paginationSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json(errorResponse('E2001', 'Validation error', validation.error.errors));
        return;
      }

      const { page, limit } = validation.data;
      const skip = calculateSkip(page, limit);

      const [responses, total] = await Promise.all([
        (tenantDb as any).surveyResponse.findMany({
          where: { surveyId: id },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        (tenantDb as any).surveyResponse.count({ where: { surveyId: id } }),
      ]);

      res.json(successResponse(responses, createPaginationMeta(total, page, limit)));
    } catch (error) {
      logger.error({ err: error }, 'Get survey responses error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }

  async submitSurveyResponse(req: Request, res: Response): Promise<void> {
    try {
      const tenantDb = await getTenantDb(req);
      const { id } = req.params;
      const { answers, respondentId, respondentInfo } = req.body;

      const survey = await (tenantDb as any).survey.findUnique({
        where: { id },
      });

      if (!survey) {
        res.status(404).json(errorResponse('E4004', 'Survey not found'));
        return;
      }

      if (!survey.isActive) {
        res.status(400).json(errorResponse('E2001', 'Survey is not active'));
        return;
      }

      const response = await (tenantDb as any).surveyResponse.create({
        data: {
          surveyId: id,
          answers: answers || {},
          respondentId: respondentId || null,
          respondentInfo: respondentInfo || {},
        },
      });

      // Update total responses count
      await (tenantDb as any).survey.update({
        where: { id },
        data: {
          totalResponses: { increment: 1 },
        },
      });

      res.status(201).json(successResponse(response));
    } catch (error) {
      logger.error({ err: error }, 'Submit survey response error');
      res.status(500).json(errorResponse('E5001', 'Internal server error'));
    }
  }
}
