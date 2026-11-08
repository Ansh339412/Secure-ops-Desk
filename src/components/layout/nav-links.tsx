'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-white/10 font-medium text-white'
                : 'text-slate-300 hover:bg-white/5 hover:text-white',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
