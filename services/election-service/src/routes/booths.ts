import { Router } from 'express';
import { BoothController } from '../controllers/booths.js';

const router = Router();
const boothController = new BoothController();

router.get('/', boothController.getBooths);
router.get('/:id', boothController.getBoothById);
router.post('/', boothController.createBooth);
router.put('/:id', boothController.updateBooth);
router.delete('/:id', boothController.deleteBooth);

export { router as boothRoutes };
