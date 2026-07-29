import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { MultiCustomerTag } from '@/types';
import { toast } from 'sonner';

export const CUSTOMER_TAGS: MultiCustomerTag[] = [
  'VIP', 'REGULAR', 'NEW', 'BLOCKED', 'FREQUENT', 'WHOLESALE',
  'PRIORITY', 'HIGH_RETURN_RISK', 'HIGH_CANCELLATION_RISK',
];

export const CUSTOMER_TAG_TITLES: Record<MultiCustomerTag, string> = {
  VIP: 'VIP', REGULAR: 'Regular', NEW: 'New', BLOCKED: 'Blocked',
  FREQUENT: 'Frequent Buyer', WHOLESALE: 'Wholesale',
  PRIORITY: 'Priority', HIGH_RETURN_RISK: 'High Return Risk',
  HIGH_CANCELLATION_RISK: 'High Cancellation Risk',
};

// Phase 3 §16 — replaces a customer's full multi-tag set in one call
// (see customerService.setTags), so callers pass the complete desired list.
export function useSetCustomerTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, tags }: { customerId: string; tags: MultiCustomerTag[] }) => {
      const { data } = await api.put(`/customers/${customerId}/tags`, { tags });
      return data.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', v.customerId] });
      toast.success('Tags updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// Phase 3 §17 — internal notes. Add/Edit only: the backend has no delete
// endpoint for customer notes (POST create + PUT update exist, no DELETE
// route in customer.routes.ts) — flagged in the final report rather than
// silently hidden or faked with a client-only delete.
export function useAddCustomerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, note }: { customerId: string; note: string }) => {
      const { data } = await api.post(`/customers/${customerId}/notes`, { note });
      return data.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['customer', v.customerId] });
      toast.success('Note added');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateCustomerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, noteId, note }: { customerId: string; noteId: string; note: string }) => {
      const { data } = await api.put(`/customers/${customerId}/notes/${noteId}`, { note });
      return data.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['customer', v.customerId] });
      toast.success('Note updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
