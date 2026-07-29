import { Router } from 'express';
import * as ctrl from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
// Same role set report.routes.ts already uses for financial/report data.
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'));

router.get('/dashboard',            ctrl.getBusinessDashboard);
router.get('/sales',                ctrl.getSalesAnalytics);
router.get('/financial',            ctrl.getFinancialDashboard);
router.get('/products',             ctrl.getProductPerformance);
router.get('/categories',           ctrl.getCategoryAnalytics);
router.get('/customers',            ctrl.getCustomerAnalytics);
router.get('/delivery',             ctrl.getDeliveryAnalytics);
router.get('/inventory',            ctrl.getInventoryReports);

export default router;
