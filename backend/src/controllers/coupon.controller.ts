import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { couponService } from '../services/coupon.service';
import { sendSuccess, sendCreated } from '../utils/response';

export const getCoupons = asyncHandler(async (_req: AuthRequest, res: Response) => {
  sendSuccess(res, await couponService.list());
});

export const createCoupon = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendCreated(res, await couponService.create(req.body), 'Coupon created');
});

export const updateCoupon = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await couponService.update(req.params.id, req.body), 'Coupon updated');
});

export const deleteCoupon = asyncHandler(async (req: AuthRequest, res: Response) => {
  await couponService.delete(req.params.id);
  sendSuccess(res, null, 'Coupon deleted');
});
