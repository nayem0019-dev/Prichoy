import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { publicService } from '../services/public.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await publicService.getProducts(req.query as never);
  sendPaginated(res, result.products, result.meta);
});

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await publicService.getProductBySlug(req.params.slug);
  sendSuccess(res, product);
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await publicService.getCategories();
  sendSuccess(res, categories);
});

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  const result = await publicService.validateCoupon(code, Number(subtotal) || 0);
  sendSuccess(res, result);
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await publicService.createOrder({ ...req.body, sourceIp: req.ip });
  sendSuccess(
    res,
    {
      orderNo: order.orderNo,
      grandTotal: order.grandTotal,
      trackingToken: order.trackingToken,
    },
    'Order placed successfully'
  );
});
