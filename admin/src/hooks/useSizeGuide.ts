import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { ProductSizeGuide } from '@/types';
import { toast } from 'sonner';

// Phase 3 §7 — one size guide per product (ProductSizeGuide is @unique on
// productId). There's no "list all size guides" endpoint since it isn't a
// standalone table a-la Collections — the Size Guides page instead lists
// products (which already embed `sizeGuide` in the /products response) and
// lets the admin manage/preview the guide for whichever product they pick.
export function useSizeGuide(productId: string) {
  return useQuery({
    queryKey: ['size-guide', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProductSizeGuide | null }>(`/products/${productId}/size-guide`);
      return data.data;
    },
    enabled: !!productId,
  });
}

export function useUpsertSizeGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, ...payload }: {
      productId: string; imageUrl?: string; measurementTable?: string; notes?: string;
    }) => {
      const { data } = await api.put(`/products/${productId}/size-guide`, payload);
      return data.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['size-guide', v.productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Size guide saved');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
