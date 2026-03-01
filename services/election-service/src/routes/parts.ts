import { Router } from 'express';
import { PartController } from '../controllers/parts.js';

const router = Router();
const partController = new PartController();

// Static routes first (before /:id catches them)
router.get('/', partController.getParts);
router.get('/map', partController.getPartsForMap);
router.get('/template/download', partController.downloadTemplate);
router.post('/', partController.createPart);
router.post('/bulk', partController.bulkCreateParts);

// Parameterized routes
router.get('/:id', partController.getPartById);
router.put('/:id', partController.updatePart);
router.delete('/:id', partController.deletePart);

// Vulnerability management
router.get('/:id/vulnerability', partController.getVulnerability);
router.put('/:id/vulnerability', partController.updateVulnerability);

// Booth Committee management
router.get('/:id/committee', partController.getCommittee);
router.post('/:id/committee', partController.addCommitteeMember);
router.delete('/:id/committee/:memberId', partController.removeCommitteeMember);

// BLA-2 (Booth Level Agent) management
router.get('/:id/bla2', partController.getBla2);
router.post('/:id/bla2', partController.assignBla2);
router.put('/:id/bla2', partController.updateBla2);
router.delete('/:id/bla2', partController.removeBla2);

export { router as partRoutes };
