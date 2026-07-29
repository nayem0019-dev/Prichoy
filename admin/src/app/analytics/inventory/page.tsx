'use client';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useInventoryReports } from '@/hooks/analytics/useAnalytics';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

export default function InventoryReportsPage() {
  const { data, isLoading } = useInventoryReports();

  function exportInventory(fmt: string) {
    window.open(`${api.defaults.baseURL}/export/inventory?format=${fmt}`, '_blank');
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Inventory Reports</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportInventory('xlsx')}>Export Excel</Button>
          <Button size="sm" variant="outline" onClick={() => exportInventory('csv')}>Export CSV</Button>
          <Link href="/inventory/dashboard"><Button size="sm" variant="outline">Full Dashboard</Button></Link>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-96 w-full" /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Inventory Value (Cost)', value: formatCurrency(data?.inventoryValue ?? 0) },
              { label: 'Total Stock Units', value: String(data?.totalUnits ?? 0) },
              { label: 'Low Stock Products', value: String(data?.lowStockCount ?? 0) },
              { label: 'Out of Stock Products', value: String(data?.outOfStockCount ?? 0) },
            ].map((k) => (
              <Card key={k.label}><CardContent className="p-5">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-2xl font-semibold">{k.value}</p>
              </CardContent></Card>
            ))}
          </div>

          <Tabs defaultValue="fast">
            <TabsList className="mb-4">
              <TabsTrigger value="fast">Fast Moving</TabsTrigger>
              <TabsTrigger value="slow">Slow Moving</TabsTrigger>
              <TabsTrigger value="variants">Variant Stock</TabsTrigger>
            </TabsList>

            {(['fast', 'slow'] as const).map((tab) => (
              <TabsContent key={tab} value={tab}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{tab === 'fast' ? 'Fast' : 'Slow'} Moving Products (by lifetime sales)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto rounded-md border">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Product</TableHead><TableHead>SKU</TableHead>
                          <TableHead>Total Sold</TableHead><TableHead>Current Stock</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {(tab === 'fast' ? data?.fastMoving : data?.slowMoving)?.map((p: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{p.name}</TableCell>
                              <TableCell className="text-xs">{p.sku}</TableCell>
                              <TableCell className="text-sm">{p.totalSold}</TableCell>
                              <TableCell>
                                <Badge variant={p.currentStock === 0 ? 'destructive' : p.currentStock <= 5 ? 'warning' : 'success'} className="text-[10px]">
                                  {p.currentStock}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!(tab === 'fast' ? data?.fastMoving : data?.slowMoving)?.length && (
                            <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

            <TabsContent value="variants">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Variant Stock Levels (lowest first)</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Product</TableHead><TableHead>Variant</TableHead>
                        <TableHead>SKU</TableHead><TableHead>Stock</TableHead><TableHead>Alert</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {(data?.variantStock ?? []).map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell className="text-sm">{v.product?.name}</TableCell>
                            <TableCell className="font-medium">{v.name}: {v.value}</TableCell>
                            <TableCell className="text-xs">{v.sku ?? '—'}</TableCell>
                            <TableCell>
                              <Badge variant={v.stock === 0 ? 'destructive' : v.stock <= v.lowStockAlert ? 'warning' : 'outline'} className="text-[10px]">
                                {v.stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{v.lowStockAlert}</TableCell>
                          </TableRow>
                        ))}
                        {!data?.variantStock?.length && (
                          <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No variants.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DashboardShell>
  );
}
