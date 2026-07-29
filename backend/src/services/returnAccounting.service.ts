/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 4 §12-15 — Return Accounting + Exchange Management
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { PaginationQuery } from '../types';

// ================================================================
// §12-14 — Return Accounting
// ================================================================

export interface ReturnAccountingInput {
  reason: string;
  condition: 'Unopened' | 'Good' | 'Damaged' | 'Unsellable';
  note?: string;
  images?: string[];
  restockItems?: boolean;
  outboundCharge?: number;
  outboundPaidBy?: 'CUSTOMER' | 'BUSINESS';
  returnCharge?: number;
  returnPaidBy?: 'CUSTOMER' | 'BUSINESS';
  packagingCost?: number;
  recoverable?: boolean;
  recoveryAction?: 'SELL_AGAIN' | 'SELL_DISCOUNTED' | 'DAMAGED' | 'DESTROYED';
  resaleValue?: number;
  returnedById?: string;
}

function calcLoss(input: ReturnAccountingInput, productCost: number): number {
  let loss = 0;
  if (input.outboundPaidBy === 'BUSINESS') loss += input.outboundCharge ?? 0;
  if (input.returnPaidBy === 'BUSINESS')   loss += input.returnCharge ?? 0;
  if (input.recoverable === false)          loss += input.packagingCost ?? 0;
  if (input.recoveryAction === 'DAMAGED' || input.recoveryAction === 'DESTROYED' || input.condition === 'Unsellable') {
    loss += productCost;
  } else if (input.recoveryAction === 'SELL_DISCOUNTED') {
    loss += Math.max(0, productCost - (input.resaleValue ?? 0));
  }
  return Math.round(loss * 100) / 100;
}

export class ReturnAccountingService {
  async upsert(orderId: string, input: ReturnAccountingInput) {
    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { costPrice: true } } } } },
    });
    if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    const totalProductCost = order.items.reduce(
      (s: number, i: any) => s + Number(i.product?.costPrice ?? 0) * i.quantity, 0);
    const totalLoss = calcLoss(input, totalProductCost);

    // Prisma accepts plain numbers for Decimal columns — no Prisma.Decimal wrapper needed.
    const data: any = {
      reason: input.reason, condition: input.condition, note: input.note,
      images: input.images ? JSON.stringify(input.images) : undefined,
      restockItems: input.restockItems ?? true,
      returnedById: input.returnedById, returnedAt: new Date(),
      outboundCharge: input.outboundCharge ?? null,
      outboundPaidBy: input.outboundPaidBy ?? null,
      returnCharge: input.returnCharge ?? null,
      returnPaidBy: input.returnPaidBy ?? null,
      packagingCost: input.packagingCost ?? null,
      recoverable: input.recoverable ?? null,
      recoveryAction: input.recoveryAction ?? null,
      resaleValue: input.resaleValue ?? null,
      totalLoss,
    };

    return prisma.return.upsert({
      where: { orderId },
      create: { orderId, ...data },
      update: data,
    });
  }

  async getByOrder(orderId: string) {
    return prisma.return.findUnique({ where: { orderId } });
  }

  async list(filter: PaginationQuery) {
    const { skip, take, page, limit } = getPaginationParams(filter);
    const where: any = {};
    if (filter.search) where.order = { OR: [{ orderNumber: { contains: filter.search } }] };
    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: { order: { select: { orderNumber: true, grandTotal: true, customer: { select: { name: true, phone: true } } } } },
      }),
      prisma.return.count({ where }),
    ]);
    return { returns, meta: buildPaginationMeta(total, page, limit) };
  }
}
export const returnAccountingService = new ReturnAccountingService();

// ================================================================
// §15 — Exchange Order Management
// ================================================================

export class ExchangeService {
  async create(orderId: string, input: {
    originalItemId?: string; requestedSize?: string; requestedColor?: string;
    requestedVariantId?: string; courierCharge?: number; courierPaidBy?: 'CUSTOMER' | 'BUSINESS';
    adminNotes?: string; createdById?: string;
  }) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    const existing = await prisma.exchange.findUnique({ where: { orderId } });
    if (existing) throw new AppError('Exchange already exists for this order', HTTP_STATUS.CONFLICT);

    if (input.requestedVariantId) {
      const variant: any = await prisma.variant.findUnique({ where: { id: input.requestedVariantId } });
      if (!variant) throw new AppError('Replacement variant not found', HTTP_STATUS.NOT_FOUND);
      if (variant.stock - variant.reserved <= 0) throw new AppError('Replacement variant out of stock', HTTP_STATUS.CONFLICT);
      await prisma.variant.update({ where: { id: input.requestedVariantId }, data: { reserved: { increment: 1 } } });
    }

    const exchange: any = await prisma.exchange.create({
      data: {
        orderId, originalItemId: input.originalItemId,
        requestedSize: input.requestedSize, requestedColor: input.requestedColor,
        requestedVariantId: input.requestedVariantId,
        courierCharge: input.courierCharge ?? null,
        courierPaidBy: (input.courierPaidBy as any) ?? null,
        adminNotes: input.adminNotes, createdById: input.createdById,
        reservedAt: input.requestedVariantId ? new Date() : null,
      },
    });
    await prisma.exchangeHistory.create({
      data: { exchangeId: exchange.id, status: 'REQUESTED' as any, note: 'Exchange requested', adminId: input.createdById },
    });
    return exchange;
  }

  async updateStatus(id: string, input: {
    status: 'APPROVED' | 'REJECTED' | 'REPLACEMENT_SHIPPED' | 'COMPLETED';
    note?: string; rejectedReason?: string; adminId?: string;
  }) {
    const exchange: any = await prisma.exchange.findUnique({ where: { id } });
    if (!exchange) throw new AppError('Exchange not found', HTTP_STATUS.NOT_FOUND);
    const extra: any = {};
    if (input.status === 'APPROVED')              extra.returnReceivedAt = new Date();
    if (input.status === 'REPLACEMENT_SHIPPED')   extra.replacementShippedAt = new Date();
    if (input.status === 'COMPLETED')             extra.completedAt = new Date();
    if (input.status === 'REJECTED') {
      extra.rejectedReason = input.rejectedReason;
      if (exchange.requestedVariantId) {
        await prisma.variant.update({ where: { id: exchange.requestedVariantId }, data: { reserved: { decrement: 1 } } });
      }
    }
    const [updated] = await prisma.$transaction([
      prisma.exchange.update({ where: { id }, data: { status: input.status as any, ...extra } }),
      prisma.exchangeHistory.create({ data: { exchangeId: id, status: input.status as any, note: input.note, adminId: input.adminId } }),
    ]);
    return updated;
  }

  async list(filter: PaginationQuery & { status?: string }) {
    const { skip, take, page, limit } = getPaginationParams(filter);
    const where: any = {};
    if (filter.status && filter.status !== 'ALL') where.status = filter.status;
    if (filter.search) where.order = { OR: [{ orderNumber: { contains: filter.search } }] };
    const [exchanges, total] = await Promise.all([
      prisma.exchange.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: {
          order: { select: { orderNumber: true, customer: { select: { name: true, phone: true } } } },
          requestedVariant: { select: { name: true, value: true } },
          history: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.exchange.count({ where }),
    ]);
    return { exchanges, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const exchange = await prisma.exchange.findUnique({
      where: { id },
      include: {
        order: { include: { items: true, customer: true } },
        requestedVariant: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!exchange) throw new AppError('Exchange not found', HTTP_STATUS.NOT_FOUND);
    return exchange;
  }
}
export const exchangeService = new ExchangeService();
