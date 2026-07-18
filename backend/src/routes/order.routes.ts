import { Router } from 'express';
import * as ctrl from '../controllers/order.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();
router.use(authenticate);

// Dashboard
router.get('/dashboard',      ctrl.getDashboard);
router.get('/recent',         ctrl.getRecentOrders);
router.get('/chart/sales',    ctrl.getSalesChart);

// Orders CRUD
router.get('/',               authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT','DELIVERY_MANAGER','ACCOUNTANT'),
                              ctrl.getOrders);
router.get('/:id',            ctrl.getOrder);
router.post('/',              authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER'), ctrl.createOrder);

// Status workflow
router.put('/:id/status',     authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','DELIVERY_MANAGER'),
                              auditLog('UPDATE_ORDER_STATUS','orders'),
                              ctrl.updateOrderStatus);

// Customer verification (Phase 2 §2)
router.put('/:id/verify-customer', authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT'),
                              auditLog('VERIFY_CUSTOMER','orders'),
                              ctrl.verifyCustomer);

// Notes
router.post('/:id/note',      ctrl.addNote);

// Internal Order Notes (Phase 2.1 Task 2) — admin/staff only, never customer-visible.
router.post('/:id/notes',           authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT','DELIVERY_MANAGER'),
                                    ctrl.addInternalNote);
router.put('/:id/notes/:noteId',    authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT','DELIVERY_MANAGER'),
                                    ctrl.updateInternalNote);

// Customer Contact Log (Phase 2.1 Task 3) — append-only, no update/delete route by design.
router.post('/:id/contact-log',     authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT'),
                                    auditLog('ADD_CONTACT_LOG','orders'),
                                    ctrl.addContactLog);
router.get('/:id/contact-log',      authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT','DELIVERY_MANAGER'),
                                    ctrl.getContactLogs);

// Courier (Phase 2 §8)
router.put('/:id/courier',    authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','DELIVERY_MANAGER'),
                              auditLog('ASSIGN_COURIER','orders'),
                              ctrl.assignCourier);

// Return / Refund (Phase 2 §7)
router.put('/:id/return-request', authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','DELIVERY_MANAGER'),
                              auditLog('REQUEST_RETURN','orders'),
                              ctrl.requestReturn);
router.post('/:id/return',    authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER'),
                              auditLog('PROCESS_RETURN','orders'),
                              ctrl.processReturn);
router.post('/:id/refund',    authorize('SUPER_ADMIN','ADMIN','ACCOUNTANT'),    ctrl.processRefund);

// Email (Phase 2 §15)
router.post('/:id/emails/:emailLogId/resend', authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT'),
                              ctrl.resendOrderEmail);

// Bulk
router.post('/bulk',          authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER'), ctrl.bulkAction);

export default router;
