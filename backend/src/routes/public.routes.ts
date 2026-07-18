import { Router } from 'express';
import * as ctrl from '../controllers/public.controller';
import { checkoutLimiter } from '../middlewares/rateLimit.middleware';

// Phase 3.1 — the customer-facing storefront's API surface. Fully public:
// no authenticate() call anywhere in this file. Deliberately separate from
// /api/products (admin-only, exposes cost price/supplier/warehouse data)
// rather than adding an "if no token, hide these fields" branch to the
// admin routes — a dedicated public service (public.service.ts) with its
// own narrow `select` is a much harder mistake to accidentally regress
// than a conditional field filter would be.
const router = Router();

router.get('/products',           ctrl.getProducts);
router.get('/products/:slug',     ctrl.getProductBySlug);
router.get('/categories',         ctrl.getCategories);
router.post('/coupons/validate',  ctrl.validateCoupon);
router.post('/orders',            checkoutLimiter, ctrl.createOrder);

export default router;
