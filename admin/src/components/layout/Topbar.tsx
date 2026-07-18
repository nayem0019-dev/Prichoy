'use client';

import { useState } from 'react';
import { Search, Bell, Sun, Moon, LogOut, User as UserIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { cn, ROLE_LABELS } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: async () => {
      const { data } = await api.get('/settings/notifications');
      return data.data as { unreadCount: number };
    },
    refetchInterval: 30_000,
  });

  async function handleLogout() {
    // Previously this only cleared local Zustand state and redirected —
    // it never told the server to revoke the session. That meant the
    // refresh token (now an httpOnly cookie) remained valid server-side
    // after a "logout", which matters on a shared computer or if a
    // stolen access token is used to refresh again after the user
    // believed they'd logged out. We now call the backend logout
    // endpoint first (which revokes the stored refresh token and clears
    // the cookie) and only then clear local state.
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the network call fails, still clear local state below —
      // we don't want a flaky connection to trap the user in a logged-in
      // UI they can't get out of.
    }
    logout();
    router.push('/login');
  }

  return (
    <header
      className={cn(
        'fixed top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur transition-all duration-200',
        sidebarCollapsed ? 'left-16' : 'left-64',
        'right-0'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders, customers, SKU..."
            className="pl-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                router.push(`/orders?search=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost" size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {!!notifData?.unreadCount && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {notifData.unreadCount > 9 ? '9+' : notifData.unreadCount}
              </span>
            )}
          </Button>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.name?.charAt(0) ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left text-xs md:block">
              <p className="font-medium">{user?.name}</p>
              <p className="text-muted-foreground">{user?.role ? ROLE_LABELS[user.role] : ''}</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-48 rounded-md border bg-popover p-1 shadow-md">
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => setMenuOpen(false)}
              >
                <UserIcon className="h-4 w-4" /> Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-accent"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
