import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';
import { HTTP_STATUS } from '../constants';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode: number = HTTP_STATUS.OK
): void {
  const response: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created'): void {
  sendSuccess(res, data, message, HTTP_STATUS.CREATED);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'Success'
): void {
  const response: ApiResponse<T[]> = { success: true, message, data, meta };
  res.status(HTTP_STATUS.OK).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errors?: unknown
): void {
  const response: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(response);
}

export function sendNotFound(res: Response, message = 'Not found'): void {
  sendError(res, message, HTTP_STATUS.NOT_FOUND);
}

export function sendUnauthorized(res: Response, message = 'Unauthorized'): void {
  sendError(res, message, HTTP_STATUS.UNAUTHORIZED);
}

export function sendForbidden(res: Response, message = 'Forbidden'): void {
  sendError(res, message, HTTP_STATUS.FORBIDDEN);
}

export function sendBadRequest(res: Response, message: string, errors?: unknown): void {
  sendError(res, message, HTTP_STATUS.BAD_REQUEST, errors);
}
