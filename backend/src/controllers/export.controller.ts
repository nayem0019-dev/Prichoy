import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { exportService } from '../services/export.service';

const getFormat = (req: AuthRequest) => (req.query.format as string) || 'excel';

export const exportOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await exportService.getOrdersData(req.query as never);
  const fmt  = getFormat(req);
  if (fmt === 'csv')
    exportService.sendCsv(res, data, `orders-${Date.now()}`);
  else
    exportService.sendExcel(res, data, 'Orders', `orders-${Date.now()}`);
});

export const exportProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await exportService.getProductsData(req.query as never);
  const fmt  = getFormat(req);
  if (fmt === 'csv')
    exportService.sendCsv(res, data, `products-${Date.now()}`);
  else
    exportService.sendExcel(res, data, 'Products', `products-${Date.now()}`);
});

export const exportCustomers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await exportService.getCustomersData();
  const fmt  = getFormat(_req);
  if (fmt === 'csv')
    exportService.sendCsv(res, data, `customers-${Date.now()}`);
  else
    exportService.sendExcel(res, data, 'Customers', `customers-${Date.now()}`);
});

// Phase 3 §20
export const exportInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await exportService.getInventoryData();
  const fmt  = getFormat(req);
  if (fmt === 'csv')
    exportService.sendCsv(res, data, `inventory-${Date.now()}`);
  else
    exportService.sendExcel(res, data, 'Inventory', `inventory-${Date.now()}`);
});

export const downloadInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  await exportService.generateInvoicePDF(req.params.id, res);
});
