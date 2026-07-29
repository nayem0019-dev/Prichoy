import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { generateVariantSku } from '../utils/sku';

// Phase 3 §2 — Product Variants. There was no variant management API at
// all before this phase (products could carry Variant rows via the schema,
// but nothing created/updated/deleted them). This is genuinely new, not an
// extension of existing variant endpoints.
export class VariantService {
  async list(productId: string) {
    return prisma.variant.findMany({
      where: { productId, isDeleted: false },
      include: { color: { select: { id: true, name: true, hexCode: true } } },
      orderBy: [{ colorId: 'asc' }, { value: 'asc' }],
    });
  }

  async getById(id: string) {
    const variant = await prisma.variant.findUnique({ where: { id }, include: { color: true } });
    if (!variant || variant.isDeleted) throw new AppError('Variant not found', HTTP_STATUS.NOT_FOUND);
    return variant;
  }

  async create(productId: string, data: {
    name: string; value: string; sku?: string; barcode?: string;
    price?: number; salePrice?: number; stock?: number; lowStockAlert?: number;
    colorId?: string; image?: string; isActive?: boolean;
  }) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.isDeleted) throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);

    if (data.colorId) {
      const color = await prisma.productColor.findUnique({ where: { id: data.colorId } });
      if (!color || color.productId !== productId) {
        throw new AppError('That color does not belong to this product', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Phase 3 §25 bug review — "Duplicate Variant SKU". The DB's @unique
    // constraint on Variant.sku/barcode would catch this too, but with an
    // opaque Prisma error; check explicitly first for a clear message.
    const sku = data.sku?.trim() || await generateVariantSku(product.sku, data.value);
    const existingSku = await prisma.variant.findUnique({ where: { sku } });
    if (existingSku) throw new AppError(`Variant SKU "${sku}" already exists`, HTTP_STATUS.CONFLICT);

    if (data.barcode) {
      const existingBarcode = await prisma.variant.findUnique({ where: { barcode: data.barcode } });
      if (existingBarcode) throw new AppError(`Variant barcode "${data.barcode}" already exists`, HTTP_STATUS.CONFLICT);
    }

    if ((data.stock ?? 0) < 0) {
      throw new AppError('Stock cannot be negative', HTTP_STATUS.BAD_REQUEST);
    }

    return prisma.variant.create({
      data: {
        productId, name: data.name, value: data.value, sku, barcode: data.barcode,
        price: data.price, salePrice: data.salePrice, stock: data.stock ?? 0,
        lowStockAlert: data.lowStockAlert,
        colorId: data.colorId, image: data.image, isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string; value: string; sku: string; barcode: string;
    price: number; salePrice: number; stock: number; lowStockAlert: number;
    colorId: string; image: string; isActive: boolean;
  }>) {
    const variant = await this.getById(id);

    if (data.stock !== undefined && data.stock < 0) {
      throw new AppError('Stock cannot be negative', HTTP_STATUS.BAD_REQUEST);
    }
    if (data.colorId && data.colorId !== variant.colorId) {
      const color = await prisma.productColor.findUnique({ where: { id: data.colorId } });
      if (!color || color.productId !== variant.productId) {
        throw new AppError('That color does not belong to this product', HTTP_STATUS.BAD_REQUEST);
      }
    }
    if (data.sku && data.sku !== variant.sku) {
      const existing = await prisma.variant.findUnique({ where: { sku: data.sku } });
      if (existing) throw new AppError(`Variant SKU "${data.sku}" already exists`, HTTP_STATUS.CONFLICT);
    }
    if (data.barcode && data.barcode !== variant.barcode) {
      const existing = await prisma.variant.findUnique({ where: { barcode: data.barcode } });
      if (existing) throw new AppError(`Variant barcode "${data.barcode}" already exists`, HTTP_STATUS.CONFLICT);
    }

    return prisma.variant.update({ where: { id }, data });
  }

  /** Phase 3 §24 — soft delete only. */
  async delete(id: string, adminId?: string) {
    await this.getById(id);
    return prisma.variant.update({
      where: { id },
      data: { isActive: false, isDeleted: true, deletedAt: new Date(), deletedBy: adminId },
    });
  }

  async restore(id: string) {
    const variant = await prisma.variant.findUnique({ where: { id } });
    if (!variant) throw new AppError('Variant not found', HTTP_STATUS.NOT_FOUND);
    return prisma.variant.update({ where: { id }, data: { isDeleted: false, deletedAt: null, deletedBy: null } });
  }
}

export const variantService = new VariantService();
