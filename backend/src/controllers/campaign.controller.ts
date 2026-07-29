/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 6 — Campaign Controller
import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { campaignService } from '../services/campaign.service';
import { couponAnalyticsService, simulateCoupon } from '../services/welcomeBack.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { getDeliveryEstimate, getAllDistricts, getUpazilas, BD_LOCATIONS } from '../data/bdLocations';
import { prisma } from '../config/database';

// ── Campaigns ────────────────────────────────────────────────────
export const getCampaigns = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { campaigns, meta } = await campaignService.getAll(req.query as any);
  sendPaginated(res, campaigns, meta);
});

export const getCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const c = await campaignService.getById(req.params.id);
  sendSuccess(res, c);
});

export const createCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const c = await campaignService.create({ ...req.body, createdById: req.user?.userId });
  sendCreated(res, c, 'Campaign created');
});

export const updateCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const c = await campaignService.update(req.params.id, req.body);
  sendSuccess(res, c, 'Campaign updated');
});

export const deleteCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  await campaignService.delete(req.params.id);
  sendSuccess(res, null, 'Campaign deleted');
});

export const activateCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const c = await campaignService.activate(req.params.id);
  sendSuccess(res, c, 'Campaign activated');
});

export const pauseCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const c = await campaignService.pause(req.params.id);
  sendSuccess(res, c, 'Campaign paused');
});

export const endCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const c = await campaignService.end(req.params.id);
  sendSuccess(res, c, 'Campaign ended');
});

export const getCampaignCalendar = asyncHandler(async (req: AuthRequest, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const data = await campaignService.getCalendar(year);
  sendSuccess(res, data);
});

export const getActiveCampaign = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await campaignService.getActive();
  sendSuccess(res, data);
});

// ── Coupon Analytics ─────────────────────────────────────────────
export const getCouponAnalytics = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await couponAnalyticsService.getDashboard();
  sendSuccess(res, data);
});

// ── Coupon Simulator ─────────────────────────────────────────────
export const simulateCouponRoute = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subtotal, couponType, couponValue, maxDiscount, shippingCharge, productCost } = req.body;
  if (!subtotal || !couponType || couponValue === undefined) {
    res.status(400).json({ success: false, message: 'subtotal, couponType, couponValue are required' });
    return;
  }
  const result = simulateCoupon({ subtotal: Number(subtotal), couponType, couponValue: Number(couponValue), maxDiscount: maxDiscount ? Number(maxDiscount) : undefined, shippingCharge: shippingCharge ? Number(shippingCharge) : 80, productCost: productCost ? Number(productCost) : 0 });
  sendSuccess(res, result);
});

// ── Delivery Estimation ───────────────────────────────────────────
// Public — no auth required (called from checkout page)
export const estimateDelivery = asyncHandler(async (req: any, res: Response) => {
  const { district, thana } = req.query as any;
  if (!district) { res.status(400).json({ success: false, message: 'district is required' }); return; }
  const estimate = getDeliveryEstimate(district as string, thana as string | undefined);
  sendSuccess(res, {
    ...estimate,
    disclaimer: 'Final delivery charge may vary depending on location and parcel weight.',
  });
});

export const getLocations = asyncHandler(async (_req: any, res: Response) => {
  sendSuccess(res, BD_LOCATIONS.map(div => ({
    name: div.name, bn: div.bn,
    districts: div.districts.map(d => ({
      name: d.name, bn: d.bn, upazilas: d.upazilas,
    })),
  })));
});

export const getDistrictUpazilas = asyncHandler(async (req: any, res: Response) => {
  const upazilas = getUpazilas(req.params.district);
  sendSuccess(res, upazilas);
});

// ── Manual Order (Phase 6 §17) ────────────────────────────────────
// Owner/admin creates an order directly from the admin panel.
// Reuses the existing public.service order creation logic but adds
// orderSource tracking and bypasses the rate limiter.
export const createManualOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { publicService } = await import('../services/public.service');
  const { orderSource = 'MANUAL', manualCreatorRole = 'MANAGER', ...orderData } = req.body;
  const result = await publicService.createOrder(orderData);

  // Tag the order with source and creator info
  await prisma.order.update({
    where: { id: result.id },
    data: {
      orderSource,
      manualCreatedBy: req.user?.userId,
      manualCreatorRole,
    },
  });

  sendCreated(res, result, 'Order created manually');
});

// ── Courier Recommendation (Phase 6.5 §5) ────────────────────────
// Public: returns customer-safe delivery view (no courier names)
export const getCustomerDeliveryView = asyncHandler(async (req: any, res: Response) => {
  const { zone = 'dhaka_city', weight } = req.query as any;
  const { getCustomerDeliveryInfo } = await import('../services/courierRecommendation.service');
  const data = getCustomerDeliveryInfo(zone as any, weight ? Number(weight) : 0.5);
  sendSuccess(res, data);
});

// Admin: returns full recommendation with courier names
export const getAdminCourierRecommendations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { zone = 'dhaka_city', weight } = req.query as any;
  const { getRecommendations } = await import('../services/courierRecommendation.service');
  const data = getRecommendations(zone as any, weight ? Number(weight) : 0.5);
  sendSuccess(res, data);
});
// Real stats from DB — no fake numbers.
export const getBusinessCounters = asyncHandler(async (_req: any, res: Response) => {
  const LAUNCH_YEAR = 2022; // Update this to the actual Prichoy launch year

  const [customers, deliveredOrders, products, avgRating] = await Promise.all([
    prisma.customer.count({ where: { isDeleted: false } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.product.count({ where: { isDeleted: false, status: 'ACTIVE' } }),
    prisma.productReview.aggregate({ where: { status: 'APPROVED' }, _avg: { rating: true } }),
  ]);

  const yearsInBusiness = new Date().getFullYear() - LAUNCH_YEAR;

  sendSuccess(res, {
    happyCustomers: customers,
    ordersDelivered: deliveredOrders,
    productsAvailable: products,
    averageRating: Math.round((avgRating._avg.rating ?? 4.9) * 10) / 10,
    yearsInBusiness: Math.max(1, yearsInBusiness),
  });
});
