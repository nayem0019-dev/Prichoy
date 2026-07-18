'use client';

import { useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Tags } from 'lucide-react';
import { useCustomers, useCustomer } from '@/hooks/useCustomers';
import { CUSTOMER_TAGS, CUSTOMER_TAG_TITLES, useSetCustomerTags } from '@/hooks/useCustomerTagsNotes';
import { usePermissions } from '@/hooks/usePermissions';
import { MultiCustomerTag } from '@/types';

function ManageTagsDialog({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const setTags = useSetCustomerTags();
  const [selected, setSelected] = useState<MultiCustomerTag[] | null>(null);

  const current = selected ?? (customer?.tags?.map((t) => t.tag) ?? []);

  function toggle(tag: MultiCustomerTag, checked: boolean) {
    const base = selected ?? (customer?.tags?.map((t) => t.tag) ?? []);
    setSelected(checked ? Array.from(new Set([...base, tag])) : base.filter((t) => t !== tag));
  }

  async function handleSave() {
    await setTags.mutateAsync({ customerId, tags: current });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage Tags — {customer?.name ?? '...'}</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {CUSTOMER_TAGS.map((tag) => (
              <label key={tag} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                <Checkbox checked={current.includes(tag)} onCheckedChange={(v) => toggle(tag, v === true)} />
                {CUSTOMER_TAG_TITLES[tag]}
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={setTags.isPending}>Save Tags</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerTagsPage() {
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [legacyTag, setLegacyTag] = useState('ALL');
  const [managingId, setManagingId] = useState<string | null>(null);

  const { data, isLoading } = useCustomers({
    page, limit: 20, search: search || undefined,
    tag: legacyTag === 'ALL' ? undefined : legacyTag,
  });
  const customers = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Customer Tags</h1>
        <p className="text-sm text-muted-foreground">
          Assign one or more tags per customer (VIP, Priority, High Return Risk, etc.) — separate from the legacy
          single &quot;Tag&quot; field shown in the filter below, which the storefront/support tools still read.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name, phone, email..." className="pl-8" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={legacyTag} onValueChange={(v) => { setLegacyTag(v); setPage(1); }}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Filter by legacy tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All (legacy tag)</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="FREQUENT">Frequent</SelectItem>
                <SelectItem value="WHOLESALE">Wholesale</SelectItem>
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Legacy Tag</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm">{c.phone}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{c.tag}</Badge></TableCell>
                      <TableCell className="text-sm">{c._count?.orders ?? 0}</TableCell>
                      <TableCell className="text-right">
                        {can('customers', 'update') && (
                          <Button size="sm" variant="outline" onClick={() => setManagingId(c.id)}>
                            <Tags className="h-3.5 w-3.5" /> Manage Tags
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

      {managingId && <ManageTagsDialog customerId={managingId} onClose={() => setManagingId(null)} />}
    </DashboardShell>
  );
}
