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

// Phase 4 §19 — Sales, Expenses, Returns, Exchange report exports
export const exportSalesReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await exportService.getSalesReportData(req.query as never);
  const fmt = getFormat(req);
  if (fmt === 'csv') exportService.sendCsv(res, data, `sales-report-${Date.now()}`);
  else exportService.sendExcel(res, data, 'Sales Report', `sales-report-${Date.now()}`);
});

export const exportExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await exportService.getExpensesData(req.query as never);
  const fmt = getFormat(req);
  if (fmt === 'csv') exportService.sendCsv(res, data, `expenses-${Date.now()}`);
  else exportService.sendExcel(res, data, 'Expenses', `expenses-${Date.now()}`);
});

export const exportReturns = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await exportService.getReturnsData();
  const fmt = getFormat(_req);
  if (fmt === 'csv') exportService.sendCsv(res, data, `returns-${Date.now()}`);
  else exportService.sendExcel(res, data, 'Returns', `returns-${Date.now()}`);
});

export const exportExchanges = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await exportService.getExchangesData();
  const fmt = getFormat(_req);
  if (fmt === 'csv') exportService.sendCsv(res, data, `exchanges-${Date.now()}`);
  else exportService.sendExcel(res, data, 'Exchanges', `exchanges-${Date.now()}`);
});
