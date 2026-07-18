import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

// The `Coupon` table has existed in the schema since Phase 1 but nothing
// ever read or wrote it — the customer frontend's coupon codes were all
// client-side mock data. This is the first real implementation, needed
// now that public checkout (frontend integration) has an actual coupon
// field that must be validated server-side, not trusted from the client.
export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  discountAmount: number;
  message: string;
}

export class CouponService {
  /**
   * Validates a coupon against a subtotal WITHOUT consuming its usage —
   * safe to call repeatedly as the customer edits their cart (e.g. a
   * "preview" endpoint). Consuming usage only happens atomically inside
   * order creation (see `redeem` below), so two customers racing to use
   * the last redemption of a limited coupon can't both succeed.
   */
  async validate(code: string, subtotal: number): Promise<CouponValidationResult> {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });

    if (!coupon) return { valid: false, discountAmount: 0, message: 'Invalid coupon code' };
    if (!coupon.isActive) return { valid: false, discountAmount: 0, message: 'This coupon is no longer active' };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, discountAmount: 0, message: 'This coupon has expired' };
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, message: 'This coupon has reached its usage limit' };
    }
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      return {
        valid: false, discountAmount: 0,
        message: `This coupon requires a minimum order of ৳${Number(coupon.minOrderAmount).toLocaleString()}`,
      };
    }

    let discountAmount = coupon.type === 'PERCENTAGE'
      ? Math.round(subtotal * (Number(coupon.value) / 100))
      : Number(coupon.value);

    if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
      discountAmount = Number(coupon.maxDiscount);
    }
    discountAmount = Math.min(discountAmount, subtotal); // never discount past ৳0

    return { valid: true, code: coupon.code, discountAmount, message: 'Coupon applied' };
  }

  /**
   * Re-validates and atomically increments usedCount. Called from inside
   * the same transaction as order creation. Uses the same compare-and-swap
   * pattern established in order.service.ts: the increment's WHERE clause
   * re-checks the usage limit, so two concurrent checkouts racing for the
   * last redemption can't both win.
   */
  async redeem(tx: import('@prisma/client').Prisma.TransactionClient, code: string, subtotal: number): Promise<CouponValidationResult> {
    const result = await this.validate(code, subtotal);
    if (!result.valid) return result;

    const coupon = await tx.coupon.findUnique({ where: { code: result.code! } });
    if (!coupon) return { valid: false, discountAmount: 0, message: 'Invalid coupon code' };

    const claim = await tx.coupon.updateMany({
      where: {
        id: coupon.id,
        ...(coupon.usageLimit !== null ? { usedCount: { lt: coupon.usageLimit } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (claim.count === 0) {
      return { valid: false, discountAmount: 0, message: 'This coupon just reached its usage limit — please try again without it' };
    }

    return result;
  }

  // ── Minimal admin CRUD (no admin UI yet — see Phase 3.1 report) ──────
  async list() {
    return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data: {
    code: string; type: 'PERCENTAGE' | 'FLAT'; value: number;
    minOrderAmount?: number; maxDiscount?: number; usageLimit?: number; expiresAt?: string;
  }) {
    const existing = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase().trim() } });
    if (existing) throw new AppError('A coupon with this code already exists', HTTP_STATUS.CONFLICT);
    return prisma.coupon.create({
      data: {
        code: data.code.toUpperCase().trim(), type: data.type, value: data.value,
        minOrderAmount: data.minOrderAmount, maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async update(id: string, data: Partial<{
    type: 'PERCENTAGE' | 'FLAT'; value: number; minOrderAmount: number; maxDiscount: number;
    usageLimit: number; expiresAt: string; isActive: boolean;
  }>) {
    return prisma.coupon.update({
      where: { id },
      data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
    });
  }

  async delete(id: string) {
    return prisma.coupon.delete({ where: { id } });
  }
}

export const couponService = new CouponService();
