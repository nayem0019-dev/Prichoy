'use client';
import { useParams } from 'next/navigation';
import { useProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/forms/ProductForm';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) {
    return (
      <DashboardShell>
        <Skeleton className="h-96 w-full" />
      </DashboardShell>
    );
  }

  return <ProductForm product={product} />;
}
