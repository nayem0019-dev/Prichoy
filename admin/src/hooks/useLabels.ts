import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { ProductLabel } from '@/types';
import { toast } from 'sonner';

// Phase 3 §5 — Labels are a fixed enum (NEW, BEST_SELLER, TRENDING, SALE,
// LIMITED, PREMIUM, FEATURED), not an admin-manageable table — see the
// schema comment on `enum ProductLabel`. There is no "create a custom
// label" endpoint to wire up; this hook only assigns/unassigns from the
// fixed set via PUT /products/:id/labels, which replaces a product's full
// label set in one call (so callers should pass the complete desired list).
export const PRODUCT_LABELS: ProductLabel[] = [
  'NEW', 'BEST_SELLER', 'TRENDING', 'SALE', 'LIMITED', 'PREMIUM', 'FEATURED',
];

export const PRODUCT_LABEL_TITLES: Record<ProductLabel, string> = {
  NEW: 'New Arrival',
  BEST_SELLER: 'Best Seller',
  TRENDING: 'Trending',
  SALE: 'Sale',
  LIMITED: 'Limited Edition',
  PREMIUM: 'Premium',
  FEATURED: 'Featured',
};

export function useSetProductLabels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, labels }: { productId: string; labels: ProductLabel[] }) => {
      const { data } = await api.put(`/products/${productId}/labels`, { labels });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Labels updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
