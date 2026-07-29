'use client';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessDashboard } from '@/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, ShoppingBag, DollarSign, Wallet, Package, Users, RefreshCw } from 'lucide-react';

function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: React.ElementType; tone?: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div><p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone ?? 'bg-primary/10 text-primary'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ label, count, to }: { label: string; count: number; to?: string }) {
  const inner = (
    <div className="flex flex-col items-center rounded-lg border p-3 text-center">
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
  return to ? <Link href={to}>{inner}</Link> : inner;
}

export default function BusinessDashboardPage() {
  const { data, isLoading, refetch } = useBusinessDashboard();

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Business Dashboard</h1>
          <p className="text-sm text-muted-foreground">Auto-refreshes every minute.</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Kpi label="Revenue" value={formatCurrency(data?.today?.revenue ?? 0)} icon={DollarSign} tone="bg-success/10 text-success" />
              <Kpi label="Orders" value={String(data?.today?.orders ?? 0)} icon={ShoppingBag} />
              <Kpi label="Gross Profit" value={formatCurrency(data?.today?.profit ?? 0)} icon={TrendingUp} tone="bg-primary/10 text-primary" />
              <Kpi label="Expenses" value={formatCurrency(data?.today?.expenses ?? 0)} icon={Wallet} tone="bg-amber-500/10 text-amber-600" />
              <Kpi label="Net Profit" value={formatCurrency(data?.today?.netProfit ?? 0)} icon={TrendingUp} tone={data?.today?.netProfit >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'} />
              <Kpi label="New Customers" value={String(data?.customers?.new ?? 0)} sub={`${data?.customers?.returning ?? 0} returning`} icon={Users} />
            </div>
          </section>

          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Order Status (Today)</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <StatusBadge label="Pending"   count={data?.orderStatus?.pending ?? 0}   to="/orders?status=PENDING" />
              <StatusBadge label="Confirmed" count={data?.orderStatus?.confirmed ?? 0} to="/orders?status=CONFIRMED" />
              <StatusBadge label="Packed"    count={data?.orderStatus?.packed ?? 0}    to="/orders?status=PACKED" />
              <StatusBadge label="Shipped"   count={data?.orderStatus?.dispatched ?? 0} to="/orders?status=DISPATCHED" />
              <StatusBadge label="Delivered" count={data?.orderStatus?.delivered ?? 0} to="/orders?status=DELIVERED" />
              <StatusBadge label="Returned"  count={data?.orderStatus?.returned ?? 0}  to="/returns" />
              <StatusBadge label="Exchanges" count={data?.exchangeOrdersToday ?? 0}    to="/exchanges" />
              <StatusBadge label="Cancelled" count={data?.orderStatus?.cancelled ?? 0} to="/orders?status=CANCELLED" />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Low Stock Products" value={String(data?.inventory?.lowStock ?? 0)} icon={Package} tone="bg-amber-500/10 text-amber-600" />
            <Kpi label="Out of Stock Products" value={String(data?.inventory?.outOfStock ?? 0)} icon={Package} tone="bg-destructive/10 text-destructive" />
            <Kpi label="Inventory Value" value={formatCurrency(data?.inventory?.inventoryValue ?? 0)} icon={Wallet} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top Selling Product</CardTitle></CardHeader>
              <CardContent>
                {data?.topProduct ? (
                  <div><p className="font-medium">{data.topProduct.name}</p>
                    <p className="text-xs text-muted-foreground">{data.topProduct.sku}</p></div>
                ) : <p className="text-sm text-muted-foreground">No sales data yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top Category</CardTitle></CardHeader>
              <CardContent>
                {data?.topCategory ? (
                  <p className="font-medium">{data.topCategory.name}</p>
                ) : <p className="text-sm text-muted-foreground">No sales data yet.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { href: '/analytics/sales', label: 'Sales Analytics' },
              { href: '/analytics/financial', label: 'Financial Dashboard' },
              { href: '/analytics/products', label: 'Product Performance' },
              { href: '/analytics/customers', label: 'Customer Analytics' },
              { href: '/analytics/delivery', label: 'Delivery Analytics' },
              { href: '/analytics/inventory', label: 'Inventory Reports' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
