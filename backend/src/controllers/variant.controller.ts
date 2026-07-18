import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { variantService } from '../services/variant.service';
import { sendSuccess, sendCreated } from '../utils/response';

export const getVariants = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await variantService.list(req.params.id));
});

export const createVariant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const variant = await variantService.create(req.params.id, req.body);
  sendCreated(res, variant, 'Variant created');
});

export const updateVariant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const variant = await variantService.update(req.params.variantId, req.body);
  sendSuccess(res, variant, 'Variant updated');
});

export const deleteVariant = asyncHandler(async (req: AuthRequest, res: Response) => {
  await variantService.delete(req.params.variantId, req.user!.userId);
  sendSuccess(res, null, 'Variant deleted');
});

export const restoreVariant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const variant = await variantService.restore(req.params.variantId);
  sendSuccess(res, variant, 'Variant restored');
});
