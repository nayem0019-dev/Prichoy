/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import { customerAuthService } from '../services/customerAuth.service';
import { wishlistService } from '../services/wishlist.service';
import { reviewService } from '../services/review.service';
import { galleryService } from '../services/gallery.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { prisma } from '../config/database';

// ── Auth middleware for customer routes ──────────────────────────
export async function requireCustomer(req: any, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('Not authenticated', HTTP_STATUS.UNAUTHORIZED));
  try {
    req.customer = await customerAuthService.verifyToken(header.slice(7));
    next();
  } catch (e) { next(e); }
}

// ── Auth ─────────────────────────────────────────────────────────
export const register = asyncHandler(async (req: any, res: Response) => {
  const result = await customerAuthService.register(req.body);
  sendCreated(res, result, 'Account created');
});

export const login = asyncHandler(async (req: any, res: Response) => {
  const { phone, password } = req.body;
  const result = await customerAuthService.login(phone, password);
  sendSuccess(res, result);
});

export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const profile = await customerAuthService.getProfile(req.customer.id);
  sendSuccess(res, profile);
});

export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const profile = await customerAuthService.updateProfile(req.customer.id, req.body);
  sendSuccess(res, profile, 'Profile updated');
});

export const changePassword = asyncHandler(async (req: any, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  await customerAuthService.changePassword(req.customer.id, oldPassword, newPassword);
  sendSuccess(res, null, 'Password changed');
});

// ── Wishlist ─────────────────────────────────────────────────────
export const getWishlist = asyncHandler(async (req: any, res: Response) => {
  const items = await wishlistService.getWishlist(req.customer.id);
  sendSuccess(res, items);
});

export const addToWishlist = asyncHandler(async (req: any, res: Response) => {
  await wishlistService.add(req.customer.id, req.body.productId);
  sendSuccess(res, null, 'Added to wishlist');
});

export const removeFromWishlist = asyncHandler(async (req: any, res: Response) => {
  await wishlistService.remove(req.customer.id, req.params.productId);
  sendSuccess(res, null, 'Removed from wishlist');
});

export const mergeWishlist = asyncHandler(async (req: any, res: Response) => {
  await wishlistService.merge(req.customer.id, req.body.productIds || []);
  sendSuccess(res, null, 'Wishlist merged');
});

// ── Orders (customer-facing — returns only their own orders) ─────
export const getMyOrders = asyncHandler(async (req: any, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(20, Number(req.query.limit) || 10);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: req.customer.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
      select: {
        id: true, orderNo: true, status: true, grandTotal: true,
        createdAt: true, deliveredAt: true, trackingToken: true,
        items: { take: 1, select: { id: true }, where: {} },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where: { customerId: req.customer.id, isDeleted: false } }),
  ]);
  sendSuccess(res, { orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ── Reviews ──────────────────────────────────────────────────────
export const submitReview = asyncHandler(async (req: any, res: Response) => {
  const review = await reviewService.submitReview(req.customer.id, req.body);
  sendCreated(res, review, 'Review submitted — pending moderation');
});

export const voteHelpful = asyncHandler(async (req: any, res: Response) => {
  const result = await reviewService.voteHelpful(req.params.reviewId, req.customer.id);
  sendSuccess(res, result);
});

// ── Gallery ──────────────────────────────────────────────────────
export const submitGalleryPhoto = asyncHandler(async (req: any, res: Response) => {
  const photo = await galleryService.submitPhoto(req.customer.id, req.body);
  sendCreated(res, photo, 'Photo submitted — pending approval');
});

// ── Notification preferences ─────────────────────────────────────
export const getNotificationPrefs = asyncHandler(async (req: any, res: Response) => {
  const prefs = await prisma.customerNotificationPref.findUnique({ where: { customerId: req.customer.id } });
  sendSuccess(res, prefs);
});

export const updateNotificationPrefs = asyncHandler(async (req: any, res: Response) => {
  const prefs = await prisma.customerNotificationPref.upsert({
    where: { customerId: req.customer.id },
    create: { customerId: req.customer.id, ...req.body },
    update: req.body,
  });
  sendSuccess(res, prefs, 'Preferences updated');
});

// ── Admin: Review moderation ─────────────────────────────────────
export const listReviewsAdmin = asyncHandler(async (req: any, res: Response) => {
  const result = await reviewService.listForModeration(req.query);
  sendSuccess(res, result);
});

export const moderateReview = asyncHandler(async (req: any, res: Response) => {
  const { action, reason } = req.body;
  const result = await reviewService.moderate(req.params.id, action, req.user?.userId, reason);
  sendSuccess(res, result, `Review ${action.toLowerCase()}`);
});

export const deleteReview = asyncHandler(async (req: any, res: Response) => {
  await reviewService.deleteReview(req.params.id);
  sendSuccess(res, null, 'Review deleted');
});

// ── Admin: Gallery moderation ────────────────────────────────────
export const listGalleryAdmin = asyncHandler(async (req: any, res: Response) => {
  const result = await galleryService.listForModeration(req.query);
  sendSuccess(res, result);
});

export const approveGallery = asyncHandler(async (req: any, res: Response) => {
  const result = await galleryService.approve(req.params.id, req.user?.userId);
  sendSuccess(res, result, 'Photo approved');
});

export const rejectGallery = asyncHandler(async (req: any, res: Response) => {
  await galleryService.reject(req.params.id);
  sendSuccess(res, null, 'Photo rejected and removed');
});
