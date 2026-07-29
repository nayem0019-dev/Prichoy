// supplier.controller.ts
import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { supplierService } from '../services/supplier.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';

export const getSuppliers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { suppliers, meta } = await supplierService.getAll(req.query as never);
  sendPaginated(res, suppliers, meta);
});

export const getSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await supplierService.getById(req.params.id);
  sendSuccess(res, data);
});

export const createSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await supplierService.create(req.body);
  sendCreated(res, data, 'Supplier created');
});

export const updateSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await supplierService.update(req.params.id, req.body);
  sendSuccess(res, data, 'Supplier updated');
});

export const deleteSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  await supplierService.delete(req.params.id);
  sendSuccess(res, null, 'Supplier deleted');
});
