import { Router } from 'express';
import * as ctrl from '../controllers/public.controller';
import * as accountCtrl from '../controllers/customerAccount.controller';
import { reviewService } from '../services/review.service';
import { galleryService } from '../services/gallery.service';
import { sendSuccess } from '../utils/response';
import { checkoutLimiter } from '../middlewares/rateLimit.middleware';
import asyncHandler from 'express-async-handler';

const router = Router();

router.get('/products',           ctrl.getProducts);
router.get('/products/:slug',     ctrl.getProductBySlug);
router.get('/categories',         ctrl.getCategories);
router.post('/coupons/validate',  ctrl.validateCoupon);
router.post('/orders',            checkoutLimiter, ctrl.createOrder);

// Phase 5 — public review and gallery reads (no auth required)
router.get('/products/:productId/reviews', asyncHandler(async (req, res) => {
  const result = await reviewService.getProductReviews(req.params.productId, req.query);
  sendSuccess(res, result);
}));
router.get('/products/:productId/gallery', asyncHandler(async (req, res) => {
  const result = await galleryService.getProductGallery(req.params.productId, req.query);
  sendSuccess(res, result);
}));

// Phase 6 — storefront needs active campaign for pricing/banners
router.get('/active-campaign', asyncHandler(async (_req, res) => {
  const { campaignService } = await import('../services/campaign.service');
  const campaign = await campaignService.getActive();
  sendSuccess(res, campaign);
}));

export default router;
