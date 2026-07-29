import { Router } from 'express';
import * as ctrl from '../controllers/coupon.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/',        ctrl.getCoupons);
router.post('/',       authorize('SUPER_ADMIN','ADMIN'), auditLog('CREATE_COUPON','coupons'), ctrl.createCoupon);
router.put('/:id',     authorize('SUPER_ADMIN','ADMIN'), auditLog('UPDATE_COUPON','coupons'), ctrl.updateCoupon);
router.delete('/:id',  authorize('SUPER_ADMIN','ADMIN'), auditLog('DELETE_COUPON','coupons'), ctrl.deleteCoupon);

export default router;
