import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated } from '../utils/response';
import { COURIERS } from '../constants';

export const getCouriers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const couriers = await prisma.courier.findMany({ orderBy: { name: 'asc' } });
  sendSuccess(res, couriers);
});

export const createCourier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const courier = await prisma.courier.create({ data: req.body });
  sendCreated(res, courier, 'Courier created');
});

export const updateCourier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const courier = await prisma.courier.update({
    where: { id: req.params.id }, data: req.body,
  });
  sendSuccess(res, courier, 'Courier updated');
});

export const deleteCourier = asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.courier.delete({ where: { id: req.params.id } });
  sendSuccess(res, null, 'Courier deleted');
});

export const getDefaultCouriers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  sendSuccess(res, COURIERS);
});
