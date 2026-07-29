import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { Customer, ApiResponse } from '@/types';
import { toast } from 'sonner';

export function useCustomers(params: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Customer[]>>('/customers', { params });
      return data;
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCustomerStats() {
  return useQuery({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const { data } = await api.get('/customers/stats');
      return data.data;
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) => {
      const { data } = await api.put(`/customers/${id}`, payload);
      return data.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', v.id] });
      toast.success('Customer updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useBlockCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/customers/${id}/block`, { reason });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer blocked');
    },
  });
}

export function useUnblockCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/customers/${id}/unblock`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer unblocked');
    },
  });
}
