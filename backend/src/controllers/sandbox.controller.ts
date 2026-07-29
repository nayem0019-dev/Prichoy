import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { sandboxService } from '../services/sandbox.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

// All sandbox routes are OWNER-only. Since Role.OWNER is not yet in the
// Prisma Role enum in every deployed environment, we also accept
// SUPER_ADMIN for backward compatibility until the migration runs.
function requireOwner(req: AuthRequest) {
  const role = req.user?.role as string;
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN') {
    throw new AppError('Owner access required', HTTP_STATUS.FORBIDDEN);
  }
}

export const getSandboxConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireOwner(req);
  const config = await sandboxService.getConfig();
  sendSuccess(res, config);
});

export const updateSandboxConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireOwner(req);
  const config = await sandboxService.setConfig(req.body);
  sendSuccess(res, config, 'Sandbox configuration updated');
});

export const clearTestData = asyncHandler(async (req: AuthRequest, res: Response) => {
  requireOwner(req);
  const result = await sandboxService.clearTestData();
  sendSuccess(res, result, `Cleared ${result.ordersDeleted} test orders`);
});
