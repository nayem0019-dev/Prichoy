import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  role: Role;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface OrderFilterQuery extends PaginationQuery, DateRangeQuery {
  status?: string;
  paymentStatus?: string;
  courierId?: string;
  customerId?: string;
}

export interface ProductFilterQuery extends PaginationQuery {
  categoryId?: string;
  brandId?: string;
  gender?: string;
  isActive?: boolean;
  lowStock?: boolean;
  // Phase 3 §10 — additional admin filters
  status?: string;
  isFeatured?: boolean;
  label?: string;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}
