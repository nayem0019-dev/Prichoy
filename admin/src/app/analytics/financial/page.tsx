'use client';
import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DateRangePicker, DateRange } from '@/components/analytics/DateRangePicker';
import { useFinancialDashboard } from '@/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/lib/utils';

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card><CardContent className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </CardContent></Card>
  );
}

export default function FinancialDashboardPage() {
  const [range, setRange] = useState<DateRange>({ preset: 'this_month' });
  const { data, isLoading } = useFinancialDashboard(range);

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Financial Dashboard</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Revenue" value={formatCurrency(data?.revenue ?? 0)} />
            <KpiCard label="Product Cost (COGS)" value={formatCurrency(data?.productCost ?? 0)} />
            <KpiCard label="Gross Profit" value={formatCurrency(data?.grossProfit ?? 0)} />
            <KpiCard label="Operating Expenses" value={formatCurrency(data?.expenses ?? 0)} />
            <KpiCard label="Net Profit" value={formatCurrency(data?.netProfit ?? 0)}
              sub={`Margin: ${data?.profitMargin ?? 0}%`} />
            <KpiCard label="Monthly Profit (MTD)" value={formatCurrency(data?.monthlyProfit ?? 0)}
              sub={`YTD: ${formatCurrency(data?.yearlyProfit ?? 0)}`} />
          </div>

          {/* Cash Flow summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Money In (Revenue)</p>
              <p className="mt-1 text-xl font-semibold text-success">{formatCurrency(data?.revenue ?? 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Money Out (COGS + Expenses)</p>
              <p className="mt-1 text-xl font-semibold text-destructive">{formatCurrency((data?.productCost ?? 0) + (data?.expenses ?? 0))}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Net Cash Flow</p>
              <p className={`mt-1 text-xl font-semibold ${(data?.netProfit ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(data?.netProfit ?? 0)}
              </p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">12-Month Profit Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data?.trend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="profit" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/.15)" strokeWidth={2} name="Net Profit" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">P&L Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[
                    { name: 'Revenue', value: data?.revenue ?? 0 },
                    { name: 'COGS', value: data?.productCost ?? 0 },
                    { name: 'Gross Profit', value: data?.grossProfit ?? 0 },
                    { name: 'Expenses', value: data?.expenses ?? 0 },
                    { name: 'Net Profit', value: data?.netProfit ?? 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
