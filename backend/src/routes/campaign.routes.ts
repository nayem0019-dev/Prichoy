import { Router } from 'express';
import * as ctrl from '../controllers/campaign.controller';
import * as sandboxCtrl from '../controllers/sandbox.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ── Public endpoints (no auth) ───────────────────────────────────
router.get('/delivery/estimate',         ctrl.estimateDelivery);
router.get('/delivery/locations',        ctrl.getLocations);
router.get('/delivery/locations/:district/upazilas', ctrl.getDistrictUpazilas);
router.get('/delivery/customer-view',    ctrl.getCustomerDeliveryView);  // Phase 6.5 §5
router.get('/campaigns/active',          ctrl.getActiveCampaign);
router.get('/counters',                  ctrl.getBusinessCounters);

// ── Admin: Campaigns ─────────────────────────────────────────────
router.use(authenticate);
router.get('/campaigns',                ctrl.getCampaigns);
router.get('/campaigns/calendar',       ctrl.getCampaignCalendar);
router.get('/campaigns/:id',            ctrl.getCampaign);
router.post('/campaigns',               authorize('SUPER_ADMIN','ADMIN'), ctrl.createCampaign);
router.put('/campaigns/:id',            authorize('SUPER_ADMIN','ADMIN'), ctrl.updateCampaign);
router.delete('/campaigns/:id',         authorize('SUPER_ADMIN','ADMIN'), ctrl.deleteCampaign);
router.put('/campaigns/:id/activate',   authorize('SUPER_ADMIN','ADMIN'), ctrl.activateCampaign);
router.put('/campaigns/:id/pause',      authorize('SUPER_ADMIN','ADMIN'), ctrl.pauseCampaign);
router.put('/campaigns/:id/end',        authorize('SUPER_ADMIN','ADMIN'), ctrl.endCampaign);

// ── Admin: Coupon analytics + simulator ─────────────────────────
router.get('/coupon-analytics',         authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT'), ctrl.getCouponAnalytics);
router.post('/coupon-simulator',        authorize('SUPER_ADMIN','ADMIN'), ctrl.simulateCouponRoute);

// ── Admin: Courier recommendation (Phase 6.5 §5) ─────────────────
router.get('/courier-recommendation',   authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','DELIVERY_MANAGER'), ctrl.getAdminCourierRecommendations);

// ── Admin: Manual order ──────────────────────────────────────────
router.post('/manual-order',            authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER'), ctrl.createManualOrder);

// ── Phase 6.5 §1: Sandbox Mode (OWNER / SUPER_ADMIN only) ────────
router.get('/sandbox',                  sandboxCtrl.getSandboxConfig);
router.put('/sandbox',                  sandboxCtrl.updateSandboxConfig);
router.delete('/sandbox/test-data',     sandboxCtrl.clearTestData);

export default router;
