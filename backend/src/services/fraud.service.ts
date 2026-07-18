import { prisma } from '../config/database';
import { FRAUD_THRESHOLDS } from '../constants';

/**
 * Recalculates a customer's cancellation/return counters and fraud flag
 * from the ground truth (their order history), then caches the result on
 * the Customer row. Call this after any order reaches CANCELLED or
 * RETURNED — cheap enough (a handful of indexed counts) to do inline
 * rather than as a scheduled job, and keeps the admin list view (which
 * reads the cached fields) fast.
 */
export async function recalculateFraudRisk(customerId: string): Promise<void> {
  const [totalOrders, cancelledOrders, returnedOrders] = await Promise.all([
    prisma.order.count({ where: { customerId, isDeleted: false } }),
    prisma.order.count({ where: { customerId, status: 'CANCELLED', isDeleted: false } }),
    prisma.order.count({ where: { customerId, status: { in: ['RETURNED', 'CLOSED'] }, isDeleted: false } }),
  ]);

  const badOrders = cancelledOrders + returnedOrders;
  const rate = totalOrders > 0 ? badOrders / totalOrders : 0;

  const isFraudRisk =
    totalOrders >= FRAUD_THRESHOLDS.MIN_ORDERS_TO_EVALUATE &&
    (cancelledOrders >= FRAUD_THRESHOLDS.MAX_CANCELLATIONS ||
      returnedOrders >= FRAUD_THRESHOLDS.MAX_RETURNS ||
      rate >= FRAUD_THRESHOLDS.MAX_CANCELLATION_RATE);

  await prisma.customer.update({
    where: { id: customerId },
    data: { cancelledOrders, returnedOrders, isFraudRisk },
  });
}

export const fraudService = { recalculateFraudRisk };
