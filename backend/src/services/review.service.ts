/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 5 — Product Review Service
// Only verified purchasers (DELIVERED order containing the product) can
// submit reviews. One review per customer per product (enforced by unique
// constraint + service-level check). Helpfulness voting is separate to
// avoid touching the main review row for every vote.
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';

export class ReviewService {
  // ── Public read ──────────────────────────────────────────────

  async getProductReviews(productId: string, params: any) {
    const { skip, take, page, limit } = getPaginationParams(params);
    const where: any = { productId, status: 'APPROVED' };

    const [reviews, total, ratingAgg] = await Promise.all([
      prisma.productReview.findMany({
        where, skip, take,
        orderBy: params.sort === 'helpful' ? { helpfulCount: 'desc' } : { createdAt: 'desc' },
        select: {
          id: true, rating: true, title: true, body: true, photos: true,
          isVerified: true, isAnonymous: true, helpfulCount: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.productReview.count({ where }),
      prisma.productReview.groupBy({
        by: ['rating' as any],
        where: { productId, status: 'APPROVED' },
        _count: true,
      }),
    ]);

    const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (ratingAgg as any[]).forEach((r: any) => { ratingMap[r.rating] = r._count; });
    const totalRatings = Object.values(ratingMap).reduce((s, c) => s + c, 0);
    const avgRating = totalRatings > 0
      ? Object.entries(ratingMap).reduce((s, [r, c]) => s + Number(r) * c, 0) / totalRatings
      : 0;

    return {
      reviews: reviews.map((r: any) => ({
        ...r,
        customerName: r.isAnonymous ? 'Anonymous' : r.customer?.name,
        photos: r.photos ? JSON.parse(r.photos) : [],
        customer: undefined,
      })),
      meta: buildPaginationMeta(total, page, limit),
      stats: { average: Math.round(avgRating * 10) / 10, total: totalRatings, breakdown: ratingMap },
    };
  }

  // ── Customer write ───────────────────────────────────────────

  async submitReview(customerId: string, input: {
    productId: string;
    rating: number;
    title?: string;
    body?: string;
    photos?: string[];
    isAnonymous?: boolean;
  }) {
    if (input.rating < 1 || input.rating > 5) throw new AppError('Rating must be 1-5', HTTP_STATUS.BAD_REQUEST);

    // Verify purchase: customer must have a DELIVERED order containing this product.
    const deliveredItem: any = await prisma.orderItem.findFirst({
      where: {
        productId: input.productId,
        order: { customerId, status: 'DELIVERED' },
      },
      select: { id: true },
    });

    const existing = await prisma.productReview.findFirst({
      where: { customerId, productId: input.productId },
    });
    if (existing) throw new AppError('You have already reviewed this product', HTTP_STATUS.CONFLICT);

    return prisma.productReview.create({
      data: {
        productId: input.productId,
        customerId,
        orderItemId: deliveredItem?.id ?? null,
        rating: input.rating,
        title: input.title,
        body: input.body,
        photos: input.photos?.length ? JSON.stringify(input.photos) : null,
        isVerified: !!deliveredItem,
        isAnonymous: input.isAnonymous ?? false,
        status: 'PENDING',
      },
    });
  }

  async voteHelpful(reviewId: string, customerId: string) {
    const review: any = await prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review || review.status !== 'APPROVED') throw new AppError('Review not found', HTTP_STATUS.NOT_FOUND);

    const existing = await prisma.reviewHelpfulVote.findUnique({
      where: { reviewId_customerId: { reviewId, customerId } },
    });
    if (existing) {
      // Toggle off (un-vote)
      await prisma.$transaction([
        prisma.reviewHelpfulVote.delete({ where: { reviewId_customerId: { reviewId, customerId } } }),
        prisma.productReview.update({ where: { id: reviewId }, data: { helpfulCount: { decrement: 1 } } }),
      ]);
      return { helpful: false };
    }

    await prisma.$transaction([
      prisma.reviewHelpfulVote.create({ data: { reviewId, customerId } }),
      prisma.productReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } }),
    ]);
    return { helpful: true };
  }

  // ── Admin moderation ─────────────────────────────────────────

  async listForModeration(params: any) {
    const { skip, take, page, limit } = getPaginationParams(params);
    const where: any = {};
    if (params.status && params.status !== 'ALL') where.status = params.status;
    if (params.productId) where.productId = params.productId;

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          customer: { select: { name: true, phone: true } },
        },
      }),
      prisma.productReview.count({ where }),
    ]);

    return { reviews, meta: buildPaginationMeta(total, page, limit) };
  }

  async moderate(reviewId: string, action: 'APPROVED' | 'REJECTED', adminId: string, reason?: string) {
    const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new AppError('Review not found', HTTP_STATUS.NOT_FOUND);

    return prisma.productReview.update({
      where: { id: reviewId },
      data: {
        status: action,
        rejectionReason: action === 'REJECTED' ? reason : null,
        moderatedById: adminId,
        moderatedAt: new Date(),
      },
    });
  }

  async deleteReview(reviewId: string) {
    await prisma.productReview.delete({ where: { id: reviewId } });
  }
}

export const reviewService = new ReviewService();
