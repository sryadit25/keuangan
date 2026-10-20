'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transaksi', label: 'Transaksi' },
  { href: '/akun', label: 'Rekening' },
  { href: '/anggaran', label: 'Anggaran' },
  { href: '/target', label: 'Target' },
  { href: '/bisnis', label: 'Bisnis' },
  { href: '/import', label: 'Import CSV' },
  { href: '/ai', label: 'AI Advisor' },
  { href: '/laporan', label: 'Laporan' },
  { href: '/pengaturan', label: 'Pengaturan' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              active ? 'bg-accent text-white' : 'text-muted hover:bg-border/50 hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
