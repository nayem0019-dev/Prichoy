import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Previously this middleware wrote to ActivityLog and immediately called
 * next() — meaning the log entry was created BEFORE the actual controller
 * ran. If the controller subsequently failed validation, hit a business
 * rule error, or threw for any reason, the audit trail still showed the
 * action as having happened. For an audit log whose entire purpose is to
 * be a trustworthy record of what actually occurred, that's a real
 * integrity problem.
 *
 * This version hooks into the response's 'finish' event and only writes
 * the log entry if the eventual status code indicates success (< 400).
 * The action + entity + entityId are captured up front (route params
 * don't change), but the entry is only persisted once we know the
 * request actually succeeded.
 */
export function auditLog(action: string, entity?: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const adminId  = req.user?.userId;
    const entityId = req.params.id;
    const ip        = req.ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    res.on('finish', () => {
      if (res.statusCode >= 400) return; // Action did not actually succeed.

      prisma.activityLog.create({
        data: { adminId, action, entity, entityId, ip, userAgent },
      }).catch((e: unknown) => {
        logger.error('Audit log write failed', e);
      });
    });

    next();
  };
}
