import { Router } from 'express';
import * as ctrl from '../controllers/courier.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/defaults', ctrl.getDefaultCouriers); // Public for frontend
router.use(authenticate);
router.get('/',         ctrl.getCouriers);
router.post('/',        authorize('SUPER_ADMIN','ADMIN'), ctrl.createCourier);
router.put('/:id',      authorize('SUPER_ADMIN','ADMIN'), ctrl.updateCourier);
router.delete('/:id',   authorize('SUPER_ADMIN','ADMIN'), ctrl.deleteCourier);

export default router;
