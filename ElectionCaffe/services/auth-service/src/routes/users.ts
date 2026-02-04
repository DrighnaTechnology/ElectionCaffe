import { Router } from 'express';
import { UserController } from '../controllers/users.js';

const router = Router();
const userController = new UserController();

// User management routes (protected)
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.put('/:id/status', userController.updateUserStatus);
router.put('/:id/role', userController.updateUserRole);

export { router as userRoutes };
