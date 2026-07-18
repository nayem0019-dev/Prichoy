import { Prisma, ProductStatus, ProductLabel } from '@prisma/client';
import { prisma } from '../config/database';
import { productRepository } from '../repositories/product.repository';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { ProductFilterQuery } from '../types';
import { generateProductSku, generateVariantSku } from '../utils/sku';
import { processAndSaveImage } from './image.service';

// Phase 3 §1 — a product's `status` drives customer-facing visibility;
// `isActive` is the pre-existing boolean every other query in this
// codebase (getLowStock, getTopSelling, exports, ...) already filters on.
// Rather than touching all of those, PUBLISHED is the only status that
// keeps isActive=true — everything else (including the brand-new
// COMING_SOON/HIDDEN) is treated as "not active" the same way a manually
// deactivated product always has been.
function isActiveForStatus(status: ProductStatus): boolean {
  return status === 'PUBLISHED';
}

export class ProductService {
  async getAll(filter: ProductFilterQuery) {
    return productRepository.findAll(filter);
  }

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product || product.isDeleted) throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    return product;
  }

  async create(data: {
    name: string; slug: string; description?: string; shortDescription?: string;
    sku?: string; barcode?: string; gender?: string; categoryId: string; brandId?: string;
    supplierId?: string; costPrice: number; sellingPrice: number; salePrice?: number;
    weight?: number; isActive?: boolean; isFeatured?: boolean;
    season?: string; material?: string; careInstructions?: string; countryOfOrigin?: string;
    status?: string; seoTitle?: string; seoDescription?: string; seoKeywords?: string;
    ogImage?: string; canonicalUrl?: string;
    warehouseId: string; initialStock?: number;
  }) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category || category.isDeleted) {
      throw new AppError('Category not found', HTTP_STATUS.BAD_REQUEST);
    }

    // Phase 3 §1 — "Auto Generated SKU". SKU is now optional on input;
    // if omitted, one is generated from the category name. If provided
    // (existing callers, imports, etc.), the pre-existing uniqueness check
    // below still applies unchanged.
    const sku = data.sku?.trim() || await generateProductSku(category.name);
    const existing = await productRepository.findBySku(sku);
    if (existing) throw new AppError('SKU already exists', HTTP_STATUS.CONFLICT);

    const status = (data.status as ProductStatus) ?? 'DRAFT';

    return prisma.$transaction(async (tx) => {
      const margin = data.sellingPrice > 0
        ? ((data.sellingPrice - data.costPrice) / data.sellingPrice) * 100
        : 0;

      const product = await tx.product.create({
        data: {
          name: data.name, slug: data.slug,
          description: data.description, shortDescription: data.shortDescription,
          sku, barcode: data.barcode,
          gender: data.gender as Prisma.EnumGenderFilter | undefined,
          categoryId: data.categoryId, brandId: data.brandId,
          supplierId: data.supplierId,
          costPrice: data.costPrice, sellingPrice: data.sellingPrice,
          salePrice: data.salePrice, profitMargin: Math.round(margin * 100) / 100,
          weight: data.weight,
          season: data.season, material: data.material,
          careInstructions: data.careInstructions, countryOfOrigin: data.countryOfOrigin,
          status,
          seoTitle: data.seoTitle, seoDescription: data.seoDescription, seoKeywords: data.seoKeywords,
          ogImage: data.ogImage, canonicalUrl: data.canonicalUrl,
          isActive: data.isActive ?? isActiveForStatus(status),
          isFeatured: data.isFeatured ?? false,
        },
      });

      // Create default inventory in the specified warehouse
      await tx.inventory.create({
        data: {
          productId: product.id,
          warehouseId: data.warehouseId,
          quantity: data.initialStock ?? 0,
        },
      });

      return product;
    });
  }

  async update(id: string, data: Partial<{
    name: string; slug: string; description: string; shortDescription: string; barcode: string;
    gender: string; categoryId: string; brandId: string; supplierId: string;
    costPrice: number; sellingPrice: number; salePrice: number;
    weight: number; isActive: boolean; isFeatured: boolean;
    season: string; material: string; careInstructions: string; countryOfOrigin: string;
    status: string; seoTitle: string; seoDescription: string; seoKeywords: string;
    ogImage: string; canonicalUrl: string;
  }>) {
    await this.getById(id);

    const updateData: Prisma.ProductUpdateInput = { ...data } as Prisma.ProductUpdateInput;
    if (data.costPrice !== undefined && data.sellingPrice !== undefined) {
      updateData.profitMargin = Math.round(
        ((data.sellingPrice - data.costPrice) / data.sellingPrice) * 100 * 100
      ) / 100;
    }
    // Keep isActive in sync with status unless the caller explicitly set
    // isActive themselves in the same request (an explicit override wins).
    if (data.status !== undefined && data.isActive === undefined) {
      updateData.isActive = isActiveForStatus(data.status as ProductStatus);
    }
    return productRepository.update(id, updateData);
  }

  async delete(id: string, adminId?: string) {
    await this.getById(id);
    // Phase 2 §18 — never hard-delete. Previously this fell back to a real
    // `DELETE` when the product had no order history, which is exactly the
    // case where a hard delete looks "safe" but still isn't reversible.
    return productRepository.update(id, {
      isActive: false,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: adminId,
    });
  }

  async restore(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    return productRepository.update(id, { isDeleted: false, deletedAt: null, deletedBy: null });
  }

  async getLowStock(threshold?: number) {
    return productRepository.getLowStock(threshold);
  }

  async getTopSelling(limit?: number) {
    return productRepository.getTopSelling(limit);
  }

  async addImage(productId: string, data: { url: string; alt?: string; isPrimary?: boolean }) {
    await this.getById(productId);
    return productRepository.addImage(productId, data);
  }

  async deleteImage(productId: string, imageId: string) {
    await this.getById(productId);
    return productRepository.deleteImage(imageId);
  }

  /** Phase 3 §4 — process an uploaded file (compress + thumbnail + WebP) and attach it as a product image. */
  async uploadImage(productId: string, file: { buffer: Buffer; mimetype: string }, opts: { alt?: string; isPrimary?: boolean }) {
    await this.getById(productId);
    const processed = await processAndSaveImage(file.buffer, file.mimetype, 'products');
    return productRepository.addImage(productId, {
      url: processed.url,
      thumbnailUrl: processed.thumbnailUrl,
      webpUrl: processed.webpUrl,
      alt: opts.alt,
      isPrimary: opts.isPrimary,
    });
  }

  async reorderImages(productId: string, orderedImageIds: string[]) {
    await this.getById(productId);
    await Promise.all(
      orderedImageIds.map((imageId, index) =>
        prisma.productImage.update({ where: { id: imageId }, data: { order: index } })
      )
    );
    return this.getById(productId);
  }

  // ── Phase 3 §11 — Product Duplication ──────────────────────────────
  /**
   * Duplicates product info, images, variants (and their colors + color
   * images), categories, SEO fields, and labels. Generates a brand-new SKU
   * (and new variant SKUs) rather than copying the originals, since SKUs
   * are unique. Inventory quantities are intentionally NOT copied — a
   * duplicate starts at zero stock in the same warehouse(s) the original
   * uses, since copying live stock numbers onto a second product would
   * silently double-count physical inventory that only actually exists
   * once.
   */
  async duplicate(id: string, adminId?: string) {
    const original = await this.getById(id);

    return prisma.$transaction(async (tx) => {
      const newSku = await generateProductSku(original.category.name);
      const copy = await tx.product.create({
        data: {
          name: `${original.name} (Copy)`,
          slug: `${original.slug}-copy-${Date.now()}`,
          description: original.description,
          shortDescription: original.shortDescription,
          sku: newSku,
          barcode: null, // barcode is unique and physically tied to one real item — never duplicated
          gender: original.gender,
          categoryId: original.categoryId,
          brandId: original.brandId,
          supplierId: original.supplierId,
          costPrice: original.costPrice,
          sellingPrice: original.sellingPrice,
          salePrice: original.salePrice,
          profitMargin: original.profitMargin,
          weight: original.weight,
          season: original.season,
          material: original.material,
          careInstructions: original.careInstructions,
          countryOfOrigin: original.countryOfOrigin,
          status: 'DRAFT', // duplicates always start as drafts, regardless of the original's status
          seoTitle: original.seoTitle,
          seoDescription: original.seoDescription,
          seoKeywords: original.seoKeywords,
          ogImage: original.ogImage,
          canonicalUrl: original.canonicalUrl,
          isActive: false,
          isFeatured: false,
        },
      });

      // Images
      for (const img of original.images) {
        await tx.productImage.create({
          data: {
            productId: copy.id, url: img.url, thumbnailUrl: img.thumbnailUrl, webpUrl: img.webpUrl,
            alt: img.alt, isPrimary: img.isPrimary, order: img.order,
          },
        });
      }

      // Colors + their image galleries, then variants (which may reference a color)
      const colors = await tx.productColor.findMany({
        where: { productId: id }, include: { images: true },
      });
      const colorIdMap = new Map<string, string>();
      for (const color of colors) {
        const newColor = await tx.productColor.create({
          data: { productId: copy.id, name: color.name, hexCode: color.hexCode, displayOrder: color.displayOrder },
        });
        colorIdMap.set(color.id, newColor.id);
        for (const img of color.images) {
          await tx.productColorImage.create({
            data: {
              colorId: newColor.id, url: img.url, thumbnailUrl: img.thumbnailUrl, webpUrl: img.webpUrl,
              alt: img.alt, isPrimary: img.isPrimary, order: img.order,
            },
          });
        }
      }

      const variants = await tx.variant.findMany({ where: { productId: id } });
      for (const v of variants) {
        const variantSku = v.sku ? await generateVariantSku(newSku, v.value) : null;
        await tx.variant.create({
          data: {
            productId: copy.id,
            name: v.name, value: v.value,
            sku: variantSku,
            barcode: null, // same reasoning as the product barcode above
            price: v.price, salePrice: v.salePrice,
            stock: 0, reserved: 0, // see stock-copying note above
            image: v.image,
            colorId: v.colorId ? colorIdMap.get(v.colorId) : null,
            isActive: v.isActive,
          },
        });
      }

      // Labels
      const labels = await tx.productLabelAssignment.findMany({ where: { productId: id } });
      for (const l of labels) {
        await tx.productLabelAssignment.create({ data: { productId: copy.id, label: l.label } });
      }

      // Collections
      const collections = await tx.productCollection.findMany({ where: { productId: id } });
      for (const c of collections) {
        await tx.productCollection.create({ data: { productId: copy.id, collectionId: c.collectionId } });
      }

      // Size guide
      const sizeGuide = await tx.productSizeGuide.findUnique({ where: { productId: id } });
      if (sizeGuide) {
        await tx.productSizeGuide.create({
          data: {
            productId: copy.id, imageUrl: sizeGuide.imageUrl,
            measurementTable: sizeGuide.measurementTable, notes: sizeGuide.notes,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          adminId, action: 'DUPLICATE_PRODUCT', entity: 'products', entityId: copy.id,
          oldValue: JSON.stringify({ sourceProductId: id }),
          newValue: JSON.stringify({ sku: newSku }),
        },
      });

      return copy;
    });
  }

  // ── Phase 3 §5 — Product Labels ──────────────────────────────────────
  async setLabels(productId: string, labels: string[], adminId?: string) {
    await this.getById(productId);
    const validLabels = labels.filter((l): l is ProductLabel =>
      (Object.values(ProductLabel) as string[]).includes(l)
    );
    await prisma.$transaction([
      prisma.productLabelAssignment.deleteMany({ where: { productId } }),
      ...validLabels.map((label) =>
        prisma.productLabelAssignment.create({ data: { productId, label } })
      ),
    ]);
    await prisma.activityLog.create({
      data: { adminId, action: 'UPDATE_PRODUCT_LABELS', entity: 'products', entityId: productId, newValue: JSON.stringify(validLabels) },
    });
    return validLabels;
  }

  // ── Phase 3 §6 — Collections ───────────────────────────────────────
  async getCollections() {
    return prisma.collection.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createCollection(data: { name: string; slug: string; description?: string; displayOrder?: number }) {
    return prisma.collection.create({ data });
  }

  async updateCollection(id: string, data: Partial<{ name: string; slug: string; description: string; isActive: boolean; displayOrder: number }>) {
    return prisma.collection.update({ where: { id }, data });
  }

  async deleteCollection(id: string) {
    return prisma.collection.delete({ where: { id } });
  }

  async setProductCollections(productId: string, collectionIds: string[]) {
    await this.getById(productId);
    await prisma.$transaction([
      prisma.productCollection.deleteMany({ where: { productId } }),
      ...collectionIds.map((collectionId) =>
        prisma.productCollection.create({ data: { productId, collectionId } })
      ),
    ]);
    return this.getById(productId);
  }

  // ── Phase 3 §3 — Colors (per-color variant image galleries) ─────────
  async addColor(productId: string, data: { name: string; hexCode?: string; displayOrder?: number }) {
    await this.getById(productId);
    const existing = await prisma.productColor.findFirst({ where: { productId, name: data.name } });
    if (existing) throw new AppError(`Color "${data.name}" already exists for this product`, HTTP_STATUS.CONFLICT);
    return prisma.productColor.create({ data: { productId, ...data } });
  }

  async updateColor(colorId: string, data: Partial<{ name: string; hexCode: string; displayOrder: number }>) {
    return prisma.productColor.update({ where: { id: colorId }, data });
  }

  async deleteColor(colorId: string) {
    const inUse = await prisma.variant.count({ where: { colorId } });
    if (inUse > 0) {
      throw new AppError(
        `${inUse} variant(s) still use this color — reassign or delete them first`,
        HTTP_STATUS.CONFLICT
      );
    }
    return prisma.productColor.delete({ where: { id: colorId } }); // cascades its own images
  }

  async uploadColorImage(colorId: string, file: { buffer: Buffer; mimetype: string }, opts: { alt?: string; isPrimary?: boolean }) {
    const color = await prisma.productColor.findUnique({ where: { id: colorId } });
    if (!color) throw new AppError('Color not found', HTTP_STATUS.NOT_FOUND);

    const processed = await processAndSaveImage(file.buffer, file.mimetype, 'colors');
    if (opts.isPrimary) {
      await prisma.productColorImage.updateMany({ where: { colorId }, data: { isPrimary: false } });
    }
    return prisma.productColorImage.create({
      data: {
        colorId, url: processed.url, thumbnailUrl: processed.thumbnailUrl, webpUrl: processed.webpUrl,
        alt: opts.alt, isPrimary: opts.isPrimary ?? false,
      },
    });
  }

  async deleteColorImage(imageId: string) {
    return prisma.productColorImage.delete({ where: { id: imageId } });
  }

  // ── Phase 3 §7 — Size Guide ───────────────────────────────────────
  async upsertSizeGuide(productId: string, data: { imageUrl?: string; measurementTable?: unknown; notes?: string }) {
    await this.getById(productId);
    const measurementTable = data.measurementTable !== undefined
      ? JSON.stringify(data.measurementTable)
      : undefined;
    return prisma.productSizeGuide.upsert({
      where: { productId },
      create: { productId, imageUrl: data.imageUrl, measurementTable, notes: data.notes },
      update: { imageUrl: data.imageUrl, measurementTable, notes: data.notes },
    });
  }

  async getSizeGuide(productId: string) {
    const guide = await prisma.productSizeGuide.findUnique({ where: { productId } });
    if (!guide) return null;
    return { ...guide, measurementTable: guide.measurementTable ? JSON.parse(guide.measurementTable) : null };
  }

  // Categories
  async getCategories(includeDeleted = false) {
    return prisma.category.findMany({
      where: includeDeleted ? {} : { isDeleted: false },
      include: { _count: { select: { products: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** Phase 3 §8 — nested Category/Sub Category tree for the admin UI's picker. */
  async getCategoryTree() {
    const categories = await prisma.category.findMany({
      where: { isDeleted: false },
      include: { _count: { select: { products: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    type CategoryWithChildren = (typeof categories)[number] & { children: CategoryWithChildren[] };
    const byId = new Map<string, CategoryWithChildren>(
      categories.map((c) => [c.id, { ...c, children: [] }])
    );
    const roots: CategoryWithChildren[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.children.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  }

  async createCategory(data: { name: string; slug: string; gender?: string; description?: string; parentId?: string; displayOrder?: number; icon?: string }) {
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.isDeleted) throw new AppError('Parent category not found', HTTP_STATUS.BAD_REQUEST);
    }
    return prisma.category.create({ data: data as Prisma.CategoryCreateInput });
  }

  async updateCategory(id: string, data: Partial<{ name: string; slug: string; gender: string; description: string; isActive: boolean; parentId: string | null; displayOrder: number; icon: string }>) {
    // Phase 3 §25 bug review — "Category Loops". Without this check, setting
    // A's parent to one of A's own descendants creates a cycle that would
    // infinite-loop getCategoryTree() (and any future breadcrumb/recursive
    // query). Walk up the proposed parent's own ancestor chain and reject
    // if we ever hit `id` itself.
    if (data.parentId) {
      if (data.parentId === id) {
        throw new AppError('A category cannot be its own parent', HTTP_STATUS.BAD_REQUEST);
      }
      let cursor: string | null = data.parentId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === id) {
          throw new AppError('This would create a category loop (a category cannot be a descendant of itself)', HTTP_STATUS.BAD_REQUEST);
        }
        if (seen.has(cursor)) break; // defensive — an existing loop shouldn't be possible, but don't hang if one somehow exists
        seen.add(cursor);
        const next: { parentId: string | null } | null = await prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } });
        cursor = next?.parentId ?? null;
      }
    }
    return prisma.category.update({ where: { id }, data: data as Prisma.CategoryUpdateInput });
  }

  /** Phase 3 §24 — never hard-delete categories. */
  async deleteCategory(id: string, adminId?: string) {
    const productCount = await prisma.product.count({ where: { categoryId: id, isDeleted: false } });
    if (productCount > 0) throw new AppError(`Category has ${productCount} products. Reassign them first.`, HTTP_STATUS.CONFLICT);
    const childCount = await prisma.category.count({ where: { parentId: id, isDeleted: false } });
    if (childCount > 0) throw new AppError(`Category has ${childCount} subcategories. Move or delete them first.`, HTTP_STATUS.CONFLICT);
    return prisma.category.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: adminId, isActive: false },
    });
  }

  async restoreCategory(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
    return prisma.category.update({ where: { id }, data: { isDeleted: false, deletedAt: null, deletedBy: null } });
  }

  // Brands
  async getBrands() {
    return prisma.brand.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(data: { name: string; slug: string; description?: string }) {
    return prisma.brand.create({ data });
  }

  async updateBrand(id: string, data: Partial<{ name: string; slug: string; description: string; isActive: boolean }>) {
    return prisma.brand.update({ where: { id }, data });
  }

  async deleteBrand(id: string) {
    return prisma.brand.delete({ where: { id } });
  }
}

export const productService = new ProductService();
