'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#2d6a4f', '#40916c', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc', '#c9a96e', '#a5603e'];

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: summary } = useQuery({
    queryKey: ['report-summary', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get('/reports/sales-summary', { params: { startDate, endDate } });
      return data.data;
    },
  });

  const { data: statusData } = useQuery({
    queryKey: ['report-status', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get('/reports/orders-by-status', { params: { startDate, endDate } });
      return data.data as { status: string; count: number; revenue: number }[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['report-products', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get('/reports/product-performance', { params: { startDate, endDate, limit: 10 } });
      return data.data;
    },
  });

  const { data: couriers } = useQuery({
    queryKey: ['report-couriers', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get('/reports/courier-performance', { params: { startDate, endDate } });
      return data.data;
    },
  });

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Reports</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Orders</p><p className="text-xl font-semibold">{summary?.totalOrders ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-semibold">{formatCurrency(summary?.totalRevenue ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-xl font-semibold">{formatCurrency(summary?.totalExpenses ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net Profit</p><p className="text-xl font-semibold text-success">{formatCurrency(summary?.netProfit ?? 0)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Products by Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={products?.slice(0, 6) ?? []}
                  dataKey="_sum.totalPrice"
                  nameKey="product.name"
                  cx="50%" cy="50%" outerRadius={90}
                  label={(entry) => entry.product?.name?.slice(0, 12)}
                >
                  {(products ?? []).slice(0, 6).map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Courier Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {couriers?.map((c: { courier: string; total: number; delivered: number; returned: number; successRate: number }) => (
              <div key={c.courier} className="rounded-lg border p-4">
                <p className="font-medium">{c.courier}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div><p className="font-semibold">{c.total}</p><p className="text-muted-foreground">Total</p></div>
                  <div><p className="font-semibold text-success">{c.delivered}</p><p className="text-muted-foreground">Delivered</p></div>
                  <div><p className="font-semibold text-destructive">{c.returned}</p><p className="text-muted-foreground">Returned</p></div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-success" style={{ width: `${c.successRate}%` }} />
                </div>
                <p className="mt-1 text-right text-xs text-muted-foreground">{c.successRate}% success rate</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
