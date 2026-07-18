import { parse } from 'csv-parse/sync';
import { prisma } from '../config/database';
import { productService } from './product.service';
import { variantService } from './variant.service';

export interface ImportRowError {
  row: number;      // 1-based, matches the row number a spreadsheet app would show (header excluded)
  identifier: string; // whatever the row's own SKU/name was, for the admin to find it again
  error: string;
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  failed: number;
  errors: ImportRowError[];
}

interface ProductCsvRow {
  name?: string; sku?: string; description?: string; shortDescription?: string;
  category?: string; brand?: string; gender?: string;
  costPrice?: string; sellingPrice?: string; salePrice?: string; weight?: string;
  season?: string; material?: string; careInstructions?: string; countryOfOrigin?: string;
  status?: string; initialStock?: string;
  variantName?: string; variantValue?: string; variantSku?: string; variantBarcode?: string;
  variantPrice?: string; variantSalePrice?: string; variantStock?: string; colorName?: string;
}

/**
 * Phase 3 §19 — Bulk Import (Products, Variants, Inventory, Categories in
 * one file). CSV format, one row per product OR per additional variant of
 * an already-imported product (identified by repeating the same `sku` /
 * `name`+`category` on a later row — see the Phase 3 report for the exact
 * column list and an example). Every row is validated and imported
 * independently: one bad row does not abort the rest of the file, and
 * every row's outcome (success or the specific validation error) is
 * returned so nothing is a silent partial success.
 */
export async function importProductsFromCsv(buffer: Buffer, adminId: string): Promise<ImportResult> {
  let rows: ProductCsvRow[];
  try {
    rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as ProductCsvRow[];
  } catch (e) {
    return {
      totalRows: 0, imported: 0, failed: 0,
      errors: [{ row: 0, identifier: '(file)', error: `Could not parse CSV: ${(e as Error).message}` }],
    };
  }

  const errors: ImportRowError[] = [];
  let imported = 0;

  // Default warehouse for initialStock — bulk import doesn't ask the admin
  // to pick one per row (that's what per-warehouse stock transfers are for,
  // already covered by inventoryService.transferStock).
  const defaultWarehouse = await prisma.warehouse.findFirst({ where: { isDefault: true } })
    ?? await prisma.warehouse.findFirst();

  // Track SKU -> created productId within this same import run, so rows
  // 2..n for the same product can attach additional variants to it
  // instead of trying to create the product again.
  const skuToProductId = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const identifier = row.sku || row.variantSku || row.name || `row ${rowNum}`;

    try {
      const existingProductId = row.sku ? skuToProductId.get(row.sku) : undefined;

      let productId = existingProductId;
      if (!productId) {
        if (!row.name) throw new Error('Missing required field: name');
        if (!row.category) throw new Error('Missing required field: category');
        if (!row.costPrice || isNaN(Number(row.costPrice))) throw new Error('Missing/invalid costPrice');
        if (!row.sellingPrice || isNaN(Number(row.sellingPrice))) throw new Error('Missing/invalid sellingPrice');
        if (!defaultWarehouse) throw new Error('No warehouse exists to receive initial stock — create one first');

        let category = await prisma.category.findFirst({ where: { name: row.category, isDeleted: false } });
        if (!category) {
          // Phase 3 §19 — Categories are importable too: an unrecognized
          // category name is created on the fly rather than failing the row,
          // since that's the common case (a new season's categories didn't
          // exist yet) rather than a typo. A typo just creates an extra
          // category, which is easy to spot and merge/delete afterward —
          // silently failing every row for a new category would be worse.
          const slug = row.category.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          category = await prisma.category.create({ data: { name: row.category, slug } });
        }

        let brandId: string | undefined;
        if (row.brand) {
          const brand = await prisma.brand.findFirst({ where: { name: row.brand } });
          if (brand) brandId = brand.id;
          // Unlike categories, an unrecognized brand is left blank rather
          // than auto-created — brand identity (spelling, official name)
          // matters more for a clothing business than category naming, and
          // is much more likely to be a genuine typo worth catching by hand.
        }

        const product = await productService.create({
          name: row.name,
          sku: row.sku,
          description: row.description,
          shortDescription: row.shortDescription,
          categoryId: category.id,
          brandId,
          gender: row.gender,
          costPrice: Number(row.costPrice),
          sellingPrice: Number(row.sellingPrice),
          salePrice: row.salePrice ? Number(row.salePrice) : undefined,
          weight: row.weight ? Number(row.weight) : undefined,
          season: row.season, material: row.material,
          careInstructions: row.careInstructions, countryOfOrigin: row.countryOfOrigin,
          status: row.status,
          slug: `${row.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}-${i}`,
          warehouseId: defaultWarehouse.id,
          initialStock: row.initialStock ? Number(row.initialStock) : 0,
        });

        productId = product.id;
        if (row.sku) skuToProductId.set(row.sku, product.id);
        else skuToProductId.set(product.sku, product.id); // auto-generated SKU — key by it so later rows can reference it via the same column if they want
      }

      if (!productId) {
        // Unreachable in practice (the branch above always assigns it or
        // throws first) — kept as an explicit guard rather than a
        // non-null assertion so a future change to the branch above fails
        // loudly instead of silently passing `undefined` to variantService.
        throw new Error('Internal error: no product to attach this row to');
      }

      // Optional variant on this same row
      if (row.variantName && row.variantValue) {
        let colorId: string | undefined;
        if (row.colorName) {
          let color = await prisma.productColor.findFirst({ where: { productId, name: row.colorName } });
          if (!color) color = await prisma.productColor.create({ data: { productId, name: row.colorName } });
          colorId = color.id;
        }
        await variantService.create(productId, {
          name: row.variantName, value: row.variantValue,
          sku: row.variantSku, barcode: row.variantBarcode,
          price: row.variantPrice ? Number(row.variantPrice) : undefined,
          salePrice: row.variantSalePrice ? Number(row.variantSalePrice) : undefined,
          stock: row.variantStock ? Number(row.variantStock) : 0,
          colorId,
        });
      }

      imported++;
    } catch (e) {
      errors.push({ row: rowNum, identifier, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  }

  await prisma.activityLog.create({
    data: {
      adminId, action: 'BULK_IMPORT_PRODUCTS', entity: 'products',
      newValue: JSON.stringify({ totalRows: rows.length, imported, failed: errors.length }),
    },
  }).catch(() => null);

  return { totalRows: rows.length, imported, failed: errors.length, errors };
}
