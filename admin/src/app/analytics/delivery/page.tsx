'use client';
import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRangePicker, DateRange } from '@/components/analytics/DateRangePicker';
import { useDeliveryAnalytics } from '@/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['hsl(var(--success,142 71% 45%))', 'hsl(var(--destructive))', 'hsl(var(--primary))', 'hsl(var(--muted-foreground))'];

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card><CardContent className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? ''}`}>{value}</p>
    </CardContent></Card>
  );
}

export default function DeliveryAnalyticsPage() {
  const [range, setRange] = useState<DateRange>({ preset: 'this_month' });
  const { data, isLoading } = useDeliveryAnalytics(range);

  const pieData = data ? [
    { name: 'Delivered', value: data.delivered },
    { name: 'Returned',  value: data.returned },
    { name: 'Exchanges', value: data.exchanges },
    { name: 'Cancelled', value: data.cancelled },
  ] : [];

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Delivery Analytics</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Total Orders" value={String(data?.total ?? 0)} />
            <Kpi label="Delivered" value={String(data?.delivered ?? 0)} tone="text-success" />
            <Kpi label="Returned" value={String(data?.returned ?? 0)} tone="text-destructive" />
            <Kpi label="Exchanges" value={String(data?.exchanges ?? 0)} tone="text-primary" />
            <Kpi label="Cancelled" value={String(data?.cancelled ?? 0)} tone="text-muted-foreground" />
            <Kpi label="Success Rate" value={`${data?.deliverySuccessRate ?? 0}%`} tone="text-success" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <p className="mb-2 text-sm font-medium">Order Outcome Distribution</p>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <p className="text-sm font-medium">Courier Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(data?.courierCost ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Total courier charges collected / paid on orders in this period.</p>
                <div className="mt-6 space-y-2 rounded-md border p-4">
                  <p className="text-sm font-medium">Loss Exposure</p>
                  <p className="text-xs text-muted-foreground">
                    {data?.returned ?? 0} returned orders and {data?.exchanges ?? 0} exchanges this period may generate return-accounting losses. Open the Returns and Exchanges pages to review each record.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
