'use client';
import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DateRangePicker, DateRange } from '@/components/analytics/DateRangePicker';
import { useProductPerformance } from '@/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

export default function ProductPerformancePage() {
  const [range, setRange] = useState<DateRange>({ preset: 'this_month' });
  const { data, isLoading } = useProductPerformance(range);

  function exportReport(fmt: 'xlsx' | 'csv') {
    const params = new URLSearchParams({ ...range, format: fmt });
    window.open(`${api.defaults.baseURL}/export/orders?${params}`, '_blank');
  }

  const cols = [
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category' },
    { key: 'quantitySold', label: 'Units Sold' },
    { key: 'revenue', label: 'Revenue', fmt: (v: number) => formatCurrency(v) },
    { key: 'profit', label: 'Profit', fmt: (v: number) => formatCurrency(v) },
    { key: 'profitMargin', label: 'Margin %', fmt: (v: number) => `${v}%` },
  ];

  function ProductTable({ rows }: { rows: any[] }) {
    if (!rows?.length) return <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>;
    return (
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader><TableRow>{cols.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.name}<br /><span className="text-xs text-muted-foreground">{r.sku}</span></TableCell>
                <TableCell className="text-sm">{r.category || '—'}</TableCell>
                <TableCell className="text-sm">{r.quantitySold}</TableCell>
                <TableCell className="text-sm">{formatCurrency(r.revenue)}</TableCell>
                <TableCell className="text-sm">{formatCurrency(r.profit)}</TableCell>
                <TableCell>
                  <Badge variant={r.profitMargin >= 20 ? 'success' : r.profitMargin >= 0 ? 'outline' : 'destructive'} className="text-[10px]">
                    {r.profitMargin}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Product Performance</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={range} onChange={setRange} />
          <Button size="sm" variant="outline" onClick={() => exportReport('xlsx')}>Export Excel</Button>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-96 w-full" /> : (
        <Tabs defaultValue="best">
          <TabsList className="mb-4">
            <TabsTrigger value="best">Best Selling</TabsTrigger>
            <TabsTrigger value="worst">Worst Selling</TabsTrigger>
            <TabsTrigger value="profit">Highest Profit</TabsTrigger>
            <TabsTrigger value="low">Lowest Profit</TabsTrigger>
          </TabsList>
          <TabsContent value="best"><ProductTable rows={data?.bestSelling} /></TabsContent>
          <TabsContent value="worst"><ProductTable rows={data?.worstSelling} /></TabsContent>
          <TabsContent value="profit"><ProductTable rows={data?.highestProfit} /></TabsContent>
          <TabsContent value="low"><ProductTable rows={data?.lowestProfit} /></TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  );
}
