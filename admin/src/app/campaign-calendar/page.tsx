'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { api } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  DRAFT:  'bg-muted text-muted-foreground',
  ACTIVE: 'bg-success/20 text-success border-success/40',
  PAUSED: 'bg-amber-500/20 text-amber-700 border-amber-500/40',
  ENDED:  'bg-destructive/10 text-destructive border-destructive/30',
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function CampaignCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-calendar', year],
    queryFn: async () => { const { data } = await api.get('/campaigns/calendar', { params: { year } }); return data.data as any[]; },
  });

  const campaigns = data ?? [];

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }

  // Build calendar days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  function campaignsForDay(day: number) {
    const date = new Date(year, month, day);
    return campaigns.filter((c: any) => {
      const start = c.startDate ? new Date(c.startDate) : null;
      const end = c.endDate ? new Date(c.endDate) : null;
      if (c.status === 'ACTIVE' && !start && !end) return true;
      if (start && !end) return date >= start;
      if (!start && end) return date <= end;
      if (start && end) return date >= start && date <= end;
      return false;
    });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-2xl font-semibold">Campaign Calendar</h1>
          <p className="text-sm text-muted-foreground">Visual overview of all campaigns</p></div>
        <Link href="/campaigns"><Button size="sm"><Plus className="h-4 w-4" /> New Campaign</Button></Link>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {Object.entries(STATUS_COLORS).map(([s, cls]) => (
          <span key={s} className={`rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{s}</span>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button size="sm" variant="ghost" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <CardTitle>{MONTH_NAMES[month]} {year}</CardTitle>
          <Button size="sm" variant="ghost" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-96 w-full" /> : (
            <div className="overflow-auto">
              <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden" style={{minWidth:'560px'}}>
                {DAY_NAMES.map(d => (
                  <div key={d} className="bg-card px-2 py-3 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                ))}
                {Array.from({length: firstDay}).map((_,i) => (
                  <div key={`empty-${i}`} className="bg-card min-h-[80px]" />
                ))}
                {Array.from({length: daysInMonth}).map((_,i) => {
                  const day = i+1;
                  const dayC = campaignsForDay(day);
                  const isToday = day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
                  return (
                    <div key={day} className={`bg-card min-h-[80px] p-1.5 ${isToday?'ring-2 ring-primary ring-inset':''}`}>
                      <div className={`text-xs font-semibold mb-1 ${isToday?'text-primary':'text-muted-foreground'}`}>{day}</div>
                      <div className="space-y-0.5">
                        {dayC.map((c: any) => (
                          <div key={c.id} className={`text-[9px] font-semibold px-1 py-0.5 rounded border ${STATUS_COLORS[c.status]??'bg-muted'} truncate`} title={c.name}>
                            {c.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign list below calendar */}
      <div className="mt-6 space-y-3">
        <h2 className="font-serif text-lg">All Campaigns — {year}</h2>
        {campaigns.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <span className="font-semibold text-sm">{c.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{c.type}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—'} →{' '}
                {c.endDate ? new Date(c.endDate).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'Ongoing'}
              </span>
              <Badge variant={(c.status==='ACTIVE'?'success':c.status==='ENDED'?'destructive':'outline') as any} className="text-[10px]">{c.status}</Badge>
            </div>
          </div>
        ))}
        {!campaigns.length && <p className="text-sm text-muted-foreground text-center py-8">No campaigns in {year}.</p>}
      </div>
    </DashboardShell>
  );
}
