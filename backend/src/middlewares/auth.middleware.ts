import { Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { logSecurityEvent } from '../config/logger';

/**
 * Verifies the access token AND re-checks the user's current isActive
 * status and role directly from the database on every request.
 *
 * Why the extra DB lookup: a pure JWT-only check would trust whatever
 * role/active-status was true at the moment the token was ISSUED, for the
 * full lifetime of that token (up to 15 minutes). That means a
 * SUPER_ADMIN deactivating a compromised or offboarded admin account, or
 * demoting someone's role, would have NO effect until that admin's
 * existing access token happened to expire on its own. For an ERP
 * handling orders/inventory/customer data, a window of up to 15 minutes
 * where a deactivated account still has full access is not acceptable.
 *
 * This is a single indexed primary-key lookup, which is an acceptable
 * cost for an internal admin panel's traffic volume (as opposed to a
 * public, high-throughput customer-facing endpoint).
 *
 * Wrapped in express-async-handler (same pattern used for every
 * controller in this codebase) so that any thrown/rejected error —
 * including ones from res.json() itself in some edge case — is routed to
 * the global error handler instead of risking an unhandled rejection.
 * This middleware runs on essentially every protected route, so it's
 * worth being fully rigorous here rather than relying on "the try/catch
 * blocks should always resolve in practice".
 */
export const authenticate = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendUnauthorized(res, 'Access token required');
    return;
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error: unknown) {
    const message = error instanceof Error && error.name === 'TokenExpiredError'
      ? 'Access token expired'
      : 'Invalid access token';
    sendUnauthorized(res, message);
    return;
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!currentUser) {
    sendUnauthorized(res, 'Account no longer exists');
    return;
  }

  if (!currentUser.isActive) {
    logSecurityEvent('ACCESS_DENIED_DEACTIVATED_ACCOUNT', {
      userId: currentUser.id, ip: req.ip, path: req.originalUrl,
    });
    sendForbidden(res, 'Account is deactivated. Contact administrator');
    return;
  }

  // Always trust the DB's current role over whatever role was embedded
  // in the token at issuance time — closes the stale-role privilege
  // window described above.
  req.user = { ...payload, role: currentUser.role };
  next();
});

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    if (roles.length && !roles.includes(req.user.role)) {
      logSecurityEvent('PERMISSION_DENIED', {
        userId: req.user.userId, role: req.user.role,
        requiredRoles: roles, path: req.originalUrl, ip: req.ip,
      });
      sendForbidden(res, 'Insufficient permissions for this action');
      return;
    }
    next();
  };
}

// For public-but-personalizable endpoints (none currently exposed, kept
// for future use e.g. a public product page that shows different content
// to logged-in vs anonymous users).
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(authHeader.split(' ')[1]);
    } catch {
      // Silently ignore — optional auth, invalid token just means anonymous.
    }
  }
  next();
}
