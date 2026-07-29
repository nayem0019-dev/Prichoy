/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 5 — Server-persisted Wishlist
// Replaces the localStorage-only wishlist from previous phases for
// logged-in customers. Guest wishlist (localStorage) is unchanged —
// on login, the frontend merges the guest list by calling POST /wishlist/merge.
import { prisma } from '../config/database';

export class WishlistService {
  async getWishlist(customerId: string) {
    const items: any[] = await prisma.customerWishlist.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, sellingPrice: true, salePrice: true,
            images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
            variants: { where: { isActive: true, isDeleted: false }, select: { stock: true }, take: 1 },
          },
        },
      },
    });
    return items.map((i: any) => ({
      id: i.id, productId: i.productId, addedAt: i.createdAt,
      product: {
        ...i.product,
        image: i.product.images?.[0]?.url ?? null,
        inStock: (i.product.variants?.[0]?.stock ?? 1) > 0,
        images: undefined, variants: undefined,
      },
    }));
  }

  async add(customerId: string, productId: string) {
    await prisma.customerWishlist.upsert({
      where: { customerId_productId: { customerId, productId } },
      create: { customerId, productId },
      update: {}, // already there — no-op
    });
  }

  async remove(customerId: string, productId: string) {
    await prisma.customerWishlist.deleteMany({ where: { customerId, productId } });
  }

  async merge(customerId: string, productIds: string[]) {
    // Bulk-add guest wishlist items on login — skip duplicates silently.
    const existing: any[] = await prisma.customerWishlist.findMany({
      where: { customerId, productId: { in: productIds } },
      select: { productId: true },
    });
    const existingSet = new Set(existing.map((e: any) => e.productId));
    const toAdd = productIds.filter((id) => !existingSet.has(id));
    if (toAdd.length) {
      await prisma.customerWishlist.createMany({
        data: toAdd.map((productId) => ({ customerId, productId })),
        skipDuplicates: true,
      });
    }
  }
}

export const wishlistService = new WishlistService();
