'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, History, ArrowLeft } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useInventoryDashboard, useInventoryMovements } from '@/hooks/useInventory';
import { formatDateTime } from '@/lib/utils';
import { Inventory } from '@/types';

const MOVEMENT_LABELS: Record<string, string> = {
  STOCK_IN: 'Stock In', STOCK_OUT: 'Stock Out', ADJUSTMENT: 'Adjustment',
  TRANSFER: 'Transfer', PURCHASE: 'Purchase', RETURN: 'Return',
  RESERVE: 'Reserve', UNRESERVE: 'Unreserve',
};

function InventoryMovementsDetail({ inv, onBack }: { inv: Inventory; onBack: () => void }) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const { data, isLoading } = useInventoryMovements(inv.id, { page, limit: 20 });

  const movements = useMemo(() => {
    const rows = data?.data ?? [];
    return typeFilter === 'ALL' ? rows : rows.filter((m) => m.type === typeFilter);
  }, [data, typeFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <Button size="sm" variant="ghost" onClick={onBack} className="mb-1 -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to product search
          </Button>
          <CardTitle className="text-base">{inv.product?.name} <span className="font-normal text-muted-foreground">— {inv.warehouse?.name}</span></CardTitle>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell className="text-xs">{m.variantId ? `Variant ${m.variantId.slice(0, 8)}…` : '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{MOVEMENT_LABELS[m.type] ?? m.type}</Badge></TableCell>
                    <TableCell className="text-sm">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                    <TableCell className="text-sm">{m.previousStock}</TableCell>
                    <TableCell className="text-sm">{m.newStock}</TableCell>
                    <TableCell className="text-xs">{m.reason ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.reference ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No movements recorded for this record.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {data.meta.page} of {data.meta.totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Note: per-record movement history doesn&apos;t currently include who performed each action —
          the &quot;Recent Activity&quot; feed below does, via the dashboard endpoint.
        </p>
      </CardContent>
    </Card>
  );
}

export default function StockMovementsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Inventory | null>(null);

  const { data: invData, isLoading: invLoading } = useInventory({ page: 1, limit: 8, search: search || undefined });
  const { data: dashboard, isLoading: dashLoading } = useInventoryDashboard();

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Stock Movement History</h1>
          <p className="text-sm text-muted-foreground">Search a product to see its full, filterable movement history.</p>
        </div>
        <Link href="/inventory/dashboard"><Button size="sm" variant="outline">Inventory Dashboard</Button></Link>
      </div>

      {selected ? (
        <InventoryMovementsDetail inv={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative mb-4 max-w-md">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search product name, SKU, barcode..." className="pl-8" value={search}
                  onChange={(e) => setSearch(e.target.value)} />
              </div>
              {invLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="divide-y rounded-md border">
                  {(invData?.data ?? []).map((inv) => (
                    <button
                      key={inv.id}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => setSelected(inv)}
                    >
                      <span>
                        <span className="font-medium">{inv.product?.name}</span>{' '}
                        <span className="text-xs text-muted-foreground">{inv.product?.sku} — {inv.warehouse?.name}</span>
                      </span>
                      <History className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                  {!invData?.data?.length && (
                    <p className="p-4 text-center text-sm text-muted-foreground">No inventory records match your search.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity (store-wide)</CardTitle></CardHeader>
            <CardContent>
              {dashLoading ? (
                <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Variant</TableHead>
                        <TableHead>Type</TableHead><TableHead>Qty</TableHead><TableHead>Reason</TableHead><TableHead>Performed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dashboard?.recentMovements ?? []).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                          <TableCell className="text-sm">{m.inventory?.product?.name}</TableCell>
                          <TableCell className="text-xs">{m.variant ? `${m.variant.name}: ${m.variant.value}` : '—'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{MOVEMENT_LABELS[m.type] ?? m.type}</Badge></TableCell>
                          <TableCell className="text-sm">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                          <TableCell className="text-xs">{m.reason ?? '—'}</TableCell>
                          <TableCell className="text-xs">{m.admin?.name ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                      {!dashboard?.recentMovements?.length && (
                        <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No movements yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
