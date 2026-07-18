import { Router } from 'express';
import * as ctrl from '../controllers/customer.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();
router.use(authenticate);

router.get('/stats',      ctrl.getCustomerStats);
router.get('/fraud-risks', authorize('SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT'), ctrl.getFraudRisks);
router.get('/top',        ctrl.getTopCustomers);
router.get('/',           ctrl.getCustomers);
router.get('/:id',        ctrl.getCustomer);
router.put('/:id',        authorize('SUPER_ADMIN','ADMIN','CUSTOMER_SUPPORT'),
                          auditLog('UPDATE_CUSTOMER','customers'), ctrl.updateCustomer);
router.post('/:id/note',  ctrl.addNote);
router.put('/:id/tags',   authorize('SUPER_ADMIN','ADMIN','CUSTOMER_SUPPORT'), ctrl.setCustomerTags);
router.post('/:id/notes', authorize('SUPER_ADMIN','ADMIN','CUSTOMER_SUPPORT','ORDER_MANAGER'), ctrl.addCustomerInternalNote);
router.put('/:id/notes/:noteId', authorize('SUPER_ADMIN','ADMIN','CUSTOMER_SUPPORT','ORDER_MANAGER'), ctrl.updateCustomerInternalNote);
router.post('/:id/block', authorize('SUPER_ADMIN','ADMIN'), auditLog('BLACKLIST_CUSTOMER','customers'), ctrl.blockCustomer);
router.post('/:id/unblock', authorize('SUPER_ADMIN','ADMIN'), auditLog('UNBLACKLIST_CUSTOMER','customers'), ctrl.unblockCustomer);
router.delete('/:id',     authorize('SUPER_ADMIN','ADMIN'), ctrl.deleteCustomer);
router.post('/:id/restore', authorize('SUPER_ADMIN','ADMIN'), ctrl.restoreCustomer);

export default router;
