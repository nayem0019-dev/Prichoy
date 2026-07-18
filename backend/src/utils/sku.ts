import { prisma } from '../config/database';

const RANDOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — easier to read on a packing label

function randomSuffix(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }
  return out;
}

function prefixFromName(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (letters.slice(0, 3) || 'PRD').padEnd(3, 'X');
}

/**
 * Phase 3 §1 — "Auto Generated SKU". Format: `{CATEGORY-PREFIX}-{RANDOM6}`,
 * e.g. "TSH-8F3K2A". Unlike generateOrderNumber()'s count-based sequence
 * (fine for order numbers, which are only ever read/displayed, not used as
 * a uniqueness guarantee elsewhere), SKUs have a real `@unique` DB
 * constraint and product creation is far less sequential than order
 * placement — so this uses a random suffix with a collision-check retry
 * loop instead, which stays correct under concurrent product creation.
 */
export async function generateProductSku(categoryName: string): Promise<string> {
  const prefix = prefixFromName(categoryName);
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${prefix}-${randomSuffix()}`;
    const existing = await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  // Astronomically unlikely (33^6 possibilities per prefix), but fail loudly
  // rather than silently return a colliding SKU if it ever happens.
  throw new Error('Could not generate a unique SKU after 10 attempts');
}

/** Phase 3 §2 — variant SKU, derived from the parent product's SKU plus a short suffix (e.g. "TSH-8F3K2A-BLK-M"). */
export async function generateVariantSku(productSku: string, hint?: string): Promise<string> {
  const hintPart = hint ? hint.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `${productSku}-${hintPart || randomSuffix(4)}${attempt > 0 ? attempt : ''}`;
    const existing = await prisma.variant.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error('Could not generate a unique variant SKU after 10 attempts');
}
