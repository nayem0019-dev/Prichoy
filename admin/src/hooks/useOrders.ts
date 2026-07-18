import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Order, DashboardStats, ApiResponse, OrderStatus } from '@/types';
import { toast } from 'sonner';

export function useOrders(params: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Order[]>>('/orders', { params });
      return data;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Order>>(`/orders/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardStats>>('/orders/dashboard');
      return data.data;
    },
    refetchInterval: 60_000,
  });
}

export function useRecentOrders(limit = 10) {
  return useQuery({
    queryKey: ['recent-orders', limit],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Order[]>>('/orders/recent', { params: { limit } });
      return data.data;
    },
  });
}

export function useSalesChart(days = 30) {
  return useQuery({
    queryKey: ['sales-chart', days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ date: string; total: number }[]>>(
        '/orders/chart/sales', { params: { days } }
      );
      return data.data;
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, ...rest }: {
      id: string; status: OrderStatus; note?: string;
      courierId?: string; trackingNumber?: string; cancelReason?: string;
    }) => {
      const { data } = await api.put(`/orders/${id}/status`, { status, ...rest });
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', variables.id] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`Order status updated to ${variables.status}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update order';
      toast.error(msg);
    },
  });
}

export function useAssignCourier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courierId, trackingNumber }: { id: string; courierId: string; trackingNumber: string }) => {
      const { data } = await api.put(`/orders/${id}/courier`, { courierId, trackingNumber });
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['order', v.id] });
      toast.success('Courier assigned');
    },
  });
}

export function useBulkOrderAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { orderIds: string[]; action: string; reason?: string }) => {
      const { data } = await api.post('/orders/bulk', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Bulk action completed');
    },
  });
}
