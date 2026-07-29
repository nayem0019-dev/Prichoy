import { Router } from 'express';
import * as ctrl from '../controllers/returnAccounting.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER'));

// Return accounting (one per order, upsert pattern)
router.get('/returns',                             ctrl.listReturns);
router.get('/orders/:orderId/return',              ctrl.getReturnAccounting);
router.put('/orders/:orderId/return',              ctrl.upsertReturnAccounting);

// Exchange management
router.get('/exchanges',                           ctrl.listExchanges);
router.get('/exchanges/:id',                       ctrl.getExchange);
router.post('/orders/:orderId/exchange',           ctrl.createExchange);
router.put('/exchanges/:id/status',                ctrl.updateExchangeStatus);

export default router;
