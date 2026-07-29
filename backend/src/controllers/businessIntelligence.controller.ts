/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { executiveService } from '../services/executive.service';
import { locationAnalyticsService, webAnalyticsService } from '../services/locationAnalytics.service';
import { sendSuccess } from '../utils/response';

// ── Module 1 + 5: Executive Dashboard / KPI ─────────────────────
export const getExecutiveKPI = asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = (req.query.period as '7d' | '30d' | '90d') || '30d';
  const data = await executiveService.getKPI(period);
  sendSuccess(res, data);
});

export const getPerformanceTrend = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await executiveService.getPerformanceTrend();
  sendSuccess(res, data);
});

export const getLaunchReadiness = asyncHandler(async (_req: AuthRequest, res: Response) => {
  sendSuccess(res, executiveService.getLaunchReadiness());
});

// ── Module 9: Today's Business ───────────────────────────────────
export const getTodaysBusiness = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await executiveService.getTodaysBusiness();
  sendSuccess(res, data);
});

// ── Module 8: Location Intelligence ─────────────────────────────
export const getLocationByDistrict = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await locationAnalyticsService.getByDistrict(req.query as any);
  sendSuccess(res, data);
});

export const getLocationByThana = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { district, ...params } = req.query as any;
  if (!district) { res.status(400).json({ success: false, message: 'district required' }); return; }
  const data = await locationAnalyticsService.getByThana(district, params);
  sendSuccess(res, data);
});

export const getLocationSummary = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await locationAnalyticsService.getSummary();
  sendSuccess(res, data);
});

// ── Module 4: Web Analytics ──────────────────────────────────────
// Public beacon — called from storefront JS with no auth
export const trackEvent = asyncHandler(async (req: any, res: Response) => {
  const ua = req.headers['user-agent'] ?? '';
  const device = /mobile/i.test(ua) ? 'mobile' : /tablet|ipad/i.test(ua) ? 'tablet' : 'desktop';
  await webAnalyticsService.track({ ...req.body, device }).catch(() => {});
  res.status(204).end();
});

export const getWebAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await webAnalyticsService.getFunnel(req.query as any);
  sendSuccess(res, data);
});

// ── Module 6: Product Performance ───────────────────────────────
// Re-uses the existing analytics product endpoint via delegation
export const getProductPerformance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { analyticsService } = await import('../services/analytics.service');
  const q = req.query as Record<string, string>;
  const data = await analyticsService.getProductPerformance({
    preset: q.preset, startDate: q.startDate, endDate: q.endDate,
    limit: q.limit ? Number(q.limit) : 20,
  });
  sendSuccess(res, data);
});

// ── Module 7: Marketing Dashboard ───────────────────────────────
export const getMarketingDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { campaignService } = await import('../services/campaign.service');
  const { couponAnalyticsService } = await import('../services/welcomeBack.service');
  const { analyticsService } = await import('../services/analytics.service');

  const [campaigns, couponStats, salesData] = await Promise.all([
    campaignService.getAll({ limit: 50 }).then((r: any) => r.campaigns),
    couponAnalyticsService.getDashboard(),
    analyticsService.getSalesAnalytics({ preset: 'this_month' }),
  ]);

  const activeCampaigns = (campaigns as any[]).filter((c: any) => c.status === 'ACTIVE');

  sendSuccess(res, {
    activeCampaigns: activeCampaigns.length,
    totalCampaigns: campaigns.length,
    couponStats: {
      issued: couponStats.total,
      redeemed: couponStats.totalRedeemed,
      redemptionRate: couponStats.redemptionRate,
      revenueGenerated: couponStats.revenueGenerated,
    },
    monthlyRevenue: salesData.revenue,
    monthlyOrders: salesData.orders,
    campaigns: activeCampaigns.map((c: any) => ({
      id: c.id, name: c.name, type: c.type, status: c.status,
      startDate: c.startDate, endDate: c.endDate,
      couponsCount: c._count?.coupons ?? 0,
    })),
  });
});
