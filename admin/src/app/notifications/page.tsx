'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Bell, Package, UserPlus, RotateCcw, XCircle, CheckCheck } from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  NEW_ORDER: Bell, LOW_STOCK: Package, OUT_OF_STOCK: Package,
  NEW_CUSTOMER: UserPlus, ORDER_RETURNED: RotateCcw, ORDER_CANCELLED: XCircle,
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications-full'],
    queryFn: async () => {
      const { data } = await api.get('/settings/notifications');
      return data.data as { notifications: Array<{ id:string; type:string; title:string; body:string; isRead:boolean; createdAt:string }>; unreadCount: number };
    },
  });

  const markRead = useMutation({
    mutationFn: async () => api.put('/settings/notifications/read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-full'] }),
  });

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{data?.unreadCount ?? 0} unread</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => markRead.mutate()}>
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </Button>
      </div>

      <div className="space-y-2">
        {data?.notifications.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          return (
            <Card key={n.id} className={cn(!n.isRead && 'border-primary/30 bg-primary/5')}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.isRead && <Badge className="h-1.5 w-1.5 rounded-full p-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!data?.notifications.length && (
          <p className="py-12 text-center text-sm text-muted-foreground">No notifications yet</p>
        )}
      </div>
    </DashboardShell>
  );
}
