'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Plus, Search } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const ORDER_SOURCES = ['WEBSITE','MANUAL','FACEBOOK','WHATSAPP','PHONE'];
const CREATOR_ROLES = ['OWNER','MANAGER','EMPLOYEE'];

interface CartItem { productId: string; variantId?: string; name: string; sku: string; qty: number; price: number; size?: string; }

export default function ManualOrderPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState({ shippingName: '', shippingPhone: '', shippingAddress: '', district: '', thana: '', couponCode: '', orderSource: 'MANUAL', manualCreatorRole: 'MANAGER', notes: '' });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['manual-order-products', search],
    queryFn: async () => { const { data } = await api.get('/products', { params: { search: search || undefined, limit: 8, status: 'ACTIVE' } }); return data.data; },
    enabled: !!search,
  });

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const shipping = 80;
  const total = subtotal + shipping;

  function addItem(p: any) {
    const exists = cart.find(i => i.productId === p.id);
    if (exists) { setCart(c => c.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i)); }
    else { setCart(c => [...c, { productId: p.id, name: p.name, sku: p.sku, qty: 1, price: Number(p.salePrice ?? p.sellingPrice) }]); }
  }

  function setQty(productId: string, qty: number) { if (qty < 1) return removeItem(productId); setCart(c => c.map(i => i.productId === productId ? { ...i, qty } : i)); }
  function removeItem(productId: string) { setCart(c => c.filter(i => i.productId !== productId)); }
  function f(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  const createOrder = useMutation({
    mutationFn: async () => {
      const payload = {
        shippingName: form.shippingName,
        shippingPhone: form.shippingPhone,
        shippingAddress: form.shippingAddress,
        district: form.district,
        thana: form.thana,
        couponCode: form.couponCode || undefined,
        notes: form.notes || undefined,
        orderSource: form.orderSource,
        manualCreatorRole: form.manualCreatorRole,
        paymentMethod: 'COD',
        shippingCharge: shipping,
        items: cart.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.qty, size: i.size })),
      };
      const { data } = await api.post('/manual-order', payload);
      return data.data;
    },
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNo} created successfully`);
      router.push(`/orders/${order.id}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const valid = cart.length > 0 && form.shippingName && form.shippingPhone && form.shippingAddress;

  return (
    <DashboardShell>
      <div className="mb-6"><h1 className="font-serif text-2xl font-semibold">Create Manual Order</h1>
        <p className="text-sm text-muted-foreground">Place orders from Facebook, WhatsApp, phone, or walk-in customers.</p></div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Product search */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Add Products</CardTitle></CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search products by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {productsLoading && <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>}
              {search && (productsData?.data??[]).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between border-b px-2 py-2 text-sm last:border-b-0">
                  <div><span className="font-medium">{p.name}</span> <span className="text-xs text-muted-foreground">{p.sku}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(Number(p.salePrice??p.sellingPrice))}</span>
                    <Button size="sm" onClick={() => addItem(p)}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
              {/* Cart */}
              {cart.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Order Items</p>
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <div className="flex-1 text-sm"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p></div>
                      <div className="flex items-center gap-2">
                        <button className="h-6 w-6 rounded border text-xs" onClick={() => setQty(item.productId, item.qty - 1)}>-</button>
                        <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                        <button className="h-6 w-6 rounded border text-xs" onClick={() => setQty(item.productId, item.qty + 1)}>+</button>
                      </div>
                      <span className="w-20 text-right text-sm font-semibold">{formatCurrency(item.price * item.qty)}</span>
                      <button onClick={() => removeItem(item.productId)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer info */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Customer Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Full Name<span className="text-destructive">*</span></Label><Input value={form.shippingName} onChange={e=>f('shippingName',e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Phone<span className="text-destructive">*</span></Label><Input type="tel" value={form.shippingPhone} onChange={e=>f('shippingPhone',e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Delivery Address<span className="text-destructive">*</span></Label><Input value={form.shippingAddress} onChange={e=>f('shippingAddress',e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>District</Label><Input value={form.district} onChange={e=>f('district',e.target.value)} placeholder="e.g. Dhaka" /></div>
                <div className="space-y-1.5"><Label>Thana / Upazila</Label><Input value={form.thana} onChange={e=>f('thana',e.target.value)} placeholder="e.g. Mirpur" /></div>
              </div>
              <div className="space-y-1.5"><Label>Coupon Code</Label><Input value={form.couponCode} onChange={e=>f('couponCode',e.target.value)} placeholder="Optional" /></div>
              <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Internal notes..." /></div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Order Source</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5"><Label>Source</Label>
                <Select value={form.orderSource} onValueChange={v=>f('orderSource',v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ORDER_SOURCES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Created By (Role)</Label>
                <Select value={form.manualCreatorRole} onValueChange={v=>f('manualCreatorRole',v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CREATOR_ROLES.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatCurrency(shipping)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
                <p className="text-xs text-muted-foreground">Payment: COD</p>
              </div>
              <Button className="mt-4 w-full" disabled={!valid || createOrder.isPending || cart.length === 0} onClick={() => createOrder.mutate()}>
                {createOrder.isPending ? 'Creating…' : 'Create Order'}
              </Button>
              {!valid && <p className="mt-2 text-xs text-muted-foreground text-center">Fill name, phone, address and add items</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
