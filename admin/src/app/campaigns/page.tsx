'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CalendarDays, Play, Pause, Square, Pencil, Trash2 } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const CAMPAIGN_TYPES = ['GRAND_OPENING','FLASH_SALE','EID_SALE','WINTER_SALE','SUMMER_SALE','BLACK_FRIDAY','CLEARANCE','NEW_ARRIVAL','CUSTOM'];
const TYPE_LABELS: Record<string, string> = { GRAND_OPENING:'Grand Opening', FLASH_SALE:'Flash Sale', EID_SALE:'Eid Sale', WINTER_SALE:'Winter Sale', SUMMER_SALE:'Summer Sale', BLACK_FRIDAY:'Black Friday', CLEARANCE:'Clearance', NEW_ARRIVAL:'New Arrival', CUSTOM:'Custom' };
const STATUS_VARIANT: Record<string, 'outline'|'secondary'|'success'|'destructive'|'warning'> = { DRAFT:'outline', ACTIVE:'success', PAUSED:'warning', ENDED:'destructive' };

const empty = { name:'', type:'FLASH_SALE', description:'', bannerUrl:'', startDate:'', endDate:'', autoActivate:false, autoDeactivate:false, discountType:'PERCENTAGE', discountValue:'', isStackable:false };

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(empty);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter],
    queryFn: async () => { const { data } = await api.get('/campaigns', { params: { status: statusFilter !== 'ALL' ? statusFilter : undefined, limit: 50 } }); return data; },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, discountValue: form.discountValue ? Number(form.discountValue) : undefined };
      if (editing) await api.put(`/campaigns/${editing.id}`, payload);
      else await api.post('/campaigns', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); setFormOpen(false); toast.success(editing ? 'Campaign updated' : 'Campaign created'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const action = useMutation({
    mutationFn: async ({ id, act }: { id: string; act: string }) => api.put(`/campaigns/${id}/${act}`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign updated'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign deleted'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function openCreate() { setEditing(null); setForm(empty); setFormOpen(true); }
  function openEdit(c: any) {
    setEditing(c);
    setForm({ name:c.name, type:c.type, description:c.description||'', bannerUrl:c.bannerUrl||'', startDate:c.startDate?c.startDate.slice(0,16):'', endDate:c.endDate?c.endDate.slice(0,16):'', autoActivate:c.autoActivate, autoDeactivate:c.autoDeactivate, discountType:c.discountType||'PERCENTAGE', discountValue:c.discountValue||'', isStackable:c.isStackable });
    setFormOpen(true);
  }
  function f(k: string, v: any) { setForm((p) => ({ ...p, [k]: v })); }

  const campaigns: any[] = data?.data?.campaigns ?? [];

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Master controller for all promotions</p></div>
        <div className="flex gap-2">
          <Link href="/campaign-calendar"><Button size="sm" variant="outline"><CalendarDays className="h-4 w-4" /> Calendar</Button></Link>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New Campaign</Button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {['ALL','DRAFT','ACTIVE','PAUSED','ENDED'].map((s) => (
          <Button key={s} size="sm" variant={statusFilter===s?'default':'outline'} onClick={()=>setStatusFilter(s)}>{s}</Button>
        ))}
      </div>

      <Card><CardContent className="p-4">
        {isLoading ? <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-14 w-full"/>)}</div> : (
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                <TableHead>Discount</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead>
                <TableHead>Stackable</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {campaigns.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{TYPE_LABELS[c.type]??c.type}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[c.status]??'outline'} className="text-[10px]">{c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{c.discountValue?`${c.discountType==='PERCENTAGE'?c.discountValue+'%':'৳'+Number(c.discountValue).toLocaleString()}`:'-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.startDate?formatDateTime(c.startDate):'—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.endDate?formatDateTime(c.endDate):'—'}</TableCell>
                    <TableCell>{c.isStackable?'✅':'-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {c.status==='DRAFT'&&<Button size="sm" variant="outline" onClick={()=>action.mutate({id:c.id,act:'activate'})}><Play className="h-3.5 w-3.5"/>Activate</Button>}
                        {c.status==='ACTIVE'&&<Button size="sm" variant="outline" onClick={()=>action.mutate({id:c.id,act:'pause'})}><Pause className="h-3.5 w-3.5"/>Pause</Button>}
                        {(c.status==='ACTIVE'||c.status==='PAUSED')&&<Button size="sm" variant="outline" onClick={()=>action.mutate({id:c.id,act:'end'})}><Square className="h-3.5 w-3.5"/>End</Button>}
                        <Button size="icon" variant="ghost" onClick={()=>openEdit(c)}><Pencil className="h-3.5 w-3.5"/></Button>
                        <Button size="icon" variant="ghost" onClick={()=>{if(confirm('Delete campaign?'))del.mutate(c.id);}}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!campaigns.length&&<TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No campaigns.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?'Edit Campaign':'New Campaign'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name<span className="text-destructive">*</span></Label><Input value={form.name} onChange={(e)=>f('name',e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={form.type} onValueChange={(v)=>f('type',v)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{CAMPAIGN_TYPES.map(t=><SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e)=>f('description',e.target.value)} rows={2}/></div>
            <div className="space-y-1.5"><Label>Banner Image URL</Label><Input value={form.bannerUrl} onChange={(e)=>f('bannerUrl',e.target.value)} placeholder="https://..."/></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="datetime-local" value={form.startDate} onChange={(e)=>f('startDate',e.target.value)}/></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="datetime-local" value={form.endDate} onChange={(e)=>f('endDate',e.target.value)}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v)=>f('discountType',v)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="PERCENTAGE">Percentage %</SelectItem><SelectItem value="FLAT">Flat ৳</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Value</Label><Input type="number" value={form.discountValue} onChange={(e)=>f('discountValue',e.target.value)} placeholder="0"/></div>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2"><Label className="mb-0">Auto Activate on Start Date</Label><Switch checked={form.autoActivate} onCheckedChange={(v)=>f('autoActivate',v)}/></div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2"><Label className="mb-0">Auto Deactivate on End Date</Label><Switch checked={form.autoDeactivate} onCheckedChange={(v)=>f('autoDeactivate',v)}/></div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div><Label className="mb-0">Stackable with Coupons</Label><p className="text-xs text-muted-foreground">Allow combining with coupon discounts</p></div>
              <Switch checked={form.isStackable} onCheckedChange={(v)=>f('isStackable',v)}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setFormOpen(false)}>Cancel</Button>
            <Button onClick={()=>save.mutate()} disabled={!form.name.trim()||save.isPending}>{editing?'Save Changes':'Create Campaign'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
