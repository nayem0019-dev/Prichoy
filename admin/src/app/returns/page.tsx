'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calculator } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

type Condition = 'Unopened' | 'Good' | 'Damaged' | 'Unsellable';
type Recovery = 'SELL_AGAIN' | 'SELL_DISCOUNTED' | 'DAMAGED' | 'DESTROYED';
type Paid = 'CUSTOMER' | 'BUSINESS';

const emptyForm = {
  reason: '', condition: 'Good' as Condition, note: '', restockItems: true,
  outboundCharge: '', outboundPaidBy: 'BUSINESS' as Paid,
  returnCharge: '', returnPaidBy: 'BUSINESS' as Paid,
  packagingCost: '', recoverable: true,
  recoveryAction: 'SELL_AGAIN' as Recovery, resaleValue: '',
};

export default function ReturnsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [accountingOpen, setAccountingOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['returns-list', search, page],
    queryFn: async () => {
      const { data } = await api.get('/returns/returns', { params: { search: search || undefined, page, limit: 20 } });
      return data;
    },
  });

  const { data: existingAccounting } = useQuery({
    queryKey: ['return-accounting', currentOrderId],
    queryFn: async () => { const { data } = await api.get(`/returns/orders/${currentOrderId}/return`); return data.data; },
    enabled: !!currentOrderId,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!currentOrderId) return;
      await api.put(`/returns/orders/${currentOrderId}/return`, {
        ...form,
        outboundCharge: form.outboundCharge ? Number(form.outboundCharge) : undefined,
        returnCharge: form.returnCharge ? Number(form.returnCharge) : undefined,
        packagingCost: form.packagingCost ? Number(form.packagingCost) : undefined,
        resaleValue: form.resaleValue ? Number(form.resaleValue) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns-list'] });
      setAccountingOpen(false);
      toast.success('Return accounting saved');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function openAccounting(orderId: string, existing: any) {
    setCurrentOrderId(orderId);
    if (existing) {
      setForm({
        reason: existing.reason ?? '', condition: existing.condition ?? 'Good',
        note: existing.note ?? '', restockItems: existing.restockItems ?? true,
        outboundCharge: existing.outboundCharge ?? '', outboundPaidBy: existing.outboundPaidBy ?? 'BUSINESS',
        returnCharge: existing.returnCharge ?? '', returnPaidBy: existing.returnPaidBy ?? 'BUSINESS',
        packagingCost: existing.packagingCost ?? '', recoverable: existing.recoverable ?? true,
        recoveryAction: existing.recoveryAction ?? 'SELL_AGAIN',
        resaleValue: existing.resaleValue ?? '',
      });
    } else {
      setForm(emptyForm);
    }
    setAccountingOpen(true);
  }

  // Live loss preview
  const previewLoss = (() => {
    let loss = 0;
    if (form.outboundPaidBy === 'BUSINESS' && form.outboundCharge) loss += Number(form.outboundCharge);
    if (form.returnPaidBy === 'BUSINESS' && form.returnCharge) loss += Number(form.returnCharge);
    if (!form.recoverable && form.packagingCost) loss += Number(form.packagingCost);
    return loss;
  })();

  const returns = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-2xl font-semibold">Returns</h1>
          <p className="text-sm text-muted-foreground">Return accounting and loss tracking</p></div>
        <Button size="sm" variant="outline" onClick={() => window.open(`${api.defaults.baseURL}/export/returns?format=xlsx`, '_blank')}>
          Export Excel
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search order number..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order</TableHead><TableHead>Customer</TableHead>
                  <TableHead>Condition</TableHead><TableHead>Recovery</TableHead>
                  <TableHead>Total Loss</TableHead><TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {returns.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.order?.orderNumber}</TableCell>
                      <TableCell className="text-sm">{r.order?.customer?.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.condition ?? '—'}</Badge></TableCell>
                      <TableCell className="text-xs">{r.recoveryAction ?? '—'}</TableCell>
                      <TableCell className="font-medium text-destructive">{formatCurrency(Number(r.totalLoss ?? 0))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openAccounting(r.orderId, r)}>
                          <Calculator className="h-3.5 w-3.5" /> Accounting
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!returns.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No returns found.</TableCell></TableRow>}
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

      {/* Return Accounting Dialog (§12-14) */}
      <Dialog open={accountingOpen} onOpenChange={setAccountingOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Return Accounting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Return Reason<span className="text-destructive">*</span></Label>
              <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={2} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Product Condition</Label>
                <Select value={form.condition} onValueChange={(v) => setForm((p) => ({ ...p, condition: v as Condition }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['Unopened', 'Good', 'Damaged', 'Unsellable'] as Condition[]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Recovery Action</Label>
                <Select value={form.recoveryAction} onValueChange={(v) => setForm((p) => ({ ...p, recoveryAction: v as Recovery }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELL_AGAIN">Sell Again</SelectItem>
                    <SelectItem value="SELL_DISCOUNTED">Sell at Discount</SelectItem>
                    <SelectItem value="DAMAGED">Mark Damaged</SelectItem>
                    <SelectItem value="DESTROYED">Destroyed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.recoveryAction === 'SELL_DISCOUNTED' && (
              <div className="space-y-1.5"><Label>Estimated Resale Value (৳)</Label>
                <Input type="number" value={form.resaleValue} onChange={(e) => setForm((p) => ({ ...p, resaleValue: e.target.value }))} /></div>
            )}

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-semibold">§13 — Courier Loss Calculation</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Outbound Charge (৳)</Label>
                  <Input type="number" value={form.outboundCharge} onChange={(e) => setForm((p) => ({ ...p, outboundCharge: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Paid By</Label>
                  <Select value={form.outboundPaidBy} onValueChange={(v) => setForm((p) => ({ ...p, outboundPaidBy: v as Paid }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="CUSTOMER">Customer</SelectItem><SelectItem value="BUSINESS">Business</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Return Charge (৳)</Label>
                  <Input type="number" value={form.returnCharge} onChange={(e) => setForm((p) => ({ ...p, returnCharge: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Paid By</Label>
                  <Select value={form.returnPaidBy} onValueChange={(v) => setForm((p) => ({ ...p, returnPaidBy: v as Paid }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="CUSTOMER">Customer</SelectItem><SelectItem value="BUSINESS">Business</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Packaging Cost (৳)</Label>
                  <Input type="number" value={form.packagingCost} onChange={(e) => setForm((p) => ({ ...p, packagingCost: e.target.value }))} /></div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label className="mb-0">Packaging Recoverable?</Label>
                  <Switch checked={form.recoverable} onCheckedChange={(v) => setForm((p) => ({ ...p, recoverable: v }))} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="mb-0">Restock Items?</Label>
              <Switch checked={form.restockItems} onCheckedChange={(v) => setForm((p) => ({ ...p, restockItems: v }))} />
            </div>

            <div className="space-y-1.5"><Label>Notes</Label>
              <Textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} rows={2} /></div>

            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm">
              <p className="text-xs text-muted-foreground">Courier loss preview (excludes product cost — computed server-side)</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(previewLoss)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountingOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.reason.trim() || save.isPending}>Save Accounting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
