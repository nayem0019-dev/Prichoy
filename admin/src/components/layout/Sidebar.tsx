'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes,
  Users, Truck, BarChart3, Settings, ChevronLeft,
  ChevronRight, Bell, Tag, Wallet, Layers, StickyNote,
  Tags, Ruler, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import { usePermissions } from '@/hooks/usePermissions';

const NAV_ITEMS = [
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard, module: 'orders' as const },
  { href: '/orders',      label: 'Orders',     icon: ShoppingCart,    module: 'orders' as const },
  { href: '/products',    label: 'Products',   icon: Package,         module: 'products' as const },
  { href: '/variants',    label: 'Variants',   icon: Layers,          module: 'products' as const },
  { href: '/collections', label: 'Collections',icon: Layers,          module: 'products' as const },
  { href: '/labels',      label: 'Labels',     icon: Tag,             module: 'products' as const },
  { href: '/size-guides', label: 'Size Guides',icon: Ruler,           module: 'products' as const },
  { href: '/inventory',   label: 'Inventory',  icon: Boxes,           module: 'inventory' as const },
  { href: '/inventory/dashboard', label: 'Inventory Dashboard', icon: LayoutDashboard, module: 'inventory' as const },
  { href: '/inventory/movements', label: 'Stock Movements', icon: History, module: 'inventory' as const },
  { href: '/customers',   label: 'Customers',  icon: Users,           module: 'customers' as const },
  { href: '/customer-tags', label: 'Customer Tags', icon: Tags,       module: 'customers' as const },
  { href: '/customer-notes', label: 'Customer Notes', icon: StickyNote, module: 'customers' as const },
  { href: '/couriers',    label: 'Couriers',   icon: Truck,           module: 'orders' as const },
  { href: '/expenses',    label: 'Expenses',   icon: Wallet,          module: 'reports' as const },
  { href: '/reports',     label: 'Reports',    icon: BarChart3,       module: 'reports' as const },
  { href: '/notifications', label: 'Notifications', icon: Bell,       module: 'orders' as const },
  { href: '/settings',    label: 'Settings',   icon: Settings,        module: 'settings' as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { can } = usePermissions();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary font-serif text-sm font-bold text-primary-foreground">
              P
            </div>
            <span className="font-serif text-base font-semibold tracking-wide">Prichoy</span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.filter((item) => can(item.module, 'view')).map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                sidebarCollapsed && 'justify-center px-0'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
