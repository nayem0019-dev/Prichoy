'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, CheckCircle, XCircle, Star } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

const STATUS_COLORS: Record<string, 'outline' | 'warning' | 'success' | 'destructive'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive',
};

function Stars({ rating }: { rating: number }) {
  return <span className="text-amber-400">{Array.from({length:5},(_,i)=>i<rating?'★':'☆').join('')}</span>;
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string|null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', status, search, page],
    queryFn: async () => {
      const { data } = await api.get('/customer/admin/reviews', {
        params: { status: status !== 'ALL' ? status : undefined, search: search || undefined, page, limit: 20 },
      });
      return data;
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      await api.put(`/customer/admin/reviews/${id}/moderate`, { action, reason });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); toast.success('Review updated'); setRejectId(null); setRejectReason(''); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/customer/admin/reviews/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-reviews'] }); toast.success('Review deleted'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reviews: any[] = data?.data?.reviews ?? [];
  const meta = data?.data?.meta;

  return (
    <DashboardShell>
      <div className="mb-6"><h1 className="font-serif text-2xl font-semibold">Review Moderation</h1>
        <p className="text-sm text-muted-foreground">Approve or reject customer product reviews before they appear publicly.</p></div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search product or customer..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="ALL">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <div className="space-y-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-14 w-full"/>)}</div> : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Product</TableHead><TableHead>Customer</TableHead>
                  <TableHead>Rating</TableHead><TableHead>Review</TableHead>
                  <TableHead>Verified</TableHead><TableHead>Status</TableHead>
                  <TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {reviews.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.product?.name}<br/><span className="text-xs text-muted-foreground">{r.product?.sku}</span></TableCell>
                      <TableCell className="text-sm">{r.customer?.name}<br/><span className="text-xs text-muted-foreground">{r.customer?.phone}</span></TableCell>
                      <TableCell><Stars rating={r.rating} /></TableCell>
                      <TableCell className="max-w-xs">
                        {r.title && <p className="font-semibold text-xs">{r.title}</p>}
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.body || '—'}</p>
                        {r.photos && JSON.parse(r.photos||'[]').length > 0 && <span className="text-xs text-primary">📷 {JSON.parse(r.photos).length} photo(s)</span>}
                      </TableCell>
                      <TableCell>{r.isVerified ? <span className="text-xs text-success font-semibold">✓ Verified</span> : <span className="text-xs text-muted-foreground">Unverified</span>}</TableCell>
                      <TableCell><Badge variant={STATUS_COLORS[r.status]||'outline'} className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status !== 'APPROVED' && (
                            <Button size="sm" variant="outline" onClick={() => moderate.mutate({ id: r.id, action: 'APPROVED' })} disabled={moderate.isPending}>
                              <CheckCircle className="h-3.5 w-3.5 text-success" />
                            </Button>
                          )}
                          {r.status !== 'REJECTED' && (
                            <Button size="sm" variant="outline" onClick={() => { setRejectId(r.id); setRejectReason(''); }}>
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { if(confirm('Delete this review permanently?')) del.mutate(r.id); }}>
                            🗑
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!reviews.length && <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No reviews found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page>=meta.totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={(v)=>!v&&setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Review</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Optionally provide a reason (not shown publicly).</p>
            <Textarea value={rejectReason} onChange={(e)=>setRejectReason(e.target.value)} rows={3} placeholder="Reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={()=>rejectId&&moderate.mutate({id:rejectId,action:'REJECTED',reason:rejectReason||undefined})} disabled={moderate.isPending}>
              Reject Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
