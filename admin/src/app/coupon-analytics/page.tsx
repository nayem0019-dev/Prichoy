'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FlaskConical, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card><CardContent className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </CardContent></Card>
  );
}

export default function CouponAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['coupon-analytics'],
    queryFn: async () => { const { data } = await api.get('/coupon-analytics'); return data.data as any; },
  });

  const chartData = data ? [
    { name: 'Total Issued', value: data.total },
    { name: 'Active', value: data.active },
    { name: 'Redeemed', value: data.totalRedeemed },
    { name: 'Expired', value: data.expired },
    { name: 'Welcome Back', value: data.welcomeBackIssued },
    { name: 'WB Redeemed', value: data.welcomeBackRedeemed },
  ] : [];

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-2xl font-semibold">Coupon Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance of all coupon types</p></div>
        <div className="flex gap-2">
          <Link href="/coupon-simulator"><Button size="sm" variant="outline"><FlaskConical className="h-4 w-4" /> Simulator</Button></Link>
          <Link href="/coupons"><Button size="sm"><Tag className="h-4 w-4" /> Manage Coupons</Button></Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Total Issued" value={String(data?.total??0)} />
            <Kpi label="Active Coupons" value={String(data?.active??0)} />
            <Kpi label="Total Redeemed" value={String(data?.totalRedeemed??0)} />
            <Kpi label="Redemption Rate" value={`${data?.redemptionRate??0}%`} />
            <Kpi label="Revenue Generated" value={formatCurrency(data?.revenueGenerated??0)} sub="Approx. discount on orders" />
            <Kpi label="Expired Coupons" value={String(data?.expired??0)} />
            <Kpi label="Welcome Back Issued" value={String(data?.welcomeBackIssued??0)} />
            <Kpi label="Welcome Back Redeemed" value={String(data?.welcomeBackRedeemed??0)} sub={data?.welcomeBackIssued ? `${Math.round((data.welcomeBackRedeemed/data.welcomeBackIssued)*100)}% redemption` : ''} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Coupon Overview</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Recent Redemptions (30 days)</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(data?.recentRedemptions??[]).map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.coupon?.code}</TableCell>
                          <TableCell className="text-xs">{r.coupon?.type}</TableCell>
                          <TableCell className="text-sm">{r.customer?.name??'Guest'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.usedAt)}</TableCell>
                        </TableRow>
                      ))}
                      {!data?.recentRedemptions?.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No recent redemptions.</TableCell></TableRow>}
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
