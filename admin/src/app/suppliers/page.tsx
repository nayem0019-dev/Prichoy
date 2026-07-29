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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

function useSuppliers(search: string, page: number) {
  return useQuery({
    queryKey: ['suppliers', search, page],
    queryFn: async () => {
      const { data } = await api.get('/suppliers', { params: { search: search || undefined, page, limit: 20 } });
      return data;
    },
  });
}

function useSupplierDetail(id: string | null) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => { const { data } = await api.get(`/suppliers/${id}`); return data.data; },
    enabled: !!id,
  });
}

const empty = { name: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(empty);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useSuppliers(search, page);
  const { data: detail } = useSupplierDetail(detailId);
  const suppliers = data?.data ?? [];
  const meta = data?.meta;

  const save = useMutation({
    mutationFn: async () => {
      if (editing) await api.put(`/suppliers/${editing.id}`, form);
      else await api.post('/suppliers', form);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setFormOpen(false); toast.success(editing ? 'Supplier updated' : 'Supplier created'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Supplier removed'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function openCreate() { setEditing(null); setForm(empty); setFormOpen(true); }
  function openEdit(s: any) { setEditing(s); setForm({ name: s.name, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', notes: s.notes ?? '' }); setFormOpen(true); }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">{meta?.total ?? 0} suppliers</p></div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Supplier</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name, phone, email..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
                  <TableHead>Products</TableHead><TableHead>Purchase Value</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {suppliers.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <button className="font-medium underline-offset-2 hover:underline" onClick={() => setDetailId(s.id)}>{s.name}</button>
                      </TableCell>
                      <TableCell className="text-sm">{s.phone ?? '—'}</TableCell>
                      <TableCell className="text-xs">{s.email ?? '—'}</TableCell>
                      <TableCell className="text-sm">{s._count?.products ?? 0}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(s.totalPurchaseValue ?? 0)}</TableCell>
                      <TableCell><Badge variant={s.isActive ? 'success' : 'outline'} className="text-[10px]">{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remove "${s.name}"?`)) del.mutate(s.id); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!suppliers.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No suppliers yet.</TableCell></TableRow>}
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

      {/* Create/Edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(['name', 'phone', 'email', 'address'] as const).map((f) => (
              <div key={f} className="space-y-1.5">
                <Label className="capitalize">{f}{f === 'name' && <span className="text-destructive">*</span>}</Label>
                <Input value={(form as any)[f]} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1.5"><Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>
              {editing ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail / Purchase History */}
      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{detail?.name ?? '...'} — Details</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[['Phone', detail?.phone], ['Email', detail?.email], ['Address', detail?.address]].map(([l, v]) => (
                <div key={l as string}><p className="text-xs text-muted-foreground">{l as string}</p><p>{v || '—'}</p></div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Linked Products ({detail?.products?.length ?? 0})</p>
              <div className="flex flex-wrap gap-1">
                {(detail?.products ?? []).map((p: any) => <Badge key={p.id} variant="secondary" className="text-[10px]">{p.name}</Badge>)}
                {!detail?.products?.length && <p className="text-xs text-muted-foreground">None.</p>}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Purchase History ({detail?.purchases?.length ?? 0} orders)</p>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(detail?.purchases ?? []).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs">{p.invoiceNumber ?? '—'}</TableCell>
                        <TableCell className="text-sm">{p.items?.length ?? 0}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(Number(p.totalAmount ?? 0))}</TableCell>
                      </TableRow>
                    ))}
                    {!detail?.purchases?.length && <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No purchases yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDetailId(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
