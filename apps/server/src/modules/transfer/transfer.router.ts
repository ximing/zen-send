import { Router, type Router as RouterType } from 'express';
import { transferController } from './transfer.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router: RouterType = Router();

router.use(authenticate);

router.post('/init', transferController.init);
router.post('/:id/chunks', transferController.uploadChunk);
router.post('/:id/complete', transferController.complete);
router.get('/', transferController.list);
router.get('/:id', transferController.get);
router.get('/:id/download', transferController.getDownloadUrl);
router.delete('/:id', transferController.deleteTransfer);

export default router;
