import { Router } from 'express';
import * as ctrl from '../controllers/track.controller';
import { trackLimiter } from '../middlewares/rateLimit.middleware';

// Fully public — no authenticate() call anywhere in this file. Protection
// comes from requiring BOTH orderNo + phone (or an unguessable token) plus
// trackLimiter, not from auth.
const router = Router();
router.use(trackLimiter);

router.post('/',        ctrl.trackByOrderAndPhone);
router.get('/:token',   ctrl.trackByToken);

export default router;
