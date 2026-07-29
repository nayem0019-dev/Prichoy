'use client';

import { useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Tag as TagIcon } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { PRODUCT_LABELS, PRODUCT_LABEL_TITLES, useSetProductLabels } from '@/hooks/useLabels';
import { usePermissions } from '@/hooks/usePermissions';
import { ProductLabel } from '@/types';

function LabelCountBadge({ label }: { label: ProductLabel }) {
  const { data } = useProducts({ page: 1, limit: 1, label });
  return <span className="text-2xl font-semibold">{data?.meta?.total ?? '—'}</span>;
}

export default function LabelsPage() {
  const { can } = usePermissions();
  const [activeLabel, setActiveLabel] = useState<ProductLabel | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProducts({ page, limit: 10, search: search || undefined });
  const products = useMemo(() => data?.data ?? [], [data]);
  const setLabels = useSetProductLabels();

  function hasLabel(labels: { label: ProductLabel }[] | undefined, label: ProductLabel) {
    return !!labels?.some((l) => l.label === label);
  }

  function toggle(productId: string, currentLabels: ProductLabel[], label: ProductLabel, checked: boolean) {
    const next = checked ? Array.from(new Set([...currentLabels, label])) : currentLabels.filter((l) => l !== label);
    setLabels.mutate({ productId, labels: next });
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Product Labels</h1>
        <p className="text-sm text-muted-foreground">
          A fixed set of merchandising labels — the backend uses an enum rather than a custom-labels table,
          so labels can be assigned/unassigned but not renamed or created.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {PRODUCT_LABELS.map((label) => (
          <Card key={label} className="cursor-pointer transition-colors hover:border-primary" onClick={() => setActiveLabel(label)}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{PRODUCT_LABEL_TITLES[label]}</p>
                <LabelCountBadge label={label} />
              </div>
              <TagIcon className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!activeLabel} onOpenChange={(v) => !v && setActiveLabel(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign &quot;{activeLabel ? PRODUCT_LABEL_TITLES[activeLabel] : ''}&quot; to Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search products..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="max-h-80 overflow-auto rounded-md border">
                {products.map((p) => {
                  const currentLabels = (p.labels ?? []).map((l) => l.label);
                  const checked = activeLabel ? hasLabel(p.labels, activeLabel) : false;
                  return (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-accent">
                      <Checkbox
                        checked={checked}
                        disabled={!can('products', 'update')}
                        onCheckedChange={(v) => activeLabel && toggle(p.id, currentLabels, activeLabel, v === true)}
                      />
                      <span className="flex-1">{p.name}</span>
                      <div className="flex gap-1">
                        {(p.labels ?? []).map((l) => (
                          <Badge key={l.id} variant="secondary" className="text-[9px]">{PRODUCT_LABEL_TITLES[l.label]}</Badge>
                        ))}
                      </div>
                    </label>
                  );
                })}
                {products.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No products found.</p>}
              </div>
            )}
            {data?.meta && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Page {data.meta.page} of {data.meta.totalPages}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveLabel(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
