import { Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AuthRequest } from '../types';
import { productService } from '../services/product.service';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS } from '../constants';

// Products
export const getProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { products, meta } = await productService.getAll(req.query as never);
  sendPaginated(res, products, meta);
});

export const getProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.getById(req.params.id);
  sendSuccess(res, product);
});

export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.create(req.body);
  sendCreated(res, product, 'Product created');
});

export const updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.update(req.params.id, req.body);
  sendSuccess(res, product, 'Product updated');
});

export const deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  await productService.delete(req.params.id, req.user!.userId);
  sendSuccess(res, null, 'Product deleted');
});

// Phase 2 §18 — undo a soft delete.
export const restoreProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.restore(req.params.id);
  sendSuccess(res, product, 'Product restored');
});

export const getLowStockProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const products = await productService.getLowStock(Number(req.query.threshold));
  sendSuccess(res, products);
});

export const getTopSellingProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const products = await productService.getTopSelling(Number(req.query.limit) || 10);
  sendSuccess(res, products);
});

export const addProductImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const image = await productService.addImage(req.params.id, req.body);
  sendCreated(res, image, 'Image added');
});

// Phase 3 §4 — real file upload (compress + thumbnail + WebP), as opposed
// to addProductImage above which just attaches an already-hosted URL
// (still used by bulk import and any externally-hosted image).
export const uploadProductImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError('No image file provided', HTTP_STATUS.BAD_REQUEST);
  const image = await productService.uploadImage(
    req.params.id,
    { buffer: req.file.buffer, mimetype: req.file.mimetype },
    { alt: req.body.alt, isPrimary: req.body.isPrimary === 'true' || req.body.isPrimary === true }
  );
  sendCreated(res, image, 'Image uploaded');
});

export const reorderProductImages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.reorderImages(req.params.id, req.body.imageIds);
  sendSuccess(res, product, 'Images reordered');
});

export const deleteProductImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  await productService.deleteImage(req.params.productId, req.params.imageId);
  sendSuccess(res, null, 'Image deleted');
});

// Phase 3 §11 — Product Duplication
export const duplicateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const copy = await productService.duplicate(req.params.id, req.user!.userId);
  sendCreated(res, copy, 'Product duplicated');
});

// Phase 3 §5 — Labels
export const setProductLabels = asyncHandler(async (req: AuthRequest, res: Response) => {
  const labels = await productService.setLabels(req.params.id, req.body.labels ?? [], req.user!.userId);
  sendSuccess(res, labels, 'Labels updated');
});

// Phase 3 §6 — Collections
export const getCollections = asyncHandler(async (_req: AuthRequest, res: Response) => {
  sendSuccess(res, await productService.getCollections());
});
export const createCollection = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendCreated(res, await productService.createCollection(req.body), 'Collection created');
});
export const updateCollection = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await productService.updateCollection(req.params.id, req.body), 'Collection updated');
});
export const deleteCollection = asyncHandler(async (req: AuthRequest, res: Response) => {
  await productService.deleteCollection(req.params.id);
  sendSuccess(res, null, 'Collection deleted');
});
export const setProductCollections = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await productService.setProductCollections(req.params.id, req.body.collectionIds ?? []);
  sendSuccess(res, product, 'Collections updated');
});

// Phase 3 §3 — Colors
export const addColor = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendCreated(res, await productService.addColor(req.params.id, req.body), 'Color added');
});
export const updateColor = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await productService.updateColor(req.params.colorId, req.body), 'Color updated');
});
export const deleteColor = asyncHandler(async (req: AuthRequest, res: Response) => {
  await productService.deleteColor(req.params.colorId);
  sendSuccess(res, null, 'Color deleted');
});
export const uploadColorImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError('No image file provided', HTTP_STATUS.BAD_REQUEST);
  const image = await productService.uploadColorImage(
    req.params.colorId,
    { buffer: req.file.buffer, mimetype: req.file.mimetype },
    { alt: req.body.alt, isPrimary: req.body.isPrimary === 'true' || req.body.isPrimary === true }
  );
  sendCreated(res, image, 'Color image uploaded');
});
export const deleteColorImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  await productService.deleteColorImage(req.params.imageId);
  sendSuccess(res, null, 'Color image deleted');
});

// Phase 3 §7 — Size Guide
export const getSizeGuide = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await productService.getSizeGuide(req.params.id));
});
export const upsertSizeGuide = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await productService.upsertSizeGuide(req.params.id, req.body), 'Size guide saved');
});

// Categories
export const getCategories = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const categories = await productService.getCategories();
  sendSuccess(res, categories);
});

export const createCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category = await productService.createCategory(req.body);
  sendCreated(res, category, 'Category created');
});

export const updateCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category = await productService.updateCategory(req.params.id, req.body);
  sendSuccess(res, category, 'Category updated');
});

export const deleteCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  await productService.deleteCategory(req.params.id, req.user!.userId);
  sendSuccess(res, null, 'Category deleted');
});

export const restoreCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category = await productService.restoreCategory(req.params.id);
  sendSuccess(res, category, 'Category restored');
});

export const getCategoryTree = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const tree = await productService.getCategoryTree();
  sendSuccess(res, tree);
});

// Brands
export const getBrands = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const brands = await productService.getBrands();
  sendSuccess(res, brands);
});

export const createBrand = asyncHandler(async (req: AuthRequest, res: Response) => {
  const brand = await productService.createBrand(req.body);
  sendCreated(res, brand, 'Brand created');
});

export const updateBrand = asyncHandler(async (req: AuthRequest, res: Response) => {
  const brand = await productService.updateBrand(req.params.id, req.body);
  sendSuccess(res, brand, 'Brand updated');
});

export const deleteBrand = asyncHandler(async (req: AuthRequest, res: Response) => {
  await productService.deleteBrand(req.params.id);
  sendSuccess(res, null, 'Brand deleted');
});
