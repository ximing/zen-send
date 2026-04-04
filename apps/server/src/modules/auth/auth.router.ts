import { Router, type Router as RouterType } from 'express';
import { authController } from './auth.controller.js';

const router: RouterType = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

export default router;
