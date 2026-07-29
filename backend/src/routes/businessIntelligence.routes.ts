import { Router } from 'express';
import * as ctrl from '../controllers/businessIntelligence.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ── Public: web analytics beacon (no auth — lightweight, no PII) ─
router.post('/analytics/track', ctrl.trackEvent);

// ── All admin routes require authentication ───────────────────────
router.use(authenticate);

// Executive / KPI (Modules 1 + 5)
router.get('/executive/kpi',              authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT','OWNER'), ctrl.getExecutiveKPI);
router.get('/executive/trend',            authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT','OWNER'), ctrl.getPerformanceTrend);
router.get('/executive/launch-readiness', authorize('SUPER_ADMIN','ADMIN','OWNER'), ctrl.getLaunchReadiness);
router.get('/executive/today',            authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','OWNER'), ctrl.getTodaysBusiness);

// Location Intelligence (Module 8)
router.get('/location/district',          authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT','OWNER'), ctrl.getLocationByDistrict);
router.get('/location/thana',             authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT','OWNER'), ctrl.getLocationByThana);
router.get('/location/summary',           authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT','OWNER'), ctrl.getLocationSummary);

// Web Analytics (Module 4)
router.get('/web-analytics',              authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT','OWNER'), ctrl.getWebAnalytics);

// Product Performance extended (Module 6)
router.get('/product-performance',        authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT','OWNER'), ctrl.getProductPerformance);

// Marketing Dashboard (Module 7)
router.get('/marketing-dashboard',        authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT','OWNER'), ctrl.getMarketingDashboard);

export default router;
