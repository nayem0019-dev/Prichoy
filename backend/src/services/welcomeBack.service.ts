/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 6 §6 — Welcome Back Offer
// Auto-generated after a customer's first DELIVERED order.
// Rules: 5% OFF, min ৳499, 30-day expiry, single-use, second purchase only.
// The coupon code is phone-based so guest customers can also redeem it.
import crypto from 'crypto';
import { prisma } from '../config/database';
import { notificationService } from './notification.service';

export class WelcomeBackOfferService {
  // Called from order.service.ts updateStatus() when status → DELIVERED.
  async maybeIssue(orderId: string): Promise<void> {
    try {
      const order: any = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: { select: { id: true, name: true, phone: true, email: true, totalOrders: true } } },
      });
      if (!order || !order.customer) return;

      // Only issue on the first delivered order (totalOrders has already
      // been incremented by the time updateStatus runs, so first = 1).
      const deliveredCount = await prisma.order.count({
        where: { customerId: order.customer.id, status: 'DELIVERED' },
      });
      if (deliveredCount !== 1) return;

      // Check no welcome-back coupon was already issued for this customer.
      const existing = await prisma.coupon.findFirst({
        where: { customerId: order.customer.id, type: 'WELCOME_BACK' },
      });
      if (existing) return;

      const code = 'WB-' + order.customer.phone.slice(-6) + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const coupon = await prisma.coupon.create({
        data: {
          code,
          type: 'WELCOME_BACK',
          value: 5,           // 5%
          minOrderAmount: 499,
          usageLimit: 1,
          customerLimit: 1,
          isActive: true,
          expiresAt,
          singleUse: true,
          isStackable: true,  // can stack with GRAND_OPENING per §4
          description: 'Welcome back! 5% off your second order.',
          customerId: order.customer.id,
        },
      });

      // Deliver via notification service (WhatsApp + email if available)
      await notificationService.sendWelcomeBackOffer({
        customer: order.customer,
        coupon: { code: coupon.code, expiresAt, discountText: '5% OFF' },
        orderNumber: order.orderNo,
      });
    } catch (err) {
      // Never let the welcome-back offer failure break the order flow
      console.error('[WelcomeBackOffer] Error:', err);
    }
  }
}

export const welcomeBackOfferService = new WelcomeBackOfferService();

// ================================================================
// Phase 6 §7 — Coupon Analytics
// ================================================================

export class CouponAnalyticsService {
  async getDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, active, expired, redemptions, recentRedemptions] = await Promise.all([
      prisma.coupon.count(),
      prisma.coupon.count({ where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
      prisma.coupon.count({ where: { expiresAt: { lt: now } } }),
      prisma.couponRedemption.count(),
      prisma.couponRedemption.findMany({
        where: { usedAt: { gte: thirtyDaysAgo } },
        include: { coupon: { select: { code: true, type: true, value: true } }, customer: { select: { name: true, phone: true } } },
        orderBy: { usedAt: 'desc' },
        take: 20,
      }),
    ]);

    const totalUsed = await prisma.coupon.aggregate({ _sum: { usedCount: true } });
    const welcomeBack = await prisma.coupon.count({ where: { type: 'WELCOME_BACK' } });
    const welcomeBackRedeemed = await prisma.couponRedemption.count({
      where: { coupon: { type: 'WELCOME_BACK' } },
    });

    // Revenue generated via coupons — approximate from order discount amounts
    // where a coupon code was applied.
    const couponOrders: any[] = await prisma.order.findMany({
      where: { couponCode: { not: null }, status: { notIn: ['CANCELLED', 'RETURNED'] } },
      select: { discountAmount: true, couponCode: true },
    });
    const revenueGenerated = couponOrders.reduce((s: number, o: any) => s + Number(o.discountAmount ?? 0), 0);

    return {
      total, active, expired,
      totalIssued: total,
      totalRedeemed: Number(totalUsed._sum.usedCount ?? 0),
      redemptionRate: total > 0 ? Math.round((redemptions / total) * 10000) / 100 : 0,
      revenueGenerated,
      welcomeBackIssued: welcomeBack,
      welcomeBackRedeemed,
      recentRedemptions,
    };
  }
}

export const couponAnalyticsService = new CouponAnalyticsService();

// ================================================================
// Phase 6 §8 — Coupon Simulator
// Simulation ONLY — no DB writes. Uses in-memory calculation.
// ================================================================

export function simulateCoupon(params: {
  subtotal: number;
  couponType: 'PERCENTAGE' | 'FLAT' | 'FREE_SHIPPING';
  couponValue: number;
  maxDiscount?: number;
  shippingCharge?: number;
  productCost?: number;
}): {
  discountAmount: number;
  finalTotal: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  warning?: string;
} {
  const { subtotal, couponType, couponValue, maxDiscount, shippingCharge = 0, productCost = 0 } = params;
  let discountAmount = 0;
  if (couponType === 'PERCENTAGE') {
    discountAmount = Math.round(subtotal * (couponValue / 100));
    if (maxDiscount && discountAmount > maxDiscount) discountAmount = maxDiscount;
  } else if (couponType === 'FLAT') {
    discountAmount = couponValue;
  } else if (couponType === 'FREE_SHIPPING') {
    discountAmount = shippingCharge;
  }
  discountAmount = Math.min(discountAmount, subtotal);
  const finalTotal = subtotal - discountAmount + shippingCharge;
  const grossProfit = finalTotal - productCost;
  const netProfit = grossProfit;
  const profitMargin = finalTotal > 0 ? Math.round((netProfit / finalTotal) * 10000) / 100 : 0;
  return {
    discountAmount,
    finalTotal,
    grossProfit,
    netProfit,
    profitMargin,
    warning: netProfit < 0 ? '⚠️ This coupon would result in a loss' : undefined,
  };
}
