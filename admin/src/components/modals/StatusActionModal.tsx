'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Courier } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  action: 'CANCEL' | 'DISPATCH' | 'RETURN' | 'REFUND' | null;
  onConfirm: (data: Record<string, string>) => void;
  isLoading?: boolean;
}

export function StatusActionModal({ open, onClose, action, onConfirm, isLoading }: Props) {
  const [reason, setReason] = useState('');
  const [courierId, setCourierId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('COD');

  const { data: couriers } = useQuery({
    queryKey: ['couriers'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Courier[] }>('/couriers');
      return data.data;
    },
    enabled: action === 'DISPATCH',
  });

  function handleConfirm() {
    if (action === 'CANCEL') onConfirm({ cancelReason: reason });
    else if (action === 'RETURN') onConfirm({ reason });
    else if (action === 'REFUND') onConfirm({ reason, amount: refundAmount, method: refundMethod });
    else if (action === 'DISPATCH') onConfirm({ courierId, trackingNumber });
  }

  const titles: Record<string, string> = {
    CANCEL: 'Cancel Order', DISPATCH: 'Dispatch Order',
    RETURN: 'Process Return', REFUND: 'Process Refund',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{action ? titles[action] : ''}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          {action === 'CANCEL' && (
            <div className="space-y-1.5">
              <Label>Cancellation Reason<span className="text-destructive">*</span></Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer requested cancellation" />
            </div>
          )}

          {action === 'DISPATCH' && (
            <>
              <div className="space-y-1.5">
                <Label>Courier<span className="text-destructive">*</span></Label>
                <Select value={courierId} onValueChange={setCourierId}>
                  <SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger>
                  <SelectContent>
                    {couriers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tracking Number<span className="text-destructive">*</span></Label>
                <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. TRK123456789" />
              </div>
            </>
          )}

          {action === 'RETURN' && (
            <div className="space-y-1.5">
              <Label>Return Reason<span className="text-destructive">*</span></Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong size delivered" />
            </div>
          )}

          {action === 'REFUND' && (
            <>
              <div className="space-y-1.5">
                <Label>Refund Amount (৳)<span className="text-destructive">*</span></Label>
                <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Refund Method</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">Cash</SelectItem>
                    <SelectItem value="BKASH">bKash</SelectItem>
                    <SelectItem value="NAGAD">Nagad</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={action === 'CANCEL' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
