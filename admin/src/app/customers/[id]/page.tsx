'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomer, useBlockCustomer, useUnblockCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, cn } from '@/lib/utils';
import { Ban, ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(id);
  const blockMutation = useBlockCustomer();
  const unblockMutation = useUnblockCustomer();
  const updateCustomer = useUpdateCustomer();
  const { can } = usePermissions();
  const [note, setNote] = useState('');

  if (isLoading || !customer) {
    return <DashboardShell><Skeleton className="h-96 w-full" /></DashboardShell>;
  }

  function handleBlock() {
    const reason = prompt('Reason for blocking this customer:');
    if (reason) blockMutation.mutate({ id, reason });
  }

  function handleSaveNote() {
    updateCustomer.mutate({ id, notes: note || customer?.notes });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">Customer since {formatDate(customer.createdAt)}</p>
        </div>
        {can('customers', 'update') && (
          customer.isBlocked ? (
            <Button variant="outline" size="sm" onClick={() => unblockMutation.mutate(id)}>
              <ShieldCheck className="h-4 w-4" /> Unblock
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={handleBlock}>
              <Ban className="h-4 w-4" /> Block Customer
            </Button>
          )
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Orders</p><p className="text-xl font-semibold">{customer.totalOrders}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lifetime Value</p><p className="text-xl font-semibold">{formatCurrency(customer.totalSpent)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Order</p><p className="text-xl font-semibold">{formatCurrency(customer.averageOrder)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tag</p><Badge className="mt-1">{customer.tag}</Badge></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Order History</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {customer.orders?.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-accent">
                  <div>
                    <p className="font-medium">{order.orderNo}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(order.grandTotal)}</p>
                    <Badge className={cn('text-[10px]', ORDER_STATUS_COLORS[order.status])} variant="outline">
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {customer.phone}</p>
              {customer.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {customer.email}</p>}
              {customer.addresses?.map((addr) => (
                <p key={addr.id} className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {addr.line1}, {addr.thana}, {addr.district}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <textarea
                defaultValue={customer.notes ?? ''}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                placeholder="Internal notes about this customer..."
              />
              <Button size="sm" onClick={handleSaveNote}>Save Note</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
