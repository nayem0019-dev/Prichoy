import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { prisma } from '../config/database';
import { OrderFilterQuery, ProductFilterQuery } from '../types';

export class ExportService {
  // ── Generic helpers ────────────────────────────────────────────────

  private toSheet(data: Record<string, unknown>[]): XLSX.WorkSheet {
    return XLSX.utils.json_to_sheet(data);
  }

  sendExcel(res: Response, data: Record<string, unknown>[], sheetName: string, filename: string): void {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, this.toSheet(data), sheetName);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  }

  sendCsv(res: Response, data: Record<string, unknown>[], filename: string): void {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, this.toSheet(data), 'data');
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets['data']);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  }

  // ── Orders export ──────────────────────────────────────────────────

  async getOrdersData(filter: OrderFilterQuery): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {};
    if (filter.status)     where.status     = filter.status;
    if (filter.courierId)  where.courierId  = filter.courierId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) (where.createdAt as Record<string, unknown>).gte = new Date(filter.startDate);
      if (filter.endDate)   (where.createdAt as Record<string, unknown>).lte = new Date(filter.endDate + 'T23:59:59');
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        courier:  { select: { name: true } },
        items:    { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    return orders.map((o) => ({
      'Order No':        o.orderNo,
      'Invoice No':      o.invoiceNo,
      'Date':            o.createdAt.toLocaleDateString('en-BD'),
      'Customer Name':   o.customer.name,
      'Phone':           o.shippingPhone,
      'Email':           o.customer.email ?? '',
      'Address':         `${o.shippingAddress}, ${o.shippingThana}, ${o.shippingDistrict}`,
      'Products':        o.items.map((i) => `${i.productName} x${i.quantity}`).join(' | '),
      'Subtotal':        Number(o.subtotal),
      'Discount':        Number(o.discountAmount),
      'Shipping':        Number(o.shippingCharge),
      'Grand Total':     Number(o.grandTotal),
      'Payment Method':  o.paymentMethod,
      'Payment Status':  o.paymentStatus,
      'Order Status':    o.status,
      'Courier':         o.courier?.name ?? '',
      'Tracking No':     o.trackingNumber ?? '',
      'Notes':           o.notes ?? '',
    }));
  }

  // ── Products export ────────────────────────────────────────────────

  async getProductsData(filter: ProductFilterQuery): Promise<Record<string, unknown>[]> {
    const products = await prisma.product.findMany({
      where: {
        categoryId: filter.categoryId,
        isActive:   filter.isActive,
      },
      include: {
        category:    { select: { name: true } },
        brand:       { select: { name: true } },
        inventories: { include: { warehouse: { select: { name: true } } } },
      },
      take: 10000,
    });

    return products.map((p) => ({
      'SKU':            p.sku,
      'Barcode':        p.barcode ?? '',
      'Name':           p.name,
      'Category':       p.category.name,
      'Brand':          p.brand?.name ?? '',
      'Gender':         p.gender ?? '',
      'Cost Price':     Number(p.costPrice),
      'Selling Price':  Number(p.sellingPrice),
      'Sale Price':     p.salePrice ? Number(p.salePrice) : '',
      'Profit Margin':  `${p.profitMargin ?? 0}%`,
      'Total Stock':    p.inventories.reduce((s, i) => s + i.quantity, 0),
      'Reserved':       p.inventories.reduce((s, i) => s + i.reserved, 0),
      'Available':      p.inventories.reduce((s, i) => s + (i.quantity - i.reserved), 0),
      'Total Sold':     p.totalSold,
      'Active':         p.isActive ? 'Yes' : 'No',
    }));
  }

  // ── Customers export ───────────────────────────────────────────────

  async getCustomersData(): Promise<Record<string, unknown>[]> {
    const customers = await prisma.customer.findMany({
      include: { addresses: { where: { isDefault: true }, take: 1 } },
      orderBy: { totalSpent: 'desc' },
      take: 10000,
    });

    return customers.map((c) => ({
      'Name':          c.name,
      'Phone':         c.phone,
      'Email':         c.email ?? '',
      'Tag':           c.tag,
      'Total Orders':  c.totalOrders,
      'Total Spent':   Number(c.totalSpent),
      'Avg Order':     Number(c.averageOrder),
      'Last Order':    c.lastOrderAt?.toLocaleDateString('en-BD') ?? '',
      'City':          c.addresses[0]?.district ?? '',
      'Blocked':       c.isBlocked ? 'Yes' : 'No',
      'Customer Since': c.createdAt.toLocaleDateString('en-BD'),
    }));
  }

  // ── Inventory export (Phase 3 §20) ──────────────────────────────────

  async getInventoryData(): Promise<Record<string, unknown>[]> {
    const inventories = await prisma.inventory.findMany({
      where: { product: { isDeleted: false } },
      include: {
        product: { select: { name: true, sku: true, costPrice: true, categoryId: true, category: { select: { name: true } } } },
        warehouse: { select: { name: true } },
      },
      orderBy: { product: { name: 'asc' } },
      take: 10000,
    });

    return inventories.map((i) => ({
      'Product':        i.product.name,
      'SKU':            i.product.sku,
      'Category':       i.product.category.name,
      'Warehouse':      i.warehouse.name,
      'Quantity':       i.quantity,
      'Reserved':       i.reserved,
      'Available':      i.quantity - i.reserved,
      'Low Stock Alert': i.lowStockAlert,
      'Cost Price':     Number(i.product.costPrice),
      'Stock Value':    Math.round(i.quantity * Number(i.product.costPrice) * 100) / 100,
      'Status':         i.quantity === 0 ? 'Out of Stock' : i.quantity <= i.lowStockAlert ? 'Low Stock' : 'In Stock',
    }));
  }

  // ── Invoice PDF ────────────────────────────────────────────────────

  async generateInvoicePDF(orderId: string, res: Response): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items:    { include: { product: { select: { name: true, sku: true } } } },
        courier:  { select: { name: true } },
      },
    });

    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    const settings = await prisma.setting.findMany({ where: { group: 'company' } });
    const getSetting = (key: string) => settings.find((s) => s.key === key)?.value ?? '';

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.invoiceNo}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold')
       .text(getSetting('company_name') || 'Prichoy Clothing', 50, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#666')
       .text(getSetting('company_address') || 'Dhaka, Bangladesh', 50, 78)
       .text(`Phone: ${getSetting('company_phone') || '01762647661'}`, 50, 90)
       .text(`Email: ${getSetting('company_email') || 'nayem@mail.com'}`, 50, 102);

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000')
       .text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#444')
       .text(`Invoice: ${order.invoiceNo}`, 400, 78, { align: 'right' })
       .text(`Order:   ${order.orderNo}`, 400, 92, { align: 'right' })
       .text(`Date: ${order.createdAt.toLocaleDateString('en-BD')}`, 400, 106, { align: 'right' });

    // Divider
    doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#e0e0e0').stroke();

    // Bill to
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('BILL TO:', 50, 140);
    doc.fontSize(10).font('Helvetica').fillColor('#333')
       .text(order.shippingName,    50, 155)
       .text(order.shippingPhone,   50, 168)
       .text(order.shippingAddress, 50, 181)
       .text(`${order.shippingThana}, ${order.shippingDistrict}`, 50, 194);

    doc.fontSize(10).font('Helvetica-Bold').text('COURIER:', 350, 140)
       .font('Helvetica').fillColor('#333')
       .text(order.courier?.name ?? 'Pending',     350, 155)
       .text(order.trackingNumber ?? 'Not assigned', 350, 168)
       .text(`Status: ${order.status}`,             350, 181);

    // Table header
    const tY = 230;
    doc.rect(50, tY, 495, 20).fill('#f0f0f0');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
       .text('Product', 55, tY + 5)
       .text('SKU',     260, tY + 5)
       .text('Qty',     340, tY + 5)
       .text('Price',   390, tY + 5)
       .text('Total',   470, tY + 5, { align: 'right' });

    let rowY = tY + 25;
    doc.font('Helvetica').fontSize(9);

    for (const item of order.items) {
      const total = Number(item.unitPrice) * item.quantity - Number(item.discount);
      doc.fillColor('#333')
         .text(item.productName.substring(0, 36),  55, rowY)
         .text(item.sku ?? '',                      260, rowY)
         .text(String(item.quantity),               340, rowY)
         .text(`৳${Number(item.unitPrice).toLocaleString()}`, 390, rowY)
         .text(`৳${total.toLocaleString()}`,        470, rowY, { align: 'right' });
      rowY += 20;
      if (item.variantInfo) {
        doc.fillColor('#888').text(`  ${item.variantInfo}`, 55, rowY - 14);
      }
      doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#f0f0f0').stroke();
    }

    // Totals
    rowY += 15;
    const totalsX = 380;
    const amtX    = 495;

    const totalsRow = (label: string, amount: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#333')
         .text(label, totalsX, rowY)
         .text(amount, amtX, rowY, { align: 'right' });
      rowY += 18;
    };

    totalsRow('Subtotal:', `৳${Number(order.subtotal).toLocaleString()}`);
    if (Number(order.discountAmount) > 0)
      totalsRow('Discount:', `-৳${Number(order.discountAmount).toLocaleString()}`);
    totalsRow('Shipping:', `৳${Number(order.shippingCharge).toLocaleString()}`);
    doc.moveTo(totalsX, rowY).lineTo(545, rowY).strokeColor('#ccc').stroke();
    rowY += 6;
    totalsRow('TOTAL:', `৳${Number(order.grandTotal).toLocaleString()}`, true);
    totalsRow('Payment:', order.paymentMethod);

    // Footer
    doc.fontSize(8).fillColor('#aaa')
       .text('Thank you for shopping with Prichoy Clothing!', 50, 760, { align: 'center' })
       .text(getSetting('company_website') || 'www.facebook.com/PRICHOY', 50, 772, { align: 'center' });

    doc.end();
  }
}

export const exportService = new ExportService();
