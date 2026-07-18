import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';
import { HTTP_STATUS } from '../constants';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many requests, please try again later', HTTP_STATUS.TOO_MANY_REQUESTS);
  },
});

// Login: strict, per-IP. Combined with per-account lockout in auth.service.ts
// this provides two independent layers of brute-force protection (an
// attacker rotating IPs still hits the account lockout; an attacker hitting
// one IP hard still hits this limiter regardless of which account they try).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many login attempts, please try again in 15 minutes', HTTP_STATUS.TOO_MANY_REQUESTS);
  },
});

// Refresh-token endpoint is unauthenticated by nature (that's its purpose),
// so it needs its own throttle independent of the general limiter to stop
// it being hammered for token-guessing / DoS purposes.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many refresh attempts, please try again later', HTTP_STATUS.TOO_MANY_REQUESTS);
  },
});

// Sensitive authenticated actions (register new admin, change password).
// Stricter than the general limiter since these are high-value targets for
// an attacker who has already obtained a valid access token.
export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many attempts, please try again in 15 minutes', HTTP_STATUS.TOO_MANY_REQUESTS);
  },
});

// Public order tracking (Phase 2 §10) is unauthenticated and takes an
// order number + phone number — exactly the kind of two-field lookup that
// invites brute-forcing one field while iterating the other. Kept tight
// and per-IP; the account-lockout-style protection isn't applicable here
// since there's no account, so this limiter is the only defense.
export const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many tracking attempts, please try again later', HTTP_STATUS.TOO_MANY_REQUESTS);
  },
});

// Public checkout (Phase 3.1) — unauthenticated, and the only public
// endpoint that writes anything (creates a real Order + Customer row).
// Tighter than the general API limiter, looser than login, since a real
// shopper might legitimately place more than one order in a session
// (e.g. retrying after fixing a validation error).
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many checkout attempts, please try again later', HTTP_STATUS.TOO_MANY_REQUESTS);
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Upload limit reached, try again later', HTTP_STATUS.TOO_MANY_REQUESTS);
  },
});
