'use client';

import { useMemo, useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Ruler } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useSizeGuide, useUpsertSizeGuide } from '@/hooks/useSizeGuide';
import { usePermissions } from '@/hooks/usePermissions';
import { Product } from '@/types';

function SizeGuideDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data: guide, isLoading } = useSizeGuide(product.id);
  const upsert = useUpsertSizeGuide();

  const [imageUrl, setImageUrl] = useState('');
  const [tableJson, setTableJson] = useState('[]');
  const [notes, setNotes] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (guide) {
      setImageUrl(guide.imageUrl ?? '');
      setTableJson(guide.measurementTable ?? '[]');
      setNotes(guide.notes ?? '');
    } else if (!isLoading) {
      setImageUrl(''); setTableJson('[{"size":"M","chest":40,"length":28}]'); setNotes('');
    }
  }, [guide, isLoading]);

  const parsedRows = useMemo(() => {
    try {
      const parsed = JSON.parse(tableJson || '[]');
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
      setJsonError('');
      return parsed as Record<string, string | number>[];
    } catch {
      setJsonError('Invalid JSON — preview unavailable until fixed.');
      return [];
    }
  }, [tableJson]);

  const columns = useMemo(() => {
    const set = new Set<string>();
    parsedRows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [parsedRows]);

  async function handleSave() {
    if (jsonError) return;
    await upsert.mutateAsync({
      productId: product.id,
      imageUrl: imageUrl.trim() || undefined,
      measurementTable: tableJson.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Size Guide — {product.name}</DialogTitle></DialogHeader>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Diagram / Chart Image URL</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Size guide preview" className="mt-2 h-32 rounded border object-contain" />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Measurement Table (JSON)</Label>
              <Textarea
                value={tableJson}
                onChange={(e) => setTableJson(e.target.value)}
                rows={5}
                className="font-mono text-xs"
                placeholder='[{"size":"M","chest":40,"length":28}]'
              />
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Measurements in inches, may vary ±0.5&quot;" />
            </div>

            {!jsonError && parsedRows.length > 0 && (
              <div className="space-y-1.5">
                <Label>Preview</Label>
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((c) => <TableCell key={c}>{row[c] ?? '—'}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!!jsonError || upsert.isPending}>Save Size Guide</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SizeGuidesPage() {
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  const { data, isLoading } = useProducts({ page, limit: 20, search: search || undefined });
  const products = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Size Guides</h1>
        <p className="text-sm text-muted-foreground">One size guide per product — a chart image, a measurement table, and notes.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-8" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="max-h-[65vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Size Guide</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.sku}</TableCell>
                      <TableCell>
                        <Badge variant={p.sizeGuide ? 'success' : 'outline'} className="text-[10px]">
                          {p.sizeGuide ? 'Configured' : 'Not set'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {can('products', 'update') && (
                          <Button size="sm" variant="outline" onClick={() => setActiveProduct(p)}>
                            <Ruler className="h-3.5 w-3.5" /> Manage
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

      {activeProduct && <SizeGuideDialog product={activeProduct} onClose={() => setActiveProduct(null)} />}
    </DashboardShell>
  );
}
