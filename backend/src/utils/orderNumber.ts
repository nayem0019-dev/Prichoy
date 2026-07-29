import { prisma } from '../config/database';

export async function generateOrderNumber(): Promise<string> {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt:  new Date(`${year + 1}-01-01`),
      },
    },
  });

  const seq = String(count + 1).padStart(5, '0');
  return `PRC-${year}${month}-${seq}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const now  = new Date();
  const year = now.getFullYear();

  const count = await prisma.order.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });

  const seq = String(count + 1).padStart(6, '0');
  return `INV-${year}-${seq}`;
}

export async function generatePurchaseNumber(): Promise<string> {
  const count = await prisma.purchase.count();
  return `PO-${String(count + 1).padStart(5, '0')}`;
}
