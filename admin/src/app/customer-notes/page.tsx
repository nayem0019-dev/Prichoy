'use client';

import { useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, StickyNote, Pencil, Plus } from 'lucide-react';
import { useCustomers, useCustomer } from '@/hooks/useCustomers';
import { useAddCustomerNote, useUpdateCustomerNote } from '@/hooks/useCustomerTagsNotes';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateTime } from '@/lib/utils';

function NotesDialog({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const addNote = useAddCustomerNote();
  const updateNote = useUpdateCustomerNote();
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  async function handleAdd() {
    if (!newNote.trim()) return;
    await addNote.mutateAsync({ customerId, note: newNote.trim() });
    setNewNote('');
  }

  async function handleUpdate() {
    if (!editingId || !editingText.trim()) return;
    await updateNote.mutateAsync({ customerId, noteId: editingId, note: editingText.trim() });
    setEditingId(null);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Notes — {customer?.name ?? '...'}</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note..." rows={2} className="flex-1" />
            <Button size="sm" onClick={handleAdd} disabled={!newNote.trim() || addNote.isPending}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="max-h-96 space-y-3 overflow-auto">
              {(customer?.customerNotes ?? []).map((n) => (
                <div key={n.id} className="rounded-md border p-3">
                  {editingId === n.id ? (
                    <div className="space-y-2">
                      <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={2} />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button size="sm" onClick={handleUpdate} disabled={updateNote.isPending}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{n.createdBy?.name ?? 'Unknown admin'} • {formatDateTime(n.createdAt)}</span>
                        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => { setEditingId(n.id); setEditingText(n.note); }}>
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {!customer?.customerNotes?.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">No notes yet.</p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Notes can be added and edited. There&apos;s no delete-note endpoint on the backend yet
            (only create/update), so deleting isn&apos;t available here — flagged in the final report.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerNotesPage() {
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [managingId, setManagingId] = useState<string | null>(null);

  const { data, isLoading } = useCustomers({ page, limit: 20, search: search || undefined });
  const customers = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Customer Notes</h1>
        <p className="text-sm text-muted-foreground">Internal notes per customer, with admin name and timestamp.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search customers..." className="pl-8" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="max-h-[65vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm">{c.phone}</TableCell>
                      <TableCell className="text-sm">{c._count?.orders ?? 0}</TableCell>
                      <TableCell className="text-right">
                        {can('customers', 'update') && (
                          <Button size="sm" variant="outline" onClick={() => setManagingId(c.id)}>
                            <StickyNote className="h-3.5 w-3.5" /> Notes
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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

      {managingId && <NotesDialog customerId={managingId} onClose={() => setManagingId(null)} />}
    </DashboardShell>
  );
}
