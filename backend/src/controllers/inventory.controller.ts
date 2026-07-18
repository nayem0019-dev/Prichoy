import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { inventoryService } from '../services/inventory.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { StockMovementType } from '@prisma/client';

export const getInventory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { inventories, meta } = await inventoryService.getAll(req.query as never);
  sendPaginated(res, inventories, meta);
});

export const getMovements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { movements, meta } = await inventoryService.getMovements(req.params.id, req.query as never);
  sendPaginated(res, movements, meta);
});

export const adjustStock = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await inventoryService.adjustStock({
    ...req.body,
    type: req.body.type as StockMovementType,
    adminId: req.user!.userId,
  });
  sendSuccess(res, result, 'Stock adjusted');
});

export const transferStock = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await inventoryService.transferStock({
    ...req.body,
    adminId: req.user!.userId,
  });
  sendSuccess(res, result, 'Stock transferred');
});

export const getWarehouses = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const warehouses = await inventoryService.getWarehouses();
  sendSuccess(res, warehouses);
});

export const createWarehouse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const warehouse = await inventoryService.createWarehouse(req.body);
  sendCreated(res, warehouse, 'Warehouse created');
});

export const getLowStockAlerts = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const alerts = await inventoryService.getLowStockAlerts();
  sendSuccess(res, alerts);
});

// Phase 3 §12
export const getInventoryDashboard = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const dashboard = await inventoryService.getDashboard();
  sendSuccess(res, dashboard);
});
