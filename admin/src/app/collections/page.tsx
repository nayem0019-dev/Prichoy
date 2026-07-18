'use client';

import { useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, Layers, PackagePlus } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import {
  useCollections, useCreateCollection, useUpdateCollection,
  useDeleteCollection, useSetProductCollections,
} from '@/hooks/useCollections';
import { usePermissions } from '@/hooks/usePermissions';
import { Collection } from '@/types';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function CollectionsPage() {
  const { can } = usePermissions();
  const { data: collections, isLoading } = useCollections();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);

  const [productsModal, setProductsModal] = useState<Collection | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);

  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const setProductCollections = useSetProductCollections();

  const { data: productsData, isLoading: productsLoading } = useProducts({
    page: productPage, limit: 10, search: productSearch || undefined,
  });
  const products = useMemo(() => productsData?.data ?? [], [productsData]);

  function openCreate() {
    setEditing(null);
    setName(''); setSlug(''); setDescription(''); setDisplayOrder('0'); setIsActive(true);
    setSlugTouched(false);
    setFormOpen(true);
  }

  function openEdit(c: Collection) {
    setEditing(c);
    setName(c.name); setSlug(c.slug); setDescription(c.description ?? '');
    setDisplayOrder(String(c.displayOrder)); setIsActive(c.isActive);
    setSlugTouched(true);
    setFormOpen(true);
  }

  async function handleSave() {
    const payload = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      description: description.trim() || undefined,
      displayOrder: Number(displayOrder) || 0,
    };
    if (editing) {
      await updateCollection.mutateAsync({ id: editing.id, ...payload, isActive });
    } else {
      await createCollection.mutateAsync(payload);
    }
    setFormOpen(false);
  }

  function handleDelete(c: Collection) {
    if (confirm(`Delete collection "${c.name}"? Products will be unassigned from it.`)) {
      deleteCollection.mutate(c.id);
    }
  }

  function isProductInCollection(productCollections: { collection: { id: string } }[] | undefined, collectionId: string) {
    return !!productCollections?.some((pc) => pc.collection.id === collectionId);
  }

  function handleToggleProduct(productId: string, currentCollectionIds: string[], collectionId: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...currentCollectionIds, collectionId]))
      : currentCollectionIds.filter((id) => id !== collectionId);
    setProductCollections.mutate({ productId, collectionIds: next });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Collections</h1>
          <p className="text-sm text-muted-foreground">{collections?.length ?? 0} collections</p>
        </div>
        {can('products', 'create') && (
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New Collection</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !collections?.length ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <Layers className="h-8 w-8" />
              <p>No collections yet.</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.slug}</TableCell>
                      <TableCell>{c._count?.products ?? 0}</TableCell>
                      <TableCell className="text-sm">{c.displayOrder}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? 'success' : 'outline'} className="text-[10px]">
                          {c.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {can('products', 'update') && (
                            <Button size="sm" variant="outline" onClick={() => { setProductsModal(c); setProductSearch(''); setProductPage(1); }}>
                              <PackagePlus className="h-3.5 w-3.5" /> Products
                            </Button>
                          )}
                          {can('products', 'update') && (
                            <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {can('products', 'delete') && (
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit collection */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Collection' : 'New Collection'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name<span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Summer Collection"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug<span className="text-destructive">*</span></Label>
              <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="summer-collection" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
            </div>
            {editing && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="mb-0">Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              A banner image and SEO fields aren&apos;t available yet — the backend&apos;s Collection table doesn&apos;t
              have those columns. Adding them would be a schema change, out of scope for this UI-only round.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || createCollection.isPending || updateCollection.isPending}>
              {editing ? 'Save Changes' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage products in collection */}
      <Dialog open={!!productsModal} onOpenChange={(v) => !v && setProductsModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Products in &quot;{productsModal?.name}&quot;</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search products to add/remove..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
              />
            </div>
            {productsLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="max-h-80 overflow-auto rounded-md border">
                {products.map((p) => {
                  const inCollection = isProductInCollection(p.collections, productsModal!.id);
                  const currentIds = (p.collections ?? []).map((pc) => pc.collection.id);
                  return (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-accent">
                      <Checkbox
                        checked={inCollection}
                        onCheckedChange={(checked) => handleToggleProduct(p.id, currentIds, productsModal!.id, checked === true)}
                      />
                      <span className="flex-1">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.sku}</span>
                    </label>
                  );
                })}
                {products.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No products found.</p>}
              </div>
            )}
            {productsData?.meta && productsData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Page {productsData.meta.page} of {productsData.meta.totalPages}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={productPage <= 1} onClick={() => setProductPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={productPage >= productsData.meta.totalPages} onClick={() => setProductPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductsModal(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
