'use client';

import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Boxes, AlertTriangle, PackageX, Layers, Wallet, History, ArrowRight,
} from 'lucide-react';
import { useInventoryDashboard } from '@/hooks/useInventory';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

function KpiCard({ title, value, icon: Icon, tone }: { title: string; value: string; icon: React.ElementType; tone?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tone ?? 'bg-primary/10 text-primary')}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

const MOVEMENT_LABELS: Record<string, string> = {
  STOCK_IN: 'Stock In', STOCK_OUT: 'Stock Out', ADJUSTMENT: 'Adjustment',
  TRANSFER: 'Transfer', PURCHASE: 'Purchase', RETURN: 'Return',
  RESERVE: 'Reserve', UNRESERVE: 'Unreserve',
};

export default function InventoryDashboardPage() {
  const { data, isLoading } = useInventoryDashboard();

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Inventory Dashboard</h1>
          <p className="text-sm text-muted-foreground">Store-wide stock health at a glance</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory"><Button size="sm" variant="outline">Search Inventory</Button></Link>
          <Link href="/inventory/movements"><Button size="sm" variant="outline"><History className="h-3.5 w-3.5" /> Movement History</Button></Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard title="Inventory Value" value={formatCurrency(data?.inventoryValue ?? 0)} icon={Wallet} tone="bg-success/10 text-success" />
            <KpiCard title="Total Products" value={String(data?.totalProducts ?? 0)} icon={Boxes} />
            <KpiCard title="Out of Stock (Products)" value={String(data?.outOfStockCount ?? 0)} icon={PackageX} tone="bg-destructive/10 text-destructive" />
            <KpiCard title="Low Stock (Products)" value={String(data?.lowStockCount ?? 0)} icon={AlertTriangle} tone="bg-amber-500/10 text-amber-600" />
            <KpiCard title="Out of Stock Variants" value={String(data?.outOfStockVariants ?? 0)} icon={Layers} tone="bg-destructive/10 text-destructive" />
            <KpiCard title="Low Stock Variants" value={String(data?.lowStockVariants ?? 0)} icon={Layers} tone="bg-amber-500/10 text-amber-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Low Stock Alerts</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Product</TableHead><TableHead>Warehouse</TableHead><TableHead>Available</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.lowStockAlerts ?? []).slice(0, 15).map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{inv.product?.name}</p>
                            <p className="text-xs text-muted-foreground">{inv.product?.sku}</p>
                          </TableCell>
                          <TableCell className="text-xs">{inv.warehouse?.name}</TableCell>
                          <TableCell>
                            <Badge variant={inv.quantity - inv.reserved === 0 ? 'destructive' : 'warning'} className="text-[10px]">
                              {inv.quantity - inv.reserved}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!data?.lowStockAlerts?.length && (
                        <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No low stock alerts. 🎉</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Recent Stock Movements</CardTitle>
                <Link href="/inventory/movements" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead>Qty</TableHead><TableHead>When</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.recentMovements ?? []).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{m.inventory?.product?.name}</p>
                            {m.variant && <p className="text-xs text-muted-foreground">{m.variant.name}: {m.variant.value}</p>}
                          </TableCell>
                          <TableCell className="text-xs">{MOVEMENT_LABELS[m.type] ?? m.type}</TableCell>
                          <TableCell className="text-sm">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                      {!data?.recentMovements?.length && (
                        <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No movements yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Recently Updated Products</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.recentlyUpdated ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="flex items-center gap-2 font-medium">
                          {p.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0].url} alt={p.name} className="h-8 w-6 rounded object-cover" />
                          ) : <div className="h-8 w-6 rounded bg-muted" />}
                          {p.name}
                        </TableCell>
                        <TableCell className="text-xs">{p.sku}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{p.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
