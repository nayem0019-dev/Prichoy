/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 4 analytics service.
// Phase 6.5 §1 — all revenue/order queries now filter isTest:false so
// sandbox test orders never appear in any analytics, report, or counter.
import { prisma } from '../config/database';
import { DateRange, resolveDateRange, previousPeriod, percentGrowth } from '../utils/dateRange';

const EXCLUDE = ['CANCELLED', 'RETURNED'] as const;
// Combined filter: not cancelled/returned AND not a test order
const REAL_ORDER_WHERE = { isTest: false, status: { notIn: EXCLUDE as any } };

export class AnalyticsService {
  // §1 — Business Dashboard
  async getBusinessDashboard() {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const todayOrders: any[] = await prisma.order.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, status: { notIn: EXCLUDE as any }, isTest: false },
      include: { items: { include: { product: { select: { costPrice: true } } } } },
    });
    const todayExpenses: any = await prisma.expense.aggregate({
      where: { date: { gte: todayStart, lte: todayEnd } }, _sum: { amount: true },
    });
    const statusCounts: any[] = await prisma.order.groupBy({
      by: ['status' as any],
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      _count: true,
    });
    const inventoryRows: any[] = await prisma.inventory.findMany({
      where: { product: { isDeleted: false } },
      select: { quantity: true, lowStockAlert: true, product: { select: { costPrice: true } } },
    });
    const productTotals: any[] = await prisma.orderItem.groupBy({
      by: ['productId' as any],
      where: { order: { status: { notIn: EXCLUDE as any }, isTest: false } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 500,
    });
    const newCustomers: number = await prisma.customer.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    });
    const todayOrdersForReturning: any[] = await prisma.order.findMany({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      distinct: ['customerId' as any],
      select: { customerId: true, customer: { select: { createdAt: true } } },
    });
    const exchangesToday: number = await prisma.exchange.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    });
    const outOfStock: number = await prisma.inventory.count({
      where: { quantity: 0, product: { isDeleted: false } },
    });

    const todayRevenue = todayOrders.reduce((s: number, o: any) => s + Number(o.grandTotal), 0);
    const todayCOGS    = todayOrders.reduce((s: number, o: any) =>
      s + o.items.reduce((si: number, i: any) => si + Number(i.product?.costPrice ?? 0) * i.quantity, 0), 0);
    const todayExpenseTotal = Number(todayExpenses._sum?.amount ?? 0);
    const todayProfit    = todayRevenue - todayCOGS;
    const todayNetProfit = todayProfit - todayExpenseTotal;

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s: any) => { statusMap[s.status] = s._count; });

    const lowStock = inventoryRows.filter((r: any) => r.quantity > 0 && r.quantity <= r.lowStockAlert).length;
    const inventoryValue = inventoryRows.reduce((s: number, r: any) => s + r.quantity * Number(r.product.costPrice), 0);

    let topProduct: any = null;
    let topCategory: any = null;
    if (productTotals.length > 0) {
      const products: any[] = await prisma.product.findMany({
        where: { id: { in: productTotals.map((p: any) => p.productId) } },
        select: { id: true, name: true, sku: true, categoryId: true },
      });
      const byId = new Map(products.map((p: any) => [p.id, p]));
      const tp = byId.get(productTotals[0].productId);
      if (tp) topProduct = { id: (tp as any).id, name: (tp as any).name, sku: (tp as any).sku };

      const catTotals = new Map<string, number>();
      for (const row of productTotals) {
        const p: any = byId.get(row.productId);
        if (!p) continue;
        catTotals.set(p.categoryId, (catTotals.get(p.categoryId) ?? 0) + (row._sum?.quantity ?? 0));
      }
      const topCatId = [...catTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topCatId) {
        topCategory = await prisma.category.findUnique({ where: { id: topCatId }, select: { id: true, name: true } });
      }
    }

    const returningCustomers = todayOrdersForReturning.filter((o: any) => o.customer?.createdAt < todayStart).length;

    return {
      today: { sales: todayOrders.length, revenue: todayRevenue, orders: todayOrders.length,
        profit: todayProfit, expenses: todayExpenseTotal, netProfit: todayNetProfit },
      orderStatus: { pending: statusMap['PENDING'] ?? 0, confirmed: statusMap['CONFIRMED'] ?? 0,
        packed: statusMap['PACKED'] ?? 0, dispatched: statusMap['DISPATCHED'] ?? 0,
        delivered: statusMap['DELIVERED'] ?? 0, returned: statusMap['RETURNED'] ?? 0,
        cancelled: statusMap['CANCELLED'] ?? 0 },
      exchangeOrdersToday: exchangesToday,
      inventory: { lowStock, outOfStock, inventoryValue },
      topProduct, topCategory,
      customers: { new: newCustomers, returning: returningCustomers },
    };
  }

  // §2 — Sales Analytics
  async getSalesAnalytics(query: { preset?: string; startDate?: string; endDate?: string; granularity?: string }) {
    const range = resolveDateRange(query);
    const prev  = previousPeriod(range);
    const [current, previous] = await Promise.all([this.sumOrders(range), this.sumOrders(prev)]);
    const granularity = (query.granularity ??
      (this.daySpan(range) <= 31 ? 'daily' : this.daySpan(range) <= 120 ? 'weekly' : 'monthly')) as any;
    const chart = await this.buildSalesChart(range, granularity);
    return {
      range: { start: range.start, end: range.end, preset: range.preset },
      revenue: current.revenue, orders: current.orders,
      averageOrderValue: current.orders > 0 ? current.revenue / current.orders : 0,
      growth: { revenue: percentGrowth(current.revenue, previous.revenue),
        orders: percentGrowth(current.orders, previous.orders) },
      chart,
    };
  }

  private daySpan(r: DateRange) {
    return Math.ceil((r.end.getTime() - r.start.getTime()) / 86400000);
  }

  private async sumOrders(r: DateRange) {
    const agg: any = await prisma.order.aggregate({
      where: { createdAt: { gte: r.start, lte: r.end }, status: { notIn: EXCLUDE as any }, isTest: false },
      _sum: { grandTotal: true }, _count: true,
    });
    return { revenue: Number(agg._sum?.grandTotal ?? 0), orders: agg._count as number };
  }

  private async buildSalesChart(range: DateRange, granularity: 'daily' | 'weekly' | 'monthly' | 'yearly') {
    const orders: any[] = await prisma.order.findMany({
      where: { createdAt: { gte: range.start, lte: range.end }, status: { notIn: EXCLUDE as any }, isTest: false },
      select: { createdAt: true, grandTotal: true },
    });
    const buckets = new Map<string, { revenue: number; orders: number }>();
    const keyFor = (d: Date) => {
      if (granularity === 'daily') return d.toISOString().slice(0, 10);
      if (granularity === 'weekly') {
        const m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
        return `Week of ${m.toISOString().slice(0, 10)}`;
      }
      if (granularity === 'monthly') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return String(d.getFullYear());
    };
    for (const o of orders) {
      const key = keyFor(o.createdAt);
      const b = buckets.get(key) ?? { revenue: 0, orders: 0 };
      b.revenue += Number(o.grandTotal); b.orders += 1;
      buckets.set(key, b);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([label, v]) => ({ label, revenue: v.revenue, orders: v.orders }));
  }

  // §4 — Financial Dashboard
  async getFinancialDashboard(query: { preset?: string; startDate?: string; endDate?: string }) {
    const range = resolveDateRange(query);
    const orders: any[] = await prisma.order.findMany({
      where: { createdAt: { gte: range.start, lte: range.end }, status: { notIn: EXCLUDE as any }, isTest: false },
      include: { items: { include: { product: { select: { costPrice: true } } } } },
    });
    const revenue     = orders.reduce((s: number, o: any) => s + Number(o.grandTotal), 0);
    const productCost = orders.reduce((s: number, o: any) =>
      s + o.items.reduce((si: number, i: any) => si + Number(i.product?.costPrice ?? 0) * i.quantity, 0), 0);
    const grossProfit = revenue - productCost;
    const expAgg: any = await prisma.expense.aggregate({
      where: { date: { gte: range.start, lte: range.end } }, _sum: { amount: true },
    });
    const expenses  = Number(expAgg._sum?.amount ?? 0);
    const netProfit = grossProfit - expenses;
    const profitMargin = revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0;

    const now = new Date();
    const [monthlyProfit, yearlyProfit, trend] = await Promise.all([
      this.profitForRange({ start: new Date(now.getFullYear(), now.getMonth(), 1), end: now, preset: 'custom' }),
      this.profitForRange({ start: new Date(now.getFullYear(), 0, 1), end: now, preset: 'custom' }),
      this.profitTrend(12),
    ]);
    return { range: { start: range.start, end: range.end, preset: range.preset },
      revenue, productCost, grossProfit, expenses, netProfit, profitMargin,
      monthlyProfit, yearlyProfit, trend };
  }

  private async profitForRange(r: DateRange) {
    const orders: any[] = await prisma.order.findMany({
      where: { createdAt: { gte: r.start, lte: r.end }, status: { notIn: EXCLUDE as any }, isTest: false },
      include: { items: { include: { product: { select: { costPrice: true } } } } },
    });
    const revenue = orders.reduce((s: number, o: any) => s + Number(o.grandTotal), 0);
    const cost    = orders.reduce((s: number, o: any) =>
      s + o.items.reduce((si: number, i: any) => si + Number(i.product?.costPrice ?? 0) * i.quantity, 0), 0);
    const expAgg: any = await prisma.expense.aggregate({ where: { date: { gte: r.start, lte: r.end } }, _sum: { amount: true } });
    return revenue - cost - Number(expAgg._sum?.amount ?? 0);
  }

  private async profitTrend(months: number) {
    const now = new Date(); const points = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const profit = await this.profitForRange({ start, end, preset: 'custom' });
      points.push({ month: start.toLocaleString('en', { month: 'short', year: '2-digit' }), profit });
    }
    return points;
  }

  // §8 — Product Performance
  async getProductPerformance(query: { preset?: string; startDate?: string; endDate?: string; limit?: number }) {
    const range = resolveDateRange(query);
    const limit = Math.min(query.limit ?? 20, 100);
    const grouped: any[] = await prisma.orderItem.groupBy({
      by: ['productId' as any],
      where: { order: { createdAt: { gte: range.start, lte: range.end }, status: { notIn: EXCLUDE as any }, isTest: false } },
      _sum: { quantity: true, totalPrice: true },
    });
    const products: any[] = await prisma.product.findMany({
      where: { id: { in: grouped.map((g: any) => g.productId) } },
      select: { id: true, name: true, sku: true, costPrice: true, category: { select: { name: true } } },
    });
    const byId = new Map(products.map((p: any) => [p.id, p]));
    const rows = grouped.map((g: any) => {
      const p: any = byId.get(g.productId);
      const qty = g._sum?.quantity ?? 0;
      const revenue = Number(g._sum?.totalPrice ?? 0);
      const cost = Number(p?.costPrice ?? 0) * qty;
      const profit = revenue - cost;
      return { productId: g.productId, name: p?.name ?? 'Deleted', sku: p?.sku ?? '',
        category: p?.category?.name ?? '', quantitySold: qty, revenue, profit,
        profitMargin: revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0 };
    });
    return {
      range: { start: range.start, end: range.end, preset: range.preset },
      bestSelling:   [...rows].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, limit),
      worstSelling:  [...rows].sort((a, b) => a.quantitySold - b.quantitySold).slice(0, limit),
      highestProfit: [...rows].sort((a, b) => b.profit - a.profit).slice(0, limit),
      lowestProfit:  [...rows].sort((a, b) => a.profit - b.profit).slice(0, limit),
    };
  }

  // §9 — Category Analytics
  async getCategoryAnalytics(query: { preset?: string; startDate?: string; endDate?: string }) {
    const range = resolveDateRange(query);
    const prev  = previousPeriod(range);
    const [current, previous, categories] = await Promise.all([
      this.categoryTotals(range), this.categoryTotals(prev),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);
    const nameOf = (id: string) => (categories as any[]).find((c: any) => c.id === id)?.name ?? 'Uncategorised';
    const prevById = new Map((previous as any[]).map((p: any) => [p.categoryId, p]));
    const rows = (current as any[]).map((c: any) => ({
      categoryId: c.categoryId, name: nameOf(c.categoryId),
      revenue: c.revenue, profit: c.profit,
      growth: percentGrowth(c.revenue, (prevById.get(c.categoryId) as any)?.revenue ?? 0),
    })).sort((a, b) => b.revenue - a.revenue);
    return { range: { start: range.start, end: range.end, preset: range.preset },
      categories: rows, best: rows[0] ?? null, lowest: rows[rows.length - 1] ?? null };
  }

  private async categoryTotals(r: DateRange) {
    const items: any[] = await prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: r.start, lte: r.end }, status: { notIn: EXCLUDE as any }, isTest: false } },
      select: { quantity: true, totalPrice: true, product: { select: { categoryId: true, costPrice: true } } },
    });
    const map = new Map<string, { revenue: number; profit: number }>();
    for (const i of items) {
      const catId = (i.product as any)?.categoryId ?? 'UNKNOWN';
      const revenue = Number(i.totalPrice);
      const cost = Number((i.product as any)?.costPrice ?? 0) * i.quantity;
      const cur = map.get(catId) ?? { revenue: 0, profit: 0 };
      cur.revenue += revenue; cur.profit += revenue - cost;
      map.set(catId, cur);
    }
    return Array.from(map.entries()).map(([categoryId, v]) => ({ categoryId, ...v }));
  }

  // §10 — Customer Analytics
  async getCustomerAnalytics(query: { preset?: string; startDate?: string; endDate?: string }) {
    const range = resolveDateRange(query);
    const [newCustomers, ordersInRange, topBySpend, topByOrders] = await Promise.all([
      prisma.customer.count({ where: { createdAt: { gte: range.start, lte: range.end } } }),
      prisma.order.findMany({
        where: { createdAt: { gte: range.start, lte: range.end }, status: { notIn: EXCLUDE as any }, isTest: false },
        select: { customerId: true, grandTotal: true, customer: { select: { createdAt: true } } },
      }),
      prisma.customer.findMany({ orderBy: { totalSpent: 'desc' }, take: 10,
        select: { id: true, name: true, phone: true, totalSpent: true, totalOrders: true } }),
      prisma.customer.findMany({ orderBy: { totalOrders: 'desc' }, take: 10,
        select: { id: true, name: true, phone: true, totalSpent: true, totalOrders: true } }),
    ]);
    const rows = ordersInRange as any[];
    const ids = new Set(rows.map((o: any) => o.customerId));
    const returning = new Set(rows.filter((o: any) => o.customer?.createdAt < range.start).map((o: any) => o.customerId)).size;
    const spend = rows.reduce((s: number, o: any) => s + Number(o.grandTotal), 0);
    return { range: { start: range.start, end: range.end, preset: range.preset },
      newCustomers, returningCustomers: returning, activeCustomers: ids.size,
      averageCustomerValue: ids.size > 0 ? spend / ids.size : 0, topBySpend, topByOrders };
  }

  // §11 — Delivery Analytics
  async getDeliveryAnalytics(query: { preset?: string; startDate?: string; endDate?: string }) {
    const range = resolveDateRange(query);
    const where = { createdAt: { gte: range.start, lte: range.end } };
    const [delivered, returned, cancelled, exchanges, total, courierAgg] = await Promise.all([
      prisma.order.count({ where: { ...where, status: 'DELIVERED' as any } }),
      prisma.order.count({ where: { ...where, status: 'RETURNED' as any } }),
      prisma.order.count({ where: { ...where, status: 'CANCELLED' as any } }),
      prisma.exchange.count({ where }),
      prisma.order.count({ where }),
      prisma.order.aggregate({ where, _sum: { courierCost: true } }),
    ]);
    return { range: { start: range.start, end: range.end, preset: range.preset },
      delivered, returned, cancelled, exchanges, total,
      deliverySuccessRate: total > 0 ? Math.round((delivered / total) * 10000) / 100 : 0,
      courierCost: Number((courierAgg as any)._sum?.courierCost ?? 0) };
  }

  // §7/§18 — Inventory Reports
  async getInventoryReports() {
    const inventories: any[] = await prisma.inventory.findMany({
      where: { product: { isDeleted: false } },
      include: { product: { select: { id: true, name: true, sku: true, costPrice: true, totalSold: true } } },
    });
    const totalStockValue = inventories.reduce((s: number, i: any) => s + i.quantity * Number(i.product.costPrice), 0);
    const totalUnits = inventories.reduce((s: number, i: any) => s + i.quantity, 0);
    const withStock = inventories.filter((i: any) => i.quantity > 0);
    const fastMoving = [...withStock].sort((a: any, b: any) => b.product.totalSold - a.product.totalSold).slice(0, 15)
      .map((i: any) => ({ productId: i.productId, name: i.product.name, sku: i.product.sku, totalSold: i.product.totalSold, currentStock: i.quantity }));
    const slowMoving = [...withStock].sort((a: any, b: any) => a.product.totalSold - b.product.totalSold).slice(0, 15)
      .map((i: any) => ({ productId: i.productId, name: i.product.name, sku: i.product.sku, totalSold: i.product.totalSold, currentStock: i.quantity }));
    const variantStock: any[] = await prisma.variant.findMany({
      where: { isDeleted: false, isActive: true },
      select: { id: true, name: true, value: true, sku: true, stock: true, lowStockAlert: true, product: { select: { name: true } } },
      orderBy: { stock: 'asc' }, take: 50,
    });
    return {
      inventoryValue: totalStockValue, averageCost: totalUnits > 0 ? totalStockValue / totalUnits : 0,
      totalStockValue, totalUnits,
      lowStockCount: inventories.filter((i: any) => i.quantity > 0 && i.quantity <= i.lowStockAlert).length,
      outOfStockCount: inventories.filter((i: any) => i.quantity === 0).length,
      fastMoving, slowMoving, variantStock,
    };
  }
}

export const analyticsService = new AnalyticsService();
