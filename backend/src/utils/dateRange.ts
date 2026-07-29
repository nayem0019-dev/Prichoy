// Phase 4 §2 — shared "Today / Yesterday / This Week / Last Week / This
// Month / Last Month / This Year / Custom Range" resolver, used by every
// analytics endpoint so the exact same period boundaries are used no
// matter which report you're looking at (a previous ad-hoc parseDateRange
// in report.controller.ts only supported "this month or custom", which is
// why this is a new shared util rather than reusing that one directly —
// report.controller.ts's existing behavior is left untouched).

export type DateRangePreset =
  | 'today' | 'yesterday' | 'this_week' | 'last_week'
  | 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  preset: DateRangePreset;
}

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sunday
  x.setDate(x.getDate() - day);
  return x;
}

export function resolveDateRange(query: {
  preset?: string; startDate?: string; endDate?: string;
}): DateRange {
  const now = new Date();
  const preset = (query.preset as DateRangePreset) || (query.startDate || query.endDate ? 'custom' : 'this_month');

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now), preset };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y), preset };
    }
    case 'this_week':
      return { start: startOfWeek(now), end: endOfDay(now), preset };
    case 'last_week': {
      const startThis = startOfWeek(now);
      const start = new Date(startThis); start.setDate(start.getDate() - 7);
      const end = new Date(startThis); end.setDate(end.getDate() - 1);
      return { start: startOfDay(start), end: endOfDay(end), preset };
    }
    case 'this_month':
      return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now), preset };
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfDay(start), end: endOfDay(end), preset };
    }
    case 'this_year':
      return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end: endOfDay(now), preset };
    case 'custom':
    default: {
      const start = query.startDate ? startOfDay(new Date(query.startDate)) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const end   = query.endDate   ? endOfDay(new Date(query.endDate))     : endOfDay(now);
      return { start, end, preset: 'custom' };
    }
  }
}

/** Same range shifted back by its own length — used for growth/trend %. */
export function previousPeriod({ start, end }: DateRange): DateRange {
  const lengthMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);
  return { start: prevStart, end: prevEnd, preset: 'custom' };
}

export function percentGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}
