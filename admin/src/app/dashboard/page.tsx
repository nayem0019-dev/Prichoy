'use client';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, ShoppingBag, Clock, PackageCheck,
  Truck, CheckCircle2, XCircle, RotateCcw, Users, TrendingUp,
  Layers, Tag, Boxes, StickyNote, Tags, Ruler,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { useDashboardStats, useRecentOrders, useSalesChart } from '@/hooks/useOrders';
import { cn, formatCurrency, formatDateTime, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/utils';

function StatCard({ title, value, icon: Icon, trend, color }: {
  title: string; value: string; icon: React.ElementType; trend?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {trend && <p className="mt-1 text-xs text-success">{trend}</p>}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', color ?? 'bg-primary/10 text-primary')}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: recentOrders } = useRecentOrders(8);
  const { data: chartData } = useSalesChart(30);

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your store performance</p>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard title="Today's Sales"   value={formatCurrency(stats?.revenue.today ?? 0)} icon={DollarSign} color="bg-success/10 text-success" />
            <StatCard title="Monthly Sales"   value={formatCurrency(stats?.revenue.month ?? 0)} icon={TrendingUp} color="bg-blue-500/10 text-blue-600" />
            <StatCard title="Yearly Sales"    value={formatCurrency(stats?.revenue.year ?? 0)}  icon={TrendingUp} color="bg-purple-500/10 text-purple-600" />
            <StatCard title="Total Revenue"   value={formatCurrency(stats?.revenue.total ?? 0)} icon={DollarSign} color="bg-primary/10 text-primary" />
          </>
        )}
      </div>

      {/* Order Status Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          <>
            <StatCard title="Total Orders"  value={String(stats?.orders.total ?? 0)}     icon={ShoppingBag}   color="bg-slate-500/10 text-slate-600" />
            <StatCard title="Pending"       value={String(stats?.orders.pending ?? 0)}   icon={Clock}         color="bg-amber-500/10 text-amber-600" />
            <StatCard title="Confirmed"     value={String(stats?.orders.confirmed ?? 0)} icon={CheckCircle2}  color="bg-blue-500/10 text-blue-600" />
            <StatCard title="Packed"        value={String(stats?.orders.packed ?? 0)}    icon={PackageCheck}  color="bg-indigo-500/10 text-indigo-600" />
            <StatCard title="Dispatched"    value={String(stats?.orders.dispatched ?? 0)} icon={Truck}        color="bg-purple-500/10 text-purple-600" />
            <StatCard title="Delivered"     value={String(stats?.orders.delivered ?? 0)} icon={CheckCircle2}  color="bg-success/10 text-success" />
            <StatCard title="Cancelled"     value={String(stats?.orders.cancelled ?? 0)} icon={XCircle}       color="bg-destructive/10 text-destructive" />
            <StatCard title="Returned"      value={String(stats?.orders.returned ?? 0)}  icon={RotateCcw}     color="bg-orange-500/10 text-orange-600" />
          </>
        )}
      </div>

      {/* Phase 3.2 §9 — quick shortcuts to the newly completed admin pages */}
      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">Manage</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { href: '/variants', label: 'Variants', icon: Layers },
              { href: '/collections', label: 'Collections', icon: Layers },
              { href: '/labels', label: 'Labels', icon: Tag },
              { href: '/inventory/dashboard', label: 'Inventory', icon: Boxes },
              { href: '/customer-notes', label: 'Customer Notes', icon: StickyNote },
              { href: '/customer-tags', label: 'Customer Tags', icon: Tags },
              { href: '/size-guides', label: 'Size Guides', icon: Ruler },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center text-xs font-medium transition-colors hover:bg-accent"
              >
                <Icon className="h-5 w-5 text-primary" />
                {label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sales Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData ?? []}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${v / 1000}k`} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link href="/orders" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders?.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent"
              >
                <div>
                  <p className="font-medium">{order.orderNo}</p>
                  <p className="text-xs text-muted-foreground">{order.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(order.grandTotal)}</p>
                  <Badge className={cn('mt-0.5 text-[10px]', ORDER_STATUS_COLORS[order.status])} variant="outline">
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
