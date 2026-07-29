'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, ShoppingCart, Users, AlertTriangle, CheckCircle, Clock, Package, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function GrowthBadge({ pct }: { pct: number }) {
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${pct >= 0 ? 'text-success' : 'text-destructive'}`}>
      {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function KpiCard({ label, value, growth, sub, icon: Icon }: { label: string; value: string; growth?: number; sub?: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            {growth !== undefined && <GrowthBadge pct={growth} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExecutivePage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ['executive-kpi', period],
    queryFn: async () => { const { data } = await api.get('/executive/kpi', { params: { period } }); return data.data; },
  });
  const { data: trend } = useQuery({
    queryKey: ['executive-trend'],
    queryFn: async () => { const { data } = await api.get('/executive/trend'); return data.data; },
  });
  const { data: today } = useQuery({
    queryKey: ['executive-today'],
    queryFn: async () => { const { data } = await api.get('/executive/today'); return data.data; },
    refetchInterval: 60_000,
  });
  const { data: readiness } = useQuery({
    queryKey: ['launch-readiness'],
    queryFn: async () => { const { data } = await api.get('/executive/launch-readiness'); return data.data; },
  });

  const checklist = readiness?.checklist ?? [];
  const done = checklist.filter((c: any) => c.status === 'done').length;
  const total = checklist.filter((c: any) => c.status !== 'skipped').length;
  const launchScore = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Business health, KPIs and launch readiness</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {kpiLoading ? (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Revenue" value={formatCurrency(kpi?.revenue?.current??0)} growth={kpi?.revenue?.growth} icon={TrendingUp} />
          <KpiCard label="Orders" value={String(kpi?.orders?.current??0)} growth={kpi?.orders?.growth} icon={ShoppingCart} />
          <KpiCard label="New Customers" value={String(kpi?.customers?.new??0)} sub={`${kpi?.customers?.total??0} total`} icon={Users} />
          <KpiCard label="Avg Order Value" value={formatCurrency(kpi?.aov?.current??0)} icon={TrendingUp} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">12-Week Revenue & Orders</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend??[]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{fontSize:10}} />
                <YAxis yAxisId="rev" tick={{fontSize:10}} tickFormatter={(v)=>`৳${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="ord" orientation="right" tick={{fontSize:10}} />
                <Tooltip formatter={(v:number, name:string) => name==='Revenue' ? formatCurrency(v) : v} />
                <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Revenue" />
                <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="hsl(var(--chart-2,210 40% 50%))" strokeWidth={2} dot={false} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Today's Business Snapshot */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4"/>Today's Business</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Orders Today', value: today?.today?.orders??0, href: '/orders', warn: false },
              { label: 'Pending Orders', value: today?.pending?.orders??0, href: '/orders?status=PENDING', warn: (today?.pending?.orders??0)>10 },
              { label: 'Pending Returns', value: today?.pending?.returns??0, href: '/returns', warn: (today?.pending?.returns??0)>0 },
              { label: 'Pending Exchanges', value: today?.pending?.exchanges??0, href: '/exchanges', warn: (today?.pending?.exchanges??0)>0 },
              { label: 'Low Stock Items', value: today?.inventory?.lowStock?.length??0, href: '/inventory/dashboard', warn: (today?.inventory?.lowStock?.length??0)>0 },
              { label: 'Pending Reviews', value: today?.content?.pendingReviews??0, href: '/reviews', warn: (today?.content?.pendingReviews??0)>0 },
              { label: 'Pending Gallery', value: today?.content?.pendingGallery??0, href: '/gallery', warn: (today?.content?.pendingGallery??0)>0 },
            ].map(({label, value, href, warn}) => (
              <Link key={href} href={href} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent">
                <span className={warn ? 'text-amber-600 font-medium' : ''}>{label}</span>
                <span className={`font-bold ${warn ? 'text-amber-600' : ''}`}>{value}</span>
              </Link>
            ))}
            {today?.marketing?.activeCampaign && (
              <div className="mt-2 rounded-md bg-primary/10 px-3 py-2 text-xs">
                <span className="font-semibold text-primary">Active Campaign:</span>{' '}
                {today.marketing.activeCampaign.name}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending alerts */}
      {((kpi?.pending?.orders??0) > 0 || (kpi?.alerts?.lowStock??0) > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(kpi?.pending?.orders??0)>0 && <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"><AlertTriangle className="h-5 w-5 text-amber-600 shrink-0"/><div><p className="text-sm font-bold text-amber-700">{kpi.pending.orders} Pending Orders</p><Link href="/orders?status=PENDING" className="text-xs text-amber-600 underline">Review →</Link></div></div>}
          {(kpi?.pending?.returns??0)>0 && <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4"><AlertTriangle className="h-5 w-5 text-destructive shrink-0"/><div><p className="text-sm font-bold text-destructive">{kpi.pending.returns} Pending Returns</p><Link href="/returns" className="text-xs text-destructive underline">Review →</Link></div></div>}
          {(kpi?.alerts?.lowStock??0)>0 && <div className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"><Package className="h-5 w-5 text-amber-600 shrink-0"/><div><p className="text-sm font-bold text-amber-700">{kpi.alerts.lowStock} Low Stock Items</p><Link href="/inventory/dashboard" className="text-xs text-amber-600 underline">View →</Link></div></div>}
        </div>
      )}

      {/* Launch Readiness */}
      <Card className="mt-6">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Launch Readiness — {launchScore}%</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{width:`${launchScore}%`}} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {checklist.map((c: any) => (
              <div key={c.item} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${c.status==='done'?'border-success/30 bg-success/5':c.status==='skipped'?'opacity-50':''}`}>
                {c.status==='done' ? <CheckCircle className="h-3.5 w-3.5 text-success shrink-0"/> : c.status==='skipped' ? <span className="h-3.5 w-3.5 text-muted-foreground shrink-0">—</span> : <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0"/>}
                <span className="truncate">{c.item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security alerts */}
      {(today?.security?.recentAlerts?.length??0)>0 && (
        <Card className="mt-4 border-destructive/30">
          <CardHeader className="pb-2"><CardTitle className="text-base text-destructive">Security Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>User</TableHead><TableHead>IP</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(today?.security?.recentAlerts??[]).map((a: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{a.action}</TableCell>
                      <TableCell className="text-xs">{a.userId?.slice(0,8)??'—'}…</TableCell>
                      <TableCell className="text-xs">{a.ipAddress??'—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
