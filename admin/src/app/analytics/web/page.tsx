'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { DateRangePicker, DateRange } from '@/components/analytics/DateRangePicker';
import { api } from '@/lib/api';

export default function WebAnalyticsPage() {
  const [range, setRange] = useState<DateRange>({ preset: 'this_month' });

  const params: any = {};
  if (range.preset === 'custom') { params.startDate = range.startDate; params.endDate = range.endDate; }

  const { data, isLoading } = useQuery({
    queryKey: ['web-analytics', range],
    queryFn: async () => { const { data } = await api.get('/web-analytics', { params }); return data.data as any; },
  });

  const funnelData = (data?.funnel ?? []).map((f: any) => ({
    name: f.step.replace(/_/g,' '), value: f.count, dropoff: f.dropoffRate,
  }));
  const deviceData = (data?.deviceBreakdown ?? []).map((d: any) => ({ name: d.device ?? 'Unknown', count: d.count }));
  const sourceData = (data?.trafficSources ?? []).slice(0, 8).map((s: any) => ({ name: s.source ?? 'Direct', count: s.count }));

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Web Analytics</h1>
          <p className="text-sm text-muted-foreground">Visitor funnel, device breakdown, and traffic sources</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Summary KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Sessions', value: String(data?.totalSessions ?? 0) },
            { label: 'Conversion Rate', value: `${data?.conversionRate ?? 0}%` },
            { label: 'Top Page', value: data?.topPages?.[0]?.page?.split('/').pop()?.replace('.html','') ?? '—' },
            { label: 'Top Source', value: data?.trafficSources?.[0]?.source ?? 'Direct' },
          ].map(k => (
            <Card key={k.label}><CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-xl font-bold truncate">{k.value}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            {funnelData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No analytics events yet. Add the tracking beacon to the storefront.</p>
            ) : (
              <div className="space-y-2">
                {funnelData.map((step: any, i: number) => (
                  <div key={step.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{step.name}</span>
                      <span className="text-muted-foreground">{step.value.toLocaleString()}{i > 0 && step.dropoff > 0 && <span className="text-destructive ml-2">−{step.dropoff}%</span>}</span>
                    </div>
                    <div className="h-6 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded bg-primary transition-all" style={{width: funnelData[0]?.value > 0 ? `${Math.round((step.value/funnelData[0].value)*100)}%` : '0%'}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Device Breakdown</CardTitle></CardHeader>
          <CardContent>
            {deviceData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border"/>
                  <XAxis dataKey="name" tick={{fontSize:12}}/>
                  <YAxis tick={{fontSize:11}}/>
                  <Tooltip/>
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Sessions"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Traffic Sources + Top Pages */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Traffic Sources</CardTitle></CardHeader>
          <CardContent>
            {sourceData.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No source data yet.</p> : (
              <div className="space-y-2">
                {sourceData.map((s: any) => (
                  <div key={s.name} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                    <span className="truncate max-w-[200px]">{s.name}</span>
                    <span className="font-semibold">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top Landing Pages</CardTitle></CardHeader>
          <CardContent>
            {(data?.topPages ?? []).length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No page data yet.</p> : (
              <div className="space-y-2">
                {(data?.topPages ?? []).slice(0,8).map((p: any) => (
                  <div key={p.page} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                    <span className="truncate max-w-[200px] text-muted-foreground">{p.page ?? '/'}</span>
                    <span className="font-semibold">{p.views}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-muted/40">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">HOW TO ACTIVATE TRACKING</p>
          <p className="text-xs text-muted-foreground">Add this to the storefront <code>js/api.js</code> to start collecting events:</p>
          <pre className="mt-2 text-xs bg-card rounded border p-3 overflow-auto">{`// Call on page load:
fetch(API_BASE + '/analytics/track', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({
    event: 'PAGE_VIEW',
    page: window.location.pathname,
    referrer: document.referrer || undefined,
    sessionId: sessionStorage.getItem('sid') || (() => {
      const id = Math.random().toString(36).slice(2);
      sessionStorage.setItem('sid', id); return id;
    })(),
  })
});`}</pre>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
