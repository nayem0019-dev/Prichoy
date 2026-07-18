import { Router } from 'express';
import * as ctrl from '../controllers/settings.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

// Settings
router.get('/',                ctrl.getSettings);
router.put('/',                authorize('SUPER_ADMIN'), ctrl.updateSettings);

// Notifications
router.get('/notifications',   ctrl.getNotifications);
router.put('/notifications/read', ctrl.markNotificationsRead);

// Audit Logs
router.get('/audit-logs',      authorize('SUPER_ADMIN','ADMIN'), ctrl.getActivityLogs);

// Expenses
router.get('/expenses',        ctrl.getExpenses);
router.post('/expenses',       ctrl.createExpense);
router.put('/expenses/:id',    ctrl.updateExpense);
router.delete('/expenses/:id', authorize('SUPER_ADMIN','ADMIN'), ctrl.deleteExpense);

// Users
router.get('/users',           authorize('SUPER_ADMIN','ADMIN'), ctrl.getUsers);
router.put('/users/:id',       authorize('SUPER_ADMIN'), ctrl.updateUser);
router.delete('/users/:id',    authorize('SUPER_ADMIN'), ctrl.deleteUser);

export default router;
