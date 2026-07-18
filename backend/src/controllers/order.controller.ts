import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { orderService } from '../services/order.service';
import { resendEmail } from '../services/email.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { OrderStatus } from '@prisma/client';

export const getOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orders, meta } = await orderService.getAll(req.query as never);
  sendPaginated(res, orders, meta);
});

export const getOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await orderService.getById(req.params.id);
  sendSuccess(res, order);
});

export const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await orderService.create(
    { ...req.body, sourceIp: req.ip },
    req.user?.userId
  );
  sendCreated(res, order, 'Order created successfully');
});

export const updateOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    status, note, cancelReason,
    courierId, trackingNumber, courierCost, courierNotes, estimatedDelivery,
    verificationNotes,
  } = req.body;
  const order = await orderService.updateStatus(
    req.params.id,
    status as OrderStatus,
    req.user!.userId,
    {
      note, cancelReason, ip: req.ip,
      courierId, trackingNumber, courierCost, courierNotes, estimatedDelivery,
      verificationNotes,
    }
  );
  sendSuccess(res, order, `Order status updated to ${status}`);
});

// Phase 2 §2 — dedicated convenience endpoint (thin wrapper over the status
// machine) so the admin UI doesn't have to know the exact status string.
export const verifyCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { note } = req.body;
  const order = await orderService.updateStatus(
    req.params.id, 'CUSTOMER_VERIFIED', req.user!.userId,
    { verificationNotes: note, ip: req.ip }
  );
  sendSuccess(res, order, 'Customer verified');
});

export const addNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { note, isInternal } = req.body;
  await orderService.addNote(req.params.id, note, req.user!.userId, isInternal);
  sendSuccess(res, null, 'Note added');
});

// Phase 2.1 Task 2 — Internal Order Notes (structured, admin-only, per-note author/timestamps).
export const addInternalNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const note = await orderService.addInternalNote(req.params.id, req.body.note, req.user!.userId);
  sendCreated(res, note, 'Internal note added');
});

export const updateInternalNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const note = await orderService.updateInternalNote(
    req.params.id, req.params.noteId, req.body.note, req.user!.userId
  );
  sendSuccess(res, note, 'Internal note updated');
});

// Phase 2.1 Task 3 — Customer Contact Log (append-only).
export const addContactLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { method, outcome, note } = req.body;
  const log = await orderService.addContactLog(req.params.id, {
    method, outcome, note, staffId: req.user!.userId,
  });
  sendCreated(res, log, 'Contact logged');
});

export const getContactLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const logs = await orderService.getContactLogs(req.params.id);
  sendSuccess(res, logs);
});

// Phase 2 §8 — courier assignment is now just the COURIER_ASSIGNED
// transition with courier-specific fields; kept as its own endpoint for a
// simpler admin-UI call shape.
export const assignCourier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courierId, trackingNumber, courierCost, courierNotes, estimatedDelivery } = req.body;
  const order = await orderService.updateStatus(
    req.params.id, 'COURIER_ASSIGNED', req.user!.userId,
    { courierId, trackingNumber, courierCost, courierNotes, estimatedDelivery, ip: req.ip }
  );
  sendSuccess(res, order, 'Courier assigned');
});

// Phase 2 §7 — Step 1: move DISPATCHED -> RETURN_REQUESTED.
export const requestReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { note } = req.body;
  const order = await orderService.updateStatus(
    req.params.id, 'RETURN_REQUESTED', req.user!.userId, { note, ip: req.ip }
  );
  sendSuccess(res, order, 'Return requested');
});

// Phase 2 §7 — Step 2: RETURN_REQUESTED -> RETURNED with full return detail.
export const processReturn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await orderService.processReturn(req.params.id, {
    ...req.body,
    adminId: req.user!.userId,
  });
  sendSuccess(res, order, 'Return processed');
});

export const resendOrderEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  await resendEmail(req.params.emailLogId);
  sendSuccess(res, null, 'Email resent');
});

export const processRefund = asyncHandler(async (req: AuthRequest, res: Response) => {
  await orderService.processRefund(req.params.id, {
    ...req.body,
    adminId: req.user!.userId,
  });
  sendSuccess(res, null, 'Refund initiated');
});

export const bulkAction = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderIds, action, ...payload } = req.body;
  const count = await orderService.bulkAction(orderIds, action, req.user!.userId, payload);
  sendSuccess(res, { affected: count }, `Bulk ${action} completed`);
});

export const getDashboard = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stats = await orderService.getDashboardStats();
  sendSuccess(res, stats);
});

export const getRecentOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orders = await orderService.getRecentOrders(Number(req.query.limit) || 10);
  sendSuccess(res, orders);
});

export const getSalesChart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await orderService.getSalesChart(Number(req.query.days) || 30);
  sendSuccess(res, data);
});
