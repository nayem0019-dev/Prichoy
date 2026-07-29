import { Router } from 'express';
import * as ctrl from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/warehouses',         ctrl.getWarehouses);
router.post('/warehouses',        authorize('SUPER_ADMIN','ADMIN'), ctrl.createWarehouse);
router.get('/dashboard',          ctrl.getInventoryDashboard);
router.get('/low-stock-alerts',   ctrl.getLowStockAlerts);
router.get('/',                   ctrl.getInventory);
router.get('/:id/movements',      ctrl.getMovements);
router.post('/adjust',            authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                  auditLog('ADJUST_STOCK','inventory'), ctrl.adjustStock);
router.post('/transfer',          authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                  auditLog('TRANSFER_STOCK','inventory'), ctrl.transferStock);

export default router;
