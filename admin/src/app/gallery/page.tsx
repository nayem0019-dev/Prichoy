'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Images } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';

export default function GalleryModerationPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('false'); // 'false' = pending, 'true' = approved, 'all' = all

  const { data, isLoading } = useQuery({
    queryKey: ['admin-gallery', filter],
    queryFn: async () => {
      const params: any = {};
      if (filter !== 'all') params.approved = filter;
      const { data } = await api.get('/customer/admin/gallery', { params });
      return data;
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.put(`/customer/admin/gallery/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-gallery'] }); toast.success('Photo approved'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.delete(`/customer/admin/gallery/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-gallery'] }); toast.success('Photo removed'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const photos: any[] = data?.data?.photos ?? [];
  const meta = data?.data?.meta;

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-2xl font-semibold">Customer Gallery</h1>
          <p className="text-sm text-muted-foreground">Approve or reject customer-submitted product photos.</p></div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Pending</SelectItem>
            <SelectItem value="true">Approved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-56 rounded-xl"/>)}</div> : (
            photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
                <Images className="h-10 w-10" />
                <p>No photos in this queue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo: any) => (
                  <div key={photo.id} className="rounded-xl border overflow-hidden bg-card">
                    <div className="grid grid-cols-2 gap-0.5 bg-muted">
                      {(photo.photoUrls||[]).slice(0,4).map((url: string, i: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                      ))}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold">{photo.product?.name}</p>
                      <p className="text-xs text-muted-foreground">{photo.customer?.name} • {formatDateTime(photo.createdAt)}</p>
                      {photo.caption && <p className="mt-1 text-xs italic line-clamp-2">{photo.caption}</p>}
                      <div className="mt-3 flex gap-2">
                        {!photo.isApproved && (
                          <Button size="sm" className="flex-1" onClick={() => approve.mutate(photo.id)} disabled={approve.isPending}>
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { if(confirm('Remove this photo?')) reject.mutate(photo.id); }} disabled={reject.isPending}>
                          <XCircle className="h-3.5 w-3.5 text-destructive" /> {photo.isApproved ? 'Remove' : 'Reject'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
