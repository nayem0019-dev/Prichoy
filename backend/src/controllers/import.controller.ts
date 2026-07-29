import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { importProductsFromCsv } from '../services/import.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

export const importProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError('No CSV file provided', HTTP_STATUS.BAD_REQUEST);
  const result = await importProductsFromCsv(req.file.buffer, req.user!.userId);
  // 200 even when some/all rows failed — the import request itself
  // succeeded; the per-row error report in the body is how failures are
  // surfaced (Phase 3 §19 — "Generate import error report").
  sendSuccess(res, result, `Imported ${result.imported}/${result.totalRows} rows`);
});
