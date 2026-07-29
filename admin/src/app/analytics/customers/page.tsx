'use client';
import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker, DateRange } from '@/components/analytics/DateRangePicker';
import { useCustomerAnalytics } from '@/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/lib/utils';
import { Users, UserPlus, TrendingUp, Wallet } from 'lucide-react';

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card><CardContent className="flex items-center justify-between p-5">
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
    </CardContent></Card>
  );
}

export default function CustomerAnalyticsPage() {
  const [range, setRange] = useState<DateRange>({ preset: 'this_month' });
  const { data, isLoading } = useCustomerAnalytics(range);

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Customer Analytics</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="New Customers" value={String(data?.newCustomers ?? 0)} icon={UserPlus} />
            <Kpi label="Returning Customers" value={String(data?.returningCustomers ?? 0)} icon={Users} />
            <Kpi label="Active Customers" value={String(data?.activeCustomers ?? 0)} icon={TrendingUp} />
            <Kpi label="Avg Customer Value" value={formatCurrency(data?.averageCustomerValue ?? 0)} icon={Wallet} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top Customers by Spending</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Orders</TableHead><TableHead>Total Spent</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(data?.topBySpend ?? []).map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-sm">{c.phone}</TableCell>
                          <TableCell className="text-sm">{c.totalOrders}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(Number(c.totalSpent))}</TableCell>
                        </TableRow>
                      ))}
                      {!data?.topBySpend?.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top Customers by Orders</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Orders</TableHead><TableHead>Total Spent</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(data?.topByOrders ?? []).map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-sm">{c.phone}</TableCell>
                          <TableCell className="text-sm">{c.totalOrders}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(Number(c.totalSpent))}</TableCell>
                        </TableRow>
                      ))}
                      {!data?.topByOrders?.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
