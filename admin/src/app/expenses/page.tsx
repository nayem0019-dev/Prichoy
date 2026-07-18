'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['COURIER','MARKETING','SALARY','OFFICE','PACKAGING','MISCELLANEOUS'];

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', category: 'MISCELLANEOUS', date: new Date().toISOString().split('T')[0] });
  const qc = useQueryClient();

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => (await api.get('/settings/expenses')).data.data,
  });

  const createExpense = useMutation({
    mutationFn: async () => api.post('/settings/expenses', { ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense recorded');
      setOpen(false);
      setForm({ title: '', amount: '', category: 'MISCELLANEOUS', date: new Date().toISOString().split('T')[0] });
    },
  });

  const total = expenses?.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0) ?? 0;

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Total: {formatCurrency(total)}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Expense</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {expenses?.map((e: { id:string; title:string; category:string; amount:number; date:string }) => (
                <TableRow key={e.id}>
                  <TableCell>{e.title}</TableCell>
                  <TableCell className="text-xs">{e.category}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(e.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (৳)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createExpense.mutate()} disabled={!form.title || !form.amount}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
