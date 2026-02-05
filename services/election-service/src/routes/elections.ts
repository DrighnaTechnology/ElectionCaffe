import { Router } from 'express';
import { ElectionController } from '../controllers/elections.js';

const router = Router();
const electionController = new ElectionController();

// Election CRUD
router.get('/', electionController.getElections);
router.get('/:id', electionController.getElectionById);
router.post('/', electionController.createElection);
router.put('/:id', electionController.updateElection);
router.delete('/:id', electionController.deleteElection);

// Election actions
router.post('/:id/lock', electionController.lockElection);
router.post('/:id/unlock', electionController.unlockElection);
router.post('/:id/duplicate', electionController.duplicateElection);
router.get('/:id/stats', electionController.getElectionStats);

export { router as electionRoutes };
