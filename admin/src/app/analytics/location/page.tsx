'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, TrendingUp } from 'lucide-react';
import { DateRangePicker, DateRange } from '@/components/analytics/DateRangePicker';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function LocationAnalyticsPage() {
  const [range, setRange] = useState<DateRange>({ preset: 'this_month' });
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const { data: districts, isLoading } = useQuery({
    queryKey: ['location-district', range],
    queryFn: async () => {
      const params: any = {};
      if (range.preset === 'custom') { params.startDate = range.startDate; params.endDate = range.endDate; }
      else { const d = rangeToParams(range); params.startDate = d.s; params.endDate = d.e; }
      const { data } = await api.get('/location/district', { params });
      return data.data as any[];
    },
  });

  const { data: thanas } = useQuery({
    queryKey: ['location-thana', selectedDistrict, range],
    queryFn: async () => {
      if (!selectedDistrict) return [];
      const params: any = { district: selectedDistrict };
      const d = rangeToParams(range); params.startDate = d.s; params.endDate = d.e;
      const { data } = await api.get('/location/thana', { params });
      return data.data as any[];
    },
    enabled: !!selectedDistrict,
  });

  function rangeToParams(r: DateRange) {
    const now = new Date();
    if (r.preset === 'this_month') return { s: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), e: now.toISOString().slice(0,10) };
    if (r.preset === 'last_month') { const s = new Date(now.getFullYear(), now.getMonth()-1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { s: s.toISOString().slice(0,10), e: e.toISOString().slice(0,10) }; }
    return { s: r.startDate ?? '', e: r.endDate ?? '' };
  }

  const rows = districts ?? [];
  const topDistrict = rows[0];
  const totalRevenue = rows.reduce((s: number, r: any) => s + r.revenue, 0);
  const topChart = rows.slice(0, 10).map((r: any) => ({ name: r.district, revenue: r.revenue, orders: r.orders }));

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Location Intelligence</h1>
          <p className="text-sm text-muted-foreground">Sales analytics by district and thana — for marketing budget decisions</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground">Districts with Sales</p>
          <p className="mt-1 text-2xl font-bold">{rows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground">Top District</p>
          <p className="mt-1 text-xl font-bold truncate">{topDistrict?.district ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(topDistrict?.revenue ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground">Total Revenue (Mapped)</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground">Highest Return Rate</p>
          <p className="mt-1 text-xl font-bold">
            {rows.length ? `${rows.reduce((m: any, r: any) => r.returnRate > (m?.returnRate ?? 0) ? r : m, null)?.district ?? '—'}` : '—'}
          </p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top 10 Districts by Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{fontSize:10}} tickFormatter={(v)=>`৳${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0,4,4,0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">District Performance Table</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>District</TableHead><TableHead>Orders</TableHead>
                  <TableHead>Revenue</TableHead><TableHead>AOV</TableHead>
                  <TableHead>Cancel%</TableHead><TableHead>Return%</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? Array.from({length:5}).map((_,i)=><TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6 w-full"/></TableCell></TableRow>) :
                    rows.map((r: any) => (
                      <TableRow key={r.district} className={`cursor-pointer ${selectedDistrict===r.district?'bg-accent':''}`} onClick={()=>setSelectedDistrict(d=>d===r.district?null:r.district)}>
                        <TableCell className="font-medium text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0"/>{r.district}
                        </TableCell>
                        <TableCell className="text-sm">{r.orders}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(r.revenue)}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(r.avgOrderValue)}</TableCell>
                        <TableCell>
                          <Badge variant={r.cancellationRate>20?'destructive':r.cancellationRate>10?'warning':'outline'} className="text-[10px]">
                            {r.cancellationRate}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.returnRate>15?'destructive':r.returnRate>5?'warning':'outline'} className="text-[10px]">
                            {r.returnRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                  {!isLoading&&!rows.length&&<TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No data for this period.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thana drill-down */}
      {selectedDistrict && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4"/>Thana Breakdown — {selectedDistrict}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={()=>setSelectedDistrict(null)}>✕ Close</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Thana</TableHead><TableHead>Orders</TableHead><TableHead>Revenue</TableHead><TableHead>AOV</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(thanas??[]).map((t: any)=>(
                    <TableRow key={t.thana}>
                      <TableCell className="font-medium text-sm">{t.thana}</TableCell>
                      <TableCell className="text-sm">{t.orders}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(t.revenue)}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(t.avgOrderValue)}</TableCell>
                    </TableRow>
                  ))}
                  {!(thanas??[]).length&&<TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No thana data available.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
