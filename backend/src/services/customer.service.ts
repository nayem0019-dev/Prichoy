import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { getPaginationParams, buildPaginationMeta, toBool } from '../utils/pagination';
import { PaginationQuery } from '../types';

export class CustomerService {
  async getAll(filter: PaginationQuery & { tag?: string; isBlocked?: boolean; isFraudRisk?: boolean; includeDeleted?: boolean }) {
    const { skip, take, page, limit } = getPaginationParams(filter);
    const where: Prisma.CustomerWhereInput = {};
    if (!filter.includeDeleted) where.isDeleted = false;

    if (filter.tag)                    where.tag       = filter.tag as Prisma.EnumCustomerTagFilter;
    const isBlocked = toBool(filter.isBlocked);
    if (isBlocked !== undefined) where.isBlocked = isBlocked;
    // Phase 2 §16 — lets the admin panel filter straight to flagged customers.
    const isFraudRisk = toBool(filter.isFraudRisk);
    if (isFraudRisk !== undefined) where.isFraudRisk = isFraudRisk;

    if (filter.search) {
      where.OR = [
        { name:  { contains: filter.search } },
        { phone: { contains: filter.search } },
        { email: { contains: filter.search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { orders: true } }, addresses: true },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        tags: true,
        customerNotes: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: { take: 3 } },
        },
      },
    });
    if (!customer || customer.isDeleted) throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND);

    // Phase 3 §15 — Cancellation Rate / Return Rate. Computed from the
    // already-maintained cancelledOrders/returnedOrders/totalOrders
    // counters (Phase 2 §16's fraud.service.ts keeps these current) rather
    // than adding yet another cached field that could drift out of sync.
    const cancellationRate = customer.totalOrders > 0
      ? Math.round((customer.cancelledOrders / customer.totalOrders) * 10000) / 100
      : 0;
    const returnRate = customer.totalOrders > 0
      ? Math.round((customer.returnedOrders / customer.totalOrders) * 10000) / 100
      : 0;

    return { ...customer, cancellationRate, returnRate };
  }

  /**
   * Phase 2 §18 — customers are never hard-deleted (they're referenced by
   * Order.customerId, and orders themselves must never disappear either).
   * This just flips the soft-delete flags and hides them from default list
   * views; the row and all order history stay intact.
   */
  async softDelete(id: string, adminId: string) {
    await this.getById(id);
    return prisma.customer.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId },
    });
  }

  async restore(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new AppError('Customer not found', HTTP_STATUS.NOT_FOUND);
    return prisma.customer.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null, deletedBy: null },
    });
  }

  /** Phase 2 §16 — customers currently flagged as a fraud risk, for the admin warning list. */
  async getFraudRisks(limit = 50) {
    return prisma.customer.findMany({
      where: { isFraudRisk: true, isDeleted: false },
      orderBy: { cancelledOrders: 'desc' },
      take: limit,
      select: {
        id: true, name: true, phone: true, email: true,
        totalOrders: true, cancelledOrders: true, returnedOrders: true, isBlocked: true,
      },
    });
  }

  async findOrCreate(data: {
    name: string; phone: string; email?: string;
    address?: string; thana?: string; district?: string;
  }) {
    const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
    if (existing) return existing;

    return prisma.customer.create({
      data: {
        name: data.name, phone: data.phone, email: data.email,
        addresses: data.address ? {
          create: {
            line1: data.address,
            thana: data.thana ?? '',
            district: data.district ?? '',
            isDefault: true,
          },
        } : undefined,
      },
      include: { addresses: true },
    });
  }

  async update(id: string, data: Partial<{
    name: string; email: string; notes: string;
    tag: string; isBlocked: boolean; blockReason: string;
  }>) {
    await this.getById(id);
    return prisma.customer.update({
      where: { id },
      data: data as Prisma.CustomerUpdateInput,
    });
  }

  async addNote(id: string, note: string) {
    await this.getById(id);
    return prisma.customer.update({ where: { id }, data: { notes: note } });
  }

  async block(id: string, reason: string, adminId?: string) {
    await this.getById(id);
    return prisma.customer.update({
      where: { id },
      data: { isBlocked: true, blockReason: reason, blockedById: adminId, blockedAt: new Date(), tag: 'BLOCKED' },
    });
  }

  async unblock(id: string, adminId?: string) {
    await this.getById(id);
    return prisma.customer.update({
      where: { id },
      data: { isBlocked: false, blockReason: null, blockedById: null, blockedAt: null, tag: 'REGULAR' },
    });
  }

  // ── Phase 3 §16 — multi-tag support (additive to the legacy single `tag`) ──
  async setTags(id: string, tags: string[]) {
    await this.getById(id);
    await prisma.$transaction([
      prisma.customerTagAssignment.deleteMany({ where: { customerId: id } }),
      ...tags.map((tag) =>
        prisma.customerTagAssignment.create({ data: { customerId: id, tag: tag as Prisma.CustomerTag } })
      ),
    ]);
    return prisma.customerTagAssignment.findMany({ where: { customerId: id } });
  }

  // ── Phase 3 §17 — Internal Customer Notes (structured, admin-only) ──
  // Kept separate from the legacy addNote()/notes column above (still
  // used, untouched) for the same reason OrderNote was added alongside
  // Order.adminNotes in Phase 2.1: multiple notes with per-note Created
  // By/Created Time/Last Updated can't live in one overwritable column.
  async addInternalNote(customerId: string, note: string, adminId: string) {
    await this.getById(customerId);
    return prisma.customerNote.create({
      data: { customerId, note, createdById: adminId },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async updateInternalNote(customerId: string, noteId: string, note: string) {
    const existing = await prisma.customerNote.findUnique({ where: { id: noteId } });
    if (!existing || existing.customerId !== customerId) {
      throw new AppError('Note not found', HTTP_STATUS.NOT_FOUND);
    }
    return prisma.customerNote.update({
      where: { id: noteId },
      data: { note },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async getTopCustomers(limit = 10) {
    return prisma.customer.findMany({
      where: { isBlocked: false },
      orderBy: { totalSpent: 'desc' },
      take: limit,
      select: {
        id: true, name: true, phone: true, email: true,
        totalOrders: true, totalSpent: true, tag: true, lastOrderAt: true,
      },
    });
  }

  async getStats() {
    const [total, vip, blocked, newCustomers] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { tag: 'VIP' } }),
      prisma.customer.count({ where: { isBlocked: true } }),
      prisma.customer.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);
    return { total, vip, blocked, newThisMonth: newCustomers };
  }
}

export const customerService = new CustomerService();
