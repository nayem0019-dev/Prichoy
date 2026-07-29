'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested', APPROVED: 'Approved', REJECTED: 'Rejected',
  REPLACEMENT_SHIPPED: 'Shipped', COMPLETED: 'Completed',
};
const STATUS_VARIANTS: Record<string, 'outline' | 'secondary' | 'success' | 'destructive' | 'warning'> = {
  REQUESTED: 'outline', APPROVED: 'secondary', REJECTED: 'destructive',
  REPLACEMENT_SHIPPED: 'warning', COMPLETED: 'success',
};
const NEXT_STATUSES: Record<string, { value: string; label: string }[]> = {
  REQUESTED:            [{ value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' }],
  APPROVED:             [{ value: 'REPLACEMENT_SHIPPED', label: 'Mark Shipped' }],
  REPLACEMENT_SHIPPED:  [{ value: 'COMPLETED', label: 'Mark Completed' }],
};

export default function ExchangesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<{ id: string; nextStatus: string } | null>(null);
  const [note, setNote] = useState('');
  const [rejectedReason, setRejectedReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['exchanges', search, statusFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/returns/exchanges', {
        params: { search: search || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined, page, limit: 20 },
      });
      return data;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['exchange-detail', detailId],
    queryFn: async () => { const { data } = await api.get(`/returns/exchanges/${detailId}`); return data.data; },
    enabled: !!detailId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, note, rejectedReason }: { id: string; status: string; note?: string; rejectedReason?: string }) => {
      await api.put(`/returns/exchanges/${id}/status`, { status, note, rejectedReason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exchanges'] });
      qc.invalidateQueries({ queryKey: ['exchange-detail', detailId] });
      setUpdateOpen(false); setNote(''); setRejectedReason('');
      toast.success('Exchange status updated');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const exchanges = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-2xl font-semibold">Exchange Orders</h1>
          <p className="text-sm text-muted-foreground">Manage product exchange requests</p></div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search order number..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Order</TableHead><TableHead>Customer</TableHead>
                  <TableHead>Requested</TableHead><TableHead>Variant</TableHead>
                  <TableHead>Status</TableHead><TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {exchanges.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.order?.orderNumber}</TableCell>
                      <TableCell className="text-sm">{e.order?.customer?.name}</TableCell>
                      <TableCell className="text-sm">
                        {[e.requestedSize && `Size: ${e.requestedSize}`, e.requestedColor && `Color: ${e.requestedColor}`].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{e.requestedVariant ? `${e.requestedVariant.name}: ${e.requestedVariant.value}` : '—'}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANTS[e.status] ?? 'outline'} className="text-[10px]">{STATUS_LABELS[e.status] ?? e.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setDetailId(e.id)}>View</Button>
                          {NEXT_STATUSES[e.status]?.map((ns) => (
                            <Button key={ns.value} size="sm" variant="outline"
                              onClick={() => { setUpdateTarget({ id: e.id, nextStatus: ns.value }); setNote(''); setRejectedReason(''); setUpdateOpen(true); }}>
                              <RefreshCw className="h-3 w-3" /> {ns.label}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!exchanges.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No exchanges found.</TableCell></TableRow>}
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

      {/* Status Update dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update to: {STATUS_LABELS[updateTarget?.nextStatus ?? ''] ?? updateTarget?.nextStatus}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {updateTarget?.nextStatus === 'REJECTED' && (
              <div className="space-y-1.5"><Label>Rejection Reason<span className="text-destructive">*</span></Label>
                <Textarea value={rejectedReason} onChange={(e) => setRejectedReason(e.target.value)} rows={2} /></div>
            )}
            <div className="space-y-1.5"><Label>Admin Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateTarget && updateStatus.mutate({ id: updateTarget.id, status: updateTarget.nextStatus, note, rejectedReason })}
              disabled={updateStatus.isPending || (updateTarget?.nextStatus === 'REJECTED' && !rejectedReason.trim())}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Exchange #{detail?.order?.orderNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Customer', detail?.order?.customer?.name],
                ['Phone', detail?.order?.customer?.phone],
                ['Requested Size', detail?.requestedSize ?? '—'],
                ['Requested Color', detail?.requestedColor ?? '—'],
                ['Replacement Variant', detail?.requestedVariant ? `${detail.requestedVariant.name}: ${detail.requestedVariant.value}` : '—'],
                ['Courier Charge', detail?.courierCharge ? `৳${Number(detail.courierCharge).toLocaleString()} (${detail.courierPaidBy})` : '—'],
              ].map(([l, v]) => <div key={l as string}><p className="text-xs text-muted-foreground">{l as string}</p><p>{v || '—'}</p></div>)}
            </div>
            <div>
              <p className="mb-1 font-medium">History</p>
              <div className="space-y-1">
                {(detail?.history ?? []).map((h: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Badge variant={STATUS_VARIANTS[h.status] ?? 'outline'} className="text-[9px]">{STATUS_LABELS[h.status] ?? h.status}</Badge>
                    <span className="text-muted-foreground">{formatDateTime(h.createdAt)}</span>
                    {h.note && <span>— {h.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDetailId(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
