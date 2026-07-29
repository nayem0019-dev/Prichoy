import { Router } from 'express';
import * as ctrl from '../controllers/customerAccount.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ── Public auth routes (no customer token required) ───────────
router.post('/auth/register', ctrl.register);
router.post('/auth/login',    ctrl.login);

// ── Public review & gallery reads (for product page) ──────────
// These are mounted under /api/public in app.ts via publicRoutes — see
// public.routes.ts extension below.

// ── Authenticated customer routes ─────────────────────────────
router.use('/me', ctrl.requireCustomer);
router.get('/me/profile',         ctrl.getProfile);
router.put('/me/profile',         ctrl.updateProfile);
router.put('/me/password',        ctrl.changePassword);
router.get('/me/orders',          ctrl.getMyOrders);
router.get('/me/wishlist',        ctrl.getWishlist);
router.post('/me/wishlist',       ctrl.addToWishlist);
router.delete('/me/wishlist/:productId', ctrl.removeFromWishlist);
router.post('/me/wishlist/merge', ctrl.mergeWishlist);
router.post('/me/reviews',        ctrl.submitReview);
router.get('/me/notification-prefs',    ctrl.getNotificationPrefs);
router.put('/me/notification-prefs',    ctrl.updateNotificationPrefs);
router.post('/me/gallery',        ctrl.submitGalleryPhoto);

// ── Authenticated customer: vote on review ─────────────────────
// Note: any logged-in customer can vote, not just the product buyer.
router.post('/reviews/:reviewId/helpful', ctrl.requireCustomer, ctrl.voteHelpful);

// ── Admin moderation routes ────────────────────────────────────
router.get('/admin/reviews',      authenticate, authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER'), ctrl.listReviewsAdmin);
router.put('/admin/reviews/:id/moderate', authenticate, authorize('SUPER_ADMIN','ADMIN'), ctrl.moderateReview);
router.delete('/admin/reviews/:id',       authenticate, authorize('SUPER_ADMIN','ADMIN'), ctrl.deleteReview);
router.get('/admin/gallery',      authenticate, authorize('SUPER_ADMIN','ADMIN'), ctrl.listGalleryAdmin);
router.put('/admin/gallery/:id/approve',  authenticate, authorize('SUPER_ADMIN','ADMIN'), ctrl.approveGallery);
router.delete('/admin/gallery/:id',       authenticate, authorize('SUPER_ADMIN','ADMIN'), ctrl.rejectGallery);

export default router;
