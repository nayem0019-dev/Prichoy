/* eslint-disable @typescript-eslint/no-explicit-any */
// Phase 6.5 §1 — Sandbox Mode
// Uses the existing Setting table (key/value store) to persist the
// sandbox config — no new table needed.
//
// Sandbox keys stored in settings:
//   sandbox_mode        'true'|'false'   — master toggle
//   sandbox_send_email  'true'|'false'   — whether to fire email notifs
//   sandbox_send_whatsapp 'true'|'false' — whether to fire WhatsApp notifs
//
// When sandbox_mode = true, any order created (website, manual, marketplace)
// gets isTest=true. The isTest flag is the source of truth for exclusion
// from all analytics, reports, stock movements, revenue, and coupon stats.
// No business logic is silently skipped — instead every place that could
// be affected reads isSandbox() and short-circuits there, keeping the
// actual order flow intact (order is still stored, still shows in admin
// with a TEST ORDER badge) so the owner can verify the whole flow.

import { prisma } from '../config/database';

const SANDBOX_KEY = 'sandbox_mode';
const SEND_EMAIL_KEY = 'sandbox_send_email';
const SEND_WHATSAPP_KEY = 'sandbox_send_whatsapp';

async function getVal(key: string, fallback = 'false'): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

async function setVal(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value, group: 'sandbox' },
    update: { value },
  });
}

export const sandboxService = {
  async getConfig() {
    const [mode, email, whatsapp] = await Promise.all([
      getVal(SANDBOX_KEY, 'false'),
      getVal(SEND_EMAIL_KEY, 'false'),
      getVal(SEND_WHATSAPP_KEY, 'false'),
    ]);
    return {
      sandboxMode: mode === 'true',
      sendEmail: email === 'true',
      sendWhatsapp: whatsapp === 'true',
    };
  },

  async isActive(): Promise<boolean> {
    const val = await getVal(SANDBOX_KEY, 'false');
    return val === 'true';
  },

  async setConfig(input: { sandboxMode?: boolean; sendEmail?: boolean; sendWhatsapp?: boolean }) {
    const ops: Promise<void>[] = [];
    if (input.sandboxMode !== undefined) ops.push(setVal(SANDBOX_KEY, input.sandboxMode ? 'true' : 'false'));
    if (input.sendEmail !== undefined)   ops.push(setVal(SEND_EMAIL_KEY, input.sendEmail ? 'true' : 'false'));
    if (input.sendWhatsapp !== undefined) ops.push(setVal(SEND_WHATSAPP_KEY, input.sendWhatsapp ? 'true' : 'false'));
    await Promise.all(ops);
    return this.getConfig();
  },

  // Removes all test orders and their items. NEVER touches real orders.
  // Returns counts of what was deleted so the admin can see what was cleared.
  async clearTestData() {
    // Delete order items first (FK constraint), then orders
    const testOrders: any[] = await prisma.order.findMany({
      where: { isTest: true },
      select: { id: true },
    });
    const ids = testOrders.map((o: any) => o.id);
    if (!ids.length) return { ordersDeleted: 0, itemsDeleted: 0 };

    const [itemsDeleted] = await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
    ]);

    // Delete related records before orders (soft-delete aware)
    await prisma.$transaction([
      prisma.orderHistory.deleteMany({ where: { orderId: { in: ids } } }),
      prisma.orderNote.deleteMany({ where: { orderId: { in: ids } } }),
    ]);

    await prisma.order.deleteMany({ where: { id: { in: ids } } });

    return { ordersDeleted: ids.length, itemsDeleted: itemsDeleted.count };
  },
};

// Helper used by analytics, report, and inventory services to exclude
// test orders from every query that touches revenue or stock.
// Use as a Prisma `where` clause addition: { ...realOrderFilter() }
export function realOrderFilter(): { isTest: boolean } {
  return { isTest: false };
}
