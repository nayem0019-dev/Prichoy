/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 6.6 — Executive Service
// Powers Modules 1 (Executive Dashboard), 5 (KPI), and 9 (Today's Business).
// Builds on existing analytics service without duplicating its queries.
import { prisma } from '../config/database';

const REAL = { isTest: false };

export const executiveService = {

  // Module 1 + 5 — Executive KPI Dashboard
  async getKPI(period: '7d' | '30d' | '90d' = '30d') {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const start = new Date(now.getTime() - days * 86400000);
    const prevStart = new Date(start.getTime() - days * 86400000);

    const [curr, prev] = await Promise.all([
      prisma.order.aggregate({
        where: { ...REAL, status: { notIn: ['CANCELLED', 'RETURNED'] }, createdAt: { gte: start } },
        _sum: { grandTotal: true }, _count: true, _avg: { grandTotal: true },
      }),
      prisma.order.aggregate({
        where: { ...REAL, status: { notIn: ['CANCELLED', 'RETURNED'] }, createdAt: { gte: prevStart, lt: start } },
        _sum: { grandTotal: true }, _count: true,
      }),
    ]);

    const [newCustomers, totalCustomers, pendingOrders, pendingReturns, pendingExchanges,
      lowStockCount, pendingReviews, activeExpenses] = await Promise.all([
      prisma.customer.count({ where: { createdAt: { gte: start }, isDeleted: false } }),
      prisma.customer.count({ where: { isDeleted: false } }),
      prisma.order.count({ where: { ...REAL, status: 'PENDING' } }),
      prisma.return.count({ where: { refundStatus: 'PENDING' } }),
      prisma.exchange.count({ where: { status: { in: ['REQUESTED', 'APPROVED'] } } }),
      prisma.inventory.count({ where: { product: { isDeleted: false } } }).then(async () => {
        const rows = await prisma.inventory.findMany({ where: { product: { isDeleted: false } }, select: { quantity: true, lowStockAlert: true } });
        return rows.filter((r: any) => r.quantity > 0 && r.quantity <= r.lowStockAlert).length;
      }),
      prisma.productReview.count({ where: { status: 'PENDING' } }),
      prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    ]);

    const rev = Number(curr._sum.grandTotal ?? 0);
    const prevRev = Number(prev._sum.grandTotal ?? 0);
    const pct = (current: number, previous: number) => previous > 0 ? Math.round(((current - previous) / previous) * 10000) / 100 : 0;

    return {
      period,
      revenue: { current: rev, previous: prevRev, growth: pct(rev, prevRev) },
      orders:   { current: curr._count, previous: prev._count, growth: pct(curr._count, prev._count) },
      aov:      { current: Math.round(Number(curr._avg?.grandTotal ?? 0)), previous: 0 },
      customers: { new: newCustomers, total: totalCustomers },
      pending: { orders: pendingOrders, returns: pendingReturns, exchanges: pendingExchanges },
      alerts:  { lowStock: lowStockCount, pendingReviews, activeCampaigns: activeExpenses },
    };
  },

  // Module 9 — Today's Business snapshot
  async getTodaysBusiness() {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [todayOrders, pendingOrders, pendingReturns, pendingExchanges,
      lowStockItems, outOfStockItems, pendingReviews, pendingGallery,
      activeCampaign, recentSecurityLogs] = await Promise.all([
      prisma.order.count({ where: { ...REAL, createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { ...REAL, status: 'PENDING' } }),
      prisma.return.count({ where: { refundStatus: 'PENDING' } }),
      prisma.exchange.count({ where: { status: { in: ['REQUESTED', 'APPROVED'] } } }),
      prisma.inventory.findMany({
        where: { product: { isDeleted: false } },
        select: { quantity: true, lowStockAlert: true, product: { select: { name: true, sku: true } } },
      }).then((rows: any[]) => rows.filter((r) => r.quantity > 0 && r.quantity <= r.lowStockAlert).slice(0, 10)),
      prisma.inventory.count({ where: { quantity: 0, product: { isDeleted: false } } }),
      prisma.productReview.count({ where: { status: 'PENDING' } }),
      prisma.customerGallery.count({ where: { isApproved: false } }),
      prisma.campaign.findFirst({ where: { status: 'ACTIVE' }, orderBy: { priority: 'asc' }, select: { name: true, type: true, endDate: true } }),
      prisma.activityLog.findMany({
        where: { action: { in: ['LOGIN_FAILED', 'PERMISSION_DENIED', 'ACCOUNT_LOCKED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { action: true, createdAt: true, userId: true, ipAddress: true },
      }).catch(() => []),
    ]);

    return {
      today: { orders: todayOrders },
      pending: { orders: pendingOrders, returns: pendingReturns, exchanges: pendingExchanges },
      inventory: { lowStock: lowStockItems, outOfStockCount: outOfStockItems },
      content:  { pendingReviews, pendingGallery },
      marketing: { activeCampaign },
      security: { recentAlerts: (recentSecurityLogs as any[]) },
    };
  },

  // Module 5 — Weekly/Monthly performance trend (last 12 weeks)
  async getPerformanceTrend() {
    const now = new Date();
    const weeks: { label: string; revenue: number; orders: number; customers: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - i * 7 - 6); weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() - i * 7); weekEnd.setHours(23, 59, 59, 999);
      const [agg, customers] = await Promise.all([
        prisma.order.aggregate({ where: { ...REAL, status: { notIn: ['CANCELLED', 'RETURNED'] }, createdAt: { gte: weekStart, lte: weekEnd } }, _sum: { grandTotal: true }, _count: true }),
        prisma.customer.count({ where: { createdAt: { gte: weekStart, lte: weekEnd }, isDeleted: false } }),
      ]);
      weeks.push({ label: weekStart.toLocaleDateString('en-BD', { month: 'short', day: 'numeric' }), revenue: Number(agg._sum.grandTotal ?? 0), orders: agg._count, customers });
    }
    return weeks;
  },

  // Module 1 — Launch Readiness + Security Status (checklist)
  getLaunchReadiness() {
    return {
      checklist: [
        { item: 'HTTPS configured',          status: 'pending', category: 'security' },
        { item: 'Rate limiting active',       status: 'done',    category: 'security' },
        { item: 'Input sanitization',         status: 'done',    category: 'security' },
        { item: 'XSS protection headers',     status: 'done',    category: 'security' },
        { item: 'DB backups configured',      status: 'pending', category: 'infrastructure' },
        { item: 'Environment variables set',  status: 'pending', category: 'infrastructure' },
        { item: 'Notification providers',     status: 'pending', category: 'integration' },
        { item: 'Payment provider (future)',  status: 'skipped', category: 'integration' },
        { item: 'Product catalogue seeded',   status: 'pending', category: 'content' },
        { item: 'COD checkout tested E2E',    status: 'pending', category: 'qa' },
        { item: 'Mobile UX reviewed',         status: 'pending', category: 'qa' },
        { item: 'Admin accounts created',     status: 'pending', category: 'operations' },
      ],
    };
  },
};
