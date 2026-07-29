'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Megaphone, Tag, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const CAMPAIGN_COLORS: Record<string, any> = { GRAND_OPENING:'success', FLASH_SALE:'destructive', EID_SALE:'secondary', CUSTOM:'outline' };

export default function MarketingDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketing-dashboard'],
    queryFn: async () => { const { data } = await api.get('/marketing-dashboard'); return data.data as any; },
    refetchInterval: 120_000,
  });

  const couponData = data ? [
    { name: 'Issued', value: data.couponStats?.issued ?? 0 },
    { name: 'Redeemed', value: data.couponStats?.redeemed ?? 0 },
    { name: 'Unredeemed', value: Math.max(0, (data.couponStats?.issued ?? 0) - (data.couponStats?.redeemed ?? 0)) },
  ] : [];
  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--muted-foreground))'];

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Marketing Dashboard</h1>
          <p className="text-sm text-muted-foreground">Campaigns, coupons, and conversion performance</p>
        </div>
        <div className="flex gap-2">
          <Link href="/campaigns"><Button size="sm" variant="outline"><Megaphone className="h-4 w-4"/>Campaigns</Button></Link>
          <Link href="/coupon-analytics"><Button size="sm" variant="outline"><Tag className="h-4 w-4"/>Coupons</Button></Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Active Campaigns', value: String(data?.activeCampaigns??0) },
              { label: 'This Month Revenue', value: formatCurrency(data?.monthlyRevenue??0) },
              { label: 'This Month Orders', value: String(data?.monthlyOrders??0) },
              { label: 'Coupon Redemption Rate', value: `${data?.couponStats?.redemptionRate??0}%` },
            ].map(k=>(
              <Card key={k.label}><CardContent className="p-5">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-bold">{k.value}</p>
              </CardContent></Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Active campaigns */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Active Campaigns</CardTitle></CardHeader>
              <CardContent>
                {(data?.campaigns??[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No active campaigns.</p>
                ) : (
                  <div className="space-y-2">
                    {(data?.campaigns??[]).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div>
                          <p className="font-semibold text-sm">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={CAMPAIGN_COLORS[c.type]??'outline'} className="text-[9px]">{c.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {c.endDate ? `Ends ${new Date(c.endDate).toLocaleDateString('en-BD',{day:'numeric',month:'short'})}` : 'No end date'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{c.couponsCount} coupons</p>
                          <Badge variant="success" className="text-[9px]">ACTIVE</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coupon analytics */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Coupon Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Revenue via Coupons</p>
                    <p className="font-bold text-lg mt-1">{formatCurrency(data?.couponStats?.revenueGenerated??0)}</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Redemption Rate</p>
                    <p className="font-bold text-lg mt-1">{data?.couponStats?.redemptionRate??0}%</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={couponData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                      {couponData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4"/>Marketing Intelligence Notes</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary font-bold">→</span> Use Location Intelligence (/analytics/location) to identify high-value districts for targeted Facebook/WhatsApp campaigns.</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">→</span> Districts with high COD cancellation rates may benefit from advance-payment campaigns or coupon incentives.</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">→</span> Coupon Simulator (/coupon-simulator) lets you calculate exact profit impact before launching a campaign discount.</li>
                <li className="flex items-start gap-2"><span className="text-primary font-bold">→</span> Welcome Back coupons are auto-issued after first delivery. Check Coupon Analytics for redemption performance.</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
