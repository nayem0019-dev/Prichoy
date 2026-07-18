import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { ProductFilterQuery } from '../types';
import { getPaginationParams, buildPaginationMeta, toBool } from '../utils/pagination';

const PRODUCT_INCLUDE = {
  category:  { select: { id:true, name:true, slug:true, parentId:true } },
  brand:     { select: { id:true, name:true } },
  supplier:  { select: { id:true, name:true } },
  images:    { orderBy: { order: 'asc' as const } },
  variants:  { where: { isDeleted: false }, include: { color: true } },
  colors:    { include: { images: { orderBy: { order: 'asc' as const } } }, orderBy: { displayOrder: 'asc' as const } },
  labels:    true,
  collections: { include: { collection: { select: { id:true, name:true, slug:true } } } },
  sizeGuide: true,
  inventories: {
    include: { warehouse: { select: { id:true, name:true } } },
  },
} satisfies Prisma.ProductInclude;

export class ProductRepository {
  async findAll(filter: ProductFilterQuery & { includeDeleted?: boolean }) {
    const { skip, take, page, limit } = getPaginationParams(filter);
    const where: Prisma.ProductWhereInput = {};
    if (!filter.includeDeleted) where.isDeleted = false;

    if (filter.categoryId)          where.categoryId = filter.categoryId;
    if (filter.brandId)             where.brandId    = filter.brandId;
    if (filter.gender)              where.gender     = filter.gender as Prisma.EnumGenderFilter;
    const isActive = toBool(filter.isActive);
    if (isActive !== undefined) where.isActive = isActive;
    if (filter.status)              where.status     = filter.status as Prisma.EnumProductStatusFilter;
    const isFeatured = toBool(filter.isFeatured);
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    // Phase 3 §9 — search by product name/SKU/barcode (pre-existing) PLUS
    // variant SKU/barcode and product label, which the search previously
    // couldn't reach at all.
    if (filter.search) {
      where.OR = [
        { name:    { contains: filter.search } },
        { sku:     { contains: filter.search } },
        { barcode: { contains: filter.search } },
        { variants: { some: { OR: [
          { sku:     { contains: filter.search } },
          { barcode: { contains: filter.search } },
        ] } } },
      ];
    }

    if (filter.label) {
      where.labels = { some: { label: filter.label as Prisma.EnumProductLabelFilter } };
    }

    // Phase 3 §10 — stock status filter. LOW_STOCK/OUT_OF_STOCK reuse the
    // same per-row lowStockAlert threshold as the inventory dashboard/alerts
    // (see inventory.service.ts) rather than a second hardcoded number.
    if (filter.stockStatus === 'OUT_OF_STOCK') {
      where.inventories = { some: { quantity: 0 } };
    } else if (filter.stockStatus === 'LOW_STOCK') {
      where.inventories = { some: { quantity: { gt: 0, lte: prisma.inventory.fields.lowStockAlert } } };
    } else if (filter.stockStatus === 'IN_STOCK') {
      where.inventories = { some: { quantity: { gt: prisma.inventory.fields.lowStockAlert } } };
    } else if (toBool(filter.lowStock)) {
      // Backward compatible — the original boolean flag still works exactly as before.
      where.inventories = { some: { quantity: { lte: prisma.inventory.fields.lowStockAlert } } };
    }

    if (filter.createdFrom || filter.createdTo) {
      where.createdAt = {};
      if (filter.createdFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filter.createdFrom);
      if (filter.createdTo)   (where.createdAt as Prisma.DateTimeFilter).lte = new Date(filter.createdTo + 'T23:59:59');
    }
    if (filter.updatedFrom || filter.updatedTo) {
      where.updatedAt = {};
      if (filter.updatedFrom) (where.updatedAt as Prisma.DateTimeFilter).gte = new Date(filter.updatedFrom);
      if (filter.updatedTo)   (where.updatedAt as Prisma.DateTimeFilter).lte = new Date(filter.updatedTo + 'T23:59:59');
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (filter.sortBy === 'name')      orderBy.name      = filter.sortOrder ?? 'asc';
    else if (filter.sortBy === 'price') orderBy.sellingPrice = filter.sortOrder ?? 'asc';
    else if (filter.sortBy === 'sold')  orderBy.totalSold   = filter.sortOrder ?? 'desc';
    else                                orderBy.createdAt   = 'desc';

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: PRODUCT_INCLUDE, orderBy, skip, take }),
      prisma.product.count({ where }),
    ]);

    return { products, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
  }

  async findBySku(sku: string) {
    return prisma.product.findUnique({ where: { sku }, include: PRODUCT_INCLUDE });
  }

  async create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data, include: PRODUCT_INCLUDE });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data, include: PRODUCT_INCLUDE });
  }

  async delete(id: string) {
    return prisma.product.delete({ where: { id } });
  }

  async getLowStock(threshold = 10) {
    return prisma.product.findMany({
      where: {
        isActive: true,
        inventories: { some: { quantity: { lte: threshold }, } },
      },
      include: {
        ...PRODUCT_INCLUDE,
        inventories: { include: { warehouse: true } },
      },
      take: 50,
    });
  }

  async getTopSelling(limit = 10) {
    return prisma.product.findMany({
      where: { isActive: true },
      orderBy: { totalSold: 'desc' },
      take: limit,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { name: true } },
      },
    });
  }

  async addImage(productId: string, data: { url: string; thumbnailUrl?: string; webpUrl?: string; alt?: string; isPrimary?: boolean }) {
    if (data.isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }
    return prisma.productImage.create({ data: { productId, ...data } });
  }

  async deleteImage(id: string) {
    return prisma.productImage.delete({ where: { id } });
  }
}

export const productRepository = new ProductRepository();
