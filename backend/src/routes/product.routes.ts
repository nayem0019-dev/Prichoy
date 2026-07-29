import { Router } from 'express';
import * as ctrl from '../controllers/product.controller';
import * as variantCtrl from '../controllers/variant.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';
import { uploadSingleImage } from '../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

// Categories (no auth on GET for customer site)
router.get('/categories',          ctrl.getCategories);
router.get('/categories/tree',     ctrl.getCategoryTree);
router.post('/categories',         authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                   auditLog('CREATE_CATEGORY','categories'), ctrl.createCategory);
router.put('/categories/:id',      authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                   auditLog('UPDATE_CATEGORY','categories'), ctrl.updateCategory);
router.delete('/categories/:id',   authorize('SUPER_ADMIN','ADMIN'),
                                   auditLog('DELETE_CATEGORY','categories'), ctrl.deleteCategory);
router.post('/categories/:id/restore', authorize('SUPER_ADMIN','ADMIN'), ctrl.restoreCategory);

// Brands
router.get('/brands',              ctrl.getBrands);
router.post('/brands',             authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.createBrand);
router.put('/brands/:id',          authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.updateBrand);
router.delete('/brands/:id',       authorize('SUPER_ADMIN','ADMIN'), ctrl.deleteBrand);

// Collections (Phase 3 §6)
router.get('/collections',         ctrl.getCollections);
router.post('/collections',        authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.createCollection);
router.put('/collections/:id',     authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.updateCollection);
router.delete('/collections/:id',  authorize('SUPER_ADMIN','ADMIN'), ctrl.deleteCollection);

// Analytics
router.get('/low-stock',           ctrl.getLowStockProducts);
router.get('/top-selling',         ctrl.getTopSellingProducts);

// Products CRUD
router.get('/',                    ctrl.getProducts);
router.get('/:id',                 ctrl.getProduct);
router.post('/',                   authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                   auditLog('CREATE_PRODUCT','products'), ctrl.createProduct);
router.put('/:id',                 authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                   auditLog('UPDATE_PRODUCT','products'), ctrl.updateProduct);
router.delete('/:id',              authorize('SUPER_ADMIN','ADMIN'),
                                   auditLog('DELETE_PRODUCT','products'), ctrl.deleteProduct);
router.post('/:id/restore', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.restoreProduct);

// Variants (Phase 3 §2) — no variant management API existed before this phase
router.get('/:id/variants',        variantCtrl.getVariants);
router.post('/:id/variants',       authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                   auditLog('CREATE_VARIANT','variants'), variantCtrl.createVariant);
router.put('/variants/:variantId', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                   auditLog('UPDATE_VARIANT','variants'), variantCtrl.updateVariant);
router.delete('/variants/:variantId', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                   auditLog('DELETE_VARIANT','variants'), variantCtrl.deleteVariant);
router.post('/variants/:variantId/restore', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), variantCtrl.restoreVariant);

// Duplication (Phase 3 §11)
router.post('/:id/duplicate', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                              auditLog('DUPLICATE_PRODUCT','products'), ctrl.duplicateProduct);

// Labels (Phase 3 §5)
router.put('/:id/labels',    authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.setProductLabels);

// Collection assignment (Phase 3 §6)
router.put('/:id/collections', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.setProductCollections);

// Colors + per-color image gallery (Phase 3 §3)
router.post('/:id/colors',            authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.addColor);
router.put('/colors/:colorId',        authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.updateColor);
router.delete('/colors/:colorId',     authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.deleteColor);
router.post('/colors/:colorId/images', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                       uploadSingleImage, ctrl.uploadColorImage);
router.delete('/colors/images/:imageId', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.deleteColorImage);

// Size Guide (Phase 3 §7)
router.get('/:id/size-guide', ctrl.getSizeGuide);
router.put('/:id/size-guide', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.upsertSizeGuide);

// Images
router.post('/:id/images',         authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.addProductImage);
router.post('/:id/images/upload',  authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'),
                                   uploadSingleImage, ctrl.uploadProductImage);
router.put('/:id/images/reorder',  authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.reorderProductImages);
router.delete('/:productId/images/:imageId', authorize('SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'), ctrl.deleteProductImage);

export default router;
