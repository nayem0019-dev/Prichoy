import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';
import { HTTP_STATUS } from '../constants';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public errors?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack });

  // App errors (intentionally thrown)
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'Validation failed', HTTP_STATUS.UNPROCESSABLE, errors);
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        sendError(res, 'A record with this value already exists', HTTP_STATUS.CONFLICT);
        return;
      case 'P2025':
        sendError(res, 'Record not found', HTTP_STATUS.NOT_FOUND);
        return;
      case 'P2003':
        sendError(res, 'Related record not found', HTTP_STATUS.BAD_REQUEST);
        return;
      default:
        sendError(res, 'Database error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError(res, 'Invalid data provided', HTTP_STATUS.BAD_REQUEST);
    return;
  }

  // Default server error (don't leak internals in production)
  sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND);
}
