import { Router } from 'express';
import * as ctrl from '../controllers/supplier.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'));

router.get('/',      ctrl.getSuppliers);
router.get('/:id',   ctrl.getSupplier);
router.post('/',     authorize('SUPER_ADMIN', 'ADMIN'), ctrl.createSupplier);
router.put('/:id',   authorize('SUPER_ADMIN', 'ADMIN'), ctrl.updateSupplier);
router.delete('/:id',authorize('SUPER_ADMIN', 'ADMIN'), ctrl.deleteSupplier);

export default router;
