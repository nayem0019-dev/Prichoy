'use client';
import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { FlaskConical, AlertTriangle, TrendingUp } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function CouponSimulatorPage() {
  const [form, setForm] = useState({ subtotal: '1500', couponType: 'PERCENTAGE', couponValue: '10', maxDiscount: '', shippingCharge: '80', productCost: '800' });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function simulate() {
    setLoading(true);
    try {
      const { data } = await api.post('/coupon-simulator', {
        subtotal: Number(form.subtotal),
        couponType: form.couponType,
        couponValue: Number(form.couponValue),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        shippingCharge: Number(form.shippingCharge) || 80,
        productCost: Number(form.productCost) || 0,
      });
      setResult(data.data);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally { setLoading(false); }
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Coupon Simulator</h1>
        <p className="text-sm text-muted-foreground">Preview discount impact on profit before activating — no database changes made.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Simulation Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Order Subtotal (৳)</Label>
                <Input type="number" value={form.subtotal} onChange={e => f('subtotal', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Product Cost / COGS (৳)</Label>
                <Input type="number" value={form.productCost} onChange={e => f('productCost', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Coupon Type</Label>
              <Select value={form.couponType} onValueChange={v => f('couponType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage %</SelectItem>
                  <SelectItem value="FLAT">Fixed Amount ৳</SelectItem>
                  <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Coupon Value {form.couponType === 'PERCENTAGE' ? '(%)' : '(৳)'}</Label>
                <Input type="number" value={form.couponValue} onChange={e => f('couponValue', e.target.value)} />
              </div>
              {form.couponType === 'PERCENTAGE' && (
                <div className="space-y-1.5">
                  <Label>Max Discount Cap (৳)</Label>
                  <Input type="number" value={form.maxDiscount} onChange={e => f('maxDiscount', e.target.value)} placeholder="No cap" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Shipping Charge (৳)</Label>
              <Input type="number" value={form.shippingCharge} onChange={e => f('shippingCharge', e.target.value)} />
            </div>
            <Button className="w-full" onClick={simulate} disabled={loading}>
              {loading ? 'Simulating…' : '▶ Run Simulation'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Simulation Results</CardTitle></CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Enter parameters and run simulation →</div>
            ) : (
              <div className="space-y-4">
                {result.warning && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {result.warning}
                  </div>
                )}
                <div className="space-y-2">
                  {[
                    ['Order Subtotal', formatCurrency(Number(form.subtotal))],
                    ['Discount Applied', `−${formatCurrency(result.discountAmount)}`],
                    ['Shipping Charge', formatCurrency(Number(form.shippingCharge) || 80)],
                    ['Customer Pays', formatCurrency(result.finalTotal)],
                    ['Product Cost', `−${formatCurrency(Number(form.productCost) || 0)}`],
                    ['Gross Profit', formatCurrency(result.grossProfit)],
                    ['Profit Margin', `${result.profitMargin}%`],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between border-b py-2 text-sm last:border-b-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-semibold ${(value as string).startsWith('−') ? 'text-destructive' : result.grossProfit < 0 && label === 'Gross Profit' ? 'text-destructive' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>
                <div className={`rounded-lg p-4 text-center ${result.grossProfit >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">{result.grossProfit >= 0 ? 'Profitable' : 'Loss-making'}</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(result.grossProfit)}</p>
                  <p className="text-xs mt-1">{result.profitMargin}% margin</p>
                </div>
                <p className="text-xs text-muted-foreground text-center">Simulation only — no database changes made</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
