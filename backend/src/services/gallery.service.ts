/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 5 — Customer Gallery
// Verified purchasers may upload photos after delivery. Each submission
// goes through admin approval before appearing publicly.
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';

export class GalleryService {
  async getProductGallery(productId: string, params: any) {
    const { skip, take, page, limit } = getPaginationParams(params);
    const [photos, total] = await Promise.all([
      prisma.customerGallery.findMany({
        where: { productId, isApproved: true },
        orderBy: { createdAt: 'desc' },
        skip, take,
        select: {
          id: true, photoUrls: true, caption: true, createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.customerGallery.count({ where: { productId, isApproved: true } }),
    ]);
    return {
      photos: photos.map((p: any) => ({ ...p, photoUrls: JSON.parse(p.photoUrls) })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async submitPhoto(customerId: string, input: { productId: string; photoUrls: string[]; caption?: string }) {
    if (!input.photoUrls.length) throw new AppError('At least one photo required', HTTP_STATUS.BAD_REQUEST);

    const delivered: any = await prisma.orderItem.findFirst({
      where: { productId: input.productId, order: { customerId, status: 'DELIVERED' } },
      select: { id: true },
    });
    if (!delivered) throw new AppError('You can only submit gallery photos for products you have received', HTTP_STATUS.FORBIDDEN);

    return prisma.customerGallery.create({
      data: {
        productId: input.productId, customerId,
        photoUrls: JSON.stringify(input.photoUrls),
        caption: input.caption,
        isApproved: false,
      },
    });
  }

  async listForModeration(params: any) {
    const { skip, take, page, limit } = getPaginationParams(params);
    const where: any = {};
    if (params.approved === 'false' || params.approved === false) where.isApproved = false;
    if (params.approved === 'true' || params.approved === true) where.isApproved = true;
    const [photos, total] = await Promise.all([
      prisma.customerGallery.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          customer: { select: { name: true, phone: true } },
        },
      }),
      prisma.customerGallery.count({ where }),
    ]);
    return {
      photos: photos.map((p: any) => ({ ...p, photoUrls: JSON.parse(p.photoUrls) })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async approve(id: string, adminId: string) {
    return prisma.customerGallery.update({
      where: { id }, data: { isApproved: true, approvedById: adminId, approvedAt: new Date() },
    });
  }

  async reject(id: string) {
    return prisma.customerGallery.delete({ where: { id } });
  }
}

export const galleryService = new GalleryService();
