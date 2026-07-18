import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { orderService } from './order.service';
import { customerService } from './customer.service';
import { couponService } from './coupon.service';

// Never expose these on a public product response even by accident: cost
// price, supplier, warehouse names, internal notes, etc. A dedicated
// `select` (not the admin repository's `include`) is the single point
// that guarantees this — see getProducts()/getProductBySlug() below.
const PUBLIC_PRODUCT_SELECT = {
  id: true, name: true, slug: true, shortDescription: true, description: true,
  gender: true, sellingPrice: true, salePrice: true, weight: true,
  season: true, material: true, careInstructions: true, countryOfOrigin: true,
  seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true,
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true } },
  images: { orderBy: { order: 'asc' as const }, select: { id: true, url: true, thumbnailUrl: true, webpUrl: true, alt: true, isPrimary: true } },
  colors: {
    orderBy: { displayOrder: 'asc' as const },
    select: {
      id: true, name: true, hexCode: true,
      images: { orderBy: { order: 'asc' as const }, select: { url: true, thumbnailUrl: true, webpUrl: true, alt: true, isPrimary: true } },
    },
  },
  variants: {
    where: { isDeleted: false, isActive: true },
    select: { id: true, name: true, value: true, price: true, salePrice: true, stock: true, colorId: true },
  },
  labels: { select: { label: true } },
  sizeGuide: { select: { imageUrl: true, measurementTable: true, notes: true } },
} as const;

function toPublicProduct<T extends { colors: unknown[]; labels: { label: string }[]; sizeGuide: { measurementTable: string | null } | null }>(p: T) {
  return {
    ...p,
    labels: p.labels.map((l) => l.label),
    sizeGuide: p.sizeGuide
      ? { ...p.sizeGuide, measurementTable: p.sizeGuide.measurementTable ? JSON.parse(p.sizeGuide.measurementTable) : null }
      : null,
  };
}

export class PublicService {
  async getProducts(filter: {
    gender?: string; category?: string; search?: string; sort?: string;
    page?: number; limit?: number;
  }) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(filter.limit) || 24));

    const where: import('@prisma/client').Prisma.ProductWhereInput = {
      isDeleted: false, isActive: true, status: 'PUBLISHED',
    };
    if (filter.gender) where.gender = filter.gender as import('@prisma/client').Prisma.EnumGenderFilter;
    if (filter.category) where.category = { slug: filter.category };
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { shortDescription: { contains: filter.search } },
      ];
    }

    let orderBy: import('@prisma/client').Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (filter.sort === 'price-asc')  orderBy = { sellingPrice: 'asc' };
    if (filter.sort === 'price-desc') orderBy = { sellingPrice: 'desc' };
    if (filter.sort === 'newest')     orderBy = { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, orderBy, select: PUBLIC_PRODUCT_SELECT,
        skip: (page - 1) * limit, take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: products.map(toPublicProduct),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findFirst({
      where: { slug, isDeleted: false, isActive: true, status: 'PUBLISHED' },
      select: PUBLIC_PRODUCT_SELECT,
    });
    if (!product) throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
    return toPublicProduct(product);
  }

  async getCategories() {
    return prisma.category.findMany({
      where: { isDeleted: false, isActive: true, parentId: null },
      select: {
        id: true, name: true, slug: true, image: true, icon: true,
        children: {
          where: { isDeleted: false, isActive: true },
          select: { id: true, name: true, slug: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async validateCoupon(code: string, subtotal: number) {
    return couponService.validate(code, subtotal);
  }

  /**
   * Phase 3.1 — public COD checkout. Every item's price is re-read from
   * the database here, never trusted from the request body. A tampered
   * client sending a fake low price for an item gets the real price
   * silently substituted, not an error — the order still succeeds, just
   * at the correct amount.
   */
  async createOrder(data: {
    name: string; phone: string; email?: string;
    address: string; thana: string; district: string;
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
    couponCode?: string;
    notes?: string;
    sourceIp?: string;
  }) {
    if (!data.items?.length) throw new AppError('Your cart is empty', HTTP_STATUS.BAD_REQUEST);
    if (!/^01[0-9]{9}$/.test(data.phone)) {
      throw new AppError('Enter a valid 11-digit Bangladeshi phone number', HTTP_STATUS.BAD_REQUEST);
    }

    // Re-look-up every item server-side. Anything not found / not
    // published / mismatched variant->product is rejected with a clear
    // error rather than silently dropped, so the customer isn't charged
    // for fewer items than they saw on the confirmation screen without
    // knowing why.
    const resolvedItems = [];
    for (const item of data.items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new AppError('Invalid item in cart', HTTP_STATUS.BAD_REQUEST);
      }
      const product = await prisma.product.findFirst({
        where: { id: item.productId, isDeleted: false, isActive: true, status: 'PUBLISHED' },
        select: {
          id: true, name: true, sku: true, sellingPrice: true, salePrice: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      });
      if (!product) {
        throw new AppError('One of the items in your cart is no longer available', HTTP_STATUS.BAD_REQUEST);
      }

      let variant = null;
      if (item.variantId) {
        variant = await prisma.variant.findFirst({
          where: { id: item.variantId, productId: item.productId, isDeleted: false, isActive: true },
        });
        if (!variant) {
          throw new AppError(`The selected option for "${product.name}" is no longer available`, HTTP_STATUS.BAD_REQUEST);
        }
      }

      const unitPrice = variant
        ? Number(variant.salePrice ?? variant.price ?? product.salePrice ?? product.sellingPrice)
        : Number(product.salePrice ?? product.sellingPrice);

      resolvedItems.push({
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantInfo: variant ? `${variant.name}: ${variant.value}` : undefined,
        sku: variant?.sku ?? product.sku,
        image: product.images[0]?.url,
        quantity: item.quantity,
        unitPrice,
      });
    }

    const subtotal = resolvedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    let discountAmount = 0;
    let couponCode: string | undefined;
    if (data.couponCode) {
      const couponResult = await couponService.validate(data.couponCode, subtotal);
      if (!couponResult.valid) {
        throw new AppError(couponResult.message, HTTP_STATUS.BAD_REQUEST);
      }
      discountAmount = couponResult.discountAmount;
      couponCode = couponResult.code;
    }

    const customer = await customerService.findOrCreate({
      name: data.name, phone: data.phone, email: data.email,
      address: data.address, thana: data.thana, district: data.district,
    });

    if (customer.isBlocked) {
      // Same message orderService.create() would throw — surfaced here too
      // since findOrCreate() succeeds regardless of block status.
      throw new AppError(
        'We are unable to process this order. Please contact support.',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const order = await orderService.create({
      customerId: customer.id,
      shippingName: data.name,
      shippingPhone: data.phone,
      shippingAddress: data.address,
      shippingThana: data.thana,
      shippingDistrict: data.district,
      items: resolvedItems,
      couponCode,
      discountAmount,
      notes: data.notes,
      sourceIp: data.sourceIp,
    });

    // Coupon usage is only actually consumed once the order has
    // successfully been created — a failed order shouldn't burn a
    // redemption no customer benefited from. This runs in its own tiny
    // transaction rather than the order's, since the order already
    // committed.
    if (couponCode) {
      await prisma.$transaction((tx) => couponService.redeem(tx, couponCode!, subtotal)).catch(() => null);
    }

    return order;
  }
}

export const publicService = new PublicService();
