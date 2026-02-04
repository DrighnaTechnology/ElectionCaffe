import { Router } from 'express';
import { PartController } from '../controllers/parts.js';

const router = Router();
const partController = new PartController();

// Part CRUD
router.get('/', partController.getParts);
router.get('/map', partController.getPartsForMap);
router.get('/:id', partController.getPartById);
router.post('/', partController.createPart);
router.post('/bulk', partController.bulkCreateParts);
router.put('/:id', partController.updatePart);
router.delete('/:id', partController.deletePart);

// Vulnerability management
router.get('/:id/vulnerability', partController.getVulnerability);
router.put('/:id/vulnerability', partController.updateVulnerability);

// Template download
router.get('/template/download', partController.downloadTemplate);

export { router as partRoutes };
