import { prisma } from '../config/database';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrderFilterQuery } from '../types';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';

const ORDER_INCLUDE = {
  customer:  { select: { id:true, name:true, phone:true, email:true, isFraudRisk:true, tag:true } },
  address:   true,
  items: {
    include: {
      product: { select: { id:true, name:true, sku:true } },
      variant: { select: { id:true, name:true, value:true } },
    },
  },
  courier:   { select: { id:true, name:true, website:true } },
  payment:   true,
  history: {
    include: { admin: { select: { id:true, name:true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  refund: true,
  return: true,
  verifiedByAdmin: { select: { id:true, name:true } },
  emailLogs: { orderBy: { createdAt: 'desc' as const } },
  // Phase 2.1 Task 2 — internal-only; never selected by the public
  // track.controller.ts queries (findForTracking/findForTrackingByToken
  // use their own narrow `select`, not this include).
  orderNotes: {
    include: { createdBy: { select: { id:true, name:true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  // Phase 2.1 Task 3 — ordered newest-first so callers can treat
  // contactLogs[0] as "latest contact result" (used in the order list)
  // while the full array serves the order-detail contact history.
  contactLogs: {
    include: { staff: { select: { id:true, name:true } } },
    orderBy: { contactedAt: 'desc' as const },
  },
} satisfies Prisma.OrderInclude;

export class OrderRepository {
  async findAll(filter: OrderFilterQuery & { includeDeleted?: boolean }) {
    const { skip, take, page, limit } = getPaginationParams(filter);

    const where: Prisma.OrderWhereInput = {};
    if (!filter.includeDeleted) where.isDeleted = false;

    if (filter.status)        where.status        = filter.status as OrderStatus;
    if (filter.paymentStatus) where.paymentStatus = filter.paymentStatus as Prisma.EnumPaymentStatusFilter;
    if (filter.courierId)     where.courierId     = filter.courierId;
    if (filter.customerId)    where.customerId    = filter.customerId;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate)   where.createdAt.lte = new Date(filter.endDate + 'T23:59:59');
    }

    if (filter.search) {
      where.OR = [
        { orderNo:      { contains: filter.search } },
        { invoiceNo:    { contains: filter.search } },
        { trackingNumber: { contains: filter.search } },
        { shippingPhone: { contains: filter.search } },
        { customer: { name:  { contains: filter.search } } },
        { customer: { phone: { contains: filter.search } } },
        { customer: { email: { contains: filter.search } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  }

  /**
   * Lightweight fetch (order + items only, no deep joins) for internal
   * mutation paths — status transitions, stock reduce/restore — that need
   * order.items but not the full detail-page include tree.
   */
  async findByIdRaw(id: string) {
    return prisma.order.findUnique({ where: { id }, include: { items: true } });
  }

  async findByOrderNo(orderNo: string) {
    return prisma.order.findUnique({ where: { orderNo }, include: ORDER_INCLUDE });
  }

  /**
   * Phase 2 §10 — public order tracking. Requires BOTH the order number
   * AND the shipping phone number to match (constant-time-ish via a
   * single WHERE, not two sequential lookups) so a guessed order number
   * alone never reveals another customer's order.
   */
  async findForTracking(orderNo: string, phone: string) {
    return prisma.order.findFirst({
      where: { orderNo, shippingPhone: phone, isDeleted: false },
      select: {
        orderNo: true, status: true, trackingNumber: true, estimatedDelivery: true,
        dispatchedAt: true, deliveredAt: true, createdAt: true,
        courier: { select: { name: true } },
        history: {
          select: { status: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /** Same data, looked up by the opaque tracking token used in emails/QR codes. */
  async findForTrackingByToken(token: string) {
    return prisma.order.findFirst({
      where: { trackingToken: token, isDeleted: false },
      select: {
        orderNo: true, status: true, trackingNumber: true, estimatedDelivery: true,
        dispatchedAt: true, deliveredAt: true, createdAt: true,
        courier: { select: { name: true } },
        history: {
          select: { status: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async create(data: Prisma.OrderCreateInput) {
    return prisma.order.create({ data, include: ORDER_INCLUDE });
  }

  async update(id: string, data: Prisma.OrderUpdateInput) {
    return prisma.order.update({ where: { id }, data, include: ORDER_INCLUDE });
  }

  async addHistory(data: {
    orderId: string;
    status: OrderStatus;
    adminId?: string;
    note?: string;
    ip?: string;
  }) {
    return prisma.orderHistory.create({ data });
  }

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart  = new Date(today.getFullYear(), 0, 1);

    const [
      totalOrders, todayOrders, pendingOrders,
      confirmedOrders, packedOrders, dispatchedOrders,
      deliveredOrders, cancelledOrders, returnedOrders,
      refundedOrders,
    ] = await Promise.all([
      prisma.order.count({ where: { isDeleted: false } }),
      prisma.order.count({ where: { isDeleted: false, createdAt: { gte: today, lte: todayEnd } } }),
      prisma.order.count({ where: { isDeleted: false, status: 'PENDING' } }),
      prisma.order.count({ where: { isDeleted: false, status: 'CONFIRMED' } }),
      prisma.order.count({ where: { isDeleted: false, status: 'PACKED' } }),
      prisma.order.count({ where: { isDeleted: false, status: 'DISPATCHED' } }),
      prisma.order.count({ where: { isDeleted: false, status: 'DELIVERED' } }),
      prisma.order.count({ where: { isDeleted: false, status: 'CANCELLED' } }),
      prisma.order.count({ where: { isDeleted: false, status: 'RETURNED' } }),
      prisma.order.count({ where: { isDeleted: false, status: 'REFUNDED' } }),
    ]);

    const [todayRevenue, monthRevenue, yearRevenue, totalRevenue] = await Promise.all([
      prisma.order.aggregate({
        where: { isDeleted: false, status: 'DELIVERED', createdAt: { gte: today, lte: todayEnd } },
        _sum: { grandTotal: true },
      }),
      prisma.order.aggregate({
        where: { isDeleted: false, status: 'DELIVERED', createdAt: { gte: monthStart } },
        _sum: { grandTotal: true },
      }),
      prisma.order.aggregate({
        where: { isDeleted: false, status: 'DELIVERED', createdAt: { gte: yearStart } },
        _sum: { grandTotal: true },
      }),
      prisma.order.aggregate({
        where: { isDeleted: false, status: 'DELIVERED' },
        _sum: { grandTotal: true },
      }),
    ]);

    return {
      orders: {
        total: totalOrders, today: todayOrders,
        pending: pendingOrders, confirmed: confirmedOrders,
        packed: packedOrders, dispatched: dispatchedOrders,
        delivered: deliveredOrders, cancelled: cancelledOrders,
        returned: returnedOrders, refunded: refundedOrders,
      },
      revenue: {
        today:  Number(todayRevenue._sum.grandTotal  || 0),
        month:  Number(monthRevenue._sum.grandTotal  || 0),
        year:   Number(yearRevenue._sum.grandTotal   || 0),
        total:  Number(totalRevenue._sum.grandTotal  || 0),
      },
    };
  }

  async getRecentOrders(limit = 10) {
    return prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id:true, name:true, phone:true } },
        courier:  { select: { id:true, name:true } },
      },
    });
  }

  async getSalesChart(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: { gte: startDate },
      },
      select: { grandTotal: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate: Record<string, number> = {};
    orders.forEach((o) => {
      const key = o.createdAt.toISOString().split('T')[0];
      byDate[key] = (byDate[key] || 0) + Number(o.grandTotal);
    });

    return Object.entries(byDate).map(([date, total]) => ({ date, total }));
  }

  async bulkUpdateStatus(orderIds: string[], status: OrderStatus, adminId?: string) {
    const result = await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status },
      });
      await tx.orderHistory.createMany({
        data: orderIds.map((orderId) => ({
          orderId, status, adminId,
          note: `Bulk status update to ${status}`,
        })),
      });
      return orderIds.length;
    });
    return result;
  }
}

export const orderRepository = new OrderRepository();
