'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, Truck, BarChart3,
  Settings, ChevronLeft, ChevronRight, ChevronDown, Bell, Tag, Wallet,
  Layers, StickyNote, Tags, Ruler, History, TrendingUp, RefreshCw,
  Building2, Star, Images, CalendarDays, Megaphone, FlaskConical,
  ClipboardList, Shield, UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import { usePermissions } from '@/hooks/usePermissions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Dashboard', icon: LayoutDashboard,
    items: [
      { href: '/dashboard',     label: 'Overview',         icon: LayoutDashboard },
      { href: '/analytics',     label: 'BI Dashboard',     icon: TrendingUp },
      { href: '/executive',     label: 'Executive',        icon: TrendingUp },
    ],
  },
  {
    label: 'Orders', icon: ShoppingCart,
    items: [
      { href: '/orders',        label: 'All Orders',    icon: ShoppingCart },
      { href: '/manual-order',  label: 'Manual Order',  icon: ClipboardList },
      { href: '/returns',       label: 'Returns',       icon: RefreshCw },
      { href: '/exchanges',     label: 'Exchanges',     icon: RefreshCw },
    ],
  },
  {
    label: 'Catalog', icon: Package,
    items: [
      { href: '/products',      label: 'Products',      icon: Package },
      { href: '/variants',      label: 'Variants',      icon: Layers },
      { href: '/collections',   label: 'Collections',   icon: Layers },
      { href: '/labels',        label: 'Labels',        icon: Tag },
      { href: '/size-guides',   label: 'Size Guides',   icon: Ruler },
    ],
  },
  {
    label: 'Content', icon: Star,
    items: [
      { href: '/reviews',       label: 'Reviews',       icon: Star },
      { href: '/gallery',       label: 'Gallery',       icon: Images },
    ],
  },
  {
    label: 'Inventory', icon: Boxes,
    items: [
      { href: '/inventory',              label: 'Inventory',         icon: Boxes },
      { href: '/inventory/dashboard',    label: 'Inv. Dashboard',    icon: LayoutDashboard },
      { href: '/inventory/movements',    label: 'Stock Movements',   icon: History },
      { href: '/suppliers',              label: 'Suppliers',         icon: Building2 },
    ],
  },
  {
    label: 'Customers', icon: Users,
    items: [
      { href: '/customers',      label: 'Customers',      icon: Users },
      { href: '/customer-tags',  label: 'Customer Tags',  icon: Tags },
      { href: '/customer-notes', label: 'Customer Notes', icon: StickyNote },
    ],
  },
  {
    label: 'Marketing', icon: Megaphone,
    items: [
      { href: '/campaigns',          label: 'Campaigns',          icon: Megaphone },
      { href: '/campaign-calendar',  label: 'Campaign Calendar',  icon: CalendarDays },
      { href: '/coupons',            label: 'Coupons',            icon: Tag },
      { href: '/coupon-analytics',   label: 'Coupon Analytics',   icon: BarChart3 },
      { href: '/coupon-simulator',   label: 'Coupon Simulator',   icon: FlaskConical },
      { href: '/analytics/marketing',label: 'Marketing Dashboard',icon: Megaphone },
    ],
  },
  {
    label: 'Logistics', icon: Truck,
    items: [
      { href: '/couriers',  label: 'Couriers',                  icon: Truck },
    ],
  },
  {
    label: 'Finance', icon: Wallet,
    items: [
      { href: '/expenses',  label: 'Expenses',  icon: Wallet },
      { href: '/reports',   label: 'Reports',   icon: BarChart3 },
    ],
  },
  {
    label: 'Administration', icon: Shield,
    items: [
      { href: '/notifications',  label: 'Notifications',  icon: Bell },
      { href: '/sandbox',        label: 'Sandbox Mode',   icon: FlaskConical },
      { href: '/analytics/web',  label: 'Web Analytics',  icon: BarChart3 },
      { href: '/analytics/location', label: 'Location Intelligence', icon: Building2 },
      { href: '/settings',       label: 'Settings',       icon: Settings },
    ],
  },
];

function NavGroupItem({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const pathname = usePathname();
  const isGroupActive = group.items.some((item) => pathname?.startsWith(item.href));
  const [open, setOpen] = useState(isGroupActive);
  const GroupIcon = group.icon;

  if (collapsed) {
    // Icon-only mode: just show group icon, tooltip on hover
    return (
      <div className="relative group">
        <div
          className={cn(
            'flex cursor-pointer items-center justify-center rounded-md p-2 transition-colors',
            isGroupActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
          )}
          title={group.label}
        >
          <GroupIcon className="h-4 w-4" />
        </div>
        {/* Flyout on hover in collapsed mode */}
        <div className="absolute left-full top-0 z-50 ml-2 hidden min-w-[160px] rounded-lg border bg-card p-1 shadow-lg group-hover:block">
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.label}</p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors',
          isGroupActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span className="flex items-center gap-2">
          <GroupIcon className="h-3.5 w-3.5" />
          {group.label}
        </span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-muted pl-3">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-3">
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
          className={cn(
            'rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            sidebarCollapsed && 'mx-auto'
          )}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <NavGroupItem key={group.label} group={group} collapsed={sidebarCollapsed} />
        ))}
      </nav>
    </aside>
  );
}
