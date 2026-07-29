import multer from 'multer';
import { Request } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { HTTP_STATUS } from '../constants';

// Phase 1's report flagged (§10, "File upload security — not applicable")
// that multer had never actually been wired to a route, so there was
// nothing to review yet — "When upload functionality is built, it must be
// reviewed for MIME-type/extension whitelisting, size limits, and random
// filenames at that time." This is that review, applied:
//
//   - MIME-type whitelist below (image formats only).
//   - Size limit from the pre-existing (previously unused) env.upload.maxSize.
//   - Memory storage, not disk — nothing touches the filesystem with an
//     attacker-controlled name; image.service.ts generates the on-disk
//     filename itself after processing.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new AppError(
      `Unsupported file type "${file.mimetype}". Only JPEG, PNG, and WebP images are allowed.`,
      HTTP_STATUS.BAD_REQUEST
    ) as unknown as Error);
    return;
  }
  cb(null, true);
}

const storage = multer.memoryStorage();

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxSize, files: 1 },
}).single('image');

export const uploadMultipleImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxSize, files: 10 },
}).array('images', 10);

// Phase 3 §19 — Bulk Import. Separate from the image uploader above: a
// different mimetype whitelist (CSV only) and a larger size ceiling isn't
// appropriate for a photo, but is for a product spreadsheet.
function csvFileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const isCsv = file.mimetype === 'text/csv'
    || file.mimetype === 'application/vnd.ms-excel' // some browsers send this for .csv
    || file.originalname.toLowerCase().endsWith('.csv');
  if (!isCsv) {
    cb(new AppError('Only .csv files are accepted for bulk import', HTTP_STATUS.BAD_REQUEST) as unknown as Error);
    return;
  }
  cb(null, true);
}

export const uploadCsv = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB — generous for a product CSV, still bounded
}).single('file');
