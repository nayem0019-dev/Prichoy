/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { PaginationQuery } from '../types';

export class SupplierService {
  async getAll(filter: PaginationQuery & { isActive?: string }) {
    const { skip, take, page, limit } = getPaginationParams(filter);
    const where: any = {};
    if (filter.isActive !== undefined) where.isActive = filter.isActive === 'true';
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { phone: { contains: filter.search } },
        { email: { contains: filter.search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          _count: { select: { products: true, purchases: true } },
        },
        orderBy: { name: 'asc' },
        skip, take,
      }),
      prisma.supplier.count({ where }),
    ]);

    // Purchase value per supplier — computed alongside rather than in a
    // nested aggregate, since Prisma can't sum a related model's field
    // inline in findMany.
    const purchaseValues: any[] = await prisma.purchase.groupBy({
      by: ['supplierId' as any],
      where: { supplierId: { in: suppliers.map((s: any) => s.id) } },
      _sum: { totalAmount: true },
    });
    const valueBySupplier = new Map(purchaseValues.map((p: any) => [p.supplierId, Number(p._sum?.totalAmount ?? 0)]));

    return {
      suppliers: (suppliers as any[]).map((s: any) => ({ ...s, totalPurchaseValue: valueBySupplier.get(s.id) ?? 0 })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        products: { select: { id: true, name: true, sku: true }, take: 50 },
        purchases: { orderBy: { createdAt: 'desc' }, take: 50, include: { items: true } },
      },
    });
    if (!supplier) throw new AppError('Supplier not found', HTTP_STATUS.NOT_FOUND);
    return supplier;
  }

  async create(data: { name: string; phone?: string; email?: string; address?: string; notes?: string }) {
    return prisma.supplier.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; phone: string; email: string; address: string; notes: string; isActive: boolean }>) {
    await this.getById(id);
    return prisma.supplier.update({ where: { id }, data });
  }

  async delete(id: string) {
    const supplier = await this.getById(id);
    if (supplier.products.length > 0) {
      // Soft-disable rather than hard-delete when products still reference
      // this supplier — deleting would either orphan Product.supplierId
      // (if nullable, which it is) silently losing sourcing history, or
      // fail on FK constraints depending on DB settings. Deactivating
      // keeps the purchase-history/product link intact for reporting.
      return prisma.supplier.update({ where: { id }, data: { isActive: false } });
    }
    return prisma.supplier.delete({ where: { id } });
  }
}

export const supplierService = new SupplierService();
