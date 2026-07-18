import { prisma } from '../config/database';

export class ReportService {
  async getSalesSummary(startDate: Date, endDate: Date) {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
      include: { items: true },
    });

    const totalOrders    = orders.length;
    const totalRevenue   = orders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const totalItems     = orders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0);
    const averageOrder   = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const expenses       = await prisma.expense.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    });
    const totalExpenses  = Number(expenses._sum.amount ?? 0);

    const costOfGoods    = orders.reduce((s, o) =>
      s + o.items.reduce((si, i) => si + Number(i.unitPrice) * i.quantity, 0), 0
    );
    const netProfit      = totalRevenue - totalExpenses - costOfGoods;

    return {
      totalOrders, totalRevenue, totalItems,
      averageOrder, totalExpenses, netProfit,
      period: { start: startDate, end: endDate },
    };
  }

  async getOrdersByStatus(startDate: Date, endDate: Date) {
    const statuses = ['PENDING','CONFIRMED','PACKED','DISPATCHED','DELIVERED','CANCELLED','RETURNED','REFUNDED'];
    const results = await Promise.all(
      statuses.map(async (status) => {
        const [count, revenue] = await Promise.all([
          prisma.order.count({
            where: { status: status as never, createdAt: { gte: startDate, lte: endDate } },
          }),
          prisma.order.aggregate({
            where: { status: status as never, createdAt: { gte: startDate, lte: endDate } },
            _sum: { grandTotal: true },
          }),
        ]);
        return { status, count, revenue: Number(revenue._sum.grandTotal ?? 0) };
      })
    );
    return results;
  }

  async getProductPerformance(startDate: Date, endDate: Date, limit = 20) {
    const items = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products   = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, images: { where: { isPrimary: true }, take: 1 } },
    });

    return items.map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.productId),
    }));
  }

  async getCourierPerformance(startDate: Date, endDate: Date) {
    const couriers = await prisma.courier.findMany({ where: { isActive: true } });

    const stats = await Promise.all(
      couriers.map(async (courier) => {
        const [total, delivered, returned] = await Promise.all([
          prisma.order.count({ where: { courierId: courier.id, createdAt: { gte: startDate, lte: endDate } } }),
          prisma.order.count({ where: { courierId: courier.id, status: 'DELIVERED', createdAt: { gte: startDate, lte: endDate } } }),
          prisma.order.count({ where: { courierId: courier.id, status: 'RETURNED', createdAt: { gte: startDate, lte: endDate } } }),
        ]);
        return {
          courier: courier.name,
          total, delivered, returned,
          successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        };
      })
    );
    return stats;
  }

  async getMonthlyRevenue(year: number) {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const data = await Promise.all(
      months.map(async (month) => {
        const start = new Date(year, month, 1);
        const end   = new Date(year, month + 1, 0, 23, 59, 59);
        const agg = await prisma.order.aggregate({
          where: { status: 'DELIVERED', createdAt: { gte: start, lte: end } },
          _sum: { grandTotal: true },
          _count: true,
        });
        return {
          month: new Date(year, month).toLocaleString('en', { month: 'short' }),
          revenue: Number(agg._sum.grandTotal ?? 0),
          orders: agg._count,
        };
      })
    );
    return data;
  }

  async getInventoryReport() {
    const [totalProducts, outOfStock, lowStock, totalValue] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.inventory.count({ where: { quantity: 0 } }),
      prisma.inventory.count({ where: { quantity: { gt: 0, lte: 10 } } }),
      prisma.inventory.findMany({
        include: { product: { select: { costPrice: true } } },
      }).then((inv) =>
        inv.reduce((sum, i) => sum + (Number(i.product.costPrice) * i.quantity), 0)
      ),
    ]);
    return { totalProducts, outOfStock, lowStock, totalValue };
  }

  async getExpenseReport(startDate: Date, endDate: Date) {
    const expenses = await prisma.expense.groupBy({
      by: ['category'],
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });
    const total = expenses.reduce((s, e) => s + Number(e._sum.amount ?? 0), 0);
    return { expenses, total };
  }
}

export const reportService = new ReportService();
