import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { analyticsService } from '../services/analytics.service';
import { sendSuccess } from '../utils/response';

export const getBusinessDashboard = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await analyticsService.getBusinessDashboard();
  sendSuccess(res, data);
});

export const getSalesAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getSalesAnalytics(req.query as never);
  sendSuccess(res, data);
});

export const getFinancialDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getFinancialDashboard(req.query as never);
  sendSuccess(res, data);
});

export const getProductPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = req.query as Record<string, string>;
  const data = await analyticsService.getProductPerformance({
    preset: q.preset, startDate: q.startDate, endDate: q.endDate,
    limit: q.limit ? Number(q.limit) : undefined,
  });
  sendSuccess(res, data);
});

export const getCategoryAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getCategoryAnalytics(req.query as never);
  sendSuccess(res, data);
});

export const getCustomerAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getCustomerAnalytics(req.query as never);
  sendSuccess(res, data);
});

export const getDeliveryAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await analyticsService.getDeliveryAnalytics(req.query as never);
  sendSuccess(res, data);
});

export const getInventoryReports = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await analyticsService.getInventoryReports();
  sendSuccess(res, data);
});
