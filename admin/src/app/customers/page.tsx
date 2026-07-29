'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, Crown, Ban } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

const TAG_COLORS: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-800', REGULAR: 'bg-blue-100 text-blue-800',
  NEW: 'bg-green-100 text-green-800', BLOCKED: 'bg-red-100 text-red-800',
  FREQUENT: 'bg-purple-100 text-purple-800', WHOLESALE: 'bg-indigo-100 text-indigo-800',
};

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('ALL');
  const { can } = usePermissions();

  const { data, isLoading } = useCustomers({
    page, limit: 20, search: search || undefined,
    tag: tag === 'ALL' ? undefined : tag,
  });

  const customers = data?.data ?? [];
  const meta = data?.meta;

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">{meta?.total ?? 0} customers</p>
        </div>
        {can('customers', 'export') && (
          <Button variant="outline" size="sm"
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/export/customers`, '_blank')}>
            <Download className="h-4 w-4" /> Export
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name, phone, email..." className="pl-8" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={tag} onValueChange={(v) => { setTag(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tags</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Lifetime Value</TableHead>
                    <TableHead>Avg Order</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/customers/${c.id}`} className="flex items-center gap-1.5 font-medium text-primary hover:underline">
                          {c.tag === 'VIP' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                          {c.isBlocked && <Ban className="h-3.5 w-3.5 text-destructive" />}
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p>{c.phone}</p>
                        {c.email && <p className="text-muted-foreground">{c.email}</p>}
                      </TableCell>
                      <TableCell>{c.totalOrders}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(c.totalSpent)}</TableCell>
                      <TableCell>{formatCurrency(c.averageOrder)}</TableCell>
                      <TableCell><Badge className={cn('text-[10px]', TAG_COLORS[c.tag])} variant="outline">{c.tag}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}</TableCell>
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
    </DashboardShell>
  );
}
