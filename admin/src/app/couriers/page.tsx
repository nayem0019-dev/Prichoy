'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Courier } from '@/types';
import { Plus, ExternalLink, Truck } from 'lucide-react';
import { toast } from 'sonner';

export default function CouriersPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const qc = useQueryClient();

  const { data: couriers, isLoading } = useQuery({
    queryKey: ['couriers-full'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Courier[] }>('/couriers');
      return data.data;
    },
  });

  const createCourier = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/couriers', { name, website, isActive: true });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couriers-full'] });
      toast.success('Courier added');
      setOpen(false); setName(''); setWebsite('');
    },
  });

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Couriers</h1>
          <p className="text-sm text-muted-foreground">Manage delivery partners</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Courier</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          couriers?.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <Badge variant={c.isActive ? 'success' : 'outline'} className="text-[10px]">
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                {c.website && (
                  <a href={c.website} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Courier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Courier Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pathao" />
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createCourier.mutate()} disabled={!name || createCourier.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
