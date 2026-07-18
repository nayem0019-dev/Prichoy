import { OrderStatus, PaymentMethod, EmailType, ContactMethod, ContactOutcome, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { orderRepository } from '../repositories/order.repository';
import { inventoryService } from './inventory.service';
import { fraudService } from './fraud.service';
import { sendOrderEmail } from './email.service';
import { AppError } from '../middlewares/error.middleware';
import { HTTP_STATUS, ORDER_STATUS_FLOW, EMAIL_TRIGGER_STATUSES, DELIVERY_CHARGES, DHAKA_DISTRICTS } from '../constants';
import { generateOrderNumber, generateInvoiceNumber } from '../utils/orderNumber';
import { logger } from '../config/logger';
import { OrderFilterQuery } from '../types';

interface CreateOrderData {
  customerId:      string;
  shippingName:    string;
  shippingPhone:   string;
  shippingAddress: string;
  shippingThana:   string;
  shippingDistrict:string;
  addressId?:      string;
  items: Array<{
    productId:   string;
    variantId?:  string;
    productName: string;
    variantInfo?: string;
    sku?:        string;
    image?:      string;
    quantity:    number;
    unitPrice:   number;
    discount?:   number;
  }>;
  paymentMethod?:  string; // ignored beyond COD — see §9, COD is the only supported method this phase
  couponCode?:     string;
  discountAmount?: number;
  notes?:          string;
  sourceIp?:       string;
}

interface StatusChangeOptions {
  note?: string;
  ip?: string;
  // COURIER_ASSIGNED
  courierId?: string;
  trackingNumber?: string;
  courierCost?: number;
  courierNotes?: string;
  estimatedDelivery?: string;
  // CANCELLED
  cancelReason?: string;
  // CUSTOMER_VERIFIED
  verificationNotes?: string;
}

/** Fire-and-forget email send that never lets a failure bubble up to the caller (§15). */
function fireOrderEmail(orderId: string, status: OrderStatus, extraNote?: string): void {
  const type = EMAIL_TRIGGER_STATUSES[status];
  if (!type) return; // Not one of the 5 emailed events — intentionally silent.
  sendOrderEmail(orderId, type as EmailType, extraNote).catch((e) => {
    logger.error(`Unexpected error sending ${type} email for order ${orderId}`, e);
  });
}

export class OrderService {
  async getAll(filter: OrderFilterQuery) {
    return orderRepository.findAll(filter);
  }

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order || order.isDeleted) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    return order;
  }

  async create(data: CreateOrderData, adminId?: string) {
    if (!data.items?.length) {
      throw new AppError('Order must contain at least one item', HTTP_STATUS.BAD_REQUEST);
    }

    // Phase 3 §18 — "Prevent blacklisted customers from placing orders."
    // Customer.isBlocked has existed since Phase 1/2, but nothing in the
    // order-creation path ever checked it — a genuine, pre-existing gap
    // closed here rather than newly introduced by this phase.
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer || customer.isDeleted) {
      throw new AppError('Customer not found', HTTP_STATUS.BAD_REQUEST);
    }
    if (customer.isBlocked) {
      throw new AppError(
        'This customer is blacklisted and cannot place new orders. Contact support to resolve this first.',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const [orderNo, invoiceNo] = await Promise.all([
      generateOrderNumber(),
      generateInvoiceNumber(),
    ]);

    const subtotal = data.items.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity) - (item.discount ?? 0),
      0
    );
    const discountAmount = data.discountAmount ?? 0;
    const isDhaka = DHAKA_DISTRICTS.some((d) =>
      data.shippingDistrict.toLowerCase().includes(d.toLowerCase())
    );
    const shippingCharge = isDhaka ? DELIVERY_CHARGES.DHAKA_CITY : DELIVERY_CHARGES.OUTSIDE_DHAKA;
    const grandTotal = subtotal - discountAmount + shippingCharge;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo,
          invoiceNo,
          customerId:       data.customerId,
          addressId:        data.addressId,
          shippingName:     data.shippingName,
          shippingPhone:    data.shippingPhone,
          shippingAddress:  data.shippingAddress,
          shippingThana:    data.shippingThana,
          shippingDistrict: data.shippingDistrict,
          // Phase 2 §9 — Cash On Delivery only, regardless of what was posted.
          paymentMethod:    'COD',
          couponCode:       data.couponCode,
          discountAmount,
          shippingCharge,
          subtotal,
          grandTotal,
          notes:            data.notes,
          sourceIp:         data.sourceIp,
          items: {
            create: data.items.map((item) => ({
              productId:   item.productId,
              variantId:   item.variantId,
              productName: item.productName,
              variantInfo: item.variantInfo,
              sku:         item.sku,
              image:       item.image,
              quantity:    item.quantity,
              unitPrice:   item.unitPrice,
              discount:    item.discount ?? 0,
              totalPrice:  (item.unitPrice * item.quantity) - (item.discount ?? 0),
            })),
          },
          payment: {
            create: { method: 'COD', amount: grandTotal, status: 'UNPAID' },
          },
          history: {
            create: { status: 'PENDING', previousStatus: null, adminId, note: 'Order placed' },
          },
        },
        include: {
          items: true,
          customer: { select: { id:true, name:true, phone:true, email:true } },
          payment: true,
          history: true,
        },
      });

      await tx.customer.update({
        where: { id: data.customerId },
        data: {
          totalOrders: { increment: 1 },
          totalSpent:  { increment: grandTotal },
          lastOrderAt: new Date(),
        },
      });

      const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
      if (customer) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { averageOrder: Number(customer.totalSpent) / customer.totalOrders },
        });
      }

      await tx.activityLog.create({
        data: {
          adminId, action: 'ORDER_CREATED', entity: 'orders', entityId: created.id,
          newValue: JSON.stringify({ orderNo, grandTotal }),
          ip: data.sourceIp,
        },
      });

      return created;
    });

    // Outside the transaction: never let a slow/failed SMTP call hold the
    // DB transaction open or roll back an order that was otherwise created
    // successfully (§15).
    fireOrderEmail(order.id, 'PENDING');

    return order;
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    adminId: string,
    options?: StatusChangeOptions
  ) {
    const order = await orderRepository.findByIdRaw(orderId); // includes items, no soft-delete filter needed for staff actions on an existing order id
    if (!order || order.isDeleted) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);

    const allowed = ORDER_STATUS_FLOW[order.status];
    if (!allowed?.includes(newStatus)) {
      throw new AppError(
        `Cannot transition from ${order.status} to ${newStatus}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Per-status required-field validation (Phase 2 §2/§6/§8) happens
    // before we open the transaction, so a bad request never even starts one.
    if (newStatus === 'COURIER_ASSIGNED') {
      if (!options?.courierId)      throw new AppError('Courier is required', HTTP_STATUS.BAD_REQUEST);
      if (!options?.trackingNumber) throw new AppError('Tracking number is required', HTTP_STATUS.BAD_REQUEST);
    }
    if (newStatus === 'CANCELLED' && !options?.cancelReason) {
      throw new AppError('Cancellation reason is required', HTTP_STATUS.BAD_REQUEST);
    }

    const previousStatus = order.status;

    await prisma.$transaction(async (tx) => {
      const updateData: Prisma.OrderUpdateInput = { status: newStatus };

      if (newStatus === 'CUSTOMER_VERIFIED') {
        updateData.verifiedById = adminId;
        updateData.verifiedAt = new Date();
        updateData.verificationNotes = options?.verificationNotes;
      }

      if (newStatus === 'COURIER_ASSIGNED') {
        updateData.courierId = options!.courierId;
        updateData.trackingNumber = options!.trackingNumber;
        updateData.courierCost = options?.courierCost;
        updateData.courierNotes = options?.courierNotes;
        if (options?.estimatedDelivery) updateData.estimatedDelivery = new Date(options.estimatedDelivery);
      }

      if (newStatus === 'DISPATCHED') {
        updateData.dispatchedAt = new Date();
      }

      if (newStatus === 'DELIVERED') {
        updateData.deliveredAt = new Date();
        // Phase 2 §9 — COD auto-marks Paid on delivery.
        updateData.paymentStatus = 'PAID';
      }

      if (newStatus === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = adminId;
        updateData.cancelReason = options!.cancelReason;
      }

      // ── Phase 2.1 Task 4 fix ──────────────────────────────────────────
      // Atomically claim this transition with a compare-and-swap on
      // `status`: the WHERE clause only matches if the order is still in
      // the state we read it in. If two requests race to transition the
      // SAME order at the same time, MySQL's row lock on this UPDATE
      // serializes them — the loser's WHERE re-evaluates against the
      // now-already-changed row and matches nothing, so `claim.count` is 0
      // and we abort *before* touching inventory or payments at all. This
      // closes a real gap the previous version had: it decided whether to
      // reduce/restore stock using order.stockReduced/stockRestored read
      // from a plain object fetched *before* the transaction opened, so
      // two concurrent requests (e.g. a double-click cancel, or a retried
      // network request) could both pass that check and both mutate stock.
      const claim = await tx.order.updateMany({
        where: { id: orderId, status: previousStatus },
        data: updateData,
      });
      if (claim.count === 0) {
        throw new AppError(
          'This order was just updated by someone else — please refresh and try again',
          HTTP_STATUS.CONFLICT
        );
      }

      if (newStatus === 'CONFIRMED') {
        // Phase 2 §4 — reduce stock on confirmation. Safe now: we've
        // already won the CAS above, so no other transition on this order
        // can be concurrently in flight.
        if (!order.stockReduced) {
          await inventoryService.reduceStockForOrder(tx, order, adminId);
          await tx.order.update({ where: { id: orderId }, data: { stockReduced: true } });
        }
      }

      if (newStatus === 'DELIVERED') {
        await tx.payment.updateMany({
          where: { orderId },
          data: { status: 'PAID', paidAt: new Date(), paidAmount: order.grandTotal },
        });
      }

      if (newStatus === 'CANCELLED') {
        // Phase 2.1 Task 1 — CANCELLED is now reachable from PENDING,
        // CUSTOMER_VERIFIED, CONFIRMED, PACKING, and PACKED (see
        // ORDER_STATUS_FLOW). Stock is only reduced once the order passes
        // through CONFIRMED, so this guard correctly does nothing for a
        // PENDING/CUSTOMER_VERIFIED cancellation and correctly restores
        // stock for a CONFIRMED/PACKING/PACKED cancellation.
        if (order.stockReduced && !order.stockRestored) {
          await inventoryService.restoreStockForOrder(tx, order, adminId, `Order ${order.orderNo} cancelled`);
          await tx.order.update({ where: { id: orderId }, data: { stockRestored: true } });
        }
      }

      if (newStatus === 'RETURNED') {
        if (order.stockReduced && !order.stockRestored) {
          await inventoryService.restoreStockForOrder(tx, order, adminId, `Order ${order.orderNo} returned`);
          await tx.order.update({ where: { id: orderId }, data: { stockRestored: true } });
        }
      }

      await tx.orderHistory.create({
        data: {
          orderId,
          previousStatus,
          status: newStatus,
          adminId,
          note: options?.note ?? options?.cancelReason ?? options?.verificationNotes,
          ip: options?.ip,
        },
      });

      await tx.activityLog.create({
        data: {
          adminId, action: `ORDER_${newStatus}`, entity: 'orders', entityId: orderId,
          oldValue: JSON.stringify({ status: previousStatus }),
          newValue: JSON.stringify({ status: newStatus }),
          ip: options?.ip,
        },
      });
    });

    // Fraud counters + email are deliberately outside the transaction:
    // neither should be able to roll back a status change that already
    // succeeded, and email sending in particular can be slow.
    if (newStatus === 'CANCELLED' || newStatus === 'RETURNED') {
      fraudService.recalculateFraudRisk(order.customerId).catch((e) =>
        logger.error(`Fraud recalculation failed for customer ${order.customerId}`, e)
      );
    }
    fireOrderEmail(orderId, newStatus, options?.cancelReason);

    return orderRepository.findById(orderId);
  }

  async addNote(orderId: string, note: string, adminId: string, isInternal = false) {
    const order = await this.getById(orderId);

    await orderRepository.update(orderId, {
      [isInternal ? 'adminNotes' : 'notes']: note,
    });

    await prisma.activityLog.create({
      data: {
        adminId,
        action:   'ADD_NOTE',
        entity:   'orders',
        entityId: orderId,
        newValue: JSON.stringify({ note, isInternal }),
      },
    });

    return order;
  }

  // ── Phase 2.1 Task 2 — Internal Order Notes ──────────────────────────
  // Kept deliberately separate from the legacy addNote()/adminNotes column
  // above (still used elsewhere, untouched) since these need per-note
  // Created By / Created Time / Last Updated and multiple entries per
  // order. Admin-only by construction: nothing in track.controller.ts or
  // orderRepository.findForTracking*() ever selects OrderNote.
  async addInternalNote(orderId: string, note: string, adminId: string) {
    await this.getById(orderId); // 404s if missing/soft-deleted
    const created = await prisma.orderNote.create({
      data: { orderId, note, createdById: adminId },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    await prisma.activityLog.create({
      data: { adminId, action: 'ADD_INTERNAL_NOTE', entity: 'orders', entityId: orderId },
    });
    return created;
  }

  async updateInternalNote(orderId: string, noteId: string, note: string, adminId: string) {
    const existing = await prisma.orderNote.findUnique({ where: { id: noteId } });
    if (!existing || existing.orderId !== orderId) {
      throw new AppError('Note not found', HTTP_STATUS.NOT_FOUND);
    }
    const updated = await prisma.orderNote.update({
      where: { id: noteId },
      data: { note },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    await prisma.activityLog.create({
      data: { adminId, action: 'UPDATE_INTERNAL_NOTE', entity: 'orders', entityId: orderId },
    });
    return updated;
  }

  // ── Phase 2.1 Task 3 — Customer Contact Log ──────────────────────────
  // Append-only: there is intentionally no update/delete method here
  // ("Never delete contact history").
  async addContactLog(orderId: string, data: {
    method: string;
    outcome: string;
    note?: string;
    staffId: string;
  }) {
    await this.getById(orderId);
    const created = await prisma.orderContactLog.create({
      data: {
        orderId,
        method: data.method as ContactMethod,
        outcome: data.outcome as ContactOutcome,
        note: data.note,
        staffId: data.staffId,
      },
      include: { staff: { select: { id: true, name: true } } },
    });
    await prisma.activityLog.create({
      data: {
        adminId: data.staffId, action: 'ADD_CONTACT_LOG', entity: 'orders', entityId: orderId,
        newValue: JSON.stringify({ method: data.method, outcome: data.outcome }),
      },
    });

    // A confirmed-on-contact outcome is a strong, explicit signal — but this
    // does NOT auto-transition the order. Verification/confirmation still
    // goes through updateStatus() so the normal transition guards, stock
    // logic, and email trigger all still apply. This just records the call.
    return created;
  }

  /** Phase 2.1 Task 3 — full history for the order detail page.
   *  contactLogs[0] (already included by orderRepository via ORDER_INCLUDE,
   *  ordered newest-first) doubles as "latest contact result" for the order
   *  list, so no separate list-only query path is needed. */
  async getContactLogs(orderId: string) {
    await this.getById(orderId);
    return prisma.orderContactLog.findMany({
      where: { orderId },
      orderBy: { contactedAt: 'desc' },
      include: { staff: { select: { id: true, name: true } } },
    });
  }

  /** Phase 2 §7 — return request → returned is a two-step transition (see
   *  ORDER_STATUS_FLOW: DISPATCHED -> RETURN_REQUESTED -> RETURNED). This
   *  completes the RETURNED half and records the Return record's detail. */
  async processReturn(orderId: string, data: {
    reason: string;
    condition?: string;
    images?: string[];
    restockItems?: boolean;
    note?: string;
    adminId: string;
  }) {
    const order = await orderRepository.findByIdRaw(orderId);
    if (!order || order.isDeleted) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    if (order.status !== 'RETURN_REQUESTED') {
      throw new AppError(
        `A return can only be completed from RETURN_REQUESTED (current status: ${order.status})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    await prisma.$transaction(async (tx) => {
      // Phase 2.1 Task 4 — same compare-and-swap pattern as updateStatus().
      // Before this fix, concurrency safety here relied *implicitly* on
      // Return.orderId being @unique (a second concurrent call's
      // tx.return.create() would hit a duplicate-key error and roll back
      // before ever reaching the stock restoration below). That's real
      // protection today, but it's an accidental side-effect of an
      // unrelated constraint, not a guard anyone reading this function
      // would notice — and it would silently stop protecting anything if
      // the Return model ever changed to allow multiple rows per order
      // (e.g. partial returns in a future phase). Making the guard
      // explicit here.
      const claim = await tx.order.updateMany({
        where: { id: orderId, status: 'RETURN_REQUESTED' },
        data: { status: 'RETURNED' },
      });
      if (claim.count === 0) {
        throw new AppError(
          'This order is no longer in RETURN_REQUESTED — it may have already been processed',
          HTTP_STATUS.CONFLICT
        );
      }

      await tx.return.create({
        data: {
          orderId,
          reason:        data.reason,
          condition:     data.condition,
          images:        data.images ? JSON.stringify(data.images) : undefined,
          restockItems:  data.restockItems ?? true,
          returnedById:  data.adminId,
          returnedAt:    new Date(),
          note:          data.note,
        },
      });

      if ((data.restockItems ?? true) && order.stockReduced && !order.stockRestored) {
        await inventoryService.restoreStockForOrder(tx, order, data.adminId, `Order ${order.orderNo} returned`);
        await tx.order.update({ where: { id: orderId }, data: { stockRestored: true } });
      }

      await tx.orderHistory.create({
        data: {
          orderId,
          previousStatus: 'RETURN_REQUESTED',
          status: 'RETURNED',
          adminId: data.adminId,
          note: data.reason,
        },
      });
      await tx.activityLog.create({
        data: {
          adminId: data.adminId, action: 'ORDER_RETURNED', entity: 'orders', entityId: orderId,
          newValue: JSON.stringify({ reason: data.reason }),
        },
      });
    });

    await fraudService.recalculateFraudRisk(order.customerId).catch((e) =>
      logger.error(`Fraud recalculation failed for customer ${order.customerId}`, e)
    );

    return orderRepository.findById(orderId);
  }

  async processRefund(orderId: string, data: {
    amount: number;
    method: string;
    reason: string;
    adminId: string;
  }) {
    const order = await this.getById(orderId);
    if (!['DELIVERED', 'RETURNED', 'CLOSED'].includes(order.status)) {
      throw new AppError(
        `Refunds can only be issued for DELIVERED, RETURNED, or CLOSED orders (current: ${order.status})`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          orderId,
          amount:  data.amount,
          method:  data.method as PaymentMethod,
          reason:  data.reason,
          status:  'PENDING',
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data:  { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
      });
      await tx.orderHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          status:  'REFUNDED',
          adminId: data.adminId,
          note:    `Refund of ৳${data.amount} via ${data.method}: ${data.reason}`,
        },
      });
      await tx.activityLog.create({
        data: {
          adminId: data.adminId, action: 'ORDER_REFUNDED', entity: 'orders', entityId: orderId,
          newValue: JSON.stringify({ amount: data.amount, method: data.method }),
        },
      });
    });

    return orderRepository.findById(orderId);
  }

  async getDashboardStats() {
    return orderRepository.getDashboardStats();
  }

  async getRecentOrders(limit = 10) {
    return orderRepository.getRecentOrders(limit);
  }

  async getSalesChart(days = 30) {
    return orderRepository.getSalesChart(days);
  }

  async bulkAction(orderIds: string[], action: string, adminId: string, payload?: Record<string, unknown>) {
    switch (action) {
      case 'VERIFY':
        for (const id of orderIds) {
          await this.updateStatus(id, 'CUSTOMER_VERIFIED', adminId, {
            verificationNotes: payload?.note as string | undefined,
          });
        }
        return orderIds.length;
      case 'CONFIRM':
        for (const id of orderIds) {
          await this.updateStatus(id, 'CONFIRMED', adminId);
        }
        return orderIds.length;
      case 'CANCEL': {
        const reason = (payload?.reason as string) ?? 'Bulk cancelled';
        for (const id of orderIds) {
          await this.updateStatus(id, 'CANCELLED', adminId, { cancelReason: reason });
        }
        return orderIds.length;
      }
      default:
        throw new AppError(`Unknown bulk action: ${action}`, HTTP_STATUS.BAD_REQUEST);
    }
  }
}

export const orderService = new OrderService();
