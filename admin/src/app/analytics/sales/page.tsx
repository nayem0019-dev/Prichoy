'use client';
import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DateRangePicker, DateRange } from '@/components/analytics/DateRangePicker';
import { useSalesAnalytics } from '@/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

export default function SalesAnalyticsPage() {
  const [range, setRange] = useState<DateRange>({ preset: 'this_month' });
  const [granularity, setGranularity] = useState('daily');
  const { data, isLoading } = useSalesAnalytics({ ...range, granularity });

  async function exportReport(fmt: 'xlsx' | 'csv') {
    const params = new URLSearchParams({ ...range, format: fmt });
    window.open(`${api.defaults.baseURL}/export/sales-report?${params}`, '_blank');
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Sales Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} showGranularity granularity={granularity} onGranularityChange={setGranularity} />
          <Button size="sm" variant="outline" onClick={() => exportReport('xlsx')}>Export Excel</Button>
          <Button size="sm" variant="outline" onClick={() => exportReport('csv')}>Export CSV</Button>
        </div>
      </div>

      {isLoading ? <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Revenue', value: formatCurrency(data?.revenue ?? 0) },
              { label: 'Orders', value: String(data?.orders ?? 0) },
              { label: 'Avg Order Value', value: formatCurrency(data?.averageOrderValue ?? 0) },
              { label: 'Revenue Growth', value: `${data?.growth?.revenue ?? 0}%`, positive: (data?.growth?.revenue ?? 0) >= 0 },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={`mt-1 text-2xl font-semibold ${k.positive === false ? 'text-destructive' : ''}`}>{k.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Revenue Chart</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data?.chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">Orders Chart</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data?.chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--chart-2, 210 40% 50%))" strokeWidth={2} dot={false} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
