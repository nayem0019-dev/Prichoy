import { env } from '../config/env';

// ── PRICHOY brand tokens ──────────────────────────────────────────────
// Kept in one place so every template stays visually consistent and a
// future rebrand only touches this file.
const BRAND = {
  name: env.company.name,
  primary: '#111827',   // near-black — matches a clothing-brand aesthetic
  accent: '#C9A227',    // muted gold accent
  bg: '#f4f4f5',
  cardBg: '#ffffff',
  text: '#1f2937',
  muted: '#6b7280',
  website: 'https://www.prichoy.com',
  facebook: 'https://www.facebook.com/PRICHOY/',
  supportPhone: '01762647661',
};

export interface OrderEmailData {
  customerName: string;
  orderNo: string;
  orderDate: string;
  status: string;
  statusLabel: string;
  grandTotal: string;
  paymentMethodLabel: string;
  items: Array<{ name: string; variant?: string | null; qty: number; price: string }>;
  trackingUrl: string;
  qrCodeDataUrl: string;
  extraNote?: string;
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${BRAND.cardBg};border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND.primary};padding:28px 32px;text-align:center;">
              <span style="font-size:24px;letter-spacing:2px;color:#ffffff;font-weight:700;">PRICHOY</span>
              <div style="color:${BRAND.accent};font-size:11px;letter-spacing:3px;margin-top:4px;">CLOTHING</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:${BRAND.text};font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:24px 32px;border-top:1px solid #eee;color:${BRAND.muted};font-size:12px;line-height:1.8;text-align:center;">
              <div><strong>PRICHOY</strong> — Dhaka, Bangladesh</div>
              <div>
                <a href="${BRAND.website}" style="color:${BRAND.muted};text-decoration:underline;">${BRAND.website.replace('https://', '')}</a>
                &nbsp;•&nbsp;
                <a href="${BRAND.facebook}" style="color:${BRAND.muted};text-decoration:underline;">Facebook</a>
                &nbsp;•&nbsp;
                Support: ${BRAND.supportPhone}
              </div>
              <div style="margin-top:8px;color:#b0b0b0;">You're receiving this because you placed an order with PRICHOY.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function trackButton(url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td align="center" style="border-radius:6px;background:${BRAND.primary};">
        <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;border-radius:6px;">
          Track My Order
        </a>
      </td>
    </tr>
  </table>`;
}

function orderSummaryTable(data: OrderEmailData): string {
  const rows = data.items.map((it) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;">
        ${it.name}${it.variant ? `<div style="color:${BRAND.muted};font-size:12px;">${it.variant}</div>` : ''}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;font-size:14px;">×${it.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;">${it.price}</td>
    </tr>`).join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #eee;border-radius:6px;padding:16px;">
    <tr>
      <td colspan="3" style="padding-bottom:12px;font-size:13px;color:${BRAND.muted};">
        Order <strong style="color:${BRAND.text};">#${data.orderNo}</strong> &nbsp;•&nbsp; ${data.orderDate}
      </td>
    </tr>
    ${rows}
    <tr>
      <td colspan="2" style="padding-top:12px;font-weight:700;">Grand Total</td>
      <td style="padding-top:12px;text-align:right;font-weight:700;">${data.grandTotal}</td>
    </tr>
    <tr>
      <td colspan="3" style="padding-top:8px;font-size:13px;color:${BRAND.muted};">
        Payment Method: ${data.paymentMethodLabel} (Cash on Delivery)
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding-top:4px;font-size:13px;color:${BRAND.muted};">
        Current Status: <strong style="color:${BRAND.text};">${data.statusLabel}</strong>
      </td>
    </tr>
  </table>`;
}

function qrBlock(dataUrl: string): string {
  if (!dataUrl) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 0;">
    <tr><td align="center">
      <img src="${dataUrl}" alt="Scan to track your order" width="120" height="120" style="display:block;border:1px solid #eee;border-radius:6px;" />
      <div style="font-size:11px;color:${BRAND.muted};margin-top:6px;">Scan to track your order</div>
    </td></tr>
  </table>`;
}

export function renderOrderPlacedEmail(d: OrderEmailData): { subject: string; html: string } {
  const body = `
    <p>Hi ${d.customerName},</p>
    <p>Thank you for shopping with PRICHOY! We've received your order and it's now being reviewed.</p>
    ${orderSummaryTable(d)}
    ${trackButton(d.trackingUrl)}
    ${qrBlock(d.qrCodeDataUrl)}
    <p style="margin-top:24px;">We'll email you again once your order is confirmed.</p>`;
  return { subject: `PRICHOY — Order Received (#${d.orderNo})`, html: layout('Order Received', body) };
}

export function renderOrderConfirmedEmail(d: OrderEmailData): { subject: string; html: string } {
  const body = `
    <p>Hi ${d.customerName},</p>
    <p>Good news — your order has been <strong>confirmed</strong> and is being prepared for packing.</p>
    ${orderSummaryTable(d)}
    ${trackButton(d.trackingUrl)}
    ${qrBlock(d.qrCodeDataUrl)}`;
  return { subject: `PRICHOY — Order Confirmed (#${d.orderNo})`, html: layout('Order Confirmed', body) };
}

export function renderOrderDispatchedEmail(d: OrderEmailData): { subject: string; html: string } {
  const body = `
    <p>Hi ${d.customerName},</p>
    <p>Your order is on its way! It has been handed over to our courier partner.</p>
    ${orderSummaryTable(d)}
    ${trackButton(d.trackingUrl)}
    ${qrBlock(d.qrCodeDataUrl)}
    <p style="margin-top:24px;">Please keep the Cash on Delivery amount ready when the courier arrives.</p>`;
  return { subject: `PRICHOY — Order Dispatched (#${d.orderNo})`, html: layout('Order Dispatched', body) };
}

export function renderOrderDeliveredEmail(d: OrderEmailData): { subject: string; html: string } {
  const body = `
    <p>Hi ${d.customerName},</p>
    <p>Your order has been <strong>delivered</strong>. Thank you for choosing PRICHOY — we hope you love it!</p>
    ${orderSummaryTable(d)}
    ${trackButton(d.trackingUrl)}
    <p style="margin-top:24px;">If anything is wrong with your order, contact us at ${BRAND.supportPhone}.</p>`;
  return { subject: `PRICHOY — Order Delivered (#${d.orderNo})`, html: layout('Order Delivered', body) };
}

export function renderOrderCancelledEmail(d: OrderEmailData): { subject: string; html: string } {
  const body = `
    <p>Hi ${d.customerName},</p>
    <p>Your order has been <strong>cancelled</strong>${d.extraNote ? `: ${d.extraNote}` : '.'}</p>
    ${orderSummaryTable(d)}
    <p style="margin-top:24px;">If this wasn't expected, please call us at ${BRAND.supportPhone} and we'll help sort it out.</p>`;
  return { subject: `PRICHOY — Order Cancelled (#${d.orderNo})`, html: layout('Order Cancelled', body) };
}
