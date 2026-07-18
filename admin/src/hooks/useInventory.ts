import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { Inventory, Warehouse, StockMovement, ApiResponse } from '@/types';

// Phase 3 §12 / Phase 3.2 §7 — inventory KPI dashboard.
export interface InventoryDashboard {
  totalProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  outOfStockVariants: number;
  lowStockVariants: number;
  inventoryValue: number;
  recentlyUpdated: { id: string; name: string; sku: string; updatedAt: string; status: string; images: { url: string }[] }[];
  lowStockAlerts: Inventory[];
  recentMovements: StockMovement[];
}

export function useInventoryDashboard() {
  return useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ data: InventoryDashboard }>('/inventory/dashboard');
      return data.data;
    },
  });
}

// Phase 3.2 §8 — Stock Movement History. GET /inventory/:id/movements is
// scoped to a single inventory record (product+warehouse) rather than a
// global search-everything feed — there's no backend endpoint for the
// latter. The Stock Movements page combines this (drill into one product's
// full paginated history) with the last-15-globally feed already returned
// by /inventory/dashboard for a "recent activity, store-wide" view.
export function useInventoryMovements(inventoryId: string, params: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['inventory-movements', inventoryId, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<StockMovement[]>>(`/inventory/${inventoryId}/movements`, { params });
      return data;
    },
    enabled: !!inventoryId,
  });
}


export function useInventory(params: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Inventory[]>>('/inventory', { params });
      return data;
    },
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Warehouse[]>>('/inventory/warehouses');
      return data.data;
    },
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/low-stock-alerts');
      return data.data as Inventory[];
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      productId: string; warehouseId: string; type: string;
      quantity: number; reason?: string; note?: string;
    }) => {
      const { data } = await api.post('/inventory/adjust', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock adjusted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useTransferStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      productId: string; fromWarehouseId: string; toWarehouseId: string;
      quantity: number; note?: string;
    }) => {
      const { data } = await api.post('/inventory/transfer', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock transferred');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
