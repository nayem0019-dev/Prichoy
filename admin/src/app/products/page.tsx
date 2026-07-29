'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Download, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useProducts, useCategories, useDeleteProduct } from '@/hooks/useProducts';
import { formatCurrency, cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [gender, setGender] = useState('ALL');
  const { can } = usePermissions();

  const { data, isLoading } = useProducts({
    page, limit: 20, search: search || undefined,
    categoryId: categoryId === 'ALL' ? undefined : categoryId,
    gender: gender === 'ALL' ? undefined : gender,
  });
  const { data: categories } = useCategories();
  const deleteProduct = useDeleteProduct();

  const products = data?.data ?? [];
  const meta = data?.meta;

  function getStock(p: (typeof products)[0]) {
    return p.inventories.reduce((sum, i) => sum + (i.quantity - i.reserved), 0);
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"? This cannot be undone if the product has no orders.`)) {
      deleteProduct.mutate(id);
    }
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">{meta?.total ?? 0} products</p>
        </div>
        <div className="flex gap-2">
          {can('products', 'export') && (
            <Button variant="outline" size="sm"
              onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/export/products`, '_blank')}>
              <Download className="h-4 w-4" /> Export
            </Button>
          )}
          {can('products', 'create') && (
            <Link href="/products/new">
              <Button size="sm"><Plus className="h-4 w-4" /> Add Product</Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search name, SKU, barcode..." className="pl-8" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories?.map((c: { id: string; name: string }) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gender} onValueChange={(v) => { setGender(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Genders</SelectItem>
                <SelectItem value="MALE">Men</SelectItem>
                <SelectItem value="FEMALE">Women</SelectItem>
                <SelectItem value="UNISEX">Unisex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="max-h-[65vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const stock = getStock(p);
                    const primaryImage = p.images.find((i) => i.isPrimary) ?? p.images[0];
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {primaryImage ? (
                              <img src={primaryImage.url} alt={p.name} className="h-11 w-9 rounded object-cover" />
                            ) : (
                              <div className="h-11 w-9 rounded bg-muted" />
                            )}
                            <div>
                              <Link href={`/products/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                              <p className="text-xs text-muted-foreground">{p.gender ?? ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{p.sku}</TableCell>
                        <TableCell className="text-xs">{p.category.name}</TableCell>
                        <TableCell>
                          <p className="font-medium">{formatCurrency(p.salePrice ?? p.sellingPrice)}</p>
                          {p.salePrice && <p className="text-xs text-muted-foreground line-through">{formatCurrency(p.sellingPrice)}</p>}
                        </TableCell>
                        <TableCell>
                          <span className={cn('flex items-center gap-1 text-sm', stock <= 10 && 'text-destructive font-medium')}>
                            {stock <= 10 && <AlertTriangle className="h-3.5 w-3.5" />}
                            {stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{p.totalSold}</TableCell>
                        <TableCell>
                          <Badge variant={p.isActive ? 'success' : 'outline'} className="text-[10px]">
                            {p.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {can('products', 'update') && (
                              <Link href={`/products/${p.id}`}>
                                <Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>
                              </Link>
                            )}
                            {can('products', 'delete') && (
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id, p.name)}>
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
