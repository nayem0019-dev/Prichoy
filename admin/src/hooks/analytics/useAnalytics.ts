import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type DateQuery = { preset?: string; startDate?: string; endDate?: string; granularity?: string };

const aq = (path: string, params?: object) => async () => {
  const { data } = await api.get(`/analytics/${path}`, { params });
  return data.data;
};

export function useBusinessDashboard() {
  return useQuery({ queryKey: ['analytics-dashboard'], queryFn: aq('dashboard'), refetchInterval: 60_000 });
}
export function useSalesAnalytics(params: DateQuery) {
  return useQuery({ queryKey: ['analytics-sales', params], queryFn: aq('sales', params) });
}
export function useFinancialDashboard(params: Omit<DateQuery, 'granularity'>) {
  return useQuery({ queryKey: ['analytics-financial', params], queryFn: aq('financial', params) });
}
export function useProductPerformance(params: DateQuery & { limit?: number }) {
  return useQuery({ queryKey: ['analytics-products', params], queryFn: aq('products', params) });
}
export function useCategoryAnalytics(params: Omit<DateQuery, 'granularity'>) {
  return useQuery({ queryKey: ['analytics-categories', params], queryFn: aq('categories', params) });
}
export function useCustomerAnalytics(params: Omit<DateQuery, 'granularity'>) {
  return useQuery({ queryKey: ['analytics-customers', params], queryFn: aq('customers', params) });
}
export function useDeliveryAnalytics(params: Omit<DateQuery, 'granularity'>) {
  return useQuery({ queryKey: ['analytics-delivery', params], queryFn: aq('delivery', params) });
}
export function useInventoryReports() {
  return useQuery({ queryKey: ['analytics-inventory'], queryFn: aq('inventory') });
}
