'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn, formatDateTime, ROLE_LABELS } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

const TABS = ['Company', 'Shipping', 'Users', 'Audit Log'] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('Company');
  const { can } = usePermissions();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as Record<string, Record<string, string>>;
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/settings/users')).data.data,
    enabled: tab === 'Users',
  });

  const { data: logs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => (await api.get('/settings/audit-logs')).data.data,
    enabled: tab === 'Audit Log',
  });

  const [companyForm, setCompanyForm] = useState<Record<string, string>>({});
  const [shippingForm, setShippingForm] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: async ({ group, formData }: { group: string; formData: Record<string, string> }) => {
      const settingsPayload = Object.entries(formData).map(([key, value]) => ({ key, value, group }));
      await api.put('/settings', { settings: settingsPayload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
  });

  const companyDefaults = settings?.company ?? {};
  const shippingDefaults = settings?.shipping ?? {};

  return (
    <DashboardShell>
      <h1 className="mb-6 font-serif text-2xl font-semibold">Settings</h1>

      <div className="mb-6 flex gap-1.5 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Company' && (
        <Card className="max-w-xl">
          <CardHeader><CardTitle className="text-base">Company Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {['company_name','company_phone','company_email','company_address'].map((key) => (
              <div key={key} className="space-y-1.5">
                <Label>{key.replace('company_', '').replace('_',' ')}</Label>
                <Input
                  defaultValue={companyDefaults[key] ?? ''}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <Button disabled={!can('settings','update')}
              onClick={() => saveMutation.mutate({ group: 'company', formData: { ...companyDefaults, ...companyForm } })}>
              Save Changes
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'Shipping' && (
        <Card className="max-w-xl">
          <CardHeader><CardTitle className="text-base">Delivery Charges</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Dhaka City (৳)</Label>
              <Input type="number" defaultValue={shippingDefaults.delivery_dhaka ?? '80'}
                onChange={(e) => setShippingForm((f) => ({ ...f, delivery_dhaka: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Outside Dhaka (৳)</Label>
              <Input type="number" defaultValue={shippingDefaults.delivery_outside ?? '120'}
                onChange={(e) => setShippingForm((f) => ({ ...f, delivery_outside: e.target.value }))} />
            </div>
            <Button disabled={!can('settings','update')}
              onClick={() => saveMutation.mutate({ group: 'shipping', formData: { ...shippingDefaults, ...shippingForm } })}>
              Save Changes
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'Users' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Admin Users</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u: { id:string; name:string; email:string; role:string; isActive:boolean; lastLoginAt?:string }) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{ROLE_LABELS[u.role]}</Badge></TableCell>
                    <TableCell><Badge variant={u.isActive ? 'success' : 'destructive'} className="text-[10px]">{u.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'Audit Log' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>IP</TableHead><TableHead>Time</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: { id:string; admin?:{name:string}; action:string; entity?:string; ip?:string; createdAt:string }) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.admin?.name ?? 'System'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{log.action}</Badge></TableCell>
                    <TableCell className="text-xs">{log.entity ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ip ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
