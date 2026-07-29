/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 6 §2 — Campaign Management Engine
import { prisma } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';

// Campaign priority resolver — Phase 6 §3
// Lower number = higher priority.
const PRIORITY_MAP: Record<string, number> = {
  CUSTOMER_CARE_COUPON: 1,
  WELCOME_BACK:         2,
  GRAND_OPENING:        3,
  PRODUCT_DISCOUNT:     4,
  FLASH_SALE:           5,
  EID_SALE:             5,
  WINTER_SALE:          5,
  SUMMER_SALE:          5,
  BLACK_FRIDAY:         5,
  CLEARANCE:            6,
  NEW_ARRIVAL:          7,
  CUSTOM:               8,
};

export class CampaignService {
  async getAll(params: any) {
    const { skip, take, page, limit } = getPaginationParams(params);
    const where: any = {};
    if (params.status && params.status !== 'ALL') where.status = params.status;
    if (params.type && params.type !== 'ALL') where.type = params.type;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({ where, skip, take, orderBy: [{ priority: 'asc' }, { startDate: 'desc' }],
        include: { _count: { select: { coupons: true } } } }),
      prisma.campaign.count({ where }),
    ]);
    return { campaigns, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const c = await prisma.campaign.findUnique({ where: { id },
      include: { coupons: { take: 20 } } });
    if (!c) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND);
    return c;
  }

  async create(data: {
    name: string; type: string; description?: string; bannerUrl?: string;
    startDate?: string; endDate?: string; autoActivate?: boolean; autoDeactivate?: boolean;
    discountType?: string; discountValue?: number; isStackable?: boolean; createdById?: string;
  }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const priority = PRIORITY_MAP[data.type as string] ?? 8;
    return prisma.campaign.create({
      data: {
        name: data.name, slug, type: data.type as any,
        description: data.description, bannerUrl: data.bannerUrl,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        autoActivate: data.autoActivate ?? false,
        autoDeactivate: data.autoDeactivate ?? false,
        discountType: data.discountType, discountValue: data.discountValue,
        isStackable: data.isStackable ?? false, priority, createdById: data.createdById,
      },
    });
  }

  async update(id: string, data: any) {
    await this.getById(id);
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.type) updateData.priority = PRIORITY_MAP[data.type] ?? 8;
    return prisma.campaign.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    await this.getById(id);
    // Unlink coupons from this campaign first, then delete
    await prisma.coupon.updateMany({ where: { campaignId: id }, data: { campaignId: null } });
    return prisma.campaign.delete({ where: { id } });
  }

  async activate(id: string) {
    return prisma.campaign.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async pause(id: string) {
    return prisma.campaign.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async end(id: string) {
    return prisma.campaign.update({ where: { id }, data: { status: 'ENDED' } });
  }

  // Phase 6 §9 — Campaign Calendar: returns all campaigns grouped by month
  async getCalendar(year?: number) {
    const y = year || new Date().getFullYear();
    const campaigns: any[] = await prisma.campaign.findMany({
      where: {
        OR: [
          { startDate: { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) } },
          { endDate:   { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) } },
          { status: 'ACTIVE' },
        ],
      },
      orderBy: { startDate: 'asc' },
    });

    // Auto-activate / auto-deactivate based on dates (run as part of calendar fetch)
    const now = new Date();
    for (const c of campaigns) {
      if (c.autoActivate && c.startDate && c.startDate <= now && c.status === 'DRAFT') {
        await prisma.campaign.update({ where: { id: c.id }, data: { status: 'ACTIVE' } });
        c.status = 'ACTIVE';
      }
      if (c.autoDeactivate && c.endDate && c.endDate <= now && c.status === 'ACTIVE') {
        await prisma.campaign.update({ where: { id: c.id }, data: { status: 'ENDED' } });
        c.status = 'ENDED';
      }
    }

    return campaigns;
  }

  // Phase 6 §4 — Promotion conflict resolution
  // Returns the effective discount for a given order, respecting
  // priority and stacking rules.
  async resolvePromotion(params: { subtotal: number; couponDiscount?: number; couponIsStackable?: boolean; activeCampaign?: any }) {
    const { subtotal, couponDiscount = 0, couponIsStackable = false, activeCampaign } = params;
    if (!activeCampaign || activeCampaign.status !== 'ACTIVE') {
      return { campaignDiscount: 0, couponDiscount, totalDiscount: couponDiscount, note: '' };
    }

    let campaignDiscount = 0;
    if (activeCampaign.discountType === 'PERCENTAGE' && activeCampaign.discountValue) {
      campaignDiscount = Math.round(subtotal * (Number(activeCampaign.discountValue) / 100));
    } else if (activeCampaign.discountType === 'FLAT' && activeCampaign.discountValue) {
      campaignDiscount = Number(activeCampaign.discountValue);
    }

    // Stacking rule: campaign + coupon only allowed if both are stackable,
    // or campaign type is GRAND_OPENING + coupon is WELCOME_BACK (§4).
    const canStack = activeCampaign.isStackable && couponIsStackable;
    const grandOpeningWelcomeBack = activeCampaign.type === 'GRAND_OPENING' && couponIsStackable;

    const totalDiscount = (canStack || grandOpeningWelcomeBack)
      ? Math.min(campaignDiscount + couponDiscount, subtotal)
      : Math.min(Math.max(campaignDiscount, couponDiscount), subtotal);

    return {
      campaignDiscount,
      couponDiscount: (canStack || grandOpeningWelcomeBack) ? couponDiscount : (campaignDiscount >= couponDiscount ? 0 : couponDiscount),
      totalDiscount,
      note: (canStack || grandOpeningWelcomeBack) ? 'Campaign + coupon stacked' : (campaignDiscount >= couponDiscount ? 'Campaign applied (higher value)' : 'Coupon applied (higher value)'),
    };
  }

  async getActive() {
    return prisma.campaign.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { priority: 'asc' },
    });
  }
}

export const campaignService = new CampaignService();
