'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrders, useBulkOrderAction } from '@/hooks/useOrders';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Search, CheckCircle2, XCircle, Printer } from 'lucide-react';
import { cn, formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_TABS = ['ALL','PENDING','CONFIRMED','PACKED','DISPATCHED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNED','REFUNDED'];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  const { can } = usePermissions();

  const { data, isLoading } = useOrders({
    page, limit: 20, search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  });
  const bulkAction = useBulkOrderAction();

  const orders = data?.data ?? [];
  const meta = data?.meta;

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleSelectAll() {
    setSelected(selected.length === orders.length ? [] : orders.map((o) => o.id));
  }

  async function handleExport(format: 'excel' | 'csv') {
    const params = new URLSearchParams({ format, ...(status !== 'ALL' ? { status } : {}) });
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/export/orders?${params}`, '_blank');
  }

  async function handleBulkConfirm() {
    if (!selected.length) return;
    await bulkAction.mutateAsync({ orderIds: selected, action: 'CONFIRM' });
    setSelected([]);
  }

  async function handleBulkCancel() {
    if (!selected.length) return;
    const reason = prompt('Cancellation reason for selected orders:');
    if (!reason) return;
    await bulkAction.mutateAsync({ orderIds: selected, action: 'CANCEL', reason });
    setSelected([]);
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">{meta?.total ?? 0} total orders</p>
        </div>
        {can('orders', 'export') && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {s === 'ALL' ? 'All' : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order no, phone, customer, tracking..."
                className="pl-8"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            {selected.length > 0 && can('orders', 'update') && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selected.length} selected</span>
                <Button size="sm" variant="outline" onClick={handleBulkConfirm}>
                  <CheckCircle2 className="h-4 w-4" /> Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkCancel}>
                  <XCircle className="h-4 w-4" /> Cancel
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="sticky-header max-h-[65vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={selected.length === orders.length && orders.length > 0} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.includes(order.id)} onCheckedChange={() => toggleSelect(order.id)} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/orders/${order.id}`} className="block">
                          <p className="font-medium text-primary hover:underline">{order.orderNo}</p>
                          <p className="text-xs text-muted-foreground">{order.invoiceNo}</p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{order.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{order.shippingPhone}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground">{order.items.length} item(s)</p>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(order.grandTotal)}</TableCell>
                      <TableCell>
                        <Badge variant={order.paymentStatus === 'PAID' ? 'success' : 'outline'} className="text-[10px]">
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px]', ORDER_STATUS_COLORS[order.status])} variant="outline">
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{order.courier?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
