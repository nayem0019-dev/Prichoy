import { Router } from 'express';
import * as ctrl from '../controllers/report.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT'));

router.get('/sales-summary',        ctrl.getSalesSummary);
router.get('/orders-by-status',     ctrl.getOrdersByStatus);
router.get('/product-performance',  ctrl.getProductPerformance);
router.get('/courier-performance',  ctrl.getCourierPerformance);
router.get('/monthly-revenue',      ctrl.getMonthlyRevenue);
router.get('/inventory',            ctrl.getInventoryReport);
router.get('/expenses',             ctrl.getExpenseReport);

export default router;
