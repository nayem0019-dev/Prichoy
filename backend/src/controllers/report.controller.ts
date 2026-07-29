import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { reportService } from '../services/report.service';
import { sendSuccess, sendBadRequest } from '../utils/response';

function parseDateRange(query: Record<string, string>) {
  const start = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(1));
  const end   = query.endDate   ? new Date(query.endDate + 'T23:59:59') : new Date();
  return { start, end };
}

export const getSalesSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = parseDateRange(req.query as Record<string, string>);
  const data = await reportService.getSalesSummary(start, end);
  sendSuccess(res, data);
});

export const getOrdersByStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = parseDateRange(req.query as Record<string, string>);
  const data = await reportService.getOrdersByStatus(start, end);
  sendSuccess(res, data);
});

export const getProductPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = parseDateRange(req.query as Record<string, string>);
  const data = await reportService.getProductPerformance(start, end, Number(req.query.limit) || 20);
  sendSuccess(res, data);
});

export const getCourierPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = parseDateRange(req.query as Record<string, string>);
  const data = await reportService.getCourierPerformance(start, end);
  sendSuccess(res, data);
});

export const getMonthlyRevenue = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const data = await reportService.getMonthlyRevenue(year);
  sendSuccess(res, data);
});

export const getInventoryReport = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await reportService.getInventoryReport();
  sendSuccess(res, data);
});

export const getExpenseReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { start, end } = parseDateRange(req.query as Record<string, string>);
  const data = await reportService.getExpenseReport(start, end);
  sendSuccess(res, data);
});
