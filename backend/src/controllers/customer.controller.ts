import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { customerService } from '../services/customer.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const getCustomers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { customers, meta } = await customerService.getAll(req.query as never);
  sendPaginated(res, customers, meta);
});

export const getCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const customer = await customerService.getById(req.params.id);
  sendSuccess(res, customer);
});

export const updateCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const customer = await customerService.update(req.params.id, req.body);
  sendSuccess(res, customer, 'Customer updated');
});

export const addNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  await customerService.addNote(req.params.id, req.body.note);
  sendSuccess(res, null, 'Note saved');
});

export const blockCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const customer = await customerService.block(req.params.id, req.body.reason, req.user!.userId);
  sendSuccess(res, customer, 'Customer blocked');
});

export const unblockCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const customer = await customerService.unblock(req.params.id, req.user!.userId);
  sendSuccess(res, customer, 'Customer unblocked');
});

// Phase 3 §16 — multi-tag assignment
export const setCustomerTags = asyncHandler(async (req: AuthRequest, res: Response) => {
  const tags = await customerService.setTags(req.params.id, req.body.tags ?? []);
  sendSuccess(res, tags, 'Tags updated');
});

// Phase 3 §17 — internal notes
export const addCustomerInternalNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const note = await customerService.addInternalNote(req.params.id, req.body.note, req.user!.userId);
  sendSuccess(res, note, 'Note added');
});

export const updateCustomerInternalNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const note = await customerService.updateInternalNote(req.params.id, req.params.noteId, req.body.note);
  sendSuccess(res, note, 'Note updated');
});

export const getTopCustomers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const customers = await customerService.getTopCustomers(Number(req.query.limit) || 10);
  sendSuccess(res, customers);
});

export const getCustomerStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stats = await customerService.getStats();
  sendSuccess(res, stats);
});

// Phase 2 §16 — flagged-customer list for the admin warning panel.
export const getFraudRisks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const customers = await customerService.getFraudRisks(Number(req.query.limit) || 50);
  sendSuccess(res, customers);
});

// Phase 2 §18 — soft delete only, never a hard delete.
export const deleteCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  await customerService.softDelete(req.params.id, req.user!.userId);
  sendSuccess(res, null, 'Customer deleted');
});

export const restoreCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const customer = await customerService.restore(req.params.id);
  sendSuccess(res, customer, 'Customer restored');
});
