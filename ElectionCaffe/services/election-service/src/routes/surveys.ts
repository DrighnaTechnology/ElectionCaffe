import { Router } from 'express';
import { SurveyController } from '../controllers/surveys.js';

const router = Router();
const surveyController = new SurveyController();

// Survey CRUD
router.get('/', surveyController.getSurveys);
router.get('/:id', surveyController.getSurveyById);
router.post('/', surveyController.createSurvey);
router.put('/:id', surveyController.updateSurvey);
router.delete('/:id', surveyController.deleteSurvey);

// Survey responses
router.get('/:id/responses', surveyController.getSurveyResponses);
router.post('/:id/responses', surveyController.submitSurveyResponse);

export { router as surveyRoutes };
