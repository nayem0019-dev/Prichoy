import nodemailer, { Transporter } from 'nodemailer';
import QRCode from 'qrcode';
import { EmailType, Order, OrderItem, Customer } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  OrderEmailData,
  renderOrderPlacedEmail,
  renderOrderConfirmedEmail,
  renderOrderDispatchedEmail,
  renderOrderDeliveredEmail,
  renderOrderCancelledEmail,
} from '../templates/email.templates';

type OrderWithItemsAndCustomer = Order & { items: OrderItem[]; customer: Customer };

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Order Received',
  CUSTOMER_VERIFIED: 'Customer Verified',
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

let transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (!env.smtp.user || !env.smtp.pass) return null; // Not configured — caller logs FAILED, order still succeeds.
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

const RENDERERS: Partial<Record<EmailType, (d: OrderEmailData) => { subject: string; html: string }>> = {
  ORDER_PLACED: renderOrderPlacedEmail,
  ORDER_CONFIRMED: renderOrderConfirmedEmail,
  ORDER_DISPATCHED: renderOrderDispatchedEmail,
  ORDER_DELIVERED: renderOrderDeliveredEmail,
  ORDER_CANCELLED: renderOrderCancelledEmail,
};

async function buildTemplateData(order: OrderWithItemsAndCustomer, extraNote?: string): Promise<OrderEmailData> {
  const trackingUrl = `${env.cors.frontendUrl}/track-order.html?token=${order.trackingToken}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, { margin: 1, width: 240 });
  } catch (e) {
    logger.error('QR code generation failed (non-fatal, email still sends without it)', e);
  }

  return {
    customerName: order.customer.name,
    orderNo: order.orderNo,
    orderDate: order.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] ?? order.status,
    grandTotal: `৳${Number(order.grandTotal).toLocaleString('en-BD')}`,
    paymentMethodLabel: 'Cash on Delivery',
    items: order.items.map((it) => ({
      name: it.productName,
      variant: it.variantInfo,
      qty: it.quantity,
      price: `৳${Number(it.totalPrice).toLocaleString('en-BD')}`,
    })),
    trackingUrl,
    qrCodeDataUrl,
    extraNote,
  };
}

/**
 * Sends one of the five Phase 2 §11 customer emails and writes an EmailLog
 * row regardless of outcome. NEVER throws — a failed email must never fail
 * the order-status change that triggered it (Phase 2 §15). Callers should
 * fire this without awaiting inside a request/transaction critical path,
 * or await it after the transaction has already committed.
 */
export async function sendOrderEmail(
  orderId: string,
  type: EmailType,
  extraNote?: string
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });

  if (!order) {
    logger.error(`sendOrderEmail: order ${orderId} not found`);
    return;
  }
  if (!order.customer.email) {
    // No email on file — not an error, just nothing to send. Still log it
    // so admins can see why a customer never got notified.
    await prisma.emailLog.create({
      data: {
        orderId, type, recipient: '(no email on file)', subject: '',
        status: 'FAILED', failureReason: 'Customer has no email address',
      },
    }).catch(() => null);
    return;
  }

  const renderer = RENDERERS[type];
  if (!renderer) {
    logger.error(`sendOrderEmail: no template registered for ${type}`);
    return;
  }

  const data = await buildTemplateData(order as OrderWithItemsAndCustomer, extraNote);
  const { subject, html } = renderer(data);

  const logEntry = await prisma.emailLog.create({
    data: { orderId, type, recipient: order.customer.email, subject, status: 'PENDING' },
  });

  try {
    const t = getTransporter();
    if (!t) throw new Error('SMTP is not configured (SMTP_USER/SMTP_PASS missing)');

    await t.sendMail({
      from: env.smtp.from,
      to: order.customer.email,
      subject,
      html,
    });

    await prisma.emailLog.update({
      where: { id: logEntry.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    logger.error(`Failed to send ${type} email for order ${order.orderNo}: ${message}`);
    await prisma.emailLog.update({
      where: { id: logEntry.id },
      data: { status: 'FAILED', failureReason: message },
    }).catch(() => null);
  }
}

/** Admin-triggered resend of a previously failed (or any) email log entry. */
export async function resendEmail(emailLogId: string): Promise<void> {
  const log = await prisma.emailLog.findUnique({ where: { id: emailLogId } });
  if (!log) throw new Error('Email log not found');
  if (!log.orderId) throw new Error('Cannot resend an email with no associated order');
  await sendOrderEmail(log.orderId, log.type);
}

export const emailService = { sendOrderEmail, resendEmail };
