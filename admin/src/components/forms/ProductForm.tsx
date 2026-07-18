'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useCategories, useBrands, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useWarehouses } from '@/hooks/useInventory';
import { Product } from '@/types';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  slug: z.string().min(2, 'Slug required'),
  sku: z.string().min(1, 'SKU required'),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category required'),
  brandId: z.string().optional(),
  gender: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0.01, 'Selling price required'),
  salePrice: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  warehouseId: z.string().min(1, 'Warehouse required'),
  initialStock: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = !!product;
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: warehouses } = useWarehouses();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      name: product.name, slug: product.slug, sku: product.sku,
      barcode: product.barcode ?? '', description: product.description ?? '',
      categoryId: product.categoryId, brandId: product.brandId ?? '',
      gender: product.gender ?? '', costPrice: product.costPrice,
      sellingPrice: product.sellingPrice, salePrice: product.salePrice ?? undefined,
      isActive: product.isActive, isFeatured: product.isFeatured,
    } : { isActive: true },
  });

  async function onSubmit(values: FormData) {
    if (isEdit) {
      await updateProduct.mutateAsync({ id: product!.id, ...values });
    } else {
      await createProduct.mutateAsync(values);
    }
    router.push('/products');
  }

  const isLoading = createProduct.isPending || updateProduct.isPending;

  return (
    <DashboardShell>
      <h1 className="mb-6 font-serif text-2xl font-semibold">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Product Name*</Label>
                  <Input {...register('name')} placeholder="e.g. Floral Wrap Dress" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Slug*</Label>
                    <Input {...register('slug')} placeholder="floral-wrap-dress" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>SKU*</Label>
                    <Input {...register('sku')} placeholder="PRC-DR-001" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Barcode</Label>
                  <Input {...register('barcode')} placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <textarea {...register('description')}
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Cost Price (৳)*</Label>
                  <Input type="number" step="0.01" {...register('costPrice')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Selling Price (৳)*</Label>
                  <Input type="number" step="0.01" {...register('sellingPrice')} />
                  {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Sale Price (৳)</Label>
                  <Input type="number" step="0.01" {...register('salePrice')} placeholder="Optional" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Organization</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Category*</Label>
                  <Select value={watch('categoryId')} onValueChange={(v) => setValue('categoryId', v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((c: { id: string; name: string }) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Select value={watch('brandId')} onValueChange={(v) => setValue('brandId', v)}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      {brands?.map((b: { id: string; name: string }) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={watch('gender')} onValueChange={(v) => setValue('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Men</SelectItem>
                      <SelectItem value="FEMALE">Women</SelectItem>
                      <SelectItem value="UNISEX">Unisex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {!isEdit && (
              <Card>
                <CardHeader><CardTitle className="text-base">Initial Stock</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Warehouse*</Label>
                    <Select value={watch('warehouseId')} onValueChange={(v) => setValue('warehouseId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.warehouseId && <p className="text-xs text-destructive">{errors.warehouseId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Initial Stock Quantity</Label>
                    <Input type="number" {...register('initialStock')} placeholder="0" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </div>
      </form>
    </DashboardShell>
  );
}
