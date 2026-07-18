import { StockMovementType, Prisma, Order, OrderItem } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { PaginationQuery } from '../types';

type TxClient = Prisma.TransactionClient;
type OrderWithItems = Order & { items: OrderItem[] };

export class InventoryService {
  /**
   * Reduces stock for every line item on an order. MUST be called inside
   * the same Prisma transaction as the order-status update that triggers
   * it (order.service.ts guards this with order.stockReduced). Throws
   * AppError (which rolls back the whole transaction — Phase 2 §5) if any
   * single item can't be fulfilled, so a confirm either fully succeeds or
   * nothing changes.
   *
   * Race-condition safety: rather than read-then-write, the actual
   * decrement is a single `updateMany` with a `quantity >= needed` guard
   * in the WHERE clause. If two requests try to confirm orders for the
   * same product at the same time, MySQL's row lock on the UPDATE
   * serializes them — the second one re-evaluates the guard against the
   * now-updated row and fails cleanly instead of driving stock negative.
   *
   * Phase 3.1 fix — "Orders do not reduce the specific variant stock."
   * When `item.variantId` is set, this now ALSO atomically decrements that
   * Variant's own `stock` field, with the same race-safe guard as the
   * Inventory decrement below. This is additive, not a replacement:
   * `Inventory.quantity` (per product+warehouse) stays the aggregate
   * number every existing dashboard/alert/export already reads, and
   * `Variant.stock` becomes the number that's actually correct per
   * color/size. Both must succeed or the whole order-confirmation
   * transaction rolls back — a variant selling out mid-checkout correctly
   * blocks the confirmation even if the product's aggregate pool still
   * has units of *other* variants left.
   */
  async reduceStockForOrder(tx: TxClient, order: OrderWithItems, adminId?: string): Promise<void> {
    for (const item of order.items) {
      const candidate = await tx.inventory.findFirst({
        where: { productId: item.productId, quantity: { gte: item.quantity } },
        orderBy: { quantity: 'desc' },
      });

      if (!candidate) {
        throw new AppError(
          `Insufficient stock for "${item.productName}" (need ${item.quantity})`,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const result = await tx.inventory.updateMany({
        where: { id: candidate.id, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } },
      });

      if (result.count === 0) {
        // Someone else consumed the stock between our read and write.
        throw new AppError(
          `Stock for "${item.productName}" changed concurrently — please retry confirming this order`,
          HTTP_STATUS.CONFLICT
        );
      }

      const newStock = candidate.quantity - item.quantity;

      // Phase 3.1 — variant-specific stock. Checked/decremented AFTER the
      // product-level guard above so an insufficient-variant-stock error
      // still rolls back the product-level decrement too (same transaction).
      if (item.variantId) {
        const variantResult = await tx.variant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (variantResult.count === 0) {
          const variant = await tx.variant.findUnique({ where: { id: item.variantId } });
          if (!variant) {
            throw new AppError(`Variant for "${item.productName}" no longer exists`, HTTP_STATUS.BAD_REQUEST);
          }
          throw new AppError(
            `Insufficient stock for "${item.productName}" (${item.variantInfo ?? 'selected variant'}) — only ${variant.stock} left`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
      }

      await tx.stockMovement.create({
        data: {
          inventoryId: candidate.id,
          variantId: item.variantId,
          type: 'STOCK_OUT',
          quantity: item.quantity,
          previousStock: candidate.quantity,
          newStock,
          reason: `Order ${order.orderNo} confirmed`,
          reference: order.id,
          adminId,
        },
      });

      if (newStock <= candidate.lowStockAlert) {
        await tx.notification.create({
          data: {
            type: newStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            title: newStock === 0 ? 'Out of Stock' : 'Low Stock Alert',
            body: `${item.productName} — ${newStock} remaining`,
          },
        }).catch(() => null);
      }
    }
  }

  /**
   * Restores stock for every line item on an order (cancellation or
   * return). Idempotency is enforced by the caller checking
   * order.stockReduced / order.stockRestored before invoking this — see
   * order.service.ts. This fixes a Phase-1-era bug where restoration
   * wrote a StockMovement with an empty inventoryId (a foreign-key
   * violation) that was silently swallowed by a `.catch(() => null)`,
   * meaning cancelled/returned stock was never actually put back.
   *
   * Phase 3.1 — restores `Variant.stock` too when the line item had one,
   * symmetric with the reduceStockForOrder() fix above.
   */
  async restoreStockForOrder(
    tx: TxClient,
    order: OrderWithItems,
    adminId: string | undefined,
    reason: string
  ): Promise<void> {
    for (const item of order.items) {
      let inventory = await tx.inventory.findFirst({
        where: { productId: item.productId },
        orderBy: { quantity: 'asc' },
      });

      if (!inventory) {
        const warehouse =
          (await tx.warehouse.findFirst({ where: { isDefault: true } })) ??
          (await tx.warehouse.findFirst());
        if (!warehouse) {
          // No warehouse exists at all — nothing sane to do but log and move on
          // rather than throwing and rolling back a cancellation/return that
          // otherwise succeeded.
          continue;
        }
        inventory = await tx.inventory.create({
          data: { productId: item.productId, warehouseId: warehouse.id, quantity: 0 },
        });
      }

      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: { increment: item.quantity } },
      });

      if (item.variantId) {
        // Best-effort: if the variant itself was deleted since the order
        // was placed, still restore the product-level pool above (already
        // done) but there's nothing to increment on the variant side.
        await tx.variant.updateMany({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.stockMovement.create({
        data: {
          inventoryId: inventory.id,
          variantId: item.variantId,
          type: 'RETURN',
          quantity: item.quantity,
          previousStock: inventory.quantity,
          newStock: updated.quantity,
          reason,
          reference: order.id,
          adminId,
        },
      });
    }
  }

  async getAll(filter: PaginationQuery & { warehouseId?: string; lowStock?: boolean }) {
    const { skip, take, page, limit } = getPaginationParams(filter);
    const where: Prisma.InventoryWhereInput = {};

    if (filter.warehouseId) where.warehouseId = filter.warehouseId;
    if (filter.lowStock)    where.quantity    = { lte: prisma.inventory.fields.lowStockAlert };

    if (filter.search) {
      where.product = {
        OR: [
          { name:    { contains: filter.search } },
          { sku:     { contains: filter.search } },
          { barcode: { contains: filter.search } },
        ],
      };
    }

    const [inventories, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: {
              images:   { where: { isPrimary: true }, take: 1 },
              category: { select: { name: true } },
            },
          },
          warehouse: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip, take,
      }),
      prisma.inventory.count({ where }),
    ]);

    return { inventories, meta: buildPaginationMeta(total, page, limit) };
  }

  async getMovements(inventoryId: string, query: PaginationQuery) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { inventoryId },
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      prisma.stockMovement.count({ where: { inventoryId } }),
    ]);

    return { movements, meta: buildPaginationMeta(total, page, limit) };
  }

  async adjustStock(data: {
    productId: string;
    warehouseId: string;
    type: StockMovementType;
    quantity: number;
    reason?: string;
    reference?: string;
    adminId?: string;
    note?: string;
  }) {
    const inventory = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId } },
    });

    if (!inventory) throw new AppError('Inventory record not found', HTTP_STATUS.NOT_FOUND);

    const isDeduction = ['STOCK_OUT', 'RESERVE', 'TRANSFER'].includes(data.type);
    const available = inventory.quantity - inventory.reserved;

    if (isDeduction && available < data.quantity) {
      throw new AppError(
        `Insufficient stock. Available: ${available}, Requested: ${data.quantity}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const previousStock = inventory.quantity;
    const newStock      = isDeduction ? previousStock - data.quantity : previousStock + data.quantity;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: newStock,
          reserved: data.type === 'RESERVE'
            ? { increment: data.quantity }
            : data.type === 'UNRESERVE'
              ? { decrement: data.quantity }
              : undefined,
        },
      });

      await tx.stockMovement.create({
        data: {
          inventoryId: inventory.id,
          type:        data.type,
          quantity:    data.quantity,
          previousStock,
          newStock,
          reason:      data.reason,
          reference:   data.reference,
          adminId:     data.adminId,
          note:        data.note,
        },
      });

      // Notify if low stock
      if (newStock <= inventory.lowStockAlert && newStock > 0) {
        await tx.notification.create({
          data: {
            type:  'LOW_STOCK',
            title: 'Low Stock Alert',
            body:  `Stock for product is low (${newStock} remaining)`,
          },
        });
      }

      if (newStock === 0) {
        await tx.notification.create({
          data: {
            type:  'OUT_OF_STOCK',
            title: 'Out of Stock',
            body:  `A product is now out of stock`,
          },
        });
      }

      return updated;
    });
  }

  async transferStock(data: {
    productId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    adminId: string;
    note?: string;
  }) {
    // Deduct from source
    await this.adjustStock({
      productId:   data.productId,
      warehouseId: data.fromWarehouseId,
      type:        'STOCK_OUT',
      quantity:    data.quantity,
      reason:      'Transfer out',
      adminId:     data.adminId,
      note:        data.note,
    });

    // Add to destination
    let destInventory = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: data.productId, warehouseId: data.toWarehouseId } },
    });

    if (!destInventory) {
      destInventory = await prisma.inventory.create({
        data: { productId: data.productId, warehouseId: data.toWarehouseId, quantity: 0 },
      });
    }

    return this.adjustStock({
      productId:   data.productId,
      warehouseId: data.toWarehouseId,
      type:        'TRANSFER',
      quantity:    data.quantity,
      reason:      'Transfer in',
      adminId:     data.adminId,
      note:        data.note,
    });
  }

  async getWarehouses() {
    return prisma.warehouse.findMany({
      include: { _count: { select: { inventories: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createWarehouse(data: { name: string; location?: string; isDefault?: boolean }) {
    return prisma.warehouse.create({ data });
  }

  async getLowStockAlerts() {
    return prisma.inventory.findMany({
      where: {
        product: { isActive: true },
        quantity: { lte: prisma.inventory.fields.lowStockAlert },
      },
      include: {
        product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
        warehouse: { select: { name: true } },
      },
      orderBy: { quantity: 'asc' },
      take: 50,
    });
  }

  // ── Phase 3 §12 — Inventory Dashboard ────────────────────────────────
  // Composes existing, already-correct pieces (getLowStockAlerts above,
  // StockMovement history already recorded by adjustStock/reduceStock/
  // restoreStock) into one summary view rather than introducing a
  // parallel/duplicate aggregation path.
  async getDashboard() {
    const [totalProducts, outOfStockCount, lowStockCount, outOfStockVariants, lowStockVariants, stockValueAgg, recentlyUpdated, lowStockAlerts, recentMovements] =
      await Promise.all([
        prisma.product.count({ where: { isDeleted: false } }),
        prisma.inventory.count({ where: { quantity: 0 } }),
        prisma.inventory.count({ where: { quantity: { gt: 0, lte: prisma.inventory.fields.lowStockAlert } } }),
        // Phase 3.1 — variant-level counts, now that Variant.stock is a
        // real number the order pipeline actually moves (see
        // inventoryService.reduceStockForOrder()), not just a display field.
        prisma.variant.count({ where: { isDeleted: false, isActive: true, stock: 0 } }),
        prisma.variant.count({ where: { isDeleted: false, isActive: true, stock: { gt: 0, lte: prisma.variant.fields.lowStockAlert } } }),
        // Inventory value = sum(quantity * costPrice) across every inventory
        // row. Prisma can't express a cross-column multiply-then-sum in
        // `aggregate`, so this is computed in application code from a
        // narrow projection rather than pulling full product/inventory rows.
        prisma.inventory.findMany({
          where: { product: { isDeleted: false } },
          select: { quantity: true, product: { select: { costPrice: true } } },
        }),
        prisma.product.findMany({
          where: { isDeleted: false },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          select: {
            id: true, name: true, sku: true, updatedAt: true, status: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          },
        }),
        this.getLowStockAlerts(),
        prisma.stockMovement.findMany({
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            inventory: { select: { product: { select: { name: true, sku: true } } } },
            variant:   { select: { name: true, value: true, sku: true } },
            admin:     { select: { id: true, name: true } },
          },
        }),
      ]);

    const inventoryValue = stockValueAgg.reduce(
      (sum, row) => sum + row.quantity * Number(row.product.costPrice), 0
    );

    return {
      totalProducts,
      outOfStockCount,
      lowStockCount,
      outOfStockVariantsCount: outOfStockVariants,
      lowStockVariantsCount: lowStockVariants,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      recentlyUpdatedProducts: recentlyUpdated,
      lowStockAlerts,
      recentStockMovements: recentMovements,
    };
  }
}

export const inventoryService = new InventoryService();
