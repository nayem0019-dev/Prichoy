'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusActionModal } from '@/components/modals/StatusActionModal';
import { useOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import {
  cn, formatCurrency, formatDateTime,
  ORDER_STATUS_COLORS, ORDER_STATUS_LABELS,
} from '@/lib/utils';
import {
  CheckCircle2, Package, Truck, XCircle, RotateCcw,
  Wallet, Printer, Download, MapPin, Phone, Mail,
  Clock, User,
} from 'lucide-react';
import { OrderStatus } from '@/types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const [modalAction, setModalAction] = useState<'CANCEL'|'DISPATCH'|'RETURN'|'REFUND'|null>(null);

  if (isLoading || !order) {
    return (
      <DashboardShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardShell>
    );
  }

  function handleAction(status: OrderStatus, extra?: Record<string, string>) {
    updateStatus.mutate({ id, status, ...extra });
  }

  function handleModalConfirm(data: Record<string, string>) {
    if (modalAction === 'CANCEL') handleAction('CANCELLED', data);
    else if (modalAction === 'DISPATCH') handleAction('DISPATCHED', data);
    else if (modalAction === 'RETURN') handleAction('RETURNED', data);
    else if (modalAction === 'REFUND') handleAction('REFUNDED', data);
    setModalAction(null);
  }

  const canConfirm    = order.status === 'PENDING';
  const canPack       = order.status === 'CONFIRMED';
  const canDispatch   = order.status === 'PACKED';
  const canDeliver    = order.status === 'OUT_FOR_DELIVERY' || order.status === 'DISPATCHED';
  const canCancel     = ['PENDING','CONFIRMED','PACKED'].includes(order.status);
  const canReturn     = ['DISPATCHED','OUT_FOR_DELIVERY'].includes(order.status);
  const canRefund     = order.status === 'DELIVERED' || order.status === 'RETURNED';

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-semibold">{order.orderNo}</h1>
            <Badge className={cn('text-xs', ORDER_STATUS_COLORS[order.status])} variant="outline">
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Invoice {order.invoiceNo} · {formatDateTime(order.createdAt)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/export/invoice/${order.id}`, '_blank')}>
            <Download className="h-4 w-4" /> Invoice
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {canConfirm && (
          <Button size="sm" onClick={() => handleAction('CONFIRMED')}>
            <CheckCircle2 className="h-4 w-4" /> Confirm Order
          </Button>
        )}
        {canPack && (
          <Button size="sm" onClick={() => handleAction('PACKED')}>
            <Package className="h-4 w-4" /> Mark as Packed
          </Button>
        )}
        {canDispatch && (
          <Button size="sm" onClick={() => setModalAction('DISPATCH')}>
            <Truck className="h-4 w-4" /> Assign Courier & Dispatch
          </Button>
        )}
        {order.status === 'DISPATCHED' && (
          <Button size="sm" variant="outline" onClick={() => handleAction('OUT_FOR_DELIVERY')}>
            <Truck className="h-4 w-4" /> Out for Delivery
          </Button>
        )}
        {canDeliver && (
          <Button size="sm" variant="success" onClick={() => handleAction('DELIVERED')}>
            <CheckCircle2 className="h-4 w-4" /> Mark Delivered
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="destructive" onClick={() => setModalAction('CANCEL')}>
            <XCircle className="h-4 w-4" /> Cancel
          </Button>
        )}
        {canReturn && (
          <Button size="sm" variant="outline" onClick={() => setModalAction('RETURN')}>
            <RotateCcw className="h-4 w-4" /> Return
          </Button>
        )}
        {canRefund && (
          <Button size="sm" variant="outline" onClick={() => setModalAction('REFUND')}>
            <Wallet className="h-4 w-4" /> Refund
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Customer + items */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Customer & Shipping</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /> {order.shippingName}</p>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {order.shippingPhone}</p>
                {order.customer.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {order.customer.email}</p>}
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {order.shippingAddress}, {order.shippingThana}, {order.shippingDistrict}
                </p>
                {order.courier && <p className="flex items-center gap-2"><Truck className="h-3.5 w-3.5 text-muted-foreground" /> {order.courier.name} — {order.trackingNumber}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Products ({order.items.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                  {item.image && <img src={item.image} alt={item.productName} className="h-14 w-11 rounded object-cover" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.variantInfo} · SKU: {item.sku} · Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}

              <div className="space-y-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                {order.discountAmount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatCurrency(order.discountAmount)}</span></div>}
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{formatCurrency(order.shippingCharge)}</span></div>
                <div className="flex justify-between border-t pt-1.5 text-base font-semibold"><span>Total</span><span>{formatCurrency(order.grandTotal)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Timeline */}
        <div>
          <Card>
            <CardHeader><CardTitle className="text-base">Order Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="relative space-y-5 pl-5 before:absolute before:left-[7px] before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-border">
                {order.history.map((h) => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <p className="text-sm font-medium">{ORDER_STATUS_LABELS[h.status]}</p>
                    {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {formatDateTime(h.createdAt)}
                      {h.admin && ` · ${h.admin.name}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Customer Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{order.notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      <StatusActionModal
        open={!!modalAction}
        action={modalAction}
        onClose={() => setModalAction(null)}
        onConfirm={handleModalConfirm}
        isLoading={updateStatus.isPending}
      />
    </DashboardShell>
  );
}
