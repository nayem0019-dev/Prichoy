import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { returnAccountingService, exchangeService } from '../services/returnAccounting.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

// ── Return Accounting ────────────────────────────────────────────
export const upsertReturnAccounting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await returnAccountingService.upsert(req.params.orderId, {
    ...req.body,
    returnedById: req.user?.userId,
  });
  sendSuccess(res, data, 'Return accounting saved');
});

export const getReturnAccounting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await returnAccountingService.getByOrder(req.params.orderId);
  sendSuccess(res, data);
});

export const listReturns = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { returns, meta } = await returnAccountingService.list(req.query as never);
  sendPaginated(res, returns, meta);
});

// ── Exchange Management ──────────────────────────────────────────
export const createExchange = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await exchangeService.create(req.params.orderId, {
    ...req.body,
    createdById: req.user?.userId,
  });
  sendCreated(res, data, 'Exchange request created');
});

export const updateExchangeStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await exchangeService.updateStatus(req.params.id, {
    ...req.body,
    adminId: req.user?.userId,
  });
  sendSuccess(res, data, 'Exchange status updated');
});

export const listExchanges = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { exchanges, meta } = await exchangeService.list(req.query as never);
  sendPaginated(res, exchanges, meta);
});

export const getExchange = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await exchangeService.getById(req.params.id);
  sendSuccess(res, data);
});
