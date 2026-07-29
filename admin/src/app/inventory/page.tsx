'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, PackagePlus, ArrowRightLeft } from 'lucide-react';
import { useInventory, useWarehouses, useAdjustStock } from '@/hooks/useInventory';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('ALL');
  const [adjustModal, setAdjustModal] = useState<{ productId: string; warehouseId: string; name: string } | null>(null);
  const [qty, setQty] = useState('');
  const [type, setType] = useState('STOCK_IN');
  const [reason, setReason] = useState('');

  const { data, isLoading } = useInventory({
    page, limit: 20, search: search || undefined,
    warehouseId: warehouseId === 'ALL' ? undefined : warehouseId,
  });
  const { data: warehouses } = useWarehouses();
  const adjustStock = useAdjustStock();

  const inventories = data?.data ?? [];
  const meta = data?.meta;

  async function handleAdjust() {
    if (!adjustModal || !qty) return;
    await adjustStock.mutateAsync({
      productId: adjustModal.productId,
      warehouseId: adjustModal.warehouseId,
      type, quantity: Number(qty), reason,
    });
    setAdjustModal(null); setQty(''); setReason('');
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{meta?.total ?? 0} inventory records</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/dashboard"><Button size="sm" variant="outline">Dashboard</Button></Link>
          <Link href="/inventory/movements"><Button size="sm" variant="outline">Movement History</Button></Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search product, SKU..." className="pl-8" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setPage(1); }}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Warehouse" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Warehouses</SelectItem>
                {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="max-h-[65vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventories.map((inv) => {
                    const available = inv.quantity - inv.reserved;
                    const low = available <= inv.lowStockAlert;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <p className="font-medium">{inv.product?.name}</p>
                          <p className="text-xs text-muted-foreground">{inv.product?.sku}</p>
                        </TableCell>
                        <TableCell className="text-sm">{inv.warehouse?.name}</TableCell>
                        <TableCell>{inv.quantity}</TableCell>
                        <TableCell>{inv.reserved}</TableCell>
                        <TableCell className={cn('font-medium', low && 'text-destructive')}>{available}</TableCell>
                        <TableCell>
                          <Badge variant={available === 0 ? 'destructive' : low ? 'warning' : 'success'} className="text-[10px]">
                            {available === 0 ? 'Out of Stock' : low ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline"
                            onClick={() => setAdjustModal({ productId: inv.productId, warehouseId: inv.warehouseId, name: inv.product?.name ?? '' })}>
                            <PackagePlus className="h-3.5 w-3.5" /> Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

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

      <Dialog open={!!adjustModal} onOpenChange={(v) => !v && setAdjustModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock — {adjustModal?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Movement Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK_IN">Stock In (+)</SelectItem>
                  <SelectItem value="STOCK_OUT">Stock Out (-)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New stock received" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModal(null)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjustStock.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
