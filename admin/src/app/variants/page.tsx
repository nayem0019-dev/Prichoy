'use client';

import { useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCreateVariant, useUpdateVariant, useDeleteVariant } from '@/hooks/useVariants';
import { usePermissions } from '@/hooks/usePermissions';
import { cn, formatCurrency } from '@/lib/utils';
import { Product, Variant } from '@/types';

interface FlatVariant extends Variant {
  productId: string;
  productName: string;
  productSku: string;
  productColors: Product['colors'];
}

const emptyForm = {
  name: 'Size', value: '', sku: '', barcode: '', price: '', salePrice: '',
  stock: '0', lowStockAlert: '5', colorId: 'NONE', image: '', isActive: true,
};

export default function VariantsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { can } = usePermissions();

  const { data, isLoading } = useProducts({ page, limit: 20, search: search || undefined });
  const products = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;

  const variants: FlatVariant[] = useMemo(
    () =>
      products.flatMap((p) =>
        (p.variants ?? []).map((v) => ({
          ...v,
          productId: p.id,
          productName: p.name,
          productSku: p.sku,
          productColors: p.colors,
        }))
      ),
    [products]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FlatVariant | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickedProduct, setPickedProduct] = useState<Product | null>(null);

  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const { data: pickerData } = useProducts({ page: 1, limit: 8, search: pickerSearch || undefined });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setPickedProduct(null);
    setPickerSearch('');
    setPickerOpen(true);
    setFormOpen(true);
  }

  function openEdit(v: FlatVariant) {
    setEditing(v);
    setPickedProduct(null);
    setPickerOpen(false);
    setForm({
      name: v.name, value: v.value, sku: v.sku ?? '', barcode: v.barcode ?? '',
      price: v.price != null ? String(v.price) : '', salePrice: v.salePrice != null ? String(v.salePrice) : '',
      stock: String(v.stock), lowStockAlert: String(v.lowStockAlert ?? 5),
      colorId: v.colorId ?? 'NONE', image: v.image ?? '', isActive: v.isActive,
    });
    setFormOpen(true);
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      value: form.value.trim(),
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      price: form.price ? Number(form.price) : undefined,
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      stock: Number(form.stock) || 0,
      lowStockAlert: Number(form.lowStockAlert) || 5,
      colorId: form.colorId === 'NONE' ? undefined : form.colorId,
      image: form.image.trim() || undefined,
      isActive: form.isActive,
    };
  }

  async function handleSave() {
    if (editing) {
      await updateVariant.mutateAsync({ variantId: editing.id, ...buildPayload() });
    } else {
      if (!pickedProduct) return;
      await createVariant.mutateAsync({ productId: pickedProduct.id, ...buildPayload() });
    }
    setFormOpen(false);
  }

  function handleDelete(v: FlatVariant) {
    if (confirm(`Delete variant "${v.name}: ${v.value}" from ${v.productName}?`)) {
      deleteVariant.mutate(v.id);
    }
  }

  function handleToggleActive(v: FlatVariant) {
    updateVariant.mutate({ variantId: v.id, isActive: !v.isActive });
  }

  const colorOptions = editing ? editing.productColors : pickedProduct?.colors;

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Variants</h1>
          <p className="text-sm text-muted-foreground">
            Color / size variants across products — {meta?.total ?? 0} products, {variants.length} variants on this page
          </p>
        </div>
        {can('products', 'create') && (
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Variant</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search product, variant SKU, or barcode..."
                className="pl-8"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Package className="h-8 w-8" />
              <p>No variants found on this page of products.</p>
              <p className="text-xs">Products without any color/size variants won&apos;t show here — add one to get started.</p>
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Size / Value</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Low Stock Alert</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v) => {
                    const low = v.stock <= (v.lowStockAlert ?? 5);
                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <p className="font-medium">{v.productName}</p>
                          <p className="text-xs text-muted-foreground">{v.productSku}</p>
                        </TableCell>
                        <TableCell>
                          {v.color ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              {v.color.hexCode && (
                                <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: v.color.hexCode }} />
                              )}
                              {v.color.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{v.name}: <span className="font-medium">{v.value}</span></TableCell>
                        <TableCell className="text-xs">{v.sku ?? '—'}</TableCell>
                        <TableCell>
                          <span className={cn('flex items-center gap-1 text-sm', v.stock === 0 ? 'text-destructive font-medium' : low && 'text-amber-600 font-medium')}>
                            {low && <AlertTriangle className="h-3.5 w-3.5" />}
                            {v.stock}
                          </span>
                          {v.price != null && (
                            <p className="text-xs text-muted-foreground">{formatCurrency(v.salePrice ?? v.price)}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{v.lowStockAlert ?? 5}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={v.isActive}
                              disabled={!can('products', 'update')}
                              onCheckedChange={() => handleToggleActive(v)}
                            />
                            <Badge variant={v.isActive ? 'success' : 'outline'} className="text-[10px]">
                              {v.isActive ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {can('products', 'update') && (
                              <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {can('products', 'delete') && (
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(v)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
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
              <p className="text-xs text-muted-foreground">Page {meta.page} of {meta.totalPages} (products)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Variant — ${editing.productName}` : 'Add Variant'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Product<span className="text-destructive">*</span></Label>
                {pickedProduct ? (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>{pickedProduct.name} <span className="text-xs text-muted-foreground">({pickedProduct.sku})</span></span>
                    <Button size="sm" variant="ghost" onClick={() => { setPickedProduct(null); setPickerOpen(true); }}>Change</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Search product by name or SKU..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      autoFocus
                    />
                    {pickerOpen && (pickerData?.data?.length ?? 0) > 0 && (
                      <div className="max-h-40 overflow-auto rounded-md border">
                        {pickerData!.data.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => { setPickedProduct(p); }}
                          >
                            <span>{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.sku}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Attribute Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Size" />
              </div>
              <div className="space-y-1.5">
                <Label>Value<span className="text-destructive">*</span></Label>
                <Input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="e.g. L" />
              </div>
            </div>

            {colorOptions && colorOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Select value={form.colorId} onValueChange={(v) => setForm((f) => ({ ...f, colorId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No color</SelectItem>
                    {colorOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="Auto-generated if blank" />
              </div>
              <div className="space-y-1.5">
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price Override (৳)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="Same as product" />
              </div>
              <div className="space-y-1.5">
                <Label>Sale Price (৳)</Label>
                <Input type="number" value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Low Stock Alert</Label>
                <Input type="number" value={form.lowStockAlert} onChange={(e) => setForm((f) => ({ ...f, lowStockAlert: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="https://..." />
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="mb-0">Enabled</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={
                createVariant.isPending || updateVariant.isPending ||
                !form.value.trim() || (!editing && !pickedProduct)
              }
            >
              {editing ? 'Save Changes' : 'Create Variant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
