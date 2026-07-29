'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FlaskConical, AlertTriangle, Trash2, Mail, MessageSquare } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';

export default function SandboxPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sandbox-config'],
    queryFn: async () => { const { data } = await api.get('/sandbox'); return data.data as { sandboxMode: boolean; sendEmail: boolean; sendWhatsapp: boolean }; },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<{ sandboxMode: boolean; sendEmail: boolean; sendWhatsapp: boolean }>) => {
      const { data } = await api.put('/sandbox', patch);
      return data.data;
    },
    onSuccess: (d) => { qc.setQueryData(['sandbox-config'], d); toast.success('Sandbox configuration saved'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const clearData = useMutation({
    mutationFn: async () => { const { data } = await api.delete('/sandbox/test-data'); return data.data; },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success(`Cleared ${d.ordersDeleted} test orders`); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const config = data ?? { sandboxMode: false, sendEmail: false, sendWhatsapp: false };

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-serif text-2xl font-semibold">Sandbox Mode</h1>
          <p className="text-sm text-muted-foreground">Owner-only. Test the full order flow without affecting real data.</p>
        </div>
        {config.sandboxMode && (
          <Badge variant="warning" className="ml-4 animate-pulse">SANDBOX ACTIVE</Badge>
        )}
      </div>

      {isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : (
        <div className="space-y-6 max-w-xl">
          <Card className={config.sandboxMode ? 'border-amber-500/50 bg-amber-500/5' : ''}>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> Master Toggle
            </CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="font-semibold text-sm">Sandbox Mode</p>
                  <p className="text-xs text-muted-foreground">All new orders will be tagged as TEST. No stock, revenue, or analytics impact.</p>
                </div>
                <Switch
                  checked={config.sandboxMode}
                  onCheckedChange={(v) => update.mutate({ sandboxMode: v })}
                  disabled={update.isPending}
                />
              </div>

              {config.sandboxMode && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Sandbox is ON</p>
                    <p className="text-xs mt-0.5">Every order placed from any source (website, manual, marketplace) will be a test order until you turn this off.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Notification Testing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">When sandbox is active, control whether test notifications are actually sent.</p>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Send Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Fire real emails for test orders</p>
                  </div>
                </div>
                <Switch checked={config.sendEmail} onCheckedChange={(v) => update.mutate({ sendEmail: v })} disabled={update.isPending} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Send WhatsApp Notifications</p>
                    <p className="text-xs text-muted-foreground">Fire real WhatsApp messages for test orders</p>
                  </div>
                </div>
                <Switch checked={config.sendWhatsapp} onCheckedChange={(v) => update.mutate({ sendWhatsapp: v })} disabled={update.isPending} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Clear Test Data
            </CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently removes all test orders and their items from the database.
                Real orders are <strong>never touched</strong>. This cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Delete ALL test orders permanently? Real orders will not be affected. This cannot be undone.')) {
                    clearData.mutate();
                  }
                }}
                disabled={clearData.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {clearData.isPending ? 'Clearing…' : 'Clear All Test Orders'}
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">What test orders DO and DON'T affect:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>✅ Stock IS reduced (to test the full inventory flow)</li>
              <li>🚫 Revenue reports exclude test orders</li>
              <li>🚫 Analytics, profit, and COGS exclude test orders</li>
              <li>🚫 Business counters exclude test orders</li>
              <li>🚫 Campaign and coupon stats exclude test orders</li>
              <li>🚫 Customer totalOrders / totalSpent exclude test orders</li>
              <li>✅ Test orders show a <strong>TEST ORDER</strong> badge in the orders list</li>
            </ul>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
