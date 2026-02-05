import { Router } from 'express';
import { CandidateController } from '../controllers/candidates.js';

const router = Router();
const candidateController = new CandidateController();

// Candidate CRUD
router.get('/', candidateController.getCandidates);
router.get('/:id', candidateController.getCandidateById);
router.post('/', candidateController.createCandidate);
router.put('/:id', candidateController.updateCandidate);
router.delete('/:id', candidateController.deleteCandidate);

// Candidate stats
router.get('/:id/stats', candidateController.getCandidateStats);

// Documents
router.get('/:id/documents', candidateController.getCandidateDocuments);
router.post('/:id/documents', candidateController.addCandidateDocument);
router.delete('/:id/documents/:docId', candidateController.deleteCandidateDocument);

// Social Media
router.get('/:id/social-media', candidateController.getCandidateSocialMedia);
router.post('/:id/social-media', candidateController.addCandidateSocialMedia);
router.put('/:id/social-media/:smId', candidateController.updateCandidateSocialMedia);
router.delete('/:id/social-media/:smId', candidateController.deleteCandidateSocialMedia);

// Battle Cards
router.get('/:id/battle-cards', candidateController.getCandidateBattleCards);
router.post('/:id/battle-cards', candidateController.createBattleCard);
router.put('/:id/battle-cards/:bcId', candidateController.updateBattleCard);
router.delete('/:id/battle-cards/:bcId', candidateController.deleteBattleCard);

export { router as candidateRoutes };
