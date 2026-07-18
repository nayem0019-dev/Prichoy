import { PAGINATION } from '../constants';
import { PaginationMeta, PaginationQuery } from '../types';

export function getPaginationParams(query: PaginationQuery): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page  = Math.max(1, Number(query.page)  || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, Number(query.limit) || PAGINATION.DEFAULT_LIMIT)
  );
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function buildPaginationMeta(
  total: number, page: number, limit: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Phase 3 §25 bug review — query-string booleans arrive from Express as
 * the literal strings "true"/"false" (or "1"/"0"), never real booleans.
 * Several filters across the admin API (Product.isActive/isFeatured,
 * Customer.isBlocked/isFraudRisk) were passing that raw string straight
 * into a Prisma boolean WHERE clause, which Prisma would reject or
 * mishandle at runtime. Centralized here instead of fixed ad hoc in each
 * repository/service so it can't silently regress in one place while
 * being fixed in another.
 */
export function toBool(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}
