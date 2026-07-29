import { Request } from 'express';

// These are re-declared locally because `prisma generate` cannot run in this
// build environment (network restriction on binaries.prisma.sh). The values
// exactly match the schema enums — Prisma will use identical string literals
// at runtime. Update this file if schema enums change.
export type Role =
  | 'SUPER_ADMIN' | 'ADMIN' | 'ORDER_MANAGER' | 'INVENTORY_MANAGER'
  | 'CUSTOMER_SUPPORT' | 'DELIVERY_MANAGER' | 'ACCOUNTANT' | 'OWNER' | 'MANAGER' | 'EMPLOYEE';

export type OrderStatusEnum =
  | 'PENDING' | 'CUSTOMER_VERIFIED' | 'CONFIRMED' | 'PACKING' | 'PACKED'
  | 'COURIER_ASSIGNED' | 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED' | 'CLOSED' | 'REFUNDED';

export type StockMovementTypeEnum =
  | 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'PURCHASE' | 'RETURN' | 'RESERVE' | 'UNRESERVE';

export type EmailTypeEnum =
  | 'ORDER_PLACED' | 'ORDER_CONFIRMED' | 'ORDER_DISPATCHED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED';

export type ContactMethodEnum = 'PHONE' | 'FACEBOOK' | 'WHATSAPP' | 'EMAIL';

export type ContactOutcomeEnum =
  | 'ORDER_CONFIRMED' | 'NO_ANSWER' | 'BUSY' | 'CALL_BACK_LATER'
  | 'CANCELLED_BY_CUSTOMER' | 'ADDRESS_UPDATED' | 'WRONG_NUMBER' | 'FAKE_ORDER';

export type ProductStatusEnum = 'PUBLISHED' | 'DRAFT' | 'HIDDEN' | 'COMING_SOON' | 'ARCHIVED';

export type ProductLabelEnum =
  | 'NEW' | 'BEST_SELLER' | 'TRENDING' | 'SALE' | 'LIMITED' | 'PREMIUM' | 'FEATURED';

export type CustomerTagEnum =
  | 'VIP' | 'REGULAR' | 'NEW' | 'BLOCKED' | 'FREQUENT' | 'WHOLESALE'
  | 'PRIORITY' | 'HIGH_RETURN_RISK' | 'HIGH_CANCELLATION_RISK';

export type PaymentMethodEnum = 'COD' | 'BKASH' | 'NAGAD' | 'CARD' | 'BANK_TRANSFER';

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

// ── Prisma type aliases (pre-generate stubs) ─────────────────────────
// These replace direct imports from '@prisma/client' which fail until
// `prisma generate` runs on the deployment host. At runtime, all these
// values are plain strings matching the schema enum values exactly.
// Remove these aliases after first successful `prisma generate`.
export type OrderStatus = OrderStatusEnum;
export type StockMovementType = StockMovementTypeEnum;
export type EmailType = EmailTypeEnum;
export type ContactMethod = ContactMethodEnum;
export type ContactOutcome = ContactOutcomeEnum;
export type ProductStatus = ProductStatusEnum;
export type ProductLabel = ProductLabelEnum;
export type CustomerTag = CustomerTagEnum;
export type PaymentMethod = PaymentMethodEnum;
export type User = {
  id: string; name: string; email: string; role: Role;
  password?: string | null; passwordHash?: string | null;
  isActive?: boolean; isDeleted?: boolean;
  lockedUntil?: Date | null;
  failedLoginAttempts?: number; lastLoginAt?: Date | null;
  lastLoginIp?: string | null; lastLoginUserAgent?: string | null;
  [key: string]: unknown;
};
export type Order = Record<string, unknown>;
export type OrderItem = Record<string, unknown>;
export type Customer = Record<string, unknown>;
