import { Router, type Router as RouterType } from 'express';
import { deviceController } from './device.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router: RouterType = Router();

router.use(authenticate);

router.get('/', deviceController.list);
router.post('/', deviceController.register);
router.delete('/:id', deviceController.unbind);
router.patch('/:id/heartbeat', deviceController.heartbeat);

export default router;
