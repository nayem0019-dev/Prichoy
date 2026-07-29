import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

// Phase 3.2 — there is no global "list all variants" backend endpoint
// (variants are only ever listed per-product, via GET /products/:id/variants,
// which the product list/detail responses already embed). Rather than add a
// new endpoint, the Variant Management page flattens variants out of the
// existing paginated /products response (see app/variants/page.tsx), and
// these mutations use the existing per-product create/update/delete routes.
export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, ...payload }: { productId: string } & Record<string, unknown>) => {
      const { data } = await api.post(`/products/${productId}/variants`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Variant created');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variantId, ...payload }: { variantId: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/products/variants/${variantId}`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Variant updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: string) => {
      await api.delete(`/products/variants/${variantId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Variant deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
