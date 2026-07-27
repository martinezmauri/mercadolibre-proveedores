'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NAV_ITEMS } from '@/components/layout/nav-items';

export function AppHeader() {
  const pathname = usePathname();
  const seccionActual = NAV_ITEMS.find((item) => item.href === pathname)?.label ?? '';

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="text-sm font-medium text-foreground">{seccionActual}</span>
      </div>
      <ThemeToggle />
    </header>
  );
}
