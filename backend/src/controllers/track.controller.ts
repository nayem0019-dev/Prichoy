import { Response, Request } from 'express';
import asyncHandler from 'express-async-handler';
import { orderRepository } from '../repositories/order.repository';
import { sendSuccess, sendNotFound } from '../utils/response';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Order Received',
  CUSTOMER_VERIFIED: 'Being Reviewed',
  CONFIRMED: 'Confirmed',
  PACKING: 'Being Packed',
  PACKED: 'Packed',
  COURIER_ASSIGNED: 'Courier Assigned',
  DISPATCHED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return Requested',
  RETURNED: 'Returned',
  CLOSED: 'Closed',
  REFUNDED: 'Refunded',
};

// Statuses a customer should never see verbatim reasoning/notes for — only
// the bare status + timestamp is exposed on the public timeline. Internal
// admin notes (adminNotes, cancelReason detail, verification notes, courier
// notes) are never returned by this endpoint at all — findForTracking()
// only selects public-safe columns.
function toPublicShape(order: {
  orderNo: string; status: string; trackingNumber: string | null;
  estimatedDelivery: Date | null; dispatchedAt: Date | null; deliveredAt: Date | null;
  createdAt: Date; courier: { name: string } | null;
  history: Array<{ status: string; createdAt: Date }>;
}) {
  return {
    orderNo: order.orderNo,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] ?? order.status,
    courierName: order.courier?.name ?? null,
    trackingNumber: order.trackingNumber,
    estimatedDelivery: order.estimatedDelivery,
    dispatchedAt: order.dispatchedAt,
    deliveredAt: order.deliveredAt,
    orderDate: order.createdAt,
    timeline: order.history.map((h) => ({
      status: h.status,
      statusLabel: STATUS_LABELS[h.status] ?? h.status,
      changedAt: h.createdAt,
    })),
  };
}

// POST /api/track  { orderNo, phone }
export const trackByOrderAndPhone = asyncHandler(async (req: Request, res: Response) => {
  const { orderNo, phone } = req.body as { orderNo?: string; phone?: string };

  if (!orderNo || !phone) {
    return sendNotFound(res, 'Order number and phone number are required');
  }

  const order = await orderRepository.findForTracking(orderNo.trim(), phone.trim());
  if (!order) {
    // Deliberately identical message whether the order doesn't exist or the
    // phone doesn't match — never confirm which field was wrong, or an
    // attacker could enumerate valid order numbers.
    return sendNotFound(res, 'No order found matching that order number and phone number');
  }

  sendSuccess(res, toPublicShape(order));
});

// GET /api/track/:token  — used by the "Track My Order" email button / QR code
export const trackByToken = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderRepository.findForTrackingByToken(req.params.token);
  if (!order) return sendNotFound(res, 'Tracking link is invalid or has expired');
  sendSuccess(res, toPublicShape(order));
});
