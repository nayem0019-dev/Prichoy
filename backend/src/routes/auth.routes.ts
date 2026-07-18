import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authLimiter, refreshLimiter, sensitiveActionLimiter } from '../middlewares/rateLimit.middleware';
import {
  loginSchema, registerSchema,
  refreshTokenSchema, changePasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// Public
router.post('/login',         authLimiter,   validate(loginSchema),        ctrl.login);
router.post('/refresh-token', refreshLimiter, validate(refreshTokenSchema), ctrl.refreshToken);

// Protected
router.use(authenticate);
router.post('/logout',         ctrl.logout);
router.post('/logout-all',     ctrl.logoutAll);
router.get('/profile',         ctrl.getProfile);
router.put('/change-password', sensitiveActionLimiter, validate(changePasswordSchema), ctrl.changePassword);

// SUPER_ADMIN only — register new admin users.
// This was previously reachable by ANY authenticated user regardless of role,
// allowing privilege escalation (e.g. an ORDER_MANAGER could create a new
// SUPER_ADMIN account). Now explicitly locked to SUPER_ADMIN.
router.post('/register', authorize('SUPER_ADMIN'), sensitiveActionLimiter, validate(registerSchema), ctrl.register);

export default router;
