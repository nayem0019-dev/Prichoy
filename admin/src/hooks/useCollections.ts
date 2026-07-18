import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { Collection } from '@/types';
import { toast } from 'sonner';

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Collection[] }>('/products/collections');
      return data.data;
    },
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; slug: string; description?: string; displayOrder?: number }) => {
      const { data } = await api.post('/products/collections', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection created');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/products/collections/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/collections/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// Assigns the full set of collections for one product (the only shape the
// backend supports — see productService.setProductCollections). The
// Collections page uses this per-product, preserving that product's other
// collection memberships by reading them off the product object first.
export function useSetProductCollections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, collectionIds }: { productId: string; collectionIds: string[] }) => {
      const { data } = await api.put(`/products/${productId}/collections`, { collectionIds });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection membership updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
