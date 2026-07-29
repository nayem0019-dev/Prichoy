/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 6.6 — Location Intelligence (Module 8)
// Uses the existing shippingDistrict / shippingThana columns on orders.
// No new data collection needed — every historical order already has these fields.
import { prisma } from '../config/database';

const REAL_REVENUE = { isTest: false, status: { notIn: ['CANCELLED', 'RETURNED'] as any } };
const REAL_ALL     = { isTest: false };

export const locationAnalyticsService = {
  async getByDistrict(params: { startDate?: string; endDate?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 20, 50);
    const dateFilter: any = {};
    if (params.startDate) dateFilter.gte = new Date(params.startDate);
    if (params.endDate)   dateFilter.lte = new Date(params.endDate);
    const where: any = { ...REAL_ALL };
    if (Object.keys(dateFilter).length) where.createdAt = dateFilter;

    // Group orders by shippingDistrict using Prisma groupBy
    const grouped: any[] = await prisma.order.groupBy({
      by: ['shippingDistrict' as any],
      where,
      _count: true,
      _sum: { grandTotal: true },
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: limit,
    });

    // Calculate cancellation and return rates per district
    const districts = grouped.map((g: any) => g.shippingDistrict).filter(Boolean);

    const [cancellations, returns, totalCounts] = await Promise.all([
      prisma.order.groupBy({
        by: ['shippingDistrict' as any],
        where: { ...REAL_ALL, shippingDistrict: { in: districts }, status: 'CANCELLED' },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ['shippingDistrict' as any],
        where: { ...REAL_ALL, shippingDistrict: { in: districts }, status: 'RETURNED' },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ['shippingDistrict' as any],
        where: { ...REAL_ALL, shippingDistrict: { in: districts } },
        _count: true,
      }),
    ]);

    const cancelMap = new Map((cancellations as any[]).map((r: any) => [r.shippingDistrict, r._count]));
    const returnMap = new Map((returns as any[]).map((r: any) => [r.shippingDistrict, r._count]));
    const totalMap  = new Map((totalCounts as any[]).map((r: any) => [r.shippingDistrict, r._count]));

    return grouped.map((g: any) => {
      const total  = totalMap.get(g.shippingDistrict) ?? 1;
      const cancel = cancelMap.get(g.shippingDistrict) ?? 0;
      const ret    = returnMap.get(g.shippingDistrict) ?? 0;
      const revenue = Number(g._sum?.grandTotal ?? 0);
      const orders  = g._count;
      return {
        district: g.shippingDistrict,
        orders,
        revenue,
        avgOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
        cancellationRate: total > 0 ? Math.round((cancel / total) * 10000) / 100 : 0,
        returnRate:       total > 0 ? Math.round((ret    / total) * 10000) / 100 : 0,
        codCancellationRate: total > 0 ? Math.round((cancel / total) * 10000) / 100 : 0,
      };
    });
  },

  async getByThana(district: string, params: { startDate?: string; endDate?: string }) {
    const where: any = { ...REAL_ALL, shippingDistrict: district };
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate)   where.createdAt.lte = new Date(params.endDate);
    }
    const grouped: any[] = await prisma.order.groupBy({
      by: ['shippingThana' as any],
      where,
      _count: true,
      _sum: { grandTotal: true },
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: 30,
    });
    return grouped.map((g: any) => ({
      thana: g.shippingThana,
      orders: g._count,
      revenue: Number(g._sum?.grandTotal ?? 0),
      avgOrderValue: g._count > 0 ? Math.round(Number(g._sum?.grandTotal ?? 0) / g._count) : 0,
    }));
  },

  async getSummary() {
    const [topDistrict, bottomDistrict, total] = await Promise.all([
      prisma.order.groupBy({
        by: ['shippingDistrict' as any],
        where: { ...REAL_REVENUE },
        _sum: { grandTotal: true },
        orderBy: { _sum: { grandTotal: 'desc' } },
        take: 1,
      }),
      prisma.order.groupBy({
        by: ['shippingDistrict' as any],
        where: { ...REAL_REVENUE },
        _sum: { grandTotal: true },
        orderBy: { _sum: { grandTotal: 'asc' } },
        take: 1,
      }),
      prisma.order.count({ where: REAL_ALL }),
    ]);
    return {
      topDistrict: (topDistrict as any[])[0]?.shippingDistrict ?? null,
      bottomDistrict: (bottomDistrict as any[])[0]?.shippingDistrict ?? null,
      totalOrders: total,
    };
  },
};

// ================================================================
// Phase 6.6 Module 4 — Web Analytics Service
// ================================================================

export const webAnalyticsService = {
  // Lightweight beacon endpoint — stores minimal event without PII
  async track(event: {
    event: string; page?: string; productId?: string;
    referrer?: string; sessionId?: string; device?: string; district?: string;
  }) {
    return prisma.webPageView.create({ data: event as any });
  },

  async getFunnel(params: { startDate?: string; endDate?: string }) {
    const where: any = {};
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate)   where.createdAt.lte = new Date(params.endDate);
    }

    const EVENTS = ['PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START', 'ORDER_PLACED'];
    const counts = await Promise.all(EVENTS.map((event) =>
      prisma.webPageView.count({ where: { ...where, event } })
    ));

    const funnel = EVENTS.map((event, i) => ({
      step: event,
      count: counts[i],
      dropoffRate: i > 0 && counts[i - 1] > 0
        ? Math.round((1 - counts[i] / counts[i - 1]) * 10000) / 100
        : 0,
    }));

    const [topPages, topProducts, deviceBreakdown, trafficSources] = await Promise.all([
      prisma.webPageView.groupBy({
        by: ['page' as any],
        where: { ...where, event: 'PAGE_VIEW' },
        _count: true,
        orderBy: { _count: { page: 'desc' } } as any,
        take: 10,
      }),
      prisma.webPageView.groupBy({
        by: ['productId' as any],
        where: { ...where, event: 'PRODUCT_VIEW', productId: { not: null } },
        _count: true,
        orderBy: { _count: { productId: 'desc' } } as any,
        take: 10,
      }),
      prisma.webPageView.groupBy({
        by: ['device' as any],
        where: { ...where, event: 'PAGE_VIEW' },
        _count: true,
      }),
      prisma.webPageView.groupBy({
        by: ['referrer' as any],
        where: { ...where, event: 'PAGE_VIEW', referrer: { not: null } },
        _count: true,
        orderBy: { _count: { referrer: 'desc' } } as any,
        take: 10,
      }),
    ]);

    const totalSessions = await prisma.webPageView.count({ where: { ...where, event: 'PAGE_VIEW' } });
    const orders = counts[EVENTS.indexOf('ORDER_PLACED')];
    const conversionRate = totalSessions > 0 ? Math.round((orders / totalSessions) * 10000) / 100 : 0;

    return {
      funnel,
      topPages: (topPages as any[]).map((r: any) => ({ page: r.page, views: r._count })),
      topProducts: (topProducts as any[]).map((r: any) => ({ productId: r.productId, views: r._count })),
      deviceBreakdown: (deviceBreakdown as any[]).map((r: any) => ({ device: r.device ?? 'unknown', count: r._count })),
      trafficSources: (trafficSources as any[]).map((r: any) => ({ source: r.referrer, count: r._count })),
      totalSessions,
      conversionRate,
    };
  },
};
