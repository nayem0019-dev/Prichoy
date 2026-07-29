'use client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface DateRange { preset: DatePreset; startDate?: string; endDate?: string; }

interface Props { value: DateRange; onChange: (v: DateRange) => void; showGranularity?: boolean; granularity?: string; onGranularityChange?: (v: string) => void; }

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today',      label: 'Today' },
  { value: 'yesterday',  label: 'Yesterday' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'last_week',  label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year',  label: 'This Year' },
  { value: 'custom',     label: 'Custom Range' },
];

export function DateRangePicker({ value, onChange, showGranularity, granularity, onGranularityChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.preset} onValueChange={(v) => onChange({ ...value, preset: v as DatePreset })}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>{PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
      </Select>
      {value.preset === 'custom' && (
        <>
          <Input type="date" className="w-40" value={value.startDate ?? ''}
            onChange={(e) => onChange({ ...value, startDate: e.target.value })} />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" className="w-40" value={value.endDate ?? ''}
            onChange={(e) => onChange({ ...value, endDate: e.target.value })} />
        </>
      )}
      {showGranularity && (
        <Select value={granularity ?? 'daily'} onValueChange={onGranularityChange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
