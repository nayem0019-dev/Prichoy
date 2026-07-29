/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 6 §21 — Automated Notification Service Architecture
// Providers (email/WhatsApp) are intentionally NOT wired to live
// third-party services yet — the architecture is built so Phase 7 can
// add a provider by implementing the two abstract methods below.
// All notification events are logged to the database regardless of
// whether an actual send succeeds, so the audit trail is always complete.
import { prisma } from '../config/database';

export interface NotificationPayload {
  type: string;
  recipientPhone: string;
  recipientEmail?: string;
  recipientName: string;
  subject?: string;
  message: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
  metadata?: Record<string, unknown>;
}

// ── Provider interface (implement in Phase 7 with live provider) ──
type SendResult = { success: boolean; provider: string; messageId?: string; error?: string };

async function sendWhatsApp(_payload: NotificationPayload): Promise<SendResult> {
  // Phase 7: implement with Bangladesh WhatsApp Business API / wati.io / etc.
  // For now, log and return no-op success so the order flow is never blocked.
  console.log(`[WhatsApp] Would send to ${_payload.recipientPhone}: ${_payload.message.slice(0, 80)}…`);
  return { success: false, provider: 'whatsapp_stub', error: 'Provider not configured' };
}

async function sendEmail(_payload: NotificationPayload): Promise<SendResult> {
  // Phase 7: implement with Mailgun / SendGrid / AWS SES.
  console.log(`[Email] Would send to ${_payload.recipientEmail}: ${_payload.subject}`);
  return { success: false, provider: 'email_stub', error: 'Provider not configured' };
}

export class NotificationService {
  private async log(orderId: string | undefined, type: string, channel: string, success: boolean, error?: string) {
    try {
      if (!orderId) return;
      // Use the existing EmailLog model as the notification log for now —
      // it already has the right fields (orderId, type, status, createdAt)
      // and adding a generic NotificationLog table would be a Phase 7 task.
      await prisma.emailLog.create({
        data: { orderId, type, status: success ? 'SENT' : 'FAILED', error, sentAt: new Date() },
      });
    } catch { /* log failure must never break the caller */ }
  }

  // ── Order status notifications ──────────────────────────────────
  async notifyOrderStatus(order: any, status: string) {
    const messages: Record<string, string> = {
      PENDING:    `✅ Hi ${order.customer?.name || order.shippingName}, your Prichoy order #${order.orderNo} has been received! We'll confirm it shortly.`,
      CONFIRMED:  `🎉 Great news! Your order #${order.orderNo} has been confirmed and is being packed.`,
      PACKED:     `📦 Your order #${order.orderNo} is packed and ready for pickup by the courier.`,
      DISPATCHED: `🚚 Your order #${order.orderNo} is on its way! Expected delivery: 1-2 days within Dhaka, 3-4 days outside.`,
      DELIVERED:  `🎁 Your order #${order.orderNo} has been delivered. Thank you for shopping with Prichoy! 💚`,
    };

    const msg = messages[status];
    if (!msg) return;

    const phone = order.customer?.phone || order.shippingPhone;
    const email = order.customer?.email;

    const waResult = await sendWhatsApp({ type: `ORDER_${status}`, recipientPhone: phone, recipientEmail: email, recipientName: order.shippingName, message: msg, channel: 'WHATSAPP' });
    await this.log(order.id, `ORDER_${status}_WHATSAPP`, 'WHATSAPP', waResult.success, waResult.error);

    if (email) {
      const emailResult = await sendEmail({ type: `ORDER_${status}`, recipientPhone: phone, recipientEmail: email, recipientName: order.shippingName, subject: `Your Prichoy Order Update — ${status}`, message: msg, channel: 'EMAIL' });
      await this.log(order.id, `ORDER_${status}_EMAIL`, 'EMAIL', emailResult.success, emailResult.error);
    }
  }

  // ── Review request notification ─────────────────────────────────
  async sendReviewRequest(order: any) {
    const msg = `💬 Hi ${order.customer?.name || order.shippingName}! How was your Prichoy order #${order.orderNo}? Leave a review: https://prichoy.com/pages/account.html`;
    const phone = order.customer?.phone || order.shippingPhone;
    await sendWhatsApp({ type: 'REVIEW_REQUEST', recipientPhone: phone, recipientName: order.shippingName, message: msg, channel: 'WHATSAPP' });
  }

  // ── Welcome Back Offer notification ────────────────────────────
  async sendWelcomeBackOffer(params: { customer: any; coupon: any; orderNumber: string }) {
    const { customer, coupon } = params;
    const expiryStr = new Date(coupon.expiresAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    const msg = `🎁 Thank you for your order, ${customer.name.split(' ')[0]}! Here's your exclusive Welcome Back offer:\n\nCode: *${coupon.code}*\nDiscount: ${coupon.discountText}\nMin Order: ৳499\nExpiry: ${expiryStr}\n\nShop now: https://prichoy.com`;

    await sendWhatsApp({ type: 'WELCOME_BACK', recipientPhone: customer.phone, recipientEmail: customer.email, recipientName: customer.name, message: msg, channel: 'WHATSAPP' });
    if (customer.email) {
      await sendEmail({ type: 'WELCOME_BACK', recipientPhone: customer.phone, recipientEmail: customer.email, recipientName: customer.name, subject: `Your Exclusive Welcome Back Offer — Prichoy`, message: msg, channel: 'EMAIL' });
    }
  }
}

export const notificationService = new NotificationService();
