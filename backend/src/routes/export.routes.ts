import { Router } from 'express';
import * as ctrl from '../controllers/export.controller';
import * as importCtrl from '../controllers/import.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadCsv } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/orders',                authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','ACCOUNTANT'), ctrl.exportOrders);
router.get('/products',              authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER','ACCOUNTANT'), ctrl.exportProducts);
router.get('/customers',             authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT'), ctrl.exportCustomers);
router.get('/inventory',             authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER','ACCOUNTANT'), ctrl.exportInventory);
router.get('/invoice/:id',           ctrl.downloadInvoice);
// Phase 4 §19
router.get('/sales-report',          authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT'), ctrl.exportSalesReport);
router.get('/expenses',              authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT'), ctrl.exportExpenses);
router.get('/returns',               authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT'), ctrl.exportReturns);
router.get('/exchanges',             authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT'), ctrl.exportExchanges);

// Phase 3 §19 — Bulk Import
router.post('/import/products',      authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                     uploadCsv, importCtrl.importProducts);

export default router;
